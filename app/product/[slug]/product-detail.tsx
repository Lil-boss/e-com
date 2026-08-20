"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { SiteHeader } from "@/components/site-header";
import type { StoreSettings } from "@/lib/store-settings";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Facebook,
  Heart,
  Instagram,
  Leaf,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Sparkles,
  Truck,
  Undo2,
  ZoomIn,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import "./product.css";

const fallbackGallery = [
  "https://torunmart.com/wp-content/uploads/2025/09/1000131485.png",
  "https://torunmart.com/wp-content/uploads/2025/10/2.png",
  "https://torunmart.com/wp-content/uploads/2025/09/1000131481.png",
];

const fallbackRelated = [
  { id: "sundarban-honey-1kg", name: "সুন্দরবনের প্রাকৃতিক মধু", meta: "১ কেজি", price: "৳১,৭৯০", numericPrice: 1790, old: "৳১,৮৯০", image: "https://torunmart.com/wp-content/uploads/2025/09/1000131463-500x750.png" },
  { id: "mustard-oil-5l", name: "ঘানি ভাঙা সরিষার তেল", meta: "৫ লিটার", price: "৳১,৩০০", numericPrice: 1300, old: "৳১,৫০০", image: "https://torunmart.com/wp-content/uploads/2025/09/1000131497-500x750.png" },
  { id: "dabbas-dates-1kg", name: "দাব্বাস খেজুর", meta: "১ কেজি", price: "৳৬৫০", numericPrice: 650, old: "৳৭১৫", image: "https://torunmart.com/wp-content/uploads/2026/02/1000014206-500x750.jpg" },
  { id: "deshi-ghee-1kg", name: "দেশি গাওয়া ঘি", meta: "১ কেজি", price: "৳১,৬০০", numericPrice: 1600, old: "৳১,৮০০", image: "https://torunmart.com/wp-content/uploads/2026/02/35017-500x750.jpg" },
];

function ProductLogo({ logoUrl = "" }: { logoUrl?: string }) {
  return <Link className="pd-logo" href="/">{logoUrl ? <img src={logoUrl} alt="Torun Mart" /> : <><span><Leaf /></span><strong>তরুণ</strong><small>mart</small></>}</Link>;
}

