import assert from "node:assert/strict";
import test from "node:test";
import { variantStock, variantValues } from "./variants.ts";

const product = { sku: "TM-SHIRT", base_price: 900 };

test("colour and size build the sku suffix and title", () => {
  const values = variantValues({ color: "Black", size: "XL" }, 0, product);
  assert.equal(values.sku, "TM-SHIRT-BLACK-XL");
  assert.equal(values.title, "Black / XL");
  assert.deepEqual(values.attributes, { color: "Black", size: "XL" });
});

test("an explicit sku wins and multi-word values stay hyphenated", () => {
  assert.equal(variantValues({ color: "Deep Blue", sku: "CUSTOM-1" }, 0, product).sku, "CUSTOM-1");
  assert.equal(variantValues({ color: "Deep Blue" }, 0, product).sku, "TM-SHIRT-DEEP-BLUE");
});

test("a blank row falls back to the row number and Default title", () => {
  const values = variantValues({}, 2, product);
  assert.equal(values.sku, "TM-SHIRT-3");
  assert.equal(values.title, "Default");
});

test("empty price falls back to the product base price", () => {
  assert.equal(variantValues({ color: "Red", price: "" }, 0, product).price, 900);
  assert.equal(variantValues({ color: "Red", price: "1200" }, 0, product).price, 1200);
});

test("stock is a non-negative integer", () => {
  assert.equal(variantStock({ stock: "12" }), 12);
  assert.equal(variantStock({ stock: "-5" }), 0);
  assert.equal(variantStock({ stock: "7.9" }), 7);
  assert.equal(variantStock({}), 0);
});
