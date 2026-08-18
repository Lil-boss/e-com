"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Leaf, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "../admin.css";

export default function AdminLoginPage(){
  const router=useRouter(); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!isSupabaseConfigured){setError("প্রথমে Supabase environment variables যোগ করুন।");return;}setLoading(true);const data=new FormData(event.currentTarget);const supabase=createClient();const result=await supabase.auth.signInWithPassword({email:String(data.get("email")),password:String(data.get("password"))});setLoading(false);if(result.error){setError(result.error.message);return;}router.push("/admin");router.refresh();};
  return <main className="admin-login"><div className="admin-login-card"><Link className="admin-login-logo" href="/"><span><Leaf /></span><strong>তরুণ</strong><small>ADMIN</small></Link><span className="admin-security"><ShieldCheck/> সুরক্ষিত স্টাফ প্রবেশ</span><h1>অ্যাডমিন প্যানেল</h1><p>স্টোর পরিচালনা করতে আপনার স্টাফ অ্যাকাউন্টে লগইন করুন।</p>{!isSupabaseConfigured&&<div className="admin-setup-note"><strong>Supabase setup প্রয়োজন</strong><span><code>.env.example</code> কপি করে <code>.env.local</code> তৈরি করুন।</span><Link href="/admin">প্রিভিউ ড্যাশবোর্ড দেখুন</Link></div>}<form onSubmit={submit}><label>স্টাফ ইমেইল<input name="email" type="email" required placeholder="admin@torunmart.com"/></label><label>পাসওয়ার্ড<input name="password" type="password" required minLength={6}/></label>{error&&<div className="admin-login-error">{error}</div>}<button disabled={loading}><LockKeyhole/>{loading?"যাচাই হচ্ছে...":"লগইন করুন"}<ArrowLeft/></button></form><small>অ্যাডমিন অ্যাকাউন্ট শুধুমাত্র super admin তৈরি করতে পারবেন।</small></div></main>;
}
