"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReportsModule } from "./admin-reports";
import { INFO_PAGE_DEFAULTS, INFO_PAGE_LABELS, INFO_PAGE_SLUGS, type InfoPages } from "@/lib/info-pages";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Gift,
  LayoutDashboard,
  Leaf,
  Menu,
  MessageSquareText,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Trash2,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  CategoriesModule,
  CustomersModule,
  OrderDetailModal,
  PageHeading,
  PromotionsModule,
  ReviewsModule,
  bn,
  money,
  methodLabel,
  paymentLabel,
  statusLabel,
} from "./admin-modules";

export type ProductVariant = {
  id: string;
  sku: string;
  title: string;
  price: number;
  attributes?: { color?: string | null; size?: string | null };
  stock: number;
};
export type Product = {
  id: string;
  name_bn: string;
  sku: string;
  base_price: number;
  status: string;
  is_featured: boolean;
  stock: number;
  reserved?: number;
  low_stock_threshold?: number;
  variant_id?: string;
  variant_title?: string;
  variants?: ProductVariant[];
  image: string;
  images?: string[];
  category: string;
  slug?: string;
  compare_at_price?: number | null;
  weight_grams?: number | null;
  category_id?: string | null;
  short_description?: string | null;
  uom?: string | null;
  uom_value?: number | null;
  discount?: number | null;
  upc_no?: string | null;
  ean_no?: string | null;
  isbn_no?: string | null;
  part_no?: string | null;
  price_includes_vat?: boolean | null;
};
/** Orders that never became money, excluded from every revenue total. */
const VOID_STATUSES = ["cancelled", "returned", "refunded"];

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  coupon_code?: string | null;
  grand_total: number;
  created_at: string;
  district: string;
  area?: string;
  items: number;
  courier?: string;
  tracking_number?: string;
};
export type InventoryRow = {
  variant_id: string;
  product_name: string;
  variant_title: string;
  sku: string;
  category: string;
  stock: number;
  reserved: number;
  low_stock_threshold: number;
};
type Props = {
  configured: boolean;
  role: string;
  products: Product[];
  orders: Order[];
  categories: Array<Record<string, unknown>>;
  sections: Array<Record<string, unknown>>;
  variants: InventoryRow[];
  logoUrl: string;
  /** Exact counts for the dashboard work queue, counted server-side. */
  queue: { orders: number; payments: number; reviews: number };
};
type VariantDraft = {
  id: string;
  variant_id?: string;
  color: string;
  size: string;
  sku: string;
  price: string;
  stock: string;
};
const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "products", label: "Products", icon: Package },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "customers", label: "Customers", icon: Users },
  { id: "promotions", label: "Promotions", icon: Gift },
  { id: "reviews", label: "Reviews", icon: MessageSquareText },
  { id: "content", label: "Storefront content", icon: FileText },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];
