"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Facebook,
  Heart,
  Home,
  Instagram,
  Leaf,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";

const categories = [
  {
    name: "খাঁটি খাবার",
    count: "২৪+ পণ্য",
    image: "https://torunmart.com/wp-content/uploads/2026/02/35017-500x750.jpg",
    tone: "gold",
  },
  {
    name: "মৌসুমি ফল",
    count: "বাগান থেকে সরাসরি",
    image: "https://torunmart.com/wp-content/uploads/2026/06/RUIDc6187adb8f3340989ceb0d2562b70a2c-1-scaled-500x750.jpg",
    tone: "green",
  },
  {
    name: "বই ও কম্বো",
    count: "৩২+ বাছাই করা বই",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=85",
    tone: "rust",
  },
  {
    name: "ফ্যাশন ও লাইফস্টাইল",
    count: "নতুন কালেকশন",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85",
    tone: "cream",
  },
];

const products = [
  {
    id: "black-seed-honey-500g",
    name: "কালোজিরা ফুলের প্রিমিয়াম মধু",
    meta: "৫০০ গ্রাম · সংগ্রহ: সিরাজগঞ্জ",
    price: "৳৬৪৫",
    numericPrice: 645,
    oldPrice: "৳৭৪৫",
    discount: "–১৩%",
    rating: "৪.৯",
    reviews: "৩৮",
    image: "https://torunmart.com/wp-content/uploads/2025/09/1000131485.png",
    badge: "বেস্টসেলার",
  },
  {
    id: "dabbas-dates-1kg",
    name: "দাব্বাস খেজুর",
    meta: "১ কেজি · সৌদি আরব",
    price: "৳৬৫০",
    numericPrice: 650,
    oldPrice: "৳৭১৫",
    discount: "–৯%",
    rating: "৪.৮",
    reviews: "২৪",
    image: "https://torunmart.com/wp-content/uploads/2026/02/1000014206-500x750.jpg",
    badge: "খাঁটি পছন্দ",
  },
  {
    id: "deshi-ghee-1kg",
    name: "দেশি গাওয়া ঘি",
    meta: "১ কেজি · শতভাগ খাঁটি",
    price: "৳১,৬০০",
    numericPrice: 1600,
    oldPrice: "৳১,৮০০",
    discount: "–১১%",
    rating: "৪.৯",
    reviews: "৬১",
    image: "https://torunmart.com/wp-content/uploads/2026/02/35017-500x750.jpg",
    badge: "খাঁটি পছন্দ",
  },
  {
    id: "mustard-oil-5l",
    name: "সরিষার তেল — ফ্যামিলি প্যাক",
    meta: "৫ লিটার · ঘানি ভাঙা",
    price: "৳১,৩০০",
    numericPrice: 1300,
    oldPrice: "৳১,৫০০",
    discount: "–১৩%",
    rating: "৪.৭",
    reviews: "১৯",
    image: "https://torunmart.com/wp-content/uploads/2025/09/1000131497-500x750.png",
    badge: "ফ্যামিলি সেভিং",
  },
];

const reviews = [
  {
    quote: "মধুর স্বাদ আর ঘ্রাণ দুটোই দারুণ। প্যাকেজিংও খুব যত্নের ছিল, সময়মতো হাতে পেয়েছি।",
    name: "আব্দুর রহিম",
    product: "কালোজিরা ফুলের মধু",
    initials: "আর",
  },
  {
    quote: "আমগুলো টাটকা ও মিষ্টি ছিল। বাগান থেকে সরাসরি এসেছে বোঝা যায়। আবার অর্ডার করব।",
    name: "আসমা আক্তার",
    product: "হিমসাগর আম — ১০ কেজি",
    initials: "আআ",
  },
  {
    quote: "এক জায়গা থেকে পছন্দের চারটি বই পেয়েছি। দাম ও ডেলিভারি—দুটোতেই সন্তুষ্ট।",
    name: "তৌফিক আহমেদ",
    product: "হুমায়ূন আহমেদ বই কম্বো",
    initials: "তআ",
  },
];

