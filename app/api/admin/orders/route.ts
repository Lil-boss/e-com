import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ORDERS, OWNER, requireStaff } from "@/lib/supabase/admin-auth";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/config";

const transitions: Record<string,string[]> = { pending:["confirmed","cancelled"],confirmed:["processing","cancelled"],processing:["packed","cancelled"],packed:["shipped"],shipped:["delivered"],delivered:["return_requested"],return_requested:["returned","replaced"],returned:["refunded","replaced"] };
const paymentStates = ["pending","authorized","paid","failed","refunded","partially_refunded"];

const authorized = () => requireStaff(ORDERS);

export async function GET(request: NextRequest) {
  const auth = await authorized();
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Order id is required" }, { status: 400 });
  const { data, error } = await auth.supabase.from("orders").select("*,order_items(*),order_status_events(from_status,to_status,note,created_at),shipments(id,courier,tracking_number,status,shipped_at),payments(method,provider,status,amount,provider_reference,created_at)").eq("id", id).single();
  return error ? NextResponse.json({ error: error.message }, { status: 404 }) : NextResponse.json({ ...data, next_statuses: transitions[data.status] || [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorized();
  if (auth.error) return auth.error;
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Order id is required" }, { status: 400 });
  const { data: order } = await auth.supabase.from("orders").select("status,payment_status").eq("id", body.id).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (body.shipment) {
    // shipped_at is only written when the parcel actually ships, so moving it on to
    // delivered no longer wipes the timestamp it was set with.
    const row: Record<string, unknown> = { order_id: body.id, courier: body.shipment.courier || null, tracking_number: body.shipment.tracking_number || null, status: body.shipment.status || "pending" };
    if (body.shipment.status === "shipped") row.shipped_at = new Date().toISOString();
    const { error } = await auth.supabase.from("shipments").upsert(row, { onConflict: "order_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.payment_status) {
    if (!paymentStates.includes(body.payment_status)) return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    updates.payment_status = body.payment_status;
  }
  if (typeof body.internal_note === "string") updates.internal_note = body.internal_note.trim() || null;
  if (body.status) {
    if (!transitions[order.status]?.includes(body.status)) return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    updates.status = body.status;
  }
  // saving courier details alone is a real change, it used to fall through to "Nothing to update"
  const changesOrder = Object.keys(updates).length > 0;
  if (!changesOrder && !body.shipment) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  // keep the ledger row in step with the order's payment summary
  if (body.payment_status) await syncPaymentLedger(body.id, body.payment_status);
  const { data, error } = changesOrder
    ? await auth.supabase.from("orders").update(updates).eq("id", body.id).select().single()
    : await auth.supabase.from("orders").select().eq("id", body.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  let stockWarning: string | null = null;
  if (updates.status) {
    const stockFunction = body.status === "cancelled" ? "release_order_stock" : body.status === "delivered" ? "consume_order_stock" : null;
    if (stockFunction) {
      const { error: stockError } = await auth.supabase.rpc(stockFunction, { p_order_id: body.id });
      // Surfaced rather than swallowed: a failed RPC leaves stock wrong while the status looks fine.
      if (stockError) stockWarning = `Status changed, but stock was not updated: ${stockError.message}`;
    }
    // Delivery consumed the stock, so a return has to put it back.
    // ponytail: done in JS because reserve/release/consume live in an already-applied
    // migration; fold restock into an RPC next time one is written.
    if (body.status === "returned") {
      const problem = await restockOrder(body.id);
      if (problem) stockWarning = `Status changed, but stock was not restocked: ${problem}`;
    }
    await auth.supabase.from("order_status_events").insert({ order_id: body.id, from_status: order.status, to_status: body.status, note: body.note || null, created_by: auth.userId });
  }
  await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: body.shipment && !changesOrder ? "order.shipment_updated" : "order.updated", entity_type: "order", entity_id: body.id, before_data: order, after_data: body.shipment && !changesOrder ? { shipment: body.shipment } : updates });
  return NextResponse.json(stockWarning ? { ...data, warning: stockWarning } : data);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireStaff(OWNER);
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Order id is required" }, { status: 400 });
  const { data: order } = await auth.supabase.from("orders").select("status,order_number").eq("id", id).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  // A live order still holds reserved stock; cancel it first so the reservation is released.
  if (!["cancelled", "delivered", "returned", "refunded"].includes(order.status)) {
    return NextResponse.json({ error: "Cancel or complete the order before deleting it" }, { status: 409 });
  }
  const { error } = await auth.supabase.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "order.deleted", entity_type: "order", entity_id: id, before_data: order });
  return NextResponse.json({ deleted: true, id });
}

/** Mirrors the order's payment status onto its payments row. */
async function syncPaymentLedger(orderId: string, status: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!isSupabaseConfigured || !supabaseUrl || !secret) return;
  const admin = createAdminClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  await admin.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("order_id", orderId);
}

/** Adds a returned order's units back to on_hand and writes the movement rows. */
async function restockOrder(orderId: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!isSupabaseConfigured || !supabaseUrl || !secret) return "service key missing";
  const admin = createAdminClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: items, error } = await admin.from("order_items").select("variant_id,quantity").eq("order_id", orderId).not("variant_id", "is", null);
  if (error) return error.message;
  for (const item of items || []) {
    const { data: row } = await admin.from("inventory").select("on_hand").eq("variant_id", item.variant_id).maybeSingle();
    if (!row) continue;
    const { error: updateError } = await admin.from("inventory").update({ on_hand: row.on_hand + item.quantity }).eq("variant_id", item.variant_id);
    if (updateError) return updateError.message;
    await admin.from("inventory_movements").insert({ variant_id: item.variant_id, movement_type: "return", quantity_delta: item.quantity, reference_type: "order", reference_id: orderId, reason: "Returned by customer" });
  }
  return null;
}
