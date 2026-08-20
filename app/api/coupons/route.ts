import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { evaluateCoupon } from "@/lib/coupons";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/config";

/** Checkout preview only — /api/orders re-checks the coupon against server-side prices. */
export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!isSupabaseConfigured || !supabaseUrl || !secret) return NextResponse.json({ error: "কুপন যাচাই এখন সম্ভব নয়" }, { status: 503 });
  const body = await request.json();
  const subtotal = Math.max(0, Number(body.subtotal) || 0);
  const admin = createAdminClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await evaluateCoupon(admin, String(body.code || ""), subtotal);
  return result.error ? NextResponse.json({ error: result.error }, { status: 400 }) : NextResponse.json({ code: result.code, discount: result.discount });
}
