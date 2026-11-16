import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "@/lib/app/rate-limit";
import { clientIp } from "@/lib/app/http";

// Mock dependencies
vi.mock("@/lib/app/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/app/http", () => ({
  clientIp: vi.fn(),
}));

describe("Quran API routes - validation and rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rateLimit", () => {
    it("should allow requests within rate limit", async () => {
      (rateLimit as any).mockResolvedValueOnce({ ok: true, retryAfter: 0 });
      (clientIp as any).mockReturnValue("127.0.0.1");

      const result = await rateLimit("quran:test:127.0.0.1", 10, 60 * 1000, { failClosed: false });
      expect(result).toEqual({ ok: true, retryAfter: 0 });
    });

    it("should reject requests exceeding rate limit", async () => {
      (rateLimit as any).mockResolvedValueOnce({ ok: false, retryAfter: 60 });
      (clientIp as any).mockReturnValue("127.0.0.1");

      const result = await rateLimit("quran:test:127.0.0.1", 10, 60 * 1000, { failClosed: false });
      expect(result).toEqual({ ok: false, retryAfter: 60 });
    });
  });
});