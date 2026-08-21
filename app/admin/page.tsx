import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard, type InventoryRow, type Order, type Product } from "@/components/admin-dashboard";
import "./admin.css";
import "./modal-fix.css";
import "./reports.css";

export const dynamic = "force-dynamic";

const demoProducts = [
  { id:"1",name_bn:"কালোজিরা ফুলের প্রিমিয়াম মধু",sku:"TM-HNY-500",base_price:645,status:"published",is_featured:true,stock:80,image:"https://torunmart.com/wp-content/uploads/2025/09/1000131485.png",category:"খাঁটি খাবার" },
  { id:"2",name_bn:"দাব্বাস খেজুর",sku:"TM-DATE-DB-1K",base_price:650,status:"published",is_featured:true,stock:42,image:"https://torunmart.com/wp-content/uploads/2026/02/1000014206-500x750.jpg",category:"খাঁটি খাবার" },
  { id:"3",name_bn:"দেশি গাওয়া ঘি",sku:"TM-GHEE-1K",base_price:1600,status:"published",is_featured:true,stock:4,image:"https://torunmart.com/wp-content/uploads/2026/02/35017-500x750.jpg",category:"খাঁটি খাবার" },
  { id:"4",name_bn:"সরিষার তেল — ফ্যামিলি প্যাক",sku:"TM-OIL-5L",base_price:1300,status:"draft",is_featured:false,stock:25,image:"https://torunmart.com/wp-content/uploads/2025/09/1000131497-500x750.png",category:"খাঁটি খাবার" },
];
const demoOrders = [
  { id:"1",order_number:"TM-2847163",customer_name:"আব্দুর রহিম",customer_phone:"01886494257",status:"pending",payment_status:"pending",payment_method:"cod",grand_total:1435,created_at:"2026-08-18T05:40:00Z",district:"ঢাকা",items:2 },
  { id:"2",order_number:"TM-2847159",customer_name:"আসমা আক্তার",customer_phone:"01700123456",status:"confirmed",payment_status:"authorized",payment_method:"bkash",grand_total:1790,created_at:"2026-08-18T04:15:00Z",district:"চট্টগ্রাম",items:1 },
  { id:"3",order_number:"TM-2847102",customer_name:"তৌফিক আহমেদ",customer_phone:"01900123456",status:"shipped",payment_status:"paid",payment_method:"cod",grand_total:2380,created_at:"2026-08-17T16:30:00Z",district:"রাজশাহী",items:3 },
];

