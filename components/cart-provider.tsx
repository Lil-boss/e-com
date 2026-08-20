"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";

export type CartProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  variant: string;
  href?: string;
};

type CartItem = CartProduct & { quantity: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (product: CartProduct, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "torun-mart-cart";

const money = (value: number) => `৳${value.toLocaleString("bn-BD")}`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored) as CartItem[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const addItem = (product: CartProduct, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      return [...current, { ...product, quantity }];
    });
    setNotice(`${product.name} কার্টে যোগ হয়েছে`);
    setIsOpen(true);
    window.setTimeout(() => setNotice(""), 2500);
  };

  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));
  const updateQuantity = (id: string, quantity: number) => quantity < 1 ? removeItem(id) : setItems((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const value = { items, count, subtotal, isOpen, addItem, removeItem, updateQuantity, clearCart: () => setItems([]), openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false) };

  return (
    <CartContext.Provider value={value}>
      {children}
      <div className={`cart-overlay ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(false)} />
      <aside className={`cart-drawer ${isOpen ? "open" : ""}`} aria-hidden={!isOpen} aria-label="শপিং কার্ট">
        <header><div><ShoppingBag /><h2>আপনার কার্ট</h2><span>{items.length.toLocaleString("bn-BD")} টি পণ্য</span></div><button onClick={() => setIsOpen(false)} aria-label="কার্ট বন্ধ করুন"><X /></button></header>
        {notice && <div className="cart-notice"><Check /> {notice}</div>}
        {items.length === 0 ? (
          <div className="cart-empty"><span><ShoppingBag /></span><h3>আপনার কার্ট এখনো খালি</h3><p>পছন্দের পণ্যগুলো কার্টে যোগ করলে এখানে দেখতে পাবেন।</p><button onClick={() => setIsOpen(false)}>কেনাকাটা শুরু করুন <ChevronRight /></button></div>
        ) : (
          <>
            <div className="cart-items">{items.map((item) => <article key={item.id}><Link href={item.href || "#"} onClick={() => setIsOpen(false)}><Image src={item.image} alt={item.name} fill sizes="90px" /></Link><div className="cart-item-info"><div><p>{item.variant}</p><h3>{item.name}</h3></div><div className="cart-item-bottom"><div className="cart-quantity"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="পরিমাণ কমান"><Minus /></button><strong>{item.quantity.toLocaleString("bn-BD")}</strong><button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="পরিমাণ বাড়ান"><Plus /></button></div><strong>{money(item.price * item.quantity)}</strong></div></div><button className="cart-remove" onClick={() => removeItem(item.id)} aria-label={`${item.name} সরান`}><Trash2 /></button></article>)}</div>
            <div className="cart-summary"><div><span>সাবটোটাল</span><strong>{money(subtotal)}</strong></div><p>ডেলিভারি চার্জ ঠিকানা দেওয়ার পর যোগ হবে।</p><Link className="checkout-button" href="/checkout" onClick={() => setIsOpen(false)}>চেকআউট করুন <span>{money(subtotal)}</span></Link><button className="continue-button" onClick={() => setIsOpen(false)}>কেনাকাটা চালিয়ে যান</button><small>নিরাপদ চেকআউট · ক্যাশ অন ডেলিভারি</small></div>
          </>
        )}
      </aside>
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
