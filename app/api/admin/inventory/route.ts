import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: staff } = await supabase.from("staff_members").select("role,is_active").eq("user_id", userId).single();
  if (!staff?.is_active || !["super_admin", "admin", "catalog_manager"].includes(staff.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const variantId = String(body.variant_id || "");
  const nextStock = Number(body.on_hand);
  const reason = String(body.reason || "Manual stock adjustment").trim();
  if (!variantId || !Number.isInteger(nextStock) || nextStock < 0) return NextResponse.json({ error: "A valid variant and stock quantity are required" }, { status: 400 });
  const { data: current, error: currentError } = await supabase.from("inventory").select("on_hand,reserved,low_stock_threshold").eq("variant_id", variantId).single();
  if (currentError || !current) return NextResponse.json({ error: currentError?.message || "Inventory not found" }, { status: 404 });
  if (nextStock < current.reserved) return NextResponse.json({ error: `Stock cannot be lower than ${current.reserved} reserved units` }, { status: 400 });

  const { data: inventory, error } = await supabase.from("inventory").update({ on_hand: nextStock }).eq("variant_id", variantId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from("inventory_movements").insert({ variant_id: variantId, movement_type: "manual_adjustment", quantity_delta: nextStock - current.on_hand, reference_type: "admin", reason, created_by: userId });
  await supabase.from("audit_logs").insert({ actor_id: userId, action: "inventory.adjusted", entity_type: "variant", entity_id: variantId, before_data: current, after_data: inventory });
  return NextResponse.json(inventory);
}
