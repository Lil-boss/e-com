"use client";

import Link from "next/link";
import { ChevronDown, ChevronLeft, CircleUserRound, Heart, Leaf, Menu, Search, ShoppingBag, SlidersHorizontal, Sparkles, Truck } from "lucide-react";
import { useState } from "react";

type SiteHeaderProps = {
  logoUrl?: string;
  cartCount: number;
  cartSubtotal: number;
  onOpenCart: () => void;
};

function HeaderLogo({ logoUrl = "" }: { logoUrl?: string }) {
  return <Link className="logo" href="/" aria-label="Torun Mart হোম">{logoUrl ? <img className="store-logo-image" src={logoUrl} alt="Torun Mart" /> : <><span className="logo-mark"><Leaf size={24} strokeWidth={2.4} /></span><span className="logo-type"><strong>তরুণ</strong><small>mart</small></span></>}</Link>;
}

export function SiteHeader({ logoUrl, cartCount, cartSubtotal, onOpenCart }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const closeMenus = () => { setMenuOpen(false); setCategoriesOpen(false); };
  return <header className="site-header">
    <div className="container header-main">
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="মেনু খুলুন"><Menu /></button>
      <HeaderLogo logoUrl={logoUrl} />
      <label className="search-box"><Search size={19} /><input type="search" placeholder="পণ্য, ক্যাটাগরি বা ব্র্যান্ড খুঁজুন..." aria-label="পণ্য খুঁজুন" /><span>সব ক্যাটাগরি <ChevronDown size={15} /></span></label>
      <nav className="header-actions" aria-label="ইউজার অ্যাকশন">
        <Link href="/account"><CircleUserRound /><span>অ্যাকাউন্ট<small>লগইন করুন</small></span></Link>
        <button className="header-favorite-button" type="button" aria-label="পছন্দের পণ্য"><Heart /><i>2</i></button>
        <button className="header-cart-button" onClick={onOpenCart} aria-label={`কার্ট খুলুন, ${cartCount}টি পণ্য`}><ShoppingBag />{cartCount > 0 && <i>{cartCount}</i>}<span>কার্ট<small>৳{cartSubtotal.toLocaleString("bn-BD")}</small></span></button>
      </nav>
    </div>
    <div className={`nav-wrap ${menuOpen ? "open" : ""}`}>
      <div className="container nav-inner">
        <button className="category-button" onClick={() => setCategoriesOpen(!categoriesOpen)} aria-expanded={categoriesOpen} aria-controls="shared-category-dropdown"><SlidersHorizontal size={18} /> সব ক্যাটাগরি <ChevronDown className={categoriesOpen ? "rotated" : ""} size={15} /></button>
        <div className={`category-dropdown ${categoriesOpen ? "open" : ""}`} id="shared-category-dropdown">
          <Link href="/#categories" onClick={closeMenus}><span><Leaf /></span><p><strong>খাঁটি খাবার</strong><small>মধু, তেল, ঘি ও খেজুর</small></p><ChevronLeft /></Link>
          <Link href="/#categories" onClick={closeMenus}><span><Sparkles /></span><p><strong>মৌসুমি ফল</strong><small>বাগান থেকে সরাসরি</small></p><ChevronLeft /></Link>
          <Link href="/#categories" onClick={closeMenus}><span><ShoppingBag /></span><p><strong>ফ্যাশন ও লাইফস্টাইল</strong><small>নতুন কালেকশন</small></p><ChevronLeft /></Link>
          <Link className="dropdown-all" href="/#products" onClick={closeMenus}>সব পণ্য দেখুন <ChevronLeft /></Link>
        </div>
        <nav className="primary-nav" aria-label="প্রধান নেভিগেশন"><Link href="/">হোম</Link><Link href="/#categories">খাঁটি খাবার</Link><Link href="/#categories">মৌসুমি ফল</Link><Link href="/#categories">বই</Link><Link href="/#categories">ফ্যাশন</Link><Link className="sale-link" href="/#products">অফার</Link></nav>
        <Link className="track-link" href="/#support"><Truck size={17} /> অর্ডার ট্র্যাক করুন</Link>
      </div>
    </div>
  </header>;
}
