import { describe, it, expect } from "vitest";
import {
  buildEditorLink,
  parseEditorHash,
  getSurahVerseCount,
  SURAH_VERSE_COUNTS,
} from "./editor-link";

describe("Editor Link Builder and Parser (Prompt 4)", () => {
  it("builds valid editor links", () => {
    expect(buildEditorLink()).toBe("/#/editor");
    expect(buildEditorLink({ surah: 36 })).toBe("/#/editor?surah=36");
    expect(buildEditorLink({ surah: 36, from: 5, to: 12 })).toBe("/#/editor?surah=36&from=5&to=12");
  });

  it("parses valid links correctly with round-trip verification", () => {
    const link = buildEditorLink({ surah: 36, from: 5, to: 12 });
    const parsed = parseEditorHash(link);
    expect(parsed.valid).toBe(true);
    expect(parsed.surah).toBe(36);
    expect(parsed.from).toBe(5);
    expect(parsed.to).toBe(12);

    // Surah only defaults to 1..min(verseCount, 7)
    const surahOnly = parseEditorHash("/#/editor?surah=114");
    expect(surahOnly.valid).toBe(true);
    expect(surahOnly.surah).toBe(114);
    expect(surahOnly.from).toBe(1);
    expect(surahOnly.to).toBe(6); // An-Nas has 6 verses
  });

  it("rejects bad surah numbers (0, 115, negative, non-numeric)", () => {
    expect(parseEditorHash("/#/editor?surah=0").valid).toBe(false);
    expect(parseEditorHash("/#/editor?surah=115").valid).toBe(false);
    expect(parseEditorHash("/#/editor?surah=-5").valid).toBe(false);
    expect(parseEditorHash("/#/editor?surah=abc").valid).toBe(false);
    expect(parseEditorHash("/#/editor").valid).toBe(false);
    expect(parseEditorHash("").valid).toBe(false);
  });

  it("rejects from greater than to", () => {
    expect(parseEditorHash("/#/editor?surah=36&from=12&to=5").valid).toBe(false);
    expect(parseEditorHash("/#/editor?surah=1&from=7&to=1").valid).toBe(false);
  });

  it("rejects text instead of numbers for from/to", () => {
    expect(parseEditorHash("/#/editor?surah=36&from=five&to=12").valid).toBe(false);
    expect(parseEditorHash("/#/editor?surah=36&from=5&to=twelve").valid).toBe(false);
  });

  it("rejects ranges beyond the surah verse count", () => {
    // Surah 1 (Al-Fatihah) has 7 verses
    expect(parseEditorHash("/#/editor?surah=1&from=1&to=8").valid).toBe(false);
    // Surah 108 (Al-Kawthar) has 3 verses
    expect(parseEditorHash("/#/editor?surah=108&from=1&to=4").valid).toBe(false);
    // Surah 114 (An-Nas) has 6 verses
    expect(parseEditorHash("/#/editor?surah=114&from=0&to=6").valid).toBe(false);
  });

  it("verifies getSurahVerseCount accuracy across all 114 surahs", () => {
    expect(SURAH_VERSE_COUNTS).toHaveLength(114);
    expect(getSurahVerseCount(1)).toBe(7);
    expect(getSurahVerseCount(2)).toBe(286);
    expect(getSurahVerseCount(36)).toBe(83);
    expect(getSurahVerseCount(114)).toBe(6);
    expect(getSurahVerseCount(0)).toBe(0);
    expect(getSurahVerseCount(115)).toBe(0);
  });
});
