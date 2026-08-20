import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCoupon } from "./coupons.ts";

const day = 86400000;
// Minimal stand-in for the Supabase client: coupons lookup + usage count.
const fakeAdmin = (coupon: Record<string, unknown> | null, used = 0) =>
  ({
    from: (table: string) =>
      table === "coupons"
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: coupon }) }) }) }
        : { select: () => ({ eq: async () => ({ count: used }) }) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

const base = { code: "TORUN10", discount_type: "percentage", discount_value: 10, minimum_spend: 500, usage_limit: null, starts_at: null, ends_at: null, is_active: true };

test("no code means no discount and no error", async () => {
  assert.deepEqual(await evaluateCoupon(fakeAdmin(null), "", 1000), { discount: 0, code: null, error: null });
});

test("percentage discount is applied on qualifying carts", async () => {
  const result = await evaluateCoupon(fakeAdmin(base), "torun10", 1000);
  assert.equal(result.discount, 100);
  assert.equal(result.code, "TORUN10");
});

test("fixed discount never exceeds the subtotal", async () => {
  const result = await evaluateCoupon(fakeAdmin({ ...base, discount_type: "fixed", discount_value: 900, minimum_spend: 0 }), "TORUN10", 400);
  assert.equal(result.discount, 400);
});

test("unknown, inactive, expired, future and under-minimum coupons are refused", async () => {
  assert.match((await evaluateCoupon(fakeAdmin(null), "NOPE", 1000)).error!, /সঠিক নয়/);
  assert.ok((await evaluateCoupon(fakeAdmin({ ...base, is_active: false }), "TORUN10", 1000)).error);
  assert.ok((await evaluateCoupon(fakeAdmin({ ...base, ends_at: new Date(Date.now() - day).toISOString() }), "TORUN10", 1000)).error);
  assert.ok((await evaluateCoupon(fakeAdmin({ ...base, starts_at: new Date(Date.now() + day).toISOString() }), "TORUN10", 1000)).error);
  assert.ok((await evaluateCoupon(fakeAdmin(base), "TORUN10", 100)).error);
});

test("usage limit is enforced", async () => {
  assert.ok((await evaluateCoupon(fakeAdmin({ ...base, usage_limit: 5 }, 5), "TORUN10", 1000)).error);
  assert.equal((await evaluateCoupon(fakeAdmin({ ...base, usage_limit: 5 }, 4), "TORUN10", 1000)).discount, 100);
});
