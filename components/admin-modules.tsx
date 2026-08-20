"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { MessageSquareText, Pencil, Plus, Printer, Search, ShieldCheck, Tags, Trash2, Truck, X } from "lucide-react";

export const money = (value: number) => `৳${Number(value || 0).toLocaleString("bn-BD")}`;
/** Bengali numerals for display, never for input values. */
export const bn = (value: number) => Number(value || 0).toLocaleString("bn-BD");
export { paymentLabel, statusLabel } from "@/lib/order-status";
import { paymentLabel, statusLabel } from "@/lib/order-status";

export function PageHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="admin-page-heading">
      <div><p>{eyebrow}</p><h1>{title}</h1></div>
      {action && <button onClick={onAction}><Plus />{action}</button>}
    </div>
  );
}

/** Shared load/save/delete plumbing for the admin CRUD modules. */
export function useResource<T>(endpoint: string, enabled: boolean, demoRows: T[] = []) {
  const [rows, setRows] = useState<T[]>(enabled ? [] : demoRows);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const response = await fetch(endpoint);
    const result = await response.json();
    setLoading(false);
    if (!response.ok) { setError(result.error || "ডেটা লোড হয়নি"); return; }
    setError("");
    setRows(Array.isArray(result) ? result : []);
  }, [endpoint, enabled]);

  useEffect(() => { load(); }, [load]);

  const send = async (method: "POST" | "PATCH" | "DELETE", payload: Record<string, unknown>) => {
    if (!enabled) return "ডেমো মোডে পরিবর্তন সংরক্ষণ হয় না";
    const url = method === "DELETE" ? `${endpoint.split("?")[0]}?id=${payload.id}` : endpoint;
    const response = await fetch(url, method === "DELETE" ? { method } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return result.error || "সংরক্ষণ করা যায়নি";
    await load();
    return null;
  };

  return { rows, loading, error, load, send };
}

function ModalShell({ eyebrow, title, onClose, onSubmit, saving, children }: { eyebrow: string; title: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; children: React.ReactNode }) {
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="admin-modal" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
        <header><div><p>{eyebrow}</p><h2>{title}</h2></div><button type="button" onClick={onClose}><X /></button></header>
        <div className="admin-form-grid">{children}</div>
        <footer><button type="button" onClick={onClose}>বাতিল</button><button disabled={saving}>{saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}</button></footer>
      </form>
    </div>
  );
}

type Category = { id: string; name_bn: string; name_en: string | null; slug: string; description: string | null; sort_order: number; is_active: boolean; show_on_home: boolean; parent_id: string | null; products?: Array<{ count: number }> };

