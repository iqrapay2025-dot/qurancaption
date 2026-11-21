import { describe, it, expect } from "vitest";
import { parseParagraphs } from "./server";

describe("parseParagraphs", () => {
  it("returns empty array for empty or whitespace input", () => {
    expect(parseParagraphs("")).toEqual([]);
    expect(parseParagraphs("   ")).toEqual([]);
    expect(parseParagraphs(null as any)).toEqual([]);
    expect(parseParagraphs(undefined as any)).toEqual([]);
  });

  it("preserves real paragraph breaks from HTML tags like <p>, <br>, <div>, <li>", () => {
    const html = "<p>First paragraph.</p><p>Second paragraph with <br/>a line break.</p>";
    const res = parseParagraphs(html);
    expect(res.length).toBeGreaterThanOrEqual(2);
    expect(res[0]).toBe("First paragraph.");
    expect(res[1]).toContain("Second paragraph with");
    expect(res[1]).toContain("a line break.");
  });

  it("decodes HTML entities and strips tags safely without raw HTML", () => {
    const raw = "The Prophet &amp; his companions said &quot;Praise be to Allah&quot; &lt;peace be upon him&gt; &#39;test&#39; &mdash; note.";
    const res = parseParagraphs(raw);
    expect(res[0]).toContain('The Prophet & his companions said "Praise be to Allah" <peace be upon him> \'test\' — note.');
    expect(res[0]).not.toContain("&amp;");
    expect(res[0]).not.toContain("&quot;");
    expect(res[0]).not.toContain("&mdash;");
  });

  it("splits a single huge paragraph at sentence boundaries into readable paragraphs", () => {
    const huge =
      "This is the first sentence about tafsir. This is the second sentence explaining the context. This is the third sentence discussing scholarly consensus. Here is the fourth sentence providing additional evidence. Next comes the fifth sentence with another insight. Finally the sixth sentence concludes the thought.";
    const res = parseParagraphs(huge);
    expect(res.length).toBeGreaterThan(1);
    for (const p of res) {
      expect(p.length).toBeGreaterThan(0);
      expect(p.trim()).toBe(p);
    }
  });

  it("does not split inside bracketed references like (2:255) or [al-Baqarah 2:255]", () => {
    const textWithRef =
      "Allah describes His greatness in Ayat al-Kursi (2:255). This verse is recognized by all scholars [al-Baqarah 2:255] as the greatest verse in the Qur'an. It contains ten independent phrases.";
    const res = parseParagraphs(textWithRef);
    const joined = res.join(" ");
    expect(joined).toContain("(2:255)");
    expect(joined).toContain("[al-Baqarah 2:255]");
    // Ensure (2:255) was not split at the colon or number
    for (const p of res) {
      expect(p).not.toBe("(2");
      expect(p).not.toBe("255)");
    }
  });

  it("handles Arabic sentence endings correctly (., ؟, ۔)", () => {
    const arabic =
      "أبتدئ قراءة القرآن باسم الله مستعينا به. الله علم على الرب تبارك وتعالى؟ وهما اسمان من أسمائه تعالى يتضمنان إثبات صفة الرحمة لله تعالى كما يليق بجلاله۔ وهذا قول الجمهور.";
    const res = parseParagraphs(arabic);
    expect(res.length).toBeGreaterThan(0);
    for (const p of res) {
      expect(p.trim()).toBe(p);
    }
  });

  it("keeps quotes or headings as separate readable blocks", () => {
    const text =
      "The Meaning of Al-Fatihah:\nThis Surah is called Al-Fatihah, that is, the Opener of the Book.\n«هِيَ أُمُّ الْقُرْآنِ وَهِيَ السَّبْعُ الْمَثَانِي»\nIt is the mother of the Qur'an.";
    const res = parseParagraphs(text);
    expect(res.length).toBeGreaterThanOrEqual(3);
    expect(res).toContain("The Meaning of Al-Fatihah:");
    expect(res).toContain("«هِيَ أُمُّ الْقُرْآنِ وَهِيَ السَّبْعُ الْمَثَانِي»");
  });
});
