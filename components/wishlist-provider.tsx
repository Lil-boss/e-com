"use client";

import { createContext, useContext, useEffect, useState } from "react";

type WishlistContextValue = { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void };

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "torun-mart-wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setIds(JSON.parse(stored) as string[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, hydrated]);

  const toggle = (id: string) => setIds((current) => current.includes(id) ? current.filter((saved) => saved !== id) : [...current, id]);

  return <WishlistContext.Provider value={{ ids, has: (id) => ids.includes(id), toggle }}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