export function CategoriesModule({ configured, notify }: { configured: boolean; notify: (message: string) => void }) {
  const demo: Category[] = [
    { id: "d1", name_bn: "খাঁটি খাবার", name_en: "Pure foods", slug: "pure-foods", description: null, sort_order: 1, is_active: true, show_on_home: true, parent_id: null },
    { id: "d2", name_bn: "মৌসুমি ফল", name_en: "Seasonal fruits", slug: "seasonal-fruits", description: null, sort_order: 2, is_active: true, show_on_home: true, parent_id: null },
  ];
  const { rows, loading, error, send } = useResource<Category>("/api/admin/categories", configured, demo);
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    const problem = await send(editing ? "PATCH" : "POST", {
      id: editing?.id, name_bn: data.get("name_bn"), name_en: data.get("name_en"), slug: data.get("slug"),
      description: data.get("description"), sort_order: Number(data.get("sort_order") || 0),
      parent_id: data.get("parent_id") || null, is_active: data.get("is_active") === "on", show_on_home: data.get("show_on_home") === "on",
    });
    setSaving(false);
    notify(problem || (editing ? "ক্যাটাগরি হালনাগাদ হয়েছে" : "ক্যাটাগরি যোগ হয়েছে"));
    if (!problem) { setOpen(false); setEditing(null); }
  };

  const remove = async (category: Category) => {
    if (!window.confirm(`"${category.name_bn}" ক্যাটাগরিটি মুছে ফেলবেন?`)) return;
    notify((await send("DELETE", { id: category.id })) || "ক্যাটাগরি মুছে ফেলা হয়েছে");
  };

  return (
    <>
      <PageHeading eyebrow="স্টোর সংগঠন" title="ক্যাটাগরি" action="নতুন ক্যাটাগরি" onAction={() => { setEditing(null); setOpen(true); }} />
      {error && <div className="admin-inline-error">{error}</div>}
      <div className="admin-panel simple-list">
        {loading && <article><p><strong>লোড হচ্ছে...</strong></p></article>}
        {!loading && !rows.length && <article><p><strong>কোনো ক্যাটাগরি নেই</strong><small>উপরের বাটন থেকে নতুন ক্যাটাগরি যোগ করুন</small></p></article>}
        {rows.map((category) => (
          <article key={category.id}>
            <span><Tags /></span>
            <p><strong>{category.name_bn}</strong><small>/{category.slug} · {category.products?.[0]?.count ?? 0}টি পণ্য</small></p>
            <b>{category.show_on_home ? "হোমপেজে" : "ক্যাটালগে"}{category.is_active ? "" : " · নিষ্ক্রিয়"}</b>
            <div className="row-actions">
              <button onClick={() => { setEditing(category); setOpen(true); }}><Pencil /></button>
              <button onClick={() => remove(category)}><Trash2 /></button>
            </div>
          </article>
        ))}
      </div>
      {open && (
        <ModalShell eyebrow="ক্যাটালগ" title={editing ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি"} saving={saving} onClose={() => { setOpen(false); setEditing(null); }} onSubmit={submit}>
          <label className="full">বাংলা নাম *<input name="name_bn" required defaultValue={editing?.name_bn} /></label>
          <label>ইংরেজি নাম<input name="name_en" defaultValue={editing?.name_en || ""} /></label>
          <label>Slug<input name="slug" placeholder="auto-generated" defaultValue={editing?.slug} /></label>
          <label className="full">বিবরণ<textarea name="description" rows={2} defaultValue={editing?.description || ""} /></label>
          <label>ক্রম<input name="sort_order" type="number" min="0" defaultValue={editing?.sort_order ?? 0} /></label>
          <label>প্যারেন্ট ক্যাটাগরি
            <select name="parent_id" defaultValue={editing?.parent_id || ""}>
              <option value="">কোনোটি নয়</option>
              {rows.filter((row) => row.id !== editing?.id).map((row) => <option key={row.id} value={row.id}>{row.name_bn}</option>)}
            </select>
          </label>
          <label className="admin-check"><input type="checkbox" name="is_active" defaultChecked={editing ? editing.is_active : true} /> সক্রিয়</label>
          <label className="admin-check"><input type="checkbox" name="show_on_home" defaultChecked={editing?.show_on_home} /> হোমপেজে দেখান</label>
        </ModalShell>
      )}
    </>
  );
}

type Coupon = { id: string; code: string; discount_type: string; discount_value: number; minimum_spend: number; usage_limit: number | null; per_customer_limit: number | null; starts_at: string | null; ends_at: string | null; is_active: boolean; used_count?: number };
const dateValue = (value: string | null) => (value ? value.slice(0, 10) : "");

