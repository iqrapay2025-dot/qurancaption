export const AUDIO_EXPORT_PRO_ONLY = false;

export type AudioSamples = { sampleRate: number; channels: Float32Array[] };

export function sampleRange(start: number, end: number, sampleRate: number, frameCount: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isInteger(frameCount) || frameCount < 0 || end < start) {
    throw new Error("Invalid audio sample range.");
  }
  return {
    start: Math.max(0, Math.min(frameCount, Math.floor(start * sampleRate))),
    end: Math.max(0, Math.min(frameCount, Math.ceil(end * sampleRate))),
  };
}

export function shiftSamples(channels: Float32Array[], sampleRate: number, offset: number): Float32Array[] {
  if (!Number.isFinite(offset) || !Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error("Invalid audio timing offset.");
  const shift = Math.round(Math.abs(offset) * sampleRate);
  return channels.map((channel) => {
    if (offset > 0) {
      const shifted = new Float32Array(shift + channel.length);
      shifted.set(channel, shift);
      return shifted;
    }
    return offset < 0 ? channel.slice(Math.min(shift, channel.length)) : channel;
  });
}

export function concatenateSamples(chunks: AudioSamples[]): AudioSamples {
  if (!chunks.length) throw new Error("No recitation audio was selected.");
  const sampleRate = chunks[0].sampleRate;
  const channelCount = Math.max(...chunks.map((chunk) => chunk.channels.length));
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || channelCount < 1 || channelCount > 2) throw new Error("Unsupported recitation audio format.");
  if (chunks.some((chunk) => chunk.sampleRate !== sampleRate || !chunk.channels.length || chunk.channels.length > 2 || chunk.channels.some((channel) => channel.length !== chunk.channels[0].length))) {
    throw new Error("Recitation files use incompatible audio formats.");
  }
  const length = chunks.reduce((sum, chunk) => sum + chunk.channels[0].length, 0);
  const channels = Array.from({ length: channelCount }, () => new Float32Array(length));
  let at = 0;
  for (const chunk of chunks) {
    const frames = chunk.channels[0].length;
    for (let channel = 0; channel < channelCount; channel++) {
      channels[channel].set(chunk.channels[Math.min(channel, chunk.channels.length - 1)], at);
    }
    at += frames;
  }
  return { sampleRate, channels };
}

export function buildAudioFilename(surah: string, from: number, to: number, reciter: string) {
  const slug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const surahSlug = slug(surah) || "surah";
  const reciterSlug = slug(reciter) || "reciter";
  return `${surahSlug}-${from}-${to}-${reciterSlug}.wav`;
}

export function encodeWav({ sampleRate, channels }: AudioSamples) {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0 || channels.length < 1 || channels.length > 2 || channels.some((channel) => channel.length !== channels[0].length)) {
    throw new Error("Unsupported audio format for WAV export.");
  }
  const frames = channels[0].length;
  const blockAlign = channels.length * 2;
  const dataBytes = frames * blockAlign;
  if (!Number.isSafeInteger(dataBytes) || dataBytes > 0xffffffff - 36) {
    throw new Error("This audio exceeds the maximum size supported by standard WAV files.");
  }
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const write = (at: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataBytes, true);
  let at = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[frame]));
      view.setInt16(at, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      at += 2;
    }
  }
  return buffer;
}

const WAV_MAX_DATA_BYTES = 0xffffffff - 36;
const WAV_BLOCK_FRAMES = 16_384;

export type WavOutputSink = {
  write: (chunk: ArrayBuffer) => Promise<void>;
  finish: (header: ArrayBuffer) => Promise<void>;
};

function wavHeader(sampleRate: number, channels: number, frames: number) {
  const blockAlign = channels * 2;
  const dataBytes = frames * blockAlign;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const write = (at: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataBytes, true);
  return buffer;
}

export function createWavBlobBuilder(offset = 0, sink?: WavOutputSink) {
  if (!Number.isFinite(offset)) throw new Error("Invalid audio timing offset.");
  const parts: ArrayBuffer[] = [];
  let sampleRate = 0;
  let channelCount = 0;
  let frames = 0;
  let skippedFrames = 0;
  let initialized = false;

  const appendPcm = async (samples: AudioSamples, sourceStartFrame = 0, silenceFrames = 0) => {
    let startFrame = 0;
    while (startFrame < silenceFrames) {
      const count = Math.min(WAV_BLOCK_FRAMES, silenceFrames - startFrame);
      if ((frames + count) * channelCount * 2 > WAV_MAX_DATA_BYTES) {
        throw new Error("This audio exceeds the maximum size supported by standard WAV files.");
      }
      const silence = new ArrayBuffer(count * channelCount * 2);
      if (sink) await sink.write(silence);
      else parts.push(silence);
      frames += count;
      startFrame += count;
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    startFrame = sourceStartFrame;
    const sourceFrames = samples.channels[0].length;
    while (startFrame < sourceFrames) {
      const count = Math.min(WAV_BLOCK_FRAMES, sourceFrames - startFrame);
      if ((frames + count) * channelCount * 2 > WAV_MAX_DATA_BYTES) {
        throw new Error("This audio exceeds the maximum size supported by standard WAV files.");
      }
      const pcm = new ArrayBuffer(count * channelCount * 2);
      const view = new DataView(pcm);
      let at = 0;
      for (let frame = startFrame; frame < startFrame + count; frame++) {
        for (let channel = 0; channel < channelCount; channel++) {
          let sample = 0;
          const source = samples.channels[Math.min(channel, samples.channels.length - 1)];
          if (channelCount === 1 && samples.channels.length > 1) {
            sample = samples.channels.reduce((sum, ch) => sum + ch[frame], 0) / samples.channels.length;
          } else {
            sample = source[frame];
          }
          sample = Math.max(-1, Math.min(1, sample));
          view.setInt16(at, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
          at += 2;
        }
      }
      if (sink) await sink.write(pcm);
      else parts.push(pcm);
      frames += count;
      startFrame += count;
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  };

  return {
    async append(samples: AudioSamples) {
      if (!Number.isInteger(samples.sampleRate) || samples.sampleRate <= 0 ||
        samples.channels.length < 1 || samples.channels.length > 2 ||
        samples.channels.some((channel) => channel.length !== samples.channels[0].length)) {
        throw new Error("Unsupported audio format for WAV export.");
      }
      if (!initialized) {
        sampleRate = samples.sampleRate;
        channelCount = samples.channels.length;
        skippedFrames = offset < 0 ? Math.round(-offset * sampleRate) : 0;
        initialized = true;
        if (sink) await sink.write(wavHeader(sampleRate, channelCount, 0));
        if (offset > 0) await appendPcm({ sampleRate, channels: [new Float32Array(0)] }, 0, Math.round(offset * sampleRate));
      } else if (samples.sampleRate !== sampleRate) {
        throw new Error("Recitation files use incompatible audio formats.");
      }
      const sourceStartFrame = Math.min(skippedFrames, samples.channels[0].length);
      skippedFrames -= sourceStartFrame;
      await appendPcm(samples, sourceStartFrame);
    },
    async finish() {
      if (!initialized || frames === 0) throw new Error("The selected audio range is empty.");
      const header = wavHeader(sampleRate, channelCount, frames);
      if (sink) {
        await sink.finish(header);
        return null;
      }
      return new Blob([header, ...parts], { type: "audio/wav" });
    },
  };
}
