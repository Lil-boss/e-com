import { NextRequest, NextResponse } from "next/server";
import { ORDERS, requireStaff } from "@/lib/supabase/admin-auth";

const optionalNumber = (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value));
const optionalDate = (value: unknown) => (String(value || "").trim() ? new Date(String(value)).toISOString() : null);

function fields(body: Record<string, unknown>) {
  return {
    code: String(body.code || "").trim().toUpperCase(),
    discount_type: body.discount_type === "percentage" ? "percentage" : "fixed",
    discount_value: Number(body.discount_value || 0),
    minimum_spend: Number(body.minimum_spend || 0),
    usage_limit: optionalNumber(body.usage_limit),
    per_customer_limit: optionalNumber(body.per_customer_limit),
    starts_at: optionalDate(body.starts_at),
    ends_at: optionalDate(body.ends_at),
    is_active: body.is_active !== false,
  };
}

function invalid(values: ReturnType<typeof fields>) {
  if (!/^[A-Z0-9_-]{3,24}$/.test(values.code)) return "Code must be 3-24 uppercase letters or digits";
  if (!(values.discount_value > 0)) return "Discount amount must be greater than 0";
  if (values.discount_type === "percentage" && values.discount_value > 100) return "Percentage discount cannot exceed 100";
  if (values.starts_at && values.ends_at && values.starts_at > values.ends_at) return "Start date cannot be after the end date";
  return null;
}

export async function GET() {
  const auth = await requireStaff(ORDERS);
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: usage } = await auth.supabase.from("orders").select("coupon_code").not("coupon_code", "is", null);
  const used = (usage || []).reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.coupon_code as string]: (acc[row.coupon_code as string] || 0) + 1 }), {});
  return NextResponse.json((data || []).map((coupon) => ({ ...coupon, used_count: used[coupon.code] || 0 })));
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff(ORDERS);
  if (auth.error) return auth.error;
  const values = fields(await request.json());
  const problem = invalid(values);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const { data, error } = await auth.supabase.from("coupons").insert(values).select().single();
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "coupon.created", entity_type: "coupon", entity_id: data.id, after_data: data });
  return error ? NextResponse.json({ error: error.message.includes("duplicate") ? "That code already exists" : error.message }, { status: 400 }) : NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireStaff(ORDERS);
  if (auth.error) return auth.error;
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Coupon id is required" }, { status: 400 });
  const values = fields(body);
  const problem = invalid(values);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const { data, error } = await auth.supabase.from("coupons").update(values).eq("id", body.id).select().single();
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "coupon.updated", entity_type: "coupon", entity_id: body.id, after_data: data });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireStaff(ORDERS);
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Coupon id is required" }, { status: 400 });
  const { error } = await auth.supabase.from("coupons").delete().eq("id", id);
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "coupon.deleted", entity_type: "coupon", entity_id: id });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ deleted: true, id });
}
