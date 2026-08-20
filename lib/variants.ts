export type VariantInput = { variant_id?: string; color?: string; size?: string; sku?: string; price?: string | number; stock?: string | number };

const text = (value: unknown) => String(value ?? "").trim() || null;

/** Turns one product-modal variant row into the product_variants columns. */
export function variantValues(row: VariantInput, index: number, product: { sku: string; base_price: number | string }) {
  const color = text(row.color);
  const size = text(row.size);
  const suffix = [color, size].filter(Boolean).join("-").replace(/\s+/g, "-").toUpperCase() || String(index + 1);
  return {
    sku: text(row.sku) || `${product.sku}-${suffix}`,
    title: [color, size].filter(Boolean).join(" / ") || "Default",
    attributes: { color, size },
    price: row.price === "" || row.price === undefined || row.price === null ? Number(product.base_price) : Number(row.price),
  };
}

export const variantStock = (row: VariantInput) => Math.max(0, Math.floor(Number(row.stock || 0)));
