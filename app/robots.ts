import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // invoices are capability URLs and the rest is per-customer state
      disallow: ["/admin", "/api", "/invoice", "/checkout", "/account", "/track"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
