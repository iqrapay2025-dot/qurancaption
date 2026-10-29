"use client";

import { AlertCircle, Check, Plus, X, ChevronDown, Cloud, Loader2, Pause, Play, SkipBack, SkipForward, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fmt, toArabicDigits, type Verse } from "../data";
import { DEFAULT_TR1, DEFAULT_TR2, TRANSLITERATION_ID, type ApiErr, DEFAULT_RECITER, type ApiVerse, type SurahAudio, type Chapter, type Reciter, type TranslationRes } from "../lib/quran/types";
import OwnTiming from "./OwnTiming";
import { analyze, checkFile, computeBounds, verseWeight, type OwnAudio } from "../lib/ownAudio";
import { PLATFORMS, platformById, type PlatformId } from "../lib/platforms";
import WordHighlight from "./WordHighlight";
import { TAJWEED_GROUPS, tajweedGroup } from "../lib/quran/tajweed";
import { SITE } from "../lib/site";
import { useApi } from "../lib/quran/useApi";
import { AttributionBar, sourcesFor } from "./Attribution";
import ExportDialog, { type Layers, type RangeSnap } from "./ExportDialog";
import { appFetch, type AppUser, type Preset, type Upgrade } from "../lib/app/client";
import type { AuthRequest } from "./App";
import AccountMenu from "./AccountMenu";
import { FREE_LIMITS } from "../lib/app/plans";
import { Logo, ThemeToggle } from "./shared";

type Ratio = "9:16" | "16:9" | "1:1";
const RATIOS: Record<Ratio, { css: string; max: string; base: number; label: string }> = {
  "9:16": { css: "9 / 16", max: "min(100%, 300px)", base: 1080, label: "Reels / Shorts" },
  "16:9": { css: "16 / 9", max: "100%", base: 1920, label: "YouTube" },
  "1:1": { css: "1 / 1", max: "min(100%, 440px)", base: 1080, label: "Square" },
};
const FONTS = { quran: "Amiri Quran", scheherazade: "Scheherazade New", amiri: "Amiri" } as const;
const COLORS = ["#ffffff", "#f4ead0", "#e6c27a", "#8be0ad"];

function Section({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-border">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between px-5 py-4 text-left font-medium hover:bg-muted/60">
        {title}
        <ChevronDown size={16} className={`text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-4 px-5 pb-5">{children}</div>}
    </section>
  );
}

const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground";
const fieldCls = "w-full rounded-sm border border-border bg-background px-3 py-2 text-sm";

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? "bg-primary" : "bg-border"}`}>
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-sm bg-muted p-1">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} aria-pressed={value === o.v} className={`rounded-sm px-2 py-1.5 text-xs font-medium transition ${value === o.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Range({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className={`${labelCls} flex justify-between`}><span>{label}</span><span className="font-mono">{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[var(--primary)]" />
    </label>
  );
}

const ERROR_COPY: Record<string, string> = {
  not_configured: "The Quran data connection is not set up yet. The server needs its UmmahAPI configuration.",
  network: "Could not reach the server. Check your connection and try again.",
};

function Notice({ what, err, retryIn, onRetry, compact }: { what: string; err: ApiErr; retryIn: number | null; onRetry?: () => void; compact?: boolean }) {
  const limited = err.code === "rate_limited";
  return (
    <div role="alert" className={`rounded-sm border border-red-500/40 bg-red-500/10 text-sm ${compact ? "p-3" : "p-4"}`}>
      <p className="font-medium">{limited ? "Rate limit reached" : `Couldn't load ${what}`}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {limited
          ? `The Quran data service is asking us to slow down.${retryIn ? ` Retrying in ${retryIn}s…` : " Please wait a moment and try again."}`
          : ERROR_COPY[err.code] ?? err.message}
      </p>
      {onRetry && err.code !== "not_configured" && (
        <button onClick={onRetry} className="mt-2 rounded-sm border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-muted">Try again</button>
      )}
    </div>
  );
}

// Projects saved before the UmmahAPI migration hold Quran Foundation numeric ids; map them to supported defaults without touching the stored record.
const MIGRATED_AT = Date.parse("2026-10-25T08:00:00Z");
const migrateTr = (id: string | null | undefined, fallback: string) => (id && /^[a-z_]{2,40}$/.test(id) ? id : fallback);
const migrateReciter = (id: number | null | undefined, updatedAt: string) => (id && Date.parse(updatedAt) >= MIGRATED_AT ? id : null);

function Loading({ label }: { label: string }) {
  return <p role="status" className="animate-pulse text-xs text-muted-foreground">{label}</p>;
}

type SaveStatus = "idle" | "saving" | "saved" | "error" | "guest";
const FONT_FAMILY = { quran: "Amiri Quran", scheherazade: "Scheherazade New", amiri: "Amiri" } as const;
const THUMB: Record<Ratio, [number, number]> = { "9:16": [144, 256], "16:9": [256, 144], "1:1": [200, 200] };

function makeThumbnail(arabic: string, style: { font: keyof typeof FONT_FAMILY; color: string; bg: string; solid: string }, ratio: Ratio) {
  try {
    const [w, h] = THUMB[ratio];
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    if (!g) return undefined;
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, style.bg === "solid" ? style.solid : "#1a2547");
    grad.addColorStop(1, style.bg === "solid" ? style.solid : "#0e6b4a");
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = style.color; g.direction = "rtl"; g.textAlign = "center"; g.textBaseline = "middle";
    const size = Math.round(w / 9);
    g.font = `${size}px "${FONT_FAMILY[style.font]}", serif`;
    const lines: string[] = []; let cur = "";
    for (const word of arabic.split(" ")) {
      const t = cur ? `${cur} ${word}` : word;
      if (g.measureText(t).width > w * 0.84 && cur) { lines.push(cur); cur = word; } else cur = t;
    }
    if (cur) lines.push(cur);
    const shown = lines.slice(0, Math.floor((h * 0.8) / (size * 1.9)) || 1);
    shown.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (shown.length - 1) / 2) * size * 1.9));
    const url = c.toDataURL("image/jpeg", 0.72);
    return url.length < 70_000 ? url : undefined;
  } catch {
    return undefined;
  }
}

const EXPORT_KEY = "qcs-guest-exports";

function SaveIndicator({ status, savedAt, onRetry, onSignup }: { status: SaveStatus; savedAt: Date | null; onRetry: () => void; onSignup: () => void }) {
  const cls = "flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground";
  let node: ReactNode = null;
  if (status === "saving") node = <span className={cls}><Loader2 size={14} className="animate-spin" /><span className="hidden sm:inline">Saving…</span></span>;
  else if (status === "saved") node = <span className={cls} title={savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : undefined}><Check size={14} className="text-primary" /><span className="hidden sm:inline">Saved</span></span>;
  else if (status === "error") node = <button onClick={onRetry} className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-red-600 hover:underline dark:text-red-400"><AlertCircle size={14} /><span className="hidden sm:inline">Couldn't save · Retry</span></button>;
  else if (status === "guest") node = <button onClick={onSignup} className={`${cls} hover:text-foreground`}><Cloud size={14} /><span className="hidden sm:inline">Not saved · Sign up to save</span></button>;
  return <div role="status" aria-live="polite" aria-label="Save status">{node}</div>;
}

