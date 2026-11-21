import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Performance & Size Budget Guards", () => {
  it("optimized WebP badges exist and are under 15KB each", () => {
    const brandDir = path.join(process.cwd(), "public/brand");

    const badges = [
      "ayah-badge-light-48.webp",
      "ayah-badge-dark-48.webp",
      "ayah-badge-light-96.webp",
      "ayah-badge-dark-96.webp",
      "ayah-badge-light-192.webp",
      "ayah-badge-dark-192.webp",
    ];

    for (const badge of badges) {
      const filePath = path.join(brandDir, badge);
      expect(fs.existsSync(filePath), `Expected ${badge} to exist`).toBe(true);
      const stat = fs.statSync(filePath);
      // Badges up to 192px must be <= 15KB (originals were 300KB!)
      expect(stat.size, `${badge} size should be under 15KB`).toBeLessThan(15 * 1024);
    }
  });

  it("48px badge WebP is under 3KB for instant mobile loading", () => {
    const brandDir = path.join(process.cwd(), "public/brand");
    const stat48Dark = fs.statSync(path.join(brandDir, "ayah-badge-dark-48.webp"));
    const stat48Light = fs.statSync(path.join(brandDir, "ayah-badge-light-48.webp"));

    expect(stat48Dark.size).toBeLessThan(3 * 1024);
    expect(stat48Light.size).toBeLessThan(3 * 1024);
  });

  it("monaco-editor is not imported in client source code", () => {
    const srcDir = path.join(process.cwd(), "src");
    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.includes(".test.")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          expect(content.includes('from "monaco-editor"')).toBe(false);
          expect(content.includes("from 'monaco-editor'")).toBe(false);
        }
      }
    };
    scanDir(srcDir);
  });
});
