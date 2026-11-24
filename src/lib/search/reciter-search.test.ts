import { describe, it, expect } from "vitest";
import { filterReciters, normalizeReciterString } from "./reciter-search";

const SAMPLE_RECITERS = [
  { id: 123, name: "Mishary Alafasi", nameArabic: "مشاري العفاسي" },
  { id: 54, name: "Abdulrahman Alsudaes", nameArabic: "عبدالرحمن السديس" },
  { id: 259, name: "Ahmad Al Nufais", nameArabic: "أحمد النفيس" },
  { id: 5, name: "Ahmad Al-Ajmy", nameArabic: "أحمد بن علي العجمي" },
  { id: 6, name: "Ahmad Al-Hawashi", nameArabic: "أحمد الحواشي" },
  { id: 13, name: "Alzain Mohammad Ahmad", nameArabic: "الزين محمد أحمد" },
  { id: 55, name: "Abdul Aziz Al-Ahmad", nameArabic: "عبدالعزيز الأحمد" },
];

describe("reciter-search", () => {
  it("normalizes Arabic transliterations accurately", () => {
    expect(normalizeReciterString("Ahmed")).toBe("ahmad");
    expect(normalizeReciterString("Nufeis")).toBe("nufais");
    expect(normalizeReciterString("Ahmad Al-Nufais")).toBe("ahmad nufais");
    expect(normalizeReciterString("Mohammed")).toBe("muhammad");
  });

  it("finds Ahmad Al Nufais when searching 'Ahmed Nufeis'", () => {
    const results = filterReciters(SAMPLE_RECITERS, "Ahmed Nufeis");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("Ahmad Al Nufais");
  });

  it("finds Ahmad Al Nufais when searching 'Nufeis'", () => {
    const results = filterReciters(SAMPLE_RECITERS, "Nufeis");
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Ahmad Al Nufais");
  });

  it("finds Ahmad Al Nufais when searching with first name 'Ahmed'", () => {
    const results = filterReciters(SAMPLE_RECITERS, "Ahmed");
    const names = results.map((r) => r.name);
    expect(names).toContain("Ahmad Al Nufais");
    expect(names).toContain("Ahmad Al-Ajmy");
    expect(names).toContain("Ahmad Al-Hawashi");
  });

  it("finds Ahmad Al Nufais when searching with first name 'Ahmad'", () => {
    const results = filterReciters(SAMPLE_RECITERS, "Ahmad");
    const names = results.map((r) => r.name);
    expect(names).toContain("Ahmad Al Nufais");
  });

  it("finds reciter using Arabic name 'أحمد النفيس'", () => {
    const results = filterReciters(SAMPLE_RECITERS, "أحمد النفيس");
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Ahmad Al Nufais");
  });

  it("returns full list on empty query", () => {
    const results = filterReciters(SAMPLE_RECITERS, "");
    expect(results).toEqual(SAMPLE_RECITERS);
  });
});
