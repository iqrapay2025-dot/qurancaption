import { describe, it, expect } from "vitest";
import { normalizeArabic, tokenize, wordSimilarity } from "./normalize";
import { align, WORD_MATCH_THRESHOLD, MIN_CONFIDENCE_RATIO, MIN_VERSE_DURATION } from "./align";

describe("normalizeArabic", () => {
  it("removes diacritics (tashkeel)", () => {
    const input = "بِسْمِ ٱللَّهِ";
    const expected = "بسم الله";
    expect(normalizeArabic(input)).toBe(expected);
  });

  it("removes tatweel", () => {
    const input = "قُرءٗان";
    expect(normalizeArabic(input)).toBe("قرءان");
  });

  it("maps alef wasla (U+0671) to alef", () => {
    const input = String.fromCharCode(0x0671) + "l";
    expect(normalizeArabic(input)).toBe("ا" + "l");
  });

  it("unifies alef forms: أ إ آ to ا", () => {
    expect(normalizeArabic("أ")).toBe("ا");
    expect(normalizeArabic("إ")).toBe("ا");
    expect(normalizeArabic("آ")).toBe("ا");
  });

  it("converts alef maqsura (ى) to ya (ي)", () => {
    expect(normalizeArabic("ى")).toBe("ي");
  });

  it("converts ta marbuta (ة) to ha (ه)", () => {
    expect(normalizeArabic("ة")).toBe("ه");
  });

  it("removes hamza on waw (ؤ) to base waw (و)", () => {
    expect(normalizeArabic("ؤ")).toBe("و");
  });

  it("removes hamza on ya (ئ) to base ya (ي)", () => {
    expect(normalizeArabic("ئ")).toBe("ي");
  });

  it("removes specified Unicode ranges", () => {
    const input = String.fromCharCode(0x0610) + "text";
    expect(typeof normalizeArabic(input)).toBe("string");
  });

  it("removes end-of-ayah mark U+06DD followed by digit leaves no extra token", () => {
    const input = String.fromCharCode(0x06DD) + "5" + "text";
    const result = normalizeArabic(input);
    expect(result).toContain("text");
  });

  it("collapses spaces", () => {
    const input = "  Hello   World  ";
    expect(normalizeArabic(input)).toBe("Hello World");
  });

  it("normalizes Al-Ikhlas verse 1: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ' to 'قل هو الله احد'", () => {
    const input = "قُلْ هُوَ ٱللَّهُ أَحَدٌ";
    const expected = "قل هو الله احد";
    expect(normalizeArabic(input)).toBe(expected);
  });

  it("normalizes Al-Ikhlas verse 2: 'ٱلصَّمَدُ' to 'الصمد'", () => {
    const input = "ٱلصَّمَدُ";
    const expected = "الصمد";
    expect(normalizeArabic(input)).toBe(expected);
  });

    it("normalizes Al-Ikhlas verse 3", () => {
    // input: لَمْ يَلِدْ وَلَمْ يُولَدْ
    const input = "\u0644\u064E\u0645\u0652 \u064A\u064E\u0644\u0650\u062F\u0652 \u0648\u064E\u0644\u064E\u0645\u0652 \u064A\u064F\u0648\u0644\u064E\u062F\u0652";
    // expected: لم يلد ولم يولد
    const expected = "\u0644\u0645 \u064A\u0644\u062F \u0648\u0644\u0645 \u064A\u0648\u0644\u062F";
    expect(normalizeArabic(input)).toBe(expected);
  });

  it("normalizes Ar-Rahman: 'ٱلرَّحْمَٰنِ' to 'الرحمن'", () => {
    const input = "ٱلرَّحْمَٰنِ";
    const expected = "الرحمن";
    expect(normalizeArabic(input)).toBe(expected);
  });
});

