import { describe, it, expect } from "vitest";
import { calculateVisibleRange } from "./windowing";

describe("Windowing range calculation", () => {
  it("returns full range when total items are small", () => {
    const range = calculateVisibleRange(15, 0, 800, 200, 5);
    expect(range.isVirtual).toBe(false);
    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(14);
  });

  it("calculates window with overscan for large list like Surah Al-Baqarah", () => {
    // 286 verses, scrolled to 2000px, 800px viewport, 200px per item
    // rawStart = 2000 / 200 = 10
    // visibleCount = 800 / 200 = 4
    // startIndex = max(0, 10 - 5) = 5
    // endIndex = min(285, 10 + 4 + 5) = 19
    const range = calculateVisibleRange(286, 2000, 800, 200, 5);
    expect(range.isVirtual).toBe(true);
    expect(range.startIndex).toBe(5);
    expect(range.endIndex).toBe(19);
  });

  it("clamps to zero at the top of scroll", () => {
    const range = calculateVisibleRange(286, 0, 800, 200, 5);
    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(9); // 0 + 4 + 5
  });

  it("clamps to totalItems - 1 at the end of scroll", () => {
    const range = calculateVisibleRange(286, 60000, 800, 200, 5);
    expect(range.endIndex).toBe(285);
  });
});
