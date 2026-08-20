"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { ArrowLeft, ArrowRight, Banknote, Check, ChevronLeft, CircleCheckBig, CreditCard, Leaf, LockKeyhole, MapPin, MessageCircle, PackageCheck, ShoppingBag, Smartphone, Truck } from "lucide-react";
import { FormEvent, useState } from "react";
import { currencySymbol, useStoreSettings } from "@/lib/store-settings";
import "./checkout.css";

export default function CheckoutPage() {
  const { items, subtotal, updateQuantity, clearCart } = useCart();
  const store = useStoreSettings();
  const money = (value: number) => `${currencySymbol(store.currency)}${value.toLocaleString("bn-BD")}`;
  const supportPhone = store.phone || "+8801886494257";
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState("");
  const [couponError, setCouponError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [area, setArea] = useState("dhaka");
  const [payment, setPayment] = useState("cod");
  const [placed, setPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const delivery = area === "dhaka" ? 70 : 120;
  const total = Math.max(0, subtotal - discount) + delivery;

  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    setCheckingCoupon(true); setCouponError("");
    const response = await fetch("/api/coupons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, subtotal }) });
    const result = await response.json().catch(() => ({}));
    setCheckingCoupon(false);
    if (!response.ok) { setDiscount(0); setCouponApplied(""); setCouponError(result.error || "কুপনটি প্রয়োগ করা যায়নি"); return; }
    setDiscount(Number(result.discount) || 0);
    setCouponApplied(result.code);
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || items.length === 0) return;
    const data = new FormData(form);
    setSubmitting(true); setSubmitError("");
    let nextOrderNumber = `TM-${String(Date.now()).slice(-7)}`;
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: items.map((item) => ({ id: item.id, quantity: item.quantity })), customer_name: data.get("name"), customer_phone: data.get("phone"), customer_email: data.get("email"), address_line: data.get("address"), delivery_area: area, district: data.get("district"), thana: data.get("area"), postal_code: data.get("postcode"), landmark: data.get("landmark"), payment_method: payment, coupon_code: couponApplied || undefined, note: data.get("note") }) });
      const result = await response.json();
      if (response.ok) nextOrderNumber = result.order_number;
      else if (response.status !== 503) throw new Error(result.error || "অর্ডার সম্পন্ন হয়নি");
    } catch (error) { setSubmitting(false); setSubmitError(error instanceof Error ? error.message : "অর্ডার সম্পন্ন হয়নি"); return; }
    setSubmitting(false);
    setOrderNumber(nextOrderNumber);
    setPlaced(true);
    clearCart();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (placed) {
    return <main className="checkout-page"><header className="checkout-header"><div className="checkout-container"><CheckoutLogo /><span><LockKeyhole /> নিরাপদ চেকআউট</span></div></header><section className="order-success"><span><CircleCheckBig /></span><p className="checkout-eyebrow">অর্ডার সফল হয়েছে</p><h1>ধন্যবাদ! আপনার অর্ডারটি<br />আমরা পেয়েছি।</h1><p>অর্ডারটি নিশ্চিত করতে আমাদের প্রতিনিধি শিগগিরই আপনার সঙ্গে যোগাযোগ করবেন।</p><div><small>অর্ডার নম্বর</small><strong>{orderNumber}</strong></div><div className="success-steps"><span><Check /> অর্ডার গ্রহণ করা হয়েছে</span><span><PackageCheck /> প্যাকিংয়ের জন্য প্রস্তুত হচ্ছে</span><span><Truck /> ডেলিভারি আপডেট ফোনে পাবেন</span></div><Link href="/">হোমে ফিরে যান <ArrowLeft /></Link></section></main>;
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header"><div className="checkout-container"><CheckoutLogo /><div className="checkout-progress"><span className="done"><i><Check /></i>কার্ট</span><b /><span className="active"><i>২</i>ঠিকানা ও পেমেন্ট</span><b /><span><i>৩</i>নিশ্চিতকরণ</span></div><span className="secure"><LockKeyhole /> নিরাপদ চেকআউট</span></div></header>
      <div className="checkout-container checkout-breadcrumb"><Link href="/"><ChevronLeft /> কেনাকাটায় ফিরে যান</Link></div>

      {items.length === 0 ? <section className="checkout-empty"><span><ShoppingBag /></span><h1>আপনার কার্ট খালি</h1><p>চেকআউট করতে প্রথমে কিছু পণ্য কার্টে যোগ করুন।</p><Link href="/products">পণ্য দেখুন <ArrowRight /></Link></section> :
      <form className="checkout-grid" onSubmit={submitOrder}>
        <div className="checkout-form">
          <section className="checkout-card customer-card">
            <header><span>১</span><div><h2>যোগাযোগের তথ্য</h2><p>অর্ডার আপডেট পাঠাতে এই তথ্য ব্যবহার হবে</p></div></header>
            <div className="field-grid"><label><span>আপনার নাম *</span><input name="name" required placeholder="পুরো নাম লিখুন" autoComplete="name" /></label><label><span>মোবাইল নম্বর *</span><div className="phone-field"><b>+৮৮</b><input name="phone" required inputMode="tel" pattern="01[0-9]{9}" placeholder="০১XXXXXXXXX" autoComplete="tel" /></div><small>১১ সংখ্যার ইংরেজি ডিজিট ব্যবহার করুন</small></label></div>
          </section>

          <section className="checkout-card address-card">
            <header><span>২</span><div><h2>ডেলিভারি ঠিকানা</h2><p>যেখানে অর্ডারটি পৌঁছে দিতে হবে</p></div></header>
            <div className="area-options"><button type="button" className={area === "dhaka" ? "active" : ""} onClick={() => setArea("dhaka")}><i>{area === "dhaka" && <Check />}</i><span><strong>ঢাকা শহরের ভেতরে</strong><small>২–৩ কার্যদিবস</small></span><b>৳৭০</b></button><button type="button" className={area === "outside" ? "active" : ""} onClick={() => setArea("outside")}><i>{area === "outside" && <Check />}</i><span><strong>ঢাকার বাইরে</strong><small>৩–৫ কার্যদিবস</small></span><b>৳১২০</b></button></div>
            <div className="field-grid"><label className="full"><span>সম্পূর্ণ ঠিকানা *</span><textarea name="address" required rows={3} placeholder="বাড়ি/ফ্ল্যাট, রোড, এলাকা বা গ্রামের ঠিকানা" autoComplete="street-address" /></label><label><span>জেলা *</span><select name="district" required defaultValue=""><option value="" disabled>জেলা বেছে নিন</option><option>ঢাকা</option><option>চট্টগ্রাম</option><option>রাজশাহী</option><option>খুলনা</option><option>সিলেট</option><option>বরিশাল</option><option>রংপুর</option><option>ময়মনসিংহ</option></select></label><label><span>থানা / উপজেলা *</span><input name="area" required placeholder="থানা বা উপজেলার নাম" /></label><label><span>পোস্ট কোড</span><input name="postcode" inputMode="numeric" placeholder="যেমন: ১২০৩" autoComplete="postal-code" /></label><label><span>ল্যান্ডমার্ক</span><input name="landmark" placeholder="কাছের পরিচিত স্থান" /></label></div>
          </section>

          <section className="checkout-card payment-card">
            <header><span>৩</span><div><h2>পেমেন্ট পদ্ধতি</h2><p>আপনার সুবিধামতো পেমেন্ট করুন</p></div></header>
            <div className="payment-options"><button type="button" className={payment === "cod" ? "active" : ""} onClick={() => setPayment("cod")}><i>{payment === "cod" && <Check />}</i><span className="payment-icon"><Banknote /></span><p><strong>ক্যাশ অন ডেলিভারি</strong><small>পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন</small></p></button><button type="button" className={payment === "mobile" ? "active" : ""} onClick={() => setPayment("mobile")}><i>{payment === "mobile" && <Check />}</i><span className="payment-icon"><Smartphone /></span><p><strong>মোবাইল ব্যাংকিং</strong><small>bKash, Nagad বা Rocket</small></p></button><button type="button" className={payment === "card" ? "active" : ""} onClick={() => setPayment("card")}><i>{payment === "card" && <Check />}</i><span className="payment-icon"><CreditCard /></span><p><strong>কার্ড পেমেন্ট</strong><small>Visa, Mastercard ও স্থানীয় কার্ড</small></p></button></div>
            {payment !== "cod" && <div className="payment-note"><LockKeyhole /> পেমেন্ট গেটওয়ে সংযুক্ত হলে অর্ডার দেওয়ার পর নিরাপদ পেমেন্ট পাতায় নেওয়া হবে।</div>}
          </section>

          <section className="checkout-card note-card"><header><span>৪</span><div><h2>অর্ডার নোট <small>ঐচ্ছিক</small></h2><p>বিশেষ কোনো নির্দেশনা থাকলে জানান</p></div></header><textarea name="note" rows={3} placeholder="যেমন: বিকেল ৫টার পর ডেলিভারি করবেন" /></section>
        </div>

        <aside className="order-summary">
          <div className="order-summary-card"><header><h2>অর্ডার সামারি</h2><span>{items.length}টি পণ্য</span></header><div className="checkout-items">{items.map((item) => <article key={item.id}><div className="checkout-item-image"><Image src={item.image} alt={item.name} fill sizes="66px" /><i>{item.quantity}</i></div><div><p>{item.variant}</p><h3>{item.name}</h3><select value={item.quantity} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} aria-label={`${item.name} পরিমাণ`}>{[1,2,3,4,5].map((number) => <option key={number}>{number}</option>)}</select></div><strong>{money(item.price * item.quantity)}</strong></article>)}</div><div className="coupon"><input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="কুপন কোড" aria-label="কুপন কোড" /><button type="button" onClick={applyCoupon} disabled={checkingCoupon || !coupon.trim()}>{checkingCoupon ? "যাচাই হচ্ছে..." : "প্রয়োগ করুন"}</button></div>{couponError && <div className="checkout-submit-error">{couponError}</div>}<dl><div><dt>সাবটোটাল</dt><dd>{money(subtotal)}</dd></div>{discount > 0 && <div className="checkout-discount"><dt>ছাড় ({couponApplied})</dt><dd>−{money(discount)}</dd></div>}<div><dt>ডেলিভারি</dt><dd>{money(delivery)}</dd></div><div className="grand-total"><dt>সর্বমোট</dt><dd>{money(total)}</dd></div></dl>{submitError&&<div className="checkout-submit-error">{submitError}</div>}<button className="place-order" type="submit" disabled={submitting}>{submitting?"অর্ডার তৈরি হচ্ছে...":"অর্ডার নিশ্চিত করুন"} <span>{money(total)}</span></button><p className="terms"><LockKeyhole /> অর্ডার করার মাধ্যমে আপনি আমাদের <a href="#">শর্তাবলি</a> ও <a href="#">গোপনীয়তা নীতি</a> মেনে নিচ্ছেন।</p></div><div className="checkout-help"><MessageCircle /><p><strong>অর্ডারে সাহায্য লাগবে?</strong><small>সকাল ৯টা–রাত ১০টা</small></p><a href={`tel:${supportPhone}`}>কল করুন</a></div>
        </aside>
      </form>}
    </main>
  );
}

function CheckoutLogo() {
  return <Link className="checkout-logo" href="/"><span><Leaf /></span><strong>তরুণ</strong><small>mart</small></Link>;
}