export function PromotionsModule({ configured, notify }: { configured: boolean; notify: (message: string) => void }) {
  const demo: Coupon[] = [{ id: "d1", code: "TORUN10", discount_type: "percentage", discount_value: 10, minimum_spend: 1000, usage_limit: 100, per_customer_limit: 1, starts_at: null, ends_at: null, is_active: true, used_count: 12 }];
  const { rows, loading, error, send } = useResource<Coupon>("/api/admin/coupons", configured, demo);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    const problem = await send(editing ? "PATCH" : "POST", {
      id: editing?.id, code: data.get("code"), discount_type: data.get("discount_type"), discount_value: data.get("discount_value"),
      minimum_spend: data.get("minimum_spend"), usage_limit: data.get("usage_limit"), per_customer_limit: data.get("per_customer_limit"),
      starts_at: data.get("starts_at"), ends_at: data.get("ends_at"), is_active: data.get("is_active") === "on",
    });
    setSaving(false);
    notify(problem || (editing ? "কুপন হালনাগাদ হয়েছে" : "কুপন তৈরি হয়েছে"));
    if (!problem) { setOpen(false); setEditing(null); }
  };

  const remove = async (coupon: Coupon) => {
    if (!window.confirm(`"${coupon.code}" কুপনটি মুছে ফেলবেন?`)) return;
    notify((await send("DELETE", { id: coupon.id })) || "কুপন মুছে ফেলা হয়েছে");
  };

  return (
    <>
      <PageHeading eyebrow="মার্কেটিং" title="প্রমোশন ও কুপন" action="নতুন কুপন" onAction={() => { setEditing(null); setOpen(true); }} />
      {error && <div className="admin-inline-error">{error}</div>}
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>কোড</th><th>ছাড়</th><th>শর্ত</th><th>মেয়াদ</th><th>ব্যবহার</th><th>অবস্থা</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7}>লোড হচ্ছে...</td></tr>}
              {!loading && !rows.length && <tr><td colSpan={7}>কোনো কুপন নেই</td></tr>}
              {rows.map((coupon) => (
                <tr key={coupon.id}>
                  <td><strong>{coupon.code}</strong><small>{coupon.discount_type === "percentage" ? "শতকরা" : "নির্দিষ্ট"}</small></td>
                  <td><strong>{coupon.discount_type === "percentage" ? `${bn(coupon.discount_value)}%` : money(coupon.discount_value)}</strong></td>
                  <td>{coupon.minimum_spend ? `ন্যূনতম ${money(coupon.minimum_spend)}` : "শর্তহীন"}</td>
                  <td>{coupon.ends_at ? new Date(coupon.ends_at).toLocaleDateString("bn-BD") : "চলমান"}</td>
                  <td><strong>{coupon.used_count ?? 0}{coupon.usage_limit ? ` / ${bn(coupon.usage_limit)}` : ""}</strong></td>
                  <td><span className={`admin-status ${coupon.is_active ? "published" : "archived"}`}>{coupon.is_active ? "সক্রিয়" : "বন্ধ"}</span></td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => { setEditing(coupon); setOpen(true); }}><Pencil /></button>
                      <button onClick={() => remove(coupon)}><Trash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {open && (
        <ModalShell eyebrow="প্রমোশন" title={editing ? "কুপন সম্পাদনা" : "নতুন কুপন"} saving={saving} onClose={() => { setOpen(false); setEditing(null); }} onSubmit={submit}>
          <label>কুপন কোড *<input name="code" required placeholder="TORUN10" defaultValue={editing?.code} style={{ textTransform: "uppercase" }} /></label>
          <label>ছাড়ের ধরন
            <select name="discount_type" defaultValue={editing?.discount_type || "fixed"}>
              <option value="fixed">নির্দিষ্ট টাকা</option>
              <option value="percentage">শতকরা</option>
            </select>
          </label>
          <label>ছাড়ের পরিমাণ *<input name="discount_value" type="number" min="1" step="0.01" required defaultValue={editing?.discount_value} /></label>
          <label>ন্যূনতম কেনাকাটা<input name="minimum_spend" type="number" min="0" step="0.01" defaultValue={editing?.minimum_spend ?? 0} /></label>
          <label>মোট ব্যবহারসীমা<input name="usage_limit" type="number" min="1" placeholder="সীমাহীন" defaultValue={editing?.usage_limit ?? ""} /></label>
          <label>প্রতি ক্রেতা সীমা<input name="per_customer_limit" type="number" min="1" placeholder="সীমাহীন" defaultValue={editing?.per_customer_limit ?? ""} /></label>
          <label>শুরুর তারিখ<input name="starts_at" type="date" defaultValue={dateValue(editing?.starts_at ?? null)} /></label>
          <label>শেষ তারিখ<input name="ends_at" type="date" defaultValue={dateValue(editing?.ends_at ?? null)} /></label>
          <label className="admin-check full"><input type="checkbox" name="is_active" defaultChecked={editing ? editing.is_active : true} /> কুপনটি সক্রিয়</label>
        </ModalShell>
      )}
    </>
  );
}

