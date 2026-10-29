import { describe, it, expect } from "vitest";
import { formatNgnEstimate } from "./currency";

describe("formatNgnEstimate", () => {
  it("rounds PRO_PRICE_NGN * rate to nearest 50 and formats with thousands separators", () => {
    // 8075.22 * 1 = 8075.22 → rounds to 8,100
    expect(formatNgnEstimate(1)).toBe("8,100");
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