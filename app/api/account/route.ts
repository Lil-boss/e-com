import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { phoneKey } from "@/lib/phone";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function session() {
  if (!isSupabaseConfigured) return { error: NextResponse.json({ error: "Supabase is not configured" }, { status: 503 }) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { supabase, userId, phone: String(claims?.claims?.phone || "") };
}

/**
 * Orders placed before signing in carry no customer_id, so the account would
 * never show them. Claim them on the way in, matched by phone number.
 * ponytail: runs on every account load; move to the auth callback if it shows up in traces.
 */
async function claimGuestOrders(userId: string, phone: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  const key = phoneKey(phone);
  if (!secret || !supabaseUrl || key.length < 10) return;
  const admin = createAdminClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  await admin.from("orders").update({ customer_id: userId }).is("customer_id", null).ilike("customer_phone", `%${key}`);
}

export async function GET() {
  const auth = await session();
  if (auth.error) return auth.error;
  await claimGuestOrders(auth.userId, auth.phone);
  const [profile, orders] = await Promise.all([
    auth.supabase.from("profiles").select("id,full_name,phone,email").eq("id", auth.userId).maybeSingle(),
    auth.supabase.from("orders").select("id,order_number,status,payment_status,grand_total,created_at,order_items(product_name,quantity)").eq("customer_id", auth.userId).order("created_at", { ascending: false }).limit(25),
  ]);
  const error = profile.error || orders.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: profile.data, orders: orders.data || [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await session();
  if (auth.error) return auth.error;
  const body = await request.json();
  const updates = { full_name: String(body.full_name || "").trim(), email: String(body.email || "").trim() || null };
  if (!updates.full_name) return NextResponse.json({ error: "নাম প্রয়োজন" }, { status: 400 });
  const { data, error } = await auth.supabase.from("profiles").update(updates).eq("id", auth.userId).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}
