import { NextRequest, NextResponse } from "next/server";
import { CATALOG, requireStaff } from "@/lib/supabase/admin-auth";

export async function PATCH(request: NextRequest) {
  const auth = await requireStaff(CATALOG);
  if (auth.error) return auth.error;
  const supabase = auth.supabase;
  const userId = auth.userId;
  const body = await request.json();
  const { data, error } = await supabase.from("homepage_sections").update({ title: body.title, subtitle: body.subtitle, content: body.content, is_active: body.is_active, updated_by: userId }).eq("section_key", body.section_key).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}
