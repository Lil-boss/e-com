import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "রিভিউ দিতে হলে লগইন করুন" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const rating = Number(body.rating);
  const text = String(body.body || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "১ থেকে ৫ এর মধ্যে রেটিং দিন" }, { status: 400 });
  if (text.length < 10) return NextResponse.json({ error: "অন্তত ১০ অক্ষরের মতামত লিখুন" }, { status: 400 });

  const { data: product } = await supabase.from("products").select("id").eq("slug", String(body.slug || "")).eq("status", "published").maybeSingle();
  if (!product) return NextResponse.json({ error: "পণ্যটি পাওয়া যায়নি" }, { status: 404 });

  const { data: existing } = await supabase.from("reviews").select("id").eq("product_id", product.id).eq("customer_id", userId).maybeSingle();
  if (existing) return NextResponse.json({ error: "আপনি এই পণ্যের রিভিউ আগেই দিয়েছেন" }, { status: 409 });

  // "যাচাইকৃত ক্রয়" only when this customer actually received the product
  const { data: delivered } = await supabase
    .from("order_items")
    .select("id,orders!inner(customer_id,status)")
    .eq("product_id", product.id)
    .eq("orders.customer_id", userId)
    .eq("orders.status", "delivered")
    .limit(1);

  const { error } = await supabase.from("reviews").insert({
    product_id: product.id,
    customer_id: userId,
    order_item_id: delivered?.[0]?.id || null,
    rating,
    title: String(body.title || "").trim() || null,
    body: text.slice(0, 2000),
    is_verified: Boolean(delivered?.length),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // status defaults to pending: it appears once a moderator approves it
  return NextResponse.json({ ok: true, verified: Boolean(delivered?.length) }, { status: 201 });
}
