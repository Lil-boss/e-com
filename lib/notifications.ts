type OrderNotice = {
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  grandTotal: number;
  itemCount: number;
  invoiceUrl: string;
};

/**
 * Order-placed notification.
 *
 * ponytail: one outbound webhook rather than an adapter per SMS gateway. Point
 * ORDER_NOTIFY_WEBHOOK_URL at your provider (or an automation that fans out to
 * SMS + email + staff) and it receives the payload below. Swap in a direct
 * provider client here if a single gateway ever becomes permanent.
 */
export async function notifyOrderPlaced(notice: OrderNotice) {
  const text =
    `আপনার অর্ডার #${notice.orderNumber} গ্রহণ করা হয়েছে। ` +
    `মোট ৳${notice.grandTotal.toLocaleString("bn-BD")}। ` +
    `ইনভয়েস: ${notice.invoiceUrl}`;

  const webhook = process.env.ORDER_NOTIFY_WEBHOOK_URL;
  if (!webhook) {
    // Visible in server logs so a missing webhook is obvious rather than silent.
    console.info(`[order-notify] no ORDER_NOTIFY_WEBHOOK_URL set, would send to ${notice.customerPhone}: ${text}`);
    return { sent: false, reason: "webhook not configured" as const };
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.ORDER_NOTIFY_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.ORDER_NOTIFY_WEBHOOK_SECRET}` } : {}),
      },
      body: JSON.stringify({ event: "order.placed", text, order: notice }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`webhook responded ${response.status}`);
    return { sent: true as const };
  } catch (error) {
    // Never fail an order because a notification failed.
    console.error("[order-notify] delivery failed:", error instanceof Error ? error.message : error);
    return { sent: false, reason: "delivery failed" as const };
  }
}

/**
 * Newsletter signup. Same webhook as orders, so addresses reach whatever list the
 * store actually uses without this project owning a subscribers table.
 */
export async function notifySubscriber(email: string) {
  const webhook = process.env.ORDER_NOTIFY_WEBHOOK_URL;
  if (!webhook) {
    console.info(`[newsletter] no ORDER_NOTIFY_WEBHOOK_URL set, would subscribe ${email}`);
    return { sent: false, reason: "webhook not configured" as const };
  }
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.ORDER_NOTIFY_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.ORDER_NOTIFY_WEBHOOK_SECRET}` } : {}),
      },
      body: JSON.stringify({ event: "newsletter.subscribed", email }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`webhook responded ${response.status}`);
    return { sent: true as const };
  } catch (error) {
    console.error("[newsletter] delivery failed:", error instanceof Error ? error.message : error);
    return { sent: false, reason: "delivery failed" as const };
  }
}
