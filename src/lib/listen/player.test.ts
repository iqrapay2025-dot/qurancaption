import { describe, it, expect } from "vitest";
import {
  nextSurah,
  prevSurah,
  formatTime,
  clampSpeed,
  parseListenQuery,
  DEFAULT_RECITER_ID,
  DEFAULT_SURAH,
} from "./player";

describe("src/lib/listen/player", () => {
  describe("nextSurah", () => {
    it("advances normally in repeat off mode", () => {
      expect(nextSurah(1, "off")).toBe(2);
      expect(nextSurah(55, "off")).toBe(56);
      expect(nextSurah(113, "off")).toBe(114);
    });

    it("stops at 114 with repeat off", () => {
      expect(nextSurah(114, "off")).toBe(114);
    });

    it("advances normally in repeat all mode", () => {
      expect(nextSurah(1, "all")).toBe(2);
      expect(nextSurah(113, "all")).toBe(114);
    });

    it("wraps from 114 to 1 with repeat all", () => {
      expect(nextSurah(114, "all")).toBe(1);
    });

    it("repeats current surah in repeat surah mode", () => {
      expect(nextSurah(1, "surah")).toBe(1);
      expect(nextSurah(36, "surah")).toBe(36);
      expect(nextSurah(114, "surah")).toBe(114);
    });
  });

  describe("prevSurah", () => {
    it("moves back normally in repeat off mode", () => {
      expect(prevSurah(2, "off")).toBe(1);
      expect(prevSurah(55, "off")).toBe(54);
      expect(prevSurah(114, "off")).toBe(113);
    });

    it("stops at 1 with repeat off", () => {
      expect(prevSurah(1, "off")).toBe(1);
    });

    it("moves back normally in repeat all mode", () => {
      expect(prevSurah(2, "all")).toBe(1);
      expect(prevSurah(114, "all")).toBe(113);
    });

    it("wraps from 1 to 114 with repeat all", () => {
      expect(prevSurah(1, "all")).toBe(114);
    });

    it("repeats current surah in repeat surah mode", () => {
      expect(prevSurah(1, "surah")).toBe(1);
      expect(prevSurah(36, "surah")).toBe(36);
      expect(prevSurah(114, "surah")).toBe(114);
    });
  });

  describe("formatTime", () => {
    it("formats 0 as 0:00", () => {
      expect(formatTime(0)).toBe("0:00");
    });

    it("formats 59 as 0:59", () => {
      expect(formatTime(59)).toBe("0:59");
    });

    it("formats 61 as 1:01", () => {
      expect(formatTime(61)).toBe("1:01");
    });

    it("formats 3599 as 59:59", () => {
      expect(formatTime(3599)).toBe("59:59");
    });

    it("formats 3600+ with hours (3600 -> 1:00:00)", () => {
      expect(formatTime(3600)).toBe("1:00:00");
      expect(formatTime(3665)).toBe("1:01:05");
      expect(formatTime(7200)).toBe("2:00:00");
    });

    it("handles negative or invalid values gracefully", () => {
      expect(formatTime(-10)).toBe("0:00");
      expect(formatTime(NaN)).toBe("0:00");
      expect(formatTime(Infinity)).toBe("0:00");
      expect(formatTime(null)).toBe("0:00");
    });
  });

  describe("clampSpeed", () => {
    it("returns allowed speeds directly", () => {
      expect(clampSpeed(0.75)).toBe(0.75);
      expect(clampSpeed(1)).toBe(1);
      expect(clampSpeed(1.25)).toBe(1.25);
      expect(clampSpeed(1.5)).toBe(1.5);
    });

    it("clamps values below 0.75 to 0.75", () => {
      expect(clampSpeed(0.5)).toBe(0.75);
      expect(clampSpeed(-1)).toBe(0.75);
    });

    it("clamps values above 1.5 to 1.5", () => {
      expect(clampSpeed(2.0)).toBe(1.5);
      expect(clampSpeed(3.0)).toBe(1.5);
    });

    it("snaps intermediate values to closest allowed speed", () => {
      expect(clampSpeed(0.8)).toBe(0.75);
      expect(clampSpeed(1.1)).toBe(1);
      expect(clampSpeed(1.2)).toBe(1.25);
      expect(clampSpeed(1.4)).toBe(1.5);
    });

    it("defaults to 1 for invalid values", () => {
      expect(clampSpeed(NaN)).toBe(1);
      expect(clampSpeed(undefined)).toBe(1);
      expect(clampSpeed("fast")).toBe(1);
    });
  });

  describe("parseListenQuery", () => {
    const validReciters = [1, 2, 3, 5];

    it("parses valid surah and reciter", () => {
      const res = parseListenQuery({ surah: "36", reciter: "2" }, validReciters);
      expect(res).toEqual({ surah: 36, reciter: 2 });
    });

    it("handles URLSearchParams input", () => {
      const params = new URLSearchParams("surah=18&reciter=3");
      const res = parseListenQuery(params, validReciters);
      expect(res).toEqual({ surah: 18, reciter: 3 });
    });

    it("falls back to default for missing params", () => {
      expect(parseListenQuery(null, validReciters)).toEqual({
        surah: DEFAULT_SURAH,
        reciter: DEFAULT_RECITER_ID,
      });
      expect(parseListenQuery({}, validReciters)).toEqual({
        surah: DEFAULT_SURAH,
        reciter: DEFAULT_RECITER_ID,
      });
    });

    it("falls back to default for non-numeric params", () => {
      const res = parseListenQuery({ surah: "abc", reciter: "xyz" }, validReciters);
      expect(res).toEqual({
        surah: DEFAULT_SURAH,
        reciter: DEFAULT_RECITER_ID,
      });
    });

    it("falls back to default for surah 0 (out of bounds)", () => {
      const res = parseListenQuery({ surah: "0", reciter: "1" }, validReciters);
      expect(res.surah).toBe(DEFAULT_SURAH);
    });

    it("falls back to default for surah 115 (out of bounds)", () => {
      const res = parseListenQuery({ surah: "115", reciter: "1" }, validReciters);
      expect(res.surah).toBe(DEFAULT_SURAH);
    });

    it("falls back to default for unknown reciter not in valid list", () => {
      const res = parseListenQuery({ surah: "36", reciter: "999" }, validReciters);
      expect(res).toEqual({ surah: 36, reciter: DEFAULT_RECITER_ID });
    });
  });
});
