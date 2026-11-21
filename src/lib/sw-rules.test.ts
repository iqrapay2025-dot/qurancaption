import { describe, it, expect } from "vitest";

// Import plain JS sw-rules
// @ts-ignore
import { shouldCache, isPageNavigation } from "../../public/sw-rules.js";

describe("Service Worker Cache Rules (Prompt 7)", () => {
  it("/api/quran/audio and anything under /api is never cached", () => {
    expect(shouldCache({ url: "https://ayahstudio.com/api/quran/audio", method: "GET" })).toBe(false);
    expect(shouldCache({ url: "https://ayahstudio.com/api/quran/verses?surah=1", method: "GET" })).toBe(false);
    expect(shouldCache({ url: "https://ayahstudio.com/api/quran/search?q=mercy", method: "GET" })).toBe(false);
  });

  it("an mp3 file and audio files are never cached", () => {
    expect(shouldCache({ url: "https://cdn.example.com/recitations/001.mp3", method: "GET" })).toBe(false);
    expect(shouldCache({ url: "https://ayahstudio.com/audio/verse_1.wav", method: "GET" })).toBe(false);
    expect(shouldCache({ url: "https://ayahstudio.com/surah-audio/001.m4a", method: "GET" })).toBe(false);
  });

  it("range requests are never cached", () => {
    expect(
      shouldCache({
        url: "https://ayahstudio.com/stream/file",
        method: "GET",
        headers: { range: "bytes=0-1024" },
      })
    ).toBe(false);

    expect(
      shouldCache({
        url: "https://ayahstudio.com/stream/file",
        method: "GET",
        headers: { get: (h: string) => (h.toLowerCase() === "range" ? "bytes=0-1024" : null) },
      })
    ).toBe(false);
  });

  it("POST, PUT, DELETE requests are never cached", () => {
    expect(shouldCache({ url: "https://ayahstudio.com/api/auth", method: "POST" })).toBe(false);
    expect(shouldCache({ url: "https://ayahstudio.com/export", method: "POST" })).toBe(false);
    expect(shouldCache({ url: "https://ayahstudio.com/api/data", method: "DELETE" })).toBe(false);
  });

  it("/_next/static, /brand, and static icons are cached", () => {
    expect(shouldCache({ url: "https://ayahstudio.com/_next/static/chunks/main.js", method: "GET" })).toBe(true);
    expect(shouldCache({ url: "https://ayahstudio.com/_next/static/css/styles.css", method: "GET" })).toBe(true);
    expect(shouldCache({ url: "https://ayahstudio.com/brand/ayah-badge-dark.png", method: "GET" })).toBe(true);
    expect(shouldCache({ url: "https://ayahstudio.com/icon-192.png", method: "GET" })).toBe(true);
    expect(shouldCache({ url: "https://ayahstudio.com/apple-touch-icon.png", method: "GET" })).toBe(true);
    expect(shouldCache({ url: "https://ayahstudio.com/offline", method: "GET" })).toBe(true);
  });

  it("caches Arabic font files and Google Fonts stylesheets and assets", () => {
    expect(shouldCache({ url: "https://ayahstudio.com/fonts/AmiriQuran-Regular.woff2", method: "GET" })).toBe(true);
    expect(shouldCache({ url: "https://ayahstudio.com/fonts/Amiri-Regular.ttf", method: "GET" })).toBe(true);
    expect(shouldCache({ url: "https://fonts.googleapis.com/css2?family=Amiri+Quran", method: "GET" })).toBe(true);
    expect(shouldCache({ url: "https://fonts.gstatic.com/s/amiriquran/v19/abc.woff2", method: "GET" })).toBe(true);
  });

  it("page navigations are identified for offline fallback", () => {
    expect(isPageNavigation({ mode: "navigate", url: "https://ayahstudio.com/quran" })).toBe(true);
    expect(isPageNavigation({ mode: "navigate", url: "https://ayahstudio.com/listen" })).toBe(true);
    expect(isPageNavigation({ mode: "cors", url: "https://ayahstudio.com/api/data" })).toBe(false);
    expect(isPageNavigation({ mode: "no-cors", url: "https://ayahstudio.com/_next/static/a.js" })).toBe(false);
  });
});
