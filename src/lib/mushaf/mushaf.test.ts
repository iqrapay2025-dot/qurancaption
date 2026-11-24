import { describe, it, expect } from "vitest";
import {
  SURAHS_META,
  JUZS_META,
  getSurahByPage,
  getJuzByPage,
  getSurahMeta,
} from "./data";

describe("Mushaf Data & Helpers", () => {
  it("should contain all 114 surahs", () => {
    expect(SURAHS_META).toHaveLength(114);
    expect(SURAHS_META[0].name_simple).toBe("Al-Fatihah");
    expect(SURAHS_META[113].name_simple).toBe("An-Nas");
  });

  it("should contain all 30 juz", () => {
    expect(JUZS_META).toHaveLength(30);
    expect(JUZS_META[0].juz_number).toBe(1);
    expect(JUZS_META[0].start_page).toBe(1);
    expect(JUZS_META[29].juz_number).toBe(30);
    expect(JUZS_META[29].start_page).toBe(582);
  });

  it("should correctly find surahs on a page", () => {
    const page1Surahs = getSurahByPage(1);
    expect(page1Surahs.map((s) => s.id)).toEqual([1]);

    const page604Surahs = getSurahByPage(604);
    expect(page604Surahs.map((s) => s.id)).toEqual([112, 113, 114]);

    const page106Surahs = getSurahByPage(106);
    // Page 106 contains end of An-Nisa (4) and start of Al-Ma'idah (5)
    expect(page106Surahs.map((s) => s.id)).toContain(4);
    expect(page106Surahs.map((s) => s.id)).toContain(5);
  });

  it("should correctly identify juz numbers by page", () => {
    expect(getJuzByPage(1)).toBe(1);
    expect(getJuzByPage(21)).toBe(1);
    expect(getJuzByPage(22)).toBe(2);
    expect(getJuzByPage(187)).toBe(10);
    expect(getJuzByPage(604)).toBe(30);
  });

  it("should fetch surah metadata by id", () => {
    const fatihah = getSurahMeta(1);
    expect(fatihah?.name_arabic).toBe("الفاتحة");
    expect(fatihah?.verses_count).toBe(7);
    expect(fatihah?.start_page).toBe(1);

    const ikhlas = getSurahMeta(112);
    expect(ikhlas?.name_simple).toBe("Al-Ikhlas");
    expect(ikhlas?.verses_count).toBe(4);
    expect(ikhlas?.start_page).toBe(604);
  });
});
