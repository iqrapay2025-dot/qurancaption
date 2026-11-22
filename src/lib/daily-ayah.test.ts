import { describe, it, expect } from "vitest";
import {
  DAILY_AYAH_KEYS,
  pickDailyKey,
  parseDailyKey,
  stripTashkeel,
  getDailyAyahArabicClass,
} from "./daily-ayah";
import { SURAH_VERSE_COUNTS } from "./editor-link";

describe("Daily Ayah (Prompt 5)", () => {
  it("has about 60 curated keys with no duplicates", () => {
    expect(DAILY_AYAH_KEYS.length).toBeGreaterThanOrEqual(50);
    expect(DAILY_AYAH_KEYS.length).toBeLessThanOrEqual(70);
    const uniqueKeys = new Set(DAILY_AYAH_KEYS);
    expect(uniqueKeys.size).toBe(DAILY_AYAH_KEYS.length);
  });

  it("every key matches the pattern and is within valid surah and ayah counts", () => {
    for (const key of DAILY_AYAH_KEYS) {
      expect(key).toMatch(/^\d{1,3}:\d{1,3}$/);
      const parsed = parseDailyKey(key);
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(parsed.surah).toBeGreaterThanOrEqual(1);
        expect(parsed.surah).toBeLessThanOrEqual(114);
        const maxVerses = SURAH_VERSE_COUNTS[parsed.surah - 1];
        expect(parsed.ayah).toBeGreaterThanOrEqual(1);
        expect(parsed.ayah).toBeLessThanOrEqual(maxVerses);
      }
    }
  });

  it("pickDailyKey is deterministic for the same date", () => {
    const d1 = new Date(2026, 4, 15, 8, 30);
    const d2 = new Date(2026, 4, 15, 23, 45);
    expect(pickDailyKey(d1)).toBe(pickDailyKey(d2));
  });

  it("pickDailyKey changes the next day", () => {
    const today = new Date(2026, 4, 15);
    const tomorrow = new Date(2026, 4, 16);
    expect(pickDailyKey(today)).not.toBe(pickDailyKey(tomorrow));
  });

  it("pickDailyKey wraps smoothly at the end of the list", () => {
    const total = DAILY_AYAH_KEYS.length;
    const baseDate = new Date(2026, 0, 1);
    const wrappedDate = new Date(2026, 0, 1 + total);
    expect(pickDailyKey(baseDate)).toBe(pickDailyKey(wrappedDate));
  });

  it("parseDailyKey rejects invalid keys", () => {
    expect(parseDailyKey("")).toBeNull();
    expect(parseDailyKey("0:1")).toBeNull();
    expect(parseDailyKey("115:1")).toBeNull();
    expect(parseDailyKey("1:8")).toBeNull(); // Al-Fatihah has only 7 ayahs
    expect(parseDailyKey("abc:12")).toBeNull();
  });

  describe("stripTashkeel", () => {
    it("safely handles empty text", () => {
      expect(stripTashkeel("")).toBe("");
    });

    it("removes vowel diacritics (harakat) and recitation marks while keeping letters", () => {
      const sample = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۚ";
      const stripped = stripTashkeel(sample);
      expect(stripped).toBe("بسم الله الرحمن الرحيم ");
      expect(stripped).not.toContain("ِ"); // kasra
      expect(stripped).not.toContain("ّ"); // shaddah
      expect(stripped).not.toContain("ۚ"); // waqf mark
    });
  });

  describe("getDailyAyahArabicClass", () => {
    it("returns compact class for long verses (>180 chars)", () => {
      const cls = getDailyAyahArabicClass(250, 0);
      expect(cls).toContain("text-[17px]");
      expect(cls).toContain("leading-[2.25]");
    });

    it("returns medium class for medium verses (90-180 chars)", () => {
      const cls = getDailyAyahArabicClass(120, 0);
      expect(cls).toContain("text-lg");
      expect(cls).toContain("leading-[2.2]");
    });

    it("returns larger class for short verses (<90 chars)", () => {
      const cls = getDailyAyahArabicClass(40, 0);
      expect(cls).toContain("text-xl");
    });

    it("scales down when sizeOffset is -1", () => {
      const cls = getDailyAyahArabicClass(250, -1);
      expect(cls).toContain("text-base");
    });

    it("scales up when sizeOffset is +1", () => {
      const cls = getDailyAyahArabicClass(250, 1);
      expect(cls).toContain("text-xl");
    });
  });
});
