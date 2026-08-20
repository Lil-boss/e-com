import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "./config";
import { createClient } from "./server";

type Denied = { error: NextResponse; supabase?: undefined; userId?: undefined; role?: undefined };
type Allowed = { error?: undefined; supabase: Awaited<ReturnType<typeof createClient>>; userId: string; role: string };

/** Shared gate for every /api/admin route: Supabase session + active staff record. */
export async function requireStaff(roles: string[]): Promise<Denied | Allowed> {
  if (!isSupabaseConfigured) return { error: NextResponse.json({ error: "Supabase is not configured" }, { status: 503 }) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: staff } = await supabase.from("staff_members").select("role,is_active").eq("user_id", userId).maybeSingle();
  if (!staff?.is_active || !roles.includes(staff.role)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { supabase, userId, role: staff.role };
}

export const CATALOG = ["super_admin", "admin", "catalog_manager"];
export const ORDERS = ["super_admin", "admin", "order_manager"];
export const SUPPORT = ["super_admin", "admin", "catalog_manager", "support_agent"];
export const OWNER = ["super_admin", "admin"];

export const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9ঀ-৿-]/g, "");
