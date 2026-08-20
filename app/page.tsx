"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Leaf,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AnnouncementSettings, DeliverySettings, StoreSettings } from "@/lib/store-settings";
import {
  DEMO_CATEGORIES,
  DEMO_HERO_SLIDES,
  DEMO_PRODUCTS,
  DEMO_REVIEWS,
  bengali,
  toCardProduct,
  type ApiProduct,
  type CardCategory,
  type CardProduct,
} from "@/lib/storefront";

const TONES = ["gold", "green", "rust", "cream"];
const REVIEWS_PER_PAGE = 3;

const seasonalFallback = {
  title: "বাগান থেকে সোজা আপনার টেবিলে",
  subtitle: "মৌসুমি আয়োজন",
  description: "ফরমালিনমুক্ত, পরিপক্ব এবং যত্নে বাছাই করা হিমসাগর আম। অর্ডারের পর বাগান থেকে সংগ্রহ করে পাঠানো হয়।",
  image: "https://torunmart.com/wp-content/uploads/2025/10/1000115858-scaled-500x750.jpg",
  price: "৳১,১০০",
  oldPrice: "৳১,২০০",
  cta: "প্রি-অর্ডার করুন",
};

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <div className="heading-row">
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [heroSlide, setHeroSlide] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");
  const [categories, setCategories] = useState<CardCategory[]>(DEMO_CATEGORIES);
  const [products, setProducts] = useState<CardProduct[]>(DEMO_PRODUCTS);
  const [reviews, setReviews] = useState(DEMO_REVIEWS);
  const [heroSlides, setHeroSlides] = useState(DEMO_HERO_SLIDES);
  const [heroCopy, setHeroCopy] = useState({ title: "", subtitle: "" });
  const [seasonal, setSeasonal] = useState(seasonalFallback);
  const [store, setStore] = useState<StoreSettings>({});
  const [delivery, setDelivery] = useState<DeliverySettings>();
  const [announcement, setAnnouncement] = useState<AnnouncementSettings>({ text: "নতুন ক্রেতার প্রথম অর্ডারে ১০% ছাড়", code: "NOTUN10", enabled: true });
  const { count, subtotal, openCart } = useCart();

  useEffect(() => {
    const timer = window.setInterval(() => setHeroSlide((current) => (current + 1) % heroSlides.length), 5500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const loadStorefront = async () => {
      try {
        const response = await fetch("/api/storefront", { cache: "no-store" });
        const data = await response.json() as {
          configured?: boolean;
          categories?: Array<{ name_bn: string; slug: string; description?: string; image_path?: string }>;
          products?: ApiProduct[];
          sections?: Array<{ section_key: string; title?: string; subtitle?: string; content: Record<string, string | undefined> & { slides?: Array<{ image: string; eyebrow: string; name: string; price: string }> } }>;
          reviews?: Array<{ id: string; rating: number; body: string; profiles?: { full_name?: string } | null; products?: { name_bn?: string } | null }>;
          settings?: Array<{ key: string; value: Record<string, unknown> }>;
        };
        if (!response.ok || !data.configured) return;

        const storeSettings = data.settings?.find((setting) => setting.key === "store")?.value as StoreSettings | undefined;
        if (storeSettings) setStore(storeSettings);
        setDelivery(data.settings?.find((setting) => setting.key === "delivery")?.value as DeliverySettings | undefined);
        const announcementSettings = data.settings?.find((setting) => setting.key === "announcement")?.value as AnnouncementSettings | undefined;
        if (announcementSettings) setAnnouncement(announcementSettings);

        if (data.categories?.length) setCategories(data.categories.slice(0, 4).map((category, index) => ({ name: category.name_bn, slug: category.slug, count: category.description || "পণ্য দেখুন", image: category.image_path || DEMO_CATEGORIES[index % 4].image, tone: TONES[index % 4] })));
        if (data.products?.length) setProducts(data.products.slice(0, 8).map((product) => toCardProduct(product, storeSettings?.currency, DEMO_PRODUCTS[0].image)));

        const hero = data.sections?.find((section) => section.section_key === "hero");
        if (hero) {
          setHeroCopy({ title: hero.title || "", subtitle: hero.subtitle || "" });
          if (hero.content.slides?.length) { setHeroSlides(hero.content.slides.map((slide) => ({ ...slide, alt: slide.name }))); setHeroSlide(0); }
        }
        const campaign = data.sections?.find((section) => section.section_key === "seasonal");
        if (campaign) setSeasonal({ ...seasonalFallback, ...campaign.content, title: campaign.title || seasonalFallback.title, subtitle: campaign.subtitle || seasonalFallback.subtitle });

        if (data.reviews?.length) setReviews(data.reviews.map((review) => { const name = review.profiles?.full_name || "যাচাইকৃত ক্রেতা"; return { quote: review.body, name, product: review.products?.name_bn || "তরুণ মার্ট পণ্য", initials: name.slice(0, 2) }; }));
      } catch {
        // Static fallback content keeps the storefront available during setup.
      }
    };
    loadStorefront();
  }, []);

  const showPreviousSlide = () => setHeroSlide((heroSlide + heroSlides.length - 1) % heroSlides.length);
  const showNextSlide = () => setHeroSlide((heroSlide + 1) % heroSlides.length);
  const reviewPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const visibleReviews = reviews.slice(reviewPage * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE + REVIEWS_PER_PAGE);
  const seasonalHref = categories.find((category) => category.slug === "seasonal-fruits")?.slug ? "/products?category=seasonal-fruits" : "/products";

  return (
    <main>
      {announcement.enabled !== false && (
        <div className="announcement">
          <div className="container announcement-inner">
            <p><Sparkles size={14} /> {announcement.text} {announcement.code && <>— কোড: <b>{announcement.code}</b></>}</p>
            <div>
              <span><Clock3 size={14} /> সকাল ৯টা – রাত ১০টা</span>
              {store.phone && <a href={`tel:${store.phone}`}><MessageCircle size={14} /> সাহায্য লাগবে?</a>}
            </div>
          </div>
        </div>
      )}

      <SiteHeader logoUrl={store.logo_url || ""} cartCount={count} cartSubtotal={subtotal} onOpenCart={openCart} categories={categories} />

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker"><Leaf size={17} /> {heroCopy.subtitle || "প্রকৃতির কাছ থেকে, আপনার পরিবারের জন্য"}</span>
            <h1>{heroCopy.title ? heroCopy.title : <>বিশ্বস্ত পণ্য,<br /><em>সহজ কেনাকাটা।</em></>}</h1>
            <p>খাঁটি খাবার, মৌসুমি ফল, বই ও দৈনন্দিন প্রয়োজন—যাচাইকৃত মানে, সারা বাংলাদেশে ডেলিভারি।</p>
            <div className="hero-actions">
              <Link className="button primary" href="/products">এখনই কিনুন <ArrowRight size={18} /></Link>
            </div>
            <div className="hero-proof">
              <div className="avatars"><span>স</span><span>আ</span><span>র</span><span>ত</span></div>
              <div><div className="stars">★★★★★</div><p><strong>৪.৮/৫</strong> · ৫০০+ সন্তুষ্ট ক্রেতা</p></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-wrap">
              <Image className="hero-slide-image" key={heroSlides[heroSlide].image} src={heroSlides[heroSlide].image} alt={heroSlides[heroSlide].alt} fill priority={heroSlide === 0} sizes="(max-width: 900px) 100vw, 55vw" />
            </div>
            <div className="floating-card quality"><span><ShieldCheck /></span><div><strong>যাচাইকৃত মান</strong><small>প্রতিটি পণ্য বাছাই করা</small></div></div>
            <div className="floating-card delivery"><span><Truck /></span><div><strong>দ্রুত ডেলিভারি</strong><small>ঢাকায় {delivery?.inside_days || "২–৩ কার্যদিবস"}</small></div></div>
            <div className="hero-slider-controls">
              <button onClick={showPreviousSlide} aria-label="আগের ছবি"><ChevronLeft /></button>
              <div>{heroSlides.map((slide, index) => <button className={heroSlide === index ? "active" : ""} onClick={() => setHeroSlide(index)} aria-label={`${slide.name} দেখুন`} key={slide.name} />)}</div>
              <button onClick={showNextSlide} aria-label="পরের ছবি"><ChevronRight /></button>
            </div>
            <div className="hero-label" key={heroSlides[heroSlide].name}><small>{heroSlides[heroSlide].eyebrow}</small><strong>{heroSlides[heroSlide].name}</strong><span>{heroSlides[heroSlide].price}</span></div>
          </div>
        </div>
      </section>

      <section className="trust-bar">
        <div className="container trust-grid">
          <div><span><ShieldCheck /></span><p><strong>যাচাইকৃত মান</strong><small>বিশ্বস্ত উৎস থেকে সংগ্রহ</small></p></div>
          <div><span><Truck /></span><p><strong>সারা দেশে ডেলিভারি</strong><small>নিরাপদ ও সময়মতো</small></p></div>
          <div><span><Undo2 /></span><p><strong>{bengali(Number(delivery?.return_days || 7))} দিনের সহজ রিটার্ন</strong><small>শর্তসাপেক্ষে বদলে নিন</small></p></div>
          <div><span><MessageCircle /></span><p><strong>মানবিক সহায়তা</strong><small>প্রয়োজনে আমরা পাশে আছি</small></p></div>
        </div>
      </section>

      <section className="section categories" id="categories">
        <div className="container">
          <SectionHeading eyebrow="সহজে খুঁজে নিন" title="আপনার প্রয়োজনের ক্যাটাগরি" copy="প্রতিদিনের দরকার থেকে বিশেষ দিনের উপহার—সবকিছু সাজানো, যেন পছন্দ করতে সময় কম লাগে।" />
          <div className="category-grid">
            {categories.map((category, index) => (
              <Link className={`category-card ${category.tone}`} href={category.slug ? `/products?category=${category.slug}` : "/products"} key={category.slug || category.name}>
                <Image src={category.image} alt="" fill sizes="(max-width: 700px) 50vw, 25vw" />
                <span className="category-number">0{index + 1}</span>
                <div><small>{category.count}</small><h3>{category.name}</h3><span>দেখুন <ArrowRight size={15} /></span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section products-section" id="products">
        <div className="container">
          <div className="products-head">
            <SectionHeading eyebrow="ক্রেতাদের সবচেয়ে পছন্দ" title="জনপ্রিয় পণ্য" />
            <div className="tabs">
              <Link className="active" href="/products">সব পণ্য</Link>
              {categories.slice(0, 3).map((category) => <Link key={category.slug || category.name} href={category.slug ? `/products?category=${category.slug}` : "/products"}>{category.name}</Link>)}
            </div>
          </div>
          <div className="product-grid">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div>
          <Link className="view-all" href="/products">সব পণ্য দেখুন <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="seasonal-section">
        <div className="container seasonal-card">
          <div className="seasonal-photo"><Image src={seasonal.image} alt={seasonal.title} fill sizes="(max-width: 800px) 100vw, 50vw" /><span>সীমিত সময়</span></div>
          <div className="seasonal-copy">
            <span className="eyebrow light">{seasonal.subtitle}</span>
            <h2>{seasonal.title}</h2>
            <p>{seasonal.description}</p>
            <div className="seasonal-points"><span><Leaf /> প্রাকৃতিকভাবে পরিপক্ব</span><span><PackageCheck /> নিরাপদ প্যাকেজিং</span></div>
            <div className="seasonal-action">
              <div><small>১০ কেজি বক্স</small><strong>{seasonal.price} {seasonal.oldPrice && <del>{seasonal.oldPrice}</del>}</strong></div>
              <Link className="button saffron" href={seasonalHref}>{seasonal.cta} <ArrowRight size={18} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section story-section">
        <div className="container story-grid">
          <div className="story-copy">
            <span className="eyebrow">কেন তরুণ মার্ট</span>
            <h2>শুধু পণ্য নয়,<br />আমরা পৌঁছে দিই <em>আস্থা।</em></h2>
            <p>দেশের বিভিন্ন প্রান্তের উৎপাদক ও বিশ্বস্ত সরবরাহকারীদের সঙ্গে সরাসরি কাজ করি। প্রতিটি পণ্য সংগ্রহ, প্যাকেজিং এবং ডেলিভারির প্রতিটি ধাপে থাকে আমাদের নজর।</p>
            <Link className="story-link" href="/products">আমাদের পণ্য দেখুন <ArrowRight size={17} /></Link>
          </div>
          <div className="story-steps">
            <div><span>১</span><i><Leaf /></i><h3>উৎস যাচাই</h3><p>বিশ্বস্ত উৎপাদক ও সরবরাহকারী নির্বাচন</p></div>
            <div><span>২</span><i><ShieldCheck /></i><h3>মান পরীক্ষা</h3><p>প্যাকিংয়ের আগে পণ্য ভালোভাবে যাচাই</p></div>
            <div><span>৩</span><i><Truck /></i><h3>যত্নে ডেলিভারি</h3><p>নিরাপদ প্যাকেজিংয়ে আপনার দরজায়</p></div>
          </div>
        </div>
      </section>

      <section className="section reviews-section">
        <div className="container">
          <div className="reviews-head">
            <SectionHeading eyebrow="সত্যিকারের অভিজ্ঞতা" title="ক্রেতারা যা বলছেন" />
            {reviewPages > 1 && (
              <div className="slider-buttons">
                <button onClick={() => setReviewPage((reviewPage + reviewPages - 1) % reviewPages)} aria-label="আগের রিভিউ"><ChevronLeft /></button>
                <button onClick={() => setReviewPage((reviewPage + 1) % reviewPages)} aria-label="পরের রিভিউ"><ChevronRight /></button>
              </div>
            )}
          </div>
          <div className="review-grid">
            {visibleReviews.map((review) => <article className="review-card" key={review.name + review.quote.slice(0, 12)}><div className="quote-mark">“</div><div className="stars">★★★★★</div><blockquote>{review.quote}</blockquote><footer><span>{review.initials}</span><p><strong>{review.name}</strong><small>কিনেছেন: {review.product}</small></p><ShieldCheck /></footer></article>)}
          </div>
        </div>
      </section>

      <section className="newsletter" id="support">
        <div className="container newsletter-inner">
          <div><span>নতুন খবর, নতুন অফার</span><h2>ভালো পণ্যের খবর<br />সবার আগে পান।</h2></div>
          <form onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const email = new FormData(form).get("email");
            setSubscribeError("");
            const response = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
            if (!response.ok) { const result = await response.json().catch(() => ({})); setSubscribeError(result.error || "সাবস্ক্রাইব করা যায়নি"); return; }
            setSubscribed(true);
            form.reset();
          }}>
            <label>
              <input type="email" name="email" required placeholder="আপনার ইমেইল ঠিকানা" aria-label="ইমেইল ঠিকানা" />
              <button type="submit" aria-label="সাবস্ক্রাইব করুন">{subscribed ? <Check /> : <ArrowRight />}</button>
            </label>
            <small>{subscribeError || (subscribed ? "ধন্যবাদ! নতুন অফারের খবর আপনাকে জানানো হবে।" : "সাবস্ক্রাইব করলে আপনি আমাদের গোপনীয়তা নীতিতে সম্মতি দিচ্ছেন।")}</small>
          </form>
        </div>
      </section>

      <SiteFooter store={store} delivery={delivery} categories={categories} />
    </main>
  );
}
