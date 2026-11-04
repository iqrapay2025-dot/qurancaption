import { describe, expect, it } from "vitest";
import { buildCaptions } from "../data";
import { buildAudioFilename, concatenateSamples, sampleRange, shiftSamples } from "./audioExport";

describe("sampleRange", () => {
  it("maps start and end seconds to a clamped, end-exclusive sample range", () => {
    expect(sampleRange(1.234, 2.345, 10, 100)).toEqual({ start: 12, end: 24 });
    expect(sampleRange(-1, 20, 10, 100)).toEqual({ start: 0, end: 100 });
  });
});

describe("shiftSamples", () => {
  it("adds leading silence for a positive caption offset", () => {
    expect([...shiftSamples([Float32Array.of(0.5, 1)], 4, 0.5)[0]]).toEqual([0, 0, 0.5, 1]);
  });

  it("trims the start for a negative caption offset", () => {
    expect([...shiftSamples([Float32Array.of(0.25, 0.5, 0.75, 1)], 4, -0.5)[0]]).toEqual([0.75, 1]);
  });
});

describe("caption-relative audio timing", () => {
  it("uses the first selected verse as caption time zero and shifts audio by the same offset", () => {
    const verses = [{ key: "1:2", n: 2, arabic: "الله", translations: {}, start: 8, end: 10 }];
    const captions = buildCaptions(verses, { arabic: true, tr1: null, tr2: null, translit: false, verseKey: false }, 1);
    expect(captions[0]).toMatchObject({ start: 1, end: 3 });
    expect([...shiftSamples([Float32Array.of(1, 2, 3, 4)], 1, 1)[0]]).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("concatenateSamples", () => {
  it("joins original ayah samples in order without stretching, gaps, or pitch changes", () => {
    const joined = concatenateSamples([
      { sampleRate: 4, channels: [Float32Array.of(1, 2)] },
      { sampleRate: 4, channels: [Float32Array.of(3, 4), Float32Array.of(30, 40)] },
    ]);
    expect(joined.channels.map((channel) => [...channel])).toEqual([[1, 2, 3, 4], [1, 2, 30, 40]]);
  });
});

describe("buildAudioFilename", () => {
  it("includes the range and reciter using safe filename characters", () => {
    const name = buildAudioFilename("Al-Fātiḥah", 1, 7, "Mishary / Rashid: Alafasy");
    expect(name).toBe("al-fatihah-1-7-mishary-rashid-alafasy.wav");
    expect(name).toMatch(/^[a-z0-9-]+\.wav$/);
  });
});
