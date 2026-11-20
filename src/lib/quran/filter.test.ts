import { describe, it, expect } from "vitest";
import { filterChapters } from "./filter";
import type { Chapter } from "./server";

const mockChapters: Chapter[] = [
  { id: 1, nameSimple: "Al-Fatihah", nameArabic: "الفاتحة", meaning: "The Opener", versesCount: 7, available: true },
  { id: 2, nameSimple: "Al-Baqarah", nameArabic: "البقرة", meaning: "The Cow", versesCount: 286, available: true },
  { id: 3, nameSimple: "Ali 'Imran", nameArabic: "آل عمران", meaning: "Family of Imran", versesCount: 200, available: true },
  { id: 112, nameSimple: "Al-Ikhlas", nameArabic: "الإخلاص", meaning: "The Sincerity", versesCount: 4, available: true },
  { id: 114, nameSimple: "An-Nas", nameArabic: "الناس", meaning: "Mankind", versesCount: 6, available: true },
];

describe("filterChapters", () => {
  it("filters by surah number", () => {
    const res = filterChapters(mockChapters, "2");
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe(2);
  });

  it("filters by English name", () => {
    const res = filterChapters(mockChapters, "Al-Baqarah");
    expect(res).toHaveLength(1);
    expect(res[0].nameSimple).toBe("Al-Baqarah");
  });

  it("filters by partial name", () => {
    const res = filterChapters(mockChapters, "baq");
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe(2);
  });

  it("filters with a hyphen or spaces", () => {
    const resHyphen = filterChapters(mockChapters, "al-baqarah");
    expect(resHyphen).toHaveLength(1);
    expect(resHyphen[0].id).toBe(2);

    const resSpace = filterChapters(mockChapters, "al baqarah");
    expect(resSpace).toHaveLength(1);
    expect(resSpace[0].id).toBe(2);
  });

  it("filters by Arabic name with or without diacritics", () => {
    const res = filterChapters(mockChapters, "البقرة");
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe(2);

    const resWithTashkeel = filterChapters(mockChapters, "الْبَقَرَةِ");
    expect(resWithTashkeel).toHaveLength(1);
    expect(resWithTashkeel[0].id).toBe(2);
  });

  it("returns everything on an empty query", () => {
    expect(filterChapters(mockChapters, "")).toEqual(mockChapters);
    expect(filterChapters(mockChapters, "   ")).toEqual(mockChapters);
  });

  it("returns an empty list when there is no match", () => {
    expect(filterChapters(mockChapters, "zzz")).toEqual([]);
  });
});
