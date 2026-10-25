import { PLATFORM_IDS, type PlatformId } from "../platforms";
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);
const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);
const idStr = (v: unknown) => (v === null ? null : typeof v === "string" && /^([a-z_]{2,40}|\d{1,6})$/.test(v) ? v : undefined);
const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : null);

export type RangeInput = { surah: number; from: number; to: number; durs?: number[] };

export const MAX_RANGES = 20;

export function totalVerses(d: { fromAyah?: number; toAyah?: number; ranges?: RangeInput[] }): number {
  if (d.ranges && d.ranges.length) return d.ranges.reduce((n, r) => n + (r.to - r.from + 1), 0);
  return d.fromAyah != null && d.toAyah != null ? d.toAyah - d.fromAyah + 1 : 0;
}

export function parseRanges(v: unknown): RangeInput[] | null {
  if (!Array.isArray(v) || v.length > MAX_RANGES) return null;
  const out: RangeInput[] = [];
  for (const r of v) {
    if (!isObj(r)) return null;
    const surah = int(r.surah, 1, 114), from = int(r.from, 1, 286), to = int(r.to, 1, 286);
    if (!surah || !from || !to || to < from) return null;
    const range: RangeInput = { surah, from, to };
    if (r.durs !== undefined && r.durs !== null) {
      if (!Array.isArray(r.durs) || r.durs.length !== to - from + 1) return null;
      if (!r.durs.every((x) => typeof x === "number" && Number.isFinite(x) && x >= 0.5 && x <= 3600)) return null;
      range.durs = r.durs as number[];
    }
    out.push(range);
  }
  return out;
}

export type ProjectInput = {
  ranges?: RangeInput[];
  name: string; surah: number; fromAyah: number; toAyah: number;
  layers: { arabic: true; tr1: boolean; tr2: boolean; translit: boolean; verseKey: boolean };
  translations: { tr1: string | null; tr2: string | null };
  reciterId: number | null;
  style: Record<string, string | number | boolean>;
  ratio: "9:16" | "16:9" | "1:1";
  thumbnail?: string;
};

export function parseProject(body: unknown, partial = false): { ok: true; data: Partial<ProjectInput> } | { ok: false; error: string } {
  if (!isObj(body)) return { ok: false, error: "Invalid request body." };
  const d: Partial<ProjectInput> = {};
  const bad = (f: string) => ({ ok: false as const, error: `Invalid ${f}.` });
  const has = (k: string) => k in body;

  if (has("name")) { const n = str(body.name, 120)?.trim(); if (!n) return bad("project name"); d.name = n; }
  if (has("surah")) { const n = int(body.surah, 1, 114); if (!n) return bad("surah"); d.surah = n; }
  if (has("fromAyah")) { const n = int(body.fromAyah, 1, 286); if (!n) return bad("start ayah"); d.fromAyah = n; }
  if (has("toAyah")) { const n = int(body.toAyah, 1, 286); if (!n) return bad("end ayah"); d.toAyah = n; }
  if (d.fromAyah && d.toAyah && d.toAyah < d.fromAyah) return bad("ayah range");
  if (has("ranges")) {
    const r = parseRanges(body.ranges);
    if (!r) return bad("ayah ranges");
    d.ranges = r;
  }
  if (has("layers")) {
    const l = body.layers;
    if (!isObj(l)) return bad("layers");
    d.layers = { arabic: true, tr1: l.tr1 === true, tr2: l.tr2 === true, translit: l.translit === true, verseKey: l.verseKey === true };
  }
  if (has("translations")) {
    const t = body.translations;
    if (!isObj(t)) return bad("translations");
    const a = idStr(t.tr1 ?? null), b = idStr(t.tr2 ?? null);
    if (a === undefined || b === undefined) return bad("translations");
    d.translations = { tr1: a, tr2: b };
  }
  if (has("reciterId")) {
    if (body.reciterId === null) d.reciterId = null;
    else { const n = int(body.reciterId, 1, 100000); if (!n) return bad("reciter"); d.reciterId = n; }
  }
  if (has("style")) {
    const s = body.style;
    if (!isObj(s)) return bad("style");
    const font = ["quran", "scheherazade", "amiri"].includes(s.font as string) ? (s.font as string) : null;
    const bg = ["transparent", "solid", "box"].includes(s.bg as string) ? (s.bg as string) : null;
    const align = ["left", "center", "right"].includes(s.align as string) ? (s.align as string) : null;
    const pos = ["top", "middle", "bottom"].includes(s.pos as string) ? (s.pos as string) : null;
    const arSize = int(s.arSize, 20, 200), trSize = int(s.trSize, 10, 120);
    const leading = typeof s.leading === "number" && s.leading >= 1 && s.leading <= 3 ? s.leading : null;
    const c = color(s.color), solid = color(s.solid);
    if (!font || !bg || !align || !pos || !arSize || !trSize || !leading || !c || !solid || typeof s.shadow !== "boolean") return bad("style settings");
    d.style = { font, bg, align, pos, arSize, trSize, leading, color: c, solid, shadow: s.shadow, tajweed: s.tajweed === true, wordHl: s.wordHl !== false, platform: typeof s.platform === "string" && PLATFORM_IDS.includes(s.platform as never) ? (s.platform as PlatformId) : "", guide: s.guide === true, hlColor: typeof s.hlColor === "string" && /^#[0-9a-fA-F]{6}$/.test(s.hlColor) ? s.hlColor.toLowerCase() : "#fcd34d" };
  }
  if (has("ratio")) {
    if (!["9:16", "16:9", "1:1"].includes(body.ratio as string)) return bad("canvas size");
    d.ratio = body.ratio as ProjectInput["ratio"];
  }
  if (has("thumbnail")) {
    const t = body.thumbnail;
    if (typeof t !== "string" || t.length > 80_000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(t)) return bad("thumbnail");
    d.thumbnail = t;
  }
  if (!partial) {
    for (const k of ["name", "surah", "fromAyah", "toAyah", "layers", "translations", "style", "ratio"] as const) if (d[k] === undefined) return { ok: false, error: `Missing ${k}.` };
  }
  return { ok: true, data: d };
}

export const validEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const validPassword = (v: unknown): v is string => typeof v === "string" && v.length >= 8 && v.length <= 128;