/** Review submission. Signed-in only, because the insert policy keys on auth.uid(). */
function ReviewForm({ slug }: { slug: string }) {
  const [rating, setRating] = useState(5);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState("sending");
    setMessage("");
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, rating, title: data.get("title"), body: data.get("body") }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setState("idle"); setMessage(result.error || "রিভিউ পাঠানো যায়নি"); return; }
    setState("done");
  };

  if (state === "done") {
    return <p className="review-thanks"><Check /> ধন্যবাদ! মডারেশনের পর আপনার রিভিউটি প্রকাশ করা হবে।</p>;
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <div className="review-stars" role="radiogroup" aria-label="রেটিং">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} স্টার`} className={value <= rating ? "on" : ""} onClick={() => setRating(value)}>★</button>
        ))}
      </div>
      <input name="title" placeholder="সংক্ষিপ্ত শিরোনাম (ঐচ্ছিক)" maxLength={120} />
      <textarea name="body" rows={4} required minLength={10} placeholder="পণ্যটি নিয়ে আপনার অভিজ্ঞতা লিখুন..." />
      {message && <p className="review-error">{message}</p>}
      <button type="submit" disabled={state === "sending"}>{state === "sending" ? "পাঠানো হচ্ছে..." : "রিভিউ জমা দিন"}</button>
      <small>রিভিউ দিতে <Link href="/account">লগইন</Link> করা প্রয়োজন।</small>
    </form>
  );
}

export default function ProductDetail() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [gallery, setGallery] = useState(fallbackGallery);
  const [productInfo, setProductInfo] = useState({ id: "black-seed-honey-500g", name: "কালোজিরা ফুলের প্রিমিয়াম মধু", nameEn: "Black Seed Flower Honey", sku: "TM-HNY-500", category: "খাঁটি খাবার · মধু", description: "কালোজিরা ফুল থেকে মৌমাছির সংগ্রহ করা গাঢ় রঙের, তীব্র স্বাদ ও অনন্য ঘ্রাণের প্রাকৃতিক মধু। ছোট ব্যাচে সংগ্রহ করায় থাকে প্রকৃতির আসল স্বাদ।", price: 645, compareAtPrice: 745, weight: 500, stock: 20 });
  const [variants, setVariants] = useState<Array<{ id: string; title: string; price: number; stock: number | null }>>([]);
  const [variantId, setVariantId] = useState("");
  const [dynamicRelated, setDynamicRelated] = useState(fallbackRelated);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState("details");
  const [postcode, setPostcode] = useState("");
  const [checkedDelivery, setCheckedDelivery] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [store, setStore] = useState<StoreSettings>({});
  const storeLogoUrl = store.logo_url || "";
  const whatsapp = store.phone ? `https://wa.me/${store.phone.replace(/\D/g, "")}` : "";
  const { addItem, count, subtotal, openCart, closeCart } = useCart();
  const wishlist = useWishlist();
  const liked = wishlist.has(productInfo.id);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/products/${params.slug}`);
        const data = await response.json() as { configured?: boolean; product?: { id:string;name_bn:string;name_en?:string;slug:string;sku:string;short_description?:string;description?:string;base_price:number;compare_at_price?:number;weight_grams?:number;categories?:{name_bn?:string};product_media?:Array<{storage_path:string;sort_order:number}>;product_variants?:Array<{id:string;title:string;price:number;is_active:boolean;inventory?:{on_hand?:number}}> }; related?:Array<{id:string;name_bn:string;slug:string;base_price:number;compare_at_price?:number;weight_grams?:number;product_media?:Array<{storage_path:string}>}> };
        if (!response.ok || !data.configured || !data.product) return;
        const product = data.product;
        const media = [...(product.product_media || [])].sort((a,b) => a.sort_order - b.sort_order).map((item) => item.storage_path);
        if (media.length) { setGallery(media); setActiveImage(0); }
        const active = (product.product_variants || []).filter((row) => row.is_active);
        // inventory is not readable anonymously, so unknown stock counts as available
        // and reserve_order_stock stays the authority at checkout
        setVariants(active.map((row) => ({ id: row.id, title: row.title, price: Number(row.price ?? product.base_price), stock: row.inventory ? Number(row.inventory.on_hand || 0) : null })));
        setVariantId(active[0]?.id || "");
        setProductInfo({ id: product.slug, name: product.name_bn, nameEn: product.name_en || "", sku: product.sku, category: product.categories?.name_bn || "পণ্য", description: product.short_description || product.description || "", price: Number(product.base_price), compareAtPrice: Number(product.compare_at_price || 0), weight: Number(product.weight_grams || 0), stock: Number(product.product_variants?.[0]?.inventory?.on_hand || 0) });
        if (data.related?.length) setDynamicRelated(data.related.map((item) => ({ id:item.slug,name:item.name_bn,meta:item.weight_grams?`${item.weight_grams.toLocaleString("bn-BD")} গ্রাম`:"পণ্য",price:`৳${Number(item.base_price).toLocaleString("bn-BD")}`,numericPrice:Number(item.base_price),old:item.compare_at_price?`৳${Number(item.compare_at_price).toLocaleString("bn-BD")}`:"",image:item.product_media?.[0]?.storage_path||fallbackGallery[0] })));
      } catch { /* Keep the seeded design fallback during setup. */ }
      finally { setLoaded(true); }
    };
    loadProduct();
    fetch("/api/storefront", { cache: "no-store" }).then(response => response.json()).then(data => { const store = data.settings?.find((setting: { key: string }) => setting.key === "store")?.value; if (store) setStore(store as StoreSettings); }).catch(() => undefined);
  }, [params.slug]);

  useEffect(() => {
    if (!zoomOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomOpen(false);
      if (event.key === "ArrowLeft") setActiveImage((current) => (current + gallery.length - 1) % gallery.length);
      if (event.key === "ArrowRight") setActiveImage((current) => (current + 1) % gallery.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [zoomOpen]);

  const selectedVariant = variants.find((row) => row.id === variantId) || variants[0];
  const unitPrice = selectedVariant?.price ?? productInfo.price;
  const soldOut = (stock: number | null) => stock !== null && stock <= 0;
  const inStock = selectedVariant ? !soldOut(selectedVariant.stock) : productInfo.stock > 0;
  const discountPercent = productInfo.compareAtPrice > unitPrice
    ? Math.round((1 - unitPrice / productInfo.compareAtPrice) * 100)
    : 0;

  const addProductToCart = () => {
    addItem({ id: productInfo.id, name: productInfo.name, price: unitPrice, image: gallery[0], variant: selectedVariant?.title || (productInfo.weight ? `${productInfo.weight.toLocaleString("bn-BD")} গ্রাম` : productInfo.sku), href: `/product/${productInfo.id}`, variantId: selectedVariant?.id }, quantity);
    setAdded(true);
  };

  if (!loaded) {
    return (
      <main className="product-page">
        <SiteHeader logoUrl={storeLogoUrl} cartCount={count} cartSubtotal={subtotal} onOpenCart={openCart} />
        <div className="pd-container pd-loading">পণ্য লোড হচ্ছে...</div>
      </main>
    );
  }

  return (
    <main className="product-page">
      <div className="pd-announcement"><div className="pd-container"><span><Truck /> ঢাকায় ডেলিভারি ২–৩ দিন</span><p>প্রথম অর্ডারে ১০% ছাড় — কোড: <b>NOTUN10</b></p><a href="#help"><MessageCircle /> সাহায্য লাগবে?</a></div></div>

      <SiteHeader logoUrl={storeLogoUrl} cartCount={count} cartSubtotal={subtotal} onOpenCart={openCart} />

      <div className="pd-container breadcrumb"><Link href="/">হোম</Link><ChevronLeft /><Link href="/products">পণ্য</Link><ChevronLeft /><span>{productInfo.name}</span></div>

      <section className="pd-container product-overview">
        <div className="gallery">
          <div className="thumbs">
            {gallery.map((image, index) => <button className={activeImage === index ? "active" : ""} onClick={() => setActiveImage(index)} key={image}><Image src={image} alt={`${productInfo.name} — ছবি ${(index + 1).toLocaleString("bn-BD")}`} fill sizes="80px" /></button>)}
            <button className="video-thumb"><span>▶</span><small>ভিডিও</small></button>
          </div>
          <div className="main-image">
            <Image src={gallery[activeImage]} alt={productInfo.name} fill priority sizes="(max-width: 800px) 100vw, 50vw" />
            {discountPercent > 0 && <span className="sale-pill">{discountPercent.toLocaleString("bn-BD")}% ছাড়</span>}
            <button className="zoom" onClick={() => setZoomOpen(true)} aria-label="ছবি বড় করে দেখুন"><ZoomIn /></button>
            <div className="gallery-counter">{activeImage + 1} / {gallery.length}</div>
            <button className="gallery-prev" onClick={() => setActiveImage((activeImage + gallery.length - 1) % gallery.length)} aria-label="আগের ছবি"><ChevronLeft /></button>
            <button className="gallery-next" onClick={() => setActiveImage((activeImage + 1) % gallery.length)} aria-label="পরের ছবি"><ChevronRight /></button>
          </div>
        </div>

        <div className="product-summary">
          <div className="summary-topline"><span className={`stock ${inStock ? "" : "out"}`}><i /> {inStock ? "স্টকে আছে" : "স্টক শেষ"}</span><div><button onClick={() => wishlist.toggle(productInfo.id)} aria-pressed={liked} className={liked ? "liked" : ""}><Heart fill={liked ? "currentColor" : "none"} /> পছন্দ</button><button><Share2 /> শেয়ার</button></div></div>
          <p className="product-category">{productInfo.category}</p>
          <h1>{productInfo.name}</h1>
          <div className="review-line"><div className="pd-stars">★★★★★</div><strong>৪.৯</strong><a href="#reviews">রিভিউ দেখুন</a><span>SKU: {productInfo.sku}</span></div>
          <p className="intro">{productInfo.description}</p>

          <div className="price-block"><div><strong>৳{unitPrice.toLocaleString("bn-BD")}</strong>{productInfo.compareAtPrice > unitPrice && <><del>৳{productInfo.compareAtPrice.toLocaleString("bn-BD")}</del><span>আপনি বাঁচাচ্ছেন ৳{(productInfo.compareAtPrice - unitPrice).toLocaleString("bn-BD")}</span></>}</div><small>মূল্য ভ্যাটসহ</small></div>

          <div className="size-block"><div><strong>{variants.length > 1 ? "ভ্যারিয়েন্ট বেছে নিন" : "পণ্যের পরিমাণ"}</strong><a href="#details">পণ্যের তথ্য</a></div><div className="size-options">{(variants.length ? variants : [{ id: "", title: productInfo.weight ? `${productInfo.weight.toLocaleString("bn-BD")} গ্রাম` : "স্ট্যান্ডার্ড", price: productInfo.price, stock: productInfo.stock }]).map((row) => <button key={row.id || row.title} type="button" className={`${(selectedVariant?.id || "") === row.id ? "active" : ""} ${soldOut(row.stock) ? "sold-out" : ""}`} disabled={soldOut(row.stock)} aria-pressed={(selectedVariant?.id || "") === row.id} onClick={() => setVariantId(row.id)}>{(selectedVariant?.id || "") === row.id && <Check />} {row.title} <b>৳{row.price.toLocaleString("bn-BD")}</b>{soldOut(row.stock) && <small>স্টক শেষ</small>}</button>)}</div></div>

          <div className="purchase-row">
            <div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="পরিমাণ কমান"><Minus /></button><strong>{quantity}</strong><button onClick={() => setQuantity(quantity + 1)} aria-label="পরিমাণ বাড়ান"><Plus /></button></div>
            <button className={`cart-cta ${added ? "added" : ""}`} onClick={addProductToCart}>{added ? <><PackageCheck /> কার্টে যোগ হয়েছে</> : <><ShoppingBag /> কার্টে যোগ করুন <span>· ৳{(unitPrice * quantity).toLocaleString("bn-BD")}</span></>}</button>
          </div>
          <button className="buy-now" onClick={() => { addProductToCart(); closeCart(); router.push("/checkout"); }}>এখনই কিনুন <ArrowRight /></button>

          <div className="delivery-check">
            <div className="delivery-icon"><Truck /></div><div><strong>ডেলিভারি কখন পাবেন?</strong><p>আপনার এলাকার পোস্ট কোড দিয়ে দেখুন</p><label><input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="যেমন: ১২০৩" /><button onClick={() => setCheckedDelivery(true)}>চেক করুন</button></label>{checkedDelivery && <small><Check /> আনুমানিক ডেলিভারি: ২–৩ কার্যদিবস</small>}</div>
          </div>

          <div className="summary-assurance"><span><ShieldCheck /><p><strong>নিরাপদ পেমেন্ট</strong><small>ক্যাশ অন ডেলিভারি</small></p></span><span><Undo2 /><p><strong>সহজ রিটার্ন</strong><small>৭ দিনের মধ্যে</small></p></span><span><MessageCircle /><p><strong>সহায়তা</strong><small>সকাল ৯টা–রাত ১০টা</small></p></span></div>
        </div>
      </section>

      <section className="product-facts">
        <div className="pd-container facts-grid">
          <div><span><Leaf /></span><p><strong>প্রাকৃতিক সংগ্রহ</strong><small>কালোজিরা ফুল থেকে</small></p></div><div><span><ShieldCheck /></span><p><strong>মান যাচাইকৃত</strong><small>ছোট ব্যাচে সংগ্রহ</small></p></div><div><span><PackageCheck /></span><p><strong>নিরাপদ প্যাকেজিং</strong><small>ফুড-গ্রেড জারে</small></p></div><div><span><Truck /></span><p><strong>সারা দেশে ডেলিভারি</strong><small>২–৫ কার্যদিবস</small></p></div>
        </div>
      </section>

      <section className="pd-container detail-section" id="details">
        <div className="detail-tabs"><button className={tab === "details" ? "active" : ""} onClick={() => setTab("details")}>পণ্যের বিস্তারিত</button><button className={tab === "use" ? "active" : ""} onClick={() => setTab("use")}>ব্যবহার ও সংরক্ষণ</button><button className={tab === "delivery" ? "active" : ""} onClick={() => setTab("delivery")}>ডেলিভারি ও রিটার্ন</button><button className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>রিভিউ (৩৮)</button></div>
        {tab === "details" && <div className="detail-content"><div><span className="pd-eyebrow">নির্বাচিত মানের পণ্য</span><h2>{productInfo.name}</h2><p>{productInfo.description}</p><div className="benefit-list"><span><Check /> যাচাইকৃত সরবরাহকারীর পণ্য</span><span><Check /> নিরাপদ ও যত্নশীল প্যাকেজিং</span><span><Check /> সারা দেশে দ্রুত ডেলিভারি</span><span><Check /> সহজ রিটার্ন সহায়তা</span></div></div><aside><h3>এক নজরে</h3><dl><div><dt>ক্যাটাগরি</dt><dd>{productInfo.category}</dd></div><div><dt>SKU</dt><dd>{productInfo.sku}</dd></div><div><dt>ওজন</dt><dd>{productInfo.weight ? `${productInfo.weight.toLocaleString("bn-BD")} গ্রাম` : "প্রযোজ্য নয়"}</dd></div><div><dt>স্টক</dt><dd>{productInfo.stock > 0 ? `${productInfo.stock.toLocaleString("bn-BD")}টি পাওয়া যাচ্ছে` : "স্টক শেষ"}</dd></div><div><dt>সংরক্ষণ</dt><dd>শুষ্ক ও ঠান্ডা স্থানে</dd></div></dl></aside></div>}
        {tab === "use" && <div className="simple-tab"><h2>ব্যবহার ও সংরক্ষণ</h2><p>সকালে কুসুম গরম পানি, দুধ, রুটি বা নাশতার সঙ্গে পরিমাণমতো ব্যবহার করুন। সরাসরি রোদ থেকে দূরে, শুষ্ক ও ঠান্ডা স্থানে ঢাকনা বন্ধ করে রাখুন। প্রাকৃতিক মধুতে সময়ের সঙ্গে দানা বাঁধা স্বাভাবিক।</p></div>}
        {tab === "delivery" && <div className="simple-tab"><h2>ডেলিভারি ও রিটার্ন</h2><p>ঢাকার ভেতরে ২–৩ এবং ঢাকার বাইরে ৩–৫ কার্যদিবসে ডেলিভারি। ভুল, ভাঙা বা ত্রুটিপূর্ণ পণ্য পেলে গ্রহণের সাত দিনের মধ্যে ছবি বা ভিডিওসহ আমাদের জানান।</p></div>}
        {tab === "reviews" && <div className="simple-tab" id="reviews"><h2>ক্রেতাদের মতামত</h2><p>পণ্যটি কিনে থাকলে আপনার অভিজ্ঞতা জানান। মডারেশনের পর রিভিউটি এখানে দেখা যাবে।</p><ReviewForm slug={productInfo.id} /></div>}
      </section>

      <section className="related-section"><div className="pd-container"><div className="related-heading"><div><span className="pd-eyebrow">আপনার পছন্দ হতে পারে</span><h2>সঙ্গে আরও যা নিতে পারেন</h2></div><Link href="/products">সব দেখুন <ArrowRight /></Link></div><div className="related-grid">{dynamicRelated.map((item) => <article key={item.name}><div className="related-image"><Link href={`/product/${item.id}`} aria-label={`${item.name} বিস্তারিত দেখুন`}><Image src={item.image} alt={item.name} fill sizes="(max-width: 700px) 50vw, 25vw" /></Link><button onClick={() => wishlist.toggle(item.id)} aria-pressed={wishlist.has(item.id)} aria-label={`${item.name} পছন্দের তালিকায়`}><Heart fill={wishlist.has(item.id) ? "currentColor" : "none"} /></button></div><p>{item.meta}</p><h3><Link href={`/product/${item.id}`}>{item.name}</Link></h3><div><strong>{item.price}</strong><del>{item.old}</del><button onClick={() => addItem({ id: item.id, name: item.name, price: item.numericPrice, image: item.image, variant: item.meta, href: `/product/${item.id}` })} aria-label={`${item.name} কার্টে যোগ করুন`}><ShoppingBag /></button></div></article>)}</div></div></section>

      <section className="help-banner" id="help"><div className="pd-container"><div><span><MessageCircle /></span><p><strong>পণ্যটি নিয়ে কোনো প্রশ্ন আছে?</strong><small>আমাদের টিম আপনাকে সঠিক পণ্যটি বেছে নিতে সাহায্য করবে।</small></p></div>{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer noopener">WhatsApp-এ কথা বলুন <ArrowRight /></a>}</div></section>

      <footer className="pd-footer"><div className="pd-container pd-footer-grid"><div><ProductLogo logoUrl={storeLogoUrl} /><p>{store.tagline || "বিশ্বস্ত পণ্য, সহজ কেনাকাটা।"} সারা বাংলাদেশে যত্নের সঙ্গে ডেলিভারি।</p><span>{store.facebook && <a href={store.facebook} target="_blank" rel="noreferrer noopener" aria-label="Facebook"><Facebook /></a>}{store.instagram && <a href={store.instagram} target="_blank" rel="noreferrer noopener" aria-label="Instagram"><Instagram /></a>}{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer noopener" aria-label="WhatsApp"><MessageCircle /></a>}</span></div><div><h3>কেনাকাটা</h3><Link href="/products">সব পণ্য</Link><Link href="/products?category=pure-foods">খাঁটি খাবার</Link><Link href="/products?category=seasonal-fruits">মৌসুমি ফল</Link><Link href="/products?category=books">বই ও কম্বো</Link></div><div><h3>সহায়তা</h3><Link href="/track">অর্ডার ট্র্যাক</Link><Link href="/products?liked=1">পছন্দের তালিকা</Link>{store.phone && <a href={`tel:${store.phone}`}>যোগাযোগ</a>}</div><div><h3>যোগাযোগ</h3>{store.address && <p>{store.address}</p>}{store.phone && <strong>{store.phone}</strong>}{store.email && <a href={`mailto:${store.email}`}>{store.email}</a>}</div></div><div className="pd-container copyright">{store.footer || "© ২০২৬ তরুণ মার্ট। সর্বস্বত্ব সংরক্ষিত।"}</div></footer>

      {zoomOpen && <div className="product-lightbox" role="dialog" aria-modal="true" aria-label="পণ্যের বড় ছবি" onClick={() => setZoomOpen(false)}>
        <div className="lightbox-toolbar"><span>{activeImage + 1} / {gallery.length}</span><button onClick={() => setZoomOpen(false)} aria-label="বড় ছবি বন্ধ করুন"><X /></button></div>
        <button className="lightbox-prev" onClick={(event) => { event.stopPropagation(); setActiveImage((activeImage + gallery.length - 1) % gallery.length); }} aria-label="আগের ছবি"><ChevronLeft /></button>
        <div className="lightbox-image" onClick={(event) => event.stopPropagation()}><Image src={gallery[activeImage]} alt={`${productInfo.name} — ছবি ${activeImage + 1}`} fill priority sizes="100vw" /></div>
        <button className="lightbox-next" onClick={(event) => { event.stopPropagation(); setActiveImage((activeImage + 1) % gallery.length); }} aria-label="পরের ছবি"><ChevronRight /></button>
        <div className="lightbox-thumbs" onClick={(event) => event.stopPropagation()}>{gallery.map((image, index) => <button className={activeImage === index ? "active" : ""} onClick={() => setActiveImage(index)} key={image}><Image src={image} alt="" fill sizes="60px" /></button>)}</div>
      </div>}

      <div className="mobile-cart"><div><small>মোট মূল্য</small><strong>৳{(unitPrice * quantity).toLocaleString("bn-BD")}</strong></div><button onClick={addProductToCart}>{added ? <PackageCheck /> : <ShoppingBag />}{added ? "কার্টে যোগ হয়েছে" : "কার্টে যোগ করুন"}</button></div>
    </main>
  );
}
