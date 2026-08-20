import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function session() {
  if (!isSupabaseConfigured) return { error: NextResponse.json({ error: "Supabase is not configured" }, { status: 503 }) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { supabase, userId };
}

const fields = (body: Record<string, unknown>, profileId: string) => ({
  profile_id: profileId,
  label: String(body.label || "বাসা").trim(),
  recipient_name: String(body.recipient_name || "").trim(),
  phone: String(body.phone || "").trim(),
  address_line: String(body.address_line || "").trim(),
  thana: String(body.thana || "").trim(),
  district: String(body.district || "").trim(),
  area: String(body.area || "").trim() || null,
  postal_code: String(body.postal_code || "").trim() || null,
  landmark: String(body.landmark || "").trim() || null,
  is_default: Boolean(body.is_default),
});

export async function GET() {
  const auth = await session();
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.from("customer_addresses").select("*").eq("profile_id", auth.userId).order("is_default", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await session();
  if (auth.error) return auth.error;
  const values = fields(await request.json(), auth.userId);
  if (!values.recipient_name || !values.phone || !values.address_line || !values.thana || !values.district) return NextResponse.json({ error: "নাম, ফোন, ঠিকানা, থানা ও জেলা প্রয়োজন" }, { status: 400 });
  if (values.is_default) await auth.supabase.from("customer_addresses").update({ is_default: false }).eq("profile_id", auth.userId);
  const { data, error } = await auth.supabase.from("customer_addresses").insert(values).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await session();
  if (auth.error) return auth.error;
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Address id is required" }, { status: 400 });
  const values = fields(body, auth.userId);
  if (values.is_default) await auth.supabase.from("customer_addresses").update({ is_default: false }).eq("profile_id", auth.userId);
  const { data, error } = await auth.supabase.from("customer_addresses").update(values).eq("id", body.id).eq("profile_id", auth.userId).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await session();
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Address id is required" }, { status: 400 });
  const { error } = await auth.supabase.from("customer_addresses").delete().eq("id", id).eq("profile_id", auth.userId);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ deleted: true, id });
}
