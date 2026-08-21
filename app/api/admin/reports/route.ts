import { NextRequest, NextResponse } from "next/server";
import { ORDERS, requireStaff } from "@/lib/supabase/admin-auth";

/** The store's business timezone. Buckets follow Dhaka calendar days wherever staff are. */
const ZONE = "Asia/Dhaka";
const VOID_STATUSES = ["cancelled", "returned", "refunded"];
const DAY_MS = 86_400_000;

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const dhakaDay = (value: string | Date) => dayFormatter.format(new Date(value));
/** Dhaka is UTC+6 with no DST, so a local day maps to a fixed UTC instant. */
const dayStartUtc = (day: string) => new Date(`${day}T00:00:00+06:00`);
const shiftDay = (day: string, days: number) => dhakaDay(new Date(dayStartUtc(day).getTime() + days * DAY_MS));

type OrderRow = {
  id: string; status: string; payment_method: string | null; area: string | null;
  grand_total: number; discount_total: number; coupon_code: string | null; created_at: string;
};

function summarise(orders: OrderRow[]) {
  const earning = orders.filter((order) => !VOID_STATUSES.includes(order.status));
  const delivered = orders.filter((order) => order.status === "delivered");
  const revenue = earning.reduce((sum, order) => sum + Number(order.grand_total), 0);
  return {
    revenue,
    orders: orders.length,
    earningOrders: earning.length,
    averageOrder: earning.length ? Math.round(revenue / earning.length) : 0,
    delivered: delivered.length,
    deliveredRevenue: delivered.reduce((sum, order) => sum + Number(order.grand_total), 0),
    cancelled: orders.filter((order) => order.status === "cancelled").length,
    discount: earning.reduce((sum, order) => sum + Number(order.discount_total || 0), 0),
  };
}

function tally(orders: OrderRow[], key: (order: OrderRow) => string) {
  const groups = new Map<string, { count: number; revenue: number }>();
  for (const order of orders) {
    const name = key(order) || "—";
    const entry = groups.get(name) || { count: 0, revenue: 0 };
    entry.count += 1;
    if (!VOID_STATUSES.includes(order.status)) entry.revenue += Number(order.grand_total);
    groups.set(name, entry);
  }
  return [...groups.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.count - a.count);
}

export async function GET(request: NextRequest) {
  const auth = await requireStaff(ORDERS);
  if (auth.error) return auth.error;

  const params = request.nextUrl.searchParams;
  const today = dhakaDay(new Date());
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.get("to") || "") ? params.get("to")! : today;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.get("from") || "") ? params.get("from")! : shiftDay(to, -29);
  const days = Math.max(1, Math.round((dayStartUtc(to).getTime() - dayStartUtc(from).getTime()) / DAY_MS) + 1);
  // the comparison window is the same length, ending the day before `from`
  const previousTo = shiftDay(from, -1);
  const previousFrom = shiftDay(previousTo, -(days - 1));

  // ponytail: aggregation happens here over fetched rows because PostgREST has no
  // clean GROUP BY through RLS. Move to a SQL view or RPC when the row count bites.
  const columns = "id,status,payment_method,area,grand_total,discount_total,coupon_code,created_at";
  const [current, previous] = await Promise.all([
    auth.supabase.from("orders").select(columns).gte("created_at", dayStartUtc(from).toISOString()).lt("created_at", dayStartUtc(shiftDay(to, 1)).toISOString()),
    auth.supabase.from("orders").select(columns).gte("created_at", dayStartUtc(previousFrom).toISOString()).lt("created_at", dayStartUtc(from).toISOString()),
  ]);
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 400 });
  const orders = (current.data || []) as OrderRow[];

  const buckets = new Map<string, { day: string; revenue: number; orders: number }>();
  for (let index = 0; index < days; index += 1) {
    const day = shiftDay(from, index);
    buckets.set(day, { day, revenue: 0, orders: 0 });
  }
  for (const order of orders) {
    const bucket = buckets.get(dhakaDay(order.created_at));
    if (!bucket) continue;
    bucket.orders += 1;
    if (!VOID_STATUSES.includes(order.status)) bucket.revenue += Number(order.grand_total);
  }

  const { data: lines } = orders.length
    ? await auth.supabase.from("order_items").select("product_name,quantity,line_total,order_id").in("order_id", orders.filter((order) => !VOID_STATUSES.includes(order.status)).map((order) => order.id))
    : { data: [] as Array<{ product_name: string; quantity: number; line_total: number }> };
  const products = new Map<string, { name: string; units: number; revenue: number }>();
  for (const line of lines || []) {
    const entry = products.get(line.product_name) || { name: line.product_name, units: 0, revenue: 0 };
    entry.units += Number(line.quantity);
    entry.revenue += Number(line.line_total);
    products.set(line.product_name, entry);
  }

  const coupons = new Map<string, { code: string; uses: number; discount: number }>();
  for (const order of orders) {
    if (!order.coupon_code || VOID_STATUSES.includes(order.status)) continue;
    const entry = coupons.get(order.coupon_code) || { code: order.coupon_code, uses: 0, discount: 0 };
    entry.uses += 1;
    entry.discount += Number(order.discount_total || 0);
    coupons.set(order.coupon_code, entry);
  }

  return NextResponse.json({
    range: { from, to, days, previousFrom, previousTo },
    totals: { ...summarise(orders), units: (lines || []).reduce((sum, line) => sum + Number(line.quantity), 0) },
    previous: summarise((previous.data || []) as OrderRow[]),
    daily: [...buckets.values()],
    byStatus: tally(orders, (order) => order.status),
    byPayment: tally(orders, (order) => order.payment_method || "cod"),
    byArea: tally(orders, (order) => (order.area === "dhaka" ? "dhaka" : "outside")),
    topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    coupons: [...coupons.values()].sort((a, b) => b.uses - a.uses),
  });
}
