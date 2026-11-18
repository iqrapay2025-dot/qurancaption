import { describe, it, expect } from "vitest";
import { buildCaptions, creditLines, fmt, splitArabic, splitText, toArabicDigits, toSRT, toVTT, type Verse } from "./data";

const caps = [
  { start: 0, end: 5, lines: ["بِسْمِ اللَّهِ", "In the name of Allah"] },
  { start: 5, end: 11, lines: ["الرَّحْمَٰنِ الرَّحِيمِ", "the Entirely Merciful, the Especially Merciful"] },
];

describe("fmt and timestamp millisecond rollover", () => {
  it("formats seconds and milliseconds without overflowing to 1000ms", () => {
    expect(fmt(0, true)).toBe("00:00.000");
    expect(fmt(1.9998, true)).toBe("00:02.000");
    expect(fmt(59.9998, true)).toBe("01:00.000");
    expect(fmt(-5, true)).toBe("00:00.000");
  });

  it("toSRT and toVTT roll over 999.8ms cleanly instead of emitting ,1000", () => {
    const srt = toSRT([{ start: 1.9998, end: 59.9999, lines: ["Test"] }]);
    expect(srt).toContain("00:00:02,000 --> 00:01:00,000");
    expect(srt).not.toContain(",1000");

    const vtt = toVTT([{ start: 1.9998, end: 59.9999, lines: ["Test"] }]);
    expect(vtt).toContain("00:00:02.000 --> 00:01:00.000");
    expect(vtt).not.toContain(".1000");
  });
});

describe("toArabicDigits", () => {
  it("converts Western digits to Arabic-Indic digits", () => {
    expect(toArabicDigits(1)).toBe("١");
    expect(toArabicDigits(282)).toBe("٢٨٢");
    expect(toArabicDigits(114)).toBe("١١٤");
  });
});

describe("Quranic text integrity in splitArabic & buildCaptions", () => {
  // Sample with tashkeel, waqf signs (U+06D6, U+06DA, U+06D7), and long structure (inspired by 2:282)
  const sampleWithWaqf =
    "يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰٓ أَجَلٍۢ مُّسَمًّى فَٱكْتُبُوهُ ۚ وَلْيَكْتُب بَّيْنَكُمْ كَاتِبٌۢ بِٱلْعَدْلِ ۚ وَلَا يَأْبَ كَاتِبٌ أَن يَكْتُبَ كَمَا عَلَّمَهُ ٱللَّهُ ۚ فَلْيَكْتُبْ وَلْيُمْلِلِ ٱلَّذِى عَلَيْهِ ٱلْحَقُّ وَلْيَتَّقِ ٱللَّهَ رَبَّهُۥ وَلَا يَبْخَسْ مِنْهُ شَيْـًۭٔا ۚ فَإِن كَانَ ٱلَّذِى عَلَيْهِ ٱلْحَقُّ سَفِيهًا أَوْ ضَعِيفًا أَوْ لَا يَسْتَطِيعُ أَن يُمِلَّ هُوَ فَلْيُمْلِلْ وَلِيُّهُۥ بِٱلْعَدْلِ ۚ";

  it("preserves every Arabic character, diacritic, and waqf mark when splitting", () => {
    const parts = splitArabic(sampleWithWaqf, 60);
    expect(parts.length).toBeGreaterThan(1);
    const rejoined = parts.join(" ");
    expect(rejoined).toBe(sampleWithWaqf);
    // Verify waqf signs (U+06DA) are intact
    expect(rejoined.match(/\u06DA/g)?.length).toBe(sampleWithWaqf.match(/\u06DA/g)?.length);
  });

  it("prefers splitting at waqf marks without breaking words", () => {
    const parts = splitArabic(sampleWithWaqf, 100);
    for (const p of parts) {
      expect(p.trim().length).toBeGreaterThan(0);
    }
    expect(parts.join(" ")).toBe(sampleWithWaqf);
  });

  it("buildCaptions preserves Arabic text, translations, transliteration, and verse key", () => {
    const verses: Verse[] = [
      {
        key: "2:282",
        n: 282,
        arabic: sampleWithWaqf,
        translations: {
          sahih_international: "O you who have believed, when you contract a debt for a specified term, write it down.",
          french: "Ô les croyants! Quand vous contractez une dette à échéance déterminée, mettez-la en écrit.",
          transliteration: "Ya ayyuha allatheena amanoo...",
        },
        start: 10,
        end: 30,
      },
    ];
    const result = buildCaptions(
      verses,
      { arabic: true, tr1: "sahih_international", tr2: "french", translit: true, verseKey: true },
      0,
      { enabled: true, maxAr: 60, maxTr: 90 },
    );
    expect(result.length).toBeGreaterThan(1);
    expect(result[0].start).toBe(0);
    expect(result[result.length - 1].end).toBe(20);
    expect(result[result.length - 1].lines[0]).toContain("﴿٢٨٢﴾");
    // Rejoin Arabic lines (stripping appended verse key) and confirm exact match
    const arRejoined = result.map((c) => c.lines[0]).join(" ").replace(" ﴿٢٨٢﴾", "");
    expect(arRejoined).toBe(sampleWithWaqf);
    // Confirm both translations and transliteration are present
    const translitJoined = result.map((c) => c.lines[1]).join(" ");
    const tr1Joined = result.map((c) => c.lines[2]).join(" ");
    const tr2Joined = result.map((c) => c.lines[3]).join(" ");
    expect(translitJoined).toContain("Ya ayyuha");
    expect(tr1Joined).toContain("contract a debt");
    expect(tr2Joined).toContain("contractez une dette");
  });

  it("handles zero/negative offset clamping and empty verse lists", () => {
    expect(buildCaptions([], { arabic: true, tr1: null, tr2: null, translit: false, verseKey: false }, 0)).toEqual([]);
    const v: Verse[] = [{ key: "1:1", n: 1, arabic: "بِسْمِ ٱللَّهِ", translations: {}, start: 5, end: 10 }];
    const shifted = buildCaptions(v, { arabic: true, tr1: null, tr2: null, translit: false, verseKey: false }, -2);
    expect(shifted[0].start).toBe(0);
    expect(shifted[0].end).toBe(3);
  });
});

