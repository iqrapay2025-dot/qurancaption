import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION, SEO_TITLE } from "./brand";

describe("Brand constants", () => {
  it("has valid non-empty brand constants", () => {
    expect(BRAND_NAME).toBeTruthy();
    expect(BRAND_TAGLINE).toBeTruthy();
    expect(BRAND_DESCRIPTION).toBeTruthy();
    expect(SEO_TITLE).toBeTruthy();
  });

  it("SEO_TITLE contains BRAND_NAME", () => {
    expect(SEO_TITLE).toContain(BRAND_NAME);
  });
});

describe("Old brand name scan in src/", () => {
  // Allow-list for internal / preserved items as specified in Step 3:
  // - The contact email address: aayahstudiomail@gmail.com
  // - Internal User-Agent header: QuranCaptionStudio/1.0 in server.ts
  // - Test files that specifically test old string rejection
  const ALLOW_LIST: Record<string, string[]> = {
    // server.ts uses QuranCaptionStudio/1.0 as internal User-Agent header
    "server.ts": ["QuranCaptionStudio/1.0"],
    // contact email address is preserved as aayahstudiomail@gmail.com
    "site.ts": ["aayahstudiomail@gmail.com"],
    "Landing.tsx": ["aayahstudiomail@gmail.com"],
    "LegalPage.tsx": ["aayahstudiomail@gmail.com"],
    "brand.test.ts": ["Quran Caption Studio", "QuranCaptionStudio", "aayahstudiomail@gmail.com"],
  };

  function scanFolder(dir: string, violations: { file: string; line: number; text: string }[]) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== ".git") {
          scanFolder(fullPath, violations);
        }
      } else if (entry.isFile() && /\.(tsx?|jsx?|html|json)$/.test(entry.name)) {
        const basename = entry.name;
        const allowedPatterns = ALLOW_LIST[basename] ?? [];
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split(/\r?\n/);
        lines.forEach((line, idx) => {
          // Check for user-visible old name (ignoring casing)
          if (/Quran\s*Caption\s*Studio/i.test(line)) {
            const isAllowed = allowedPatterns.some((allowed) => line.includes(allowed));
            if (!isAllowed) {
              violations.push({ file: fullPath, line: idx + 1, text: line.trim() });
            }
          }
        });
      }
    }
    return violations;
  }

  it("ensures old name does not appear in user-visible files", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const violations = scanFolder(srcDir, []);
    expect(violations).toEqual([]);
  });
});
