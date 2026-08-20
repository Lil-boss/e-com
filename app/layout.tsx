import "./globals.css";
import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { WishlistProvider } from "@/components/wishlist-provider";

export const metadata: Metadata = {
  title: "Torun Mart — বিশ্বস্ত পণ্য, সহজ কেনাকাটা",
  description: "খাঁটি খাবার, মৌসুমি ফল, বই ও দৈনন্দিন প্রয়োজন—সবকিছু এক জায়গায়।",
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
