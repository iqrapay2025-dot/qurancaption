import { describe, expect, it } from "vitest";
import {
  GUIDE_SECTIONS,
  GUIDE_STEPS,
  GUIDE_FREE_LIMITS,
  GUIDE_PRO_FEATURES,
  GUIDE_TROUBLESHOOTING,
  GUIDE_FAQ,
  GUIDE_HINT_DISMISSED_KEY,
  shouldShowGuideHint,
} from "./guide";

describe("GUIDE_SECTIONS structure and integrity", () => {
  it("contains all expected 11 guide sections in logical sequence", () => {
    const expectedIds = [
      "welcome",
      "read",
      "mushaf",
      "listen",
      "adhkar",
      "daily-ayah",
      "editor",
      "account",
      "plans",
      "troubleshooting",
      "faq",
    ];
    const actualIds = GUIDE_SECTIONS.map((s) => s.id);
    expect(actualIds).toEqual(expectedIds);
  });

  it("ensures every section has a unique id, non-empty title, navTitle, and summary", () => {
    const ids = new Set<string>();

    for (const section of GUIDE_SECTIONS) {
      expect(ids.has(section.id)).toBe(false);
      ids.add(section.id);

      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.navTitle.trim().length).toBeGreaterThan(0);
      expect(section.summary.trim().length).toBeGreaterThan(0);

      if (section.subsections) {
        expect(section.subsections.length).toBeGreaterThan(0);
        for (const sub of section.subsections) {
          expect(sub.title.trim().length).toBeGreaterThan(0);
          expect(sub.body.trim().length).toBeGreaterThan(0);
        }
      }

      if (section.tourId) {
        expect([
          "welcome",
          "quran-reader",
          "mushaf",
          "listen",
          "adhkar",
          "editor",
          "bookmarks",
        ]).toContain(section.tourId);
        expect(section.tourRoute).toBeDefined();
        expect(section.tourLabel).toBeDefined();
      }

      if (section.pageHref) {
        expect(section.pageHref.startsWith("/")).toBe(true);
        expect(section.pageLabel).toBeDefined();
      }
    }
  });
});

describe("caption editor guide steps", () => {
  it("has exactly 8 editor steps with full body, short text, and tour targets", () => {
    expect(GUIDE_STEPS.length).toBe(8);

    GUIDE_STEPS.forEach((step, idx) => {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
      expect(step.short?.trim().length).toBeGreaterThan(0);
      expect(step.tourTarget?.trim().length).toBeGreaterThan(0);
      if (idx === 6) {
        expect(step.link).toEqual({
          href: "/editors",
          label: "See editor instructions",
        });
      }
    });
  });
});

describe("guide plan limits and features", () => {
  it("exports valid Free limits and Pro features descriptions", () => {
    expect(GUIDE_FREE_LIMITS.trim().length).toBeGreaterThan(20);
    expect(GUIDE_PRO_FEATURES.trim().length).toBeGreaterThan(20);
    expect(GUIDE_FREE_LIMITS).toContain("3 saved projects");
    expect(GUIDE_FREE_LIMITS).toContain("20 verses per export");
    expect(GUIDE_PRO_FEATURES).toContain("unlimited projects and verses");
  });
});

describe("guide troubleshooting", () => {
  it("has non-empty issues covering audio, reader, and editor problems", () => {
    expect(GUIDE_TROUBLESHOOTING.length).toBeGreaterThanOrEqual(8);

    const categories = new Set(GUIDE_TROUBLESHOOTING.map((t) => t.category));
    expect(categories.has("audio")).toBe(true);
    expect(categories.has("reader")).toBe(true);
    expect(categories.has("editor")).toBe(true);

    for (const item of GUIDE_TROUBLESHOOTING) {
      expect(item.problem.trim().length).toBeGreaterThan(0);
      expect(item.solution.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("guide FAQ", () => {
  it("has comprehensive FAQ covering reading, audio, PWA, bookmarks, and editor", () => {
    expect(GUIDE_FAQ.length).toBeGreaterThanOrEqual(8);

    for (const item of GUIDE_FAQ) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
    }

    const allQuestions = GUIDE_FAQ.map((f) => f.question.toLowerCase()).join(" ");
    expect(allQuestions).toContain("offline");
    expect(allQuestions).toContain("bookmarks");
    expect(allQuestions).toContain("install");
    expect(allQuestions).toContain("recitation");
  });
});

describe("first-visit guide hint", () => {
  it("exports GUIDE_HINT_DISMISSED_KEY and evaluates dismissal correctly", () => {
    expect(GUIDE_HINT_DISMISSED_KEY).toBe("qcs-guide-hint-dismissed");
    expect(shouldShowGuideHint(null)).toBe(true);
    expect(shouldShowGuideHint("0")).toBe(true);
    expect(shouldShowGuideHint("1")).toBe(false);
  });
});
