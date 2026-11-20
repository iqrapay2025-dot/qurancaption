import { describe, it, expect } from "vitest";
import coverage from "./audio-coverage.json";

describe("audio-coverage.json", () => {
  it("has valid schema for every reciter entry", () => {
    expect(Array.isArray(coverage)).toBe(true);
    expect(coverage.length).toBeGreaterThan(0);

    for (const entry of coverage) {
      expect(typeof entry.reciterId).toBe("number");
      expect(Number.isInteger(entry.reciterId)).toBe(true);
      expect(typeof entry.complete).toBe("boolean");
      expect(Array.isArray(entry.missingSurahs)).toBe(true);
      for (const s of entry.missingSurahs) {
        expect(typeof s).toBe("number");
      }
    }
  });

  it("has the default reciter (ID: 1) marked complete", () => {
    const defaultReciter = coverage.find((entry) => entry.reciterId === 1);
    expect(defaultReciter).toBeDefined();
    expect(defaultReciter?.complete).toBe(true);
    expect(defaultReciter?.missingSurahs).toEqual([]);
  });
});
