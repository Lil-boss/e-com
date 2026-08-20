import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/track`, changeFrequency: "yearly", priority: 0.3 },
  ];
  if (!isSupabaseConfigured) return staticRoutes;

  const supabase = await createClient();
  const [products, categories] = await Promise.all([
    supabase.from("products").select("slug,updated_at").eq("status", "published"),
    supabase.from("categories").select("slug").eq("is_active", true),
  ]);
  return [
    ...staticRoutes,
    ...(categories.data || []).map((category) => ({
      url: `${base}/products?category=${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...(products.data || []).map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
