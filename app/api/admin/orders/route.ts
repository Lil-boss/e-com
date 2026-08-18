import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const transitions: Record<string,string[]> = { pending:["confirmed","cancelled"],confirmed:["processing","cancelled"],processing:["packed","cancelled"],packed:["shipped"],shipped:["delivered"],delivered:["return_requested"],return_requested:["returned","replaced"],returned:["refunded","replaced"] };

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: staff } = await supabase.from("staff_members").select("role,is_active").eq("user_id", userId).single();
  if (!staff?.is_active || !["super_admin","admin","order_manager"].includes(staff.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const { data: order } = await supabase.from("orders").select("status").eq("id", body.id).single();
  if (!order || !transitions[order.status]?.includes(body.status)) return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
  const { data, error } = await supabase.from("orders").update({ status: body.status }).eq("id", body.id).select().single();
  if (!error) await supabase.from("order_status_events").insert({ order_id: body.id, from_status: order.status, to_status: body.status, note: body.note || null, created_by: userId });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}
