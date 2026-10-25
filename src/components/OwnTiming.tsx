"use client";
import { Loader2, Pause, Play, Plus, Trash2, Hand, Waves, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "../data";
import { computeBounds, detectPauses, type Mark, type OwnAudio } from "../lib/ownAudio";

type Patch = Partial<Pick<OwnAudio, "marks" | "startT" | "endT" | "src">>;

const btn = "inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50";

export default function OwnTiming({ own, keys, weights, now, playing, onTogglePlay, onSeek, onChange, canTap, tapIdx, onTap, onRestartTap }: {
  own: OwnAudio; keys: string[]; weights: number[]; now: number; playing: boolean;
  onTogglePlay: () => void; onSeek: (t: number) => void; onChange: (p: Patch) => void;
  canTap: boolean; tapIdx: number; onTap: () => void; onRestartTap: () => void;
}) {
  const need = keys.length - 1;
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [w, setW] = useState(600);
  const [sel, setSel] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const H = 104;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(240, el.clientWidth)));
    ro.observe(el);
    setW(Math.max(240, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const inner = w * zoom;
  const x = (t: number) => (t / own.duration) * inner;
  const result = useMemo(() => computeBounds(weights, own.startT, own.endT, own.marks), [weights, own.startT, own.endT, own.marks]);

  useEffect(() => {
    const c = cvs.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(inner * dpr);
    c.height = H * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    const cs = getComputedStyle(c);
    const wave = cs.getPropertyValue("--wave").trim() || "#2f9e75";
    const dim = cs.getPropertyValue("--wave-dim").trim() || "#8a8f98";
    g.clearRect(0, 0, inner, H);
    const px = Math.ceil(inner);
    const n = own.peak.length;
    for (let i = 0; i < px; i++) {
      const a = Math.floor((i / px) * n), b = Math.max(a + 1, Math.floor(((i + 1) / px) * n));
      let m = 0;
      for (let j = a; j < b && j < n; j++) if (own.peak[j] > m) m = own.peak[j];
      const t = (i / px) * own.duration;
      g.fillStyle = t >= own.startT && t <= own.endT ? wave : dim;
      const h = Math.max(1, m * (H - 8));
      g.fillRect(i, (H - h) / 2, 1, h);
    }
  }, [own.peak, own.duration, own.startT, own.endT, inner]);

  const t0 = own.startT;
  const bounds = result?.bounds ?? [];

  const fromX = (clientX: number) => {
    const r = cvs.current!.getBoundingClientRect();
    return Math.min(own.duration, Math.max(0, ((clientX - r.left) / r.width) * own.duration));
  };

  const drag = (kind: "mark" | "start" | "end", i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (kind === "mark") setSel(i);
    const marks = own.marks;
    const move = (ev: PointerEvent) => {
      const t = fromX(ev.clientX);
      if (kind === "mark") {
        const lo = (marks[i - 1]?.t ?? own.startT) + 0.05, hi = (marks[i + 1]?.t ?? own.endT) - 0.05;
        const next = marks.map((m, k) => (k === i ? { ...m, t: Math.min(hi, Math.max(lo, t)) } : m));
        onChange({ marks: next, src: "edit" });
      } else if (kind === "start") {
        onChange({ startT: Math.min(t, (marks[0]?.t ?? own.endT) - 0.1), src: "edit" });
      } else {
        onChange({ endT: Math.max(t, (marks[marks.length - 1]?.t ?? own.startT) + 0.1), src: "edit" });
      }
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const nudge = (i: number) => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.5 : 0.05;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const d = e.key === "ArrowLeft" ? -step : step;
      const lo = (own.marks[i - 1]?.t ?? own.startT) + 0.05, hi = (own.marks[i + 1]?.t ?? own.endT) - 0.05;
      onChange({ marks: own.marks.map((m, k) => (k === i ? { ...m, t: Math.min(hi, Math.max(lo, m.t + d)) } : m)), src: "edit" });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeAt(i);
    }
  };

  const removeAt = (i: number) => { onChange({ marks: own.marks.filter((_, k) => k !== i), src: "edit" }); setSel(null); };
  const addAt = (t: number) => {
    if (t <= own.startT + 0.1 || t >= own.endT - 0.1) { setMsg("Place a marker between the recitation's start and end handles."); return; }
    const next: Mark[] = [...own.marks, { t, w: 99 }].sort((a, b) => a.t - b.t);
    onChange({ marks: next, src: "edit" });
    setSel(next.findIndex((m) => m.t === t));
    setMsg(null);
  };

  const detect = () => {
    setDetecting(true);
    setMsg(null);
    setTimeout(() => {
      try {
        const d = detectPauses(own.rms, own.duration, need);
        if (!d.clear) {
          setMsg("No clear pauses were found. The recording may be continuous, very noisy, or too quiet. Use Tap to mark verse end instead, or add markers by hand.");
        } else {
          onChange({ startT: d.startT, endT: d.endT, marks: d.pauses, src: "pause" });
          setSel(null);
        }
      } finally { setDetecting(false); }
    }, 30);
  };

  const status = (() => {
    const found = own.marks.length;
    if (keys.length < 2) return { tone: "ok", text: "One verse in this range: it spans the whole recitation between the start and end handles." };
    if (found === need) return { tone: "ok", text: `${found} ${found === 1 ? "marker matches" : "markers match"} the ${keys.length} verses in order. Check each one by ear.` };
    if (found > need) return { tone: "warn", text: `${found} markers for ${keys.length} verses (${need} needed). The ${need} longest pauses are used and the faded ones are ignored. Remove ${found - need} to match, or keep them as they are.` };
    return { tone: "warn", text: `${found} ${found === 1 ? "marker" : "markers"} for ${keys.length} verses (${need} needed). Verses after the last marker are spread by text length until you add ${need - found} more. Double-click the waveform or use Add marker at playhead.` };
  })();

  return (
    <div className="border-b border-border px-5 pb-4">
      <p className="mb-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Pause-based timing.</strong> Markers are guesses from gaps in your audio, matched to verses in order. Reciters do not always pause between verses, so listen and adjust them. This is not exact verse alignment.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onTogglePlay} className={btn}>{playing ? <Pause size={13} /> : <Play size={13} />}{playing ? "Pause" : "Play"}</button>
        <button type="button" onClick={detect} disabled={detecting} className={`${btn} border-primary/50 text-primary`}>{detecting ? <Loader2 size={13} className="animate-spin" /> : <Waves size={13} />}Detect pauses</button>
        <button type="button" onClick={onTap} disabled={!canTap} title="Space" className={btn}>
          <Hand size={13} />{tapIdx >= keys.length ? "All verses marked" : `Tap to mark end of ${keys[tapIdx]}`}<kbd className="rounded-sm border border-border px-1 font-mono text-[10px]">Space</kbd>
        </button>
        {tapIdx > 0 && <button type="button" onClick={onRestartTap} className="text-xs font-semibold text-gold underline-offset-2 hover:underline">Restart marking</button>}
        <button type="button" onClick={() => addAt(now)} className={btn}><Plus size={13} />Add marker at playhead</button>
        <button type="button" onClick={() => sel !== null && removeAt(sel)} disabled={sel === null} className={btn}><Trash2 size={13} />Remove selected</button>
        <span className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z / 2))} disabled={zoom <= 1} className={btn}><ZoomOut size={13} /></button>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(16, z * 2))} disabled={zoom >= 16} className={btn}><ZoomIn size={13} /></button>
        </span>
      </div>

      <div ref={wrap} className="w-full overflow-x-auto rounded-sm border border-border bg-background" style={{ ["--wave" as string]: "var(--primary, #2f9e75)", ["--wave-dim" as string]: "color-mix(in srgb, currentColor 30%, transparent)" }}>
        <div className="relative select-none" style={{ width: inner, height: H + 22 }}>
          <div className="absolute inset-x-0 top-0 h-[22px]">
            {keys.map((k, i) => bounds[i + 1] !== undefined && (
              <span key={k} className="absolute top-1 truncate px-1 text-[10px] font-medium text-muted-foreground" style={{ left: x(bounds[i]), width: Math.max(0, x(bounds[i + 1]) - x(bounds[i])) }}>{k}</span>
            ))}
          </div>
          <canvas
            ref={cvs}
            className="absolute left-0 top-[22px] cursor-pointer text-foreground"
            style={{ width: inner, height: H }}
            onClick={(e) => onSeek(fromX(e.clientX))}
            onDoubleClick={(e) => addAt(fromX(e.clientX))}
          />
          {[{ k: "start" as const, t: own.startT, l: "Recitation start" }, { k: "end" as const, t: own.endT, l: "Recitation end" }].map((h) => (
            <div key={h.k} role="slider" aria-label={h.l} aria-valuenow={Math.round(h.t * 100) / 100} tabIndex={0}
              onPointerDown={drag(h.k, 0)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const d = (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 0.5 : 0.05);
                if (h.k === "start") onChange({ startT: Math.max(0, Math.min((own.marks[0]?.t ?? own.endT) - 0.1, own.startT + d)), src: "edit" });
                else onChange({ endT: Math.min(own.duration, Math.max((own.marks[own.marks.length - 1]?.t ?? own.startT) + 0.1, own.endT + d)), src: "edit" });
              }}
              className="absolute top-[22px] z-10 w-3 -translate-x-1/2 cursor-ew-resize touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ left: x(h.t), height: H }}>
              <div className="mx-auto h-full w-0.5 bg-foreground/60" />
            </div>
          ))}
          {own.marks.map((m, i) => {
            const used = result?.used[i] ?? true;
            return (
              <div key={i} role="slider" aria-label={`Verse boundary ${i + 1}`} aria-valuenow={Math.round(m.t * 100) / 100} aria-valuetext={`${fmt(m.t - t0, true)}`} tabIndex={0}
                onPointerDown={drag("mark", i)} onKeyDown={nudge(i)} onFocus={() => setSel(i)}
                className={`absolute top-[22px] z-20 w-4 -translate-x-1/2 cursor-ew-resize touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring ${used ? "" : "opacity-40"}`} style={{ left: x(m.t), height: H }}>
                <div className={`mx-auto h-full w-0.5 ${sel === i ? "bg-gold" : "bg-primary"}`} />
                <div className={`absolute -top-0.5 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-background ${sel === i ? "bg-gold" : "bg-primary"}`} />
              </div>
            );
          })}
          <div className="pointer-events-none absolute top-[22px] z-30 w-px bg-red-500" style={{ left: x(Math.min(own.duration, Math.max(0, now))), height: H }} />
        </div>
      </div>

      <p role="status" className={`mt-3 rounded-sm border p-3 text-xs ${status.tone === "ok" ? "border-border bg-muted/50" : "border-amber-500/40 bg-amber-500/10"}`}>{status.text}</p>
      {msg && <p role="alert" className="mt-2 rounded-sm border border-amber-500/40 bg-amber-500/10 p-3 text-xs">{msg}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">Drag a marker, or focus it and use the arrow keys (Shift for bigger steps). Delete removes it. Click the waveform to seek. The dark handles set where the recitation starts and ends.</p>
    </div>
  );
}
