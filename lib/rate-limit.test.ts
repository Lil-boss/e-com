import assert from "node:assert/strict";
import test from "node:test";
import { allow } from "./rate-limit.ts";

test("allows up to the limit then refuses", () => {
  const key = `k${Math.trunc(process.hrtime()[1])}`;
  assert.equal(allow(key, 3, 60_000), true);
  assert.equal(allow(key, 3, 60_000), true);
  assert.equal(allow(key, 3, 60_000), true);
  assert.equal(allow(key, 3, 60_000), false, "fourth call inside the window is refused");
});

test("a stale window frees the key again", async () => {
  const key = `w${Math.trunc(process.hrtime()[1])}`;
  assert.equal(allow(key, 1, 25), true);
  assert.equal(allow(key, 1, 25), false);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(allow(key, 1, 25), true, "the window expired, so the key is usable again");
});

test("keys are independent", () => {
  const a = `a${Math.trunc(process.hrtime()[1])}`;
  const b = `b${Math.trunc(process.hrtime()[1])}`;
  assert.equal(allow(a, 1, 60_000), true);
  assert.equal(allow(a, 1, 60_000), false);
  assert.equal(allow(b, 1, 60_000), true, "a different caller is unaffected");
});
