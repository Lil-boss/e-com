"use client";

import { BarChart3, CircleDollarSign, Download, Package, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { bn, money, statusLabel } from "./admin-modules";

type Bucket = { day: string; revenue: number; orders: number };
type Group = { name: string; count: number; revenue: number };
type Totals = {
  revenue: number; orders: number; earningOrders: number; averageOrder: number;
  delivered: number; deliveredRevenue: number; cancelled: number; discount: number; units?: number;
};
type ReportData = {
  range: { from: string; to: string; days: number; previousFrom: string; previousTo: string };
  totals: Totals;
  previous: Totals;
  daily: Bucket[];
  byStatus: Group[];
  byPayment: Group[];
  byArea: Group[];
  topProducts: Array<{ name: string; units: number; revenue: number }>;
  coupons: Array<{ code: string; uses: number; discount: number }>;
};

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const DAY_MS = 86_400_000;
const shortDay = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const VOID_TONES = ["cancelled", "returned", "refunded"];
const PAYMENT_LABELS: Record<string, string> = { cod: "Cash on delivery", mobile: "Mobile banking", card: "Card" };
const AREA_LABELS: Record<string, string> = { dhaka: "Inside Dhaka", outside: "Outside Dhaka" };

/** Percentage change, or null when there is no comparable base to divide by. */
function delta(current: number, previous: number) {
  if (!previous) return current ? { direction: "new" as const, text: "new" } : null;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return { direction: "flat" as const, text: "no change" };
  return { direction: change > 0 ? ("up" as const) : ("down" as const), text: `${change > 0 ? "+" : ""}${change}%` };
}

function StatTile({ icon, label, value, note, change }: { icon: React.ReactNode; label: string; value: string; note: string; change: ReturnType<typeof delta> }) {
  return (
    <article className="rp-tile">
      <span className="rp-tile-icon">{icon}</span>
      <p>
        <span className="rp-tile-label">{label}</span>
        <strong>{value}</strong>
        <small>
          {change && <b className={`rp-delta rp-delta-${change.direction}`}>{change.text}</b>}
          {note}
        </small>
      </p>
    </article>
  );
}

/** Horizontal magnitude bars. One hue, because the job is size, not identity. */
function BarList({ rows, format }: { rows: Array<{ key: string; label: string; value: number; caption?: string; tone?: "void" | "done" }>; format: (value: number) => string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return <p className="rp-empty">No data in this range.</p>;
  return (
    <ul className="rp-bars">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="rp-bar-label" title={row.label}>{row.label}</span>
          <span className="rp-bar-track">
            <span className={`rp-bar-fill ${row.tone ? `rp-${row.tone}` : ""}`} style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
          </span>
          <b>{format(row.value)}</b>
          {row.caption && <small>{row.caption}</small>}
        </li>
      ))}
    </ul>
  );
}

