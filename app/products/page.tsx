import type { Metadata } from "next";
import CataloguePage from "./catalogue";

export const metadata: Metadata = {
  title: "সব পণ্য",
  description: "খাঁটি খাবার, মৌসুমি ফল, বই ও দৈনন্দিন প্রয়োজন—তরুণ মার্টের সম্পূর্ণ ক্যাটালগ।",
  alternates: { canonical: "/products" },
};

export default function ProductsPage() {
  return <CataloguePage />;
}
