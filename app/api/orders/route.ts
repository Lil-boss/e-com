import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { evaluateCoupon } from "@/lib/coupons";
import { buildOrderLines, shippingFor, type OrderProduct } from "@/lib/order-lines";
import { throttle } from "@/lib/rate-limit";
import { notifyOrderPlaced } from "@/lib/notifications";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // each order reserves stock, so an unthrottled caller can lock the whole catalogue
  const limited = throttle(request, "order", 6, 10 * 60_000, "একটু পরে আবার চেষ্টা করুন");
  if (limited) return limited;
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
  const { rows: itemRows, subtotal, unavailable } = buildOrderLines(body.items, products as unknown as OrderProduct[]);
  if (unavailable) return NextResponse.json({ error: `"${unavailable}" পণ্যের নির্বাচিত ভ্যারিয়েন্টটি আর নেই, কার্ট থেকে আবার বেছে নিন` }, { status: 409 });
  if (!itemRows.length) return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
  const shipping = shippingFor(String(body.delivery_area || ""));

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

  // The payments ledger records what the customer says they sent. Staff verify the
  // reference and mark it paid; the order's payment_status stays the summary field.
  const reference = String(body.payment_reference || "").trim().slice(0, 60);
  await admin.from("payments").insert({
    order_id: order.id,
    method: order.payment_method,
    provider: order.payment_method === "mobile" ? "mfs" : order.payment_method,
    status: "pending",
    amount: order.grand_total,
    provider_reference: reference || null,
  });

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