export default async function AdminPage() {
  if (!isSupabaseConfigured) return <AdminDashboard configured={false} role="super_admin" products={demoProducts} orders={demoOrders} categories={[]} sections={[]} variants={demoProducts.map((p) => ({ variant_id: p.id, product_name: p.name_bn, variant_title: "Default", sku: p.sku, category: p.category, stock: p.stock, reserved: 0, low_stock_threshold: 5 }))} logoUrl="" queue={{ orders: 1, payments: 1, reviews: 0 }} />;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/admin/login");
  let { data: staff } = await supabase.from("staff_members").select("role,is_active").eq("user_id", userId).maybeSingle();
  const signedInEmail = String(claims?.claims?.email || "").toLowerCase();
  const bootstrapEmail = String(process.env.ADMIN_BOOTSTRAP_EMAIL || "").toLowerCase();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!staff && signedInEmail && signedInEmail === bootstrapEmail && supabaseUrl && secret) {
    const admin = createAdminClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: bootstrappedStaff } = await admin.from("staff_members").upsert({ user_id: userId, role: "super_admin", is_active: true }, { onConflict: "user_id" }).select("role,is_active").single();
    staff = bootstrappedStaff;
  }
  if (!staff?.is_active) redirect("/admin/login?error=forbidden");
  const [productsResult, ordersResult, categoriesResult, sectionsResult, storeResult, pendingOrders, paymentsToVerify, pendingReviews] = await Promise.all([
    supabase.from("products").select("*,product_media(storage_path,sort_order),categories(name_bn),product_variants(id,sku,title,price,attributes,inventory(on_hand,reserved,low_stock_threshold))").order("created_at",{ascending:false}),
    supabase.from("orders").select("id,order_number,customer_name,customer_phone,status,payment_status,payment_method,coupon_code,grand_total,created_at,district,area,order_items(count),shipments(courier,tracking_number)").order("created_at",{ascending:false}).limit(50),
    supabase.from("categories").select("id,name_bn,slug,is_active,show_on_home,sort_order").order("sort_order"),
    supabase.from("homepage_sections").select("section_key,section_type,title,subtitle,content,is_active,sort_order").order("sort_order"),
    supabase.from("store_settings").select("value").eq("key","store").maybeSingle(),
    // exact counts for the dashboard work queue, not derived from the 50-row slice
    supabase.from("orders").select("id",{count:"exact",head:true}).eq("status","pending"),
    supabase.from("orders").select("id",{count:"exact",head:true}).eq("payment_status","pending").neq("payment_method","cod"),
    supabase.from("reviews").select("id",{count:"exact",head:true}).eq("status","pending"),
  ]);
  const products = (productsResult.data || []).map((p: Record<string,unknown>) => { const rows=(p.product_variants as Array<{id:string;sku:string;title:string;price:number;attributes?:{color?:string|null;size?:string|null};inventory?:{on_hand?:number;reserved?:number;low_stock_threshold?:number}}>)||[]; const variant=rows[0]; return ({ ...p, variants: rows.map((row)=>({ id:row.id, sku:row.sku, title:row.title, price:Number(row.price), attributes:row.attributes||{}, stock:row.inventory?.on_hand||0 })), image: ((p.product_media as Array<{storage_path:string}>)?.[0]?.storage_path || ""), images: (p.product_media as Array<{storage_path:string}>)?.map(media=>media.storage_path) || [], category: (p.categories as {name_bn?:string})?.name_bn || "—", variant_id:variant?.id,variant_title:variant?.title,stock:variant?.inventory?.on_hand||0,reserved:variant?.inventory?.reserved||0,low_stock_threshold:variant?.inventory?.low_stock_threshold||5 }) }) as unknown as Product[];
  const variants: InventoryRow[] = (productsResult.data || []).flatMap((p: Record<string,unknown>) => {
    const category = (p.categories as {name_bn?:string})?.name_bn || "—";
    return ((p.product_variants as Array<{id:string;sku:string;title:string;attributes?:Record<string,string|null>;inventory?:{on_hand?:number;reserved?:number;low_stock_threshold?:number}}>) || []).map((variant) => ({
      variant_id: variant.id,
      product_name: String(p.name_bn),
      variant_title: [variant.attributes?.color, variant.attributes?.size].filter(Boolean).join(" / ") || variant.title,
      sku: variant.sku,
      category,
      stock: variant.inventory?.on_hand || 0,
      reserved: variant.inventory?.reserved || 0,
      low_stock_threshold: variant.inventory?.low_stock_threshold ?? 5,
    }));
  });
  const orders = (ordersResult.data || []).map((o: Record<string,unknown>) => {
    const shipment = (o.shipments as Array<{courier?:string;tracking_number?:string}>)?.[0];
    return { ...o, items: (o.order_items as Array<{count?:number}>)?.[0]?.count || 0, courier: shipment?.courier || "", tracking_number: shipment?.tracking_number || "" };
  }) as unknown as Order[];
  const storeValue = (storeResult.data?.value || {}) as Record<string, unknown>;
  const queue = { orders: pendingOrders.count || 0, payments: paymentsToVerify.count || 0, reviews: pendingReviews.count || 0 };
  return <AdminDashboard configured role={staff.role} products={products} orders={orders} categories={categoriesResult.data || []} sections={sectionsResult.data || []} variants={variants} logoUrl={String(storeValue.logo_url || "")} queue={queue} />;
}
