import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getVerses, getTafsirs, getTafsir, parseParagraphs } from "./server";

let origKey: string | undefined;
let origRequire: string | undefined;

beforeEach(() => {
  origKey = process.env.UMMAH_API_KEY;
  origRequire = process.env.UMMAH_REQUIRE_KEY;
  delete process.env.UMMAH_API_KEY;
  delete process.env.UMMAH_REQUIRE_KEY;
  (globalThis as any).__ummah?.cache.clear();
  (globalThis as any).__ummah?.inflight.clear();
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

describe("Tafsir backend", () => {
  it("the catalog parses correctly", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        data: {
          total: 4,
          tafasir: [
            {
              key: "ibn_kathir",
              name: "Ibn Kathir (Abridged)",
              language: "english",
              author: "Hafiz Ibn Kathir",
            },
            {
              key: "maarif",
              name: "Ma'arif al-Qur'an",
              language: "english",
              author: "Mufti Muhammad Shafi",
            },
            {
              key: "muyassar",
              name: "Tafsir Muyassar",
              language: "arabic",
              author: "Ministry of Islamic Affairs, Saudi Arabia",
            },
            {
              key: "ibn_kathir_ar",
              name: "Tafsir Ibn Kathir",
              language: "arabic",
              author: "Hafiz Ibn Kathir",
            },
          ],
        },
      }),
    })));

    const { tafsirs } = await getTafsirs();
    expect(tafsirs).toHaveLength(3);
    expect(tafsirs[0]).toEqual({
      id: "ibn_kathir",
      name: "Ibn Kathir (Abridged)",
      language: "english",
      author: "Hafiz Ibn Kathir",
    });
    expect(tafsirs[1].id).toBe("maarif");
    expect(tafsirs[2].id).toBe("muyassar");
  });

  it("the correct ayah is returned from a mocked surah response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        data: {
          surah: 112,
          total_verses: 4,
          tafsir: {
            key: "muyassar",
            name: "Tafsir Muyassar",
            language: "arabic",
            author: "Ministry of Islamic Affairs, Saudi Arabia",
          },
          verses: [
            { verse_key: "112:1", ayah: 1, text: "قل هو الله أحد" },
            { verse_key: "112:2", ayah: 2, text: "الله الصمد" },
            { verse_key: "112:3", ayah: 3, text: "لم يلد ولم يولد" },
            { verse_key: "112:4", ayah: 4, text: "ولم يكن له كفوا أحد" },
          ],
        },
      }),
    })));

    const res = await getTafsir("muyassar", 112, 2);
    expect(res).toEqual({
      tafsir: "muyassar",
      surah: 112,
      ayah: 2,
      language: "arabic",
      paragraphs: ["الله الصمد"],
    });
  });

  it("a second call for the same surah does not call fetch again, even for a different ayah", async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        data: {
          surah: 112,
          total_verses: 4,
          tafsir: {
            key: "muyassar",
            name: "Tafsir Muyassar",
            language: "arabic",
          },
          verses: [
            { verse_key: "112:1", ayah: 1, text: "First ayah commentary" },
            { verse_key: "112:2", ayah: 2, text: "Second ayah commentary" },
          ],
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await getTafsir("muyassar", 112, 1);
    expect(first.paragraphs).toEqual(["First ayah commentary"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await getTafsir("muyassar", 112, 2);
    expect(second.paragraphs).toEqual(["Second ayah commentary"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("HTML is stripped and entities are decoded", async () => {
    const raw = `<p>Introduction to &quot;Ayat Al-Kursi&quot; &amp; its virtues.</p><br/><p>Allah&#39;s Messenger &#x0635;&#x0644;&#x0649; said: &#171;Virtue&#187;</p>`;
    const paragraphs = parseParagraphs(raw);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toBe('Introduction to "Ayat Al-Kursi" & its virtues.');
    expect(paragraphs[1]).toBe("Allah's Messenger صلى said: «Virtue»");

    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        data: {
          surah: 2,
          total_verses: 286,
          tafsir: { key: "ibn_kathir", name: "Ibn Kathir", language: "english" },
          verses: [
            {
              verse_key: "2:255",
              ayah: 255,
              text: "<p>The Virtue of <b>Ayat Al-Kursi</b> &amp; more</p><p>Line 2 &quot;quoted&quot;</p>",
            },
          ],
        },
      }),
    })));

    const entry = await getTafsir("ibn_kathir", 2, 255);
    expect(entry.paragraphs).toEqual([
      "The Virtue of Ayat Al-Kursi & more",
      'Line 2 "quoted"',
    ]);
  });

  it("invalid tafsir, surah, and ayah values return bad_request", async () => {
    // Unknown tafsir
    await expect(getTafsir("nope", 1, 1)).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });

    // Surah out of range
    await expect(getTafsir("ibn_kathir", 115, 1)).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });
    await expect(getTafsir("ibn_kathir", 0, 1)).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });

    // Ayah out of range
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        data: {
          surah: 1,
          total_verses: 7,
          tafsir: { key: "ibn_kathir", name: "Ibn Kathir", language: "english" },
          verses: [{ verse_key: "1:1", ayah: 1, text: "text" }],
        },
      }),
    })));

    await expect(getTafsir("ibn_kathir", 1, 999)).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });
    await expect(getTafsir("ibn_kathir", 1, 0)).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });
  });

  it("a malformed upstream response returns malformed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        data: { broken: true },
      }),
    })));

    await expect(getTafsir("ibn_kathir", 1, 1)).rejects.toMatchObject({
      code: "malformed",
      status: 502,
    });
  });
});
