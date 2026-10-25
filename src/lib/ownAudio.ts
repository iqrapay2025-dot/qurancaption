export const OWN_MAX_BYTES = 25 * 1024 * 1024;
export const OWN_HOP = 0.02;

export type Mark = { t: number; w: number };
export type OwnAudio = {
  name: string; url: string; duration: number;
  peak: Float32Array; rms: Float32Array;
  startT: number; endT: number; marks: Mark[];
  src: "none" | "pause" | "tap" | "edit";
};

const EXT = /\.(mp3|m4a|wav)$/i;
const MIME = /^audio\/(mpeg|mp3|mp4|x-m4a|m4a|aac|wav|x-wav|wave|vnd\.wave)$/i;

export function checkFile(f: File): string | null {
  if (f.size > OWN_MAX_BYTES) return "That file is larger than 25 MB. Trim it or export it at a lower bitrate.";
  if (f.size === 0) return "That file is empty.";
  if (!EXT.test(f.name) && !MIME.test(f.type)) return "Use an mp3, m4a or wav file.";
  return null;
}

// Decoded at a low sample rate on purpose: pause detection needs the loudness envelope, not fidelity, and a full-rate decode of a long file can exhaust phone memory.
async function decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
  const Ctx = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Ctx) throw new Error("unsupported");
  let last: unknown;
  for (const rate of [8000, 16000, 22050, 44100]) {
    try {
      const ctx = new Ctx(1, 1, rate);
      return await new Promise<AudioBuffer>((res, rej) => ctx.decodeAudioData(bytes.slice(0), res, rej));
    } catch (e) { last = e; }
  }
  throw last;
}

export async function analyze(file: File) {
  const buf = await decode(await file.arrayBuffer());
  const sr = buf.sampleRate, win = Math.max(1, Math.round(sr * OWN_HOP));
  const n = Math.max(1, Math.floor(buf.length / win));
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const peak = new Float32Array(n), rms = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let pk = 0, sq = 0;
    for (let j = i * win; j < (i + 1) * win; j++) {
      let v = 0;
      for (const ch of chans) v += ch[j];
      v /= chans.length;
      const a = Math.abs(v);
      if (a > pk) pk = a;
      sq += v * v;
    }
    peak[i] = pk;
    rms[i] = Math.sqrt(sq / win);
  }
  const top = peak.reduce((m, v) => Math.max(m, v), 0) || 1;
  for (let i = 0; i < n; i++) peak[i] /= top;
  return { duration: buf.duration, peak, rms };
}

export type Detection = { startT: number; endT: number; pauses: Mark[]; clear: boolean };

// Pause-based: finds quiet stretches in the loudness envelope. It cannot know where a verse really ends.
export function detectPauses(rms: Float32Array, duration: number, need: number): Detection {
  const n = rms.length;
  const db = Array.from(rms, (v) => 20 * Math.log10(v + 1e-6));
  const sorted = [...db].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(n * 0.1)], p90 = sorted[Math.floor(n * 0.9)];
  const empty: Detection = { startT: 0, endT: duration, pauses: [], clear: false };
  if (!(p90 - p10 >= 12)) return empty;
  const thr = p10 + (p90 - p10) * 0.25;
  const quiet = db.map((v) => v < thr);
  const runs: [number, number][] = [];
  for (let i = 0; i < n; ) {
    if (!quiet[i]) { i++; continue; }
    let j = i;
    while (j < n && quiet[j]) j++;
    runs.push([i, j]);
    i = j;
  }
  let first = 0, last = n;
  if (runs.length && runs[0][0] === 0) first = runs[0][1];
  if (runs.length && runs[runs.length - 1][1] === n) last = runs[runs.length - 1][0];
  if (last - first < 5) return empty;
  const inner = runs.filter(([a, b]) => a >= first && b <= last && a > first - 1 && !(a === 0) && !(b === n));
  const make = (min: number) => inner.filter(([a, b]) => (b - a) * OWN_HOP >= min).map(([a, b]) => ({ t: ((a + b) / 2) * OWN_HOP, w: (b - a) * OWN_HOP }));
  let pauses: Mark[] = [];
  for (const min of [0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15]) {
    pauses = make(min);
    if (pauses.length >= need) break;
  }
  return { startT: Math.max(0, first * OWN_HOP - 0.05), endT: Math.min(duration, last * OWN_HOP + 0.1), pauses, clear: true };
}

// Turns markers into one boundary per verse edge. With too many markers the longest pauses win; with too few, the remaining verses share the rest of the recording by length.
export function computeBounds(weights: number[], startT: number, endT: number, marks: Mark[]) {
  const n = weights.length;
  if (!n) return null;
  const need = n - 1;
  const sorted = marks.map((m, i) => ({ ...m, i })).sort((a, b) => a.t - b.t);
  const used = new Array(marks.length).fill(false) as boolean[];
  let chosen = sorted;
  if (sorted.length > need) {
    chosen = [...sorted].sort((a, b) => b.w - a.w || a.t - b.t).slice(0, need).sort((a, b) => a.t - b.t);
  }
  for (const m of chosen) used[m.i] = true;
  const bounds = [startT, ...chosen.map((m) => m.t)];
  const k = chosen.length;
  if (k < need) {
    const rest = weights.slice(k);
    const sum = rest.reduce((a, b) => a + b, 0) || 1;
    const from = bounds[bounds.length - 1];
    let cum = 0;
    for (let j = 0; j < rest.length - 1; j++) { cum += rest[j]; bounds.push(from + ((endT - from) * cum) / sum); }
  }
  bounds.push(endT);
  for (let i = 1; i < bounds.length; i++) bounds[i] = Math.max(bounds[i], bounds[i - 1] + 0.1);
  return { bounds, used, need, exact: marks.length === need };
}

export const verseWeight = (arabic: string) => arabic.replace(/[^\p{L}]/gu, "").length + 4;
