import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { SITE } from "@/lib/site";

describe("sitemap", () => {
  it("includes /quran, /listen, and all 114 surah URLs", () => {
    const map = sitemap();
    const urls = map.map((entry) => entry.url);

    expect(urls).toContain(`${SITE.url}/quran`);
    expect(urls).toContain(`${SITE.url}/listen`);
    expect(urls).toContain(`${SITE.url}/sources`);
    expect(urls).toContain(`${SITE.url}/donate`);
    expect(urls).not.toContain(`${SITE.url}/donate/thank-you`);

    for (let i = 1; i <= 114; i++) {
      const surahUrl = `${SITE.url}/quran/${i}`;
      expect(urls).toContain(surahUrl);
      const entry = map.find((e) => e.url === surahUrl);
      expect(entry?.priority).toBe(0.6);
      expect(entry?.changeFrequency).toBe("monthly");
    }

    expect(urls.length).toBeGreaterThanOrEqual(116);
  });
});
