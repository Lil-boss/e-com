"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageSearch, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useStoreSettings } from "@/lib/store-settings";
import { DEMO_CATEGORIES } from "@/lib/storefront";

export default function TrackOrderPage() {
  const router = useRouter();
  const store = useStoreSettings();
  const { count, subtotal, openCart } = useCart();
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setChecking(true);
    setError("");
    const response = await fetch("/api/orders/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_number: data.get("order_number"), phone: data.get("phone") }),
    });
    const result = await response.json().catch(() => ({}));
    setChecking(false);
    if (!response.ok || !result.id) { setError(result.error || "অর্ডারটি পাওয়া যায়নি"); return; }
    router.push(`/invoice/${result.id}`);
  };

  return (
    <main>
      <SiteHeader logoUrl={store.logo_url || ""} cartCount={count} cartSubtotal={subtotal} onOpenCart={openCart} />
      <section className="section track-section">
        <div className="container">
          <nav className="breadcrumb" aria-label="ব্রেডক্রাম্ব"><Link href="/">হোম</Link><span>/</span><strong>অর্ডার ট্র্যাক</strong></nav>
          <div className="track-card">
            <span className="track-icon"><PackageSearch /></span>
            <span className="eyebrow">অর্ডারের খোঁজ</span>
            <h1>আপনার অর্ডারটি দেখুন</h1>
            <p>অর্ডার নম্বর ও যে ফোন নম্বর দিয়ে অর্ডার করেছিলেন সেটি দিন। অ্যাকাউন্ট লাগবে না।</p>
            <form onSubmit={submit}>
              <label>
                <span>অর্ডার নম্বর</span>
                <input name="order_number" required placeholder="TM-12345678" autoComplete="off" />
              </label>
              <label>
                <span>ফোন নম্বর</span>
                <input name="phone" required inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="tel" />
              </label>
              {error && <div className="track-error">{error}</div>}
              <button type="submit" disabled={checking}>
                <Search size={17} /> {checking ? "খোঁজা হচ্ছে..." : "অর্ডার দেখুন"}
              </button>
            </form>
            <small>অর্ডার নম্বরটি আপনার অর্ডার নিশ্চিতকরণ বার্তায় আছে।</small>
          </div>
        </div>
      </section>
      <SiteFooter store={store} categories={DEMO_CATEGORIES} />
    </main>
  );
}
