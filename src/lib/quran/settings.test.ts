import { describe, it, expect } from "vitest";
import {
  parseSettings,
  serializeSettings,
  defaultSettings,
  type QuranSettings,
} from "./settings";

describe("Quran reader settings parser and serializer", () => {
  it("returns default settings for null or undefined", () => {
    expect(parseSettings(null)).toEqual(defaultSettings);
    expect(parseSettings(undefined)).toEqual(defaultSettings);
    expect(parseSettings("")).toEqual(defaultSettings);
  });

  it("handles valid JSON string input correctly", () => {
    const valid: QuranSettings = {
      version: 1,
      arabicSize: "xl",
      translationSize: "lg",
      script: "Scheherazade New",
      translations: ["sahih_international", "pickthall"],
      transliteration: true,
      tajweed: true,
      defaultTafsir: "maarif",
    };
    const serialized = serializeSettings(valid);
    const parsed = parseSettings(serialized);
    expect(parsed).toEqual(valid);
  });

  it("safely falls back to defaults for corrupt JSON", () => {
    expect(parseSettings("{invalid json")).toEqual(defaultSettings);
    expect(parseSettings("not even json")).toEqual(defaultSettings);
  });

  it("safely falls back to defaults for wrong version", () => {
    const wrongVersion = {
      version: 2,
      arabicSize: "xl",
    };
    expect(parseSettings(JSON.stringify(wrongVersion))).toEqual(defaultSettings);
  });

  it("clamps or falls back for out-of-range sizes", () => {
    const invalidSizes = {
      version: 1,
      arabicSize: "huge",
      translationSize: "microscopic",
    };
    const parsed = parseSettings(JSON.stringify(invalidSizes));
    expect(parsed.arabicSize).toBe(defaultSettings.arabicSize);
    expect(parsed.translationSize).toBe(defaultSettings.translationSize);
  });

  it("falls back to default script for unknown script", () => {
    const unknownScript = {
      version: 1,
      script: "Comic Sans MS",
    };
    const parsed = parseSettings(JSON.stringify(unknownScript));
    expect(parsed.script).toBe(defaultSettings.script);
  });

  it("drops non-string or empty translation items and limits to 3", () => {
    const messyTranslations = {
      version: 1,
      translations: ["sahih_international", 123, "", "pickthall", null, "yusuf_ali", "extra_translation"],
    };
    const parsed = parseSettings(JSON.stringify(messyTranslations));
    expect(parsed.translations).toEqual(["sahih_international", "pickthall", "yusuf_ali"]);
    expect(parsed.translations.length).toBeLessThanOrEqual(3);
  });
});
