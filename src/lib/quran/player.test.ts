import { describe, it, expect } from "vitest";
import { findStartIndex, nextFile, prevFile } from "./player";
import type { AyahFile } from "./types";

describe("Quran audio player logic", () => {
  const mockFiles: AyahFile[] = [
    { verseKey: "1:1", audioUrl: "https://audio.example/1_1.mp3" },
    { verseKey: "1:2", audioUrl: "https://audio.example/1_2.mp3" },
    { verseKey: "1:3", audioUrl: "https://audio.example/1_3.mp3" },
  ];

  describe("findStartIndex", () => {
    it("returns correct index for middle ayah", () => {
      expect(findStartIndex(mockFiles, "1:2")).toBe(1);
    });

    it("returns correct index for first ayah", () => {
      expect(findStartIndex(mockFiles, "1:1")).toBe(0);
    });

    it("returns correct index for last ayah", () => {
      expect(findStartIndex(mockFiles, "1:3")).toBe(2);
    });

    it("returns null for unknown key", () => {
      expect(findStartIndex(mockFiles, "1:99")).toBeNull();
    });

    it("returns null for empty files array", () => {
      expect(findStartIndex([], "1:1")).toBeNull();
    });
  });

  describe("nextFile", () => {
    it("returns next file for middle ayah", () => {
      const next = nextFile(mockFiles, "1:2");
      expect(next).toEqual({ verseKey: "1:3", audioUrl: "https://audio.example/1_3.mp3" });
    });

    it("returns next file for first ayah", () => {
      const next = nextFile(mockFiles, "1:1");
      expect(next).toEqual({ verseKey: "1:2", audioUrl: "https://audio.example/1_2.mp3" });
    });

    it("returns null for last ayah", () => {
      expect(nextFile(mockFiles, "1:3")).toBeNull();
    });

    it("returns null for unknown key", () => {
      expect(nextFile(mockFiles, "1:99")).toBeNull();
    });

    it("returns null for empty list", () => {
      expect(nextFile([], "1:1")).toBeNull();
    });
  });

  describe("prevFile", () => {
    it("returns previous file for middle ayah", () => {
      const prev = prevFile(mockFiles, "1:2");
      expect(prev).toEqual({ verseKey: "1:1", audioUrl: "https://audio.example/1_1.mp3" });
    });

    it("returns null for first ayah", () => {
      expect(prevFile(mockFiles, "1:1")).toBeNull();
    });

    it("returns previous file for last ayah", () => {
      const prev = prevFile(mockFiles, "1:3");
      expect(prev).toEqual({ verseKey: "1:2", audioUrl: "https://audio.example/1_2.mp3" });
    });

    it("returns null for unknown key", () => {
      expect(prevFile(mockFiles, "1:99")).toBeNull();
    });

    it("returns null for empty list", () => {
      expect(prevFile([], "1:1")).toBeNull();
    });
  });
});
