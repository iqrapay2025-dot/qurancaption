import { toArabicDigits, type Verse } from "../data";
import { splitWords } from "../components/WordHighlight";
import { platformById } from "./platforms";
import { TRANSLITERATION_ID } from "./quran/types";

export type OverlayStyle = {
  font: string; arSize: number; trSize: number; color: string; shadow: boolean;
  bg: string; align: string; leading: number; pos: string; wordHl: boolean; hlColor: string; platform: string | null;
};
export type OverlayLayers = { arabic: boolean; tr1: string | null; tr2: string | null; translit: boolean; verseKey: boolean };

const FAMILY: Record<string, string> = { quran: "Amiri Quran", scheherazade: "Scheherazade New", amiri: "Amiri" };
const SIZE: Record<string, [number, number]> = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080] };
const FPS = 30;

export type Support = { ok: true; mime: string } | { ok: false; kind: "unsupported" | "no-alpha"; message: string };

// Chrome writes alpha as an AlphaMode track flag plus BlockAdditions carrying the alpha plane. We look for either marker in the bytes.
export function hasAlphaMarker(b: Uint8Array) {
  for (let i = 0; i + 3 < b.length; i++) {
    if (b[i] === 0x53 && b[i + 1] === 0xc0 && b[i + 2] === 0x81 && b[i + 3] === 0x01) return true;
    if (b[i] === 0x75 && b[i + 1] === 0xa1) {
      for (let j = i + 2; j < i + 12 && j + 2 < b.length; j++) if (b[j] === 0xee && b[j + 1] === 0x81 && b[j + 2] === 0x01) return true;
    }
  }
  return false;
}

function record(canvas: HTMLCanvasElement, mime: string, bps: number, draw: (t: number) => boolean | Promise<boolean>, signal?: AbortSignal) {
  return new Promise<Blob>((resolve, reject) => {
    const stream = canvas.captureStream(FPS);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps });
    const chunks: Blob[] = [];
    let raf = 0, cancelled = false;
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onerror = () => reject(new Error("The browser stopped recording."));
    rec.onstop = () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      if (cancelled) reject(new DOMException("Cancelled", "AbortError"));
      else resolve(new Blob(chunks, { type: "video/webm" }));
    };
    signal?.addEventListener("abort", () => { cancelled = true; if (rec.state !== "inactive") rec.stop(); });
    draw(0);
    rec.start(250);
    const t0 = performance.now();
    const loop = () => {
      if (cancelled) return;
      const done = draw((performance.now() - t0) / 1000);
      if (done) { setTimeout(() => rec.state !== "inactive" && rec.stop(), 150); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  });
}

let cached: Support | null = null;
export async function overlaySupport(): Promise<Support> {
  if (cached) return cached;
  if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
    return { ok: false, kind: "unsupported", message: "This browser cannot record video from a canvas. Use Chrome or Edge on desktop or Android." };
  }
  const mimes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8"].filter((m) => MediaRecorder.isTypeSupported(m));
  if (!mimes.length) return { ok: false, kind: "unsupported", message: "This browser cannot record VP8 or VP9 WebM video, which is needed for transparency. Use Chrome or Edge on desktop or Android." };
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  for (const mime of mimes) {
    try {
      const blob = await record(c, mime, 500_000, (t) => {
        g.clearRect(0, 0, 64, 64);
        g.fillStyle = "rgba(255,0,0,0.9)";
        g.beginPath(); g.arc(32 + Math.sin(t * 8) * 10, 32, 14, 0, Math.PI * 2); g.fill();
        return t > 0.6;
      });
      if (hasAlphaMarker(new Uint8Array(await blob.arrayBuffer()))) return (cached = { ok: true, mime });
    } catch { /* try the next codec */ }
  }
  return { ok: false, kind: "no-alpha", message: "This browser records video but does not keep transparency, so the file would have a black background. Use Chrome or Edge on desktop or Android." };
}

type Tok = { text: string; w: number; weight: number; scale: number; alpha: number };
type Line = { toks: Tok[]; width: number };
type Para = { kind: "ar" | "tr"; font: string; size: number; lh: number; alpha: number; italic?: boolean; lines: Line[]; text?: string[]; widths?: number[] };
type Layout = { paras: Para[]; height: number; weights: number[]; wordIdx: number[] };

