import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ configured: false });
  const supabase = await createClient();
  const [categories, products, sections, settings, reviews] = await Promise.all([
    supabase.from("categories").select("id,name_bn,name_en,slug,description,image_path,sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("products").select("id,name_bn,slug,sku,short_description,base_price,compare_at_price,weight_grams,product_media(storage_path,sort_order),reviews(rating)").eq("status", "published").eq("is_featured", true).order("published_at", { ascending: false }).limit(8),
    supabase.from("homepage_sections").select("section_key,section_type,title,subtitle,content,sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("store_settings").select("key,value").eq("is_public", true),
    supabase.from("reviews").select("id,rating,title,body,created_at,profiles(full_name),products(name_bn)").eq("status", "approved").order("created_at", { ascending: false }).limit(6),
  ]);
  const error = categories.error || products.error || sections.error || settings.error || reviews.error;
  if (error) return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  return NextResponse.json({ configured: true, categories: categories.data, products: products.data, sections: sections.data, settings: settings.data, reviews: reviews.data });
}
