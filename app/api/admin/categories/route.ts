import { NextRequest, NextResponse } from "next/server";
import { CATALOG, requireStaff, slugify } from "@/lib/supabase/admin-auth";

const fields = (body: Record<string, unknown>) => ({
  name_bn: String(body.name_bn || "").trim(),
  name_en: String(body.name_en || "").trim() || null,
  slug: slugify(String(body.slug || body.name_en || body.name_bn || "")),
  description: String(body.description || "").trim() || null,
  image_path: String(body.image_path || "").trim() || null,
  parent_id: body.parent_id ? String(body.parent_id) : null,
  sort_order: Number(body.sort_order || 0),
  is_active: body.is_active !== false,
  show_on_home: Boolean(body.show_on_home),
});

export async function GET() {
  const auth = await requireStaff(CATALOG);
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.from("categories").select("*,products(count)").order("sort_order");
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff(CATALOG);
  if (auth.error) return auth.error;
  const values = fields(await request.json());
  if (!values.name_bn || !values.slug) return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  const { data, error } = await auth.supabase.from("categories").insert(values).select().single();
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "category.created", entity_type: "category", entity_id: data.id, after_data: data });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireStaff(CATALOG);
  if (auth.error) return auth.error;
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Category id is required" }, { status: 400 });
  const values = fields(body);
  if (!values.name_bn || !values.slug) return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  if (values.parent_id === body.id) return NextResponse.json({ error: "A category cannot be its own parent" }, { status: 400 });
  const { data, error } = await auth.supabase.from("categories").update(values).eq("id", body.id).select().single();
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "category.updated", entity_type: "category", entity_id: body.id, after_data: data });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireStaff(CATALOG);
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Category id is required" }, { status: 400 });
  const { count } = await auth.supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) return NextResponse.json({ error: `This category still has ${count} product(s); move them first` }, { status: 409 });
  const { error } = await auth.supabase.from("categories").delete().eq("id", id);
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "category.deleted", entity_type: "category", entity_id: id });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ deleted: true, id });
}
