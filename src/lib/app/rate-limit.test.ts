import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type RateLimitFn = typeof import("./rate-limit").rateLimit;

let rateLimit: RateLimitFn;

beforeEach(async () => {
  // Force the in-memory limiter: rate-limit.ts reads these env vars at import time,
  // so clear them and re-import a fresh module for every test.
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.resetModules();
  ({ rateLimit } = await import("./rate-limit"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one with Retry-After", async () => {
    const key = "test:key:1";
    const r1 = await rateLimit(key, 2, 10_000);
    const r2 = await rateLimit(key, 2, 10_000);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    const r3 = await rateLimit(key, 2, 10_000);
    expect(r3.ok).toBe(false);
    expect(r3.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the window using fake timers", async () => {
    vi.useFakeTimers();
    const key = "test:key:2";
    await rateLimit(key, 1, 10_000);
    const blocked = await rateLimit(key, 1, 10_000);
    expect(blocked.ok).toBe(false);
    vi.advanceTimersByTime(11_000);
    expect((await rateLimit(key, 1, 10_000)).ok).toBe(true);
  });

  it("fails closed in production when Redis is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const r = await rateLimit("test:key:3", 5, 10_000, { failClosed: true });
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });
});