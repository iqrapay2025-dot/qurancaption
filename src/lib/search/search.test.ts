import { describe, it, expect, beforeEach } from "vitest";
import { splitHighlight, validateQuery, parseAyahHash } from "./index";
import { getRecentSearches, addRecentSearch, clearRecentSearches, RECENT_SEARCHES_KEY } from "./recent";
import { validateTranslationKey } from "@/lib/quran/validate";

describe("Search Pure Functions (Prompt 2)", () => {
  describe("validateQuery", () => {
    it("rejects non-strings and queries under 2 characters", () => {
      expect(validateQuery(null).valid).toBe(false);
      expect(validateQuery("").valid).toBe(false);
      expect(validateQuery("a").valid).toBe(false);
      expect(validateQuery("   a   ").valid).toBe(false);
    });

    it("accepts valid English and Arabic queries >= 2 characters", () => {
      expect(validateQuery("mercy").valid).toBe(true);
      expect(validateQuery("رحمة").valid).toBe(true);
      expect(validateQuery("  peace  ").query).toBe("peace");
    });

    it("rejects queries over 100 characters", () => {
      const longStr = "a".repeat(101);
      expect(validateQuery(longStr).valid).toBe(false);
    });
  });

  describe("parseAyahHash", () => {
    it("parses valid ayah hashes with or without leading #", () => {
      expect(parseAyahHash("#ayah-12")).toBe(12);
      expect(parseAyahHash("ayah-255")).toBe(255);
      expect(parseAyahHash("#ayah-1")).toBe(1);
    });

    it("returns null for malformed or empty hashes", () => {
      expect(parseAyahHash("")).toBe(null);
      expect(parseAyahHash("#ayah-")).toBe(null);
      expect(parseAyahHash("#ayah-abc")).toBe(null);
      expect(parseAyahHash("#surah-1")).toBe(null);
      expect(parseAyahHash("#ayah-0")).toBe(null);
    });
  });

  describe("splitHighlight", () => {
    it("splits matched English words safely", () => {
      const parts = splitHighlight("In the name of Allah, the Entirely Merciful", "Merciful");
      expect(parts).toHaveLength(2);
      expect(parts[0]).toEqual({ text: "In the name of Allah, the Entirely ", match: false });
      expect(parts[1]).toEqual({ text: "Merciful", match: true });
    });

    it("handles Arabic text correctly", () => {
      const parts = splitHighlight("بسم الله الرحمن الرحيم", "الرحمن");
      const matched = parts.filter((p) => p.match);
      expect(matched.length).toBeGreaterThan(0);
      expect(matched[0].text).toBe("الرحمن");
    });

    it("handles regex special characters like ( and * and .* without crashing or throwing", () => {
      expect(() => splitHighlight("Testing (brackets) and *asterisks*", "(")).not.toThrow();
      expect(() => splitHighlight("Testing (brackets) and *asterisks*", "*")).not.toThrow();
      expect(() => splitHighlight("Testing (brackets) and *asterisks*", ".*")).not.toThrow();
      expect(() => splitHighlight("Testing (brackets) and *asterisks*", "[a-z]")).not.toThrow();
      expect(() => splitHighlight("Testing (brackets) and *asterisks*", "+?^$")).not.toThrow();

      const parts = splitHighlight("Testing (brackets)", "(");
      expect(parts.some((p) => p.text === "(" && p.match)).toBe(true);
    });

    it("returns original text when query is empty", () => {
      expect(splitHighlight("Hello world", "")).toEqual([{ text: "Hello world", match: false }]);
      expect(splitHighlight("Hello world", "   ")).toEqual([{ text: "Hello world", match: false }]);
    });
  });

  describe("validateTranslationKey bug fix", () => {
    it("accepts valid translation text keys like 'sahih_international'", () => {
      expect(validateTranslationKey("sahih_international")).toBe(true);
      expect(validateTranslationKey("pickthall")).toBe(true);
      expect(validateTranslationKey("yusuf_ali")).toBe(true);
    });

    it("throws on old behavior (numeric string or invalid key)", () => {
      expect(() => validateTranslationKey("131")).toThrow(/Invalid translation key/);
      expect(() => validateTranslationKey("unknown_key")).toThrow(/Invalid translation key/);
      expect(() => validateTranslationKey(123)).toThrow(/Invalid translation key/);
      expect(() => validateTranslationKey("")).toThrow(/Invalid translation key/);
    });
  });

  describe("Recent Searches Storage", () => {
    let store: Record<string, string> = {};

    beforeEach(() => {
      store = {};
      const mockStorage = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
      (globalThis as any).window = globalThis;
      (globalThis as any).localStorage = mockStorage;
    });

    it("saves and retrieves recent searches up to 5 items", () => {
      expect(getRecentSearches()).toEqual([]);
      addRecentSearch("mercy");
      addRecentSearch("patience");
      addRecentSearch("peace");
      addRecentSearch("guidance");
      addRecentSearch("light");
      addRecentSearch("heaven"); // 6th, should push out "mercy"

      const list = getRecentSearches();
      expect(list).toHaveLength(5);
      expect(list[0]).toBe("heaven");
      expect(list).not.toContain("mercy");
    });

    it("deduplicates case-insensitively and puts latest first", () => {
      addRecentSearch("mercy");
      addRecentSearch("peace");
      addRecentSearch("MERCY");
      const list = getRecentSearches();
      expect(list).toEqual(["MERCY", "peace"]);
    });

    it("clears recent searches", () => {
      addRecentSearch("mercy");
      clearRecentSearches();
      expect(getRecentSearches()).toEqual([]);
    });
  });
});
