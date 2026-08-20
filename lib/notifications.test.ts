import assert from "node:assert/strict";
import test from "node:test";
import { notifyOrderPlaced } from "./notifications.ts";

const notice = {
  orderNumber: "TM-TEST", orderId: "id", customerName: "Test", customerPhone: "01800000000",
  grandTotal: 1670, itemCount: 1, invoiceUrl: "https://example.com/invoice/id",
};

// The invariant that matters: an order must never fail because a notice did.
test("an unconfigured webhook reports not-sent instead of throwing", async () => {
  delete process.env.ORDER_NOTIFY_WEBHOOK_URL;
  assert.deepEqual(await notifyOrderPlaced(notice), { sent: false, reason: "webhook not configured" });
});

test("an unreachable webhook reports not-sent instead of throwing", async () => {
  process.env.ORDER_NOTIFY_WEBHOOK_URL = "http://127.0.0.1:9/dead";
  assert.deepEqual(await notifyOrderPlaced(notice), { sent: false, reason: "delivery failed" });
  delete process.env.ORDER_NOTIFY_WEBHOOK_URL;
});
