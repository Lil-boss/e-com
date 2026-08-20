import type { SupabaseClient } from "@supabase/supabase-js";

export type Coupon = { code: string; discount_type: string; discount_value: number; minimum_spend: number; usage_limit: number | null; starts_at: string | null; ends_at: string | null; is_active: boolean };

/** Server-side coupon check shared by the checkout preview and the real order. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function evaluateCoupon(admin: SupabaseClient<any, any, any>, rawCode: string, subtotal: number) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return { discount: 0, code: null, error: null };
  const { data } = await admin.from("coupons").select("code,discount_type,discount_value,minimum_spend,usage_limit,starts_at,ends_at,is_active").eq("code", code).maybeSingle();
  const coupon = data as Coupon | null;
  const now = Date.now();
  if (!coupon || !coupon.is_active) return { discount: 0, code: null, error: "কুপন কোডটি সঠিক নয়" };
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return { discount: 0, code: null, error: "কুপনটি এখনো সক্রিয় হয়নি" };
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) return { discount: 0, code: null, error: "কুপনের মেয়াদ শেষ হয়েছে" };
  if (subtotal < Number(coupon.minimum_spend)) return { discount: 0, code: null, error: `এই কুপন ব্যবহারে ন্যূনতম ৳${Number(coupon.minimum_spend).toLocaleString("bn-BD")} কেনাকাটা প্রয়োজন` };
  if (coupon.usage_limit !== null) {
    const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("coupon_code", coupon.code);
    if ((count || 0) >= coupon.usage_limit) return { discount: 0, code: null, error: "কুপনের ব্যবহারসীমা শেষ হয়েছে" };
  }
  const discount = Math.min(subtotal, coupon.discount_type === "percentage" ? Math.round((subtotal * Number(coupon.discount_value)) / 100) : Number(coupon.discount_value));
  return { discount, code: coupon.code, error: null };
}