export default function Editor({ projectId, user, sessionReady, requestAuth, requestUpgrade, onSettings, onSignOut, onHome, onProjects, dark, toggleTheme }: {
  projectId: string | null; user: AppUser | null; sessionReady: boolean; requestAuth: (r: AuthRequest) => void; requestUpgrade: (u: Upgrade) => void; onSettings: () => void; onSignOut: () => void;
  onHome: () => void; onProjects: () => void; dark: boolean; toggleTheme: () => void;
}) {
  const [project, setProject] = useState("Quran recitation");
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState<"preview" | "controls" | "verses">("preview");

  const [surahId, setSurahId] = useState(1);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(7);
  const [layers, setLayers] = useState<Layers>({ arabic: true, tr1: DEFAULT_TR1, tr2: null, translit: false, verseKey: true });
  const [audioMode, setAudioMode] = useState<"chapter" | "ayah">("chapter");
  const [reciterId, setReciterId] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [style, setStyle] = useState({
    font: "quran" as keyof typeof FONTS, arSize: 76, trSize: 38, color: "#ffffff", shadow: true,
    bg: "transparent" as "transparent" | "solid" | "box", solid: "#1a2547", align: "center" as "left" | "center" | "right",
    leading: 1.9, pos: "middle" as "top" | "middle" | "bottom", tajweed: false, wordHl: true, hlColor: "#fcd34d",
    platform: null as PlatformId | null, guide: false,
  });
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [ranges, setRanges] = useState<RangeSnap[]>([]);
  const [active, setActive] = useState(0);

  const chaptersQ = useApi<{ environment: string; chapters: Chapter[] }>("/api/quran/chapters");
  const translationsQ = useApi<{ translations: TranslationRes[] }>("/api/quran/translations");
  const ownPro = user?.plan === "pro";
  const [verseUsage, setVerseUsage] = useState<{ used: number; limit: number | null; remaining: number | null; resetAt: string | null } | null>(null);
  const [ownOn, setOwnOn] = useState(false);
  const [own, setOwn] = useState<OwnAudio | null>(null);
  const [ownBusy, setOwnBusy] = useState(false);
  const [ownErr, setOwnErr] = useState<string | null>(null);
  const ownActive = ownOn && ownPro && !!own;
  const ownRef = useRef<OwnAudio | null>(null);
  ownRef.current = own;
  useEffect(() => () => { if (ownRef.current) URL.revokeObjectURL(ownRef.current.url); }, []);
  useEffect(() => {
    if (!user || sessionReady === false) return;
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/app/usage", { credentials: "same-origin" }).catch(() => null);
      if (!r || cancelled) return;
      const j = await r.json().catch(() => null);
      if (!cancelled && j?.verses) setVerseUsage(j.verses);
    })();
    return () => { cancelled = true; };
  }, [user, sessionReady]);
  const ayahMode = audioMode === "ayah" && !ownActive;
  const recitersQ = useApi<{ reciters: Reciter[] }>("/api/quran/reciters");
  const chapters = chaptersQ.data?.chapters ?? [];
  const translations = translationsQ.data?.translations ?? [];
  const reciters = recitersQ.data?.reciters ?? [];
  const chapter = chapters.find((c) => c.id === surahId);
  const reciter = reciters.find((r) => r.id === reciterId) ?? reciters.find((r) => r.id === DEFAULT_RECITER) ?? reciters[0];
  const trGroups = useMemo(() => {
    const m = new Map<string, TranslationRes[]>();
    for (const t of translations) if (t.id !== TRANSLITERATION_ID) m.set(t.language, [...(m.get(t.language) ?? []), t]);
    return [...m.entries()].sort(([a], [b]) => (a === "english" ? -1 : b === "english" ? 1 : a.localeCompare(b)));
  }, [translations]);

  const trIds = [...new Set([layers.tr1, layers.tr2, layers.translit ? TRANSLITERATION_ID : null].filter(Boolean) as string[])].sort();
  const versesQ = useApi<{ verses: ApiVerse[] }>(chapter ? `/api/quran/verses?surah=${surahId}&from=${from}&to=${to}&translations=${trIds.join(",")}${style.tajweed ? "&tajweed=1" : ""}` : null);
  const audioQ = useApi<SurahAudio>(chapter && reciter ? `/api/quran/audio?surah=${surahId}&reciter=${reciter.id}` : null);
  const surahAudio = audioQ.data && audioQ.data.surah === surahId && audioQ.data.reciterId === reciter?.id ? audioQ.data : null;
  const chapterAudio = !ayahMode ? surahAudio : null;
  const ayahAudio = ayahMode ? surahAudio : null;
  const [audioFailed, setAudioFailed] = useState(false);
  const [manualDur, setManualDur] = useState<Record<string, number>>({});
  const [probed, setProbed] = useState<Record<string, number | null>>({});
  const [fileDur, setFileDur] = useState(0);
  const [playIdx, setPlayIdx] = useState(0);
  const playIdxRef = useRef(0);
  const pending = useRef<{ at: number; play: boolean } | null>(null);

  const rangeVerses = useMemo(
    () => (versesQ.data?.verses ?? []).filter((v) => v.key.startsWith(`${surahId}:`) && v.n >= from && v.n <= to),
    [versesQ.data, surahId, from, to],
  );
  const ayahFiles = useMemo(() => {
    const m = new Map<string, SurahAudio["files"][number]>();
    for (const f of ayahAudio?.files ?? []) m.set(f.verseKey, f);
    return m;
  }, [ayahAudio]);
  const rangeFiles = useMemo(() => rangeVerses.flatMap((v) => (ayahFiles.get(v.key) ? [ayahFiles.get(v.key)!] : [])), [rangeVerses, ayahFiles]);
  const probing = ayahMode && rangeFiles.some((f) => !(f.audioUrl in probed));
  useEffect(() => {
    const todo = rangeFiles.filter((f) => !(f.audioUrl in probed));
    if (!todo.length) return;
    let dead = false;
    Promise.all(todo.map((f) => new Promise<[string, number | null]>((resolve) => {
      const a = new Audio();
      a.preload = "metadata";
      const finish = (d: number | null) => { clearTimeout(timer); a.onloadedmetadata = a.onerror = null; resolve([f.audioUrl, d]); };
      const timer = setTimeout(() => finish(null), 10_000);
      a.onloadedmetadata = () => finish(Number.isFinite(a.duration) && a.duration > 0 ? a.duration : null);
      a.onerror = () => finish(null);
      a.src = f.audioUrl;
    }))).then((r) => { if (!dead) setProbed((p) => ({ ...p, ...Object.fromEntries(r) })); });
    return () => { dead = true; };
  }, [rangeFiles, probed]);

  const { verses, manualKeys, missingAudio } = useMemo(() => {
    const manual = new Set<string>();
    let missing = false;
    const est = new Map<string, number>();
    if (!ayahMode && fileDur > 0 && chapter && from === 1 && rangeVerses.length === chapter.versesCount) {
      const w = rangeVerses.map((v) => v.arabic.replace(/[^\p{L}]/gu, "").length + 4);
      const sum = w.reduce((a, b) => a + b, 0);
      rangeVerses.forEach((v, i) => est.set(v.key, Math.max(0.5, (fileDur * w[i]) / sum)));
    }
    const dur = (k: string) => Math.max(0.5, manualDur[k] ?? est.get(k) ?? 5);
    if (ownActive && own) {
      const res = computeBounds(rangeVerses.map((v) => verseWeight(v.arabic)), own.startT, own.endT, own.marks);
      const list: Verse[] = rangeVerses.map((v, i) => ({ ...v, start: res!.bounds[i], end: res!.bounds[i + 1] }));
      return { verses: list, manualKeys: manual, missingAudio: false };
    }
    if (!ayahMode) {
      let acc = 0;
      const list: Verse[] = rangeVerses.map((v) => {
        if (!chapterAudio) return { ...v, start: NaN, end: NaN };
        manual.add(v.key);
        const start = acc;
        acc += dur(v.key);
        return { ...v, start, end: acc };
      });
      const last = list[list.length - 1];
      if (last && fileDur > last.end) last.end = fileDur;
      return { verses: list, manualKeys: manual, missingAudio: false };
    }
    let acc = 0;
    const loaded = !!ayahAudio && !probing;
    const list: Verse[] = rangeVerses.map((v) => {
      const f = ayahFiles.get(v.key);
      if (!f) missing = true;
      if (!loaded || !f) return { ...v, start: NaN, end: NaN };
      let d = probed[f.audioUrl];
      if (!d) { manual.add(v.key); d = dur(v.key); }
      const start = acc;
      acc += d;
      return { ...v, start, end: acc };
    });
    return { verses: list, manualKeys: manual, missingAudio: missing };
  }, [ayahMode, rangeVerses, chapterAudio, ayahAudio, ayahFiles, probed, probing, manualDur, fileDur, chapter, from, ownActive, own]);

  const audioSrc = ownActive ? own?.url : ayahMode ? ayahFiles.get(verses[Math.min(playIdx, verses.length - 1)]?.key ?? "")?.audioUrl : chapterAudio?.audioUrl;
  const mediaKey = ownActive ? own?.url : ayahMode ? rangeFiles.map((f) => f.audioUrl).join("|") : chapterAudio?.audioUrl;
  useEffect(() => setAudioFailed(false), [audioSrc]);
  const ready = verses.length > 0 && verses.every((v) => Number.isFinite(v.start) && Number.isFinite(v.end)) && !!audioSrc && !missingAudio && !audioFailed;
  const timed = ready ? verses : [];
  const t0 = ready ? verses[0].start : 0;
  const tEnd = ready ? verses[verses.length - 1].end : 0;
  const total = tEnd - t0;

  // ---- multiple ranges: the active range lives in surahId/from/to/manualDur; the rest are snapshots ----
  const liveSnap = useMemo<RangeSnap>(() => {
    const snap: RangeSnap = { surah: surahId, from, to };
    if (ranges.length > 1) {
      const kept = ranges[active];
      const keptOk = kept?.durs && kept.surah === surahId && kept.from === from && kept.to === to ? kept.durs : undefined;
      const durs = ready ? verses.map((v) => Math.round((v.end - v.start) * 100) / 100) : keptOk;
      if (durs) snap.durs = durs;
    }
    return snap;
  }, [ranges, active, surahId, from, to, ready, verses]);
  const allRanges = useMemo(() => (ranges.length > 1 ? ranges.map((r, k) => (k === active ? liveSnap : r)) : [liveSnap]), [ranges, active, liveSnap]);
  const multi = allRanges.length > 1;
  const totalAll = allRanges.reduce((n, r) => n + (r.to - r.from + 1), 0);
  const restoreDur = (r: RangeSnap) => Object.fromEntries((r.durs ?? []).map((d, i) => [`${r.surah}:${r.from + i}`, Math.max(0.5, d)]));
  const loadRange = (r: RangeSnap) => { setSurahId(r.surah); setFrom(r.from); setTo(r.to); setManualDur(restoreDur(r)); setPlayIdx(0); };

  // ---- persistence: load, autosave, export gate ----
  const stable = (o: unknown): string => JSON.stringify(o, (_, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
  const payload = useMemo(() => ({
    name: project.trim() || "Untitled project", surah: allRanges[0].surah, fromAyah: allRanges[0].from, toAyah: allRanges[0].to,
    ranges: multi ? allRanges : [],
    layers: { arabic: true, tr1: !!layers.tr1, tr2: !!layers.tr2, translit: layers.translit, verseKey: layers.verseKey },
    translations: { tr1: layers.tr1, tr2: layers.tr2 }, reciterId, style, ratio,
  }), [project, allRanges, multi, layers, reciterId, style, ratio]);
  const sig = stable(payload);
  const idRef = useRef<string | null>(projectId);
  const savedSig = useRef<string | null>(null);
  const initialSig = useRef<string | null>(null);
  if (initialSig.current === null) initialSig.current = sig;
  const forced = useRef(false);
  const inflight = useRef(false);
  const latest = useRef({ payload, sig, arabic: "" });
  latest.current = { payload, sig, arabic: verses[0]?.arabic ?? "" };
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const [load, setLoad] = useState<"ready" | "loading" | "missing" | "login">(projectId ? "loading" : "ready");

  useEffect(() => {
    if (!projectId || !sessionReady) return;
    if (!user) { setLoad("login"); return; }
    if (savedSig.current !== null) return;
    let cancelled = false;
    setLoad("loading");
    appFetch<{ project: any }>(`/api/app/projects/${projectId}`).then((r) => {
      if (cancelled) return;
      if (!r.ok) return setLoad("missing");
      const p = r.data.project;
      const l = { arabic: true, tr1: p.layers?.tr1 ? migrateTr(p.translations?.tr1, DEFAULT_TR1) : null, tr2: p.layers?.tr2 ? migrateTr(p.translations?.tr2, DEFAULT_TR2) : null, translit: !!p.layers?.translit, verseKey: !!p.layers?.verseKey } as Layers;
      const stored: RangeSnap[] = Array.isArray(p.ranges) && p.ranges.length > 1 ? p.ranges : [];
      const firstRange: RangeSnap = stored[0] ?? { surah: p.surah, from: p.fromAyah, to: p.toAyah };
      savedSig.current = stable({
        name: p.name, surah: p.surah, fromAyah: p.fromAyah, toAyah: p.toAyah, ranges: stored,
        layers: { arabic: true, tr1: !!l.tr1, tr2: !!l.tr2, translit: l.translit, verseKey: l.verseKey },
        translations: { tr1: l.tr1, tr2: l.tr2 }, reciterId: migrateReciter(p.reciterId, p.updatedAt), style: p.style, ratio: p.ratio,
      });
      setProject(p.name); setRanges(stored); setActive(0); loadRange(firstRange); setLayers(l);
      setReciterId(migrateReciter(p.reciterId, p.updatedAt)); setStyle(p.style); setRatio(p.ratio);
      setStatus("saved"); setSavedAt(new Date(p.updatedAt));
      setLoad("ready");
    });
    return () => { cancelled = true; };
  }, [projectId, sessionReady, user]);

  const save = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setStatus("saving");
    const { payload: pl, sig: s, arabic } = latest.current;
    const thumbnail = arabic ? makeThumbnail(arabic, pl.style as never, pl.ratio) : undefined;
    const body = { ...pl, ...(thumbnail ? { thumbnail } : {}) };
    const r = idRef.current
      ? await appFetch<{ project: { id: string } }>(`/api/app/projects/${idRef.current}`, { method: "PATCH", body })
      : await appFetch<{ project: { id: string } }>("/api/app/projects", { body });
    inflight.current = false;
    if (!r.ok) {
      setStatus("error");
      if (r.status === 402) requestUpgrade({ code: (r as any).code ?? (r.error.includes("verses") ? "verse_limit" : "project_limit"), message: r.error });
      return;
    }
    if (!idRef.current) {
      idRef.current = r.data.project.id;
      history.replaceState(null, "", `#/editor/${idRef.current}`);
    }
    savedSig.current = s;
    forced.current = false;
    setSavedAt(new Date());
    setStatus("saved");
    if (latest.current.sig !== s) setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!sessionReady || load !== "ready") return;
    if (!user) { setStatus("guest"); return; }
    if (savedSig.current === null ? sig === initialSig.current && !forced.current : sig === savedSig.current) return;
    const t = setTimeout(save, 1500);
    return () => clearTimeout(t);
  }, [sig, user, sessionReady, load, tick, save]);

  useEffect(() => {
    if (status !== "saving" && status !== "error") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const [postExport, setPostExport] = useState(false);
  const isPro = user?.plan === "pro";
  const maxVerses = isPro ? Infinity : Math.max(1, FREE_LIMITS.verses - (totalAll - (to - from + 1)));
  const tooLong = !isPro && totalAll > FREE_LIMITS.verses;
  const selectRange = (i: number) => {
    if (i === active) return;
    setRanges(allRanges);
    setActive(i);
    loadRange(allRanges[i]);
  };
  const addRange = () => {
    if (!isPro && totalAll >= FREE_LIMITS.verses) return requestUpgrade({ code: "verse_limit", message: `Free exports cover up to ${FREE_LIMITS.verses} verses in total across all ranges.` });
    const id = surahId < 114 ? surahId + 1 : 1;
    const c = chapters.find((x) => x.id === id);
    const room = isPro ? Infinity : FREE_LIMITS.verses - totalAll;
    const snap: RangeSnap = { surah: id, from: 1, to: Math.max(1, Math.min(c?.versesCount ?? 7, 7, room)) };
    setRanges([...allRanges, snap]);
    setActive(allRanges.length);
    loadRange(snap);
  };
  const removeRange = (i: number) => {
    if (allRanges.length < 2) return;
    const next = allRanges.filter((_, k) => k !== i);
    const nextActive = i < active ? active - 1 : Math.min(active, next.length - 1);
    setRanges(next.length > 1 ? next : []);
    setActive(next.length > 1 ? nextActive : 0);
    if (i === active || next.length < 2) loadRange(next[next.length > 1 ? nextActive : 0]);
  };
  const tryExport = () => {
    if (tooLong) return requestUpgrade({ code: "verse_limit" });
    if (user || Number(localStorage.getItem(EXPORT_KEY) ?? 0) < 1) return setExporting(true);
    requestAuth({ mode: "signup", reason: "Your free export is used. Create a free account to keep exporting and to save your projects.", after: () => setExporting(true) });
  };
  const onExported = () => {
    if (user) return;
    localStorage.setItem(EXPORT_KEY, String(Number(localStorage.getItem(EXPORT_KEY) ?? 0) + 1));
    setPostExport(true);
  };
  const closeExport = () => {
    setExporting(false);
    if (postExport && !user) {
      setPostExport(false);
      requestAuth({ mode: "signup", reason: "Your export is downloading. Create a free account to save this project and come back to it any time.", after: () => { forced.current = true; setTick((t) => t + 1); } });
    }
  };
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [manualIdx, setManualIdx] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed, audioSrc]);

  const mediaNow = () => {
    const a = audioRef.current;
    if (!a) return 0;
    return ayahMode ? (verses[playIdxRef.current]?.start ?? 0) + a.currentTime : a.currentTime;
  };
  const seekAbs = (target: number, resume: boolean) => {
    const a = audioRef.current;
    if (!a) return;
    if (!ayahMode) { a.currentTime = target; return; }
    let j = verses.findIndex((v) => target >= v.start && target < v.end);
    if (j < 0) j = target < verses[0].start ? 0 : verses.length - 1;
    const off = Math.max(0, target - verses[j].start);
    if (j === playIdxRef.current) { a.currentTime = off; return; }
    pending.current = { at: off, play: resume };
    playIdxRef.current = j;
    setPlayIdx(j);
  };

  useEffect(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      if (ready) seekAbs(t0, false);
    }
    setPlaying(false);
    setTime(0);
    setManualIdx(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t0, tEnd, mediaKey, ready]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const a = audioRef.current;
      if (a) {
        const now = mediaNow();
        if (now >= tEnd) {
          a.pause();
          setTime(total);
          setPlaying(false);
          return;
        }
        setTime(Math.max(0, now - t0));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, t0, tEnd, total]);

  const seek = (t: number) => {
    const c = Math.max(0, Math.min(total, t));
    seekAbs(t0 + c, playing);
    setTime(c);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !ready) return;
    if (playing) { a.pause(); setPlaying(false); return; }
    if (mediaNow() < t0 || mediaNow() >= tEnd - 0.05) seek(0);
    a.playbackRate = speed;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const pickOwn = async (f: File) => {
    setOwnErr(null);
    const bad = checkFile(f);
    if (bad) return setOwnErr(bad);
    setOwnBusy(true);
    try {
      const a = await analyze(f);
      if (ownRef.current) URL.revokeObjectURL(ownRef.current.url);
      setOwn({ name: f.name, url: URL.createObjectURL(f), duration: a.duration, peak: a.peak, rms: a.rms, startT: 0, endT: a.duration, marks: [], src: "none" });
    } catch {
      setOwnErr("Your browser could not read that audio file. Try converting it to mp3 or wav.");
    } finally { setOwnBusy(false); }
  };
  const removeOwn = () => { if (own) URL.revokeObjectURL(own.url); setOwn(null); };
  const [tapIdx, setTapIdx] = useState(0);
  const canTap = !ayahMode && ready && playing && tapIdx < verses.length;
  const tapMark = () => {
    const v = verses[tapIdx];
    if (!v || !canTap) return;
    if (ownActive) {
      const t = Math.round(mediaNow() * 100) / 100;
      const last = tapIdx === verses.length - 1;
      setOwn((o) => {
        if (!o) return o;
        const prev = tapIdx === 0 ? o.startT : o.marks[o.marks.length - 1]?.t ?? o.startT;
        if (t < prev + 0.1) return o;
        return last ? { ...o, endT: Math.min(o.duration, t), src: "tap" } : { ...o, marks: [...(tapIdx === 0 ? [] : o.marks), { t, w: 99 }], src: "tap" };
      });
      setTapIdx(tapIdx + 1);
      return;
    }
    const d = Math.min(600, Math.max(0.5, Math.round((mediaNow() - v.start) * 100) / 100));
    setManualDur((m) => ({ ...m, [v.key]: d }));
    setTapIdx(tapIdx + 1);
  };
  const tapRef = useRef<(() => void) | null>(null);
  tapRef.current = canTap ? tapMark : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName))) return;
      if (!tapRef.current) return;
      e.preventDefault();
      tapRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setTapIdx(0), [mediaKey, from, to, surahId, ayahMode]);

  const onMeta = () => {
    const a = audioRef.current;
    if (a && !ayahMode && !ownActive && Number.isFinite(a.duration)) setFileDur(a.duration);
    const p = pending.current;
    if (!a || !p) return;
    pending.current = null;
    a.currentTime = p.at;
    a.playbackRate = speed;
    if (p.play) a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const onEnded = () => {
    if (ayahMode && playIdxRef.current < verses.length - 1) {
      pending.current = { at: 0, play: true };
      playIdxRef.current += 1;
      setPlayIdx(playIdxRef.current);
      return;
    }
    setPlaying(false);
    setTime(total);
  };

  const timeIdx = timed.findIndex((v) => time + t0 >= v.start && time + t0 < v.end);
  const idx = ready ? Math.max(0, timeIdx) : Math.min(manualIdx, Math.max(0, verses.length - 1));
  const cur: Verse | undefined = verses[idx];
  const hlPieces = useMemo<[string, string?][]>(
    () => (!cur ? [] : style.tajweed && cur.tajweed ? cur.tajweed.map(([t, r]) => [t, tajweedGroup(r)?.color] as [string, string?]) : [[cur.arabic]]),
    [cur, style.tajweed],
  );
  const jump = (i: number) => {
    if (i < 0 || i >= verses.length) return;
    if (ready) seek(verses[i].start - t0);
    else setManualIdx(i);
  };

  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const ul = listRef.current;
    const el = ul?.children[idx] as HTMLElement | undefined;
    if (ul && el) ul.scrollTo({ top: el.offsetTop - ul.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [idx]);

  const pickSurah = (id: number) => {
    const c = chapters.find((x) => x.id === id);
    if (!c) return;
    setSurahId(id);
    setFrom(1);
    setTo(Math.min(c.versesCount, 7));
  };
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [presetErr, setPresetErr] = useState<string | null>(null);
  useEffect(() => {
    if (!isPro) { setPresets([]); return; }
    appFetch<{ presets: Preset[] }>("/api/app/presets").then((r) => { if (r.ok) setPresets(r.data.presets); });
  }, [isPro]);
  const savePreset = async () => {
    setPresetErr(null);
    const r = await appFetch<{ presets: Preset[] }>("/api/app/presets", { body: { name: presetName, style } });
    if (r.ok) { setPresets(r.data.presets); setPresetName(""); }
    else if (r.status === 402) requestUpgrade({ code: "preset_pro" });
    else setPresetErr(r.error);
  };
  const deletePreset = async (id: string) => {
    const r = await appFetch<{ presets: Preset[] }>("/api/app/presets?id=" + encodeURIComponent(id), { method: "DELETE" });
    if (r.ok) setPresets(r.data.presets);
  };
  const count = chapter?.versesCount ?? 1;

  const R = RATIOS[ratio];
  const plat = platformById(style.platform);
  const hRatio = ratio === "9:16" ? 16 / 9 : ratio === "16:9" ? 9 / 16 : 1;
  const applyPlatform = (id: PlatformId) => {
    const p = platformById(id)!;
    setRatio(p.ratio);
    setStyle((s0) => ({ ...s0, platform: id, pos: p.pos, arSize: p.arSize, trSize: p.trSize }));
  };
  const cq = (px: number) => `${(px / R.base) * 100}cqw`;
  const textShadow = style.shadow ? "0 2px 10px rgba(0,0,0,.85), 0 0 2px rgba(0,0,0,.9)" : undefined;
  const justify = { top: "flex-start", middle: "center", bottom: "flex-end" }[style.pos];
  
  const show = (name: typeof tab) => (tab === name ? "block" : "hidden lg:block");

  return (
    <div className="flex h-dvh flex-col">
      {load !== "ready" && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-background/95 p-6 text-center">
          {load === "loading" ? (
            <p className="flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="animate-spin" size={18} /> Opening project…</p>
          ) : (
            <div className="max-w-sm">
              <h2 className="font-display text-xl font-bold">{load === "login" ? "Log in to open this project" : "Project not found"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{load === "login" ? "Projects belong to your account." : "It may have been deleted, or it belongs to a different account."}</p>
              <div className="mt-5 flex justify-center gap-3">
                {load === "login" && <button onClick={() => requestAuth({ mode: "login" })} className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Log in</button>}
                <button onClick={user ? onProjects : onHome} className="rounded-sm border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">{user ? "My projects" : "Home"}</button>
              </div>
            </div>
          )}
        </div>
      )}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-2.5">
        <Logo onClick={onHome} compact />
        <input aria-label="Project name" value={project} onChange={(e) => setProject(e.target.value)} className="mx-auto hidden min-w-0 max-w-xs flex-1 rounded-sm border border-transparent bg-transparent px-3 py-1.5 text-center text-sm hover:border-border focus:border-border md:block" />
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <SaveIndicator status={status} savedAt={savedAt} onRetry={save} onSignup={() => requestAuth({ mode: "signup", reason: "Create a free account and your work is saved automatically." })} />
          <ThemeToggle dark={dark} toggle={toggleTheme} />
          <button onClick={tryExport} disabled={!ready} title={ready ? undefined : "Export is available once verses and timings have loaded"} className="flex items-center disabled:opacity-50 gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Upload size={15} /> Export
          </button>
          <AccountMenu user={user} onLogin={() => requestAuth({ mode: "login" })} onProjects={onProjects} onSettings={onSettings} onSignOut={onSignOut} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_1fr]">
        <aside className={`${show("controls")} min-h-0 overflow-y-auto border-border bg-card lg:border-r`}>
          <Section title="Verses" defaultOpen>
            <div>
              <p className={labelCls}>Ranges{multi ? ` (${allRanges.length})` : ""}</p>
              <ul className="flex flex-wrap gap-2">
                {allRanges.map((r, i) => (
                  <li key={i} className={`flex items-stretch overflow-hidden rounded-sm border text-sm ${i === active ? "border-primary bg-secondary/60 ring-1 ring-primary" : "border-border"}`}>
                    <button type="button" onClick={() => selectRange(i)} aria-pressed={i === active} className="min-h-10 px-3 text-left hover:bg-muted/60">
                      <span className="font-semibold">{chapters.find((c) => c.id === r.surah)?.nameSimple ?? `Surah ${r.surah}`}</span>{" "}
                      <span className="font-mono text-xs text-muted-foreground">{r.surah}:{r.from}–{r.to}</span>
                    </button>
                    {multi && <button type="button" onClick={() => removeRange(i)} aria-label={`Remove range ${r.surah}:${r.from}–${r.to}`} className="grid min-h-10 w-10 place-items-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground"><X size={14} /></button>}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={addRange} className="mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-border text-sm font-medium text-gold hover:bg-muted/60"><Plus size={15} /> Add another range</button>
            </div>
            <div>
              <label className={labelCls} htmlFor="surah">Surah{multi ? ` for range ${active + 1}` : ""}</label>
              <select id="surah" value={surahId} disabled={!chapters.length} onChange={(e) => pickSurah(+e.target.value)} className={fieldCls}>
                {!chapters.length && <option>{chaptersQ.loading ? "Loading surahs…" : "Surahs unavailable"}</option>}
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}. {c.nameSimple}
                  </option>
                ))}
              </select>
              {chaptersQ.loading && !chapters.length && <div className="mt-2"><Loading label="Loading surahs…" /></div>}
              {chaptersQ.error && <div className="mt-2"><Notice compact what="surahs" err={chaptersQ.error} retryIn={chaptersQ.retryIn} onRetry={chaptersQ.retry} /></div>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="from">Start ayah</label>
                <select id="from" value={from} disabled={!chapter} onChange={(e) => {
                  const n = +e.target.value; setFrom(n);
                  let t = to < n ? n : to;
                  if (t - n + 1 > maxVerses) { t = n + maxVerses - 1; requestUpgrade({ code: "verse_limit" }); }
                  setTo(t);
                }} className={fieldCls}>
                  {Array.from({ length: count }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="to">End ayah</label>
                <select id="to" value={to} disabled={!chapter} onChange={(e) => {
                  const n = +e.target.value; setTo(n);
                  let f = from > n ? n : from;
                  if (n - f + 1 > maxVerses) { f = n - maxVerses + 1; requestUpgrade({ code: "verse_limit" }); }
                  setFrom(f);
                }} className={fieldCls}>
                  {Array.from({ length: count }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                </select>
              </div>
            </div>
            {chapter && (
              <p className="rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
                {to - from + 1} {to === from ? "verse" : "verses"}{isPro || multi ? "" : ` of ${FREE_LIMITS.verses} free`} · {surahId}:{from}–{to}{ready ? ` · ${fmt(total)}` : ""}
                {multi && <><br />{totalAll} verses across {allRanges.length} ranges{isPro ? "" : ` · ${FREE_LIMITS.verses} free in total`}</>}
                {!isPro && verseUsage && verseUsage.limit && verseUsage.used > 0 && (
                  <>
                    <br />
                    <span className={verseUsage.remaining === 0 ? "text-red-600" : "text-muted-foreground"}>
                      {verseUsage.used} of {verseUsage.limit} unique verses used this month{verseUsage.remaining === 0 ? " — upgrade for more" : `, ${verseUsage.remaining} left`}
                    </span>
                  </>
                )}
              </p>
            )}
          </Section>

          <Section title="Layers">
            {([
              ["Arabic text", layers.arabic, () => setLayers({ ...layers, arabic: true }), true],
              ["Translation 1", !!layers.tr1, (v: boolean) => setLayers({ ...layers, tr1: v ? DEFAULT_TR1 : null }), false],
              ["Translation 2", !!layers.tr2, (v: boolean) => setLayers({ ...layers, tr2: v ? DEFAULT_TR2 : null }), false],
              ["Transliteration", layers.translit, (v: boolean) => setLayers({ ...layers, translit: v }), false],
              ["Verse number ﴿١﴾", layers.verseKey, (v: boolean) => setLayers({ ...layers, verseKey: v }), false],
            ] as [string, boolean, (v: boolean) => void, boolean][]).map(([label, on, set, locked]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-sm">
                <span>{label}{locked && <span className="ml-2 text-xs text-muted-foreground">always on</span>}</span>
                <Toggle on={on} onChange={set} label={label} />
              </div>
            ))}
            {(["tr1", "tr2"] as const).map((k, i) => layers[k] && (
              <div key={k}>
                <label className={labelCls}>Translation {i + 1} source</label>
                <select value={layers[k]!} disabled={!translations.length} onChange={(e) => setLayers({ ...layers, [k]: e.target.value })} className={fieldCls}>
                  {!trGroups.some(([, list]) => list.some((t) => String(t.id) === layers[k])) && <option value={layers[k]!}>{translationsQ.loading ? "Loading translations…" : `Translation ${layers[k]}`}</option>}
                  {trGroups.map(([lang, list]) => (
                    <optgroup key={lang} label={lang.charAt(0).toUpperCase() + lang.slice(1)}>
                      {list.map((t) => <option key={t.id} value={String(t.id)}>{t.name}{t.author && !t.name.includes(t.author) ? ` — ${t.author}` : ""}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            ))}
            {translations.length > 0 && (
              <p className="m-0 text-xs text-muted-foreground">
                Missing a language?{" "}
                <a href={`mailto:${SITE.email}?subject=${encodeURIComponent("Translation request")}&body=${encodeURIComponent("Hello,\n\nI would like to request this translation: \n\nLanguage:\nPreferred translator or source (optional):\n")}`} className="font-medium text-foreground underline underline-offset-2 hover:text-gold">Request a translation</a>
              </p>
            )}
            {translationsQ.error && <Notice compact what="translations" err={translationsQ.error} retryIn={translationsQ.retryIn} onRetry={translationsQ.retry} />}
          </Section>

          <Section title="Recitation">
            <div className="rounded-sm border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-medium">Use my own recitation</span>
                  {!ownPro && <span className="ml-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">Pro</span>}
                </div>
                <Toggle on={ownOn && ownPro} onChange={(v) => (v && !ownPro ? requestUpgrade({ code: "own_audio" }) : setOwnOn(v))} label="Use my own recitation" />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Upload an mp3, m4a or wav (up to 25 MB). The file stays in this browser tab. It is never uploaded to our servers, and it is not saved with the project, so you will need to add it again after reloading.</p>
              {ownOn && ownPro && (
                <div className="mt-3 space-y-2">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-background px-3 py-2.5 text-xs font-medium hover:bg-secondary">
                    {ownBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {ownBusy ? "Reading audio…" : own ? "Replace audio file" : "Choose audio file"}
                    <input type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav" className="sr-only" disabled={ownBusy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickOwn(f); }} />
                  </label>
                  {ownErr && <p role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 p-2.5 text-xs">{ownErr}</p>}
                  {own && (
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{own.name} · {fmt(own.duration)}</span>
                      <button type="button" onClick={removeOwn} className="shrink-0 font-semibold text-gold underline-offset-2 hover:underline">Remove</button>
                    </div>
                  )}
                  {own && <p className="text-xs text-muted-foreground">Set verse times on the waveform under <strong>Verses &amp; timing</strong>{" "}(Verses tab on mobile). Timing is pause-based and may need adjustment.</p>}
                </div>
              )}
            </div>
            {!ownActive && <>
            <div>
              <span className={labelCls}>Audio type</span>
              <Seg value={audioMode} onChange={(v) => setAudioMode(v as "chapter" | "ayah")} options={[{ v: "chapter", l: "Continuous chapter audio" }, { v: "ayah", l: "Ayah by ayah" }]} />
              <p className="mt-1.5 text-xs text-muted-foreground">{ayahMode ? "One audio file per verse. Each verse is its own file, so timing comes from the measured length of each file." : "One continuous recording per surah. UmmahAPI provides no verse timestamps, so you set each verse's timing manually."}</p>
            </div>
            <div>
              <label className={labelCls}>Reciter</label>
              <select value={reciter?.id ?? ""} disabled={!reciters.length} onChange={(e) => setReciterId(+e.target.value)} className={fieldCls}>
                {!reciters.length && <option value="">{recitersQ.loading ? "Loading reciters…" : "Reciters unavailable"}</option>}
                {reciters.map((r) => <option key={r.id} value={r.id}>{r.name}{r.style ? ` (${r.style})` : ""}</option>)}
              </select>
              {recitersQ.error && <div className="mt-2"><Notice compact what="reciters" err={recitersQ.error} retryIn={recitersQ.retryIn} onRetry={recitersQ.retry} /></div>}
            </div>
            </>}
            <div>
              <span className={labelCls}>Playback speed</span>
              <Seg value={String(speed)} onChange={(v) => setSpeed(+v)} options={[0.75, 1, 1.25, 1.5].map((s) => ({ v: String(s), l: `${s}×` }))} />
            </div>
          </Section>

          <Section title="Style">
            <div className="rounded-sm border border-border bg-muted/50 p-3">
              <span className={labelCls}>Style presets</span>
              {!isPro ? (
                <button onClick={() => requestUpgrade({ code: "preset_pro" })} className="flex w-full items-center justify-between rounded-sm border border-dashed border-border bg-card px-3 py-2 text-left text-sm hover:bg-secondary">
                  <span>Save and reuse your styles</span><span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground uppercase">Pro</span>
                </button>
              ) : (
                <div className="space-y-2">
                  {presets.length === 0 && <p className="text-xs text-muted-foreground">No presets yet. Style your captions, name it, and save.</p>}
                  {presets.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <button onClick={() => setStyle((s0) => { const { platform: _p, guide: _g, ...rest } = p.style as Record<string, unknown>; return { ...s0, ...rest }; })} className="mr-auto min-w-0 flex-1 truncate rounded-sm border border-border bg-card px-3 py-1.5 text-left text-sm hover:bg-secondary">{p.name}</button>
                      <button onClick={() => deletePreset(p.id)} aria-label={`Delete preset ${p.name}`} className="grid size-8 place-items-center rounded-sm border border-border text-red-600 hover:bg-red-500/10">×</button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input value={presetName} onChange={(e) => setPresetName(e.target.value)} maxLength={40} placeholder="Preset name" aria-label="Preset name" className={fieldCls} />
                    <button onClick={savePreset} disabled={!presetName.trim()} className="shrink-0 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">Save</button>
                  </div>
                  {presetErr && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{presetErr}</p>}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Arabic font</label>
              <select value={style.font} onChange={(e) => setStyle({ ...style, font: e.target.value as keyof typeof FONTS })} className={fieldCls}>
                {Object.entries(FONTS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </div>
            <Range label="Arabic size" value={style.arSize} min={40} max={140} onChange={(n) => setStyle({ ...style, arSize: n })} />
            <Range label="Translation size" value={style.trSize} min={20} max={80} onChange={(n) => setStyle({ ...style, trSize: n })} />
            <Range label="Line spacing" value={style.leading} min={1.2} max={2.6} step={0.1} onChange={(n) => setStyle({ ...style, leading: n })} />
            <div>
              <span className={labelCls}>Text colour</span>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} aria-label={`Colour ${c}`} aria-pressed={style.color === c} onClick={() => setStyle({ ...style, color: c })} style={{ background: c }} className={`size-8 rounded-full border border-border ${style.color === c ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : ""}`} />
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm"><span>Word highlighting <span className="ml-1 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estimated</span></span><Toggle on={style.wordHl !== false} onChange={(v) => setStyle({ ...style, wordHl: v })} label="Estimated word highlighting" /></div>
              <p className="mt-1.5 text-xs text-muted-foreground">UmmahAPI provides no word-level timing, so each verse&apos;s duration is shared across its words by length. It is not exact. Preview and future video overlay only; SRT and VTT are unchanged.</p>
              {style.wordHl !== false && (
                <div className="mt-2">
                  <span className={labelCls}>Highlight color</span>
                  <div className="flex flex-wrap gap-2">
                    {["#fcd34d", "#34d399", "#38bdf8", "#f472b6", "#fb923c"].map((c) => (
                      <button key={c} aria-label={`Highlight ${c}`} aria-pressed={style.hlColor === c} onClick={() => setStyle({ ...style, hlColor: c })} style={{ background: c }} className={`size-8 rounded-full border border-border ${style.hlColor === c ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : ""}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between text-sm"><span>Tajweed colors</span><Toggle on={!!style.tajweed} onChange={(v) => setStyle({ ...style, tajweed: v })} label="Tajweed colors" /></div>
              {style.tajweed && (
                <div className="mt-2 rounded-sm border border-border bg-secondary/40 p-2.5">
                  <p className="m-0 mb-2 text-xs text-muted-foreground">Uses the tajweed edition of the text from UmmahAPI. It can differ slightly from the standard script.</p>
                  <ul className="m-0 grid list-none grid-cols-1 gap-x-3 gap-y-1 p-0 text-xs sm:grid-cols-2" aria-label="Tajweed legend">
                    {TAJWEED_GROUPS.map((g) => (
                      <li key={g.id} className="flex items-center gap-2" title={g.hint}>
                        <span aria-hidden className="size-3 shrink-0 rounded-full border border-border" style={{ background: g.color }} />
                        <span className="truncate">{g.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm"><span>Shadow / outline</span><Toggle on={style.shadow} onChange={(v) => setStyle({ ...style, shadow: v })} label="Shadow" /></div>
            <div><span className={labelCls}>Background</span><Seg value={style.bg} onChange={(v) => setStyle({ ...style, bg: v })} options={[{ v: "transparent", l: "Transparent" }, { v: "solid", l: "Solid" }, { v: "box", l: "Box" }]} /></div>
            <div><span className={labelCls}>Alignment</span><Seg value={style.align} onChange={(v) => setStyle({ ...style, align: v })} options={[{ v: "left", l: "Left" }, { v: "center", l: "Center" }, { v: "right", l: "Right" }]} /></div>
            <div><span className={labelCls}>Position</span><Seg value={style.pos} onChange={(v) => setStyle({ ...style, pos: v })} options={[{ v: "top", l: "Top" }, { v: "middle", l: "Middle" }, { v: "bottom", l: "Bottom" }]} /></div>
          </Section>

          <Section title="Canvas size" defaultOpen>
            <div>
              <span className={labelCls}>Platform preset</span>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <button key={p.id} onClick={() => applyPlatform(p.id)} aria-pressed={style.platform === p.id} className={`rounded-sm border px-3 py-2 text-left text-sm ${style.platform === p.id ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}>
                    <b className="block font-medium">{p.name}</b>
                    <span className="font-mono text-[11px] text-muted-foreground">{p.ratio}</span>
                  </button>
                ))}
              </div>
              {plat ? <p className="mt-1.5 text-xs text-muted-foreground">{plat.note} Margins are approximate; platforms change their layouts.</p> : <p className="mt-1.5 text-xs text-muted-foreground">Sets the canvas size, safe margins, caption position and font sizes. Free on every plan.</p>}
              <div className="mt-2 flex items-center justify-between text-sm"><span>Show safe area guide</span><Toggle on={!!style.guide} onChange={(v) => setStyle({ ...style, guide: v })} label="Show safe area guide" /></div>
              {!plat && style.guide && <p className="mt-1 text-xs text-muted-foreground">Pick a platform to see its safe area.</p>}
            </div>
            <span className={labelCls}>Custom size</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(RATIOS) as Ratio[]).map((r) => (
                <button key={r} onClick={() => { setRatio(r); setStyle((s0) => ({ ...s0, platform: null })); }} aria-pressed={ratio === r} className={`rounded-sm border p-3 text-center ${ratio === r ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}>
                  <b className="block font-mono text-sm">{r}</b>
                  <span className="text-[11px] text-muted-foreground">{RATIOS[r].label}</span>
                </button>
              ))}
            </div>
          </Section>
        </aside>

        <main className="flex min-h-0 flex-col overflow-y-auto">
          <div className={`${show("preview")} bg-muted/50 p-4 sm:p-6`}>
            <div className="mx-auto flex max-w-3xl flex-col items-center">
              <div
                className={`relative w-full overflow-hidden rounded-sm border border-border shadow-lg ${style.bg === "solid" ? "" : "checker"}`}
                style={{ aspectRatio: R.css, maxWidth: R.max, containerType: "inline-size", background: style.bg === "solid" ? style.solid : undefined, maxHeight: "62vh" }}
              >
                <div className={`absolute inset-0 flex flex-col ${plat ? "" : "px-[6cqw] py-[10cqw]"}`} style={{ justifyContent: justify, ...(plat ? { padding: `${plat.safe.top * hRatio}cqw ${plat.safe.right}cqw ${plat.safe.bottom * hRatio}cqw ${plat.safe.left}cqw` } : {}) }}>
                  <div
                    translate="no"
                    className={`flex flex-col gap-[2.5cqw] ${style.bg === "box" ? "rounded-[3cqw] bg-black/55 p-[4cqw]" : ""}`}
                    style={{ color: style.color, textShadow, textAlign: style.align }}
                  >
                    {!cur && (
                      <p lang="en" dir="ltr" className="m-0 animate-pulse text-center text-[3.5cqw]">{versesQ.error ? "Verses unavailable" : "Loading verses…"}</p>
                    )}
                    {cur && layers.arabic && (
                      <p dir="rtl" lang="ar" className="m-0" style={{ fontFamily: FONTS[style.font] + ", serif", fontSize: cq(style.arSize), lineHeight: style.leading }}>
                        {style.wordHl !== false && ready && Number.isFinite(cur.start) && cur.end > cur.start ? (
                          <WordHighlight
                            pieces={hlPieces}
                            progress={Math.max(0, Math.min(1, (time + t0 - cur.start) / (cur.end - cur.start))) * (time > 0 || playing ? 1 : 0)}
                            color={style.hlColor || "#fcd34d"}
                            tinted={!!(style.tajweed && cur.tajweed)}
                          />
                        ) : style.tajweed && cur.tajweed
                          ? cur.tajweed.map(([t, r], i) => { const g = tajweedGroup(r); return g ? <span key={i} style={{ color: g.color }}>{t}</span> : t; })
                          : cur.arabic}
                        {layers.verseKey && <span className="mx-[1cqw] text-[0.55em] opacity-80"> ﴿{toArabicDigits(cur.n)}﴾</span>}
                      </p>
                    )}
                    {cur && layers.translit && cur.translations[TRANSLITERATION_ID] && <p lang="en" className="m-0 italic opacity-90" style={{ fontSize: cq(style.trSize * 0.85), lineHeight: 1.4 }}>{cur.translations[TRANSLITERATION_ID]}</p>}
                    {cur && [layers.tr1, layers.tr2].map((k, i) => k && cur.translations[k] && (
                      <p key={i} lang="en" className="m-0" style={{ fontSize: cq(style.trSize), lineHeight: 1.4 }}>{cur.translations[k]}</p>
                    ))}
                  </div>
                </div>
                {plat && style.guide && (
                  <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-x-0 top-0 bg-red-500/20" style={{ height: `${plat.safe.top}%` }} />
                    <div className="absolute inset-x-0 bottom-0 bg-red-500/20" style={{ height: `${plat.safe.bottom}%` }} />
                    <div className="absolute bg-red-500/20" style={{ top: `${plat.safe.top}%`, bottom: `${plat.safe.bottom}%`, left: 0, width: `${plat.safe.left}%` }} />
                    <div className="absolute bg-red-500/20" style={{ top: `${plat.safe.top}%`, bottom: `${plat.safe.bottom}%`, right: 0, width: `${plat.safe.right}%` }} />
                    <div className="absolute border border-dashed border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" style={{ top: `${plat.safe.top}%`, bottom: `${plat.safe.bottom}%`, left: `${plat.safe.left}%`, right: `${plat.safe.right}%` }} />
                  </div>
                )}
              </div>

              <div className="mt-4 w-full max-w-xl space-y-3">
                {versesQ.error && <Notice what="verses" err={versesQ.error} retryIn={versesQ.retryIn} onRetry={versesQ.retry} />}
                {audioQ.error && <Notice what="the recitation audio" err={audioQ.error} retryIn={audioQ.retryIn} onRetry={audioQ.retry} />}
                {ayahMode && ayahAudio && missingAudio && <div role="alert" className="rounded-sm border border-amber-500/40 bg-amber-500/10 p-4 text-sm">This recitation has no audio for some of the selected ayahs. Narrow the range or pick another recitation.</div>}
                {manualKeys.size > 0 && !probing && <div role="status" className="rounded-sm border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><strong>Manual timing.</strong> {ayahMode ? "Some ayah files could not be measured." : "UmmahAPI does not provide verse timestamps for continuous audio."} Captions are spaced by an estimate (verse length across the whole recording, or 5 s per verse for partial ranges), so they may drift from the recitation. Press play, then use <strong>Tap to mark end</strong> (or Space) as each verse finishes, or set durations by hand under <strong>Verses &amp; timing</strong>. Your edits are kept when you change translations or reciter.</div>}
                {audioFailed && <div role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 p-4 text-sm">The audio file could not be played. Try another reciter or convert the file to mp3/wav. (Check the browser console for details.)</div>}
                {(versesQ.loading || audioQ.loading || probing) && !versesQ.error && !audioQ.error && <Loading label={audioQ.loading ? "Loading recitation audio…" : probing ? "Measuring ayah audio lengths…" : "Loading verses…"} />}
              </div>

              <div className="mt-4 w-full max-w-xl rounded-sm border border-border bg-card p-4">
                {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" onLoadedMetadata={onMeta} onEnded={onEnded} onPause={() => setPlaying(false)} onError={(e) => { console.error("audio error", (e.target as HTMLAudioElement)?.error); setAudioFailed(true); }} />}
                <input aria-label="Scrub" type="range" disabled={!ready} min={0} max={total || 1} step={0.1} value={time} onChange={(e) => seek(+e.target.value)} className="w-full accent-[var(--primary)]" />
                <div className="mt-2 flex items-center justify-between">
                  <span className="w-24 font-mono text-xs text-muted-foreground">{fmt(time)} / {fmt(total)}</span>
                  <div className="flex items-center gap-2">
                    <button aria-label="Previous ayah" disabled={idx === 0 || !verses.length} onClick={() => jump(idx - 1)} className="rounded-full p-2 hover:bg-secondary disabled:opacity-40"><SkipBack size={18} /></button>
                    <button aria-label={playing ? "Pause" : "Play"} disabled={!ready} onClick={togglePlay} className="disabled:opacity-40 grid size-11 place-items-center rounded-sm bg-primary text-primary-foreground hover:opacity-90">
                      {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </button>
                    <button aria-label="Next ayah" disabled={idx >= verses.length - 1} onClick={() => jump(idx + 1)} className="rounded-full p-2 hover:bg-secondary disabled:opacity-40"><SkipForward size={18} /></button>
                  </div>
                  <span className="w-24 text-right font-mono text-xs text-gold">{cur ? `Ayah ${cur.key}` : ""}</span>
                </div>
                <p className="mt-2 truncate text-center text-xs text-muted-foreground">{ownActive ? `Recitation: your own file (${own?.name}) · pause-based timing · ${speed}×` : <>Recitation: {reciter ? `${reciter.name}${reciter.style ? ` (${reciter.style})` : ""}` : "none selected"} · {ayahMode ? "ayah by ayah" : "chapter audio"} · {speed}× · via UmmahAPI</>}</p>
              </div>
            </div>
          </div>

          <div className={`${show("verses")} border-t border-border bg-card`}>
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-medium">Verses &amp; timing</h2>
              {!ayahMode && !ownActive && ready && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={tapMark} disabled={!canTap} title="Space" className="rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    {tapIdx >= verses.length ? "All verses marked" : `Tap to mark end of ${verses[tapIdx].key}`} <kbd className="ml-1 rounded-sm border border-primary-foreground/40 px-1 font-mono text-[10px]">Space</kbd>
                  </button>
                  {tapIdx > 0 && <button type="button" onClick={() => setTapIdx(0)} className="text-xs font-semibold text-gold underline-offset-2 hover:underline">Restart marking</button>}
                </div>
              )}
              <span className="text-xs text-muted-foreground">{ready ? (manualKeys.size ? "Manual timing · set each verse's length · click to jump" : "Timings from measured ayah files · click a verse to jump") : "Click a verse to preview it"}</span>
            </div>
            {ownActive && own && (
              <OwnTiming
                own={own} keys={verses.map((v) => v.key)} weights={verses.map((v) => verseWeight(v.arabic))}
                now={t0 + time} playing={playing} onTogglePlay={togglePlay} onSeek={(t) => seek(t - t0)}
                onChange={(p) => setOwn((o) => (o ? { ...o, ...p } : o))}
                canTap={canTap} tapIdx={tapIdx} onTap={tapMark} onRestartTap={() => setTapIdx(0)}
              />
            )}
            <ul ref={listRef} className="relative max-h-80 overflow-y-auto">
              {verses.map((v, i) => (
                <li key={v.key} className="relative">
                  {i === idx && <span aria-hidden className="absolute inset-y-0 left-0 z-10 w-1 bg-accent" />}
                  {ready && i === idx && <span aria-hidden className="absolute bottom-0 left-0 z-10 h-0.5 bg-accent" style={{ width: `${Math.min(100, ((time + t0 - v.start) / (v.end - v.start)) * 100)}%` }} />}
                  <button onClick={() => jump(i)} aria-current={i === idx} className={`grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-3 border-t border-border px-5 py-3 text-left hover:bg-muted ${i === idx ? "bg-secondary" : ""}`}>
                    <span className={`font-mono text-xs ${i === idx ? "font-bold text-gold" : "text-gold"}`}>{v.key}</span>
                    <span translate="no" lang="ar" dir="rtl" className="truncate font-quran text-lg">{v.arabic}</span>
                    <span className={`font-mono text-xs text-muted-foreground ${manualKeys.has(v.key) ? "mr-20" : ""}`}>{ready ? `${fmt(v.start - t0, true)} → ${fmt(v.end - t0, true)}` : "–"}</span>
                  </button>
                  {manualKeys.has(v.key) && (
                    <label className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1 text-xs text-muted-foreground">
                      <span className="sr-only">Duration of ayah {v.key} in seconds</span>
                      <input type="number" min={0.5} max={600} step={0.5} value={manualDur[v.key] ?? Math.round((v.end - v.start) * 2) / 2} onChange={(e) => setManualDur((m) => ({ ...m, [v.key]: Math.max(0.5, Math.min(600, Number(e.target.value) || 5)) }))} className="w-14 rounded-sm border border-border bg-background px-1.5 py-1 text-right font-mono text-xs text-foreground" />s
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
      <AttributionBar translations={sourcesFor(translations, [...new Set([layers.tr1, layers.tr2, layers.translit ? TRANSLITERATION_ID : null])])} reciter={ownActive ? null : reciter} />

      <nav className="grid grid-cols-3 border-t border-border bg-card lg:hidden" aria-label="Editor sections">
        {([["preview", "Preview"], ["controls", "Controls"], ["verses", "Verses"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-current={tab === k} className={`py-3.5 text-sm font-medium ${tab === k ? "border-t-2 border-accent text-foreground" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </nav>

      {exporting && ready && chapter && <ExportDialog ranges={allRanges} activeIndex={active} chapters={chapters} verses={verses} layers={layers} chapter={chapter} translations={translations} reciter={ownActive ? null : reciter} style={style} ratio={ratio} isPro={isPro} requestUpgrade={requestUpgrade} onClose={closeExport} onExported={onExported} />}
    </div>
  );
}
