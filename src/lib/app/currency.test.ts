import { describe, it, expect } from "vitest";
import { formatNgnEstimate } from "./currency";

describe("formatNgnEstimate", () => {
  it("rounds 6 * rate to nearest 50 and formats with thousands separators", () => {
    // 6 * 1396.07 = 8376.42 → rounds to 8,400
    expect(formatNgnEstimate(1396.07)).toBe("8,400");
  });

  it("returns null when rate is null", () => {
    expect(formatNgnEstimate(null)).toBeNull();
  });

  it("returns null when rate is 0", () => {
    expect(formatNgnEstimate(0)).toBeNull();
  });

  it("returns null when rate is negative", () => {
    expect(formatNgnEstimate(-5)).toBeNull();
  });

  it("returns null when rate is NaN", () => {
    expect(formatNgnEstimate(NaN)).toBeNull();
  });

  it("returns null when rate is Infinity", () => {
    expect(formatNgnEstimate(Infinity)).toBeNull();
  });
});