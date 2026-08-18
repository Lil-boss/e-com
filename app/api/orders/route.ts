import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!isSupabaseConfigured || !supabaseUrl || !secret) return NextResponse.json({ error: "Order backend is not configured" }, { status: 503 });
  const body = await request.json();
  if (!Array.isArray(body.items) || !body.items.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  const required = ["customer_name","customer_phone","address_line","thana","district"];
  if (required.some((key) => !String(body[key] || "").trim())) return NextResponse.json({ error: "Required delivery information is missing" }, { status: 400 });

  const admin = createAdminClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const slugs = body.items.map((item: { id: string }) => item.id);
  const { data: products, error: productError } = await admin.from("products").select("id,slug,sku,name_bn,base_price,status,product_media(storage_path,sort_order),product_variants(id,title,price,is_active)").in("slug", slugs).eq("status", "published");
  if (productError || !products || products.length !== slugs.length) return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
  const itemRows: Array<{ product_id: string; variant_id: string | null; product_name: string; variant_name: string | null; sku: string; image_path: string | null; unit_price: number; quantity: number; discount_total: number; line_total: number }> = body.items.map((cartItem: { id: string; quantity: number }) => {
    const product = products.find((candidate) => candidate.slug === cartItem.id)!;
    const variant = product.product_variants?.find((candidate) => candidate.is_active) || product.product_variants?.[0];
    const price = Number(variant?.price ?? product.base_price);
    const quantity = Math.max(1, Math.min(20, Number(cartItem.quantity)));
    return { product_id: product.id, variant_id: variant?.id || null, product_name: product.name_bn, variant_name: variant?.title || null, sku: variant ? product.sku : product.sku, image_path: product.product_media?.[0]?.storage_path || null, unit_price: price, quantity, discount_total: 0, line_total: price * quantity };
  });
  const subtotal = itemRows.reduce((sum, item) => sum + item.line_total, 0);
  const shipping = body.delivery_area === "dhaka" ? 70 : 120;
  const sessionClient = await createClient();
  const { data: claims } = await sessionClient.auth.getClaims();
  const customerId = claims?.claims?.sub || null;
  const orderNumber = `TM-${String(Date.now()).slice(-8)}`;
  const { data: order, error: orderError } = await admin.from("orders").insert({ order_number: orderNumber, customer_id: customerId, customer_name: String(body.customer_name), customer_phone: String(body.customer_phone), customer_email: body.customer_email || null, address_line: String(body.address_line), area: body.delivery_area, thana: String(body.thana), district: String(body.district), postal_code: body.postal_code || null, landmark: body.landmark || null, status: "pending", payment_status: "pending", payment_method: body.payment_method || "cod", subtotal, discount_total: 0, shipping_total: shipping, tax_total: 0, grand_total: subtotal + shipping, customer_note: body.note || null, source: "web" }).select().single();
  if (orderError || !order) return NextResponse.json({ error: orderError?.message || "Order could not be created" }, { status: 400 });
  const { error: itemsError } = await admin.from("order_items").insert(itemRows.map((item) => ({ ...item, order_id: order.id })));
  if (itemsError) { await admin.from("orders").delete().eq("id", order.id); return NextResponse.json({ error: itemsError.message }, { status: 400 }); }
  await admin.from("order_status_events").insert({ order_id: order.id, to_status: "pending", note: "Order placed from storefront", customer_visible: true, created_by: customerId });
  return NextResponse.json({ id: order.id, order_number: order.order_number, grand_total: order.grand_total }, { status: 201 });
}