/** Part-to-whole across two or three classes, always with visible labels. */
function SplitBar({ rows, labels }: { rows: Group[]; labels: Record<string, string> }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (!total) return <p className="rp-empty">No data in this range.</p>;
  return (
    <div className="rp-split">
      <div className="rp-split-track">
        {rows.map((row, index) => (
          <span key={row.name} className={`rp-split-part rp-series-${(index % 2) + 1}`} style={{ width: `${(row.count / total) * 100}%` }} />
        ))}
      </div>
      <ul className="rp-legend">
        {rows.map((row, index) => (
          <li key={row.name}>
            <i className={`rp-series-${(index % 2) + 1}`} />
            <span>{labels[row.name] || row.name}</span>
            <b>{bn(row.count)}</b>
            <small>{Math.round((row.count / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportsModule() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const today = localDay(new Date());
  const bounds = useMemo(() => {
    if (preset === "custom") return { from, to: to || today };
    if (preset === "all") return { from: "", to: "" };
    const span = Number(preset);
    return { from: localDay(new Date(Date.now() - (span - 1) * DAY_MS)), to: today };
  }, [preset, from, to, today]);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (bounds.from) query.set("from", bounds.from);
    if (bounds.to) query.set("to", bounds.to);
    if (preset === "all") { query.set("from", "2020-01-01"); query.set("to", today); }
    const response = await fetch(`/api/admin/reports?${query}`);
    const result = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) { setError(result.error || "Reports could not be loaded"); return; }
    setError("");
    setData(result as ReportData);
  }, [bounds.from, bounds.to, preset, today]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const sections: string[][] = [
      ["Daily"], ["Day", "Orders", "Revenue"],
      ...data.daily.map((row) => [row.day, String(row.orders), String(row.revenue)]),
      [], ["Top products"], ["Product", "Units", "Revenue"],
      ...data.topProducts.map((row) => [row.name, String(row.units), String(row.revenue)]),
      [], ["By status"], ["Status", "Orders", "Revenue"],
      ...data.byStatus.map((row) => [row.name, String(row.count), String(row.revenue)]),
    ];
    const csv = sections.map((row) => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `torun-report-${data.range.from}_${data.range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const daily = data?.daily || [];
  const maxRevenue = Math.max(1, ...daily.map((row) => row.revenue));
  const maxOrders = Math.max(1, ...daily.map((row) => row.orders));
  const active = hovered !== null ? daily[hovered] : null;
  const linePoints = daily
    .map((row, index) => `${(index / Math.max(1, daily.length - 1)) * 100},${30 - (row.orders / maxOrders) * 26}`)
    .join(" ");

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p>Business insight</p>
          <h1>Reports</h1>
        </div>
      </div>

      <div className="admin-toolbar">
        <select value={preset} onChange={(event) => setPreset(event.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
          <option value="custom">Custom range</option>
        </select>
        {preset === "custom" && (
          <>
            <input type="date" value={from} max={to || today} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
            <input type="date" value={to} min={from || undefined} max={today} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
          </>
        )}
        <button type="button" className="admin-toolbar-clear" onClick={exportCsv} disabled={!data || !data.totals.orders}>
          <Download /> Export CSV
        </button>
      </div>

      {error && <div className="admin-inline-error">{error}</div>}
      {loading && !data && <p className="rp-empty">Loading reports...</p>}

      {data && (
        <div className={`rp-root ${loading ? "rp-loading" : ""}`}>
          <div className="rp-tiles">
            <StatTile icon={<CircleDollarSign />} label="Revenue" value={money(data.totals.revenue)}
              note={`${bn(data.totals.earningOrders)} earning order${data.totals.earningOrders === 1 ? "" : "s"}`}
              change={delta(data.totals.revenue, data.previous.revenue)} />
            <StatTile icon={<BarChart3 />} label="Orders" value={bn(data.totals.orders)}
              note={`${bn(data.totals.cancelled)} cancelled`}
              change={delta(data.totals.orders, data.previous.orders)} />
            <StatTile icon={<Package />} label="Average order" value={money(data.totals.averageOrder)}
              note={`${bn(data.totals.units || 0)} units sold`}
              change={delta(data.totals.averageOrder, data.previous.averageOrder)} />
            <StatTile icon={<Truck />} label="Delivered" value={bn(data.totals.delivered)}
              note={`${money(data.totals.deliveredRevenue)} delivered`}
              change={delta(data.totals.delivered, data.previous.delivered)} />
          </div>
          <p className="rp-compare">
            {data.range.from} → {data.range.to} · compared with {data.range.previousFrom} → {data.range.previousTo}
          </p>

          <section className="admin-panel rp-panel">
            <header>
              <div><p>Trend</p><h2>Revenue per day</h2></div>
              <button type="button" className="rp-table-toggle" onClick={() => setShowTable((current) => !current)}>
                {showTable ? "Hide table" : "Show table"}
              </button>
            </header>
            <div className="rp-chart" onMouseLeave={() => setHovered(null)}>
              <div className="rp-columns">
                {daily.map((row, index) => (
                  <button
                    type="button"
                    key={row.day}
                    className={`rp-column ${hovered === index ? "on" : ""}`}
                    onMouseEnter={() => setHovered(index)}
                    onFocus={() => setHovered(index)}
                    aria-label={`${shortDay(row.day)}: ${money(row.revenue)}, ${row.orders} orders`}
                  >
                    <span style={{ height: `${Math.max(row.revenue ? 3 : 0, (row.revenue / maxRevenue) * 100)}%` }} />
                  </button>
                ))}
              </div>
              <div className="rp-axis">
                <span>{shortDay(daily[0]?.day || data.range.from)}</span>
                <span>{shortDay(daily[daily.length - 1]?.day || data.range.to)}</span>
              </div>

              <div className="rp-sub">
                <span className="rp-sub-label">Orders per day</span>
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
                  <polyline points={linePoints} vectorEffect="non-scaling-stroke" />
                  {active && hovered !== null && (
                    <circle
                      cx={(hovered / Math.max(1, daily.length - 1)) * 100}
                      cy={30 - (active.orders / maxOrders) * 26}
                      r="1.6"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>
              </div>

              {active && (
                <div className="rp-tooltip" style={{ left: `${(hovered! / Math.max(1, daily.length - 1)) * 100}%` }}>
                  <strong>{shortDay(active.day)}</strong>
                  <span>{money(active.revenue)}</span>
                  <span>{bn(active.orders)} order{active.orders === 1 ? "" : "s"}</span>
                </div>
              )}
            </div>
            {showTable && (
              <div className="admin-table-wrap rp-table">
                <table>
                  <thead><tr><th>Day</th><th>Orders</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {daily.filter((row) => row.orders).map((row) => (
                      <tr key={row.day}><td>{shortDay(row.day)}</td><td>{bn(row.orders)}</td><td>{money(row.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="rp-grid">
            <section className="admin-panel rp-panel">
              <header><div><p>Catalogue</p><h2>Top products</h2></div></header>
              <div className="rp-body">
                <BarList
                  format={money}
                  rows={data.topProducts.map((row) => ({ key: row.name, label: row.name, value: row.revenue, caption: `${bn(row.units)} units` }))}
                />
              </div>
            </section>

            <section className="admin-panel rp-panel">
              <header><div><p>Operations</p><h2>Order status</h2></div></header>
              <div className="rp-body">
                <BarList
                  format={(value) => bn(value)}
                  rows={data.byStatus.map((row) => ({ key: row.name, label: statusLabel[row.name] || row.name, value: row.count, caption: money(row.revenue), tone: VOID_TONES.includes(row.name) ? ("void" as const) : row.name === "delivered" ? ("done" as const) : undefined }))}
                />
              </div>
            </section>

            <section className="admin-panel rp-panel">
              <header><div><p>Payment</p><h2>How customers pay</h2></div></header>
              <div className="rp-body"><SplitBar rows={data.byPayment} labels={PAYMENT_LABELS} /></div>
            </section>

            <section className="admin-panel rp-panel">
              <header><div><p>Logistics</p><h2>Delivery area</h2></div></header>
              <div className="rp-body"><SplitBar rows={data.byArea} labels={AREA_LABELS} /></div>
            </section>
          </div>

          {data.coupons.length > 0 && (
            <section className="admin-panel rp-panel">
              <header><div><p>Marketing</p><h2>Coupon performance</h2></div></header>
              <div className="admin-table-wrap">
                <table>
                  <thead><tr><th>Code</th><th>Uses</th><th>Discount given</th></tr></thead>
                  <tbody>
                    {data.coupons.map((row) => (
                      <tr key={row.code}><td><strong>{row.code}</strong></td><td>{bn(row.uses)}</td><td>{money(row.discount)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
