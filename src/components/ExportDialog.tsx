"use client";

import Attribution, { sourcesFor } from "./Attribution";
import { AlertTriangle, Download, Loader2, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { strToU8, zipSync } from "fflate";
import { appFetch, type Upgrade } from "../lib/app/client";
import { FREE_LIMITS } from "../lib/app/plans";
import { overlaySupport, renderOverlay, type OverlayStyle, type Support } from "../lib/overlay";
import { DEFAULT_SPLIT, fmt, toArabicDigits, buildCaptions, creditLines, toSRT, toVTT, type Verse } from "../data";
import { TRANSLITERATION_ID, type ApiVerse, type Chapter, type Reciter, type TranslationRes } from "../lib/quran/types";

export type Layers = { arabic: boolean; tr1: string | null; tr2: string | null; translit: boolean; verseKey: boolean };

export type RangeSnap = { surah: number; from: number; to: number; durs?: number[] };

type Format = "srt" | "vtt";
type Mode = "combined" | "separate";
type OptionId = "srt" | "vtt" | "combined" | "separate" | "overlay";

const EDITORS = ["CapCut", "Premiere Pro", "DaVinci Resolve", "Filmora"] as const;

const IMPORT: Record<Exclude<OptionId, "overlay">, Record<(typeof EDITORS)[number], string>> = {
  srt: {
    CapCut: "Captions → Local captions → Import, then choose the .srt file.",
    "Premiere Pro": "File → Import the .srt, then drag the caption item onto a track above your video.",
    "DaVinci Resolve": "File → Import → Subtitle…, then drag the clip onto a subtitle track.",
    Filmora: "Titles → Subtitles → Import, then choose the .srt file.",
  },
  vtt: {
    CapCut: "SRT is the safest choice here. If .vtt isn't accepted, export SRT instead.",
    "Premiere Pro": "File → Import the .vtt as a caption track. If you see an error, use SRT.",
    "DaVinci Resolve": "File → Import → Subtitle… and select the .vtt. Use SRT if your version only lists .srt.",
    Filmora: "Subtitles → Import. If the .vtt isn't accepted, export SRT instead.",
  },
  combined: {
    CapCut: "Import as one caption track. Both lines share one style, so pick an Arabic-friendly font.",
    "Premiere Pro": "Import one file. Set an Arabic-capable font for the captions in Essential Graphics → Text.",
    "DaVinci Resolve": "Import as one subtitle track and style both lines together in the Inspector.",
    Filmora: "Import one file. Both lines share one style, so choose a font that supports Arabic.",
  },
  separate: {
    CapCut: "Import the Arabic file, then the translation file, and style each track on its own.",
    "Premiere Pro": "Import both files and place them on two caption tracks to style them separately.",
    "DaVinci Resolve": "Import both, and drop each onto its own subtitle track (right-click to add a track).",
    Filmora: "Import both files. Each becomes its own subtitle track you can style separately.",
  },
};

const IMPORT_OVERLAY: Record<(typeof EDITORS)[number], string> = {
  CapCut: "Import the .webm and place it on an overlay track above your footage. WebM transparency support varies by version and platform, so test a short clip first.",
  "Premiere Pro": "Premiere's WebM support is limited and depends on the version. If it will not import, or shows a solid background, convert the file to a format with alpha (for example ProRes 4444) using a converter that keeps transparency.",
  "DaVinci Resolve": "WebM import depends on your version and operating system. If the clip will not import or comes in with a background, convert it to ProRes 4444 or a PNG sequence first.",
  Filmora: "Import the .webm and drag it to a track above your footage. Some versions ignore the alpha channel, so check the result on a test clip.",
};

const LANG_CODE: Record<string, string> = {
  english: "en", urdu: "ur", french: "fr", indonesian: "id", turkish: "tr", spanish: "es", german: "de", bengali: "bn",
  russian: "ru", malay: "ms", persian: "fa", hindi: "hi", portuguese: "pt", italian: "it", dutch: "nl", chinese: "zh",
};
const langCode = (name: string) => LANG_CODE[name.toLowerCase()] ?? (name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 2) || "xx");

function Helper({ id }: { id: OptionId }) {
  return (
    <dl className="grid gap-x-3 gap-y-1.5 text-xs sm:grid-cols-[7rem_1fr]">
      {EDITORS.map((e) => (
        <div key={e} className="contents">
          <dt className="font-semibold text-foreground">{e}</dt>
          <dd className="text-muted-foreground">{id === "overlay" ? IMPORT_OVERLAY[e] : IMPORT[id][e]}</dd>
        </div>
      ))}
    </dl>
  );
}

