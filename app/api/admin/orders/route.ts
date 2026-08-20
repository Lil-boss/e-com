import { NextRequest, NextResponse } from "next/server";
import { ORDERS, requireStaff } from "@/lib/supabase/admin-auth";

const transitions: Record<string,string[]> = { pending:["confirmed","cancelled"],confirmed:["processing","cancelled"],processing:["packed","cancelled"],packed:["shipped"],shipped:["delivered"],delivered:["return_requested"],return_requested:["returned","replaced"],returned:["refunded","replaced"] };
const paymentStates = ["pending","authorized","paid","failed","refunded","partially_refunded"];

const authorized = () => requireStaff(ORDERS);

export async function GET(request: NextRequest) {
  const auth = await authorized();
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Order id is required" }, { status: 400 });
  const { data, error } = await auth.supabase.from("orders").select("*,order_items(*),order_status_events(from_status,to_status,note,created_at),shipments(id,courier,tracking_number,status,shipped_at)").eq("id", id).single();
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

  const { data, error } = changesOrder
    ? await auth.supabase.from("orders").update(updates).eq("id", body.id).select().single()
    : await auth.supabase.from("orders").select().eq("id", body.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  let stockWarning: string | null = null;
  if (updates.status) {
    // ponytail: restock on returned/refunded is not handled; add a third RPC call here if returns become common.
    const stockFunction = body.status === "cancelled" ? "release_order_stock" : body.status === "delivered" ? "consume_order_stock" : null;
    if (stockFunction) {
      const { error: stockError } = await auth.supabase.rpc(stockFunction, { p_order_id: body.id });
      // Surfaced rather than swallowed: a failed RPC leaves stock wrong while the status looks fine.
      if (stockError) stockWarning = `স্ট্যাটাস বদলেছে, তবে স্টক হালনাগাদ হয়নি: ${stockError.message}`;
    }
    await auth.supabase.from("order_status_events").insert({ order_id: body.id, from_status: order.status, to_status: body.status, note: body.note || null, created_by: auth.userId });
  }
  await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: body.shipment && !changesOrder ? "order.shipment_updated" : "order.updated", entity_type: "order", entity_id: body.id, before_data: order, after_data: body.shipment && !changesOrder ? { shipment: body.shipment } : updates });
  return NextResponse.json(stockWarning ? { ...data, warning: stockWarning } : data);
}
