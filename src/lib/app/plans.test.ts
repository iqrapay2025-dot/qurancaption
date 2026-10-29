import { describe, it, expect, vi } from "vitest";
import { monthKey, nextMonthStart, FREE_MONTHLY_VERSES, FREE_MONTHLY_PROJECT_CREATIONS } from "./plans";

describe("plans", () => {
  it("FREE_MONTHLY_VERSES is 40", () => {
    expect(FREE_MONTHLY_VERSES).toBe(40);
  });

  it("FREE_MONTHLY_PROJECT_CREATIONS is 10", () => {
    expect(FREE_MONTHLY_PROJECT_CREATIONS).toBe(10);
  });

  it("monthKey returns YYYY-MM in UTC", () => {
    // 2026-10-15 05:00 UTC -> "2026-10"
    expect(monthKey(new Date(Date.UTC(2026, 9, 15, 5, 0, 0)))).toBe("2026-10");
    // 2026-10-15 23:00 UTC -> "2026-10"
    expect(monthKey(new Date(Date.UTC(2026, 9, 15, 23, 0, 0)))).toBe("2026-10");
    // 2026-11-01 00:00 UTC -> "2026-11"
    expect(monthKey(new Date(Date.UTC(2026, 10, 1, 0, 0, 0)))).toBe("2026-11");
  });

  it("nextMonthStart returns first of next month UTC", () => {
    const start = nextMonthStart(new Date(Date.UTC(2026, 9, 15, 12, 0, 0)));
    expect(start.getUTCFullYear()).toBe(2026);
    expect(start.getUTCMonth()).toBe(10); // November
    expect(start.getUTCDate()).toBe(1);
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
  });

  it("nextMonthStart rolls over year", () => {
    const start = nextMonthStart(new Date(Date.UTC(2026, 11, 15, 12, 0, 0)));
    expect(start.getUTCFullYear()).toBe(2027);
    expect(start.getUTCMonth()).toBe(0); // January
    expect(start.getUTCDate()).toBe(1);
  });
});