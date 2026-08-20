"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, CircleUserRound, Heart, Leaf, Menu, Search, ShoppingBag, SlidersHorizontal, Truck } from "lucide-react";
import { useState } from "react";
import { useWishlist } from "@/components/wishlist-provider";
import { DEMO_CATEGORIES, type CardCategory } from "@/lib/storefront";

type SiteHeaderProps = {
  logoUrl?: string;
  cartCount: number;
  cartSubtotal: number;
  onOpenCart: () => void;
  categories?: CardCategory[];
};

const categoryHref = (category: CardCategory) => category.slug ? `/products?category=${category.slug}` : "/products";

function HeaderLogo({ logoUrl = "" }: { logoUrl?: string }) {
  return (
    <Link className="logo" href="/" aria-label="Torun Mart হোম">
      {logoUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img className="store-logo-image" src={logoUrl} alt="Torun Mart" />
        : <><span className="logo-mark"><Leaf size={24} strokeWidth={2.4} /></span><span className="logo-type"><strong>তরুণ</strong><small>mart</small></span></>}
    </Link>
  );
}

export function SiteHeader({ logoUrl, cartCount, cartSubtotal, onOpenCart, categories = DEMO_CATEGORIES }: SiteHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { ids } = useWishlist();
  const closeMenus = () => { setMenuOpen(false); setCategoriesOpen(false); };
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(term.trim() ? `/products?q=${encodeURIComponent(term.trim())}` : "/products");
    closeMenus();
  };

  return (
    <header className="site-header">
      <div className="container header-main">
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="মেনু খুলুন" aria-expanded={menuOpen}><Menu /></button>
        <HeaderLogo logoUrl={logoUrl} />
        <form className="search-box" onSubmit={submitSearch} role="search">
          <Search size={19} />
          <input type="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="পণ্য, ক্যাটাগরি বা ব্র্যান্ড খুঁজুন..." aria-label="পণ্য খুঁজুন" />
          <button type="submit">খুঁজুন</button>
        </form>
        <nav className="header-actions" aria-label="ইউজার অ্যাকশন">
          <Link href="/account"><CircleUserRound /><span>অ্যাকাউন্ট<small>লগইন করুন</small></span></Link>
          <Link className="header-favorite-button" href="/products?liked=1" aria-label={`পছন্দের পণ্য, ${ids.length}টি`}><Heart />{ids.length > 0 && <i>{ids.length}</i>}</Link>
          <button className="header-cart-button" onClick={onOpenCart} aria-label={`কার্ট খুলুন, ${cartCount}টি পণ্য`}><ShoppingBag />{cartCount > 0 && <i>{cartCount}</i>}<span>কার্ট<small>৳{cartSubtotal.toLocaleString("bn-BD")}</small></span></button>
        </nav>
      </div>
      <div className={`nav-wrap ${menuOpen ? "open" : ""}`}>
        <div className="container nav-inner">
          <button className="category-button" onClick={() => setCategoriesOpen(!categoriesOpen)} aria-expanded={categoriesOpen} aria-controls="shared-category-dropdown"><SlidersHorizontal size={18} /> সব ক্যাটাগরি <ChevronDown className={categoriesOpen ? "rotated" : ""} size={15} /></button>
          <div className={`category-dropdown ${categoriesOpen ? "open" : ""}`} id="shared-category-dropdown">
            {categories.map((category) => (
              <Link key={category.slug || category.name} href={categoryHref(category)} onClick={closeMenus}>
                <span><Leaf /></span><p><strong>{category.name}</strong><small>{category.count}</small></p><ChevronRight />
              </Link>
            ))}
            <Link className="dropdown-all" href="/products" onClick={closeMenus}>সব পণ্য দেখুন <ChevronRight /></Link>
          </div>
          <nav className="primary-nav" aria-label="প্রধান নেভিগেশন">
            <Link href="/" onClick={closeMenus}>হোম</Link>
            {categories.slice(0, 4).map((category) => <Link key={category.slug || category.name} href={categoryHref(category)} onClick={closeMenus}>{category.name}</Link>)}
            <Link className="sale-link" href="/products" onClick={closeMenus}>অফার</Link>
          </nav>
          <Link className="track-link" href="/track" onClick={closeMenus}><Truck size={17} /> অর্ডার ট্র্যাক করুন</Link>
        </div>
      </div>
    </header>
  );
}
