import { describe, it, expect } from "vitest";
import { parseSurahParam, adjacentSurahs, showSeparateBismillah } from "./reader";

describe("parseSurahParam", () => {
  it("accepts valid values from 1 to 114", () => {
    expect(parseSurahParam("1")).toBe(1);
    expect(parseSurahParam("2")).toBe(2);
    expect(parseSurahParam("114")).toBe(114);
  });

  it("returns null for invalid inputs: 0, 115, abc, 2abc, 02, empty string", () => {
    expect(parseSurahParam("0")).toBeNull();
    expect(parseSurahParam("115")).toBeNull();
    expect(parseSurahParam("abc")).toBeNull();
    expect(parseSurahParam("2abc")).toBeNull();
    expect(parseSurahParam("02")).toBeNull();
    expect(parseSurahParam("001")).toBeNull();
    expect(parseSurahParam("")).toBeNull();
    expect(parseSurahParam("-1")).toBeNull();
  });
});

describe("adjacentSurahs", () => {
  it("returns null prev at surah 1", () => {
    const res = adjacentSurahs(1);
    expect(res.prev).toBeNull();
    expect(res.next).toEqual({ id: 2, nameSimple: "Al-Baqarah" });
  });

  it("returns null next at surah 114", () => {
    const res = adjacentSurahs(114);
    expect(res.prev).toEqual({ id: 113, nameSimple: "Al-Falaq" });
    expect(res.next).toBeNull();
  });

  it("returns both prev and next in the middle", () => {
    const res = adjacentSurahs(2);
    expect(res.prev).toEqual({ id: 1, nameSimple: "Al-Fatihah" });
    expect(res.next).toEqual({ id: 3, nameSimple: "Ali 'Imran" });
  });
});

describe("showSeparateBismillah", () => {
  it("returns false for Al-Fatihah (surah 1)", () => {
    expect(showSeparateBismillah(1)).toBe(false);
  });

  it("returns true for Al-Baqarah (surah 2)", () => {
    expect(showSeparateBismillah(2)).toBe(true);
  });

  it("returns false for At-Tawbah (surah 9)", () => {
    expect(showSeparateBismillah(9)).toBe(false);
  });

  it("returns true for other surahs like 112", () => {
    expect(showSeparateBismillah(112)).toBe(true);
  });
});
