import { describe, expect, it } from "vitest";
import {
  GUIDE_FAQ,
  GUIDE_STEPS,
  GUIDE_TROUBLESHOOTING,
} from "./guide";
import { shouldShowGuideHint } from "./guideHint";

describe("guide content", () => {
  it("has steps and troubleshooting answers with no empty text", () => {
    expect(GUIDE_STEPS.length).toBeGreaterThan(0);
    expect(GUIDE_TROUBLESHOOTING.length).toBeGreaterThan(0);
    expect(
      [...GUIDE_STEPS.map((step) => [step.title, step.body]), ...GUIDE_TROUBLESHOOTING.map((issue) => [issue.problem, issue.solution])]
        .flat()
        .every((text) => text.trim().length > 0),
    ).toBe(true);
    expect(GUIDE_FAQ.length).toBeGreaterThan(0);
  });
});

describe("first-visit guide hint", () => {
  it("shows until the user dismisses it", () => {
    expect(shouldShowGuideHint(null)).toBe(true);
    expect(shouldShowGuideHint("0")).toBe(true);
    expect(shouldShowGuideHint("1")).toBe(false);
  });
});
