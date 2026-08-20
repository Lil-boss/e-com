"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Leaf, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { currencySymbol, type StoreSettings } from "@/lib/store-settings";
import { bengali } from "@/lib/storefront";
import { paymentLabel, statusLabel } from "@/lib/order-status";
import "./invoice.css";

type InvoiceItem = { product_name: string; variant_name: string | null; sku: string; unit_price: number; quantity: number; line_total: number };
type Invoice = {
  order_number: string; customer_name: string; customer_phone: string; customer_email: string | null;
  address_line: string; thana: string; district: string; postal_code: string | null; landmark: string | null;
  status: string; payment_status: string; payment_method: string;
  subtotal: number; discount_total: number; shipping_total: number; tax_total: number; grand_total: number;
  coupon_code: string | null; customer_note: string | null; created_at: string;
  order_items: InvoiceItem[]; shipments: Array<{ courier: string | null; tracking_number: string | null }>;
};

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Invoice | null>(null);
  const [store, setStore] = useState<StoreSettings>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.order) throw new Error(data.error || "অর্ডারটি পাওয়া যায়নি");
        setOrder(data.order as Invoice);
      })
      .catch((problem) => setError(problem instanceof Error ? problem.message : "অর্ডারটি পাওয়া যায়নি"));

    fetch("/api/storefront", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { settings?: Array<{ key: string; value: StoreSettings }> }) => {
        const saved = data.settings?.find((setting) => setting.key === "store")?.value;
        if (saved) setStore(saved);
      })
      .catch(() => {
        // The invoice still prints with the fallback identity below.
      });
  }, [params.id]);

  // the browser suggests document.title as the PDF filename
  useEffect(() => {
    if (!order) return;
    const previous = document.title;
    document.title = `Invoice-${order.order_number}`;
    return () => { document.title = previous; };
  }, [order]);

  if (error) {
    return (
      <main className="invoice-page">
        <div className="invoice-missing">
          <h1>ইনভয়েসটি পাওয়া যায়নি</h1>
          <p>{error}</p>
          <Link href="/">হোমে ফিরে যান</Link>
        </div>
      </main>
    );
  }

  if (!order) return <main className="invoice-page"><div className="invoice-missing"><p>ইনভয়েস তৈরি হচ্ছে...</p></div></main>;

  const symbol = currencySymbol(store.currency);
  const money = (value: number) => `${symbol}${bengali(Number(value || 0))}`;
  const shipment = order.shipments?.[0];
  const placed = new Date(order.created_at);

  return (
    <main className="invoice-page">
      <button className="invoice-print" type="button" onClick={() => window.print()}>
        <Printer size={17} /> প্রিন্ট বা PDF সংরক্ষণ
      </button>

      <article className="invoice-sheet">
        <header className="invoice-head">
          <div className="invoice-brand">
            {store.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={store.logo_url} alt={store.name || "Torun Mart"} />
              : <span className="invoice-mark"><Leaf size={22} /></span>}
            <div>
              <strong>{store.name || "তরুণ মার্ট"}</strong>
              {store.address && <small>{store.address}</small>}
              <small>
                {[store.phone, store.email].filter(Boolean).join(" · ")}
              </small>
              {(store.bin || store.mushak) && (
                <small>{[store.bin && `BIN: ${store.bin}`, store.mushak && `Mushak: ${store.mushak}`].filter(Boolean).join(" · ")}</small>
              )}
            </div>
          </div>
          <div className="invoice-meta">
            <h1>ইনভয়েস</h1>
            <p><span>অর্ডার নম্বর</span><strong>#{order.order_number}</strong></p>
            <p><span>তারিখ</span><strong>{placed.toLocaleDateString("bn-BD")}</strong></p>
            <p><span>সময়</span><strong>{placed.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</strong></p>
          </div>
        </header>

        <section className="invoice-parties">
          <div>
            <h2>ক্রেতা</h2>
            <strong>{order.customer_name}</strong>
            <p>{order.customer_phone}</p>
            {order.customer_email && <p>{order.customer_email}</p>}
          </div>
          <div>
            <h2>ডেলিভারি ঠিকানা</h2>
            <p>{order.address_line}</p>
            <p>{[order.thana, order.district, order.postal_code].filter(Boolean).join(", ")}</p>
            {order.landmark && <p>ল্যান্ডমার্ক: {order.landmark}</p>}
          </div>
          <div>
            <h2>অবস্থা</h2>
            <p>অর্ডার: <strong>{statusLabel[order.status] || order.status}</strong></p>
            <p>পেমেন্ট: <strong>{paymentLabel[order.payment_status] || order.payment_status}</strong> · {String(order.payment_method || "cod").toUpperCase()}</p>
            {shipment?.courier && <p>কুরিয়ার: {shipment.courier}{shipment.tracking_number ? ` · ${shipment.tracking_number}` : ""}</p>}
          </div>
        </section>

        <table className="invoice-items">
          <thead>
            <tr><th>পণ্য</th><th>একক মূল্য</th><th>পরিমাণ</th><th>মোট</th></tr>
          </thead>
          <tbody>
            {order.order_items.map((item, index) => (
              <tr key={`${item.sku}-${index}`}>
                <td>
                  <strong>{item.product_name}</strong>
                  <small>{[item.variant_name, item.sku].filter(Boolean).join(" · ")}</small>
                </td>
                <td>{money(item.unit_price)}</td>
                <td>{bengali(item.quantity)}</td>
                <td>{money(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="invoice-totals">
          <dl>
            <div><dt>সাবটোটাল</dt><dd>{money(order.subtotal)}</dd></div>
            {order.discount_total > 0 && (
              <div><dt>ছাড়{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt><dd>−{money(order.discount_total)}</dd></div>
            )}
            <div><dt>ডেলিভারি</dt><dd>{money(order.shipping_total)}</dd></div>
            {order.tax_total > 0 && <div><dt>ভ্যাট</dt><dd>{money(order.tax_total)}</dd></div>}
            <div className="invoice-grand"><dt>সর্বমোট</dt><dd>{money(order.grand_total)}</dd></div>
          </dl>
        </section>

        {order.customer_note && (
          <section className="invoice-note"><h2>ক্রেতার নোট</h2><p>{order.customer_note}</p></section>
        )}

        <footer className="invoice-foot">
          <p>{store.footer || "ধন্যবাদ, আবার আসবেন।"}</p>
          <small>এটি একটি কম্পিউটার-জেনারেটেড ইনভয়েস, স্বাক্ষরের প্রয়োজন নেই।</small>
        </footer>
      </article>
    </main>
  );
}
