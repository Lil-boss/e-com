import assert from "node:assert/strict";
import test from "node:test";
import { bengali, toCardProduct, type ApiProduct } from "./storefront.ts";

const base: ApiProduct = { id: "uuid", name_bn: "মধু", slug: "honey", sku: "TM-HNY", base_price: 645 };

test("bengali renders numerals in Bengali digits", () => {
  assert.equal(bengali(1300), "১,৩০০");
});

test("a discounted product carries an old price and a Bengali discount", () => {
  const card = toCardProduct({ ...base, compare_at_price: 745 }, "BDT", "fallback.png");
  assert.equal(card.price, "৳৬৪৫");
  assert.equal(card.oldPrice, "৳৭৪৫");
  assert.equal(card.discount, "–১৩%");
  assert.equal(card.badge, "বিশেষ মূল্য");
});

test("a product with no compare price has no discount and no old price", () => {
  const card = toCardProduct(base, "BDT", "fallback.png");
  assert.equal(card.oldPrice, "");
  assert.equal(card.discount, "");
  assert.equal(card.badge, "নতুন");
});

test("ratings average, and an unrated product reads as new", () => {
  const rated = toCardProduct({ ...base, reviews: [{ rating: 5 }, { rating: 4 }] }, "BDT", "fallback.png");
  assert.equal(rated.rating, "৪.৫");
  assert.equal(rated.reviews, "২");
  assert.equal(toCardProduct(base, "BDT", "fallback.png").rating, "নতুন");
});

test("the first media path wins, otherwise the fallback image", () => {
  assert.equal(toCardProduct({ ...base, product_media: [{ storage_path: "a.png" }] }, "BDT", "fb.png").image, "a.png");
  assert.equal(toCardProduct(base, "BDT", "fb.png").image, "fb.png");
});

test("currency follows the store setting", () => {
  assert.equal(toCardProduct(base, "USD", "fb.png").price, "$৬৪৫");
});
