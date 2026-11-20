import { describe, it, expect } from "vitest";
import { buildMistakeReportMailto } from "./mistake-report";
import { SITE } from "./site";

describe("Mistake Report Mailto Builder (Prompt 6)", () => {
  it("builds a mailto URL with the correct address and subject", () => {
    const mailto = buildMistakeReportMailto("https://example.com/quran/2");
    expect(mailto).toContain(`mailto:${SITE.email}?`);
    expect(mailto).toContain("subject=Mistake%20report");
  });

  it("encodes subject and body correctly with spaces, &, and special characters", () => {
    const complexUrl = "https://example.com/quran/36?ayah=5&ref=test%20&arabic=يس";
    const mailto = buildMistakeReportMailto(complexUrl);

    expect(mailto).toContain("Tell%20us%20what%20you%20found%20and%20where.");
    // Verify it doesn't break query parameters or raw unescaped &
    const queryPart = mailto.slice(mailto.indexOf("?") + 1);
    const parsed = new URLSearchParams(queryPart);
    expect(parsed.get("subject")).toBe("Mistake report");
    expect(parsed.get("body")).toContain("Tell us what you found and where.");
    expect(parsed.get("body")).toContain(complexUrl);
  });
});
