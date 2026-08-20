import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PRODUCT_FIELDS =
  "id,name_bn,slug,sku,short_description,base_price,compare_at_price,weight_grams,category_id,product_media(storage_path,sort_order),reviews(rating)";

/** PostgREST filter strings are comma/parenthesis delimited, so strip those before interpolating. */
const safeSearch = (value: string) => value.replace(/[,()%*\\]/g, " ").trim().slice(0, 60);

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ configured: false });
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const listAll = params.get("all") === "1";
  const search = safeSearch(params.get("q") || "");
  const categorySlug = params.get("category") || "";

  let productQuery = supabase.from("products").select(PRODUCT_FIELDS).eq("status", "published");
  if (listAll) {
    // ponytail: filter/limit is a flat 120 rows, add keyset pagination when the catalogue outgrows one page.
    if (search) productQuery = productQuery.or(`name_bn.ilike.%${search}%,name_en.ilike.%${search}%,sku.ilike.%${search}%`);
    productQuery = productQuery.order("published_at", { ascending: false }).limit(120);
  } else {
    productQuery = productQuery.eq("is_featured", true).order("published_at", { ascending: false }).limit(8);
  }

  const [categories, products, sections, settings, reviews] = await Promise.all([
    supabase.from("categories").select("id,name_bn,name_en,slug,description,image_path,sort_order").eq("is_active", true).order("sort_order"),
    productQuery,
    supabase.from("homepage_sections").select("section_key,section_type,title,subtitle,content,sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("store_settings").select("key,value").eq("is_public", true),
    supabase.from("reviews").select("id,rating,title,body,created_at,profiles(full_name),products(name_bn)").eq("status", "approved").order("created_at", { ascending: false }).limit(6),
  ]);
  const error = categories.error || products.error || sections.error || settings.error || reviews.error;
  if (error) return NextResponse.json({ configured: true, error: error.message }, { status: 500 });

  const wanted = categorySlug ? categories.data?.find((category) => category.slug === categorySlug)?.id : null;
  const productList = wanted ? (products.data || []).filter((product) => product.category_id === wanted) : products.data;

  return NextResponse.json({ configured: true, categories: categories.data, products: productList, sections: sections.data, settings: settings.data, reviews: reviews.data });
}
