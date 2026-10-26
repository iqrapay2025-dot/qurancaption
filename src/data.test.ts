import { describe, it, expect } from "vitest";
import { toSRT, toVTT } from "./data";

const caps = [
  { start: 0, end: 5, lines: ["بِسْمِ اللَّهِ", "In the name of Allah"] },
  { start: 5, end: 11, lines: ["الرَّحْمَٰنِ الرَّحِيمِ", "the Entirely Merciful, the Especially Merciful"] },
];

describe("toSRT", () => {
  it("produces numbered SRT blocks with comma milliseconds", () => {
    const out = toSRT(caps);
    expect(out).toContain("1\n00:00:00,000 --> 00:00:05,000");
    expect(out).toContain("بِسْمِ اللَّهِ\nIn the name of Allah");
    expect(out).toContain("2\n00:00:05,000 --> 00:00:11,000");
    expect(out.split("\n\n").filter(Boolean).length).toBe(2);
  });

  it("appends credit lines after the last caption", () => {
    const out = toSRT(caps, ["Translation (english): Saheeh International", "Quran data via UmmahAPI"]);
    const last = out.trim().split("\n\n").pop()!;
    expect(last).toContain("Translation (english): Saheeh International");
    expect(last).toContain("Quran data via UmmahAPI");
  });
});

describe("toVTT", () => {
  it("produces WEBVTT header with dot milliseconds", () => {
    const out = toVTT(caps);
    expect(out.startsWith("WEBVTT\n\n")).toBe(true);
    expect(out).toContain("00:00:00.000 --> 00:00:05.000");
    expect(out).toContain("بِسْمِ اللَّهِ");
  });

  it("writes credit as a NOTE block", () => {
    const out = toVTT(caps, ["Quran data via UmmahAPI"]);
    expect(out).toContain("NOTE\nQuran data via UmmahAPI");
  });
});
