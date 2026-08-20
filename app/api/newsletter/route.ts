import { NextRequest, NextResponse } from "next/server";
import { notifySubscriber } from "@/lib/notifications";
import { throttle } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = throttle(request, "newsletter", 5, 60 * 60_000, "অনেকবার চেষ্টা হয়েছে, পরে আবার দেখুন");
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  // deliberately loose: the delivery attempt is the real validation
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "সঠিক ইমেইল ঠিকানা দিন" }, { status: 400 });
  }
  await notifySubscriber(email);
  return NextResponse.json({ ok: true }, { status: 201 });
}