function Option({
  id, group, checked, disabled, title, desc, badge, helpOpen, onHelp, onSelect,
}: {
  id: OptionId; group: string; checked: boolean; disabled?: boolean; title: string; desc: string; badge?: string;
  helpOpen: boolean; onHelp: () => void; onSelect: () => void;
}) {
  return (
    <div className={`rounded-sm border transition ${checked ? "border-primary bg-secondary/60 ring-1 ring-primary" : "border-border"} ${disabled ? "border-dashed opacity-70" : ""}`}>
      <label className={`flex items-start gap-3 p-3.5 ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-muted/60"}`}>
        <input
          type="radio" name={group} checked={checked} disabled={disabled} onChange={onSelect}
          className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <b className="text-sm">{title}</b>
            {badge && <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-gold uppercase">{badge}</span>}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
        </span>
      </label>
      {!disabled && (
        <div className="px-3.5 pb-3 pl-10">
          <button type="button" onClick={onHelp} aria-expanded={helpOpen} className="text-xs font-semibold text-gold underline-offset-2 hover:underline">
            {helpOpen ? "Hide import steps" : "How to import"}
          </button>
          {helpOpen && <div className="mt-2.5"><Helper id={id} /></div>}
        </div>
      )}
    </div>
  );
}

export default function ExportDialog({ ranges, activeIndex, chapters, verses, layers, chapter, translations, reciter, isPro, requestUpgrade, onClose, onExported, style, ratio }: { style: OverlayStyle & { tajweed?: boolean }; ratio: string; ranges: RangeSnap[]; activeIndex: number; chapters: Chapter[]; isPro: boolean; requestUpgrade: (u: Upgrade) => void; verses: Verse[]; layers: Layers; chapter: Chapter; translations: TranslationRes[]; reciter?: Reciter | null; onClose: () => void; onExported?: () => void }) {
  const slugOf = (id: number) => (chapters.find((c) => c.id === id)?.nameSimple ?? `surah-${id}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [format, setFormat] = useState<Format>("srt");
  const [kind, setKind] = useState<"captions" | "overlay">("captions");
  const [support, setSupport] = useState<Support | "checking" | null>(null);
  const [ov, setOv] = useState<{ phase: "idle" | "rendering" | "done" | "nocheck"; p: number; t: number; blob?: Blob; err?: string }>({ phase: "idle", p: 0, t: 0 });
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (kind !== "overlay" || support) return;
    let dead = false;
    setSupport("checking");
    overlaySupport().then((s) => { if (!dead) setSupport(s); });
    return () => { dead = true; };
  }, [kind, support]);
  const [mode, setMode] = useState<Mode>("combined");
  const [offset, setOffset] = useState(0);
  const [credit, setCredit] = useState(true);
  const [splitOn, setSplitOn] = useState(DEFAULT_SPLIT.enabled);
  const [maxAr, setMaxAr] = useState(DEFAULT_SPLIT.maxAr);
  const [maxTr, setMaxTr] = useState(DEFAULT_SPLIT.maxTr);
  const split = useMemo(() => ({ enabled: splitOn, maxAr: Math.min(500, Math.max(10, maxAr)), maxTr: Math.min(500, Math.max(10, maxTr)) }), [splitOn, maxAr, maxTr]);
  const [verseKey, setVerseKey] = useState(layers.verseKey);
  const [help, setHelp] = useState<OptionId | null>("srt");
  const multi = ranges.length > 1;
  const [perRange, setPerRange] = useState(true);
  const [asZip, setAsZip] = useState(true);

  const trIds = [layers.tr1, layers.tr2].filter(Boolean) as string[];
  const hasTranslation = trIds.length > 0 || layers.translit;
  const langs = [...new Set(trIds.map((id) => langCode(translations.find((t) => String(t.id) === id)?.language ?? "")))];
  const trCode = langs.length ? langs.join("-") : "translit";

  // verses for every range: the active one comes from the editor, the others are fetched and timed from their saved durations
  const fetchIds = [...new Set([layers.tr1, layers.tr2, layers.translit ? TRANSLITERATION_ID : null].filter(Boolean) as string[])].sort().join(",");
  const rangesKey = JSON.stringify(ranges.map((r, i) => (i === activeIndex ? [r.surah, r.from, r.to] : [r.surah, r.from, r.to, r.durs ?? null])));
  const [others, setOthers] = useState<Record<number, Verse[]>>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    setLoadErr(null);
    Promise.all(ranges.map(async (r, i) => {
      if (i === activeIndex) return [i, null] as const;
      const res = await fetch(`/api/quran/verses?surah=${r.surah}&from=${r.from}&to=${r.to}&translations=${fetchIds}`);
      if (!res.ok) throw new Error("Couldn't load the verses for one of your ranges.");
      const j = (await res.json()) as { verses: ApiVerse[] };
      const list = j.verses.filter((v) => v.n >= r.from && v.n <= r.to);
      if (list.length !== r.to - r.from + 1) throw new Error("Couldn't load the verses for one of your ranges.");
      let acc = 0;
      return [i, list.map((v, k) => { const start = acc; acc += r.durs?.[k] ?? 5; return { ...v, start, end: acc } as Verse; })] as const;
    })).then((r) => { if (!dead) setOthers(Object.fromEntries(r.filter(([, v]) => v).map(([i, v]) => [i, v as Verse[]]))); })
      .catch((e: Error) => { if (!dead) setLoadErr(e.message); });
    return () => { dead = true; };
  }, [rangesKey, fetchIds, activeIndex]);
  const rv = useMemo(() => ranges.map((_, i) => (i === activeIndex ? verses : others[i])), [ranges, activeIndex, verses, others]);
  const loading = rv.some((v) => !v) && !loadErr;
  const untimed = ranges.some((r, i) => i !== activeIndex && !r.durs);

  const groups = useMemo(() => (multi && perRange ? ranges.map((_, i) => [i]) : [ranges.map((_, i) => i)]), [multi, perRange, ranges]);
  const files = useMemo(() => {
    const base = { ...layers, verseKey };
    const variants: { code: string; layers: Layers }[] =
      mode === "combined" || !hasTranslation || !layers.arabic
        ? [{ code: [layers.arabic ? "ar" : null, hasTranslation ? trCode : null].filter(Boolean).join("-") || "ar", layers: base }]
        : [{ code: "ar", layers: { ...base, tr1: null, tr2: null, translit: false } }, { code: trCode, layers: { ...base, arabic: false } }];
    const used = new Set<string>();
    const out: { name: string; layers: Layers; ranges: number[] }[] = [];
    for (const g of groups) {
      const label = g.map((i) => `${slugOf(ranges[i].surah)}_${ranges[i].from}-${ranges[i].to}`).join("_");
      for (const v of variants) {
        const stem = label.length + v.code.length > 70 ? `batch-${g.length}-ranges` : label;
        let name = `${stem}_${v.code}.${format}`;
        for (let n = 2; used.has(name); n++) name = `${stem}-${n}_${v.code}.${format}`;
        used.add(name);
        out.push({ name, layers: v.layers, ranges: g });
      }
    }
    return out;
  }, [layers, verseKey, mode, hasTranslation, trCode, format, groups, ranges, chapters]);

  const capsFor = (f: { layers: Layers; ranges: number[] }) => {
    let run = 0;
    const caps: ReturnType<typeof buildCaptions> = [];
    for (const i of f.ranges) {
      const vs = rv[i];
      if (!vs?.length) continue;
      caps.push(...buildCaptions(vs, f.layers, offset + run, split));
      run += vs[vs.length - 1].end - vs[0].start;
    }
    return caps;
  };
  const rendered = files.map((f) => {
    const caps = capsFor(f);
    const cr = credit ? creditLines(translations.filter((t) => t.id === f.layers.tr1 || t.id === f.layers.tr2)) : undefined;
    const body = (format === "srt" ? toSRT(caps, cr) : toVTT(caps, cr)).replace(/\r?\n/g, "\r\n");
    return { ...f, caps, body };
  });
  const captionCount = rendered.reduce((n, f) => n + f.caps.length, 0);
  const empty = !loading && rendered.every((f) => f.caps.length === 0);
  const separateUnavailable = mode === "separate" && (!hasTranslation || !layers.arabic);
  const totalVerses = ranges.reduce((n, r) => n + (r.to - r.from + 1), 0);
  const zipped = asZip && files.length > 1;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = (name: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const download = async () => {
    if (busy || loading || loadErr) return;
    if (!isPro && totalVerses > FREE_LIMITS.verses) { onClose(); return requestUpgrade({ code: "verse_limit" }); }
    setBusy(true);
    setError(null);
    const r = await appFetch<{ files: { name: string; body: string }[] }>("/api/app/export", {
      body: {
        ranges: ranges.map((x, i) => ({ surah: x.surah, from: x.from, to: x.to, timings: rv[i]!.map((v) => ({ n: v.n, start: v.start, end: v.end })) })),
        offset, format, split, credit,
        files: files.map((f) => ({ name: f.name, layers: f.layers, ranges: f.ranges })),
      },
    });
    setBusy(false);
    if (!r.ok) {
      if (r.status === 402) { onClose(); return requestUpgrade({ code: "verse_limit", message: r.error }); }
      return setError(r.error);
    }
    const out = r.data.files.filter((f) => f.body.trim());
    if (zipped) {
      const zip = zipSync(Object.fromEntries(out.map((f) => [f.name, strToU8("\uFEFF" + f.body)])), { level: 6 });
      save(`quran-captions_${format}.zip`, new Blob([zip as BlobPart], { type: "application/zip" }));
    } else {
      out.forEach((f, i) => setTimeout(() => save(f.name, new Blob(["\uFEFF" + f.body], { type: "text/plain;charset=utf-8" })), i * 350));
    }
    onExported?.();
    setTimeout(onClose, zipped ? 400 : out.length * 350);
  };

  const overlayName = `${slugOf(ranges[activeIndex].surah)}_${ranges[activeIndex].from}-${ranges[activeIndex].to}_overlay.webm`;
  const overlayLen = Math.max(0.5, verses[verses.length - 1].end - verses[0].start + offset);
  const startOverlay = async () => {
    if (ov.phase === "rendering") return;
    abort.current = new AbortController();
    setOv({ phase: "rendering", p: 0, t: 0 });
    try {
      const r = await renderOverlay({
        verses, layers: { ...layers, verseKey }, style: { ...style, wordHl: style.wordHl !== false }, ratio, offset, signal: abort.current.signal,
        onProgress: (p, t) => setOv((o) => (o.phase === "rendering" ? { ...o, p, t } : o)),
      });
      if (r.alpha) {
        save(overlayName, r.blob);
        setOv({ phase: "done", p: 1, t: r.duration });
        onExported?.();
      } else {
        setOv({ phase: "nocheck", p: 1, t: r.duration, blob: r.blob });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") setOv({ phase: "idle", p: 0, t: 0 });
      else setOv({ phase: "idle", p: 0, t: 0, err: (e as Error).message || "Rendering failed." });
    }
  };
  const nudge = (d: number) => setOffset((o) => Math.round((o + d) * 10) / 10);
  const pick = (id: OptionId, fn: () => void) => () => { fn(); setHelp(id); };
  const toggleHelp = (id: OptionId) => () => setHelp((h) => (h === id ? null : id));
  const legend = "mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase";

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label="Export captions" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-none border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-md"
      >
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 className="font-display text-xl font-bold">Export captions</h2>
            <p className="text-sm text-muted-foreground">{multi ? `${ranges.length} ranges · ${totalVerses} verses` : `${chapter.nameSimple} · ayat ${ranges[0].from}–${ranges[0].to}`} · UTF-8 · {format.toUpperCase()}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-secondary"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <fieldset>
            <legend className={legend}>Format</legend>
            <div className="space-y-2.5">
              <Option id="srt" group="format" checked={kind === "captions" && format === "srt"} title="SRT" badge="Recommended" desc="Works in nearly every video editor." helpOpen={help === "srt"} onHelp={toggleHelp("srt")} onSelect={pick("srt", () => { setKind("captions"); setFormat("srt"); })} />
              <Option id="vtt" group="format" checked={kind === "captions" && format === "vtt"} title="VTT" desc="WebVTT, for web players and some editors." helpOpen={help === "vtt"} onHelp={toggleHelp("vtt")} onSelect={pick("vtt", () => { setKind("captions"); setFormat("vtt"); })} />
              <Option id="overlay" group="format" checked={kind === "overlay"} title="Transparent video overlay" badge="Pro" desc="WebM with alpha channel to drop above your footage. Captions only, no audio." helpOpen={help === "overlay"} onHelp={toggleHelp("overlay")} onSelect={() => { if (!isPro) { onClose(); return requestUpgrade({ code: "overlay_video" }); } setKind("overlay"); setHelp("overlay"); }} />
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">SRT and VTT files can&apos;t carry colors. Tajweed colors appear in the editor preview only; the transparent video does not draw them yet.</p>
          </fieldset>

          {kind === "overlay" && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-sm border border-border p-3.5 text-sm">
                <p className="text-xs text-muted-foreground">Draws your styled captions (Arabic, translations, font, colors, shadow, canvas size) on a transparent {ratio} canvas, in sync with your verse timing, and records a WebM with an alpha channel. The file has no audio, so keep your own recitation on its own track.</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label htmlFor="ovoffset" className="text-sm">Timing offset <span className="block text-xs text-muted-foreground">seconds of blank video before the first verse</span></label>
                  <div className="flex items-center">
                    <button type="button" aria-label="Subtract 0.1 seconds" onClick={() => nudge(-0.1)} className="grid size-9 place-items-center rounded-l-sm border border-border hover:bg-muted"><Minus size={14} /></button>
                    <input id="ovoffset" type="number" step="0.1" value={offset} onChange={(e) => setOffset(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)} className="h-9 w-20 border-y border-border bg-background text-center font-mono text-sm" />
                    <button type="button" aria-label="Add 0.1 seconds" onClick={() => nudge(0.1)} className="grid size-9 place-items-center rounded-r-sm border border-border hover:bg-muted"><Plus size={14} /></button>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                  <span>Show verse number <span translate="no" className="font-mono text-xs text-muted-foreground">﴿{toArabicDigits(verses[0].n)}﴾</span></span>
                  <input type="checkbox" role="switch" checked={verseKey} onChange={(e) => setVerseKey(e.target.checked)} className="size-4 accent-[var(--primary)]" />
                </label>
              </div>
              <div role="status" className="flex gap-2.5 rounded-sm border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span><strong>This renders in real time.</strong> This clip is about {fmt(overlayLen)} long, so it will take about {fmt(overlayLen)} to render. Keep this tab open and visible until it finishes; switching tabs pauses the drawing and leaves gaps.</span>
              </div>
              {multi && <p className="text-xs text-muted-foreground">You have {ranges.length} ranges. The overlay covers the range currently open in the editor ({slugOf(ranges[activeIndex].surah)} {ranges[activeIndex].from}–{ranges[activeIndex].to}); render the others one at a time.</p>}
              {(style.bg === "solid") && <p className="text-xs text-muted-foreground">Your solid background color is not drawn, so the video stays transparent. The semi-transparent box background is drawn.</p>}
              {style.tajweed && <p className="text-xs text-muted-foreground">Tajweed colors are not drawn into the video yet. The Arabic uses your text color.</p>}
              {style.wordHl !== false && <p className="text-xs text-muted-foreground">Word highlighting is drawn and stays an estimate based on word length, as in the preview.</p>}
              {support === "checking" && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" /> Checking whether this browser can record transparency…</p>}
              {support && support !== "checking" && !support.ok && (
                <div role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 p-3.5 text-sm">
                  <strong>Transparent video is not available in this browser.</strong>
                  <p className="mt-1 text-xs">{support.message} Safari and Firefox cannot record WebM with transparency. Nothing is exported, so you will not get a file with a black background.</p>
                  <p className="mt-1 text-xs">You can still export SRT or VTT captions from this dialog.</p>
                </div>
              )}
              {support && support !== "checking" && support.ok && <p className="text-xs text-muted-foreground">This browser can record transparency. The finished file is checked for an alpha channel before it downloads.</p>}
              {ov.err && <p role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 p-3 text-xs">{ov.err}</p>}
              {ov.phase === "rendering" && (
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Rendering in real time…</span><span className="font-mono">{fmt(ov.t)} / {fmt(overlayLen)} · {Math.round(ov.p * 100)}%</span></div>
                  <div role="progressbar" aria-label="Rendering progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ov.p * 100)} className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${ov.p * 100}%` }} /></div>
                </div>
              )}
              {ov.phase === "done" && <p role="status" className="rounded-sm border border-primary/40 bg-secondary/60 p-3 text-xs"><strong>{overlayName}</strong> was saved. If it appears with a solid background in your editor, that editor does not support WebM transparency.</p>}
              {ov.phase === "nocheck" && ov.blob && (
                <div role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 p-3.5 text-xs">
                  <strong>No transparency was found in the recorded file.</strong> It would most likely have a black background, so it has not been downloaded.
                  <button type="button" onClick={() => { save(overlayName, ov.blob!); onExported?.(); }} className="mt-2 block font-semibold underline underline-offset-2">Download anyway (may have a black background)</button>
                </div>
              )}
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Support varies.</strong> Some video editors do not support WebM with alpha at all. If yours does not, use the SRT export instead, or convert the file to a format with alpha such as ProRes 4444.</p>
            </div>
          )}

          {kind === "captions" && <>
          <fieldset>
            <legend className={legend}>Files</legend>
            <div className="space-y-2.5">
              <Option id="combined" group="mode" checked={mode === "combined"} title="Combined file" desc="Arabic on the first line, translation on the second, in each caption." helpOpen={help === "combined"} onHelp={toggleHelp("combined")} onSelect={pick("combined", () => setMode("combined"))} />
              <Option id="separate" group="mode" checked={mode === "separate"} title="Separate files" desc="One Arabic file and one translation file, so each can be styled on its own." helpOpen={help === "separate"} onHelp={toggleHelp("separate")} onSelect={pick("separate", () => setMode("separate"))} />
            </div>
            {separateUnavailable && (
              <p role="status" className="mt-2 text-xs text-muted-foreground">
                Separate files need Arabic and at least one translation layer turned on. Exporting a single file instead.
              </p>
            )}
          </fieldset>

          {multi && (
            <fieldset>
              <legend className={legend}>Ranges</legend>
              <div className="space-y-3 rounded-sm border border-border p-3.5">
                <p className="text-xs text-muted-foreground">
                  {ranges.map((r, i) => `${slugOf(r.surah)} ${r.from}–${r.to}`).join(" · ")}
                </p>
                <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  <span>Export each range as a separate file <span className="block text-xs text-muted-foreground">Each file starts at 0:00. Turn off to join all ranges one after another in one timeline.</span></span>
                  <input type="checkbox" role="switch" checked={perRange} onChange={(e) => setPerRange(e.target.checked)} className="size-4 shrink-0 accent-[var(--primary)]" />
                </label>
                <label className={`flex items-center justify-between gap-3 border-t border-border pt-3 text-sm ${files.length > 1 ? "cursor-pointer" : "opacity-60"}`}>
                  <span>Download all as .zip <span className="block text-xs text-muted-foreground">{files.length > 1 ? `Bundles ${files.length} files into one download.` : "Only one file will be created."}</span></span>
                  <input type="checkbox" role="switch" checked={asZip} disabled={files.length < 2} onChange={(e) => setAsZip(e.target.checked)} className="size-4 shrink-0 accent-[var(--primary)]" />
                </label>
                {untimed && <p role="status" className="text-xs text-amber-700 dark:text-amber-400">Some ranges haven&apos;t been timed yet, so they use 5 seconds per verse. Open each range in the editor to measure its timing first.</p>}
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend className={legend}>Credit</legend>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-border p-3.5 text-sm">
              <span>Include translation credit <span className="block text-xs text-muted-foreground">{format === "srt" ? "Adds a final 3-second caption naming each translation source." : "Adds a NOTE comment naming each translation source. Players do not display it."}</span></span>
              <input type="checkbox" role="switch" checked={credit} onChange={(e) => setCredit(e.target.checked)} className="size-4 shrink-0 accent-[var(--primary)]" />
            </label>
          </fieldset>

          <fieldset>
            <legend className={legend}>Timing &amp; text</legend>
            <div className="space-y-3 rounded-sm border border-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="offset" className="text-sm">
                  Timing offset <span className="block text-xs text-muted-foreground sm:inline">seconds, use + if your audio has an intro</span>
                </label>
                <div className="flex items-center">
                  <button type="button" aria-label="Subtract 0.1 seconds" onClick={() => nudge(-0.1)} className="grid size-9 place-items-center rounded-l-sm border border-border hover:bg-muted"><Minus size={14} /></button>
                  <input
                    id="offset" type="number" step="0.1" value={offset}
                    onChange={(e) => setOffset(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)}
                    className="h-9 w-20 border-y border-border bg-background text-center font-mono text-sm"
                  />
                  <button type="button" aria-label="Add 0.1 seconds" onClick={() => nudge(0.1)} className="grid size-9 place-items-center rounded-r-sm border border-border hover:bg-muted"><Plus size={14} /></button>
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                <span>Split long verses <span className="block text-xs text-muted-foreground">Breaks at pause marks and punctuation; the verse&apos;s time is shared across the parts.</span></span>
                <input type="checkbox" role="switch" checked={splitOn} onChange={(e) => setSplitOn(e.target.checked)} className="size-4 shrink-0 accent-[var(--primary)]" />
              </label>
              <div className={`grid gap-3 sm:grid-cols-2 ${splitOn ? "" : "pointer-events-none opacity-50"}`}>
                {([["Arabic", maxAr, setMaxAr, "maxAr"], ["Translation", maxTr, setMaxTr, "maxTr"]] as const).map(([label, val, set, id]) => (
                  <label key={id} htmlFor={id} className="flex items-center justify-between gap-2 text-sm">
                    <span>Max characters per caption <span className="block text-xs text-muted-foreground">{label}{id === "maxAr" ? ", letters only" : ""}</span></span>
                    <input id={id} type="number" min={10} max={500} step={5} value={val} disabled={!splitOn} onChange={(e) => set(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : val)} className="h-9 w-20 rounded-sm border border-border bg-background text-center font-mono text-sm" />
                  </label>
                ))}
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                <span>Append verse key <span translate="no" className="font-mono text-xs text-muted-foreground">﴿{toArabicDigits(verses[0].n)}﴾</span></span>
                <input type="checkbox" role="switch" checked={verseKey} onChange={(e) => setVerseKey(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              </label>
            </div>
          </fieldset>

          <div>
            <p className={legend}>Preview of output</p>
            <p role="status" aria-live="polite" className="mb-2 text-sm font-medium">This export will create {captionCount} caption{captionCount === 1 ? "" : "s"}.{rendered.length > 1 && <span className="font-normal text-muted-foreground"> ({rendered.map((f) => f.caps.length).join(" + ")} across {rendered.length} files)</span>}{loading && <span className="font-normal text-muted-foreground"> Loading ranges…</span>}</p>
            <div className="space-y-3">
              {rendered.slice(0, 4).map((f) => (
                <div key={f.name} className="overflow-hidden rounded-sm border border-border">
                  <p className="border-b border-border bg-muted px-3 py-1.5 font-mono text-xs">{f.name}</p>
                  <pre translate="no" dir="auto" className="max-h-56 overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {f.caps.length ? f.body.replace(/\r\n/g, "\n").split("\n\n").slice(0, format === "vtt" ? 5 : 4).join("\n\n") : "No captions in this range."}
                  </pre>
                </div>
              ))}
            </div>
            {rendered.length > 4 && <p className="mt-2 font-mono text-xs text-muted-foreground">+ {rendered.length - 4} more: {rendered.slice(4).map((f) => f.name).join(", ")}</p>}
            <div className="mt-3 rounded-sm border border-border bg-muted/40 p-3">
              <p className={legend}>Sources &amp; attribution</p>
              <Attribution translations={sourcesFor(translations, [...new Set([layers.tr1, layers.tr2, layers.translit ? TRANSLITERATION_ID : null])])} reciter={reciter} />
            </div>
            {loadErr && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{loadErr}</p>}
            {empty && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">This offset pushes every caption before 0:00. Increase the offset.</p>}
          </div>
          </>}
        </div>

        <div className="border-t border-border p-5">
          {error && <p role="alert" className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
          {kind === "overlay" ? (
            ov.phase === "rendering" ? (
              <button onClick={() => abort.current?.abort()} className="flex w-full items-center justify-center gap-2 rounded-sm border border-border py-3 font-semibold hover:bg-muted"><X size={18} /> Cancel rendering</button>
            ) : (
              <button onClick={startOverlay} disabled={!support || support === "checking" || !support.ok || !Number.isFinite(verses[0].start)} className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                <Download size={18} /> {support === "checking" || !support ? "Checking browser…" : support.ok ? `Render transparent WebM (about ${fmt(overlayLen)})` : "Not available in this browser"}
              </button>
            )
          ) : (
          <button
            onClick={download} disabled={empty || busy || loading || !!loadErr}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Download size={18} /> {busy ? "Preparing…" : zipped ? `Download ${rendered.length} files as .zip` : `Download ${rendered.length > 1 ? `${rendered.length} ${format.toUpperCase()} files` : `${format.toUpperCase()} file`}`}
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
