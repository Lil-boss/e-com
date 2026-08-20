"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Leaf, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "../admin.css";

export default function AdminLoginPage(){
  const router=useRouter(); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!isSupabaseConfigured){setError("Add the Supabase environment variables first.");return;}setLoading(true);const data=new FormData(event.currentTarget);const supabase=createClient();const result=await supabase.auth.signInWithPassword({email:String(data.get("email")),password:String(data.get("password"))});setLoading(false);if(result.error){setError(result.error.message);return;}router.push("/admin");router.refresh();};
  return <main className="admin-login"><div className="admin-login-card"><Link className="admin-login-logo" href="/"><span><Leaf /></span><strong>Torun</strong><small>ADMIN</small></Link><span className="admin-security"><ShieldCheck/> Secure staff access</span><h1>Admin panel</h1><p>Sign in with your staff account to manage the store.</p>{!isSupabaseConfigured&&<div className="admin-setup-note"><strong>Supabase setup required</strong><span>Copy <code>.env.example</code> to <code>.env.local</code>.</span><Link href="/admin">View preview dashboard</Link></div>}<form onSubmit={submit}><label>Staff email<input name="email" type="email" required placeholder="admin@torunmart.com"/></label><label>Password<input name="password" type="password" required minLength={6}/></label>{error&&<div className="admin-login-error">{error}</div>}<button disabled={loading}><LockKeyhole/>{loading?"Checking...":"Sign in"}<ArrowRight/></button></form><small>Only a super admin can create admin accounts.</small></div></main>;
}
