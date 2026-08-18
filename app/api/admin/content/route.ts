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
  if (!staff?.is_active || !["super_admin","admin","catalog_manager"].includes(staff.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const { data, error } = await supabase.from("homepage_sections").update({ title: body.title, subtitle: body.subtitle, content: body.content, is_active: body.is_active, updated_by: userId }).eq("section_key", body.section_key).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}
