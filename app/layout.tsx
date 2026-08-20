import "./globals.css";
import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { siteUrl } from "@/lib/site";
import { WishlistProvider } from "@/components/wishlist-provider";

const description = "খাঁটি খাবার, মৌসুমি ফল, বই ও দৈনন্দিন প্রয়োজন—সবকিছু এক জায়গায়।";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  // per-page titles slot into the template; the default is the homepage title
  title: { default: "Torun Mart — বিশ্বস্ত পণ্য, সহজ কেনাকাটা", template: "%s · Torun Mart" },
  description,
  openGraph: { siteName: "Torun Mart", locale: "bn_BD", type: "website", description },
  twitter: { card: "summary_large_image", description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@100..800&display=swap" rel="stylesheet" />
      </head>
      <body><WishlistProvider><CartProvider>{children}</CartProvider></WishlistProvider></body>
    </html>
  );
}
