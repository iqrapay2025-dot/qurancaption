import { describe, it, expect } from "vitest";
import {
  buildDailyAyahFilename,
  wrapWords,
  calculateFit,
} from "./daily-ayah-image";

describe("daily-ayah-image", () => {
  describe("buildDailyAyahFilename", () => {
    it("creates correct png filename for surah and ayah", () => {
      expect(buildDailyAyahFilename(2, 255, "png")).toBe(
        "ayah-studio-daily-ayah-2-255.png"
      );
    });

    it("creates correct jpg filename when format is jpg", () => {
      expect(buildDailyAyahFilename(1, 1, "jpg")).toBe(
        "ayah-studio-daily-ayah-1-1.jpg"
      );
    });

    it("defaults to png extension if format is omitted", () => {
      expect(buildDailyAyahFilename(36, 1)).toBe(
        "ayah-studio-daily-ayah-36-1.png"
      );
    });

    it("clamps invalid or out of range surah numbers", () => {
      expect(buildDailyAyahFilename(0, 5)).toBe(
        "ayah-studio-daily-ayah-1-5.png"
      );
      expect(buildDailyAyahFilename(200, 10)).toBe(
        "ayah-studio-daily-ayah-114-10.png"
      );
    });
  });

  describe("wrapWords", () => {
    it("returns empty array for empty string", () => {
      expect(wrapWords("", 100, () => 10)).toEqual([]);
      expect(wrapWords("   ", 100, () => 10)).toEqual([]);
    });

    it("keeps short text on a single line", () => {
      // Each character = 10px, total text "hello" = 50px <= 100px
      const lines = wrapWords("hello world", 200, (t) => t.length * 10);
      expect(lines).toEqual(["hello world"]);
    });

    it("splits long text into multiple lines safely", () => {
      // 10 chars max per line
      const lines = wrapWords("one two three four five", 100, (t) => t.length * 10);
      expect(lines.length).toBeGreaterThan(1);
      // All lines should satisfy measure condition
      for (const line of lines) {
        expect(line.length * 10).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("calculateFit", () => {
    it("retains initial sizes for short verses", () => {
      const mockMeasure = (t: string, size: number) => t.length * (size * 0.5);

      const res = calculateFit({
        arabic: "بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ",
        translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        maxWidth: 800,
        availableHeight: 600,
        measureArabic: mockMeasure,
        measureTranslation: mockMeasure,
        initialArSize: 48,
        initialTrSize: 30,
      });

      expect(res.arSize).toBe(48);
      expect(res.trSize).toBe(30);
      expect(res.arLines.length).toBeGreaterThan(0);
      expect(res.trLines.length).toBeGreaterThan(0);
      expect(res.totalContentHeight).toBeLessThanOrEqual(600);
    });

    it("auto-shrinks font sizes when verse is very long", () => {
      const longArabic =
        "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ";
      const longTranslation =
        "Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.";

      const mockMeasure = (t: string, size: number) => t.length * (size * 0.55);

      const res = calculateFit({
        arabic: longArabic,
        translation: longTranslation,
        maxWidth: 700,
        availableHeight: 650,
        measureArabic: mockMeasure,
        measureTranslation: mockMeasure,
        initialArSize: 48,
        initialTrSize: 30,
        minArSize: 26,
        minTrSize: 18,
      });

      // Sizes should have scaled down to fit
      expect(res.arSize).toBeLessThan(48);
      expect(res.trSize).toBeLessThan(30);
      expect(res.totalContentHeight).toBeLessThanOrEqual(650);
    });
  });
});