type Review = { id: string; rating: number; title: string | null; body: string; status: string; is_verified: boolean; created_at: string; products?: { name_bn: string } | null; profiles?: { full_name: string; phone: string } | null };

export function ReviewsModule({ configured, notify }: { configured: boolean; notify: (message: string) => void }) {
  const [filter, setFilter] = useState("pending");
  const demo: Review[] = [{ id: "d1", rating: 5, title: "চমৎকার মধু", body: "প্যাকেজিং ভালো ছিল, স্বাদও খাঁটি।", status: "pending", is_verified: true, created_at: new Date().toISOString(), products: { name_bn: "কালোজিরা ফুলের মধু" }, profiles: { full_name: "রফিকুল ইসলাম", phone: "01820361645" } }];
  const { rows, loading, error, send } = useResource<Review>(`/api/admin/reviews${filter === "all" ? "" : `?status=${filter}`}`, configured, demo);

  const moderate = async (review: Review, status: string) => {
    notify((await send("PATCH", { id: review.id, status })) || `রিভিউটি ${statusLabel[status] || status}`);
  };
  const remove = async (review: Review) => {
    if (!window.confirm("রিভিউটি স্থায়ীভাবে মুছে ফেলবেন?")) return;
    notify((await send("DELETE", { id: review.id })) || "রিভিউ মুছে ফেলা হয়েছে");
  };

  return (
    <>
      <PageHeading eyebrow="ম্যানেজমেন্ট" title="রিভিউ মডারেশন" />
      <div className="admin-toolbar">
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="pending">অপেক্ষমাণ</option>
          <option value="approved">অনুমোদিত</option>
          <option value="rejected">প্রত্যাখ্যাত</option>
          <option value="flagged">চিহ্নিত</option>
          <option value="all">সব রিভিউ</option>
        </select>
      </div>
      {error && <div className="admin-inline-error">{error}</div>}
      <div className="admin-panel simple-list">
        {loading && <article><p><strong>লোড হচ্ছে...</strong></p></article>}
        {!loading && !rows.length && <article><p><strong>এই তালিকায় কোনো রিভিউ নেই</strong></p></article>}
        {rows.map((review) => (
          <article key={review.id} className="review-row">
            <span><MessageSquareText /></span>
            <p>
              <strong>{review.products?.name_bn || "পণ্য"} · {"★".repeat(review.rating)}<small className="muted">{review.is_verified ? " যাচাইকৃত ক্রয়" : ""}</small></strong>
              <small>{review.profiles?.full_name || "অতিথি"} — {review.body}</small>
            </p>
            <b><span className={`admin-status ${review.status}`}>{statusLabel[review.status] || review.status}</span></b>
            <div className="row-actions">
              {review.status !== "approved" && <button title="অনুমোদন" onClick={() => moderate(review, "approved")}><ShieldCheck /></button>}
              {review.status !== "rejected" && <button title="প্রত্যাখ্যান" onClick={() => moderate(review, "rejected")}><X /></button>}
              <button title="মুছুন" onClick={() => remove(review)}><Trash2 /></button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

type Customer = { key: string; name: string; phone: string; email: string | null; registered: boolean; orders: number; spent: number; last_order: string | null };

export function CustomersModule({ configured }: { configured: boolean }) {
  const demo: Customer[] = [{ key: "01820361645", name: "রফিকুল ইসলাম", phone: "01820361645", email: null, registered: true, orders: 4, spent: 5230, last_order: new Date().toISOString() }];
  const { rows, loading, error } = useResource<Customer>("/api/admin/customers", configured, demo);
  const [query, setQuery] = useState("");
  const visible = rows.filter((customer) => `${customer.name} ${customer.phone} ${customer.email || ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <PageHeading eyebrow="ম্যানেজমেন্ট" title="ক্রেতা" />
      <div className="admin-toolbar">
        <label><Search /><input placeholder="নাম বা ফোন দিয়ে খুঁজুন" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      {error && <div className="admin-inline-error">{error}</div>}
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>ক্রেতা</th><th>ধরন</th><th>অর্ডার</th><th>মোট কেনাকাটা</th><th>সর্বশেষ অর্ডার</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5}>লোড হচ্ছে...</td></tr>}
              {!loading && !visible.length && <tr><td colSpan={5}>কোনো ক্রেতা পাওয়া যায়নি</td></tr>}
              {visible.map((customer) => (
                <tr key={customer.key}>
                  <td><strong>{customer.name}</strong><small>{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</small></td>
                  <td><span className={`admin-status ${customer.registered ? "published" : "pending"}`}>{customer.registered ? "নিবন্ধিত" : "অতিথি"}</span></td>
                  <td><strong>{bn(customer.orders)}</strong></td>
                  <td><strong>{money(customer.spent)}</strong></td>
                  <td>{customer.last_order ? new Date(customer.last_order).toLocaleDateString("bn-BD") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

type OrderDetail = {
  id: string; order_number: string; customer_name: string; customer_phone: string; customer_email: string | null;
  address_line: string; thana: string; district: string; postal_code: string | null; landmark: string | null;
  status: string; payment_status: string; payment_method: string; subtotal: number; discount_total: number;
  shipping_total: number; grand_total: number; coupon_code: string | null; customer_note: string | null; internal_note: string | null; created_at: string;
  next_statuses: string[];
  order_items: Array<{ id: string; product_name: string; variant_name: string | null; sku: string; unit_price: number; quantity: number; line_total: number }>;
  order_status_events: Array<{ from_status: string | null; to_status: string; note: string | null; created_at: string }>;
  shipments: Array<{ id: string; courier: string | null; tracking_number: string | null; status: string }>;
};

export function OrderDetailModal({ orderId, configured, onClose, onUpdated, notify }: { orderId: string; configured: boolean; onClose: () => void; onUpdated: () => void; notify: (message: string) => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!configured) { setError("ডেমো মোডে অর্ডারের বিস্তারিত পাওয়া যায় না"); return; }
    const response = await fetch(`/api/admin/orders?id=${orderId}`);
    const result = await response.json();
    if (!response.ok) { setError(result.error || "অর্ডার পাওয়া যায়নি"); return; }
    setOrder(result);
  }, [orderId, configured]);
  useEffect(() => { load(); }, [load]);

  const patch = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: orderId, ...payload }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { notify(result.error || "পরিবর্তন সংরক্ষণ হয়নি"); return; }
    notify(result.warning || success);
    await load();
    onUpdated();
  };

  const shipment = order?.shipments?.[0];

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><p>অর্ডার অপারেশন</p><h2>{order ? `#${order.order_number}` : "অর্ডার"}</h2></div>
          <div className="modal-head-actions">
            {order && <a className="modal-invoice" href={`/invoice/${orderId}`} target="_blank" rel="noreferrer noopener"><Printer /> ইনভয়েস</a>}
            <button type="button" onClick={onClose}><X /></button>
          </div>
        </header>
        {error && <div className="admin-inline-error">{error}</div>}
        {!order && !error && <div className="order-detail"><p>লোড হচ্ছে...</p></div>}
        {order && (
          <div className="order-detail">
            <section className="order-detail-grid">
              <article>
                <h3>ক্রেতা</h3>
                <p><strong>{order.customer_name}</strong><small>{order.customer_phone}</small>{order.customer_email && <small>{order.customer_email}</small>}</p>
              </article>
              <article>
                <h3>ডেলিভারি ঠিকানা</h3>
                <p><small>{order.address_line}</small><small>{order.thana}, {order.district}{order.postal_code ? ` – ${order.postal_code}` : ""}</small>{order.landmark && <small>ল্যান্ডমার্ক: {order.landmark}</small>}</p>
              </article>
              <article>
                <h3>অবস্থা</h3>
                <p>
                  <span className={`admin-status ${order.status}`}>{statusLabel[order.status] || order.status}</span>
                  <small>পেমেন্ট: {paymentLabel[order.payment_status] || order.payment_status} · {order.payment_method.toUpperCase()}</small>
                  <small>{new Date(order.created_at).toLocaleString("bn-BD")}</small>
                </p>
              </article>
            </section>

            <div className="admin-table-wrap">
              <table>
                <thead><tr><th>পণ্য</th><th>একক মূল্য</th><th>পরিমাণ</th><th>মোট</th></tr></thead>
                <tbody>
                  {order.order_items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.product_name}</strong><small>{item.variant_name || item.sku}</small></td>
                      <td>{money(item.unit_price)}</td>
                      <td>{item.quantity}</td>
                      <td><strong>{money(item.line_total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="order-totals">
              <div><dt>সাবটোটাল</dt><dd>{money(order.subtotal)}</dd></div>
              {order.discount_total > 0 && <div><dt>ছাড়{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt><dd>−{money(order.discount_total)}</dd></div>}
              <div><dt>ডেলিভারি</dt><dd>{money(order.shipping_total)}</dd></div>
              <div className="grand"><dt>সর্বমোট</dt><dd>{money(order.grand_total)}</dd></div>
            </dl>

            {order.customer_note && <p className="order-note"><strong>ক্রেতার নোট:</strong> {order.customer_note}</p>}

            <section className="order-actions">
              <div>
                <h3>স্ট্যাটাস পরিবর্তন</h3>
                {order.next_statuses.length ? (
                  <div className="order-status-buttons">
                    {order.next_statuses.map((next) => (
                      <button key={next} disabled={busy} onClick={() => patch({ status: next }, `অর্ডারটি এখন ${statusLabel[next] || next}`)}>{statusLabel[next] || next}</button>
                    ))}
                  </div>
                ) : <p className="muted">এই অর্ডারের আর কোনো ধাপ বাকি নেই।</p>}
                <small className="muted">বাতিল করলে সংরক্ষিত স্টক ফেরত যায়, ডেলিভারি সম্পন্ন হলে স্টক কমে যায়।</small>
              </div>

              <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); patch({ payment_status: data.get("payment_status") }, "পেমেন্ট অবস্থা হালনাগাদ হয়েছে"); }}>
                <h3>পেমেন্ট</h3>
                <select name="payment_status" defaultValue={order.payment_status}>
                  {Object.entries(paymentLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button disabled={busy}>সংরক্ষণ</button>
              </form>

              <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); patch({ shipment: { courier: data.get("courier"), tracking_number: data.get("tracking_number"), status: data.get("shipment_status") } }, "কুরিয়ার তথ্য সংরক্ষিত হয়েছে"); }}>
                <h3><Truck /> কুরিয়ার</h3>
                <input name="courier" placeholder="কুরিয়ার সার্ভিস" defaultValue={shipment?.courier || ""} />
                <input name="tracking_number" placeholder="ট্র্যাকিং নম্বর" defaultValue={shipment?.tracking_number || ""} />
                <select name="shipment_status" defaultValue={shipment?.status || "pending"}>
                  <option value="pending">প্রস্তুত হচ্ছে</option>
                  <option value="shipped">পাঠানো হয়েছে</option>
                  <option value="delivered">পৌঁছে দেওয়া হয়েছে</option>
                  <option value="failed">ব্যর্থ</option>
                </select>
                <button disabled={busy}>সংরক্ষণ</button>
              </form>

              <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); patch({ internal_note: data.get("internal_note") }, "অভ্যন্তরীণ নোট সংরক্ষিত হয়েছে"); }}>
                <h3>অভ্যন্তরীণ নোট</h3>
                <textarea name="internal_note" rows={3} defaultValue={order.internal_note || ""} placeholder="শুধু স্টাফ দেখতে পাবেন" />
                <button disabled={busy}>সংরক্ষণ</button>
              </form>
            </section>

            <section className="order-timeline">
              <h3>অর্ডার টাইমলাইন</h3>
              {order.order_status_events.map((event, index) => (
                <p key={index}><span /><strong>{statusLabel[event.to_status] || event.to_status}</strong><small>{new Date(event.created_at).toLocaleString("bn-BD")}{event.note ? ` · ${event.note}` : ""}</small></p>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