export function AdminDashboard({
  configured,
  role,
  products: initialProducts,
  orders,
  categories,
  sections,
  variants,
  logoUrl,
  queue,
}: Props) {
  const [module, setModule] = useState("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [variantRows, setVariantRows] = useState<VariantDraft[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  /** Appends uploaded image URLs to the textarea the form already submits. */
  const uploadMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingMedia(true);
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("files", file));
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    setUploadingMedia(false);
    if (!response.ok) { notify(result.error || "Image upload failed"); return; }
    const field = document.querySelector<HTMLTextAreaElement>('textarea[name="image_paths"]');
    if (field) field.value = [field.value.trim(), ...result.urls].filter(Boolean).join("\n");
    notify(`${result.urls.length} image(s) uploaded`);
  };
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          `${p.name_bn} ${p.sku}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (statusFilter === "all" || p.status === statusFilter) &&
          (categoryFilter === "all" || p.category === categoryFilter),
      ),
    [products, search, statusFilter, categoryFilter],
  );
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };
  const createProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values: Record<string, unknown> = {
      ...Object.fromEntries(new FormData(form)),
      variants: variantRows
        .map(({ id, ...variant }) => variant)
        .filter((variant) => variant.variant_id || variant.color || variant.size || variant.sku),
    };
    const firstImage =
      String(values.image_paths || "")
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean)[0] ||
      editingProduct?.image ||
      "";
    const selectedCategory = categories.find(
      (category) => String(category.id) === String(values.category_id),
    );
    const payload = editingProduct
      ? {
          ...values,
          id: editingProduct.id,
          base_price: Number(values.price),
          category_id: values.category_id || null,
          price_includes_vat:
            values.price_includes_vat === ""
              ? null
              : values.price_includes_vat === "true",
        }
      : values;
    setSaving(true);
    if (configured) {
      const response = await fetch("/api/admin/products", {
        method: editingProduct ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        notify(data.error || "Product was not saved");
        setSaving(false);
        return;
      }
      const normalized = {
        ...data,
        variants: data.variants ?? editingProduct?.variants,
        stock: data.variants?.[0]?.stock ?? editingProduct?.stock ?? Number(values.stock || 0),
        image: firstImage,
        category: String(
          selectedCategory?.name_bn || editingProduct?.category || "—",
        ),
      };
      setProducts((current) =>
        editingProduct
          ? current.map((product) =>
              product.id === editingProduct.id
                ? { ...product, ...normalized }
                : product,
            )
          : [normalized, ...current],
      );
    } else if (editingProduct) {
      setProducts((current) =>
        current.map((product) =>
          product.id === editingProduct.id
            ? {
                ...product,
                name_bn: String(values.name_bn),
                sku: String(values.sku),
                base_price: Number(values.price),
                status: String(values.status),
                category: String(selectedCategory?.name_bn || "—"),
                image: firstImage,
              }
            : product,
        ),
      );
      notify("Product updated in preview mode");
    } else {
      setProducts((current) => [
        {
          id: crypto.randomUUID(),
          name_bn: String(values.name_bn),
          sku: String(values.sku),
          base_price: Number(values.price),
          status: String(values.status),
          is_featured: false,
          stock: Number(values.stock),
          image: firstImage,
          category: String(selectedCategory?.name_bn || "—"),
        },
        ...current,
      ]);
      notify("Product added in preview mode");
    }
    setSaving(false);
    setProductModal(false);
    setEditingProduct(null);
    setVariantRows([]);
    form.reset();
  };
  const updateVariant = (
    id: string,
    key: keyof Omit<VariantDraft, "id">,
    value: string,
  ) =>
    setVariantRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  const deleteProduct = async (id: string) => {
    const product = products.find((item) => item.id === id);
    if (
      !window.confirm(
        `Delete “${product?.name_bn || "this product"}” permanently? This cannot be undone.`,
      )
    )
      return;
    if (configured) {
      const response = await fetch(`/api/admin/products?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        notify(data.error || "Product could not be deleted");
        return;
      }
    }
    setProducts((current) => current.filter((p) => p.id !== id));
    notify("Product deleted");
  };
  const openCreate = () => {
    setEditingProduct(null);
    setVariantRows([]);
    setProductModal(true);
  };
  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setVariantRows(
      (product.variants || []).map((variant) => ({
        id: variant.id,
        variant_id: variant.id,
        color: variant.attributes?.color || "",
        size: variant.attributes?.size || "",
        sku: variant.sku,
        price: String(variant.price ?? ""),
        stock: String(variant.stock ?? 0),
      })),
    );
    setProductModal(true);
  };
  // cancelled and refunded orders were inflating the revenue tile
  const pending = orders.filter((o) => o.status === "pending").length;
  // every variant, against its own threshold, not each product's first variant
  const lowStockRows = variants
    .filter((row) => row.stock - row.reserved <= (row.low_stock_threshold ?? 5))
    .sort((a, b) => a.stock - a.reserved - (b.stock - b.reserved));
  return (
    <main className="admin-page">
      <aside className={`admin-sidebar ${sidebar ? "open" : ""}`}>
        <div className={`admin-brand ${logoUrl ? "has-company-logo" : ""}`}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Company logo"
              style={{ width: "100%", maxWidth: 184, height: 48, objectFit: "contain", objectPosition: "left center" }}
            />
          ) : (<>
            <span><Leaf /></span>
            <strong>Torun</strong>
            <small>ADMIN</small>
          </>)}
          <button onClick={() => setSidebar(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={module === item.id ? "active" : ""}
              onClick={() => {
                setModule(item.id);
                setSidebar(false);
              }}
            >
              <item.icon />
              <span>{item.label}</span>
              {item.id === "orders" && pending > 0 && <i>{bn(pending)}</i>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span>{role.slice(0, 1).toUpperCase()}</span>
          <p>
            <strong>Store Admin</strong>
            <small>{role.replace("_", " ")}</small>
          </p>
          <ChevronLeft />
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-mobile-menu"
            onClick={() => setSidebar(true)}
          >
            <Menu />
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setModule("products");
            }}
          >
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products or SKU..."
              aria-label="Search products"
            />
          </form>
          <div>
            <Link href="/" target="_blank">
              <Eye /> View store
            </Link>
            <button
              type="button"
              onClick={() => setModule("orders")}
              aria-label={`${pending} orders waiting`}
            >
              <Bell />
              {pending > 0 && <i>{bn(pending)}</i>}
            </button>
            <span>SA</span>
          </div>
        </header>
        {!configured && (
          <div className="admin-demo-banner">
            <AlertTriangle />
            <p>
              <strong>Supabase preview mode</strong>
              <span>
                For live data and permanent changes, add the Supabase credentials to{" "}
                <code>.env.local</code>, then run the migrations and seed.
              </span>
            </p>
            <Link href="/admin/login">
              Setup login <ArrowRight />
            </Link>
          </div>
        )}
        <div className="admin-content">
          {module === "dashboard" && (
            <Dashboard
              queue={queue}
              lowStockRows={lowStockRows}
              orders={orders}
              changeModule={setModule}
            />
          )}{" "}
          {module === "orders" && (
            <Orders orders={orders} configured={configured} notify={notify} />
          )}{" "}
          {module === "products" && (
            <Products
              products={filtered}
              allProducts={products}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              add={openCreate}
              edit={openEdit}
              remove={deleteProduct}
            />
          )}{" "}
          {module === "inventory" && <Inventory rows={variants} />}{" "}
          {module === "categories" && (
            <CategoriesModule configured={configured} notify={notify} />
          )}{" "}
          {module === "customers" && <CustomersModule configured={configured} />}{" "}
          {module === "promotions" && (
            <PromotionsModule configured={configured} notify={notify} />
          )}{" "}
          {module === "reviews" && (
            <ReviewsModule configured={configured} notify={notify} />
          )}{" "}
          {module === "content" && (
            <Content
              sections={sections}
              configured={configured}
              notify={notify}
            />
          )}{" "}
          {module === "reports" && (
            <ReportsModule />
          )}{" "}
          {module === "settings" && <SettingsModule configured={configured} />}
        </div>
      </section>
      {productModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => {
            setProductModal(false);
            setEditingProduct(null);
          }}
        >
          <form
            key={editingProduct?.id || "new"}
            className="admin-modal"
            onSubmit={createProduct}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <p>Catalogue</p>
                <h2>
                  {editingProduct ? "Edit product" : "Add new product"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProductModal(false);
                  setEditingProduct(null);
                }}
              >
                <X />
              </button>
            </header>
            <div className="admin-form-grid">
              <label className="full">
                Product name in Bengali *
                <input
                  name="name_bn"
                  required
                  defaultValue={editingProduct?.name_bn}
                />
              </label>
              <label>
                SKU *
                <input name="sku" required defaultValue={editingProduct?.sku} />
              </label>
              <label>
                Slug
                <input
                  name="slug"
                  placeholder="auto-generated"
                  defaultValue={editingProduct?.slug}
                />
              </label>
              <label>
                Selling price *
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={editingProduct?.base_price}
                />
              </label>
              <label>
                Compare-at price
                <input
                  name="compare_at_price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingProduct?.compare_at_price ?? ""}
                />
              </label>
              <label>
                Discount
                <input
                  name="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  defaultValue={editingProduct?.discount ?? ""}
                />
              </label>
              <label>
                VAT
                <select
                  name="price_includes_vat"
                  defaultValue={
                    editingProduct?.price_includes_vat == null
                      ? ""
                      : String(editingProduct.price_includes_vat)
                  }
                >
                  <option value="">Not specified</option>
                  <option value="true">VAT inclusive</option>
                  <option value="false">VAT exclusive</option>
                </select>
              </label>
              <label>
                UOM
                <select name="uom" defaultValue={editingProduct?.uom || ""}>
                  <option value="">Select</option>
                  <option value="piece">Piece</option>
                  <option value="pack">Pack</option>
                  <option value="kg">Kilogram</option>
                  <option value="g">Gram</option>
                  <option value="l">Litre</option>
                  <option value="ml">Millilitre</option>
                  <option value="box">Box</option>
                  <option value="set">Set</option>
                </select>
              </label>
              <label>
                UOM value
                <input
                  name="uom_value"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="e.g. 500"
                  defaultValue={editingProduct?.uom_value ?? ""}
                />
              </label>
              <label>
                Categories
                <select
                  name="category_id"
                  defaultValue={editingProduct?.category_id || ""}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option
                      key={String(category.id)}
                      value={String(category.id)}
                    >
                      {String(category.name_bn)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Weight (grams)
                <input
                  name="weight_grams"
                  type="number"
                  min="0"
                  defaultValue={editingProduct?.weight_grams ?? ""}
                />
              </label>
              <label>
                UPC No
                <input
                  name="upc_no"
                  inputMode="numeric"
                  placeholder="Universal Product Code"
                  defaultValue={editingProduct?.upc_no || ""}
                />
              </label>
              <label>
                EAN No
                <input
                  name="ean_no"
                  inputMode="numeric"
                  placeholder="European Article Number"
                  defaultValue={editingProduct?.ean_no || ""}
                />
              </label>
              <label>
                ISBN No
                <input
                  name="isbn_no"
                  placeholder="International Standard Book Number"
                  defaultValue={editingProduct?.isbn_no || ""}
                />
              </label>
              <label>
                Part No
                <input
                  name="part_no"
                  placeholder="Manufacturer Part Number"
                  defaultValue={editingProduct?.part_no || ""}
                />
              </label>
              <label>
                Stock
                <input
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={editingProduct?.stock ?? 0}
                  disabled={Boolean(editingProduct)}
                />
              </label>
              <label>
                Low stock alert
                <input
                  name="low_stock_threshold"
                  type="number"
                  min="0"
                  defaultValue="5"
                />
              </label>
              <section className="variant-builder full">
                <header>
                  <div>
                    <strong>Color and Size variants</strong>
                    <small>
                      For a fashion product, add every color/size
                      combination of the same product.
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setVariantRows((rows) => [
                        ...rows,
                        {
                          id: crypto.randomUUID(),
                          color: "",
                          size: "",
                          sku: "",
                          price: "",
                          stock: "0",
                        },
                      ])
                    }
                  >
                    <Plus />
                    Add variant
                  </button>
                </header>
                {variantRows.map((variant, index) => (
                  <div className="variant-row" key={variant.id}>
                    <span>{index + 1}</span>
                    <input
                      aria-label="Color"
                      placeholder="Color — e.g.: Black"
                      value={variant.color}
                      onChange={(event) =>
                        updateVariant(variant.id, "color", event.target.value)
                      }
                    />
                    <input
                      aria-label="Size"
                      placeholder="Size — e.g.: XL"
                      value={variant.size}
                      onChange={(event) =>
                        updateVariant(variant.id, "size", event.target.value)
                      }
                    />
                    <input
                      aria-label="Variant SKU"
                      placeholder="Variant SKU (optional)"
                      value={variant.sku}
                      onChange={(event) =>
                        updateVariant(variant.id, "sku", event.target.value)
                      }
                    />
                    <input
                      aria-label="Variant price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price (base price)"
                      value={variant.price}
                      onChange={(event) =>
                        updateVariant(variant.id, "price", event.target.value)
                      }
                    />
                    <input
                      aria-label="Variant stock"
                      type="number"
                      min="0"
                      placeholder="Stock"
                      value={variant.stock}
                      onChange={(event) =>
                        updateVariant(variant.id, "stock", event.target.value)
                      }
                    />
                    <button
                      type="button"
                      aria-label="Remove variant"
                      onClick={() =>
                        setVariantRows((rows) =>
                          rows.filter((row) => row.id !== variant.id),
                        )
                      }
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
                {!variantRows.length && (
                  <p>
                    No variants added. Leave this empty for a simple product.
                  </p>
                )}
              </section>
              <label className="full">
                Image URLs
                <textarea
                  name="image_paths"
                  rows={4}
                  placeholder={
                    "One image URL per line\nhttps://example.com/image-1.jpg\nhttps://example.com/image-2.jpg"
                  }
                  defaultValue={(
                    editingProduct?.images || [editingProduct?.image || ""]
                  )
                    .filter(Boolean)
                    .join("\n")}
                />
                <div className="media-upload">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    multiple
                    disabled={uploadingMedia}
                    onChange={(event) => uploadMedia(event.target.files)}
                  />
                  <span>{uploadingMedia ? "Uploading..." : "Upload images"}</span>
                </div>
                <small>
                  One URL per line, or comma separated. The first image is the cover.
                  Uploads are appended to the list above.
                </small>
              </label>
              <label className="full">
                Short description
                <textarea
                  name="short_description"
                  rows={3}
                  defaultValue={editingProduct?.short_description || ""}
                />
              </label>
              <label>
                Status
                <select
                  name="status"
                  defaultValue={editingProduct?.status || "draft"}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <footer>
              <button
                type="button"
                onClick={() => {
                  setProductModal(false);
                  setEditingProduct(null);
                }}
              >
                Cancel
              </button>
              <button disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingProduct
                    ? "Save changes"
                    : "Save product"}
              </button>
            </footer>
          </form>
        </div>
      )}
      {toast && (
        <div className="admin-toast">
          <ShieldCheck />
          {toast}
        </div>
      )}
    </main>
  );
}

