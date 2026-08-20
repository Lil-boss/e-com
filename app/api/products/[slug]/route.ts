import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ configured: false });
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("id,name_bn,name_en,slug,sku,short_description,description,base_price,compare_at_price,weight_grams,categories(name_bn,slug),product_media(storage_path,alt_text,sort_order),product_variants(id,title,sku,price,compare_at_price,weight_grams,attributes,is_active,inventory(on_hand,reserved)),reviews(id,rating,title,body,created_at,is_verified)").eq("slug", slug).eq("status", "published").single();
  if (error || !data) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const { data: related } = await supabase.from("products").select("id,name_bn,slug,base_price,compare_at_price,weight_grams,product_media(storage_path,sort_order)").eq("status", "published").neq("id", data.id).limit(4);
  return NextResponse.json({ configured: true, product: data, related: related || [] });
}
