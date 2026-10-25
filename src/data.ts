import { TRANSLITERATION_ID } from "./lib/quran/types";

export type Verse = {
  key: string;
  n: number;
  arabic: string;
  translations: Record<string, string>;
  tajweed?: [string, string?][];
  start: number;
  end: number;
};

export const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);

export function fmt(sec: number, ms = false) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const base = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return ms ? `${base}.${String(Math.round((sec % 1) * 1000)).padStart(3, "0")}` : base;
}

function stamp(sec: number, sep: "," | ".") {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(x)}${sep}${p(ms, 3)}`;
}

export type CaptionLine = { start: number; end: number; lines: string[] };
export type SplitOpts = { enabled: boolean; maxAr: number; maxTr: number };
export const DEFAULT_SPLIT: SplitOpts = { enabled: true, maxAr: 60, maxTr: 90 };

// Waqf marks that allow a stop. U+06D9 (laa, "do not stop") is deliberately excluded.
const WAQF = /[\u06D6\u06D7\u06D8\u06DA\u06DB\u06DC]$/;
const MARKS_ONLY = /^[\p{M}\u06D6-\u06ED]+$/u;
const SENTENCE = /[.;:?!][”"’')\]]*$/;
const COMMA = /,[”"’')\]]*$/;

const arLen = (s: string) => s.replace(/[\p{M}\u06D6-\u06ED\s]/gu, "").length;
const trLen = (s: string) => s.length;

type Tier = (token: string) => boolean;

function splitTokens(tokens: string[], tiers: Tier[], ti: number, max: number, len: (s: string) => number): string[] {
  const text = tokens.join(" ");
  if (tokens.length <= 1 || len(text) <= max) return [text];
  if (ti >= tiers.length) {
    const out: string[] = [];
    let cur: string[] = [];
    for (const t of tokens) {
      if (cur.length && len([...cur, t].join(" ")) > max) { out.push(cur.join(" ")); cur = [t]; } else cur.push(t);
    }
    if (cur.length) out.push(cur.join(" "));
    return out;
  }
  const segs: string[][] = [];
  let cur: string[] = [];
  tokens.forEach((t, i) => { cur.push(t); if (i < tokens.length - 1 && tiers[ti](t)) { segs.push(cur); cur = []; } });
  segs.push(cur);
  if (segs.length === 1) return splitTokens(tokens, tiers, ti + 1, max, len);
  const packed: string[][] = [];
  let acc: string[] = [];
  for (const sg of segs) {
    if (acc.length && len([...acc, ...sg].join(" ")) > max) { packed.push(acc); acc = [...sg]; } else acc = [...acc, ...sg];
  }
  packed.push(acc);
  return packed.flatMap((p) => splitTokens(p, tiers, ti + 1, max, len));
}

// Splits only at whitespace, so no word is cut and no letter loses its diacritics.
export function splitArabic(text: string, max: number): string[] {
  const tokens: string[] = [];
  for (const w of text.trim().split(/\s+/).filter(Boolean)) {
    if (tokens.length && MARKS_ONLY.test(w)) tokens[tokens.length - 1] += ` ${w}`;
    else tokens.push(w);
  }
  return splitTokens(tokens, [(t) => WAQF.test(t)], 0, max, arLen);
}

export function splitText(text: string, max: number): string[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return splitTokens(tokens, [(t) => SENTENCE.test(t), (t) => COMMA.test(t)], 0, max, trLen);
}

// Brings a layer to exactly n parts: merges neighbours evenly, or re-splits at spaces.
function fit(parts: string[], n: number): string[] {
  const t = parts.length;
  if (t === n) return parts;
  if (t > n) return Array.from({ length: n }, (_, i) => parts.slice(Math.floor((i * t) / n), Math.floor(((i + 1) * t) / n)).join(" "));
  const words = parts.join(" ").split(/\s+/).filter(Boolean);
  return Array.from({ length: n }, (_, i) => words.slice(Math.floor((i * words.length) / n), Math.floor(((i + 1) * words.length) / n)).join(" "));
}

export function buildCaptions(
  verses: Verse[],
  opts: { arabic: boolean; tr1: string | null; tr2: string | null; translit: boolean; verseKey: boolean },
  offset: number,
  split: SplitOpts = { ...DEFAULT_SPLIT, enabled: false },
): CaptionLine[] {
  const base = verses[0]?.start ?? 0;
  const out: CaptionLine[] = [];
  for (const v of verses) {
    const arParts = opts.arabic ? (split.enabled ? splitArabic(v.arabic, split.maxAr) : [v.arabic]) : null;
    const texts = [
      opts.translit ? v.translations[TRANSLITERATION_ID] : null,
      opts.tr1 ? v.translations[opts.tr1] : null,
      opts.tr2 ? v.translations[opts.tr2] : null,
    ].filter((t): t is string => !!t);
    let trParts = texts.map((t) => (split.enabled ? splitText(t, split.maxTr) : [t]));
    const n = arParts ? arParts.length : Math.max(1, ...trParts.map((p) => p.length));
    trParts = trParts.map((p) => fit(p, n));

    const blocks = Array.from({ length: n }, (_, i) => ({
      ar: arParts ? arParts[i] : null,
      tr: trParts.map((p) => p[i]),
    }));
    if (opts.verseKey) {
      const last = blocks[n - 1];
      if (last.ar != null) last.ar += ` ﴿${toArabicDigits(v.n)}﴾`;
      else {
        const j = last.tr.map((t) => !!t).lastIndexOf(true);
        if (j >= 0) last.tr[j] += ` (${v.key})`;
      }
    }

    const weights = blocks.map((b, i) => (arParts ? arLen(arParts[i]) : b.tr.reduce((s, t) => s + t.length, 0)));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let cum = 0;
    blocks.forEach((b, i) => {
      const s = v.start + ((v.end - v.start) * cum) / total;
      cum += weights[i];
      const e = i === n - 1 ? v.end : v.start + ((v.end - v.start) * cum) / total;
      const lines = [b.ar ?? "", ...b.tr].filter(Boolean);
      const start = s - base + offset, end = e - base + offset;
      if (end > 0 && lines.length && (e > s || n === 1)) out.push({ start: Math.max(0, start), end, lines });
    });
  }
  return out;
}

export type CreditSource = { name: string; author: string; language: string };

export function creditLines(sources: CreditSource[]) {
  const lines = sources.map((t) => {
    const who = t.author && !t.name.includes(t.author) ? `${t.name}, ${t.author}` : t.name;
    return `Translation (${t.language}): ${who}`;
  });
  return [...lines, "Quran data via UmmahAPI"];
}

export function toSRT(caps: CaptionLine[], credit?: string[]) {
  const all = credit?.length && caps.length ? [...caps, { start: caps[caps.length - 1].end, end: caps[caps.length - 1].end + 3, lines: credit }] : caps;
  return all.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.lines.join("\n")}\n`).join("\n");
}

export function toVTT(caps: CaptionLine[], credit?: string[]) {
  const note = credit?.length ? `NOTE\n${credit.join("\n").replace(/-->/g, "->")}\n\n` : "";
  return "WEBVTT\n\n" + note + caps.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.lines.join("\n")}\n`).join("\n");
}
