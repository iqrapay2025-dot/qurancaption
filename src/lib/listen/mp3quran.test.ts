import { describe, it, expect } from "vitest";
import {
  mapLegacyReciterId,
  buildListenAudioUrl,
  sortListenReciters,
  DEFAULT_LISTEN_RECITER_ID,
  type ListenReciter,
} from "./mp3quran";

describe("mp3quran helper utilities", () => {
  describe("mapLegacyReciterId", () => {
    it("maps legacy UmmahAPI reciter IDs (1-11) to MP3Quran IDs", () => {
      expect(mapLegacyReciterId(1)).toBe(123); // Mishary Alafasi
      expect(mapLegacyReciterId(2)).toBe(54);  // Abdulrahman Alsudaes
      expect(mapLegacyReciterId(3)).toBe(51);  // Abdulbasit Abdulsamad
      expect(mapLegacyReciterId(5)).toBe(102); // Maher Al Meaqli
      expect(mapLegacyReciterId(6)).toBe(30);  // Saad Al-Ghamdi
      expect(mapLegacyReciterId(10)).toBe(31); // Saud Al-Shuraim
    });

    it("preserves IDs that are already MP3Quran IDs", () => {
      expect(mapLegacyReciterId(123)).toBe(123);
      expect(mapLegacyReciterId(221)).toBe(221);
      expect(mapLegacyReciterId(999)).toBe(999);
    });

    it("has default reciter set to 123 (Mishary)", () => {
      expect(DEFAULT_LISTEN_RECITER_ID).toBe(123);
    });
  });

  describe("buildListenAudioUrl", () => {
    it("pads single-digit surahs with leading zeroes", () => {
      expect(buildListenAudioUrl("https://server.mp3quran.net/mishary/", 1)).toBe(
        "https://server.mp3quran.net/mishary/001.mp3"
      );
    });

    it("pads double-digit surahs with a single zero", () => {
      expect(buildListenAudioUrl("https://server.mp3quran.net/mishary/", 36)).toBe(
        "https://server.mp3quran.net/mishary/036.mp3"
      );
    });

    it("leaves three-digit surahs unpadded", () => {
      expect(buildListenAudioUrl("https://server.mp3quran.net/mishary/", 114)).toBe(
        "https://server.mp3quran.net/mishary/114.mp3"
      );
    });

    it("handles server URLs without a trailing slash", () => {
      expect(buildListenAudioUrl("https://server.mp3quran.net/mishary", 2)).toBe(
        "https://server.mp3quran.net/mishary/002.mp3"
      );
    });
  });

  describe("sortListenReciters", () => {
    it("places featured reciters first in priority order, followed by alphabetical", () => {
      const reciters: ListenReciter[] = [
        { id: 999, name: "Zack", nameArabic: null, style: null, server: "s1", surahTotal: 114, surahList: [] },
        { id: 54, name: "Abdulrahman Alsudaes", nameArabic: null, style: null, server: "s2", surahTotal: 114, surahList: [] },
        { id: 123, name: "Mishari Alafasi", nameArabic: null, style: null, server: "s3", surahTotal: 114, surahList: [] },
        { id: 888, name: "Adam", nameArabic: null, style: null, server: "s4", surahTotal: 114, surahList: [] },
      ];

      const sorted = sortListenReciters(reciters);
      expect(sorted[0].id).toBe(123); // Featured #1
      expect(sorted[1].id).toBe(54);  // Featured #2
      expect(sorted[2].id).toBe(888); // Alphabetical Adam
      expect(sorted[3].id).toBe(999); // Alphabetical Zack
    });
  });
});
