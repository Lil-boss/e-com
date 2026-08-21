import { NextRequest, NextResponse } from "next/server";
import { CATALOG, requireStaff } from "@/lib/supabase/admin-auth";

/** Statuses that still hold stock. Delivered consumes it; cancelled/returned release it. */
const OPEN_STATUSES = ["pending", "confirmed", "processing", "packed", "shipped"];

/** What open orders actually reserve for a variant, which is what `reserved` should equal. */
async function heldByOpenOrders(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"], variantId: string) {
  const { data } = await supabase!
    .from("order_items")
    .select("quantity,order_id,orders!inner(order_number,status,customer_name,created_at)")
    .eq("variant_id", variantId)
    .in("orders.status", OPEN_STATUSES);
  const rows = (data || []) as unknown as Array<{ quantity: number; order_id: string; orders: { order_number: string; status: string; customer_name: string; created_at: string } }>;
  return { rows, total: rows.reduce((sum, row) => sum + Number(row.quantity), 0) };
}

/** Detail for one variant: why stock is held, and what has moved. */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(CATALOG);
  if (auth.error) return auth.error;
  const variantId = new URL(request.url).searchParams.get("variant_id");
  if (!variantId) return NextResponse.json({ error: "A variant id is required" }, { status: 400 });

  const [inventory, held, movements] = await Promise.all([
    auth.supabase.from("inventory").select("on_hand,reserved,low_stock_threshold").eq("variant_id", variantId).maybeSingle(),
    heldByOpenOrders(auth.supabase, variantId),
    auth.supabase.from("inventory_movements").select("movement_type,quantity_delta,reason,created_at").eq("variant_id", variantId).order("created_at", { ascending: false }).limit(12),
  ]);
  if (!inventory.data) return NextResponse.json({ error: "Inventory not found" }, { status: 404 });

  return NextResponse.json({
    ...inventory.data,
    expectedReserved: held.total,
    holders: held.rows.map((row) => ({
      order_id: row.order_id, order_number: row.orders.order_number, status: row.orders.status,
      customer_name: row.orders.customer_name, quantity: row.quantity, created_at: row.orders.created_at,
    })),
    movements: movements.data || [],
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireStaff(CATALOG);
  if (auth.error) return auth.error;
  const supabase = auth.supabase;
  const userId = auth.userId;
  const body = await request.json();
  const variantId = String(body.variant_id || "");
  if (!variantId) return NextResponse.json({ error: "A valid variant is required" }, { status: 400 });

  const { data: current, error: currentError } = await supabase.from("inventory").select("on_hand,reserved,low_stock_threshold").eq("variant_id", variantId).single();
  if (currentError || !current) return NextResponse.json({ error: currentError?.message || "Inventory not found" }, { status: 404 });

  // Reserved is derived from open orders, never typed in. Reconciling recomputes it,
  // which is how stock stranded by an order that vanished gets released.
  if (body.action === "reconcile") {
    const { total } = await heldByOpenOrders(supabase, variantId);
    const target = Math.min(total, current.on_hand);
    if (target === current.reserved) return NextResponse.json({ ...current, reconciled: false, expectedReserved: total });
    const { data, error } = await supabase.from("inventory").update({ reserved: target }).eq("variant_id", variantId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await supabase.from("inventory_movements").insert({
      variant_id: variantId, movement_type: target > current.reserved ? "reserve" : "release", quantity_delta: 0,
      reference_type: "admin", reason: `Reconciled reserved ${current.reserved} → ${target} against open orders`, created_by: userId,
    });
    await supabase.from("audit_logs").insert({ actor_id: userId, action: "inventory.reconciled", entity_type: "variant", entity_id: variantId, before_data: current, after_data: data });
    return NextResponse.json({ ...data, reconciled: true, expectedReserved: total });
  }

  const updates: Record<string, number> = {};
  if (body.on_hand !== undefined) {
    const nextStock = Number(body.on_hand);
    if (!Number.isInteger(nextStock) || nextStock < 0) return NextResponse.json({ error: "Stock must be a whole number of units" }, { status: 400 });
    if (nextStock < current.reserved) return NextResponse.json({ error: `Stock cannot be lower than ${current.reserved} reserved units` }, { status: 400 });
    updates.on_hand = nextStock;
  }
  if (body.low_stock_threshold !== undefined) {
    const threshold = Number(body.low_stock_threshold);
    if (!Number.isInteger(threshold) || threshold < 0) return NextResponse.json({ error: "The low stock alert must be a whole number" }, { status: 400 });
    updates.low_stock_threshold = threshold;
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { data: inventory, error } = await supabase.from("inventory").update(updates).eq("variant_id", variantId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (updates.on_hand !== undefined && updates.on_hand !== current.on_hand) {
    await supabase.from("inventory_movements").insert({
      variant_id: variantId, movement_type: "manual_adjustment", quantity_delta: updates.on_hand - current.on_hand,
      reference_type: "admin", reason: String(body.reason || "Manual stock adjustment").trim(), created_by: userId,
    });
  }
  await supabase.from("audit_logs").insert({ actor_id: userId, action: "inventory.adjusted", entity_type: "variant", entity_id: variantId, before_data: current, after_data: inventory });
  return NextResponse.json(inventory);
}
