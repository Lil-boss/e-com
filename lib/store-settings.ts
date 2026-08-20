"use client";

import { useEffect, useState } from "react";

export type StoreSettings = {
  name?: string; tagline?: string; address?: string; phone?: string; email?: string;
  currency?: string; website?: string; footer?: string; logo_url?: string;
};

const symbols: Record<string, string> = { BDT: "৳", USD: "$", EUR: "€", GBP: "£", INR: "₹", SAR: "﷼", AED: "د.إ" };
export const currencySymbol = (code?: string) => symbols[String(code || "BDT").toUpperCase()] || "৳";

/** Company settings saved in the admin panel, read from the public storefront API. */
export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>({});
  useEffect(() => {
    fetch("/api/storefront", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { settings?: Array<{ key: string; value: StoreSettings }> }) => {
        const store = data.settings?.find((setting) => setting.key === "store")?.value;
        if (store) setSettings(store);
      })
      .catch(() => {
        // Static fallbacks keep the storefront usable while Supabase is unreachable.
      });
  }, []);
  return settings;
}
