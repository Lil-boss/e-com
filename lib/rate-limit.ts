/**
 * Fixed-window counter held in process memory.
 *
 * ponytail: per-instance, so a multi-instance deployment allows limit × instances.
 * That is still a hard ceiling on abuse; move to Redis when one process stops being enough.
 *
 * Deliberately free of next/server imports so the counter stays unit-testable.
 */
const hits = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [existing, times] of hits) if (!times.some((at) => now - at < windowMs)) hits.delete(existing);
  }
  return true;
}

export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

/** A 429 response when the caller is over the limit, otherwise null. */
export function throttle(request: Request, scope: string, limit: number, windowMs: number, message: string) {
  if (allow(clientKey(request, scope), limit, windowMs)) return null;
  return Response.json({ error: message }, { status: 429, headers: { "retry-after": String(Math.ceil(windowMs / 1000)) } });
}
