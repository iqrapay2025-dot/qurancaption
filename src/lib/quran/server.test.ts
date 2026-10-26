import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getVerses } from "./server";

let origKey: string | undefined;
let origRequire: string | undefined;

beforeEach(() => {
  origKey = process.env.UMMAH_API_KEY;
  origRequire = process.env.UMMAH_REQUIRE_KEY;
  delete process.env.UMMAH_API_KEY;
  delete process.env.UMMAH_REQUIRE_KEY;
});

afterEach(() => {
  if (origKey === undefined) delete process.env.UMMAH_API_KEY; else process.env.UMMAH_API_KEY = origKey;
  if (origRequire === undefined) delete process.env.UMMAH_REQUIRE_KEY; else process.env.UMMAH_REQUIRE_KEY = origRequire;
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
  });
});
