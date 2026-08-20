export type CartLine = { id: string; variantId?: string; quantity: number };

export type OrderVariant = { id: string; title: string | null; price: number | null; is_active: boolean };
export type OrderProduct = {
  id: string;
  slug: string;
  sku: string;
  name_bn: string;
  base_price: number;
  product_media?: Array<{ storage_path: string }> | null;
  product_variants?: OrderVariant[] | null;
};

export type OrderLine = {
  product_id: string; variant_id: string | null; product_name: string; variant_name: string | null;
  sku: string; image_path: string | null; unit_price: number; quantity: number;
  discount_total: number; line_total: number;
};

export const MAX_LINE_QUANTITY = 20;
export const shippingFor = (area: string) => (area === "dhaka" ? 70 : 120);

/**
 * Turns cart lines into order rows, priced from the chosen variant.
 * `unavailable` names the first product whose explicitly chosen variant is gone,
 * so the caller can refuse the order rather than quietly substituting another.
 */
export function buildOrderLines(cart: CartLine[], products: OrderProduct[]) {
  let unavailable = "";
  const rows: OrderLine[] = [];

  for (const item of cart) {
    const product = products.find((candidate) => candidate.slug === item.id);
    if (!product) { unavailable = unavailable || item.id; continue; }
    const active = (product.product_variants || []).filter((variant) => variant.is_active);
    const chosen = item.variantId ? active.find((variant) => variant.id === item.variantId) : undefined;
    if (item.variantId && !chosen) { unavailable = unavailable || product.name_bn; continue; }
    const variant = chosen || active[0] || product.product_variants?.[0];
    const price = Number(variant?.price ?? product.base_price);
    const quantity = Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.trunc(Number(item.quantity)) || 1));
    rows.push({
      product_id: product.id,
      variant_id: variant?.id || null,
      product_name: product.name_bn,
      variant_name: variant?.title || null,
      sku: product.sku,
      image_path: product.product_media?.[0]?.storage_path || null,
      unit_price: price,
      quantity,
      discount_total: 0,
      line_total: price * quantity,
    });
  }

  const subtotal = rows.reduce((sum, row) => sum + row.line_total, 0);
  return { rows, subtotal, unavailable };
}
