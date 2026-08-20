import { NextResponse } from "next/server";
import { SUPPORT, requireStaff } from "@/lib/supabase/admin-auth";

type OrderRow = { customer_id: string | null; customer_phone: string; customer_name: string; grand_total: number; created_at: string; status: string };

// ponytail: aggregates in JS over the last 1000 orders. Move to a SQL view if the store outgrows that.
export async function GET() {
  const auth = await requireStaff(SUPPORT);
  if (auth.error) return auth.error;
  const [profiles, orders] = await Promise.all([
    auth.supabase.from("profiles").select("id,full_name,phone,email,status,created_at").order("created_at", { ascending: false }).limit(500),
    auth.supabase.from("orders").select("customer_id,customer_phone,customer_name,grand_total,created_at,status").order("created_at", { ascending: false }).limit(1000),
  ]);
  const error = profiles.error || orders.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const customers = new Map<string, { key: string; name: string; phone: string; email: string | null; registered: boolean; orders: number; spent: number; last_order: string | null }>();
  for (const profile of profiles.data || []) {
    customers.set(profile.phone || profile.id, { key: profile.phone || profile.id, name: profile.full_name || "—", phone: profile.phone || "", email: profile.email, registered: true, orders: 0, spent: 0, last_order: null });
  }
  for (const order of (orders.data || []) as OrderRow[]) {
    const key = order.customer_phone || order.customer_id || "";
    const entry = customers.get(key) || { key, name: order.customer_name, phone: order.customer_phone, email: null, registered: false, orders: 0, spent: 0, last_order: null };
    entry.orders += 1;
    if (order.status !== "cancelled") entry.spent += Number(order.grand_total);
    if (!entry.last_order || order.created_at > entry.last_order) entry.last_order = order.created_at;
    if (!entry.name || entry.name === "—") entry.name = order.customer_name;
    customers.set(key, entry);
  }
  return NextResponse.json([...customers.values()].sort((a, b) => b.spent - a.spent));
}
