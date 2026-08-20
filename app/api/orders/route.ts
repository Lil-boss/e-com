import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { evaluateCoupon } from "@/lib/coupons";
import { notifyOrderPlaced } from "@/lib/notifications";
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
  let unavailable = "";
  const itemRows: Array<{ product_id: string; variant_id: string | null; product_name: string; variant_name: string | null; sku: string; image_path: string | null; unit_price: number; quantity: number; discount_total: number; line_total: number }> = body.items.map((cartItem: { id: string; variantId?: string; quantity: number }) => {
    const product = products.find((candidate) => candidate.slug === cartItem.id)!;
    const active = product.product_variants?.filter((candidate) => candidate.is_active) || [];
    // an explicit choice must belong to this product and still be active; carts saved
    // before variant selection existed have no id and fall back to the first active one
    const chosen = cartItem.variantId ? active.find((candidate) => candidate.id === cartItem.variantId) : undefined;
    if (cartItem.variantId && !chosen) unavailable = product.name_bn;
    const variant = chosen || active[0] || product.product_variants?.[0];
    const price = Number(variant?.price ?? product.base_price);
    const quantity = Math.max(1, Math.min(20, Number(cartItem.quantity)));
    return { product_id: product.id, variant_id: variant?.id || null, product_name: product.name_bn, variant_name: variant?.title || null, sku: product.sku, image_path: product.product_media?.[0]?.storage_path || null, unit_price: price, quantity, discount_total: 0, line_total: price * quantity };
  });
  if (unavailable) return NextResponse.json({ error: `"${unavailable}" পণ্যের নির্বাচিত ভ্যারিয়েন্টটি আর নেই, কার্ট থেকে আবার বেছে নিন` }, { status: 409 });
  const subtotal = itemRows.reduce((sum, item) => sum + item.line_total, 0);
  const shipping = body.delivery_area === "dhaka" ? 70 : 120;

  const coupon = await evaluateCoupon(admin, body.coupon_code, subtotal);
  if (coupon.error) return NextResponse.json({ error: coupon.error }, { status: 400 });
  const discount = coupon.discount;

  const sessionClient = await createClient();
  const { data: claims } = await sessionClient.auth.getClaims();
  const customerId = claims?.claims?.sub || null;
  const orderNumber = `TM-${String(Date.now()).slice(-8)}`;
  const { data: order, error: orderError } = await admin.from("orders").insert({ order_number: orderNumber, customer_id: customerId, customer_name: String(body.customer_name), customer_phone: String(body.customer_phone), customer_email: body.customer_email || null, address_line: String(body.address_line), area: body.delivery_area, thana: String(body.thana), district: String(body.district), postal_code: body.postal_code || null, landmark: body.landmark || null, status: "pending", payment_status: "pending", payment_method: body.payment_method || "cod", subtotal, discount_total: discount, shipping_total: shipping, tax_total: 0, grand_total: subtotal - discount + shipping, coupon_code: coupon.code, customer_note: body.note || null, source: "web" }).select().single();
  if (orderError || !order) return NextResponse.json({ error: orderError?.message || "Order could not be created" }, { status: 400 });
  const { error: itemsError } = await admin.from("order_items").insert(itemRows.map((item) => ({ ...item, order_id: order.id })));
  if (itemsError) { await admin.from("orders").delete().eq("id", order.id); return NextResponse.json({ error: itemsError.message }, { status: 400 }); }

  const { error: stockError } = await admin.rpc("reserve_order_stock", { p_order_id: order.id });
  if (stockError) {
    await admin.from("orders").delete().eq("id", order.id);
    const outOfStock = stockError.message.split("INSUFFICIENT_STOCK:")[1];
    return NextResponse.json({ error: outOfStock ? `"${outOfStock.trim()}" পণ্যটির পর্যাপ্ত স্টক নেই` : "স্টক সংরক্ষণ করা যায়নি" }, { status: 409 });
  }

  await admin.from("order_status_events").insert({ order_id: order.id, to_status: "pending", note: "Order placed from storefront", customer_visible: true, created_by: customerId });

  // awaited but never fatal: an undelivered notice must not lose a paid-for order
  await notifyOrderPlaced({
    orderNumber: order.order_number,
    orderId: order.id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    grandTotal: Number(order.grand_total),
    itemCount: itemRows.reduce((sum, item) => sum + item.quantity, 0),
    invoiceUrl: new URL(`/invoice/${order.id}`, request.nextUrl.origin).toString(),
  });

  return NextResponse.json({ id: order.id, order_number: order.order_number, grand_total: order.grand_total, discount_total: discount }, { status: 201 });
}