describe("splitText", () => {
  it("splits long translations at sentence/comma boundaries without losing words", () => {
    const text = "In the name of Allah, the Entirely Merciful, the Especially Merciful. All praise is due to Allah, Lord of the worlds.";
    const parts = splitText(text, 50);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(" ")).toBe(text);
  });
});

describe("creditLines", () => {
  it("formats translator attribution and UmmahAPI credit", () => {
    const lines = creditLines([
      { name: "Sahih International", author: "Saheeh International", language: "english" },
      { name: "French", author: "", language: "french" },
    ]);
    expect(lines).toEqual([
      "Translation (english): Sahih International, Saheeh International",
      "Translation (french): French",
      "Quran data via UmmahAPI",
    ]);
  });
});

describe("toSRT", () => {
  it("produces numbered SRT blocks with comma milliseconds", () => {
    const out = toSRT(caps);
    expect(out).toContain("1\n00:00:00,000 --> 00:00:05,000");
    expect(out).toContain("بِسْمِ اللَّهِ\nIn the name of Allah");
    expect(out).toContain("2\n00:00:05,000 --> 00:00:11,000");
    expect(out.split("\n\n").filter(Boolean).length).toBe(2);
  });

  it("appends credit lines after the last caption", () => {
    const out = toSRT(caps, ["Translation (english): Saheeh International", "Quran data via UmmahAPI"]);
    const last = out.trim().split("\n\n").pop()!;
    expect(last).toContain("Translation (english): Saheeh International");
    expect(last).toContain("Quran data via UmmahAPI");
  });
});

describe("toVTT", () => {
  it("produces WEBVTT header with dot milliseconds", () => {
    const out = toVTT(caps);
    expect(out.startsWith("WEBVTT\n\n")).toBe(true);
    expect(out).toContain("00:00:00.000 --> 00:00:05.000");
    expect(out).toContain("بِسْمِ اللَّهِ");
  });

  it("writes credit as a NOTE block", () => {
    const out = toVTT(caps, ["Quran data via UmmahAPI"]);
    expect(out).toContain("NOTE\nQuran data via UmmahAPI");
  });
});
