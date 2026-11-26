import { describe, it, expect } from "vitest";
import {
  normalizeArabicSpeech,
  evaluateSpokenRecitation,
} from "./voice-matcher";

describe("Arabic Voice Normalization & Recitation Matcher", () => {
  it("normalizes tashkeel, tatweel, and alef variants correctly", () => {
    const raw = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
    const normalized = normalizeArabicSpeech(raw);
    expect(normalized).toBe("بسم الله الرحمن الرحيم");
  });

  it("accurately matches spoken words against expected verse words", () => {
    const expected = ["بِسْمِ", "اللَّهِ", "الرَّحْمَٰنِ", "الرَّحِيمِ"];
    const spoken = "بسم الله الرحمن الرحيم";

    const result = evaluateSpokenRecitation(spoken, expected);
    expect(result.accuracyPercentage).toBe(100);
    expect(result.matchedIndices).toEqual([0, 1, 2, 3]);
    expect(result.missedIndices).toEqual([]);
    expect(result.errorIndices).toEqual([]);
    expect(result.wordStatuses).toEqual(["matched", "matched", "matched", "matched"]);
  });

  it("identifies skipped or mispronounced words as errors (red text)", () => {
    const expected = ["الْحَمْدُ", "لِلَّهِ", "رَبِّ", "الْعَالَمِينَ"];
    // Spoken transcript omitted "رب"
    const spoken = "الحمد لله العالمين";

    const result = evaluateSpokenRecitation(spoken, expected, { isLive: true });
    expect(result.accuracyPercentage).toBe(75);
    expect(result.matchedIndices).toEqual([0, 1, 3]);
    expect(result.missedIndices).toEqual([2]);
    // The skipped word "رب" is flagged as an error for red text display
    expect(result.errorIndices).toEqual([2]);
    expect(result.wordStatuses[2]).toBe("error");
    expect(result.wordStatuses[0]).toBe("matched");
    expect(result.wordStatuses[3]).toBe("matched");
  });

  it("handles live recitation where later words are unrecited rather than errors", () => {
    const expected = ["قُلْ", "هُوَ", "اللَّهُ", "أَحَدٌ"];
    // User is live and has only recited the first two words so far
    const spoken = "قل هو";

    const result = evaluateSpokenRecitation(spoken, expected, { isLive: true });
    expect(result.matchedIndices).toEqual([0, 1]);
    expect(result.errorIndices).toEqual([]);
    expect(result.wordStatuses[0]).toBe("matched");
    expect(result.wordStatuses[1]).toBe("matched");
    expect(result.wordStatuses[2]).toBe("unrecited");
    expect(result.wordStatuses[3]).toBe("unrecited");
  });
});
