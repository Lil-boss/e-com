"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, PackageSearch, Search, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { AnnouncementSettings, DeliverySettings, StoreSettings } from "@/lib/store-settings";
import { bengali, DEMO_CATEGORIES, DEMO_PRODUCTS, toCardProduct, type ApiProduct, type CardCategory, type CardProduct } from "@/lib/storefront";

const TONES = ["gold", "green", "rust", "cream"];

function Catalogue() {
  const params = useSearchParams();
  const router = useRouter();
  const search = params.get("q") || "";
  const category = params.get("category") || "";
  const likedOnly = params.get("liked") === "1";

  const [term, setTerm] = useState(search);
  const [products, setProducts] = useState<CardProduct[]>(DEMO_PRODUCTS);
  const [categories, setCategories] = useState<CardCategory[]>(DEMO_CATEGORIES);
  const [store, setStore] = useState<StoreSettings>({});
  const [delivery, setDelivery] = useState<DeliverySettings>();
  const [loading, setLoading] = useState(true);
  const { count, subtotal, openCart } = useCart();
  const { ids } = useWishlist();

  useEffect(() => setTerm(search), [search]);

  useEffect(() => {
    const query = new URLSearchParams({ all: "1" });
    if (search) query.set("q", search);
    if (category) query.set("category", category);
    setLoading(true);
    fetch(`/api/storefront?${query}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { configured?: boolean; products?: ApiProduct[]; categories?: Array<{ name_bn: string; slug: string; description?: string; image_path?: string }>; settings?: Array<{ key: string; value: StoreSettings & DeliverySettings & AnnouncementSettings }> }) => {
        if (!data.configured) return;
        const storeSettings = data.settings?.find((setting) => setting.key === "store")?.value as StoreSettings | undefined;
        if (storeSettings) setStore(storeSettings);
        setDelivery(data.settings?.find((setting) => setting.key === "delivery")?.value as DeliverySettings | undefined);
        if (data.categories?.length) setCategories(data.categories.map((item, index) => ({ name: item.name_bn, slug: item.slug, count: item.description || "পণ্য দেখুন", image: item.image_path || DEMO_CATEGORIES[index % 4].image, tone: TONES[index % 4] })));
        setProducts((data.products || []).map((product) => toCardProduct(product, storeSettings?.currency, DEMO_PRODUCTS[0].image)));
      })
      .catch(() => {
        // Demo data stays on screen when the API is unreachable.
      })
      .finally(() => setLoading(false));
  }, [search, category]);

  const visible = likedOnly ? products.filter((product) => ids.includes(product.id)) : products;
  const activeCategory = categories.find((item) => item.slug === category);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (term.trim()) query.set("q", term.trim());
    if (category) query.set("category", category);
    router.push(query.toString() ? `/products?${query}` : "/products");
  };

  const heading = likedOnly ? "পছন্দের তালিকা" : activeCategory?.name || (search ? `“${search}” এর ফলাফল` : "সব পণ্য");

  return (
    <main>
      <SiteHeader logoUrl={store.logo_url || ""} cartCount={count} cartSubtotal={subtotal} onOpenCart={openCart} />

      <section className="section catalogue">
        <div className="container">
          <nav className="breadcrumb" aria-label="ব্রেডক্রাম্ব"><Link href="/">হোম</Link><span>/</span><strong>{heading}</strong></nav>

          <div className="catalogue-head">
            <div className="section-heading">
              <span className="eyebrow">তরুণ মার্ট ক্যাটালগ</span>
              <div className="heading-row"><h2>{heading}</h2></div>
            </div>
            <form className="catalogue-search" onSubmit={submit} role="search">
              <Search size={18} />
              <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="পণ্যের নাম লিখুন..." aria-label="পণ্য খুঁজুন" />
              {term && <button type="button" className="clear" onClick={() => { setTerm(""); router.push(category ? `/products?category=${category}` : "/products"); }} aria-label="খোঁজা মুছুন"><X size={16} /></button>}
              <button type="submit">খুঁজুন</button>
            </form>
          </div>

          <div className="tabs catalogue-tabs">
            <Link className={!category && !likedOnly ? "active" : ""} href="/products">সব পণ্য</Link>
            {categories.map((item) => (
              <Link key={item.slug || item.name} className={category === item.slug ? "active" : ""} href={`/products?category=${item.slug}`}>{item.name}</Link>
            ))}
            <Link className={likedOnly ? "active" : ""} href="/products?liked=1"><Heart size={14} /> পছন্দ {ids.length > 0 && `(${bengali(ids.length)})`}</Link>
          </div>

          {loading ? (
            <p className="catalogue-empty">পণ্য লোড হচ্ছে...</p>
          ) : visible.length ? (
            <>
              <p className="catalogue-count">{bengali(visible.length)} টি পণ্য</p>
              <div className="product-grid">{visible.map((product) => <ProductCard product={product} key={product.id} />)}</div>
            </>
          ) : (
            <div className="catalogue-empty">
              <PackageSearch />
              <h3>{likedOnly ? "পছন্দের তালিকা এখনো খালি" : "কোনো পণ্য পাওয়া যায়নি"}</h3>
              <p>{likedOnly ? "পণ্যের কার্ডে হার্ট আইকনে ক্লিক করলে পণ্যটি এখানে জমা হবে।" : "অন্য শব্দ দিয়ে খুঁজুন অথবা সব পণ্য দেখুন।"}</p>
              <Link className="button primary" href="/products">সব পণ্য দেখুন</Link>
            </div>
          )}
        </div>
      </section>

      <SiteFooter store={store} delivery={delivery} categories={categories} />
    </main>
  );
}

export default function ProductsPage() {
  return <Suspense fallback={null}><Catalogue /></Suspense>;
}