const heroSlides = [
  { image: "https://torunmart.com/wp-content/uploads/2025/10/1000115858-scaled-500x750.jpg", alt: "বাগান থেকে সংগ্রহ করা প্রিমিয়াম আম্রপালি আম", eyebrow: "আজকের পছন্দ", name: "প্রিমিয়াম আম্রপালি আম", price: "১০ কেজি · ৳১,৩০০" },
  { image: "https://torunmart.com/wp-content/uploads/2025/09/1000131485.png", alt: "কালোজিরা ফুলের প্রিমিয়াম মধু", eyebrow: "খাঁটি খাবার", name: "কালোজিরা ফুলের মধু", price: "৫০০ গ্রাম · ৳৬৪৫" },
  { image: "https://torunmart.com/wp-content/uploads/2025/09/1000131497-500x750.png", alt: "ঘানি ভাঙা সরিষার তেল", eyebrow: "পরিবারের জন্য", name: "ঘানি ভাঙা সরিষার তেল", price: "৫ লিটার · ৳১,৩০০" },
];

function Logo() {
  return (
    <a className="logo" href="#" aria-label="Torun Mart হোম">
      <span className="logo-mark"><Leaf size={24} strokeWidth={2.4} /></span>
      <span className="logo-type"><strong>তরুণ</strong><small>mart</small></span>
    </a>
  );
}

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

