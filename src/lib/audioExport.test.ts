import { describe, expect, it } from "vitest";
import { buildCaptions } from "../data";
import { buildAudioFilename, concatenateSamples, createWavBlobBuilder, sampleRange, shiftSamples } from "./audioExport";

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

describe("createWavBlobBuilder", () => {
  it("encodes original verse samples incrementally into a WAV blob", async () => {
    const wav = createWavBlobBuilder();
    await wav.append({ sampleRate: 4, channels: [Float32Array.of(-1, 0)] });
    await wav.append({ sampleRate: 4, channels: [Float32Array.of(0.5, 1)] });
    const bytes = await (await wav.finish())!.arrayBuffer();
    const view = new DataView(bytes);
    expect(new TextDecoder().decode(new Uint8Array(bytes, 0, 4))).toBe("RIFF");
    expect(view.getUint32(40, true)).toBe(8);
    expect([0, 1, 2, 3].map((i) => view.getInt16(44 + i * 2, true))).toEqual([-32768, 0, 16383, 32767]);
  });

  it("yields while encoding audio that spans multiple PCM blocks", async () => {
    const samples = new Float32Array(20_000).fill(0.25);
    samples[samples.length - 1] = -0.5;
    const wav = createWavBlobBuilder();
    let timerRan = false;
    setTimeout(() => { timerRan = true; }, 0);

    await wav.append({ sampleRate: 16_000, channels: [samples] });

    expect(timerRan).toBe(true);
    const bytes = await (await wav.finish())!.arrayBuffer();
    const view = new DataView(bytes);
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
    expect(view.getInt16(44 + (samples.length - 1) * 2, true)).toBe(-16_384);
  });

  it("writes PCM chunks to a sink and patches the WAV header on finish", async () => {
    const written: ArrayBuffer[] = [];
    let finalHeader: ArrayBuffer | undefined;
    const wav = createWavBlobBuilder(0.25, {
      write: async (chunk) => { written.push(chunk); },
      finish: async (header) => { finalHeader = header; },
    });

    await wav.append({ sampleRate: 4, channels: [Float32Array.of(0.5, 1)] });

    expect(written).toHaveLength(3);
    expect(new DataView(written[0]).getUint32(40, true)).toBe(0);
    expect(new DataView(written[1]).getInt16(0, true)).toBe(0);
    expect(new DataView(written[2]).getInt16(0, true)).toBe(16383);

    expect(await wav.finish()).toBeNull();
    expect(finalHeader).toBeDefined();
    expect(new DataView(finalHeader!).getUint32(40, true)).toBe(6);
  });

  it("applies positive and negative timing offsets without stretching the recording", async () => {
    const positive = createWavBlobBuilder(0.25);
    await positive.append({ sampleRate: 4, channels: [Float32Array.of(0.5, 1)] });
    const positiveBytes = await (await positive.finish())!.arrayBuffer();
    const positiveView = new DataView(positiveBytes);
    expect(positiveView.getUint32(40, true)).toBe(6);
    expect([0, 1, 2].map((i) => positiveView.getInt16(44 + i * 2, true))).toEqual([0, 16383, 32767]);

    const negative = createWavBlobBuilder(-0.25);
    await negative.append({ sampleRate: 4, channels: [Float32Array.of(-1, 0.5, 1)] });
    const negativeBytes = await (await negative.finish())!.arrayBuffer();
    const negativeView = new DataView(negativeBytes);
    expect(negativeView.getUint32(40, true)).toBe(4);
    expect([0, 1].map((i) => negativeView.getInt16(44 + i * 2, true))).toEqual([16383, 32767]);
  });
});

describe("buildAudioFilename", () => {
  it("includes the range and reciter using safe filename characters", () => {
    const name = buildAudioFilename("Al-Fātiḥah", 1, 7, "Mishary / Rashid: Alafasy");
    expect(name).toBe("al-fatihah-1-7-mishary-rashid-alafasy.wav");
    expect(name).toMatch(/^[a-z0-9-]+\.wav$/);
  });
});
