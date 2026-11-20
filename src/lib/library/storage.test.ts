import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  LIBRARY_STORAGE_KEY,
  MAX_BOOKMARKS,
  MAX_NOTE_LENGTH,
  validateAndParseLibrary,
  getLibrary,
  saveLibrary,
  saveContinueReading,
  saveContinueListening,
  clearContinueHistory,
  addBookmark,
  removeBookmark,
  updateBookmarkNote,
  isBookmarked,
  exportBookmarksJson,
  importBookmarksJson,
} from "./storage";

describe("Library Storage Wrapper (Prompt 3)", () => {
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

  describe("Validation & Error Resilience", () => {
    it("safely handles null, undefined, empty string and corrupt JSON without crashing", () => {
      expect(validateAndParseLibrary(null).bookmarks).toEqual([]);
      expect(validateAndParseLibrary(undefined).bookmarks).toEqual([]);
      expect(validateAndParseLibrary("").bookmarks).toEqual([]);
      expect(validateAndParseLibrary("{ bad json :::").bookmarks).toEqual([]);
      expect(validateAndParseLibrary(12345).bookmarks).toEqual([]);
      expect(validateAndParseLibrary([]).bookmarks).toEqual([]);
    });

    it("resets to default when version is not 1", () => {
      const parsed = validateAndParseLibrary(JSON.stringify({ version: 2, bookmarks: [{ surah: 1, ayah: 1 }] }));
      expect(parsed.version).toBe(1);
      expect(parsed.bookmarks).toEqual([]);
    });

    it("handles storage quota errors quietly without throwing", () => {
      const mockStorage = {
        getItem: () => null,
        setItem: () => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        },
        removeItem: () => {},
        clear: () => {},
      };
      (globalThis as any).localStorage = mockStorage;

      expect(() => {
        const ok = saveLibrary({
          version: 1,
          reading: null,
          listening: null,
          bookmarks: [],
        });
        expect(ok).toBe(false);
      }).not.toThrow();
    });
  });

  describe("Continue Reading & Listening", () => {
    it("saves and updates continue reading position", () => {
      saveContinueReading({ surah: 2, ayah: 120, surahName: "Al-Baqarah" });
      const lib = getLibrary();
      expect(lib.reading).toBeDefined();
      expect(lib.reading?.surah).toBe(2);
      expect(lib.reading?.ayah).toBe(120);
      expect(lib.reading?.surahName).toBe("Al-Baqarah");
    });

    it("saves and updates continue listening position", () => {
      saveContinueListening({ surah: 36, reciterId: 1, time: 750, surahName: "Ya-Sin" });
      const lib = getLibrary();
      expect(lib.listening).toBeDefined();
      expect(lib.listening?.surah).toBe(36);
      expect(lib.listening?.reciterId).toBe(1);
      expect(lib.listening?.time).toBe(750);
      expect(lib.listening?.surahName).toBe("Ya-Sin");
    });

    it("clears history while preserving bookmarks", () => {
      saveContinueReading({ surah: 1, ayah: 1 });
      saveContinueListening({ surah: 1, reciterId: 1, time: 10 });
      addBookmark({ surah: 2, ayah: 255 });

      clearContinueHistory();
      const lib = getLibrary();
      expect(lib.reading).toBeNull();
      expect(lib.listening).toBeNull();
      expect(lib.bookmarks).toHaveLength(1);
    });
  });

  describe("Bookmarks Management", () => {
    it("adds and removes bookmarks correctly", () => {
      addBookmark({ surah: 2, ayah: 255, note: "Ayatul Kursi" });
      expect(isBookmarked(2, 255)).toBe(true);
      expect(isBookmarked(1, 1)).toBe(false);

      const lib = getLibrary();
      expect(lib.bookmarks).toHaveLength(1);
      expect(lib.bookmarks[0].verseKey).toBe("2:255");
      expect(lib.bookmarks[0].note).toBe("Ayatul Kursi");

      removeBookmark(2, 255);
      expect(isBookmarked(2, 255)).toBe(false);
      expect(getLibrary().bookmarks).toHaveLength(0);
    });

    it("prevents duplicate bookmarks for the same ayah", () => {
      addBookmark({ surah: 2, ayah: 255, note: "Note 1" });
      addBookmark({ surah: 2, ayah: 255, note: "Updated Note" });

      const lib = getLibrary();
      expect(lib.bookmarks).toHaveLength(1);
      expect(lib.bookmarks[0].note).toBe("Updated Note");
    });

    it("enforces the 140-character note limit", () => {
      const longNote = "A".repeat(200);
      addBookmark({ surah: 1, ayah: 1, note: longNote });
      const lib = getLibrary();
      expect(lib.bookmarks[0].note?.length).toBe(MAX_NOTE_LENGTH);
    });

    it("caps bookmarks at MAX_BOOKMARKS (500)", () => {
      const lib = getLibrary();
      for (let i = 1; i <= 505; i++) {
        // distribute across surahs and ayahs
        const s = ((i % 114) + 1);
        const a = Math.floor(i / 114) + 1;
        lib.bookmarks.push({
          surah: s,
          ayah: a,
          verseKey: `${s}:${a}`,
          createdAt: Date.now(),
        });
      }
      saveLibrary(lib);

      const parsed = getLibrary();
      expect(parsed.bookmarks.length).toBeLessThanOrEqual(MAX_BOOKMARKS);
    });

    it("updates existing bookmark note", () => {
      addBookmark({ surah: 18, ayah: 10 });
      updateBookmarkNote(18, 10, "Kahf prayer");
      expect(getLibrary().bookmarks[0].note).toBe("Kahf prayer");
    });
  });

  describe("JSON Export & Import", () => {
    it("exports valid JSON payload", () => {
      addBookmark({ surah: 2, ayah: 255, note: "Throne Verse" });
      const json = exportBookmarksJson();
      const parsed = JSON.parse(json);
      expect(parsed.app).toBe("Ayah Studio");
      expect(parsed.bookmarks).toHaveLength(1);
      expect(parsed.bookmarks[0].verseKey).toBe("2:255");
    });

    it("rejects corrupt or invalid import data", () => {
      expect(importBookmarksJson("not valid json").success).toBe(false);
      expect(importBookmarksJson(JSON.stringify({ other: "data" })).success).toBe(false);
    });

    it("merges valid bookmarks without duplicates and reports added count", () => {
      addBookmark({ surah: 1, ayah: 1 });
      const importPayload = JSON.stringify({
        app: "Ayah Studio",
        bookmarks: [
          { surah: 1, ayah: 1, note: "Already there" },
          { surah: 2, ayah: 255, note: "Newly added" },
          { surah: 36, ayah: 1 },
        ],
      });

      const res = importBookmarksJson(importPayload);
      expect(res.success).toBe(true);
      expect(res.added).toBe(2);

      const lib = getLibrary();
      expect(lib.bookmarks).toHaveLength(3);
      expect(isBookmarked(1, 1)).toBe(true);
      expect(isBookmarked(2, 255)).toBe(true);
      expect(isBookmarked(36, 1)).toBe(true);
    });
  });
});
