import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export type RateLimitResult = { ok: boolean; retryAfter: number };

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

const warned = new Set<string>();
function warnOnce(msg: string) {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(`[rate-limit] ${msg}`);
}

// One Ratelimit instance per (limit, window) combination, created lazily.
const limiters = new Map<string, Ratelimit>();
function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const id = `${limit}:${windowMs}`;
  let rl = limiters.get(id);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
      prefix: "qc:rl",
    });
    limiters.set(id, rl);
  }
  return rl;
}

// In-memory fallback (local dev, tests, or Redis unavailable on non-critical routes).
// Per instance only: not shared across servers or serverless invocations.
const memory = new Map<string, { count: number; reset: number }>();
const MEMORY_MAX_ENTRIES = 5000;

function pruneMemory(now: number) {
  if (memory.size < MEMORY_MAX_ENTRIES) return;
  for (const [k, v] of memory) {
    if (v.reset < now) memory.delete(k);
  }
}

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  pruneMemory(now);
  const rec = memory.get(key);
  if (!rec || rec.reset < now) {
    memory.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (rec.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((rec.reset - now) / 1000)) };
  }
  rec.count++;
  return { ok: true, retryAfter: 0 };
}

/**
 * Usage: const rl = await rateLimit(`login:${email}:${ip}`, 5, 15 * 60 * 1000, { failClosed: true });
 * Returns { ok, retryAfter } (retryAfter in seconds).
 *
 * Always async, so callers must await it.
 * failClosed: in production, block the request if Redis is missing or fails
 * (use for auth routes). Otherwise it falls back to the in-memory limiter.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  opts: { failClosed?: boolean } = {},
): Promise<RateLimitResult> {
  const isProd = process.env.NODE_ENV === "production";
  const limiter = getLimiter(limit, windowMs);

  if (limiter) {
    try {
      const r = await limiter.limit(key);
      if (r.success) return { ok: true, retryAfter: 0 };
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)),
      };
    } catch (e) {
      warnOnce(`Redis error: ${e instanceof Error ? e.message : String(e)}`);
      if (opts.failClosed && isProd) return { ok: false, retryAfter: 60 };
      return memoryLimit(key, limit, windowMs);
    }
  }

  // No Redis configured
  warnOnce("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set, using in-memory limiter.");
  if (opts.failClosed && isProd) return { ok: false, retryAfter: 60 };
  return memoryLimit(key, limit, windowMs);
}