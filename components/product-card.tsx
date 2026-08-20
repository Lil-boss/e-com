"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, PackageCheck, ShoppingBag, Star } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import type { CardProduct } from "@/lib/storefront";

export function ProductCard({ product }: { product: CardProduct }) {
  const [added, setAdded] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const liked = has(product.id);
  const detailHref = `/product/${product.id}`;

  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={detailHref} aria-label={`${product.name} বিস্তারিত দেখুন`}>
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, 25vw" className={imageReady ? "media-in" : "media-pending"} onLoad={() => setImageReady(true)} onError={() => setImageReady(true)} />
        </Link>
        <span className="product-badge">{product.badge}</span>
        <button className={`icon-btn wishlist ${liked ? "active" : ""}`} onClick={() => toggle(product.id)} aria-pressed={liked} aria-label={liked ? "পছন্দের তালিকা থেকে সরান" : "পছন্দের তালিকায় যোগ করুন"}>
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="product-body">
        <p className="product-meta">{product.meta}</p>
        <h3><Link href={detailHref}>{product.name}</Link></h3>
        <div className="rating"><Star size={14} fill="currentColor" /><strong>{product.rating}</strong><span>({product.reviews})</span></div>
        <div className="product-buy">
          <div className="price-row"><strong>{product.price}</strong>{product.oldPrice && <del>{product.oldPrice}</del>}{product.discount && <span>{product.discount}</span>}</div>
          <button className={`add-btn ${added ? "added" : ""}`} onClick={() => { addItem({ id: product.id, name: product.name, price: product.numericPrice, image: product.image, variant: product.meta, href: detailHref }); setAdded(true); window.setTimeout(() => setAdded(false), 1800); }} aria-label={`${product.name} কার্টে যোগ করুন`}>
            {added ? <PackageCheck size={19} /> : <ShoppingBag size={19} />}
          </button>
        </div>
      </div>
    </article>
  );
}
