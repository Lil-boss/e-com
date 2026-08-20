"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Globe, Heart, Home, Instagram, Leaf, Menu, MessageCircle, Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import type { DeliverySettings, StoreSettings } from "@/lib/store-settings";
import { currencySymbol } from "@/lib/store-settings";
import { bengali } from "@/lib/storefront";
import type { CardCategory } from "@/lib/storefront";

export function FooterLogo({ logoUrl = "" }: { logoUrl?: string }) {
  return (
    <Link className="logo" href="/" aria-label="Torun Mart হোম">
      {logoUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img className="store-logo-image" src={logoUrl} alt="Torun Mart" />
        : <><span className="logo-mark"><Leaf size={24} strokeWidth={2.4} /></span><span className="logo-type"><strong>তরুণ</strong><small>mart</small></span></>}
    </Link>
  );
}

export function SiteFooter({ store, delivery, categories }: { store: StoreSettings; delivery?: DeliverySettings; categories: CardCategory[] }) {
  const pathname = usePathname();
  const { count, openCart } = useCart();
  const { ids } = useWishlist();
  const symbol = currencySymbol(store.currency);
  const digits = (store.phone || "").replace(/\D/g, "");
  const socials: Array<[string, React.ReactNode, string]> = [
    [store.facebook || "", <Facebook key="f" />, "Facebook"],
    [store.instagram || "", <Instagram key="i" />, "Instagram"],
    [digits ? `https://wa.me/${digits}` : "", <MessageCircle key="w" />, "WhatsApp"],
    [store.website || "", <Globe key="g" />, "ওয়েবসাইট"],
  ];

  return (
    <>
      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <FooterLogo logoUrl={store.logo_url} />
            <p>{store.tagline || "বিশ্বস্ত পণ্য, সহজ কেনাকাটা।"} দেশের যেকোনো প্রান্তে আপনার প্রয়োজন পৌঁছে দিই যত্নের সঙ্গে।</p>
            <div className="socials">
              {socials.filter(([href]) => href).map(([href, icon, label]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer noopener" aria-label={label}>{icon}</a>
              ))}
            </div>
          </div>
          <div>
            <h3>কেনাকাটা</h3>
            <Link href="/products">সব পণ্য</Link>
            {categories.slice(0, 4).map((category) => (
              <Link key={category.slug || category.name} href={category.slug ? `/products?category=${category.slug}` : "/products"}>{category.name}</Link>
            ))}
          </div>
          <div>
            <h3>সহায়তা</h3>
            <Link href="/account">অর্ডার ট্র্যাক করুন</Link>
            <Link href="/products?liked=1">পছন্দের তালিকা</Link>
            {delivery && <p className="footer-note">ঢাকায় {symbol}{bengali(Number(delivery.inside_dhaka || 0))} · {delivery.inside_days}<br />ঢাকার বাইরে {symbol}{bengali(Number(delivery.outside_dhaka || 0))} · {delivery.outside_days}<br />{bengali(Number(delivery.return_days || 7))} দিনের সহজ রিটার্ন</p>}
          </div>
          <div>
            <h3>যোগাযোগ</h3>
            {store.address && <p>{store.address}</p>}
            {store.phone && <a className="contact" href={`tel:${store.phone}`}>{store.phone}</a>}
            {store.email && <a className="contact" href={`mailto:${store.email}`}>{store.email}</a>}
          </div>
        </div>
        <div className="container footer-bottom">
          <p>{store.footer || "© ২০২৬ তরুণ মার্ট। সর্বস্বত্ব সংরক্ষিত।"}</p>
          <span>নিরাপদ পেমেন্ট · ক্যাশ অন ডেলিভারি</span>
        </div>
      </footer>

      <nav className="mobile-bottom" aria-label="মোবাইল নেভিগেশন">
        <Link className={pathname === "/" ? "active" : ""} href="/"><Home /><span>হোম</span></Link>
        <Link href="/#categories"><Menu /><span>ক্যাটাগরি</span></Link>
        <Link className={pathname === "/products" ? "active" : ""} href="/products"><Search /><span>খুঁজুন</span></Link>
        <Link href="/products?liked=1"><Heart />{ids.length > 0 && <i>{ids.length}</i>}<span>পছন্দ</span></Link>
        <button onClick={openCart} aria-label="কার্ট খুলুন"><ShoppingBag />{count > 0 && <i>{count}</i>}<span>কার্ট</span></button>
      </nav>
    </>
  );
}
