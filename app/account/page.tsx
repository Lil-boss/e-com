"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, Printer, CircleUserRound, Eye, EyeOff, Heart, Leaf, LockKeyhole, LogOut, MapPin, PackageCheck, Pencil, Plus, Settings, ShieldCheck, ShoppingBag, Trash2, Truck, UserRound } from "lucide-react";
import "./account.css";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { statusLabel } from "@/lib/order-status";
import { currencySymbol, useStoreSettings } from "@/lib/store-settings";

type AccountUser = { name: string; email: string; phone: string };
export type AccountOrder = { id: string; order_number: string; status: string; grand_total: number; created_at: string; order_items?: Array<{ product_name: string; quantity: number }> };
type Address = { id: string; label: string; recipient_name: string; phone: string; address_line: string; thana: string; district: string; postal_code: string | null; is_default: boolean };
const ACCOUNT_KEY = "torun-mart-account";
const DEFAULT_PHONE = "01820361645";
const DEFAULT_OTP = "123456";

export default function AccountPage() {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [tab, setTab] = useState("overview");
  const [editingProfile, setEditingProfile] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const store = useStoreSettings();
  const supportPhone = store.phone || "+8801886494257";
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [accountError, setAccountError] = useState("");

  const loadAccount = async () => {
    if (!isSupabaseConfigured) return;
    const [accountResponse, addressResponse] = await Promise.all([fetch("/api/account"), fetch("/api/account/addresses")]);
    if (!accountResponse.ok) return; // demo/OTP-only sessions keep the local dashboard
    const account = await accountResponse.json();
    setOrders(account.orders || []);
    if (account.profile?.full_name) setUser((current) => (current ? { ...current, name: account.profile.full_name, email: account.profile.email || current.email } : current));
    if (addressResponse.ok) setAddresses(await addressResponse.json());
  };

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ACCOUNT_KEY);
      if (stored) setUser(JSON.parse(stored));
    } finally { setReady(true); }
  }, []);

  useEffect(() => {
    if (user) loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(user)]);

  const saveUser = (nextUser: AccountUser) => {
    setUser(nextUser);
    window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextUser));
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const phone = String(data.get("phone") || otpPhone);
    const isDefaultAccount = phone === DEFAULT_PHONE;

    if (mode === "login" && !otpSent) {
      if (isSupabaseConfigured && !isDefaultAccount) {
        setOtpLoading(true);
        const normalized = `+88${phone}`;
        const { error } = await createClient().auth.signInWithOtp({ phone: normalized });
        setOtpLoading(false);
        if (error) { setOtpError(error.message); return; }
      }
      setOtpPhone(phone);
      setOtpSent(true);
      setOtpError("");
      return;
    }

    if (mode === "login") {
      const token = String(data.get("otp"));
      if (otpPhone === DEFAULT_PHONE) {
        if (token !== DEFAULT_OTP) {
          setOtpError("OTP সঠিক নয়। আবার চেষ্টা করুন।");
          return;
        }
      } else if (isSupabaseConfigured) {
        setOtpLoading(true);
        const { error } = await createClient().auth.verifyOtp({ phone: `+88${otpPhone}`, token, type: "sms" });
        setOtpLoading(false);
        if (error) { setOtpError("OTP সঠিক নয় বা মেয়াদ শেষ হয়েছে।"); return; }
      } else if (token !== DEFAULT_OTP) {
        setOtpError("OTP সঠিক নয়। আবার চেষ্টা করুন।");
        return;
      }
    }

    saveUser({
      name: mode === "register" ? String(data.get("name")) : phone === DEFAULT_PHONE ? "ডিফল্ট গ্রাহক" : "তরুণ মার্ট গ্রাহক",
      email: mode === "register" ? String(data.get("email") || "") : "",
      phone,
    });
  };

  const changeMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setOtpSent(false);
    setOtpPhone("");
    setOtpError("");
  };

  const logout = () => { window.localStorage.removeItem(ACCOUNT_KEY); setUser(null); setTab("overview"); };

  if (!ready) return <main className="account-page account-loading"><span /> অ্যাকাউন্ট লোড হচ্ছে...</main>;

  if (!user) return (
    <main className="account-page auth-page">
      <header className="account-header"><div className="account-container"><AccountLogo /><Link href="/"><ChevronLeft /> হোমে ফিরুন</Link></div></header>
      <section className="auth-layout">
        <div className="auth-story"><span className="auth-shape one" /><span className="auth-shape two" /><div><span className="auth-eyebrow"><ShieldCheck /> নিরাপদ সদস্য অ্যাকাউন্ট</span><h1>আপনার কেনাকাটা,<br /><em>আরও সহজ।</em></h1><p>অর্ডার ট্র্যাক করুন, পছন্দের পণ্য সংরক্ষণ করুন এবং আগের অর্ডার এক ক্লিকে আবার কিনুন।</p><ul><li><span><PackageCheck /></span><p><strong>অর্ডারের লাইভ আপডেট</strong><small>প্যাকিং থেকে ডেলিভারি পর্যন্ত</small></p></li><li><span><MapPin /></span><p><strong>ঠিকানা সংরক্ষণ</strong><small>পরের বার আরও দ্রুত চেকআউট</small></p></li><li><span><Heart /></span><p><strong>পছন্দের তালিকা</strong><small>প্রিয় পণ্যগুলো এক জায়গায়</small></p></li></ul></div>
        </div>
        <div className="auth-panel">
          <div className="auth-card">
            <AccountLogo />
            <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>লগইন</button><button className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>নতুন অ্যাকাউন্ট</button></div>
            <div className="auth-title"><h2>{mode === "login" ? (otpSent ? "OTP যাচাই করুন" : "মোবাইল দিয়ে লগইন") : "আপনার অ্যাকাউন্ট খুলুন"}</h2><p>{mode === "login" ? (otpSent ? `${otpPhone} নম্বরে পাঠানো ৬ সংখ্যার কোডটি লিখুন।` : "শুধু আপনার মোবাইল নম্বর দিয়েই লগইন করুন।") : "মাত্র এক মিনিটে তরুণ মার্টে যোগ দিন।"}</p></div>
            <form onSubmit={submitAuth}>
              {mode === "register" && <label><span>পুরো নাম *</span><input name="name" required placeholder="আপনার নাম" autoComplete="name" /></label>}
              {(!otpSent || mode === "register") && <label><span>মোবাইল নম্বর *</span><input name="phone" required pattern="01[0-9]{9}" inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="tel" defaultValue={mode === "login" ? DEFAULT_PHONE : ""} /><small>১১ সংখ্যার ইংরেজি ডিজিট ব্যবহার করুন</small></label>}
              {mode === "login" && otpSent && <><label className="otp-field"><span>৬ সংখ্যার OTP *</span><input name="otp" required pattern="[0-9]{6}" inputMode="numeric" maxLength={6} autoFocus placeholder="• • • • • •" onChange={() => setOtpError("")} />{(otpPhone === DEFAULT_PHONE || !isSupabaseConfigured) && <small>ডিফল্ট OTP: <strong>{DEFAULT_OTP}</strong></small>}</label>{otpError && <p className="otp-error">{otpError}</p>}<div className="otp-actions"><button type="button" onClick={() => { setOtpSent(false); setOtpError(""); }}>নম্বর পরিবর্তন করুন</button><button type="button" onClick={async () => { setOtpError(""); if (isSupabaseConfigured && otpPhone !== DEFAULT_PHONE) await createClient().auth.signInWithOtp({ phone: `+88${otpPhone}` }); }}>OTP আবার পাঠান</button></div></>}
              {mode === "register" && <label><span>ইমেইল ঠিকানা <small>ঐচ্ছিক</small></span><input name="email" type="email" placeholder="name@example.com" autoComplete="email" /></label>}
              {mode === "register" && <label><span>পাসওয়ার্ড *</span><div className="password-field"><input name="password" type={showPassword ? "text" : "password"} required minLength={6} placeholder="কমপক্ষে ৬ অক্ষর" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="পাসওয়ার্ড দেখুন">{showPassword ? <EyeOff /> : <Eye />}</button></div></label>}
              {mode === "register" && <label className="terms-check"><input type="checkbox" required /> <span>আমি <a href="#">শর্তাবলি</a> ও <a href="#">গোপনীয়তা নীতি</a> মেনে নিচ্ছি।</span></label>}
              <button className="auth-submit" type="submit" disabled={otpLoading}>{otpLoading ? "অপেক্ষা করুন..." : mode === "login" ? (otpSent ? "OTP যাচাই করে লগইন" : "OTP পাঠান") : "অ্যাকাউন্ট তৈরি করুন"}<ArrowRight /></button>
            </form>
            <p className="auth-switch">{mode === "login" ? "নতুন ক্রেতা?" : "আগেই অ্যাকাউন্ট আছে?"} <button onClick={() => changeMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "অ্যাকাউন্ট খুলুন" : "লগইন করুন"}</button></p>
            <div className="auth-secure"><LockKeyhole /> আপনার তথ্য নিরাপদ ও এনক্রিপ্টেড</div>
          </div>
        </div>
      </section>
    </main>
  );

  return (
    <main className="account-page dashboard-page">
      <header className="account-header"><div className="account-container"><AccountLogo /><Link href="/"><ChevronLeft /> কেনাকাটায় ফিরুন</Link></div></header>
      <div className="account-container dashboard-heading"><div><span className="account-avatar">{user.name.slice(0, 1)}</span><div><p>স্বাগতম,</p><h1>{user.name}</h1></div></div><button onClick={logout}><LogOut /> লগআউট</button></div>
      <div className="account-container dashboard-grid">
        <aside className="account-sidebar"><nav><button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><CircleUserRound /> ওভারভিউ</button><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ShoppingBag /> আমার অর্ডার <i>{orders?.length ?? 2}</i></button><button className={tab === "addresses" ? "active" : ""} onClick={() => setTab("addresses")}><MapPin /> সংরক্ষিত ঠিকানা</button><button className={tab === "wishlist" ? "active" : ""} onClick={() => setTab("wishlist")}><Heart /> পছন্দের তালিকা <i>2</i></button><button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}><Settings /> প্রোফাইল সেটিংস</button></nav><div><ShieldCheck /><p><strong>সাহায্য প্রয়োজন?</strong><small>সকাল ৯টা–রাত ১০টা</small></p><a href={`tel:${supportPhone}`}>কল করুন</a></div></aside>
        <section className="dashboard-content">
          {tab === "overview" && <><div className="overview-banner"><div><p>শুভ কেনাকাটা!</p><h2>আপনার সবকিছু<br />এক জায়গায়।</h2><Link href="/products">নতুন পণ্য দেখুন <ArrowRight /></Link></div><span><ShoppingBag /></span></div><div className="account-stats"><button onClick={() => setTab("orders")}><span><PackageCheck /></span><p><strong>{(orders?.length ?? 2).toLocaleString("bn-BD")}</strong><small>মোট অর্ডার</small></p></button><button><span><Truck /></span><p><strong>{(orders ? orders.filter((order) => ["confirmed", "processing", "packed", "shipped"].includes(order.status)).length : 1).toLocaleString("bn-BD")}</strong><small>ডেলিভারিতে</small></p></button><button onClick={() => setTab("wishlist")}><span><Heart /></span><p><strong>২</strong><small>পছন্দের পণ্য</small></p></button></div><RecentOrders orders={orders} currency={store.currency} /></>}
          {tab === "orders" && <div className="account-section"><div className="section-title"><div><p>আপনার কেনাকাটা</p><h2>আমার অর্ডার</h2></div><select><option>সব অর্ডার</option><option>চলমান</option><option>সম্পন্ন</option></select></div><RecentOrders all orders={orders} currency={store.currency} /></div>}
          {tab === "addresses" && <div className="account-section"><div className="section-title"><div><p>দ্রুত চেকআউট</p><h2>সংরক্ষিত ঠিকানা</h2></div><button onClick={() => setAddressOpen(!addressOpen)}><Plus /> নতুন ঠিকানা</button></div>{accountError && <p className="otp-error">{accountError}</p>}{addressOpen && <form className="address-form" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); if (addresses === null) { setAddressOpen(false); return; } const response = await fetch("/api/account/addresses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label: data.get("label"), recipient_name: user.name, phone: user.phone, address_line: data.get("address_line"), district: data.get("district"), thana: data.get("thana"), is_default: !addresses.length }) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setAccountError(result.error || "ঠিকানা সংরক্ষণ হয়নি"); return; } setAddresses([...addresses, result]); setAccountError(""); form.reset(); setAddressOpen(false); }}><input name="label" required placeholder="ঠিকানার নাম — যেমন: বাসা" defaultValue="বাসা" /><textarea name="address_line" required placeholder="সম্পূর্ণ ঠিকানা" rows={3} /><div><input name="district" required placeholder="জেলা" /><input name="thana" required placeholder="থানা / উপজেলা" /></div><button>ঠিকানা সংরক্ষণ করুন</button></form>}<div className="address-list">{(addresses === null ? [] : addresses).map((address) => <article key={address.id}><span><MapPin /></span><div><p><strong>{address.label}</strong>{address.is_default && <i>ডিফল্ট</i>}</p><address>{address.address_line}<br />{address.thana}, {address.district}</address><small>{address.phone}</small></div><button aria-label="ঠিকানা মুছুন" onClick={async () => { if (!window.confirm("ঠিকানাটি মুছে ফেলবেন?")) return; const response = await fetch(`/api/account/addresses?id=${address.id}`, { method: "DELETE" }); if (response.ok) setAddresses(addresses!.filter((row) => row.id !== address.id)); }}><Trash2 /></button></article>)}{addresses === null && <article><span><MapPin /></span><div><p><strong>বাসা</strong><i>ডিফল্ট</i></p><address>বারিক ভিলা, ১১/১ ফোল্ডার স্ট্রিট,<br />ওয়ারী, ঢাকা–১২০৩</address><small>{user.phone}</small></div><button><Pencil /></button></article>}{addresses !== null && !addresses.length && <p className="address-empty">এখনো কোনো ঠিকানা সংরক্ষণ করা হয়নি।</p>}</div></div>}
          {tab === "wishlist" && <div className="account-section"><div className="section-title"><div><p>পরে কিনবেন</p><h2>পছন্দের তালিকা</h2></div></div><div className="wishlist-placeholder"><Heart /><h3>আপনার পছন্দগুলো এখানে থাকবে</h3><p>যে পণ্যগুলো ভালো লাগে, হার্ট আইকনে চাপ দিয়ে সংরক্ষণ করুন।</p><Link href="/">পণ্য দেখুন <ArrowRight /></Link></div></div>}
          {tab === "profile" && <div className="account-section"><div className="section-title"><div><p>ব্যক্তিগত তথ্য</p><h2>প্রোফাইল সেটিংস</h2></div><button onClick={() => setEditingProfile(!editingProfile)}><Pencil /> {editingProfile ? "বাতিল" : "সম্পাদনা"}</button></div><form className="profile-form" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const next = { name: String(data.get("name")), email: String(data.get("email") || ""), phone: String(data.get("phone")) }; if (orders !== null) { const response = await fetch("/api/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ full_name: next.name, email: next.email }) }); if (!response.ok) { setAccountError("প্রোফাইল সংরক্ষণ হয়নি"); return; } } saveUser(next); setAccountError(""); setEditingProfile(false); }}>{accountError && <p className="otp-error">{accountError}</p>}<label><span>পুরো নাম</span><input name="name" defaultValue={user.name} disabled={!editingProfile} required /></label><label><span>ইমেইল <small>ঐচ্ছিক</small></span><input name="email" type="email" defaultValue={user.email} disabled={!editingProfile} placeholder="যোগ করা হয়নি" /></label><label><span>মোবাইল নম্বর</span><input name="phone" defaultValue={user.phone} disabled={!editingProfile} required /></label>{editingProfile && <button>পরিবর্তন সংরক্ষণ করুন</button>}</form></div>}
        </section>
      </div>
    </main>
  );
}

function AccountLogo() { return <Link className="account-logo" href="/"><span><Leaf /></span><strong>তরুণ</strong><small>mart</small></Link>; }

function RecentOrders({ all = false, orders, currency }: { all?: boolean; orders: AccountOrder[] | null; currency?: string }) {
  const symbol = currencySymbol(currency);
  const demo = [
    { id: "TM-2847163", date: "১৬ আগস্ট ২০২৬", status: "ডেলিভারিতে", total: "৳১,৪৩৫", shipped: true },
    { id: "TM-2710924", date: "২৮ জুলাই ২০২৬", status: "ডেলিভারি সম্পন্ন", total: "৳১,৭৯০", shipped: false },
  ];
  const rows = orders
    ? orders.slice(0, all ? undefined : 3).map((order) => ({
        key: order.id,
        id: order.order_number,
        date: new Date(order.created_at).toLocaleDateString("bn-BD"),
        status: statusLabel[order.status] || order.status,
        total: `${symbol}${Number(order.grand_total).toLocaleString("bn-BD")}`,
        shipped: ["confirmed", "processing", "packed", "shipped"].includes(order.status),
      }))
    : demo.map((order) => ({ ...order, key: "" }));
  return <div className="recent-orders"><header><div><p>সাম্প্রতিক</p><h2>{all ? "সব অর্ডার" : "সাম্প্রতিক অর্ডার"}</h2></div></header>{!rows.length && <p className="address-empty">আপনার কোনো অর্ডার নেই।</p>}{rows.map((order) => <article key={order.id}><span>{order.shipped ? <Truck /> : <PackageCheck />}</span><div><strong>#{order.id}</strong><small>{order.date}</small></div><p><i />{order.status}</p><strong>{order.total}</strong>{order.key && <Link className="order-invoice" href={`/invoice/${order.key}`} title="ইনভয়েস"><Printer /></Link>}</article>)}</div>;
}
