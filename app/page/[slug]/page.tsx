import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { INFO_PAGE_DEFAULTS, INFO_PAGE_SLUGS, type InfoPage, type InfoPages } from "@/lib/info-pages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import "./info.css";

async function load(slug: string): Promise<InfoPage | null> {
  if (!INFO_PAGE_SLUGS.includes(slug as (typeof INFO_PAGE_SLUGS)[number])) return null;
  const fallback = INFO_PAGE_DEFAULTS[slug];
  if (!isSupabaseConfigured) return fallback;
  const supabase = await createClient();
  const { data } = await supabase.from("store_settings").select("value").eq("key", "pages").maybeSingle();
  const saved = (data?.value as InfoPages | null)?.[slug];
  return saved?.body ? { title: saved.title || fallback.title, body: saved.body } : fallback;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return {};
  return { title: page.title, alternates: { canonical: `/page/${slug}` } };
}

export default async function InfoPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) notFound();

  return (
    <main className="info-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="ব্রেডক্রাম্ব"><Link href="/">হোম</Link><span>/</span><strong>{page.title}</strong></nav>
        <article className="info-sheet">
          <h1>{page.title}</h1>
          {page.body.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph.split("\n").map((line, lineIndex) => <span key={lineIndex}>{line}<br /></span>)}</p>
          ))}
        </article>
        <Link className="info-back" href="/">← হোমে ফিরে যান</Link>
      </div>
    </main>
  );
}
