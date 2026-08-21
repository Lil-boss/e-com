"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { MessageSquareText, Pencil, Plus, Printer, Search, ShieldCheck, Tags, Trash2, Truck, X } from "lucide-react";

export const money = (value: number) => `৳${Number(value || 0).toLocaleString("en-US")}`;
/** Grouped numerals for display, never for input values. */
export const bn = (value: number) => Number(value || 0).toLocaleString("en-US");
// the admin reads the English maps; the storefront imports the Bengali ones directly
export { paymentLabelEn as paymentLabel, statusLabelEn as statusLabel } from "@/lib/order-status";
import { paymentLabelEn as paymentLabel, statusLabelEn as statusLabel } from "@/lib/order-status";

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
    if (!response.ok) { setError(result.error || "Could not load data"); return; }
    setError("");
    setRows(Array.isArray(result) ? result : []);
  }, [endpoint, enabled]);

  useEffect(() => { load(); }, [load]);

  const send = async (method: "POST" | "PATCH" | "DELETE", payload: Record<string, unknown>) => {
    if (!enabled) return "Changes are not saved in demo mode";
    const url = method === "DELETE" ? `${endpoint.split("?")[0]}?id=${payload.id}` : endpoint;
    const response = await fetch(url, method === "DELETE" ? { method } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return result.error || "Could not save";
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
        <footer><button type="button" onClick={onClose}>Cancel</button><button disabled={saving}>{saving ? "Saving..." : "Save"}</button></footer>
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
    notify(problem || (editing ? "Category updated" : "Category added"));
    if (!problem) { setOpen(false); setEditing(null); }
  };

  const remove = async (category: Category) => {
    if (!window.confirm(`"${category.name_bn}" Delete this category?`)) return;
    notify((await send("DELETE", { id: category.id })) || "Category deleted");
  };

  return (
    <>
      <PageHeading eyebrow="Store structure" title="Categories" action="New category" onAction={() => { setEditing(null); setOpen(true); }} />
      {error && <div className="admin-inline-error">{error}</div>}
      <div className="admin-panel simple-list">
        {loading && <article><p><strong>Loading...</strong></p></article>}
        {!loading && !rows.length && <article><p><strong>No categories yet</strong><small>Add a category with the button above</small></p></article>}
        {rows.map((category) => (
          <article key={category.id}>
            <span><Tags /></span>
            <p><strong>{category.name_bn}</strong><small>/{category.slug} · {category.products?.[0]?.count ?? 0} products</small></p>
            <b>{category.show_on_home ? "On homepage" : "Catalogue only"}{category.is_active ? "" : "  · inactive"}</b>
            <div className="row-actions">
              <button onClick={() => { setEditing(category); setOpen(true); }}><Pencil /></button>
              <button onClick={() => remove(category)}><Trash2 /></button>
            </div>
          </article>
        ))}
      </div>
      {open && (
        <ModalShell eyebrow="Catalogue" title={editing ? "Edit category" : "New category"} saving={saving} onClose={() => { setOpen(false); setEditing(null); }} onSubmit={submit}>
          <label className="full">Bengali name *<input name="name_bn" required defaultValue={editing?.name_bn} /></label>
          <label>English name<input name="name_en" defaultValue={editing?.name_en || ""} /></label>
          <label>Slug<input name="slug" placeholder="auto-generated" defaultValue={editing?.slug} /></label>
          <label className="full">Description<textarea name="description" rows={2} defaultValue={editing?.description || ""} /></label>
          <label>Sort order<input name="sort_order" type="number" min="0" defaultValue={editing?.sort_order ?? 0} /></label>
          <label>Parent category
            <select name="parent_id" defaultValue={editing?.parent_id || ""}>
              <option value="">None</option>
              {rows.filter((row) => row.id !== editing?.id).map((row) => <option key={row.id} value={row.id}>{row.name_bn}</option>)}
            </select>
          </label>
          <label className="admin-check"><input type="checkbox" name="is_active" defaultChecked={editing ? editing.is_active : true} /> Active</label>
          <label className="admin-check"><input type="checkbox" name="show_on_home" defaultChecked={editing?.show_on_home} /> Show on homepage</label>
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
    notify(problem || (editing ? "Coupon updated" : "Coupon created"));
    if (!problem) { setOpen(false); setEditing(null); }
  };

  const remove = async (coupon: Coupon) => {
    if (!window.confirm(`"${coupon.code}" Delete this coupon?`)) return;
    notify((await send("DELETE", { id: coupon.id })) || "Coupon deleted");
  };

  return (
    <>
      <PageHeading eyebrow="Marketing" title="Promotions & coupons" action="New coupon" onAction={() => { setEditing(null); setOpen(true); }} />
      {error && <div className="admin-inline-error">{error}</div>}
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Discount</th><th>Condition</th><th>Expiry</th><th>Used</th><th>Status</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7}>Loading...</td></tr>}
              {!loading && !rows.length && <tr><td colSpan={7}>No coupons yet</td></tr>}
              {rows.map((coupon) => (
                <tr key={coupon.id}>
                  <td><strong>{coupon.code}</strong><small>{coupon.discount_type === "percentage" ? "Percentage" : "Fixed"}</small></td>
                  <td><strong>{coupon.discount_type === "percentage" ? `${bn(coupon.discount_value)}%` : money(coupon.discount_value)}</strong></td>
                  <td>{coupon.minimum_spend ? `Minimum ${money(coupon.minimum_spend)}` : "No minimum"}</td>
                  <td>{coupon.ends_at ? new Date(coupon.ends_at).toLocaleDateString("en-GB") : "Ongoing"}</td>
                  <td><strong>{coupon.used_count ?? 0}{coupon.usage_limit ? ` / ${bn(coupon.usage_limit)}` : ""}</strong></td>
                  <td><span className={`admin-status ${coupon.is_active ? "published" : "archived"}`}>{coupon.is_active ? "Active" : "Off"}</span></td>
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
        <ModalShell eyebrow="Promotions" title={editing ? "Edit coupon" : "New coupon"} saving={saving} onClose={() => { setOpen(false); setEditing(null); }} onSubmit={submit}>
          <label>Coupon code *<input name="code" required placeholder="TORUN10" defaultValue={editing?.code} style={{ textTransform: "uppercase" }} /></label>
          <label>Discount type
            <select name="discount_type" defaultValue={editing?.discount_type || "fixed"}>
              <option value="fixed">Fixed amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </label>
          <label>Discount amount *<input name="discount_value" type="number" min="1" step="0.01" required defaultValue={editing?.discount_value} /></label>
          <label>Minimum spend<input name="minimum_spend" type="number" min="0" step="0.01" defaultValue={editing?.minimum_spend ?? 0} /></label>
          <label>Total usage limit<input name="usage_limit" type="number" min="1" placeholder="Unlimited" defaultValue={editing?.usage_limit ?? ""} /></label>
          <label>Per-customer limit<input name="per_customer_limit" type="number" min="1" placeholder="Unlimited" defaultValue={editing?.per_customer_limit ?? ""} /></label>
          <label>Start date<input name="starts_at" type="date" defaultValue={dateValue(editing?.starts_at ?? null)} /></label>
          <label>End date<input name="ends_at" type="date" defaultValue={dateValue(editing?.ends_at ?? null)} /></label>
          <label className="admin-check full"><input type="checkbox" name="is_active" defaultChecked={editing ? editing.is_active : true} /> Coupon is active</label>
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
    notify((await send("PATCH", { id: review.id, status })) || `Review ${statusLabel[status] || status}`);
  };
  const remove = async (review: Review) => {
    if (!window.confirm("Permanently delete this review?")) return;
    notify((await send("DELETE", { id: review.id })) || "Review deleted");
  };

  return (
    <>
      <PageHeading eyebrow="Management" title="Review moderation" />
      <div className="admin-toolbar">
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
          <option value="all">All reviews</option>
        </select>
      </div>
      {error && <div className="admin-inline-error">{error}</div>}
      <div className="admin-panel simple-list">
        {loading && <article><p><strong>Loading...</strong></p></article>}
        {!loading && !rows.length && <article><p><strong>No reviews in this list</strong></p></article>}
        {rows.map((review) => (
          <article key={review.id} className="review-row">
            <span><MessageSquareText /></span>
            <p>
              <strong>{review.products?.name_bn || "Product"} · {"★".repeat(review.rating)}<small className="muted">{review.is_verified ? " Verified purchase" : ""}</small></strong>
              <small>{review.profiles?.full_name || "Guest"} — {review.body}</small>
            </p>
            <b><span className={`admin-status ${review.status}`}>{statusLabel[review.status] || review.status}</span></b>
            <div className="row-actions">
              {review.status !== "approved" && <button title="Approve" onClick={() => moderate(review, "approved")}><ShieldCheck /></button>}
              {review.status !== "rejected" && <button title="Reject" onClick={() => moderate(review, "rejected")}><X /></button>}
              <button title="Delete" onClick={() => remove(review)}><Trash2 /></button>
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
      <PageHeading eyebrow="Management" title="Customers" />
      <div className="admin-toolbar">
        <label><Search /><input placeholder="Search by name or phone" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      {error && <div className="admin-inline-error">{error}</div>}
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Type</th><th>Orders</th><th>Lifetime spend</th><th>Last order</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5}>Loading...</td></tr>}
              {!loading && !visible.length && <tr><td colSpan={5}>No customers found</td></tr>}
              {visible.map((customer) => (
                <tr key={customer.key}>
                  <td><strong>{customer.name}</strong><small>{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</small></td>
                  <td><span className={`admin-status ${customer.registered ? "published" : "pending"}`}>{customer.registered ? "Registered" : "Guest"}</span></td>
                  <td><strong>{bn(customer.orders)}</strong></td>
                  <td><strong>{money(customer.spent)}</strong></td>
                  <td>{customer.last_order ? new Date(customer.last_order).toLocaleDateString("en-GB") : "—"}</td>
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
  payments?: Array<{ method: string; provider: string | null; status: string; amount: number; provider_reference: string | null }>;
};

export function OrderDetailModal({ orderId, configured, onClose, onUpdated, notify }: { orderId: string; configured: boolean; onClose: () => void; onUpdated: () => void; notify: (message: string) => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!configured) { setError("Order details are unavailable in demo mode"); return; }
    const response = await fetch(`/api/admin/orders?id=${orderId}`);
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Order not found"); return; }
    setOrder(result);
  }, [orderId, configured]);
  useEffect(() => { load(); }, [load]);

  const patch = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: orderId, ...payload }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { notify(result.error || "Changes were not saved"); return; }
    notify(result.warning || success);
    await load();
    onUpdated();
  };

  const shipment = order?.shipments?.[0];

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><p>Order operations</p><h2>{order ? `#${order.order_number}` : "Order"}</h2></div>
          <div className="modal-head-actions">
            {order && ["cancelled", "delivered", "returned", "refunded"].includes(order.status) && (
              <button type="button" className="modal-delete" onClick={async () => {
                if (!window.confirm(`Delete order #${order.order_number}? This cannot be undone.`)) return;
                const response = await fetch(`/api/admin/orders?id=${orderId}`, { method: "DELETE" });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) { notify(result.error || "Order could not be deleted"); return; }
                notify("Order deleted");
                onUpdated();
                onClose();
              }}><Trash2 /> Delete</button>
            )}
            {order && <a className="modal-invoice" href={`/invoice/${orderId}`} target="_blank" rel="noreferrer noopener"><Printer /> Invoice</a>}
            <button type="button" onClick={onClose}><X /></button>
          </div>
        </header>
        {error && <div className="admin-inline-error">{error}</div>}
        {!order && !error && <div className="order-detail"><p>Loading...</p></div>}
        {order && (
          <div className="order-detail">
            <section className="order-detail-grid">
              <article>
                <h3>Customer</h3>
                <p><strong>{order.customer_name}</strong><small>{order.customer_phone}</small>{order.customer_email && <small>{order.customer_email}</small>}</p>
              </article>
              <article>
                <h3>Delivery address</h3>
                <p><small>{order.address_line}</small><small>{order.thana}, {order.district}{order.postal_code ? ` – ${order.postal_code}` : ""}</small>{order.landmark && <small>Landmark: {order.landmark}</small>}</p>
              </article>
              <article>
                <h3>Status</h3>
                <p>
                  <span className={`admin-status ${order.status}`}>{statusLabel[order.status] || order.status}</span>
                  <small>Payment: {paymentLabel[order.payment_status] || order.payment_status} · {String(order.payment_method || "cod").toUpperCase()}</small>
                  {order.payments?.[0]?.provider_reference && <small className="payment-ref">Ref: {order.payments[0].provider_reference}</small>}
                  <small>{new Date(order.created_at).toLocaleString("en-GB")}</small>
                </p>
              </article>
            </section>

            <div className="admin-table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Unit price</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                  {(order.order_items || []).map((item) => (
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
              <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              {order.discount_total > 0 && <div><dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt><dd>−{money(order.discount_total)}</dd></div>}
              <div><dt>Delivery</dt><dd>{money(order.shipping_total)}</dd></div>
              <div className="grand"><dt>Grand total</dt><dd>{money(order.grand_total)}</dd></div>
            </dl>

            {order.customer_note && <p className="order-note"><strong>Customer note:</strong> {order.customer_note}</p>}

            <section className="order-actions">
              <div>
                <h3>Change status</h3>
                {order.next_statuses.length ? (
                  <div className="order-status-buttons">
                    {order.next_statuses.map((next) => (
                      <button key={next} disabled={busy} onClick={() => patch({ status: next }, `Order is now ${statusLabel[next] || next}`)}>{statusLabel[next] || next}</button>
                    ))}
                  </div>
                ) : <p className="muted">No further steps for this order.</p>}
                <small className="muted">Cancelling releases reserved stock; delivering consumes it.</small>
              </div>

              <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); patch({ payment_status: data.get("payment_status") }, "Payment status updated"); }}>
                <h3>Payment</h3>
                <select name="payment_status" defaultValue={order.payment_status}>
                  {Object.entries(paymentLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button disabled={busy}>Save</button>
              </form>

              <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); patch({ shipment: { courier: data.get("courier"), tracking_number: data.get("tracking_number"), status: data.get("shipment_status") } }, "Courier details saved"); }}>
                <h3><Truck /> Courier</h3>
                <input name="courier" placeholder="Courier service" defaultValue={shipment?.courier || ""} />
                <input name="tracking_number" placeholder="Tracking number" defaultValue={shipment?.tracking_number || ""} />
                <select name="shipment_status" defaultValue={shipment?.status || "pending"}>
                  <option value="pending">Preparing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
                <button disabled={busy}>Save</button>
              </form>

              <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); patch({ internal_note: data.get("internal_note") }, "Internal note saved"); }}>
                <h3>Internal note</h3>
                <textarea name="internal_note" rows={3} defaultValue={order.internal_note || ""} placeholder="Visible to staff only" />
                <button disabled={busy}>Save</button>
              </form>
            </section>

            <section className="order-timeline">
              <h3>Order timeline</h3>
              {(order.order_status_events || []).map((event, index) => (
                <p key={index}><span /><strong>{statusLabel[event.to_status] || event.to_status}</strong><small>{new Date(event.created_at).toLocaleString("en-GB")}{event.note ? ` · ${event.note}` : ""}</small></p>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