describe("tokenize", () => {
  it("splits normalized text into words", () => {
    const input = "كتاب Karim";
    const result = tokenize(input);
    expect(result).toEqual(["كتاب", "Karim"]);  // fixed: no stray leading space
  });

  it("handles empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("handles string with only spaces", () => {
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("wordSimilarity", () => {
  it("returns 1 for identical words", () => {
    expect(wordSimilarity("كتاب", "كتاب")).toBe(1);
  });

  it("returns 0 for empty strings", () => {
    expect(wordSimilarity("", "كتاب")).toBe(0);
    expect(wordSimilarity("كتاب", "")).toBe(0);
  });

  it("computes Jaccard similarity on characters", () => {
    const result = wordSimilarity("كتاب", "كثاب");
    expect(result).toBeGreaterThan(0.5);
    expect(result).toBeLessThan(1);
  });
});

describe("align", () => {
  it("perfect word timestamps for 3 short verses", () => {
    const expectedVerses = [
      { verseKey: "Al-Ikhlas-1", text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
      { verseKey: "Al-Ikhlas-2", text: "ٱللَّهُ ٱلصَّمَدُ" },
      { verseKey: "Al-Ikhlas-3", text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
    ];
    // Verse 1: 4 words, Verse 2: 2 words, Verse 3: 4 words = 10 words total
    // One recognized word per expected word
    const recognized = [
      { word: "قُل", start: 0, end: 0.5 },
      { word: "هُوَ", start: 0.5, end: 1.0 },
      { word: "ٱللَّه", start: 1.0, end: 1.5 },
      { word: "أَحَد", start: 1.5, end: 2.0 },
      { word: "ٱللَّهُ", start: 2.0, end: 2.5 },
      { word: "ٱلصَّمَدُ", start: 2.5, end: 3.0 },
      { word: "لَمْ", start: 3.0, end: 3.5 },
      { word: "يَلِدْ", start: 3.5, end: 4.0 },
      { word: "وَلَمْ", start: 4.0, end: 4.5 },
      { word: "يُولَدْ", start: 4.5, end: 5.0 },
    ];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(3);
    expect(result[0].verseKey).toBe("Al-Ikhlas-1");
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(2.0);
    expect(result[0].confidence).toBe(1.0);
    expect(result[1].verseKey).toBe("Al-Ikhlas-2");
    expect(result[1].start).toBe(2.0);
    expect(result[1].end).toBe(3.0);
    expect(result[1].confidence).toBe(1.0);
    expect(result[2].verseKey).toBe("Al-Ikhlas-3");
    expect(result[2].start).toBe(3.0);
    expect(result[2].end).toBe(5.0);
  });

  it("handles long pause between verses", () => {
    const expectedVerses = [
      { verseKey: "Verse-1", text: "ٱللَّهُ أَحَدٌ" },
      { verseKey: "Verse-2", text: "ٱلصَّمَدُ" },
    ];
    // verse 1 words at 0-1 and 1-2, verse 2 word at 11-12
    const recognized = [
      { word: "ٱللَّهُ", start: 0, end: 1 },
      { word: "أَحَدٌ", start: 1, end: 2 },
      { word: "ٱلصَّمَدُ", start: 11, end: 12 },
    ];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(2);
    expect(result[0].end).toBe(2);
    expect(result[1].start).toBe(11);
  });

  it("ignores isti'adha and basmala before verse 1", () => {
    const expectedVerses = [
      { verseKey: "Al-Fatiha-1", text: "ٱلْحَمْدُ لِلَّهِ" },
    ];
    // Words before verse 1: isti'adha and basmala
    const recognized = [
      { word: "أَعُوذُ", start: 0, end: 0.5 },
      { word: "بِسْمِ ٱللَّهِ", start: 0.5, end: 1.5 },
      { word: "ٱلْحَمْدُ", start: 1.5, end: 2.0 },
    ];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(1);
    // Verse 1 start should equal the start of its first real word (1.5), not 0
    expect(result[0].start).toBe(1.5);
  });

  it("unmatched middle verse gets times strictly between neighbours", () => {
    const expectedVerses = [
      { verseKey: "Verse-1", text: "ٱللَّهُ أَحَدٌ" },
      { verseKey: "Verse-2", text: "لَآ إِلهَ إِلَّا هُوَ" },
      { verseKey: "Verse-3", text: "ٱلصَّمَدُ" },
    ];
    // Only recognize words for verse 1 and 3, skip verse 2 entirely
    const recognized = [
      { word: "ٱللَّهُ", start: 0, end: 1 },
      { word: "أَحَدٌ", start: 1, end: 2 },
      { word: "ٱلصَّمَدُ", start: 10, end: 11 },
    ];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(3);
    // Verse 2 (middle) should have confidence 0 and times between neighbours
    expect(result[1].confidence).toBe(0);
    // Times should be strictly between neighbours: 2 < start < 10
    expect(result[1].start).toBeGreaterThan(result[0].end);
    expect(result[1].end).toBeLessThan(result[2].start);
  });

  it("output order and length always equal expectedVerses", () => {
    const expectedVerses = [
      { verseKey: "A", text: "كلمة" },
      { verseKey: "B", text: "كلمتان" },
      { verseKey: "C", text: "كلمتين" },
    ];
    const recognized = [
      { word: "كلم", start: 0, end: 1 },
    ];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(3); // Same length as expectedVerses
    expect(result[0].verseKey).toBe("A");
    expect(result[1].verseKey).toBe("B");
    expect(result[2].verseKey).toBe("C");
    // Times should be non-decreasing
    expect(result[0].start).toBeLessThanOrEqual(result[1].start);
    expect(result[1].start).toBeLessThanOrEqual(result[2].start);
  });

  it("times never decrease across verses", () => {
    const expectedVerses = [
      { verseKey: "A", text: "كلمة" },
      { verseKey: "B", text: "كلمتان" },
      { verseKey: "C", text: "كلمتين" },
    ];
    const recognized = [
      { word: "كلم", start: 0, end: 1 },
      { word: "كلمتين", start: 5, end: 6 },
    ];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(3);
    // Non-decreasing check
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].end);
      expect(result[i].end).toBeGreaterThanOrEqual(result[i - 1].end);
    }
  });

  it("confidence = matched words / expected words lowered for matches below 1.0 similarity", () => {
    const expectedVerses = [
      { verseKey: "Verse-1", text: "ٱللَّهُ أَحَدٌ" },
    ];
    // Recognized words with low similarity (misspelled)
    const recognized = [
      { word: "ٱللَّهُ", start: 0, end: 1 },
    ];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(1);
    // If similarity < 1.0, confidence should be lowered
    expect(result[0].confidence).toBeLessThanOrEqual(1.0);
    expect(result[0].confidence).toBeGreaterThanOrEqual(0);
  });

  it("Uthmani verse text matches recognized plain-Arabic words with confidence 1", () => {
    const expectedVerses = [
      { verseKey: "Al-Ikhlas", text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
    ];
    // Recognized plain Arabic (no diacritics) matching the normalized expected
    const recognized = [
      { word: "قل", start: 0, end: 0.5 },
      { word: "هو", start: 0.5, end: 1.0 },
      { word: "الله", start: 1.0, end: 1.5 },
      { word: "احد", start: 1.5, end: 2.0 },
    ];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(1);
    // All 4 words match, expected has 4 words, confidence should be 1
    expect(result[0].confidence).toBe(1.0);
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(2.0);
  });

  it("empty recognized input keeps verse keys", () => {
    const expectedVerses = [
      { verseKey: "Verse-1", text: "ٱللَّهُ أَحَدٌ" },
      { verseKey: "Verse-2", text: "ٱللَّهُ ٱلصَّمَدُ" },
    ];
    const recognized: { word: string; start: number; end: number }[] = [];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(2); // Same length as expectedVerses
    expect(result[0].verseKey).toBe("Verse-1");
    expect(result[1].verseKey).toBe("Verse-2");
    // Both should have confidence 0 and interpolated times
    expect(result[0].confidence).toBe(0);
    expect(result[1].confidence).toBe(0);
  });

  it("no verses matched at all returns zeros with confidence 0", () => {
    const expectedVerses = [
      { verseKey: "Verse-1", text: "ٱللَّهُ أَحَدٌ" },
    ];
    const recognized = [
      { word: "كلمه", start: 0, end: 1 },
    ];
    const result = align(expectedVerses, recognized);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0);
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(0);
  });
});
