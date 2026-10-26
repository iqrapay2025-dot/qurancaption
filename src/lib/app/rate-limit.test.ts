import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimit } from "./rate-limit";

afterEach(() => vi.restoreAllMocks());

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one with Retry-After", () => {
    const key = "test:key:1";
    const r1 = rateLimit(key, 2, 10_000);
    const r2 = rateLimit(key, 2, 10_000);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    const r3 = rateLimit(key, 2, 10_000);
    expect(r3.ok).toBe(false);
    expect(r3.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the window using fake timers", () => {
    vi.useFakeTimers();
    try {
      const key = "test:key:2";
      rateLimit(key, 1, 10_000);
      const blocked = rateLimit(key, 1, 10_000);
      expect(blocked.ok).toBe(false);
      vi.advanceTimersByTime(11_000);
      expect(rateLimit(key, 1, 10_000).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
