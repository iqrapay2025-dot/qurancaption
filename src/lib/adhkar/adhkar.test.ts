import { describe, it, expect } from "vitest";
import allAdhkar from "../../../data/adhkar/adhkar.json";
import morningAdhkar from "../../../data/adhkar/morning.json";
import eveningAdhkar from "../../../data/adhkar/evening.json";
import afterSalahAdhkar from "../../../data/adhkar/after-salah.json";
import sleepAdhkar from "../../../data/adhkar/sleep.json";
import wakingAdhkar from "../../../data/adhkar/waking.json";
import generalAdhkar from "../../../data/adhkar/general.json";
import type { AdhkarItem } from "@/lib/adhkar/types";

describe("Adhkar Data Quality & Schema Integrity", () => {
  it("loads 106 verified authentic adhkar", () => {
    expect(allAdhkar.length).toBe(106);
  });

  it("partitions correctly into all six categories", () => {
    expect(morningAdhkar.length).toBe(19);
    expect(eveningAdhkar.length).toBe(19);
    expect(afterSalahAdhkar.length).toBe(13);
    expect(sleepAdhkar.length).toBe(8);
    expect(wakingAdhkar.length).toBe(3);
    expect(generalAdhkar.length).toBe(44);
    expect(
      morningAdhkar.length +
        eveningAdhkar.length +
        afterSalahAdhkar.length +
        sleepAdhkar.length +
        wakingAdhkar.length +
        generalAdhkar.length
    ).toBe(allAdhkar.length);
  });

  it("every item conforms to the strict AdhkarItem schema", () => {
    const ids = new Set<string>();

    for (const item of allAdhkar as AdhkarItem[]) {
      // Unique ID
      expect(item.id).toBeTruthy();
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);

      // Valid category
      expect(["morning", "evening", "after-salah", "sleep", "waking", "general"]).toContain(item.category);

      // Order is positive number
      expect(typeof item.order).toBe("number");
      expect(item.order).toBeGreaterThanOrEqual(1);

      // Arabic text with tashkeel
      expect(typeof item.arabic).toBe("string");
      expect(item.arabic.trim().length).toBeGreaterThan(0);
      // Ensure Arabic contains diacritic vowel markers (fatha, damma, kasra, sukun, etc.)
      expect(/[\u064B-\u065F]/.test(item.arabic)).toBe(true);

      // Transliteration
      expect(typeof item.transliteration).toBe("string");
      expect(item.transliteration.trim().length).toBeGreaterThan(0);

      // English Translation
      expect(typeof item.translation_en).toBe("string");
      expect(item.translation_en.trim().length).toBeGreaterThan(0);

      // Repeat count is positive integer
      expect(Number.isInteger(item.repeat)).toBe(true);
      expect(item.repeat).toBeGreaterThanOrEqual(1);

      // Source reference must exist and not be empty
      expect(item.source).toBeDefined();
      expect(item.source.book).toBeTruthy();
      expect(item.source.hadith_reference).toBeTruthy();
    }
  });

  it("has authentic Sunnah.com links for major core adhkar", () => {
    const morningList = morningAdhkar as AdhkarItem[];
    const withSunnahUrl = morningList.filter((item) => Boolean(item.source.sunnah_url));
    expect(withSunnahUrl.length).toBeGreaterThanOrEqual(15);
    for (const item of withSunnahUrl) {
      expect(item.source.sunnah_url).toMatch(/^https:\/\/sunnah\.com\//);
    }
  });

  it("provides tolerant search across Arabic and English", async () => {
    const { searchAdhkar, stripArabicTashkeel, getSuggestedCategory } = await import("./data");

    // Diacritics stripping
    expect(stripArabicTashkeel("أَصْبَحْنَا")).toBe("اصبحنا");

    // Search by English keyword
    const kursiResults = searchAdhkar("kursi");
    expect(kursiResults.length).toBeGreaterThan(0);
    expect(kursiResults[0].title.toLowerCase()).toContain("kursi");

    // Search by Arabic text
    const arabicResults = searchAdhkar("الحمد لله");
    expect(arabicResults.length).toBeGreaterThan(0);

    // Suggested category by hour
    expect(getSuggestedCategory(7).category).toBe("morning");
    expect(getSuggestedCategory(16).category).toBe("evening");
    expect(getSuggestedCategory(22).category).toBe("sleep");
    expect(getSuggestedCategory(5).category).toBe("waking");
  });
});
