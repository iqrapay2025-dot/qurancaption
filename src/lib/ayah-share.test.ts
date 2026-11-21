import { describe, it, expect } from "vitest";
import {
  validateAyahParams,
  trimAyahDescription,
  buildAyahShareUrl,
  calculateOgFontSize,
} from "./ayah-share";

describe("validateAyahParams", () => {
  it("accepts valid surah and ayah", () => {
    const res = validateAyahParams("2", "255");
    expect(res).not.toBeNull();
    expect(res?.surah).toBe(2);
    expect(res?.ayah).toBe(255);
    expect(res?.surahName).toBe("Al-Baqarah");
  });

  it("accepts numbers as inputs", () => {
    const res = validateAyahParams(1, 7);
    expect(res).not.toBeNull();
    expect(res?.surah).toBe(1);
    expect(res?.ayah).toBe(7);
    expect(res?.surahName).toBe("Al-Fatihah");
  });

  it("rejects surah 0 or > 114", () => {
    expect(validateAyahParams("0", "1")).toBeNull();
    expect(validateAyahParams("115", "1")).toBeNull();
    expect(validateAyahParams("-1", "1")).toBeNull();
  });

  it("rejects ayah outside surah range", () => {
    // Al-Fatihah has 7 verses
    expect(validateAyahParams("1", "8")).toBeNull();
    expect(validateAyahParams("1", "0")).toBeNull();
    // Al-Baqarah has 286 verses
    expect(validateAyahParams("2", "287")).toBeNull();
  });

  it("rejects leading zeros and malformed strings", () => {
    expect(validateAyahParams("01", "1")).toBeNull();
    expect(validateAyahParams("1", "007")).toBeNull();
    expect(validateAyahParams("abc", "1")).toBeNull();
    expect(validateAyahParams("1", "xyz")).toBeNull();
    expect(validateAyahParams(null, undefined)).toBeNull();
  });
});

describe("trimAyahDescription", () => {
  it("keeps short translations and appends suffix", () => {
    const shortText = "In the name of Allah, the Entirely Merciful, the Especially Merciful";
    const desc = trimAyahDescription(shortText);
    expect(desc).toContain(shortText);
    expect(desc).toContain("Read, listen and create Quran caption videos on Ayah Studio.");
  });

  it("trims long translations on word boundary with ellipsis", () => {
    const longText =
      "Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills.";
    const desc = trimAyahDescription(longText, 120);
    expect(desc).toContain("…");
    expect(desc.length).toBeLessThan(220);
    expect(desc).toContain("Read, listen and create Quran caption videos on Ayah Studio.");
    // Verify it didn't cut inside a word (e.g. no trailing broken fragment)
    const beforeEllipsis = desc.split("…")[0];
    expect(beforeEllipsis.endsWith(" ")).toBe(false);
  });

  it("handles empty or non-string input safely", () => {
    const desc = trimAyahDescription("");
    expect(desc).toContain("Ayah Studio");
  });
});

describe("buildAyahShareUrl", () => {
  it("builds correct URL with origin", () => {
    expect(buildAyahShareUrl(2, 255, "https://aayahstudio.vercel.app")).toBe(
      "https://aayahstudio.vercel.app/ayah/2/255"
    );
  });

  it("handles trailing slash in origin", () => {
    expect(buildAyahShareUrl(36, 1, "https://aayahstudio.vercel.app/")).toBe(
      "https://aayahstudio.vercel.app/ayah/36/1"
    );
  });

  it("handles empty origin for relative path", () => {
    expect(buildAyahShareUrl(112, 1)).toBe("/ayah/112/1");
  });
});

describe("calculateOgFontSize", () => {
  it("returns larger font for short text and smaller font for long text", () => {
    const short = calculateOgFontSize(40);
    const medium = calculateOgFontSize(120);
    const longText = calculateOgFontSize(300);

    expect(short.arSize).toBeGreaterThan(medium.arSize);
    expect(medium.arSize).toBeGreaterThan(longText.arSize);
    expect(short.trSize).toBeGreaterThan(medium.trSize);
  });
});