function Dashboard({
  queue,
  lowStockRows,
  orders,
  changeModule,
}: {
  queue: { orders: number; payments: number; reviews: number };
  lowStockRows: InventoryRow[];
  orders: Order[];
  changeModule: (m: string) => void;
}) {
  const [trend, setTrend] = useState<{ daily: Array<{ day: string; revenue: number; orders: number }> } | null>(null);

  useEffect(() => {
    const day = (offset: number) => {
      const date = new Date(Date.now() + offset * 86_400_000);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    fetch(`/api/admin/reports?from=${day(-13)}&to=${day(0)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setTrend(data))
      .catch(() => undefined);
  }, []);

  const daily = trend?.daily || [];
  const today = daily[daily.length - 1];
  const yesterday = daily[daily.length - 2];
  const fortnight = daily.reduce((sum, row) => sum + row.revenue, 0);
  const max = Math.max(1, ...daily.map((row) => row.revenue));
  const spark = daily
    .map((row, index) => `${(index / Math.max(1, daily.length - 1)) * 100},${24 - (row.revenue / max) * 20}`)
    .join(" ");

  // No percentage against yesterday: today is a day in progress, so a percentage
  // comparing a partial day with a complete one always reads wrong. Yesterday's
  // actual figure is the honest reference. Reports keeps deltas, where both
  // windows are complete and chosen by the reader.
  const plural = (count: number, one: string, many: string) => `${bn(count)} ${count === 1 ? one : many}`;
  const workItems = [
    { key: "orders", count: queue.orders, label: plural(queue.orders, "order awaiting confirmation", "orders awaiting confirmation"), module: "orders", icon: <ClipboardList /> },
    { key: "payments", count: queue.payments, label: plural(queue.payments, "payment to verify", "payments to verify"), module: "orders", icon: <CircleDollarSign /> },
    { key: "reviews", count: queue.reviews, label: plural(queue.reviews, "review to moderate", "reviews to moderate"), module: "reviews", icon: <MessageSquareText /> },
    { key: "stock", count: lowStockRows.length, label: plural(lowStockRows.length, "variant low on stock", "variants low on stock"), module: "inventory", icon: <AlertTriangle /> },
  ].filter((item) => item.count > 0);
  const workTotal = workItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <PageHeading eyebrow="Today at a glance" title="Dashboard" />
      <div className="admin-stats">
        <article className="dash-revenue">
          <span><CircleDollarSign /></span>
          <p>
            Revenue so far today
            <strong>{trend ? money(today?.revenue || 0) : "—"}</strong>
            <small>{trend ? `yesterday ${money(yesterday?.revenue || 0)}` : "loading"}</small>
          </p>
          {daily.length > 1 && (
            <svg className="dash-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={spark} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
        </article>
        <article>
          <span><ClipboardList /></span>
          <p>
            Orders so far today
            <strong>{trend ? bn(today?.orders || 0) : "—"}</strong>
            <small>{trend ? `yesterday ${bn(yesterday?.orders || 0)}` : "loading"}</small>
          </p>
        </article>
        <article>
          <span><BarChart3 /></span>
          <p>
            Last 14 days
            <strong>{trend ? money(fortnight) : "—"}</strong>
            <small>{trend ? `${bn(daily.reduce((sum, row) => sum + row.orders, 0))} orders` : "loading"}</small>
          </p>
        </article>
        <article className={workTotal ? "warning" : ""}>
          <span><Activity /></span>
          <p>
            Needs you
            <strong>{bn(workTotal)}</strong>
            <small>{workTotal === 1 ? "item waiting" : workTotal ? "items waiting" : "nothing waiting"}</small>
          </p>
        </article>
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-panel">
          <header>
            <div>
              <p>Operations</p>
              <h2>Recent orders</h2>
            </div>
            <button onClick={() => changeModule("orders")}>
              View all
              <ArrowRight />
            </button>
          </header>
          <OrderTable orders={orders.slice(0, 6)} />
        </div>

        <div className="admin-panel attention">
          <header>
            <div>
              <p>Needs attention</p>
              <h2>Your work queue</h2>
            </div>
          </header>
          {workItems.map((item) => (
            <article key={item.key}>
              <span>{item.icon}</span>
              <p>
                <strong>{item.label}</strong>
                <small>{item.key === "payments" ? "Non-COD orders still unpaid" : item.key === "stock" ? "At or below their threshold" : "Waiting on you"}</small>
              </p>
              <button onClick={() => changeModule(item.module)}>Open</button>
            </article>
          ))}
          {!workItems.length && (
            <div className="healthy">
              <ShieldCheck />
              Nothing needs attention
            </div>
          )}
          {lowStockRows.length > 0 && (
            <div className="dash-lowstock">
              <strong>Lowest stock</strong>
              <ul>
                {lowStockRows.slice(0, 4).map((row) => (
                  <li key={row.variant_id}>
                    <span title={row.product_name}>{row.product_name}</span>
                    <small>{row.variant_title}</small>
                    <b className={row.stock - row.reserved <= 0 ? "out" : ""}>{bn(Math.max(0, row.stock - row.reserved))} sellable</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function OrderTable({ orders, onSelect }: { orders: Order[]; onSelect?: (order: Order) => void }) {
  const when = (value: string) => {
    const date = new Date(value);
    return `${date.toLocaleDateString("en-GB")} · ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  };
  return (
    <div className="admin-table-wrap">
      <table className="order-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Delivery</th>
            <th>Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {!orders.length && (
            <tr>
              <td colSpan={7}>No orders found</td>
            </tr>
          )}
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>#{o.order_number}</strong>
                <small>{when(o.created_at)}</small>
              </td>
              <td>
                <strong>{o.customer_name}</strong>
                <small>{o.customer_phone}</small>
              </td>
              <td>
                <span className={`admin-status ${o.status}`}>
                  {statusLabel[o.status] || o.status}
                </span>
              </td>
              <td>
                <span className={`admin-status ${o.payment_status}`}>
                  {paymentLabel[o.payment_status] || o.payment_status}
                </span>
                {o.payment_method && <small>{methodLabel[o.payment_method] || o.payment_method}</small>}
              </td>
              <td>
                <strong>{o.district}</strong>
                <small>
                  {o.courier
                    ? `${o.courier}${o.tracking_number ? ` · ${o.tracking_number}` : ""}`
                    : "No courier yet"}
                </small>
              </td>
              <td>
                <strong>{money(o.grand_total)}</strong>
                <small>
                  {bn(o.items)} item{o.items === 1 ? "" : "s"}
                  {o.coupon_code ? ` · ${o.coupon_code}` : ""}
                </small>
              </td>
              <td>
                {onSelect && (
                  <button
                    className="table-text-button"
                    onClick={() => onSelect(o)}
                  >
                    Details
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const dayMs = 86400000;
/** Local calendar day, not UTC: at +06 an early-morning order would otherwise count as yesterday. */
const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function Orders({
  orders,
  configured,
  notify,
}: {
  orders: Order[];
  configured: boolean;
  notify: (message: string) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const today = localDay(new Date());
  const weekAgo = localDay(new Date(Date.now() - 6 * dayMs));
  const inRange = (order: Order) => {
    const day = localDay(new Date(order.created_at));
    if (range === "today") return day === today;
    if (range === "week") return day >= weekAgo;
    // ISO days compare correctly as strings, and an empty bound means open-ended
    if (range === "custom") return (!from || day >= from) && (!to || day <= to);
    return true;
  };
  const visible = orders.filter((order) =>
    `${order.order_number} ${order.customer_name} ${order.customer_phone}`
      .toLowerCase()
      .includes(query.toLowerCase()) &&
    (status === "all" || order.status === status) &&
    inRange(order),
  );
  return (
    <>
      <PageHeading eyebrow="Order operations" title="All orders" />
      <div className="admin-toolbar">
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by order, name or phone"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          {[
            "pending",
            "confirmed",
            "processing",
            "packed",
            "shipped",
            "delivered",
            "cancelled",
          ].map((value) => (
            <option key={value} value={value}>
              {statusLabel[value]}
            </option>
          ))}
        </select>
        <select value={range} onChange={(event) => setRange(event.target.value)}>
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="custom">Custom range</option>
        </select>
        {range === "custom" && (
          <>
            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="From date"
            />
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(event) => setTo(event.target.value)}
              aria-label="To date"
            />
            {(from || to) && (
              <button
                type="button"
                className="admin-toolbar-clear"
                onClick={() => { setFrom(""); setTo(""); }}
              >
                Clear
              </button>
            )}
          </>
        )}
      </div>
      <div className="admin-panel">
        <OrderTable orders={visible} onSelect={setSelected} />
      </div>
      {selected && (
        <OrderDetailModal
          orderId={selected.id}
          configured={configured}
          notify={notify}
          onClose={() => setSelected(null)}
          onUpdated={() => router.refresh()}
        />
      )}
    </>
  );
}
function Products({
  products,
  allProducts,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  add,
  edit,
  remove,
}: {
  products: Product[];
  allProducts: Product[];
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  add: () => void;
  edit: (p: Product) => void;
  remove: (id: string) => void;
}) {
  const categoryNames = [
    ...new Set(allProducts.map((p) => p.category).filter(Boolean)),
  ];
  return (
    <>
      <PageHeading
        eyebrow="Catalogue"
        title="Product management"
        action="New product"
        onAction={add}
      />
      <div className="admin-toolbar">
        <label>
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          {categoryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table className="product-admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-product-cell">
                      <span>
                        {p.image && (
                          <Image src={p.image} alt="" fill sizes="48px" />
                        )}
                      </span>
                      <p>
                        <strong>{p.name_bn}</strong>
                        <small>{p.category}</small>
                      </p>
                    </div>
                  </td>
                  <td>{p.sku}</td>
                  <td>
                    <strong>{money(p.base_price)}</strong>
                  </td>
                  <td>
                    <span className={p.stock <= 5 ? "stock-low" : ""}>
                      {bn(p.stock)}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-status ${p.status}`}>
                      {statusLabel[p.status] || p.status}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        aria-label="Edit product"
                        onClick={() => edit(p)}
                      >
                        <Pencil />
                      </button>
                      <button
                        aria-label="Product Delete"
                        onClick={() => remove(p.id)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
type VariantDetail = {
  on_hand: number; reserved: number; low_stock_threshold: number; expectedReserved: number;
  holders: Array<{ order_id: string; order_number: string; status: string; customer_name: string; quantity: number }>;
  movements: Array<{ movement_type: string; quantity_delta: number; reason: string; created_at: string }>;
};

function Inventory({ rows: initialRows }: { rows: InventoryRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [detail, setDetail] = useState<VariantDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // What is actually holding this variant's stock, and what has moved recently.
  const loadDetail = useCallback(async (variantId: string) => {
    setDetail(null);
    if (!isSupabaseConfigured) return;
    const response = await fetch(`/api/admin/inventory?variant_id=${variantId}`);
    if (!response.ok) return;
    setDetail((await response.json()) as VariantDetail);
  }, []);

  useEffect(() => {
    if (selected) loadDetail(selected.variant_id);
  }, [selected, loadDetail]);

  const reconcile = async () => {
    if (!selected) return;
    setSaving(true);
    const response = await fetch("/api/admin/inventory", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ variant_id: selected.variant_id, action: "reconcile" }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setMessage(result.error || "Could not recalculate"); return; }
    setRows((current) => current.map((row) => (row.variant_id === selected.variant_id ? { ...row, reserved: result.reserved } : row)));
    setSelected((current) => (current ? { ...current, reserved: result.reserved } : current));
    setMessage(result.reconciled ? `Reserved corrected to ${result.reserved}` : "Reserved already matches open orders");
    loadDetail(selected.variant_id);
    window.setTimeout(() => setMessage(""), 3000);
  };
  const visible = rows.filter(
    (row) =>
      `${row.product_name} ${row.sku} ${row.variant_title}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (availability === "all" ||
        (availability === "low" && row.stock - row.reserved <= row.low_stock_threshold) ||
        (availability === "out" && row.stock - row.reserved <= 0) ||
        (availability === "stranded" && row.reserved > 0) ||
        (availability === "healthy" && row.stock - row.reserved > row.low_stock_threshold)),
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const stock = Number(data.get("stock"));
    const threshold = Number(data.get("threshold"));
    const reason = String(data.get("reason"));
    setSaving(true);
    if (isSupabaseConfigured) {
      const response = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variant_id: selected.variant_id,
          on_hand: stock,
          low_stock_threshold: threshold,
          reason,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "stock was not updated");
        setSaving(false);
        return;
      }
    }
    setRows((current) =>
      current.map((row) =>
        row.variant_id === selected.variant_id ? { ...row, stock, low_stock_threshold: threshold } : row,
      ),
    );
    setSaving(false);
    setSelected(null);
    setMessage("Stock updated successfully");
    window.setTimeout(() => setMessage(""), 2500);
  };
  return (
    <>
      <PageHeading eyebrow="Stock control" title="Inventory" />
      <div className="admin-toolbar">
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by product, variant or SKU"
          />
        </label>
        <select
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
        >
          <option value="all">All stock</option>
          <option value="low">Low stock</option>
          <option value="healthy">Healthy stock</option>
          <option value="out">Nothing sellable</option>
          <option value="stranded">Has reserved units</option>
        </select>
      </div>
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>SKU</th>
                <th>Total stock</th>
                <th>Reserved</th>
                <th>Sellable</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.variant_id}>
                  <td>
                    <strong>{row.product_name}</strong>
                    <small>{row.category}</small>
                  </td>
                  <td>
                    {row.variant_title && row.variant_title !== "Default"
                      ? row.variant_title
                      : "Single variant"}
                  </td>
                  <td>{row.sku}</td>
                  <td>
                    <strong>{bn(row.stock)}</strong>
                  </td>
                  <td>{bn(row.reserved)}</td>
                  <td>
                    <strong>{bn(Math.max(0, row.stock - row.reserved))}</strong>
                  </td>
                  <td>
                    <span
                      className={`admin-status ${row.stock <= row.low_stock_threshold ? "cancelled" : "published"}`}
                    >
                      {row.stock <= row.low_stock_threshold
                        ? "Low stock"
                        : "In stock"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="table-text-button"
                      onClick={() => {
                        setSelected(row);
                        setMessage("");
                      }}
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="inventory-empty">
              No matching inventory found.
            </div>
          )}
        </div>
      </div>
      {selected && (
        <div className="admin-modal-backdrop" onClick={() => setSelected(null)}>
          <form
            className="inventory-modal"
            onSubmit={submit}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>Stock adjustment</p>
                <h2>{selected.product_name}</h2>
                <small>
                  {selected.variant_title} · {selected.sku}
                </small>
              </div>
              <button type="button" onClick={() => setSelected(null)}>
                <X />
              </button>
            </header>

            <div className="inv-figures">
              <span><b>{bn(selected.stock)}</b>on hand</span>
              <span><b>{bn(selected.reserved)}</b>reserved</span>
              <span className="inv-sellable"><b>{bn(Math.max(0, selected.stock - selected.reserved))}</b>sellable</span>
            </div>

            <label>
              New total stock
              <input
                name="stock"
                type="number"
                min={selected.reserved}
                defaultValue={selected.stock}
                required
                autoFocus
              />
              <small>Cannot go below the {bn(selected.reserved)} units reserved by open orders.</small>
            </label>
            <label>
              Low stock alert at
              <input name="threshold" type="number" min={0} defaultValue={selected.low_stock_threshold} required />
              <small>This variant is flagged when sellable stock reaches this number.</small>
            </label>
            <label>
              Reason for adjustment
              <textarea
                name="reason"
                rows={2}
                required
                placeholder="e.g. new stock received / damaged item correction"
              />
            </label>

            <section className="inv-reserved">
              <h3>Why {bn(selected.reserved)} unit{selected.reserved === 1 ? " is" : "s are"} reserved</h3>
              <p>Reserved stock is held by open orders, so it is not typed in by hand. It rises when an order is placed and falls when that order is delivered or cancelled.</p>
              {!detail && <p className="inv-muted">Loading open orders...</p>}
              {detail && detail.holders.length > 0 && (
                <ul>
                  {detail.holders.map((holder) => (
                    <li key={holder.order_id}>
                      <span>#{holder.order_number}</span>
                      <small>{holder.customer_name} · {statusLabel[holder.status] || holder.status}</small>
                      <b>{bn(holder.quantity)}</b>
                    </li>
                  ))}
                </ul>
              )}
              {detail && !detail.holders.length && <p className="inv-muted">No open order is holding this variant.</p>}
              {detail && detail.expectedReserved !== selected.reserved && (
                <div className="inv-mismatch">
                  <AlertTriangle />
                  <p>
                    <strong>Reserved says {bn(selected.reserved)}, open orders account for {bn(detail.expectedReserved)}.</strong>
                    <small>{bn(Math.abs(selected.reserved - detail.expectedReserved))} unit(s) are stranded and cannot be sold.</small>
                  </p>
                  <button type="button" disabled={saving} onClick={reconcile}>Recalculate</button>
                </div>
              )}
            </section>

            {detail && detail.movements.length > 0 && (
              <section className="inv-movements">
                <h3>Recent movements</h3>
                <ul>
                  {detail.movements.map((movement, index) => (
                    <li key={index}>
                      <span>{movement.movement_type.replace(/_/g, " ")}</span>
                      <b className={movement.quantity_delta < 0 ? "down" : movement.quantity_delta > 0 ? "up" : ""}>
                        {movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta || "—"}
                      </b>
                      <small>{movement.reason}</small>
                      <time>{new Date(movement.created_at).toLocaleDateString("en-GB")}</time>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <footer>
              <button type="button" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button disabled={saving}>
                {saving ? "Updating..." : "Update stock"}
              </button>
            </footer>
          </form>
        </div>
      )}
      {message && (
        <div className="admin-toast">
          <ShieldCheck />
          {message}
        </div>
      )}
    </>
  );
}
function Content({
  sections,
  configured,
  notify,
}: {
  sections: Array<Record<string, unknown>>;
  configured: boolean;
  notify: (m: string) => void;
}) {
  const data = sections.length
    ? sections
    : [
        {
          section_key: "hero",
          title: "বিশ্বস্ত পণ্য, সহজ কেনাকাটা।",
          subtitle: "প্রকৃতির কাছ থেকে, আপনার পরিবারের জন্য",
          is_active: true,
        },
        {
          section_key: "trust",
          title: "কেন তরুণ মার্ট",
          subtitle: "বিশ্বাসের কারণ",
          is_active: true,
        },
        {
          section_key: "seasonal",
          title: "বাগান থেকে সোজা আপনার টেবিলে",
          subtitle: "মৌসুমি আয়োজন",
          is_active: true,
        },
      ];
  return (
    <>
      <PageHeading eyebrow="Dynamic storefront" title="Homepage content" />
      <div className="content-admin-grid">
        {data.map((section, i) => (
          <ContentCard
            key={String(section.section_key)}
            index={i}
            section={section}
            configured={configured}
            notify={notify}
          />
        ))}
      </div>
      <InfoPagesEditor configured={configured} notify={notify} />
    </>
  );
}

/** Terms, privacy, returns and FAQ, stored together under the "pages" settings key. */
function InfoPagesEditor({ configured, notify }: { configured: boolean; notify: (message: string) => void }) {
  const [pages, setPages] = useState<InfoPages>(INFO_PAGE_DEFAULTS);
  const [saving, setSaving] = useState("");

  useEffect(() => {
    if (!configured) return;
    fetch("/api/admin/settings?key=pages")
      .then((response) => response.json())
      .then((saved: InfoPages) => {
        if (saved && !("error" in saved)) {
          setPages((current) => ({ ...current, ...Object.fromEntries(Object.entries(saved).filter(([, page]) => page?.body)) }));
        }
      })
      .catch(() => undefined);
  }, [configured]);

  const save = async (slug: string) => {
    if (!configured) { notify("Changes are not saved in preview mode"); return; }
    setSaving(slug);
    const response = await fetch("/api/admin/settings?key=pages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pages),
    });
    const result = await response.json().catch(() => ({}));
    setSaving("");
    notify(response.ok ? `${INFO_PAGE_LABELS[slug]} saved` : result.error || "Page was not saved");
  };

  return (
    <>
      <PageHeading eyebrow="Storefront" title="Information pages" />
      <div className="content-admin-grid">
        {INFO_PAGE_SLUGS.map((slug, index) => (
          <article key={slug}>
            <header>
              <span>{index + 1}</span>
              <div>
                <small>/page/{slug}</small>
                <h3>{pages[slug]?.title || INFO_PAGE_LABELS[slug]}</h3>
              </div>
            </header>
            <label>
              Title
              <input
                value={pages[slug]?.title || ""}
                onChange={(event) => setPages((current) => ({ ...current, [slug]: { ...current[slug], title: event.target.value } }))}
              />
            </label>
            <label>
              Content
              <textarea
                rows={7}
                value={pages[slug]?.body || ""}
                onChange={(event) => setPages((current) => ({ ...current, [slug]: { ...current[slug], body: event.target.value } }))}
              />
            </label>
            <footer>
              <button type="button" onClick={() => window.open(`/page/${slug}`, "_blank")}>Preview</button>
              <button type="button" disabled={saving === slug} onClick={() => save(slug)}>{saving === slug ? "Saving..." : "Save"}</button>
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}
function ContentCard({
  section,
  index,
  configured,
  notify,
}: {
  section: Record<string, unknown>;
  index: number;
  configured: boolean;
  notify: (m: string) => void;
}) {
  const [title, setTitle] = useState(String(section.title || ""));
  const [subtitle, setSubtitle] = useState(String(section.subtitle || ""));
  const [active, setActive] = useState(section.is_active !== false);
  const [saving, setSaving] = useState(false);
  const sectionKey = String(section.section_key);
  const initialContent = (section.content || {}) as { slides?: Array<Record<string, string>> } & Record<string, unknown>;
  const [slides, setSlides] = useState<Array<Record<string, string>>>(initialContent.slides || []);
  const [campaign, setCampaign] = useState<Record<string, unknown>>(initialContent);
  const editSlide = (index: number, field: string, value: string) =>
    setSlides(slides.map((slide, i) => (i === index ? { ...slide, [field]: value } : slide)));
  const save = async () => {
    if (!configured) {
      notify("Changes are not saved in preview mode");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        section_key: section.section_key,
        title,
        subtitle,
        // the section's own JSON, edited above rather than round-tripped untouched
        content: sectionKey === "hero" ? { ...initialContent, slides } : sectionKey === "seasonal" ? campaign : initialContent,
        is_active: active,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    notify(
      response.ok
        ? "Content saved"
        : result.error || "Content was not saved",
    );
  };
  return (
    <article>
      <header>
        <span>{index + 1}</span>
        <div>
          <small>{String(section.section_key)}</small>
          <h3>{title || "Untitled"}</h3>
        </div>
        <button
          type="button"
          className="content-toggle"
          aria-label="Toggle section"
          onClick={() => setActive((current) => !current)}
        >
          <i className={active ? "on" : ""} />
        </button>
      </header>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Subtitle
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </label>
      {sectionKey === "hero" && (
        <div className="content-slides">
          <strong>Slides</strong>
          {slides.map((slide, slideIndex) => (
            <div className="content-slide" key={slideIndex}>
              <span>{slideIndex + 1}</span>
              <input value={slide.name || ""} placeholder="Product name" onChange={(e) => editSlide(slideIndex, "name", e.target.value)} />
              <input value={slide.price || ""} placeholder="Price line" onChange={(e) => editSlide(slideIndex, "price", e.target.value)} />
              <input value={slide.eyebrow || ""} placeholder="Eyebrow" onChange={(e) => editSlide(slideIndex, "eyebrow", e.target.value)} />
              <input value={slide.image || ""} placeholder="Image URL" onChange={(e) => editSlide(slideIndex, "image", e.target.value)} />
              <button type="button" onClick={() => setSlides(slides.filter((_, i) => i !== slideIndex))} aria-label="Remove slide"><Trash2 /></button>
            </div>
          ))}
          <button type="button" className="content-add" onClick={() => setSlides([...slides, { name: "", price: "", eyebrow: "", image: "" }])}>
            <Plus /> Add slide
          </button>
        </div>
      )}
      {sectionKey === "seasonal" && (
        <div className="content-slides">
          <strong>Campaign</strong>
          {(["description", "image", "price", "oldPrice", "cta"] as const).map((field) => (
            <label key={field}>
              {field}
              <input value={String(campaign[field] ?? "")} onChange={(e) => setCampaign({ ...campaign, [field]: e.target.value })} />
            </label>
          ))}
        </div>
      )}
      <footer>
        <button type="button" onClick={() => window.open("/", "_blank")}>
          Preview
        </button>
        <button type="button" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save"}
        </button>
      </footer>
    </article>
  );
}
function SettingsModule({ configured }: { configured: boolean }) {
  const defaults = {
    name: "তরুণ মার্ট",
    tagline: "বিশ্বস্ত পণ্য, সহজ কেনাকাটা।",
    address: "",
    phone: "+8801886494257",
    email: "admin@torunmart.com",
    currency: "BDT",
    website: "",
    facebook: "",
    instagram: "",
    bkash_number: "",
    nagad_number: "",
    bin: "",
    mushak: "",
    logo_url: "",
    footer: "© ২০২৬ তরুণ মার্ট। সর্বস্বত্ব সংরক্ষিত।",
  };
  const [settings, setSettings] = useState<Record<string, string>>(defaults);
  const [loading, setLoading] = useState(configured);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  useEffect(() => {
    if (!configured) return;
    fetch("/api/admin/settings")
      .then((response) => response.json())
      .then((data) => {
        if (!data.error) {
          setSettings((current) => ({ ...current, ...data }));
          setLogoPreview(String(data.logo_url || ""));
        }
      })
      .finally(() => setLoading(false));
  }, [configured]);
  const change = (key: string, value: string) =>
    setSettings((current) => ({ ...current, [key]: value }));
  const uploadLogo = async (file?: File) => {
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setLogoPreview(localPreview);
    if (!configured) {
      setSettings((current) => ({
        ...current,
        logo_url: localPreview,
      }));
      return;
    }
    setSaving(true);
    const form = new FormData();
    form.append("logo", file);
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      body: form,
    });
    const data = await response.json();
    setSaving(false);
    if (response.ok) {
      change("logo_url", data.url);
      setLogoPreview(data.url);
      setMessage("Logo uploaded. Save details to make it permanent.");
    } else setMessage(data.error || "Logo upload failed");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    if (configured) {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Settings were not saved");
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setMessage(
      configured
        ? "Company settings saved"
        : "Preview settings updated",
    );
    window.setTimeout(() => setMessage(""), 2500);
  };
  return (
    <>
      <PageHeading eyebrow="Configuration" title="Company settings" />
      {loading ? (
        <div className="admin-empty">
          <span>
            <Settings />
          </span>
          <h2>Loading settings...</h2>
        </div>
      ) : (
        <form className="company-settings" onSubmit={submit}>
          <div className="company-setting-row required">
            <label>Company name</label>
            <input
              required
              value={settings.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </div>
          <div className="company-setting-row required">
            <label>Tagline</label>
            <input
              required
              value={settings.tagline}
              onChange={(e) => change("tagline", e.target.value)}
            />
          </div>
          <div className="company-setting-row required">
            <label>Address</label>
            <input
              required
              value={settings.address}
              onChange={(e) => change("address", e.target.value)}
              placeholder="House, road, area, city"
            />
          </div>
          <div className="company-setting-row required">
            <label>Phone number</label>
            <input
              required
              value={settings.phone}
              onChange={(e) => change("phone", e.target.value)}
            />
          </div>
          <div className="company-setting-row required">
            <label>Email address</label>
            <input
              required
              type="email"
              value={settings.email}
              onChange={(e) => change("email", e.target.value)}
            />
          </div>
          <div className="company-setting-row required">
            <label>Currency</label>
            <select
              required
              value={settings.currency}
              onChange={(e) => change("currency", e.target.value)}
            >
              <option value="BDT">৳ BDT — Bangladeshi Taka</option>
              <option value="USD">$ USD — US Dollar</option>
            </select>
          </div>
          <div className="company-setting-row">
            <label>Website</label>
            <input
              type="url"
              value={settings.website}
              onChange={(e) => change("website", e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="company-setting-row">
            <label>Facebook page</label>
            <input
              type="url"
              value={settings.facebook}
              onChange={(e) => change("facebook", e.target.value)}
              placeholder="https://facebook.com/yourpage"
            />
          </div>
          <div className="company-setting-row">
            <label>Instagram profile</label>
            <input
              type="url"
              value={settings.instagram}
              onChange={(e) => change("instagram", e.target.value)}
              placeholder="https://instagram.com/yourprofile"
            />
          </div>
          <div className="company-setting-row">
            <label>bKash number</label>
            <input
              value={settings.bkash_number}
              onChange={(e) => change("bkash_number", e.target.value)}
              placeholder="01XXXXXXXXX (shown at checkout)"
            />
          </div>
          <div className="company-setting-row">
            <label>Nagad number</label>
            <input
              value={settings.nagad_number}
              onChange={(e) => change("nagad_number", e.target.value)}
              placeholder="01XXXXXXXXX (shown at checkout)"
            />
          </div>
          <div className="company-setting-row">
            <label>BIN</label>
            <input
              value={settings.bin}
              onChange={(e) => change("bin", e.target.value)}
              placeholder="Business Identification Number"
            />
          </div>
          <div className="company-setting-row">
            <label>Mushak</label>
            <input
              value={settings.mushak}
              onChange={(e) => change("mushak", e.target.value)}
              placeholder="Mushak registration number"
            />
          </div>
          <div className="company-setting-row logo-row">
            <label>Upload logo</label>
            <div className="logo-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => uploadLogo(e.target.files?.[0])}
              />
              {logoPreview || settings.logo_url ? (
                // A native image supports both instant blob previews and Supabase public URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview || settings.logo_url}
                  alt="Company logo preview"
                />
              ) : (
                <>
                  <Upload />
                  <span>Upload logo</span>
                  <small>PNG, JPG, WEBP or SVG · Max 2 MB</small>
                </>
              )}
            </div>
          </div>
          <div className="company-setting-row required footer-row">
            <label>Footer text</label>
            <textarea
              required
              rows={5}
              value={settings.footer}
              onChange={(e) => change("footer", e.target.value)}
            />
          </div>
          <footer>
            <div className={`backend-status ${configured ? "connected" : ""}`}>
              <span />
              <p>
                <strong>
                  {configured ? "Supabase connected" : "Preview mode"}
                </strong>
                <small>
                  {configured
                    ? "Changes save to the live storefront"
                    : "Connect Supabase for permanent settings"}
                </small>
              </p>
            </div>
            <button disabled={saving}>
              {saving ? "Saving..." : "Save details"}
            </button>
          </footer>
        </form>
      )}
      {message && (
        <div className="admin-toast">
          <ShieldCheck />
          {message}
        </div>
      )}
    </>
  );
}
