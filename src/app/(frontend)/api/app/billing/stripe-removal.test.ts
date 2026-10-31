import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("stripe removal", () => {
  it("no billing/portal references in src non-test files", () => {
    const files = walk(path.join(process.cwd(), "src"));
    const offenders: string[] = [];
    for (const f of files) {
      if (f.includes(".test.")) continue;
      const content = fs.readFileSync(f, "utf8");
      if (content.includes("billing/portal")) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("stripe webhook route file does not exist", () => {
    const p = path.join(process.cwd(), "src/app/(frontend)/api/app/billing/webhook/stripe/route.ts");
    expect(fs.existsSync(p)).toBe(false);
  });
});
