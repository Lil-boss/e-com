import { currencySymbol } from "@/lib/store-settings";

export type ApiProduct = {
  id: string; name_bn: string; slug: string; sku: string; short_description?: string;
  base_price: number; compare_at_price?: number; weight_grams?: number; category_id?: string | null;
  product_media?: Array<{ storage_path: string }>; reviews?: Array<{ rating: number }>;
};

export type CardCategory = { name: string; count: string; image: string; tone: string; slug: string };

export type CardProduct = {
  id: string; name: string; meta: string; price: string; numericPrice: number;
  oldPrice: string; discount: string; rating: string; reviews: string; image: string;
  badge: string; categoryId?: string | null;
};

export const bengali = (value: number) => value.toLocaleString("bn-BD");

/** Shapes one Supabase product row into the card model both the homepage and the catalogue render. */
export function toCardProduct(product: ApiProduct, currency: string | undefined, fallbackImage: string): CardProduct {
  const ratings = product.reviews || [];
  const average = ratings.length ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length : 0;
  const symbol = currencySymbol(currency);
  return {
    id: product.slug || product.id,
    name: product.name_bn,
    meta: product.weight_grams ? `${bengali(product.weight_grams)} গ্রাম` : product.short_description || product.sku,
    price: `${symbol}${bengali(Number(product.base_price))}`,
    numericPrice: Number(product.base_price),
    oldPrice: product.compare_at_price ? `${symbol}${bengali(Number(product.compare_at_price))}` : "",
    discount: product.compare_at_price ? `–${bengali(Math.round((1 - Number(product.base_price) / Number(product.compare_at_price)) * 100))}%` : "",
    rating: average ? bengali(Number(average.toFixed(1))) : "নতুন",
    reviews: bengali(ratings.length),
    image: product.product_media?.[0]?.storage_path || fallbackImage,
    badge: product.compare_at_price ? "বিশেষ মূল্য" : "নতুন",
    categoryId: product.category_id,
  };
}

/** Static fallbacks so the storefront still renders while Supabase is unreachable or unconfigured. */
export const DEMO_CATEGORIES: CardCategory[] = [
  { name: "খাঁটি খাবার", slug: "pure-foods", count: "২৪+ পণ্য", image: "https://torunmart.com/wp-content/uploads/2026/02/35017-500x750.jpg", tone: "gold" },
  { name: "মৌসুমি ফল", slug: "seasonal-fruits", count: "বাগান থেকে সরাসরি", image: "https://torunmart.com/wp-content/uploads/2026/06/RUIDc6187adb8f3340989ceb0d2562b70a2c-1-scaled-500x750.jpg", tone: "green" },
  { name: "বই ও কম্বো", slug: "books", count: "৩২+ বাছাই করা বই", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=85", tone: "rust" },
  { name: "ফ্যাশন ও লাইফস্টাইল", slug: "fashion", count: "নতুন কালেকশন", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85", tone: "cream" },
];

export const DEMO_PRODUCTS: CardProduct[] = [
  { id: "black-seed-honey-500g", name: "কালোজিরা ফুলের প্রিমিয়াম মধু", meta: "৫০০ গ্রাম · সংগ্রহ: সিরাজগঞ্জ", price: "৳৬৪৫", numericPrice: 645, oldPrice: "৳৭৪৫", discount: "–১৩%", rating: "৪.৯", reviews: "৩৮", image: "https://torunmart.com/wp-content/uploads/2025/09/1000131485.png", badge: "বেস্টসেলার" },
  { id: "dabbas-dates-1kg", name: "দাব্বাস খেজুর", meta: "১ কেজি · সৌদি আরব", price: "৳৬৫০", numericPrice: 650, oldPrice: "৳৭১৫", discount: "–৯%", rating: "৪.৮", reviews: "২৪", image: "https://torunmart.com/wp-content/uploads/2026/02/1000014206-500x750.jpg", badge: "খাঁটি পছন্দ" },
  { id: "deshi-ghee-1kg", name: "দেশি গাওয়া ঘি", meta: "১ কেজি · শতভাগ খাঁটি", price: "৳১,৬০০", numericPrice: 1600, oldPrice: "৳১,৮০০", discount: "–১১%", rating: "৪.৯", reviews: "৬১", image: "https://torunmart.com/wp-content/uploads/2026/02/35017-500x750.jpg", badge: "খাঁটি পছন্দ" },
  { id: "mustard-oil-5l", name: "সরিষার তেল — ফ্যামিলি প্যাক", meta: "৫ লিটার · ঘানি ভাঙা", price: "৳১,৩০০", numericPrice: 1300, oldPrice: "৳১,৫০০", discount: "–১৩%", rating: "৪.৭", reviews: "১৯", image: "https://torunmart.com/wp-content/uploads/2025/09/1000131497-500x750.png", badge: "ফ্যামিলি সেভিং" },
];

export const DEMO_REVIEWS = [
  { quote: "মধুর স্বাদ আর ঘ্রাণ দুটোই দারুণ। প্যাকেজিংও খুব যত্নের ছিল, সময়মতো হাতে পেয়েছি।", name: "আব্দুর রহিম", product: "কালোজিরা ফুলের মধু", initials: "আর" },
  { quote: "আমগুলো টাটকা ও মিষ্টি ছিল। বাগান থেকে সরাসরি এসেছে বোঝা যায়। আবার অর্ডার করব।", name: "আসমা আক্তার", product: "হিমসাগর আম — ১০ কেজি", initials: "আআ" },
  { quote: "এক জায়গা থেকে পছন্দের চারটি বই পেয়েছি। দাম ও ডেলিভারি—দুটোতেই সন্তুষ্ট।", name: "তৌফিক আহমেদ", product: "হুমায়ূন আহমেদ বই কম্বো", initials: "তআ" },
];

export const DEMO_HERO_SLIDES = [
  { image: "https://torunmart.com/wp-content/uploads/2025/10/1000115858-scaled-500x750.jpg", alt: "বাগান থেকে সংগ্রহ করা প্রিমিয়াম আম্রপালি আম", eyebrow: "আজকের পছন্দ", name: "প্রিমিয়াম আম্রপালি আম", price: "১০ কেজি · ৳১,৩০০" },
  { image: "https://torunmart.com/wp-content/uploads/2025/09/1000131485.png", alt: "কালোজিরা ফুলের প্রিমিয়াম মধু", eyebrow: "খাঁটি খাবার", name: "কালোজিরা ফুলের মধু", price: "৫০০ গ্রাম · ৳৬৪৫" },
  { image: "https://torunmart.com/wp-content/uploads/2025/09/1000131497-500x750.png", alt: "ঘানি ভাঙা সরিষার তেল", eyebrow: "পরিবারের জন্য", name: "ঘানি ভাঙা সরিষার তেল", price: "৫ লিটার · ৳১,৩০০" },
];
