import { NextRequest, NextResponse } from "next/server";
import { CATALOG, requireStaff } from "@/lib/supabase/admin-auth";

const authorizedClient = () => requireStaff(CATALOG);

export async function GET() {
  const auth = await authorizedClient();
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.from("products").select("*,categories(name_bn),product_media(storage_path,sort_order),product_variants(id,sku,title,price,inventory(on_hand,reserved,low_stock_threshold))").order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await authorizedClient();
  if (auth.error) return auth.error;
  const body = await request.json();
  const slug = String(body.slug || body.name_bn).toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\u0980-\u09ff-]/g, "");
  const optionalNumber = (value: unknown) => value === "" || value === null || value === undefined ? null : Number(value);
  const optionalText = (value: unknown) => String(value || "").trim() || null;
  const vatValue = body.price_includes_vat === "" || body.price_includes_vat === undefined ? null : body.price_includes_vat === true || body.price_includes_vat === "true";
  const { data: product, error } = await auth.supabase.from("products").insert({ name_bn: body.name_bn, name_en: body.name_en || null, slug, sku: body.sku, category_id: body.category_id || null, short_description: body.short_description || null, description: body.description || null, status: body.status || "draft", base_price: Number(body.price), compare_at_price: optionalNumber(body.compare_at_price), weight_grams: optionalNumber(body.weight_grams), uom: optionalText(body.uom), uom_value: optionalNumber(body.uom_value), discount: optionalNumber(body.discount), upc_no: optionalText(body.upc_no), ean_no: optionalText(body.ean_no), isbn_no: optionalText(body.isbn_no), part_no: optionalText(body.part_no), price_includes_vat: vatValue, is_featured: Boolean(body.is_featured), published_at: body.status === "published" ? new Date().toISOString() : null }).select().single();
  if (error || !product) return NextResponse.json({ error: error?.message || "Product creation failed" }, { status: 400 });
  const requestedVariants = Array.isArray(body.variants) ? body.variants.filter((variant: Record<string, unknown>) => variant.color || variant.size || variant.sku) : [];
  const variantInputs: Array<Record<string, any>> = requestedVariants.length ? requestedVariants.map((variant: Record<string, unknown>, index: number) => {
    const color = optionalText(variant.color);
    const size = optionalText(variant.size);
    const suffix = [color, size].filter(Boolean).join("-").replace(/\s+/g, "-").toUpperCase() || String(index + 1);
    return { product_id: product.id, sku: optionalText(variant.sku) || `${body.sku}-${suffix}`, title: [color, size].filter(Boolean).join(" / ") || `Variant ${index + 1}`, attributes: { color, size }, price: optionalNumber(variant.price) ?? Number(body.price), compare_at_price: optionalNumber(body.compare_at_price), weight_grams: optionalNumber(body.weight_grams), requested_stock: Math.max(0, Number(variant.stock || 0)) };
  }) : [{ product_id: product.id, sku: body.sku, title: body.variant_title || "Default", attributes: {}, price: Number(body.price), compare_at_price: optionalNumber(body.compare_at_price), weight_grams: optionalNumber(body.weight_grams), requested_stock: Math.max(0, Number(body.stock || 0)) }];
  const variantRows = variantInputs.map((variant) => ({ product_id: variant.product_id, sku: variant.sku, title: variant.title, attributes: variant.attributes, price: variant.price, compare_at_price: variant.compare_at_price, weight_grams: variant.weight_grams }));
  const { data: variants, error: variantError } = await auth.supabase.from("product_variants").insert(variantRows).select("id,sku");
  if (variantError || !variants?.length) {
    await auth.supabase.from("products").delete().eq("id", product.id);
    return NextResponse.json({ error: variantError?.message || "Variant creation failed" }, { status: 400 });
  }
  await auth.supabase.from("inventory").insert(variants.map((variant, index) => ({ variant_id: variant.id, on_hand: variantInputs[index].requested_stock, low_stock_threshold: Number(body.low_stock_threshold || 5) })));
  const imagePaths = (Array.isArray(body.image_paths) ? body.image_paths : String(body.image_paths || body.image_path || "").split(/[\n,]/)).map((path: unknown) => String(path).trim()).filter(Boolean);
  if (imagePaths.length) await auth.supabase.from("product_media").insert(imagePaths.map((storagePath: string, index: number) => ({ product_id: product.id, storage_path: storagePath, alt_text: body.name_bn, sort_order: index })));
  await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "product.created", entity_type: "product", entity_id: product.id, after_data: product });
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizedClient();
  if (auth.error) return auth.error;
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  const allowed = ["name_bn", "name_en", "slug", "sku", "short_description", "description", "status", "base_price", "compare_at_price", "weight_grams", "category_id", "is_featured", "seo_title", "seo_description", "uom", "uom_value", "discount", "upc_no", "ean_no", "isbn_no", "part_no", "price_includes_vat"];
  const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key)));
  for (const key of ["compare_at_price", "weight_grams", "uom_value", "discount"]) if (safeUpdates[key] === "") safeUpdates[key] = null;
  for (const key of ["category_id", "uom", "upc_no", "ean_no", "isbn_no", "part_no", "short_description", "description"]) if (safeUpdates[key] === "") safeUpdates[key] = null;
  const { data: before } = await auth.supabase.from("products").select().eq("id", id).single();
  const { data, error } = await auth.supabase.from("products").update(safeUpdates).eq("id", id).select().single();
  if (!error && Object.prototype.hasOwnProperty.call(body, "image_paths")) {
    const imagePaths = String(body.image_paths || "").split(/[\n,]/).map((path) => path.trim()).filter(Boolean);
    await auth.supabase.from("product_media").delete().eq("product_id", id);
    if (imagePaths.length) await auth.supabase.from("product_media").insert(imagePaths.map((storagePath, index) => ({ product_id: id, storage_path: storagePath, alt_text: safeUpdates.name_bn || data.name_bn, sort_order: index })));
  }
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "product.updated", entity_type: "product", entity_id: id, before_data: before, after_data: data });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await authorizedClient();
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  const { data: before } = await auth.supabase.from("products").select().eq("id", id).single();
  const { error } = await auth.supabase.from("products").delete().eq("id", id);
  if (!error) await auth.supabase.from("audit_logs").insert({ actor_id: auth.userId, action: "product.deleted", entity_type: "product", entity_id: id, before_data: before });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ deleted: true, id });
}
