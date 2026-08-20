import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderLines, shippingFor, type OrderProduct } from "./order-lines.ts";

const product = (overrides: Partial<OrderProduct> = {}): OrderProduct => ({
  id: "p1", slug: "ghee", sku: "TM-GHEE", name_bn: "ঘি", base_price: 1600,
  product_media: [{ storage_path: "ghee.png" }],
  product_variants: [
    { id: "v1", title: "1kg", price: 1600, is_active: true },
    { id: "v2", title: "2kg", price: 3000, is_active: true },
  ],
  ...overrides,
});

test("an explicit variant is priced from that variant", () => {
  const { rows, subtotal } = buildOrderLines([{ id: "ghee", variantId: "v2", quantity: 2 }], [product()]);
  assert.equal(rows[0].variant_id, "v2");
  assert.equal(rows[0].unit_price, 3000);
  assert.equal(rows[0].line_total, 6000);
  assert.equal(subtotal, 6000);
});

test("no variant chosen falls back to the first active one", () => {
  const { rows } = buildOrderLines([{ id: "ghee", quantity: 1 }], [product()]);
  assert.equal(rows[0].variant_id, "v1");
  assert.equal(rows[0].unit_price, 1600);
});

test("an inactive variant is never the fallback", () => {
  const withInactive = product({ product_variants: [
    { id: "v1", title: "1kg", price: 1600, is_active: false },
    { id: "v2", title: "2kg", price: 3000, is_active: true },
  ] });
  const { rows } = buildOrderLines([{ id: "ghee", quantity: 1 }], [withInactive]);
  assert.equal(rows[0].variant_id, "v2");
});

test("choosing a variant that no longer exists refuses the line", () => {
  const { rows, unavailable } = buildOrderLines([{ id: "ghee", variantId: "gone", quantity: 1 }], [product()]);
  assert.equal(rows.length, 0);
  assert.equal(unavailable, "ঘি", "the caller can name the product to the customer");
});

test("a product with no variants prices from base_price", () => {
  const bare = product({ product_variants: [] });
  const { rows } = buildOrderLines([{ id: "ghee", quantity: 3 }], [bare]);
  assert.equal(rows[0].variant_id, null);
  assert.equal(rows[0].unit_price, 1600);
  assert.equal(rows[0].line_total, 4800);
});

test("quantity is clamped, never trusted from the client", () => {
  const [huge] = buildOrderLines([{ id: "ghee", variantId: "v1", quantity: 999 }], [product()]).rows;
  assert.equal(huge.quantity, 20);
  const [zero] = buildOrderLines([{ id: "ghee", variantId: "v1", quantity: 0 }], [product()]).rows;
  assert.equal(zero.quantity, 1);
  const [negative] = buildOrderLines([{ id: "ghee", variantId: "v1", quantity: -5 }], [product()]).rows;
  assert.equal(negative.quantity, 1);
  const [fractional] = buildOrderLines([{ id: "ghee", variantId: "v1", quantity: 2.7 }], [product()]).rows;
  assert.equal(fractional.quantity, 2);
});

test("an unknown slug is reported rather than silently dropped", () => {
  const { rows, unavailable } = buildOrderLines([{ id: "nope", quantity: 1 }], [product()]);
  assert.equal(rows.length, 0);
  assert.equal(unavailable, "nope");
});

test("subtotal adds every line", () => {
  const other = product({ id: "p2", slug: "honey", sku: "TM-HNY", name_bn: "মধু", base_price: 645, product_variants: [] });
  const { subtotal } = buildOrderLines([
    { id: "ghee", variantId: "v1", quantity: 1 },
    { id: "honey", quantity: 2 },
  ], [product(), other]);
  assert.equal(subtotal, 1600 + 1290);
});

test("shipping is by delivery area", () => {
  assert.equal(shippingFor("dhaka"), 70);
  assert.equal(shippingFor("outside"), 120);
  assert.equal(shippingFor(""), 120, "an unknown area is charged the higher rate, never the lower");
});
