"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
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
import { FormEvent, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  CategoriesModule,
  CustomersModule,
  OrderDetailModal,
  PageHeading,
  PromotionsModule,
  ReviewsModule,
  money,
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
export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  grand_total: number;
  created_at: string;
  district: string;
  items: number;
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
  { id: "dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { id: "orders", label: "অর্ডার", icon: ShoppingBag },
  { id: "products", label: "পণ্য", icon: Package },
  { id: "inventory", label: "ইনভেন্টরি", icon: Boxes },
  { id: "categories", label: "ক্যাটাগরি", icon: Tags },
  { id: "customers", label: "ক্রেতা", icon: Users },
  { id: "promotions", label: "প্রমোশন", icon: Gift },
  { id: "reviews", label: "রিভিউ", icon: MessageSquareText },
  { id: "content", label: "স্টোরফ্রন্ট কনটেন্ট", icon: FileText },
  { id: "reports", label: "রিপোর্ট", icon: BarChart3 },
  { id: "settings", label: "সেটিংস", icon: Settings },
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
        notify(data.error || "পণ্য সংরক্ষণ হয়নি");
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
      notify("প্রিভিউ মোডে পণ্য আপডেট হয়েছে");
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
      notify("প্রিভিউ মোডে পণ্য যোগ হয়েছে");
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
        `“${product?.name_bn || "এই পণ্য"}” স্থায়ীভাবে মুছে ফেলতে চান? এই কাজটি ফেরানো যাবে না।`,
      )
    )
      return;
    if (configured) {
      const response = await fetch(`/api/admin/products?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        notify(data.error || "পণ্য মুছে ফেলা যায়নি");
        return;
      }
    }
    setProducts((current) => current.filter((p) => p.id !== id));
    notify("পণ্য মুছে ফেলা হয়েছে");
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
  const revenue = orders.reduce((sum, o) => sum + o.grand_total, 0);
  const pending = orders.filter((o) => o.status === "pending").length;
  const lowStock = products.filter((p) => p.stock <= 5).length;
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
            <strong>তরুণ</strong>
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
              {item.id === "orders" && pending > 0 && <i>{pending}</i>}
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
          <label>
            <Search />
            <input placeholder="অর্ডার, পণ্য বা ক্রেতা খুঁজুন..." />
          </label>
          <div>
            <Link href="/" target="_blank">
              <Eye /> স্টোর দেখুন
            </Link>
            <button>
              <Bell />
              <i>3</i>
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
                লাইভ ডেটা ও স্থায়ী পরিবর্তনের জন্য <code>.env.local</code>-এ
                Supabase credentials যোগ করে migration ও seed চালান।
              </span>
            </p>
            <Link href="/admin/login">
              Setup login <ArrowLeft />
            </Link>
          </div>
        )}
        <div className="admin-content">
          {module === "dashboard" && (
            <Dashboard
              revenue={revenue}
              pending={pending}
              lowStock={lowStock}
              orders={orders}
              products={products}
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
            <Reports orders={orders} products={products} />
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
                <p>ক্যাটালগ</p>
                <h2>
                  {editingProduct ? "পণ্য সম্পাদনা করুন" : "নতুন পণ্য যোগ করুন"}
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
                পণ্যের বাংলা নাম *
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
                বিক্রয় মূল্য *
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
                আগের মূল্য
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
                  placeholder="ঐচ্ছিক"
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
                  <option value="">নির্ধারিত নয়</option>
                  <option value="true">VAT-সহ</option>
                  <option value="false">VAT ছাড়া</option>
                </select>
              </label>
              <label>
                UOM
                <select name="uom" defaultValue={editingProduct?.uom || ""}>
                  <option value="">নির্বাচন করুন</option>
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
                  placeholder="যেমন: 500"
                  defaultValue={editingProduct?.uom_value ?? ""}
                />
              </label>
              <label>
                ক্যাটাগরি
                <select
                  name="category_id"
                  defaultValue={editingProduct?.category_id || ""}
                >
                  <option value="">ক্যাটাগরি ছাড়া</option>
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
                ওজন (গ্রাম)
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
                স্টক
                <input
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={editingProduct?.stock ?? 0}
                  disabled={Boolean(editingProduct)}
                />
              </label>
              <label>
                লো স্টক সতর্কতা
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
                    <strong>Color ও Size variants</strong>
                    <small>
                      Fashion product হলে একই পণ্যের প্রতিটি color/size
                      combination যোগ করুন।
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
                    Variant যোগ করুন
                  </button>
                </header>
                {variantRows.map((variant, index) => (
                  <div className="variant-row" key={variant.id}>
                    <span>{index + 1}</span>
                    <input
                      aria-label="Color"
                      placeholder="Color — যেমন: Black"
                      value={variant.color}
                      onChange={(event) =>
                        updateVariant(variant.id, "color", event.target.value)
                      }
                    />
                    <input
                      aria-label="Size"
                      placeholder="Size — যেমন: XL"
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
                      aria-label="Variant সরান"
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
                    কোনো variant যোগ করা হয়নি। সাধারণ পণ্যের জন্য এটি খালি
                    রাখুন।
                  </p>
                )}
              </section>
              <label className="full">
                একাধিক ছবির URL
                <textarea
                  name="image_paths"
                  rows={4}
                  placeholder={
                    "প্রতি লাইনে একটি URL দিন\nhttps://example.com/image-1.jpg\nhttps://example.com/image-2.jpg"
                  }
                  defaultValue={(
                    editingProduct?.images || [editingProduct?.image || ""]
                  )
                    .filter(Boolean)
                    .join("\n")}
                />
                <small>
                  প্রতি লাইনে একটি URL অথবা comma দিয়ে আলাদা করুন। প্রথম ছবিটি
                  cover হবে।
                </small>
              </label>
              <label className="full">
                সংক্ষিপ্ত বর্ণনা
                <textarea
                  name="short_description"
                  rows={3}
                  defaultValue={editingProduct?.short_description || ""}
                />
              </label>
              <label>
                স্ট্যাটাস
                <select
                  name="status"
                  defaultValue={editingProduct?.status || "draft"}
                >
                  <option value="draft">ড্রাফট</option>
                  <option value="published">প্রকাশিত</option>
                  <option value="archived">আর্কাইভ</option>
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
                বাতিল
              </button>
              <button disabled={saving}>
                {saving
                  ? "সংরক্ষণ হচ্ছে..."
                  : editingProduct
                    ? "পরিবর্তন সংরক্ষণ করুন"
                    : "পণ্য সংরক্ষণ করুন"}
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
  revenue,
  pending,
  lowStock,
  orders,
  products,
  changeModule,
}: {
  revenue: number;
  pending: number;
  lowStock: number;
  orders: Order[];
  products: Product[];
  changeModule: (m: string) => void;
}) {
  return (
    <>
      <PageHeading eyebrow="আজকের কার্যক্রম" title="ড্যাশবোর্ড" />
      <div className="admin-stats">
        <article>
          <span>
            <CircleDollarSign />
          </span>
          <p>
            মোট অর্ডার মূল্য<strong>{money(revenue)}</strong>
            <small>বর্তমান তালিকা</small>
          </p>
        </article>
        <article>
          <span>
            <ClipboardList />
          </span>
          <p>
            নতুন অর্ডার<strong>{pending}</strong>
            <small>প্রক্রিয়ার অপেক্ষায়</small>
          </p>
        </article>
        <article>
          <span>
            <Package />
          </span>
          <p>
            প্রকাশিত পণ্য
            <strong>
              {products.filter((p) => p.status === "published").length}
            </strong>
            <small>{products.length}টি মোট পণ্য</small>
          </p>
        </article>
        <article className={lowStock ? "warning" : ""}>
          <span>
            <AlertTriangle />
          </span>
          <p>
            লো স্টক<strong>{lowStock}</strong>
            <small>দ্রুত ব্যবস্থা নিন</small>
          </p>
        </article>
      </div>
      <div className="admin-dashboard-grid">
        <div className="admin-panel">
          <header>
            <div>
              <p>অপারেশন</p>
              <h2>সাম্প্রতিক অর্ডার</h2>
            </div>
            <button onClick={() => changeModule("orders")}>
              সব দেখুন
              <ArrowLeft />
            </button>
          </header>
          <OrderTable orders={orders.slice(0, 5)} />
        </div>
        <div className="admin-panel attention">
          <header>
            <div>
              <p>মনোযোগ প্রয়োজন</p>
              <h2>স্টোর সতর্কতা</h2>
            </div>
          </header>
          {products
            .filter((p) => p.stock <= 5)
            .map((p) => (
              <article key={p.id}>
                <span>
                  <AlertTriangle />
                </span>
                <p>
                  <strong>{p.name_bn}</strong>
                  <small>মাত্র {p.stock}টি স্টকে আছে</small>
                </p>
                <button onClick={() => changeModule("inventory")}>আপডেট</button>
              </article>
            ))}
          {!products.some((p) => p.stock <= 5) && (
            <div className="healthy">
              <ShieldCheck />
              সব ইনভেন্টরি সুস্থ আছে
            </div>
          )}
          <article>
            <span>
              <Activity />
            </span>
            <p>
              <strong>{pending}টি অর্ডার অপেক্ষায়</strong>
              <small>নিশ্চিত করা প্রয়োজন</small>
            </p>
            <button onClick={() => changeModule("orders")}>দেখুন</button>
          </article>
        </div>
      </div>
    </>
  );
}
function OrderTable({ orders, onSelect }: { orders: Order[]; onSelect?: (order: Order) => void }) {
  return (
    <div className="admin-table-wrap">
      <table>
        <thead>
          <tr>
            <th>অর্ডার</th>
            <th>ক্রেতা</th>
            <th>স্ট্যাটাস</th>
            <th>এলাকা</th>
            <th>মোট</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {!orders.length && (
            <tr>
              <td colSpan={6}>কোনো অর্ডার পাওয়া যায়নি</td>
            </tr>
          )}
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>#{o.order_number}</strong>
                <small>
                  {new Date(o.created_at).toLocaleDateString("bn-BD")}
                </small>
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
              <td>{o.district}</td>
              <td>
                <strong>{money(o.grand_total)}</strong>
                <small>{o.items}টি পণ্য</small>
              </td>
              <td>
                {onSelect && (
                  <button
                    className="table-text-button"
                    onClick={() => onSelect(o)}
                  >
                    বিস্তারিত
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
  const [selected, setSelected] = useState<Order | null>(null);
  const visible = orders.filter((order) => {
    const age = Date.now() - new Date(order.created_at).getTime();
    return (
      `${order.order_number} ${order.customer_name} ${order.customer_phone}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || order.status === status) &&
      (range === "all" ||
        (range === "today" && age < dayMs) ||
        (range === "week" && age < 7 * dayMs))
    );
  });
  return (
    <>
      <PageHeading eyebrow="অর্ডার অপারেশন" title="সব অর্ডার" />
      <div className="admin-toolbar">
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="অর্ডার, নাম বা ফোন দিয়ে খুঁজুন"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">সব স্ট্যাটাস</option>
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
          <option value="all">সব সময়</option>
          <option value="today">আজ</option>
          <option value="week">গত ৭ দিন</option>
        </select>
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
        eyebrow="ক্যাটালগ"
        title="পণ্য ব্যবস্থাপনা"
        action="নতুন পণ্য"
        onAction={add}
      />
      <div className="admin-toolbar">
        <label>
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম বা SKU দিয়ে খুঁজুন"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">সব স্ট্যাটাস</option>
          <option value="published">প্রকাশিত</option>
          <option value="draft">ড্রাফট</option>
          <option value="archived">আর্কাইভ</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">সব ক্যাটাগরি</option>
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
                <th>পণ্য</th>
                <th>SKU</th>
                <th>মূল্য</th>
                <th>স্টক</th>
                <th>স্ট্যাটাস</th>
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
                      {p.stock}
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
                        aria-label="পণ্য সম্পাদনা"
                        onClick={() => edit(p)}
                      >
                        <Pencil />
                      </button>
                      <button
                        aria-label="পণ্য মুছুন"
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
function Inventory({ rows: initialRows }: { rows: InventoryRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const visible = rows.filter(
    (row) =>
      `${row.product_name} ${row.sku} ${row.variant_title}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (availability === "all" ||
        (availability === "low" && row.stock <= row.low_stock_threshold) ||
        (availability === "healthy" && row.stock > row.low_stock_threshold)),
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const stock = Number(data.get("stock"));
    const reason = String(data.get("reason"));
    setSaving(true);
    if (isSupabaseConfigured) {
      const response = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variant_id: selected.variant_id,
          on_hand: stock,
          reason,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "স্টক আপডেট হয়নি");
        setSaving(false);
        return;
      }
    }
    setRows((current) =>
      current.map((row) =>
        row.variant_id === selected.variant_id ? { ...row, stock } : row,
      ),
    );
    setSaving(false);
    setSelected(null);
    setMessage("স্টক সফলভাবে আপডেট হয়েছে");
    window.setTimeout(() => setMessage(""), 2500);
  };
  return (
    <>
      <PageHeading eyebrow="স্টক নিয়ন্ত্রণ" title="ইনভেন্টরি" />
      <div className="admin-toolbar">
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="পণ্য, ভ্যারিয়েন্ট বা SKU দিয়ে খুঁজুন"
          />
        </label>
        <select
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
        >
          <option value="all">সব স্টক</option>
          <option value="low">লো স্টক</option>
          <option value="healthy">পর্যাপ্ত স্টক</option>
        </select>
      </div>
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>পণ্য</th>
                <th>ভ্যারিয়েন্ট</th>
                <th>SKU</th>
                <th>মোট স্টক</th>
                <th>সংরক্ষিত</th>
                <th>বিক্রয়যোগ্য</th>
                <th>অবস্থা</th>
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
                      : "একক ভ্যারিয়েন্ট"}
                  </td>
                  <td>{row.sku}</td>
                  <td>
                    <strong>{row.stock}</strong>
                  </td>
                  <td>{row.reserved}</td>
                  <td>
                    <strong>{Math.max(0, row.stock - row.reserved)}</strong>
                  </td>
                  <td>
                    <span
                      className={`admin-status ${row.stock <= row.low_stock_threshold ? "cancelled" : "published"}`}
                    >
                      {row.stock <= row.low_stock_threshold
                        ? "লো স্টক"
                        : "স্টকে আছে"}
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
                      সমন্বয়
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="inventory-empty">
              কোনো matching inventory পাওয়া যায়নি।
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
                <p>স্টক সমন্বয়</p>
                <h2>{selected.product_name}</h2>
                <small>
                  {selected.variant_title} · {selected.sku} · বর্তমানে{" "}
                  {selected.stock}টি
                </small>
              </div>
              <button type="button" onClick={() => setSelected(null)}>
                <X />
              </button>
            </header>
            <label>
              নতুন মোট স্টক
              <input
                name="stock"
                type="number"
                min={selected.reserved}
                defaultValue={selected.stock}
                required
                autoFocus
              />
              <small>Reserved stock-এর কম দেওয়া যাবে না।</small>
            </label>
            <label>
              সমন্বয়ের কারণ
              <textarea
                name="reason"
                rows={3}
                required
                placeholder="যেমন: নতুন stock received / damaged item correction"
              />
            </label>
            <footer>
              <button type="button" onClick={() => setSelected(null)}>
                বাতিল
              </button>
              <button disabled={saving}>
                {saving ? "আপডেট হচ্ছে..." : "স্টক আপডেট করুন"}
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
      <PageHeading eyebrow="ডায়নামিক স্টোরফ্রন্ট" title="হোমপেজ কনটেন্ট" />
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
  const save = async () => {
    if (!configured) {
      notify("প্রিভিউ মোডে পরিবর্তন সংরক্ষণ হয় না");
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
        content: section.content || {},
        is_active: active,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    notify(
      response.ok
        ? "কনটেন্ট সংরক্ষিত হয়েছে"
        : result.error || "কনটেন্ট সংরক্ষণ হয়নি",
    );
  };
  return (
    <article>
      <header>
        <span>{index + 1}</span>
        <div>
          <small>{String(section.section_key)}</small>
          <h3>{title || "শিরোনামহীন"}</h3>
        </div>
        <button
          type="button"
          className="content-toggle"
          aria-label="সেকশন সক্রিয়/নিষ্ক্রিয়"
          onClick={() => setActive((current) => !current)}
        >
          <i className={active ? "on" : ""} />
        </button>
      </header>
      <label>
        শিরোনাম
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        সহায়ক লেখা
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </label>
      <footer>
        <button type="button" onClick={() => window.open("/", "_blank")}>
          প্রিভিউ
        </button>
        <button type="button" disabled={saving} onClick={save}>
          {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
        </button>
      </footer>
    </article>
  );
}
function Reports({
  orders,
  products,
}: {
  orders: Order[];
  products: Product[];
}) {
  return (
    <>
      <PageHeading eyebrow="ব্যবসার অন্তর্দৃষ্টি" title="রিপোর্ট" />
      <div className="report-grid">
        <article>
          <BarChart3 />
          <p>
            <span>অর্ডার মূল্য</span>
            <strong>
              {money(orders.reduce((s, o) => s + o.grand_total, 0))}
            </strong>
            <small>{orders.length}টি অর্ডার</small>
          </p>
        </article>
        <article>
          <Package />
          <p>
            <span>ইনভেন্টরি ইউনিট</span>
            <strong>
              {products
                .reduce((s, p) => s + p.stock, 0)
                .toLocaleString("bn-BD")}
            </strong>
            <small>{products.length}টি পণ্য</small>
          </p>
        </article>
        <article>
          <Truck />
          <p>
            <span>সম্পন্ন অর্ডার</span>
            <strong>
              {orders.filter((o) => o.status === "delivered").length}
            </strong>
            <small>বর্তমান ডেটা</small>
          </p>
        </article>
      </div>
    </>
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
      setMessage("Logo upload হয়েছে। স্থায়ী করতে Update Details চাপুন।");
    } else setMessage(data.error || "Logo upload হয়নি");
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
        setMessage(data.error || "Settings সংরক্ষণ হয়নি");
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setMessage(
      configured
        ? "Company settings সংরক্ষণ হয়েছে"
        : "Preview settings আপডেট হয়েছে",
    );
    window.setTimeout(() => setMessage(""), 2500);
  };
  return (
    <>
      <PageHeading eyebrow="কনফিগারেশন" title="Company Setting" />
      {loading ? (
        <div className="admin-empty">
          <span>
            <Settings />
          </span>
          <h2>Settings লোড হচ্ছে...</h2>
        </div>
      ) : (
        <form className="company-settings" onSubmit={submit}>
          <div className="company-setting-row required">
            <label>Company Name</label>
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
            <label>Phone Number</label>
            <input
              required
              value={settings.phone}
              onChange={(e) => change("phone", e.target.value)}
            />
          </div>
          <div className="company-setting-row required">
            <label>Email Address</label>
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
            <label>Facebook Page</label>
            <input
              type="url"
              value={settings.facebook}
              onChange={(e) => change("facebook", e.target.value)}
              placeholder="https://facebook.com/yourpage"
            />
          </div>
          <div className="company-setting-row">
            <label>Instagram Profile</label>
            <input
              type="url"
              value={settings.instagram}
              onChange={(e) => change("instagram", e.target.value)}
              placeholder="https://instagram.com/yourprofile"
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
            <label>Upload Logo</label>
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
            <label>Footer</label>
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
              {saving ? "সংরক্ষণ হচ্ছে..." : "Update Details"}
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
