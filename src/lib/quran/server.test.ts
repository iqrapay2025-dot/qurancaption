import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getVerses } from "./server";

let origKey: string | undefined;
let origRequire: string | undefined;

beforeEach(() => {
  origKey = process.env.UMMAH_API_KEY;
  origRequire = process.env.UMMAH_REQUIRE_KEY;
  delete process.env.UMMAH_API_KEY;
  delete process.env.UMMAH_REQUIRE_KEY;
  vi.stubGlobal("fetch", vi.fn(async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      success: true,
      data: {
        verses: [
          { verse_key: "1:1", ayah: 1, arabic: "بسمِ الله الرحمن الرحيم", translations: {} },
          { verse_key: "1:2", ayah: 2, arabic: "الحمد لله رب العالمين", translations: {} },
        ],
      },
    }),
  })));
});

afterEach(() => {
  if (origKey === undefined) delete process.env.UMMAH_API_KEY; else process.env.UMMAH_API_KEY = origKey;
  if (origRequire === undefined) delete process.env.UMMAH_REQUIRE_KEY; else process.env.UMMAH_REQUIRE_KEY = origRequire;
  vi.unstubAllGlobals();
});

describe("UMMAH_REQUIRE_KEY", () => {
  it("refuses Quran data in required mode without a server key", async () => {
    process.env.UMMAH_REQUIRE_KEY = "true";
    await expect(getVerses(1, 1, 2, [])).rejects.toMatchObject({ code: "not_configured", status: 503 });
  });

  it("allows anonymous access when not required", async () => {
    process.env.UMMAH_REQUIRE_KEY = "false";
    const result = await getVerses(1, 1, 2, []);
    expect(result.verses.length).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalled();
  });
});
