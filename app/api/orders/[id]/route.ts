import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/config";

// ponytail: capability URL — the order UUID is the secret, like a Stripe receipt link.
// Swap for an order-number plus phone lookup if invoices ever need to be guessable.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!isSupabaseConfigured || !supabaseUrl || !secret) return NextResponse.json({ configured: false });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const admin = createAdminClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin
    .from("orders")
    .select("id,order_number,customer_name,customer_phone,customer_email,address_line,area,thana,district,postal_code,landmark,status,payment_status,payment_method,subtotal,discount_total,shipping_total,tax_total,grand_total,coupon_code,customer_note,created_at,order_items(product_name,variant_name,sku,unit_price,quantity,line_total),shipments(courier,tracking_number)")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ configured: true, order: data });
}
