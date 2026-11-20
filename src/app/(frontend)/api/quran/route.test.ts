import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "@/lib/app/rate-limit";
import { clientIp } from "@/lib/app/http";
import { GET as getTafsirRoute } from "./tafsir/route";
import { GET as getTafsirsRoute } from "./tafsirs/route";
import { GET as getAudioRoute } from "./audio/route";

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

  describe("Tafsir routes rate limiting", () => {
    it("returns 429 when /api/quran/tafsir exceeds limit", async () => {
      (rateLimit as any).mockResolvedValueOnce({ ok: false, retryAfter: 60 });
      (clientIp as any).mockReturnValue("127.0.0.1");

      const req = new Request("http://localhost/api/quran/tafsir?tafsir=ibn_kathir&surah=2&ayah=255");
      const res = await getTafsirRoute(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.retryAfter).toBe(60);
    });

    it("returns 429 when /api/quran/tafsirs exceeds limit", async () => {
      (rateLimit as any).mockResolvedValueOnce({ ok: false, retryAfter: 60 });
      (clientIp as any).mockReturnValue("127.0.0.1");

      const req = new Request("http://localhost/api/quran/tafsirs");
      const res = await getTafsirsRoute(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.retryAfter).toBe(60);
    });

    it("returns 429 when /api/quran/audio exceeds limit of 30 req/min", async () => {
      (rateLimit as any).mockImplementationOnce((key: string, limit: number, windowMs: number) => {
        expect(limit).toBe(30);
        return Promise.resolve({ ok: false, retryAfter: 60 });
      });
      (clientIp as any).mockReturnValue("127.0.0.1");

      const req = new Request("http://localhost/api/quran/audio?surah=1&reciter=1");
      const res = await getAudioRoute(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.retryAfter).toBe(60);
    });
  });
});