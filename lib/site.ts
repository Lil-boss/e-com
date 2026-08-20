/** Absolute origin for canonical URLs, sitemaps and share cards. */
export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
