import { NextRequest, NextResponse } from "next/server";
import { SUPPORT, requireStaff } from "@/lib/supabase/admin-auth";

const states = ["pending", "approved", "rejected", "flagged"];

export async function GET(request: NextRequest) {
  const auth = await requireStaff(SUPPORT);
  if (auth.error) return auth.error;
  const status = new URL(request.url).searchParams.get("status");
  let query = auth.supabase.from("reviews").select("id,rating,title,body,status,is_verified,created_at,products(name_bn,slug),profiles(full_name,phone)").order("created_at", { ascending: false }).limit(100);
  if (status && states.includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireStaff(SUPPORT);
  if (auth.error) return auth.error;
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Review id is required" }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (body.status) {
    if (!states.includes(body.status)) return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    updates.status = body.status;
  }
  if (typeof body.is_verified === "boolean") updates.is_verified = body.is_verified;
  if (!Object.keys(updates).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const { data, error } = await auth.supabase.from("reviews").update(updates).eq("id", body.id).select().single();
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "review.moderated", entity_type: "review", entity_id: body.id, after_data: updates });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireStaff(SUPPORT);
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Review id is required" }, { status: 400 });
  const { error } = await auth.supabase.from("reviews").delete().eq("id", id);
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "review.deleted", entity_type: "review", entity_id: id });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ deleted: true, id });
}
