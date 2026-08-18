import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function authorized() {
  if (!isSupabaseConfigured) return { error: NextResponse.json({ error: "Supabase is not configured" }, { status: 503 }) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: staff } = await supabase.from("staff_members").select("role,is_active").eq("user_id", userId).single();
  if (!staff?.is_active || !["super_admin", "admin"].includes(staff.role)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { supabase, userId };
}

export async function GET() {
  const auth = await authorized();
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.from("store_settings").select("key,value").eq("key", "store").single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data?.value || {});
}

export async function PATCH(request: NextRequest) {
  const auth = await authorized();
  if (auth.error) return auth.error;
  const value = await request.json();
  const { data: before } = await auth.supabase.from("store_settings").select("value").eq("key", "store").maybeSingle();
  const { data, error } = await auth.supabase.from("store_settings").upsert({ key: "store", value, is_public: true, updated_by: auth.userId }).select().single();
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "settings.updated", entity_type: "store_settings", entity_id: "store", before_data: before?.value || null, after_data: value });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data.value);
}

export async function POST(request: NextRequest) {
  const auth = await authorized();
  if (auth.error) return auth.error;
  const form = await request.formData();
  const file = form.get("logo");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 2_000_000) return NextResponse.json({ error: "Choose an image smaller than 2 MB" }, { status: 400 });
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "png";
  const path = `store/logo-${Date.now()}.${extension}`;
  const { error } = await auth.supabase.storage.from("product-media").upload(path, file, { contentType: file.type, upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data } = auth.supabase.storage.from("product-media").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
