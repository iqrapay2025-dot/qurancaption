import { describe, it, expect } from "vitest";
import {
  generateMasteryQuiz,
  calculateMasteryVerdict,
} from "./mastery-quiz";
import { MushafLine } from "@/lib/mushaf/types";

describe("Authentic Quran Spot-Check Recitation Generator (Imtihan)", () => {
  const mockLines: MushafLine[] = [
    {
      line_number: 1,
      type: "text",
      words: [
        {
          id: 1,
          position: 1,
          verse_key: "1:1",
          page_number: 1,
          line_number: 1,
          code_v2: "code1",
          text_uthmani: "بِسْمِ",
          char_type_name: "word",
        },
        {
          id: 2,
          position: 2,
          verse_key: "1:1",
          page_number: 1,
          line_number: 1,
          code_v2: "code2",
          text_uthmani: "اللَّهِ",
          char_type_name: "word",
        },
        {
          id: 3,
          position: 3,
          verse_key: "1:1",
          page_number: 1,
          line_number: 1,
          code_v2: "code3",
          text_uthmani: "الرَّحْمَٰنِ",
          char_type_name: "word",
        },
        {
          id: 4,
          position: 4,
          verse_key: "1:1",
          page_number: 1,
          line_number: 1,
          code_v2: "code4",
          text_uthmani: "الرَّحِيمِ",
          char_type_name: "word",
        },
      ],
    },
    {
      line_number: 2,
      type: "text",
      words: [
        {
          id: 5,
          position: 1,
          verse_key: "1:2",
          page_number: 1,
          line_number: 2,
          code_v2: "code5",
          text_uthmani: "الْحَمْدُ",
          char_type_name: "word",
        },
        {
          id: 6,
          position: 2,
          verse_key: "1:2",
          page_number: 1,
          line_number: 2,
          code_v2: "code6",
          text_uthmani: "لِلَّهِ",
          char_type_name: "word",
        },
        {
          id: 7,
          position: 3,
          verse_key: "1:2",
          page_number: 1,
          line_number: 2,
          code_v2: "code7",
          text_uthmani: "رَبِّ",
          char_type_name: "word",
        },
        {
          id: 8,
          position: 4,
          verse_key: "1:2",
          page_number: 1,
          line_number: 2,
          code_v2: "code8",
          text_uthmani: "الْعَالَمِينَ",
          char_type_name: "word",
        },
      ],
    },
  ];

  // Multi-verse lines simulating 10 verses (e.g. Surah Al-Mulk or Al-Baqarah)
  const tenVerseLines: MushafLine[] = Array.from({ length: 10 }, (_, i) => ({
    line_number: i + 1,
    type: "text",
    words: [
      {
        id: (i + 1) * 10 + 1,
        position: 1,
        verse_key: `67:${i + 1}`,
        page_number: 562,
        line_number: i + 1,
        code_v2: `c_${i}_1`,
        text_uthmani: `آيَةُ_${i + 1}`,
        char_type_name: "word",
      },
      {
        id: (i + 1) * 10 + 2,
        position: 2,
        verse_key: `67:${i + 1}`,
        page_number: 562,
        line_number: i + 1,
        code_v2: `c_${i}_2`,
        text_uthmani: `كَلِمَةُ_${i + 1}`,
        char_type_name: "word",
      },
    ],
  }));

  it("generates 3 random spot-check stages for portions with 5+ verses", () => {
    const quiz = generateMasteryQuiz(tenVerseLines, "Surah Al-Mulk 1–10");
    expect(quiz.unitLabel).toBe("Surah Al-Mulk 1–10");
    expect(quiz.totalVersesInUnit).toBe(10);
    expect(quiz.stages.length).toBe(3);

    // Each stage has clear prompts and non-empty verses
    quiz.stages.forEach((stage, idx) => {
      expect(stage.stageNumber).toBe(idx + 1);
      expect(stage.totalStages).toBe(3);
      expect(stage.promptInstruction).toMatch(/Start reciting from Ayah \d+/);
      expect(stage.promptVerseArabic).toBeTruthy();
      expect(stage.scopeDescription).toBeTruthy();
      expect(stage.passageWords.length).toBeGreaterThanOrEqual(2);
    });

    // Check that starting points are distributed across the portion (not all from beginning)
    const startingAyahs = quiz.stages.map((s) => s.ayahNumber);
    expect(startingAyahs[0]).toBeGreaterThan(1); // Middle spot check
  });

  it("generates 2 stages for smaller 2-4 verse portions", () => {
    const quiz = generateMasteryQuiz(mockLines, "Page 1, Lines 1–2");
    expect(quiz.stages.length).toBe(2);
    expect(quiz.stages[0].promptVerseArabic).toContain("الْحَمْدُ");
    expect(quiz.stages[1].promptVerseArabic).toContain("بِسْمِ");
  });

  it("handles single-verse portion gracefully with 2-part split", () => {
    const singleVerseLines: MushafLine[] = [
      {
        line_number: 1,
        type: "text",
        words: [
          {
            id: 1,
            position: 1,
            verse_key: "112:1",
            page_number: 604,
            line_number: 1,
            code_v2: "c1",
            text_uthmani: "قُلْ",
            char_type_name: "word",
          },
          {
            id: 2,
            position: 2,
            verse_key: "112:1",
            page_number: 604,
            line_number: 1,
            code_v2: "c2",
            text_uthmani: "هُوَ",
            char_type_name: "word",
          },
          {
            id: 3,
            position: 3,
            verse_key: "112:1",
            page_number: 604,
            line_number: 1,
            code_v2: "c3",
            text_uthmani: "اللَّهُ",
            char_type_name: "word",
          },
          {
            id: 4,
            position: 4,
            verse_key: "112:1",
            page_number: 604,
            line_number: 1,
            code_v2: "c4",
            text_uthmani: "أَحَدٌ",
            char_type_name: "word",
          },
        ],
      },
    ];

    const quiz = generateMasteryQuiz(singleVerseLines, "Surah Al-Ikhlas 112:1");
    expect(quiz.stages.length).toBe(2);
    expect(quiz.stages[0].promptVerseArabic).toContain("قُلْ");
    expect(quiz.stages[1].promptInstruction).toContain("middle");
  });
});

describe("Mastery Verdict Calculation", () => {
  it("grades flawless recitation (3/3 stages passed, 0 mistakes) as strong", () => {
    const verdict = calculateMasteryVerdict(3, 3, 0);
    expect(verdict.rating).toBe("strong");
    expect(verdict.sabaqResult).toBe("yes");
    expect(verdict.badgeColor).toBe("emerald");
    expect(verdict.description).toContain("5–8 days");
  });

  it("grades recitation with 1 mistake or hesitation as okay", () => {
    // 3 stages, 2 passed cleanly, 1 slip
    const verdict = calculateMasteryVerdict(2, 3, 1);
    expect(verdict.rating).toBe("okay");
    expect(verdict.sabaqResult).toBe("yes");
    expect(verdict.badgeColor).toBe("sky");
    expect(verdict.description).toContain("2–4 days");
  });

  it("grades recitation with multiple mistakes as weak", () => {
    const verdict = calculateMasteryVerdict(1, 3, 3);
    expect(verdict.rating).toBe("weak");
    expect(verdict.sabaqResult).toBe("partly");
    expect(verdict.badgeColor).toBe("amber");
    expect(verdict.description).toContain("tomorrow");
  });
});
