"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X,
  Play,
  Square,
  Repeat,
  AlertCircle,
  Eye,
  EyeOff,
  SkipForward,
  RotateCcw,
} from "lucide-react";
import type { Chapter } from "@/lib/quran/server";
import type { AyahFile, SurahAudio } from "@/lib/quran/types";
import {
  type PracticeConfig,
  type PracticeState,
  type RepeatCount,
  type PauseOption,
  type PracticeSpeed,
  DEFAULT_CONFIG,
  validateConfig,
  createInitialState,
  nextStep,
  calculatePauseMs,
} from "@/lib/practice/engine";

const STORAGE_KEYS = {
  repeatEach: "ayah-practice-repeat-each",
  repeatRange: "ayah-practice-repeat-range",
  pause: "ayah-practice-pause",
  speed: "ayah-practice-speed",
  hideText: "ayah-practice-hide-text",
} as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter;
  selectedAyah: number;
  onActiveAyahChange: (ayah: number | null) => void;
  onHideTextChange: (hide: boolean) => void;
  getAudioFiles?: () => AyahFile[];
  reciterName?: string;
  reciterId?: number;
  onStopOtherAudio?: () => void;
};

export function PracticeDrawer({
  isOpen,
  onClose,
  chapter,
  selectedAyah,
  onActiveAyahChange,
  onHideTextChange,
  getAudioFiles,
  reciterName = "Mishary Rashid Alafasy",
  reciterId = 1,
  onStopOtherAudio,
}: Props) {
  // Load saved preferences
  const [config, setConfig] = useState<PracticeConfig>(() => {
    let base = { ...DEFAULT_CONFIG, fromAyah: selectedAyah, toAyah: selectedAyah };
    if (typeof window === "undefined") return base;
    try {
      const savedEach = localStorage.getItem(STORAGE_KEYS.repeatEach);
      if (savedEach === "infinite") base.repeatEach = "infinite";
      else if (savedEach && !isNaN(Number(savedEach))) base.repeatEach = Number(savedEach);

      const savedRange = localStorage.getItem(STORAGE_KEYS.repeatRange);
      if (savedRange === "infinite") base.repeatRange = "infinite";
      else if (savedRange && !isNaN(Number(savedRange))) base.repeatRange = Number(savedRange);

      const savedPause = localStorage.getItem(STORAGE_KEYS.pause);
      if (savedPause === "same" || savedPause === "none" || savedPause === "1" || savedPause === "2" || savedPause === "3") {
        base.pauseBetween = savedPause === "same" || savedPause === "none" ? savedPause : (Number(savedPause) as any);
      }

      const savedSpeed = localStorage.getItem(STORAGE_KEYS.speed);
      if (savedSpeed && (savedSpeed === "0.5" || savedSpeed === "0.75" || savedSpeed === "1")) {
        base.speed = Number(savedSpeed) as PracticeSpeed;
      }

      const savedHide = localStorage.getItem(STORAGE_KEYS.hideText);
      if (savedHide) base.hideText = savedHide === "true";
    } catch {}
    return validateConfig(base, chapter.versesCount);
  });

  // Keep fromAyah & toAyah updated when opened on a new ayah (if not running)
  const isRunningRef = useRef(false);
  useEffect(() => {
    if (isOpen && !isRunningRef.current) {
      setConfig((prev) => validateConfig({ ...prev, fromAyah: selectedAyah, toAyah: selectedAyah }, chapter.versesCount));
    }
  }, [isOpen, selectedAyah, chapter.versesCount]);

  // Sync hideText with parent reader
  useEffect(() => {
    onHideTextChange(config.hideText);
    try {
      localStorage.setItem(STORAGE_KEYS.hideText, String(config.hideText));
    } catch {}
  }, [config.hideText, onHideTextChange]);

  // Save other settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.repeatEach, String(config.repeatEach));
      localStorage.setItem(STORAGE_KEYS.repeatRange, String(config.repeatRange));
      localStorage.setItem(STORAGE_KEYS.pause, String(config.pauseBetween));
      localStorage.setItem(STORAGE_KEYS.speed, String(config.speed));
    } catch {}
  }, [config.repeatEach, config.repeatRange, config.pauseBetween, config.speed]);

  // Practice state
  const [isRunning, setIsRunning] = useState(false);
  isRunningRef.current = isRunning;
  const [practiceState, setPracticeState] = useState<PracticeState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isWaitingPause, setIsWaitingPause] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customEach, setCustomEach] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cachedFilesRef = useRef<AyahFile[]>([]);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioDurationRef = useRef<number>(3); // fallback 3s

  // Ensure files are available: reuse passed files or fetch once
  const ensureFiles = useCallback(async (): Promise<AyahFile[]> => {
    if (cachedFilesRef.current.length > 0) return cachedFilesRef.current;
    const existing = getAudioFiles ? getAudioFiles() : [];
    if (existing.length > 0) {
      cachedFilesRef.current = existing;
      return existing;
    }
    // Fetch once
    try {
      const res = await fetch(`/api/quran/audio?surah=${chapter.id}&reciter=${reciterId}`);
      if (!res.ok) throw new Error("Could not load audio");
      const data: SurahAudio = await res.json();
      if (Array.isArray(data?.files)) {
        cachedFilesRef.current = data.files;
        return data.files;
      }
    } catch (e: any) {
      setErrorMsg("Failed to load recitation audio");
    }
    return [];
  }, [chapter.id, reciterId, getAudioFiles]);

  // Scroll ayah into view helper
  const scrollToAyah = useCallback((ayahNum: number) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(`ayah-${ayahNum}`);
    if (el) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "center",
      });
    }
  }, []);

  // Preload next ayah audio
  const preloadAyah = useCallback((ayahNum: number, files: AyahFile[]) => {
    const key = `${chapter.id}:${ayahNum}`;
    const item = files.find((f) => f.verseKey === key);
    if (item?.audioUrl) {
      const a = new Audio();
      a.preload = "auto";
      a.src = item.audioUrl;
    }
  }, [chapter.id]);

  // Stop practice cleanly
  const stopPractice = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setIsWaitingPause(false);
    setPracticeState(null);
    setErrorMsg(null);
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onActiveAyahChange(null);
  }, [onActiveAyahChange]);

  // Clean up on unmount or page exit
  useEffect(() => {
    return () => {
      stopPractice();
    };
  }, [stopPractice]);

  // Play a step
  const playStep = useCallback(
    async (state: PracticeState, currentConfig: PracticeConfig) => {
      setErrorMsg(null);
      setIsWaitingPause(false);

      if (state.done) {
        stopPractice();
        return;
      }

      const files = await ensureFiles();
      const verseKey = `${chapter.id}:${state.currentAyah}`;
      const file = files.find((f) => f.verseKey === verseKey);

      if (!file?.audioUrl) {
        setErrorMsg(`Audio for ayah ${verseKey} not found`);
        return;
      }

      onActiveAyahChange(state.currentAyah);
      scrollToAyah(state.currentAyah);

      // Preload next potential ayah
      const nextCandidate = state.currentAyah < currentConfig.toAyah ? state.currentAyah + 1 : currentConfig.fromAyah;
      preloadAyah(nextCandidate, files);

      // Setup Media Session API
      if (typeof window !== "undefined" && "mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: `${chapter.nameSimple} ${chapter.id}:${state.currentAyah}`,
            artist: reciterName,
            album: "Ayah Studio Practice",
            artwork: [{ src: "/brand/ayah-badge-dark.png", sizes: "512x512", type: "image/png" }],
          });
          navigator.mediaSession.setActionHandler("play", () => {
            audioRef.current?.play().then(() => setIsPaused(false)).catch(() => {});
          });
          navigator.mediaSession.setActionHandler("pause", () => {
            audioRef.current?.pause();
            setIsPaused(true);
          });
          navigator.mediaSession.setActionHandler("stop", () => stopPractice());
        } catch {}
      }

      const audio = audioRef.current;
      if (!audio) return;

      audio.src = file.audioUrl;
      audio.playbackRate = currentConfig.speed;

      try {
        await audio.play();
        setIsPaused(false);
      } catch (err) {
        setErrorMsg("Audio playback error");
      }
    },
    [chapter.id, chapter.nameSimple, reciterName, ensureFiles, onActiveAyahChange, scrollToAyah, preloadAyah, stopPractice]
  );

  // Audio event: ended
  const handleAudioEnded = useCallback(() => {
    if (!practiceState || !isRunning) return;

    // Calculate pause
    const dur = audioRef.current?.duration || audioDurationRef.current;
    const pauseMs = calculatePauseMs(config.pauseBetween, dur);

    const advance = () => {
      setPracticeState((prevState) => {
        if (!prevState) return null;
        const next = nextStep(prevState, config);
        if (next.done) {
          stopPractice();
          return null;
        }
        playStep(next, config);
        return next;
      });
    };

    if (pauseMs > 0) {
      setIsWaitingPause(true);
      pauseTimerRef.current = setTimeout(() => {
        setIsWaitingPause(false);
        advance();
      }, pauseMs);
    } else {
      advance();
    }
  }, [practiceState, isRunning, config, playStep, stopPractice]);

  const handleLoadedMetadata = () => {
    if (audioRef.current?.duration) {
      audioDurationRef.current = audioRef.current.duration;
    }
  };

  const handleAudioError = () => {
    setErrorMsg("This audio file could not be loaded");
  };

  // Start practice
  const startPractice = async () => {
    if (onStopOtherAudio) onStopOtherAudio();
    const validated = validateConfig(config, chapter.versesCount);
    setConfig(validated);

    const initial = createInitialState(validated);
    setPracticeState(initial);
    setIsRunning(true);
    setIsPaused(false);
    await playStep(initial, validated);
  };

  // Skip current ayah
  const skipCurrent = () => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    setPracticeState((prev) => {
      if (!prev) return null;
      // Skip straight to next ayah or round
      const nextAyahNum = prev.currentAyah < config.toAyah ? prev.currentAyah + 1 : config.fromAyah;
      const nextRound = prev.currentAyah >= config.toAyah ? prev.roundCount + 1 : prev.roundCount;

      if (config.repeatRange !== "infinite" && nextRound > config.repeatRange) {
        stopPractice();
        return null;
      }

      const next: PracticeState = {
        currentAyah: nextAyahNum,
        repeatCount: 1,
        roundCount: nextRound,
        done: false,
      };
      playStep(next, config);
      return next;
    });
  };

  const retryCurrent = () => {
    if (practiceState) {
      playStep(practiceState, config);
    }
  };

  if (!isOpen) return null;

  const isRange = config.toAyah > config.fromAyah;
  const repeatPills = [1, 3, 5, 10, 20, 50, "infinite"];
  const rangePills = [1, 3, 5, 10, "infinite"];

  return (
    <>
      {/* Hidden single audio element for practice mode */}
      <audio
        ref={audioRef}
        preload="none"
        onEnded={handleAudioEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleAudioError}
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel: Bottom Sheet on Mobile, Right Side Drawer on Desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Practice Ayahs"
        className="fixed z-50 bg-card border-border shadow-2xl transition-transform overflow-y-auto
          inset-x-0 bottom-0 rounded-t-2xl border-t p-5 max-h-[85vh]
          md:inset-y-0 md:right-0 md:left-auto md:w-[400px] md:rounded-none md:border-l md:border-t-0 md:max-h-full md:p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Repeat size={18} className="text-primary" />
            <h2 className="text-base font-bold text-foreground">Practice (Memorize)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close practice panel"
            className="grid size-8 place-items-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Running Status Banner */}
        {isRunning && practiceState && (
          <div className="mt-4 rounded-md border border-primary/40 bg-primary/10 p-3 text-center animate-in fade-in">
            <div className="text-xs uppercase tracking-wider font-semibold text-primary">
              Practice in progress
            </div>
            <div className="mt-1 text-sm font-bold text-foreground">
              Ayah {chapter.id}:{practiceState.currentAyah},{" "}
              repeat {practiceState.repeatCount} of {config.repeatEach === "infinite" ? "∞" : config.repeatEach}
            </div>
            {isRange && (
              <div className="text-xs text-muted-foreground mt-0.5">
                Round {practiceState.roundCount} of {config.repeatRange === "infinite" ? "∞" : config.repeatRange}
              </div>
            )}
            {isWaitingPause && (
              <div className="text-xs text-primary font-medium mt-1 animate-pulse">
                Recite back now (pause between repeats)...
              </div>
            )}
          </div>
        )}

        {/* Error message with Retry and Skip */}
        {errorMsg && (
          <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={retryCurrent}
                className="rounded-sm border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-muted font-medium"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={skipCurrent}
                className="rounded-sm border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-muted font-medium"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Form controls */}
        <div className="mt-5 space-y-5 text-xs sm:text-sm">
          {/* 1. Range Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground block">
              Ayah Range (max 20 ayahs)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">From ayah</span>
                <input
                  type="number"
                  min={1}
                  max={chapter.versesCount}
                  disabled={isRunning}
                  value={config.fromAyah}
                  onChange={(e) => {
                    const from = Number(e.target.value);
                    setConfig((prev) => validateConfig({ ...prev, fromAyah: from }, chapter.versesCount));
                  }}
                  className="w-full rounded-sm border border-border bg-card px-3 py-1.5 text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                />
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">To ayah</span>
                <input
                  type="number"
                  min={config.fromAyah}
                  max={Math.min(config.fromAyah + 19, chapter.versesCount)}
                  disabled={isRunning}
                  value={config.toAyah}
                  onChange={(e) => {
                    const to = Number(e.target.value);
                    setConfig((prev) => validateConfig({ ...prev, toAyah: to }, chapter.versesCount));
                  }}
                  className="w-full rounded-sm border border-border bg-card px-3 py-1.5 text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* 2. Repeat each ayah */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground block">
              Repeat each ayah
            </label>
            <div className="flex flex-wrap gap-1.5">
              {repeatPills.map((p) => {
                const active = config.repeatEach === p;
                return (
                  <button
                    key={String(p)}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setConfig((prev) => ({ ...prev, repeatEach: p as RepeatCount }))}
                    className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                      active
                        ? "border-primary bg-primary text-primary-foreground font-bold"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    } disabled:opacity-60`}
                  >
                    {p === "infinite" ? "Infinite" : `${p}×`}
                  </button>
                );
              })}
            </div>
            {/* Custom repeat count */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground">Custom:</span>
              <input
                type="number"
                min={1}
                max={999}
                disabled={isRunning}
                placeholder="1-999"
                value={customEach}
                onChange={(e) => {
                  setCustomEach(e.target.value);
                  const num = Number(e.target.value);
                  if (num >= 1 && num <= 999) {
                    setConfig((prev) => ({ ...prev, repeatEach: num }));
                  }
                }}
                className="w-20 rounded-sm border border-border bg-card px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
              />
            </div>
          </div>

          {/* 3. Repeat the whole range (if range selected) */}
          {isRange && (
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">
                Repeat the whole range
              </label>
              <div className="flex flex-wrap gap-1.5">
                {rangePills.map((p) => {
                  const active = config.repeatRange === p;
                  return (
                    <button
                      key={String(p)}
                      type="button"
                      disabled={isRunning}
                      onClick={() => setConfig((prev) => ({ ...prev, repeatRange: p as RepeatCount }))}
                      className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                        active
                          ? "border-primary bg-primary text-primary-foreground font-bold"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      } disabled:opacity-60`}
                    >
                      {p === "infinite" ? "Infinite" : `${p}×`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Pause between repeats */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground block">
              Pause between repeats
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {[
                { val: "none", label: "None" },
                { val: 1, label: "1s" },
                { val: 2, label: "2s" },
                { val: 3, label: "3s" },
                { val: "same", label: "Same as ayah" },
              ].map((opt) => {
                const active = config.pauseBetween === opt.val;
                return (
                  <button
                    key={String(opt.val)}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setConfig((prev) => ({ ...prev, pauseBetween: opt.val as PauseOption }))}
                    className={`rounded-sm border px-2 py-1.5 text-center text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                      active
                        ? "border-primary bg-primary text-primary-foreground font-bold"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    } disabled:opacity-60`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              &quot;Same as ayah&quot; pauses for the duration of the recitation so you can recite it back.
            </p>
          </div>

          {/* 5. Playback Speed */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground block">
              Recitation Speed
            </label>
            <div className="flex gap-2">
              {([0.5, 0.75, 1] as PracticeSpeed[]).map((s) => {
                const active = config.speed === s;
                return (
                  <button
                    key={String(s)}
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({ ...prev, speed: s }));
                      if (audioRef.current) audioRef.current.playbackRate = s;
                    }}
                    className={`flex-1 rounded-sm border py-1.5 text-xs font-mono font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                      active
                        ? "border-primary bg-primary text-primary-foreground font-bold"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {s}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Hide Text (Memory Test) Toggle */}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                {config.hideText ? <EyeOff size={15} /> : <Eye size={15} />}
                Hide text
              </span>
              <span className="text-[11px] text-muted-foreground">
                Blurs the Arabic & translation. Tap an ayah to reveal it.
              </span>
            </div>
            <input
              type="checkbox"
              id="hide-text-toggle"
              checked={config.hideText}
              onChange={(e) => setConfig((prev) => ({ ...prev, hideText: e.target.checked }))}
              className="size-5 rounded border-border accent-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
        </div>

        {/* Action Buttons: Start / Stop / Skip */}
        <div className="mt-6 pt-4 border-t border-border flex items-center gap-2">
          {!isRunning ? (
            <button
              type="button"
              onClick={startPractice}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Play size={16} className="fill-current" />
              <span>Start Practice</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={stopPractice}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-sm bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground hover:opacity-90 transition-all shadow focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Square size={16} className="fill-current" />
                <span>Stop Practice</span>
              </button>

              <button
                type="button"
                onClick={skipCurrent}
                title="Skip to next ayah/round"
                aria-label="Skip to next"
                className="rounded-sm border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <SkipForward size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