export async function renderOverlay(o: {
  verses: Verse[]; layers: OverlayLayers; style: OverlayStyle; ratio: string; offset: number;
  onProgress: (p: number, elapsed: number) => void; signal?: AbortSignal;
}): Promise<{ blob: Blob; alpha: boolean; duration: number }> {
  const sup = await overlaySupport();
  if (!sup.ok) throw new Error(sup.message);
  const { verses, layers, style } = o;
  const [W, H] = SIZE[o.ratio] ?? SIZE["9:16"];
  const fam = `"${FAMILY[style.font] ?? "Amiri Quran"}", "Amiri Quran", serif`;
  const sans = `"Figtree", system-ui, sans-serif`;
  await Promise.all([
    document.fonts.load(`${style.arSize}px "${FAMILY[style.font]}"`, "بسم الله ﴿١﴾"),
    document.fonts.load(`${style.trSize}px Figtree`, "Abc"),
    document.fonts.load(`italic ${style.trSize}px Figtree`, "Abc"),
  ]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d", { alpha: true })!;

  const plat = platformById(style.platform);
  const pad = plat
    ? { t: (plat.safe.top / 100) * H, b: (plat.safe.bottom / 100) * H, l: (plat.safe.left / 100) * W, r: (plat.safe.right / 100) * W }
    : { t: 0.1 * W, b: 0.1 * W, l: 0.06 * W, r: 0.06 * W };
  const box = style.bg === "box";
  const boxPad = box ? 0.04 * W : 0;
  const cw = W - pad.l - pad.r;
  const iw = cw - boxPad * 2;
  const gap = 0.025 * W;
  g.textBaseline = "alphabetic";

  const wrapPlain = (text: string, font: string) => {
    g.font = font;
    g.direction = "ltr";
    const words = text.split(/\s+/).filter(Boolean);
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && g.measureText(t).width > iw) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  };

  const layoutVerse = (v: Verse): Layout => {
    const paras: Para[] = [];
    let weights: number[] = [], wordIdx: number[] = [];
    if (layers.arabic) {
      const font = `${style.arSize}px ${fam}`;
      g.font = font; g.direction = "rtl";
      const space = g.measureText(" ").width;
      const sw = splitWords([[v.arabic]]);
      weights = sw.weights;
      const toks: Tok[] = [];
      for (const n of sw.nodes) if (!("ws" in n)) { const text = n.parts.map((p) => p[0]).join(""); toks.push({ text, w: g.measureText(text).width, weight: weights[n.idx], scale: 1, alpha: 1 }); }
      if (layers.verseKey) {
        const text = `﴿${toArabicDigits(v.n)}﴾`;
        g.font = `${style.arSize * 0.55}px ${fam}`;
        toks.push({ text, w: g.measureText(text).width, weight: -1, scale: 0.55, alpha: 0.8 });
      }
      const lines: Line[] = [];
      let cur: Line = { toks: [], width: 0 };
      for (const t of toks) {
        const add = (cur.toks.length ? space : 0) + t.w;
        if (cur.toks.length && cur.width + add > iw) { lines.push(cur); cur = { toks: [t], width: t.w }; } else { cur.toks.push(t); cur.width += add; }
      }
      if (cur.toks.length) lines.push(cur);
      paras.push({ kind: "ar", font, size: style.arSize, lh: style.arSize * style.leading, alpha: 1, lines });
      let k = 0;
      wordIdx = toks.map((t) => (t.weight >= 0 ? k++ : -1));
    }
    const plain = (text: string, size: number, alpha: number, italic?: boolean) => {
      const font = `${italic ? "italic " : ""}${size}px ${sans}`;
      const text_ = wrapPlain(text, font);
      g.font = font;
      paras.push({ kind: "tr", font, size, lh: size * 1.4, alpha, italic, lines: [], text: text_, widths: text_.map((l) => g.measureText(l).width) });
    };
    if (layers.translit && v.translations[TRANSLITERATION_ID]) plain(v.translations[TRANSLITERATION_ID], style.trSize * 0.85, 0.9, true);
    for (const k of [layers.tr1, layers.tr2]) if (k && v.translations[k]) plain(v.translations[k], style.trSize, 1);
    const height = paras.reduce((s, p) => s + p.lh * (p.kind === "ar" ? p.lines.length : p.text!.length), 0) + Math.max(0, paras.length - 1) * gap;
    return { paras, height, weights, wordIdx };
  };

  const layouts = verses.map(layoutVerse);
  const base = verses[0].start;
  const total = verses[verses.length - 1].end - base;
  const duration = Math.max(0.5, total + o.offset);
  const sh = W * 0.01;
  const hl = style.wordHl;

  const drawText = (fn: () => void) => {
    if (!style.shadow) return fn();
    g.save(); g.shadowColor = "rgba(0,0,0,.85)"; g.shadowBlur = sh; g.shadowOffsetY = sh * 0.2; fn(); g.restore();
    g.save(); g.shadowColor = "rgba(0,0,0,.9)"; g.shadowBlur = sh * 0.2; fn(); g.restore();
  };

  const draw = (t: number) => {
    g.clearRect(0, 0, W, H);
    const u = t - o.offset;
    let i = verses.findIndex((v) => u >= v.start - base && u < v.end - base);
    if (i < 0) return;
    const v = verses[i], L = layouts[i];
    if (!L.paras.length) return;
    const bh = L.height + boxPad * 2;
    const avail = H - pad.t - pad.b;
    const top = style.pos === "top" ? pad.t : style.pos === "bottom" ? H - pad.b - bh : pad.t + (avail - bh) / 2;
    if (box) {
      g.fillStyle = "rgba(0,0,0,.55)";
      g.beginPath();
      g.roundRect(pad.l, top, cw, bh, 0.03 * W);
      g.fill();
    }
    const progress = Math.max(0, Math.min(1, (u - (v.start - base)) / (v.end - v.start)));
    const total_ = L.weights.reduce((a, b) => a + b, 0);
    let active = -1, frac = 0;
    if (hl && total_ > 0 && progress > 0) {
      const target = progress * total_;
      let cum = 0;
      for (let k = 0; k < L.weights.length; k++) {
        if (L.weights[k] === 0) continue;
        if (target < cum + L.weights[k] || k === L.weights.length - 1) { active = k; frac = Math.min(1, Math.max(0, (target - cum) / L.weights[k])); break; }
        cum += L.weights[k];
      }
    }
    const left = pad.l + boxPad, right = left + iw;
    let y = top + boxPad;
    let wi = 0;
    for (const p of L.paras) {
      g.font = p.font;
      const m = g.measureText("مAg");
      const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      const place = (w: number) => (style.align === "left" ? left : style.align === "right" ? right - w : left + (iw - w) / 2);
      if (p.kind === "ar") {
        g.direction = "rtl"; g.textAlign = "right";
        const space = g.measureText(" ").width;
        for (const ln of p.lines) {
          const base_ = y + (p.lh - (asc + desc)) / 2 + asc;
          let xr = place(ln.width) + ln.width;
          for (const tk of ln.toks) {
            const done = hl && tk.weight > 0 && active >= 0 && L.wordIdx[wi] <= active && L.wordIdx[wi] >= 0;
            const isActive = hl && tk.weight > 0 && L.wordIdx[wi] === active;
            if (tk.weight >= 0) wi++;
            if (isActive) {
              g.fillStyle = style.hlColor || "#fcd34d";
              g.globalAlpha = 0.38;
              g.fillRect(xr - tk.w * frac, base_ - asc, tk.w * frac, asc + desc);
              g.globalAlpha = 1;
            }
            g.font = tk.scale === 1 ? p.font : `${p.size * tk.scale}px ${fam}`;
            g.globalAlpha = tk.alpha;
            g.fillStyle = done ? style.hlColor || "#fcd34d" : style.color;
            const xx = xr;
            drawText(() => g.fillText(tk.text, xx, base_));
            g.globalAlpha = 1;
            xr -= tk.w + space;
          }
          y += p.lh;
        }
      } else {
        g.direction = "ltr"; g.textAlign = "left";
        p.text!.forEach((line, k) => {
          const base_ = y + (p.lh - (asc + desc)) / 2 + asc;
          g.globalAlpha = p.alpha;
          g.fillStyle = style.color;
          const xx = place(p.widths![k]);
          drawText(() => g.fillText(line, xx, base_));
          g.globalAlpha = 1;
          y += p.lh;
        });
      }
      y += gap;
    }
  };

  let hiddenSeen = false;
  const onVis = () => { if (document.hidden) hiddenSeen = true; };
  document.addEventListener("visibilitychange", onVis);
  const started = performance.now();
  try {
    const blob = await record(canvas, sup.mime, 4_000_000, (t) => {
      draw(t);
      o.onProgress(Math.min(1, t / duration), t);
      return t >= duration;
    }, o.signal);
    const alpha = hasAlphaMarker(new Uint8Array(await blob.arrayBuffer()));
    if (hiddenSeen) throw new Error("The tab was hidden while rendering, which pauses the browser's drawing and leaves gaps. Keep this tab in the foreground and render again.");
    return { blob, alpha, duration: (performance.now() - started) / 1000 };
  } finally {
    document.removeEventListener("visibilitychange", onVis);
  }
}
