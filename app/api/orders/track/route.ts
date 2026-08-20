import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { phoneKey } from "@/lib/phone";
import { throttle } from "@/lib/rate-limit";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/config";

// Deliberately identical for "no such order" and "wrong phone" so the endpoint
// cannot be used to discover which order numbers exist.
const NOT_FOUND = { error: "এই অর্ডার নম্বর ও ফোন নম্বরের মিল পাওয়া যায়নি" };

export async function POST(request: NextRequest) {
  const limited = throttle(request, "track", 15, 10 * 60_000, "অনেকবার চেষ্টা হয়েছে, একটু পরে দেখুন");
  if (limited) return limited;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!isSupabaseConfigured || !supabaseUrl || !secret) return NextResponse.json({ error: "Order backend is not configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const orderNumber = String(body.order_number || "").trim().toUpperCase();
  const phone = phoneKey(body.phone);
  if (!orderNumber || phone.length < 10) return NextResponse.json(NOT_FOUND, { status: 404 });

  const admin = createAdminClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await admin.from("orders").select("id,customer_phone").eq("order_number", orderNumber).maybeSingle();
  if (!data || phoneKey(data.customer_phone) !== phone) return NextResponse.json(NOT_FOUND, { status: 404 });

  return NextResponse.json({ id: data.id });
}
