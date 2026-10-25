import "server-only";
// In-memory rate limiter (per instance). Use Upstash Redis in production via env vars.
const store = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const rec = store.get(key);
  if (!rec || rec.reset < now) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (rec.count >= limit) return { ok: false, retryAfter: Math.ceil((rec.reset - now) / 1000) };
  rec.count++;
  return { ok: true, retryAfter: 0 };
}