import { NextRequest, NextResponse } from "next/server";
import { CATALOG, requireStaff } from "@/lib/supabase/admin-auth";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/avif"];
const MAX_BYTES = 4_000_000;

/** Uploads product images to the same public bucket the logo uses, under products/. */
export async function POST(request: NextRequest) {
  const auth = await requireStaff(CATALOG);
  if (auth.error) return auth.error;

  const form = await request.formData();
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length) return NextResponse.json({ error: "Choose at least one image" }, { status: 400 });

  const urls: string[] = [];
  for (const file of files) {
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: `${file.name}: only PNG, JPEG, WEBP or AVIF` }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name}: larger than 4 MB` }, { status: 400 });
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = `products/${Date.now()}-${Math.round(performance.now())}.${extension}`;
    const { error } = await auth.supabase.storage.from("product-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    urls.push(auth.supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl);
  }
  return NextResponse.json({ urls });
}