function ProductCard({ product }: { product: (typeof products)[number] }) {
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const detailHref = `/product/${product.id}`;

  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={detailHref} aria-label={`${product.name} বিস্তারিত দেখুন`}>
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, 25vw" />
        </Link>
        <span className="product-badge">{product.badge}</span>
        <button className={`icon-btn wishlist ${liked ? "active" : ""}`} onClick={() => setLiked(!liked)} aria-label="পছন্দের তালিকায় যোগ করুন">
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="product-body">
        <p className="product-meta">{product.meta}</p>
        <h3><Link href={detailHref}>{product.name}</Link></h3>
        <div className="rating"><Star size={14} fill="currentColor" /><strong>{product.rating}</strong><span>({product.reviews})</span></div>
        <div className="product-buy">
          <div className="price-row"><strong>{product.price}</strong>{product.oldPrice && <del>{product.oldPrice}</del>}{product.discount && <span>{product.discount}</span>}</div>
          <button className={`add-btn ${added ? "added" : ""}`} onClick={() => { addItem({ id: product.id, name: product.name, price: product.numericPrice, image: product.image, variant: product.meta, href: detailHref }); setAdded(true); }} aria-label={`${product.name} কার্টে যোগ করুন`}>
            {added ? <PackageCheck size={19} /> : <ShoppingBag size={19} />}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [dynamicCategories, setDynamicCategories] = useState(categories);
  const [dynamicProducts, setDynamicProducts] = useState(products);
  const [dynamicReviews, setDynamicReviews] = useState(reviews);
  const [dynamicHeroSlides, setDynamicHeroSlides] = useState(heroSlides);
  const { count, subtotal, openCart } = useCart();

  useEffect(() => {
    const timer = window.setInterval(() => setHeroSlide((current) => (current + 1) % dynamicHeroSlides.length), 5500);
    return () => window.clearInterval(timer);
  }, [dynamicHeroSlides.length]);

  useEffect(() => {
    const loadStorefront = async () => {
      try {
        const response = await fetch("/api/storefront");
        const data = await response.json() as {
          configured?: boolean;
          categories?: Array<{ name_bn: string; description?: string; image_path?: string }>;
          products?: Array<{ id: string; name_bn: string; slug: string; sku: string; short_description?: string; base_price: number; compare_at_price?: number; weight_grams?: number; product_media?: Array<{ storage_path: string }>; reviews?: Array<{ rating: number }> }>;
          sections?: Array<{ section_key: string; content: { slides?: Array<{ image: string; eyebrow: string; name: string; price: string }> } }>;
          reviews?: Array<{ id: string; rating: number; body: string; profiles?: { full_name?: string } | null; products?: { name_bn?: string } | null }>;
        };
        if (!response.ok || !data.configured) return;
        if (data.categories?.length) setDynamicCategories(data.categories.slice(0, 4).map((category, index) => ({ name: category.name_bn, count: category.description || "পণ্য দেখুন", image: category.image_path || categories[index % categories.length].image, tone: ["gold", "green", "rust", "cream"][index % 4] })));
        if (data.products?.length) setDynamicProducts(data.products.slice(0, 8).map((product) => { const ratings = product.reviews || []; const average = ratings.length ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length : 0; return { id: product.slug || product.id, name: product.name_bn, meta: product.weight_grams ? `${product.weight_grams.toLocaleString("bn-BD")} গ্রাম` : product.sku, price: `৳${Number(product.base_price).toLocaleString("bn-BD")}`, numericPrice: Number(product.base_price), oldPrice: product.compare_at_price ? `৳${Number(product.compare_at_price).toLocaleString("bn-BD")}` : "", discount: product.compare_at_price ? `–${Math.round((1 - Number(product.base_price) / Number(product.compare_at_price)) * 100)}%` : "", rating: average ? average.toFixed(1) : "নতুন", reviews: String(ratings.length), image: product.product_media?.[0]?.storage_path || products[0].image, badge: product.compare_at_price ? "বিশেষ মূল্য" : "নতুন" }; }));
        const hero = data.sections?.find((section) => section.section_key === "hero");
        if (hero?.content.slides?.length) { setDynamicHeroSlides(hero.content.slides.map((slide) => ({ ...slide, alt: slide.name }))); setHeroSlide(0); }
        if (data.reviews?.length) setDynamicReviews(data.reviews.slice(0, 3).map((review) => { const name = review.profiles?.full_name || "যাচাইকৃত ক্রেতা"; return { quote: review.body, name, product: review.products?.name_bn || "তরুণ মার্ট পণ্য", initials: name.slice(0, 2) }; }));
      } catch {
        // Static fallback content keeps the storefront available during setup.
      }
    };
    loadStorefront();
  }, []);

  const showPreviousSlide = () => setHeroSlide((heroSlide + dynamicHeroSlides.length - 1) % dynamicHeroSlides.length);
  const showNextSlide = () => setHeroSlide((heroSlide + 1) % dynamicHeroSlides.length);

  return (
    <main>
      <div className="announcement">
        <div className="container announcement-inner">
          <p><Sparkles size={14} /> নতুন ক্রেতার প্রথম অর্ডারে <strong>১০% ছাড়</strong> — কোড: <b>NOTUN10</b></p>
          <div><span><Clock3 size={14} /> সকাল ৯টা – রাত ১০টা</span><a href="#support"><MessageCircle size={14} /> সাহায্য লাগবে?</a></div>
        </div>
      </div>

      <header className="site-header">
        <div className="container header-main">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="মেনু খুলুন"><Menu /></button>
          <Logo />
          <label className="search-box">
            <Search size={19} />
            <input type="search" placeholder="পণ্য, ক্যাটাগরি বা ব্র্যান্ড খুঁজুন..." aria-label="পণ্য খুঁজুন" />
            <span>সব ক্যাটাগরি <ChevronDown size={15} /></span>
          </label>
          <nav className="header-actions" aria-label="ইউজার অ্যাকশন">
            <Link href="/account"><CircleUserRound /><span>অ্যাকাউন্ট<small>লগইন করুন</small></span></Link>
            <a href="#"><Heart /><i>2</i></a>
            <button className="header-cart-button" onClick={openCart} aria-label={`কার্ট খুলুন, ${count}টি পণ্য`}><ShoppingBag />{count > 0 && <i>{count}</i>}<span>কার্ট<small>৳{subtotal.toLocaleString("bn-BD")}</small></span></button>
          </nav>
        </div>
        <div className={`nav-wrap ${menuOpen ? "open" : ""}`}>
          <div className="container nav-inner">
            <button className="category-button" onClick={() => setCategoriesOpen(!categoriesOpen)} aria-expanded={categoriesOpen} aria-controls="category-dropdown"><SlidersHorizontal size={18} /> সব ক্যাটাগরি <ChevronDown className={categoriesOpen ? "rotated" : ""} size={15} /></button>
            <div className={`category-dropdown ${categoriesOpen ? "open" : ""}`} id="category-dropdown">
              <a href="#categories" onClick={() => setCategoriesOpen(false)}><span><Leaf /></span><p><strong>খাঁটি খাবার</strong><small>মধু, তেল, ঘি ও খেজুর</small></p><ChevronLeft /></a>
              <a href="#categories" onClick={() => setCategoriesOpen(false)}><span><Sparkles /></span><p><strong>মৌসুমি ফল</strong><small>বাগান থেকে সরাসরি</small></p><ChevronLeft /></a>
              <a href="#categories" onClick={() => setCategoriesOpen(false)}><span><BookOpen /></span><p><strong>বই ও কম্বো</strong><small>বাছাই করা জনপ্রিয় বই</small></p><ChevronLeft /></a>
              <a href="#categories" onClick={() => setCategoriesOpen(false)}><span><ShoppingBag /></span><p><strong>ফ্যাশন ও লাইফস্টাইল</strong><small>নতুন কালেকশন</small></p><ChevronLeft /></a>
              <a className="dropdown-all" href="#products" onClick={() => setCategoriesOpen(false)}>সব পণ্য দেখুন <ArrowLeft /></a>
            </div>
            <nav className="primary-nav" aria-label="প্রধান নেভিগেশন">
              <a className="active" href="#">হোম</a><a href="#categories">খাঁটি খাবার</a><a href="#categories">মৌসুমি ফল</a><a href="#categories">বই</a><a href="#categories">ফ্যাশন</a><a className="sale-link" href="#products">অফার</a>
            </nav>
            <a className="track-link" href="#"><Truck size={17} /> অর্ডার ট্র্যাক করুন</a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker"><Leaf size={17} /> প্রকৃতির কাছ থেকে, আপনার পরিবারের জন্য</span>
            <h1>বিশ্বস্ত পণ্য,<br /><em>সহজ কেনাকাটা।</em></h1>
            <p>খাঁটি খাবার, মৌসুমি ফল, বই ও দৈনন্দিন প্রয়োজন—যাচাইকৃত মানে, সারা বাংলাদেশে ডেলিভারি।</p>
            <div className="hero-actions">
              <a className="button primary" href="#products">এখনই কিনুন <ArrowLeft size={18} /></a>
            </div>
            <div className="hero-proof">
              <div className="avatars"><span>স</span><span>আ</span><span>র</span><span>ত</span></div>
              <div><div className="stars">★★★★★</div><p><strong>৪.৮/৫</strong> · ৫০০+ সন্তুষ্ট ক্রেতা</p></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-wrap">
              <Image className="hero-slide-image" key={dynamicHeroSlides[heroSlide].image} src={dynamicHeroSlides[heroSlide].image} alt={dynamicHeroSlides[heroSlide].alt} fill priority={heroSlide === 0} sizes="(max-width: 900px) 100vw, 55vw" />
            </div>
            <div className="floating-card quality"><span><ShieldCheck /></span><div><strong>যাচাইকৃত মান</strong><small>প্রতিটি পণ্য বাছাই করা</small></div></div>
            <div className="floating-card delivery"><span><Truck /></span><div><strong>দ্রুত ডেলিভারি</strong><small>ঢাকায় ২–৩ কার্যদিবস</small></div></div>
            <div className="hero-slider-controls">
              <button onClick={showPreviousSlide} aria-label="আগের ছবি"><ChevronRight /></button>
              <div>{dynamicHeroSlides.map((slide, index) => <button className={heroSlide === index ? "active" : ""} onClick={() => setHeroSlide(index)} aria-label={`${slide.name} দেখুন`} key={slide.name} />)}</div>
              <button onClick={showNextSlide} aria-label="পরের ছবি"><ChevronLeft /></button>
            </div>
            <div className="hero-label" key={dynamicHeroSlides[heroSlide].name}><small>{dynamicHeroSlides[heroSlide].eyebrow}</small><strong>{dynamicHeroSlides[heroSlide].name}</strong><span>{dynamicHeroSlides[heroSlide].price}</span></div>
          </div>
        </div>
      </section>

      <section className="trust-bar">
        <div className="container trust-grid">
          <div><span><ShieldCheck /></span><p><strong>যাচাইকৃত মান</strong><small>বিশ্বস্ত উৎস থেকে সংগ্রহ</small></p></div>
          <div><span><Truck /></span><p><strong>সারা দেশে ডেলিভারি</strong><small>নিরাপদ ও সময়মতো</small></p></div>
          <div><span><Undo2 /></span><p><strong>৭ দিনের সহজ রিটার্ন</strong><small>শর্তসাপেক্ষে বদলে নিন</small></p></div>
          <div><span><MessageCircle /></span><p><strong>মানবিক সহায়তা</strong><small>প্রয়োজনে আমরা পাশে আছি</small></p></div>
        </div>
      </section>

      <section className="section categories" id="categories">
        <div className="container">
          <SectionHeading eyebrow="সহজে খুঁজে নিন" title="আপনার প্রয়োজনের ক্যাটাগরি" copy="প্রতিদিনের দরকার থেকে বিশেষ দিনের উপহার—সবকিছু সাজানো, যেন পছন্দ করতে সময় কম লাগে।" />
          <div className="category-grid">
            {dynamicCategories.map((category, index) => (
              <a className={`category-card ${category.tone}`} href="#products" key={category.name}>
                <Image src={category.image} alt="" fill sizes="(max-width: 700px) 50vw, 25vw" />
                <span className="category-number">0{index + 1}</span>
                <div><small>{category.count}</small><h3>{category.name}</h3><span>দেখুন <ArrowLeft size={15} /></span></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section products-section" id="products">
        <div className="container">
          <div className="products-head">
            <SectionHeading eyebrow="ক্রেতাদের সবচেয়ে পছন্দ" title="জনপ্রিয় পণ্য" />
            <div className="tabs"><button className="active">সব পণ্য</button><button>খাবার</button><button>ফল</button><button>বই</button></div>
          </div>
          <div className="product-grid">{dynamicProducts.map((product) => <ProductCard product={product} key={product.name} />)}</div>
          <a className="view-all" href="#">সব পণ্য দেখুন <ArrowLeft size={17} /></a>
        </div>
      </section>

      <section className="seasonal-section">
        <div className="container seasonal-card">
          <div className="seasonal-photo"><Image src="https://torunmart.com/wp-content/uploads/2025/10/1000115858-scaled-500x750.jpg" alt="গাছপাকা আম্রপালি আম" fill sizes="(max-width: 800px) 100vw, 50vw" /><span>সীমিত সময়</span></div>
          <div className="seasonal-copy">
            <span className="eyebrow light">মৌসুমি আয়োজন</span>
            <h2>বাগান থেকে<br /><em>সোজা আপনার টেবিলে</em></h2>
            <p>ফরমালিনমুক্ত, পরিপক্ব এবং যত্নে বাছাই করা হিমসাগর আম। অর্ডারের পর বাগান থেকে সংগ্রহ করে পাঠানো হয়।</p>
            <div className="seasonal-points"><span><Leaf /> প্রাকৃতিকভাবে পরিপক্ব</span><span><PackageCheck /> নিরাপদ প্যাকেজিং</span></div>
            <div className="seasonal-action"><div><small>১০ কেজি বক্স</small><strong>৳১,১০০ <del>৳১,২০০</del></strong></div><a className="button saffron" href="#">প্রি-অর্ডার করুন <ArrowLeft size={18} /></a></div>
          </div>
        </div>
      </section>

      <section className="section story-section">
        <div className="container story-grid">
          <div className="story-copy">
            <span className="eyebrow">কেন তরুণ মার্ট</span>
            <h2>শুধু পণ্য নয়,<br />আমরা পৌঁছে দিই <em>আস্থা।</em></h2>
            <p>দেশের বিভিন্ন প্রান্তের উৎপাদক ও বিশ্বস্ত সরবরাহকারীদের সঙ্গে সরাসরি কাজ করি। প্রতিটি পণ্য সংগ্রহ, প্যাকেজিং এবং ডেলিভারির প্রতিটি ধাপে থাকে আমাদের নজর।</p>
            <a className="story-link" href="#">আমাদের গল্প জানুন <ArrowLeft size={17} /></a>
          </div>
          <div className="story-steps">
            <div><span>১</span><i><Leaf /></i><h3>উৎস যাচাই</h3><p>বিশ্বস্ত উৎপাদক ও সরবরাহকারী নির্বাচন</p></div>
            <div><span>২</span><i><ShieldCheck /></i><h3>মান পরীক্ষা</h3><p>প্যাকিংয়ের আগে পণ্য ভালোভাবে যাচাই</p></div>
            <div><span>৩</span><i><Truck /></i><h3>যত্নে ডেলিভারি</h3><p>নিরাপদ প্যাকেজিংয়ে আপনার দরজায়</p></div>
          </div>
        </div>
      </section>

      <section className="section reviews-section">
        <div className="container">
          <div className="reviews-head"><SectionHeading eyebrow="সত্যিকারের অভিজ্ঞতা" title="ক্রেতারা যা বলছেন" /><div className="slider-buttons"><button aria-label="আগের রিভিউ"><ArrowRight /></button><button aria-label="পরের রিভিউ"><ArrowLeft /></button></div></div>
          <div className="review-grid">
            {dynamicReviews.map((review) => <article className="review-card" key={review.name}><div className="quote-mark">“</div><div className="stars">★★★★★</div><blockquote>{review.quote}</blockquote><footer><span>{review.initials}</span><p><strong>{review.name}</strong><small>কিনেছেন: {review.product}</small></p><ShieldCheck /></footer></article>)}
          </div>
        </div>
      </section>

      <section className="newsletter" id="support">
        <div className="container newsletter-inner">
          <div><span>নতুন খবর, নতুন অফার</span><h2>ভালো পণ্যের খবর<br />সবার আগে পান।</h2></div>
          <form><label><input type="email" placeholder="আপনার ইমেইল ঠিকানা" aria-label="ইমেইল ঠিকানা" /><button type="submit" aria-label="সাবস্ক্রাইব করুন"><ArrowLeft /></button></label><small>সাবস্ক্রাইব করলে আপনি আমাদের গোপনীয়তা নীতিতে সম্মতি দিচ্ছেন।</small></form>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand"><Logo /><p>বিশ্বস্ত পণ্য, সহজ কেনাকাটা। দেশের যেকোনো প্রান্তে আপনার প্রয়োজন পৌঁছে দিই যত্নের সঙ্গে।</p><div className="socials"><a href="#" aria-label="Facebook"><Facebook /></a><a href="#" aria-label="Instagram"><Instagram /></a><a href="#" aria-label="WhatsApp"><MessageCircle /></a></div></div>
          <div><h3>কেনাকাটা</h3><a href="#">সব পণ্য</a><a href="#">খাঁটি খাবার</a><a href="#">মৌসুমি ফল</a><a href="#">বই ও কম্বো</a><a href="#">অফার</a></div>
          <div><h3>সহায়তা</h3><a href="#">অর্ডার ট্র্যাক করুন</a><a href="#">ডেলিভারি তথ্য</a><a href="#">রিটার্ন ও রিফান্ড</a><a href="#">প্রশ্নোত্তর</a><a href="#">যোগাযোগ</a></div>
          <div><h3>যোগাযোগ</h3><p>বারিক ভিলা, ১১/১ ফোল্ডার স্ট্রিট,<br />ওয়ারী, ঢাকা–১২০৩</p><a className="contact" href="tel:+8801886494257">+৮৮০ ১৮৮৬–৪৯৪২৫৭</a><a className="contact" href="mailto:admin@torunmart.com">admin@torunmart.com</a></div>
        </div>
        <div className="container footer-bottom"><p>© ২০২৬ তরুণ মার্ট। সর্বস্বত্ব সংরক্ষিত।</p><div><a href="#">গোপনীয়তা</a><a href="#">শর্তাবলি</a></div><span>নিরাপদ পেমেন্ট · ক্যাশ অন ডেলিভারি</span></div>
      </footer>

      <nav className="mobile-bottom" aria-label="মোবাইল নেভিগেশন"><a className="active" href="#"><Home /><span>হোম</span></a><a href="#categories"><Menu /><span>ক্যাটাগরি</span></a><a href="#"><Search /><span>খুঁজুন</span></a><a href="#"><Heart /><span>পছন্দ</span></a><button onClick={openCart}><ShoppingBag />{count > 0 && <i>{count}</i>}<span>কার্ট</span></button></nav>
    </main>
  );
}
