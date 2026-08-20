import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import ProductDetail from "./product-detail";

/** Server shell so each product gets its own title, description and share image. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isSupabaseConfigured) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name_bn,name_en,short_description,description,seo_title,seo_description,base_price,product_media(storage_path,sort_order)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return { title: "পণ্যটি পাওয়া যায়নি" };

  const title = data.seo_title || data.name_bn;
  const description = (data.seo_description || data.short_description || data.description || "").slice(0, 200) || undefined;
  const image = [...(data.product_media || [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
  return {
    title,
    description,
    alternates: { canonical: `/product/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/product/${slug}`,
      images: image ? [{ url: image, alt: data.name_bn }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default function ProductPage() {
  return <ProductDetail />;
}
