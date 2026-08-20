import { NextRequest, NextResponse } from "next/server";
import { OWNER, requireStaff } from "@/lib/supabase/admin-auth";

const authorized = () => requireStaff(OWNER);

// Settings rows the admin may edit. "store" stays the default so existing calls keep working.
const EDITABLE = ["store", "pages", "delivery", "announcement"];
const settingsKey = (request: NextRequest) => {
  const key = new URL(request.url).searchParams.get("key") || "store";
  return EDITABLE.includes(key) ? key : null;
};

export async function GET(request: NextRequest) {
  const auth = await authorized();
  if (auth.error) return auth.error;
  const key = settingsKey(request);
  if (!key) return NextResponse.json({ error: "Unknown settings key" }, { status: 400 });
  const { data, error } = await auth.supabase.from("store_settings").select("key,value").eq("key", key).maybeSingle();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data?.value || {});
}

export async function PATCH(request: NextRequest) {
  const auth = await authorized();
  if (auth.error) return auth.error;
  const key = settingsKey(request);
  if (!key) return NextResponse.json({ error: "Unknown settings key" }, { status: 400 });
  const value = await request.json();
  const { data: before } = await auth.supabase.from("store_settings").select("value").eq("key", key).maybeSingle();
  const { data, error } = await auth.supabase.from("store_settings").upsert({ key, value, is_public: true, updated_by: auth.userId }).select().single();
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "settings.updated", entity_type: "store_settings", entity_id: key, before_data: before?.value || null, after_data: value });
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
