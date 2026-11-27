"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Download,
  Check,
  Volume2,
  Loader2,
  Headphones,
} from "lucide-react";
import { PlannerUnit } from "@/lib/planner/types";
import {
  saveOfflineMushafPage,
  hasOfflineMushafPage,
  getOfflineMushafPage,
  getOfflineSurahAudio,
} from "@/lib/offline/db";
import { DEFAULT_RECITER, type Reciter } from "@/lib/quran/types";
import { registerAudioPlayback, notifyAudioPlaybackStarted } from "@/lib/audio/single-audio";

interface PracticeModalProps {
  unit: PlannerUnit | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AudioTrack {
  verseKey: string;
  audioUrl: string;
}

export function PracticeModal({ unit, isOpen, onClose }: PracticeModalProps) {
  const [repeatTarget, setRepeatTarget] = useState<number>(3);
  const [currentRepeat, setCurrentRepeat] = useState<number>(1);
  const [pauseSeconds, setPauseSeconds] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hideArabic, setHideArabic] = useState<boolean>(false);
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set());

  const [pageData, setPageData] = useState<any | null>(null);
  const [loadingText, setLoadingText] = useState<boolean>(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState<boolean>(false);
  const [savingOffline, setSavingOffline] = useState<boolean>(false);

  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(DEFAULT_RECITER);
  const [loadingReciters, setLoadingReciters] = useState<boolean>(false);

  const [playlist, setPlaylist] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistRef = useRef<AudioTrack[]>([]);
  const trackIndexRef = useRef<number>(0);
  const repeatRef = useRef<number>(1);
  const targetRepeatRef = useRef<number>(3);
  const pauseSecondsRef = useRef<number>(1);
  const playbackSpeedRef = useRef<number>(1.0);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reciterIdRef = useRef<number>(DEFAULT_RECITER);

  // Load reciters list & user preference on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("qcs-quran-reciter");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setSelectedReciterId(parsed);
          reciterIdRef.current = parsed;
        }
      }
    }

    setLoadingReciters(true);
    fetch("/api/quran/reciters")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.reciters || [];
        if (Array.isArray(list) && list.length > 0) {
          setReciters(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingReciters(false));
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    targetRepeatRef.current = repeatTarget;
  }, [repeatTarget]);

  useEffect(() => {
    repeatRef.current = currentRepeat;
  }, [currentRepeat]);

  useEffect(() => {
    pauseSecondsRef.current = pauseSeconds;
  }, [pauseSeconds]);

  useEffect(() => {
    reciterIdRef.current = selectedReciterId;
  }, [selectedReciterId]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const stopPlayback = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setActiveVerseKey(null);
  }, []);

  const playTrackAtIndex = useCallback(
    (index: number, repeatNum: number) => {
      const list = playlistRef.current;
      if (!list || list.length === 0) {
        setIsPlaying(false);
        return;
      }

      // Check if we've reached the end of the lesson's playlist
      if (index >= list.length) {
        if (repeatNum < targetRepeatRef.current) {
          // Pause between whole portion repeats
          setActiveVerseKey(null);
          pauseTimeoutRef.current = setTimeout(() => {
            const nextRepeat = repeatNum + 1;
            repeatRef.current = nextRepeat;
            setCurrentRepeat(nextRepeat);
            playTrackAtIndex(0, nextRepeat);
          }, pauseSecondsRef.current * 1000);
          return;
        } else {
          // Finished all repetition cycles
          setIsPlaying(false);
          repeatRef.current = 1;
          setCurrentRepeat(1);
          trackIndexRef.current = 0;
          setCurrentTrackIndex(0);
          setActiveVerseKey(null);
          return;
        }
      }

      trackIndexRef.current = index;
      setCurrentTrackIndex(index);
      const track = list[index];
      setActiveVerseKey(track.verseKey);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = track.audioUrl;
      audio.playbackRate = playbackSpeedRef.current;

      audio.onended = () => {
        playTrackAtIndex(index + 1, repeatRef.current);
      };

      audio.onerror = () => {
        // Fallback to next track if one fails
        playTrackAtIndex(index + 1, repeatRef.current);
      };

      notifyAudioPlaybackStarted("practice");
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
        });
    },
    []
  );

  // Register with global single-audio coordinator
  useEffect(() => {
    const unregister = registerAudioPlayback("practice", () => {
      stopPlayback();
    });
    return () => {
      unregister();
      stopPlayback();
    };
  }, [stopPlayback]);

  // Extract lines and verse keys for this unit
  const targetLines: any[] = [];
  if (pageData && Array.isArray(pageData.lines) && unit) {
    for (let l = unit.startLine; l <= unit.endLine; l++) {
      const lineObj = pageData.lines.find((item: any) => item.line_number === l);
      if (lineObj) targetLines.push(lineObj);
    }
  }

  // Load verse recitation playlist for this unit
  const loadAudioPlaylist = useCallback(
    async (lines: any[], specificReciterId?: number): Promise<AudioTrack[]> => {
      if (!unit || lines.length === 0) return [];
      setLoadingAudio(true);
      setAudioError(null);

      try {
        const reciterId = specificReciterId || reciterIdRef.current || DEFAULT_RECITER;

        // Collect unique ordered verse keys across target lines
        const uniqueKeys: string[] = [];
        for (const line of lines) {
          if (Array.isArray(line.words)) {
            for (const w of line.words) {
              if (w.verse_key && !uniqueKeys.includes(w.verse_key)) {
                uniqueKeys.push(w.verse_key);
              }
            }
          }
        }

        // If no verse_key found on lines, fallback to unit surah starting verse
        if (uniqueKeys.length === 0 && unit.surahNumber) {
          uniqueKeys.push(`${unit.surahNumber}:1`);
        }

        // Find all unique surahs involved
        const surahIds = Array.from(
          new Set(
            uniqueKeys
              .map((vk) => parseInt(vk.split(":")[0], 10))
              .filter((n) => !isNaN(n) && n > 0)
          )
        );

        if (surahIds.length === 0 && unit.surahNumber) {
          surahIds.push(unit.surahNumber);
        }

        // Fetch audio files for each surah (offline cache first, then API)
        const allFiles: { verseKey: string; audioUrl: string }[] = [];
        for (const sId of surahIds) {
          let files: { verseKey: string; audioUrl: string }[] = [];

          // 1. Try offline database
          try {
            const offline = await getOfflineSurahAudio(sId, reciterId);
            if (offline && Array.isArray(offline.files) && offline.files.length > 0) {
              files = offline.files;
            }
          } catch {}

          // 2. Fetch from API if not cached offline
          if (files.length === 0) {
            const res = await fetch(`/api/quran/audio?surah=${sId}&reciter=${reciterId}`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.files)) {
                files = data.files;
              }
            }
          }

          allFiles.push(...files);
        }

        // Map target verse keys to full ayah audio URLs
        const tracks: AudioTrack[] = [];
        for (const vk of uniqueKeys) {
          const match = allFiles.find((f) => f.verseKey === vk);
          if (match?.audioUrl) {
            tracks.push({ verseKey: vk, audioUrl: match.audioUrl });
          }
        }

        // Deduplicate contiguous tracks with identical audioUrl (e.g. continuous full-surah recitations)
        const finalTracks: AudioTrack[] = [];
        for (const t of tracks) {
          if (
            finalTracks.length === 0 ||
            finalTracks[finalTracks.length - 1].audioUrl !== t.audioUrl
          ) {
            finalTracks.push(t);
          }
        }

        setPlaylist(finalTracks);
        playlistRef.current = finalTracks;
        return finalTracks;
      } catch (err: any) {
        console.error("Failed to load practice recitation audio:", err);
        setAudioError("Unable to load recitation audio. Please check network connection.");
        return [];
      } finally {
        setLoadingAudio(false);
      }
    },
    [unit]
  );

  // Handle Reciter change by user
  const handleReciterChange = async (newId: number) => {
    stopPlayback();
    setSelectedReciterId(newId);
    reciterIdRef.current = newId;
    try {
      localStorage.setItem("qcs-quran-reciter", String(newId));
    } catch {}
    await loadAudioPlaylist(targetLines, newId);
  };

  // Fetch page data for Arabic text
  useEffect(() => {
    if (!unit || !isOpen) return;

    let active = true;
    setLoadingText(true);
    setCurrentRepeat(1);
    repeatRef.current = 1;
    setCurrentTrackIndex(0);
    trackIndexRef.current = 0;
    setIsPlaying(false);
    setRevealedLines(new Set());
    setPlaylist([]);
    playlistRef.current = [];
    setActiveVerseKey(null);

    // Check offline DB first, otherwise fetch from /api/quran/mushaf
    getOfflineMushafPage(unit.startPage).then((offlineData) => {
      if (!active) return;
      if (offlineData) {
        setPageData(offlineData);
        setLoadingText(false);
        setIsOfflineSaved(true);

        // Extract target lines and preload audio playlist
        const lines: any[] = [];
        if (Array.isArray(offlineData.lines)) {
          for (let l = unit.startLine; l <= unit.endLine; l++) {
            const lineObj = offlineData.lines.find((item: any) => item.line_number === l);
            if (lineObj) lines.push(lineObj);
          }
        }
        loadAudioPlaylist(lines);
      } else {
        fetch(`/api/quran/mushaf?page=${unit.startPage}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!active) return;
            setPageData(data);
            setLoadingText(false);

            if (data && Array.isArray(data.lines)) {
              const lines: any[] = [];
              for (let l = unit.startLine; l <= unit.endLine; l++) {
                const lineObj = data.lines.find((item: any) => item.line_number === l);
                if (lineObj) lines.push(lineObj);
              }
              loadAudioPlaylist(lines);
            }
          })
          .catch(() => {
            if (active) setLoadingText(false);
          });

        hasOfflineMushafPage(unit.startPage).then((saved) => {
          if (active) setIsOfflineSaved(saved);
        });
      }
    });

    return () => {
      active = false;
      stopPlayback();
    };
  }, [unit, isOpen, loadAudioPlaylist, stopPlayback]);

  if (!isOpen || !unit) return null;

  const currentReciter = reciters.find((r) => r.id === selectedReciterId);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    let tracks = playlistRef.current;
    if (tracks.length === 0) {
      tracks = await loadAudioPlaylist(targetLines);
    }

    if (tracks.length === 0) {
      return;
    }

    const idx = trackIndexRef.current < tracks.length ? trackIndexRef.current : 0;
    playTrackAtIndex(idx, repeatRef.current);
  };

  const handleRestart = () => {
    stopPlayback();
    repeatRef.current = 1;
    setCurrentRepeat(1);
    trackIndexRef.current = 0;
    setCurrentTrackIndex(0);
    setActiveVerseKey(null);
    if (playlistRef.current.length > 0) {
      playTrackAtIndex(0, 1);
    }
  };

  const handleSaveOffline = async () => {
    if (!pageData) return;
    setSavingOffline(true);
    try {
      await saveOfflineMushafPage(pageData);
      setIsOfflineSaved(true);
    } finally {
      setSavingOffline(false);
    }
  };

  const toggleLineReveal = (lineNum: number) => {
    const next = new Set(revealedLines);
    if (next.has(lineNum)) next.delete(lineNum);
    else next.add(lineNum);
    setRevealedLines(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl transition-all max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
              Practice & Repetition Mode
            </span>
            <h3 className="font-bold text-base text-foreground mt-1">{unit.label}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 py-4 space-y-5">
          {/* Audio Controls */}
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Volume2 size={14} className="text-primary" /> Repeat Player
              </span>
              <div className="flex items-center gap-2">
                {playlist.length > 0 && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {playlist.length} {playlist.length === 1 ? "verse" : "verses"}
                  </span>
                )}
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Repeat {currentRepeat} of {repeatTarget}
                </span>
              </div>
            </div>

            {/* Reciter Selector */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="practice-reciter-select"
                  className="text-muted-foreground font-semibold flex items-center gap-1.5"
                >
                  <Headphones size={13} className="text-primary" /> Reciter Voice:
                </label>
                {currentReciter?.style && (
                  <span className="text-[10px] text-muted-foreground font-mono uppercase bg-background px-1.5 py-0.5 rounded border border-border/80">
                    {currentReciter.style}
                  </span>
                )}
              </div>
              <select
                id="practice-reciter-select"
                value={selectedReciterId}
                onChange={(e) => handleReciterChange(Number(e.target.value))}
                disabled={loadingReciters && reciters.length === 0}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground font-medium text-xs focus:ring-2 focus:ring-primary focus:outline-none transition-all cursor-pointer shadow-2xs"
              >
                {reciters.length > 0 ? (
                  reciters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.style ? `· ${r.style}` : ""}
                    </option>
                  ))
                ) : (
                  <option value={selectedReciterId}>
                    {selectedReciterId === 1 ? "Mishary Rashid Alafasy" : `Reciter #${selectedReciterId}`}
                  </option>
                )}
              </select>
            </div>

            {/* Repeat count selection */}
            <div className="flex items-center gap-2 text-xs pt-1">
              <span className="text-muted-foreground font-medium w-16">Repeats:</span>
              <div className="flex items-center gap-1.5">
                {[3, 5, 10, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setRepeatTarget(count);
                      targetRepeatRef.current = count;
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-all ${
                      repeatTarget === count
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {count}×
                  </button>
                ))}
              </div>
            </div>

            {/* Pause & Speed */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Pause between:</span>
                <select
                  value={pauseSeconds}
                  onChange={(e) => {
                    const sec = Number(e.target.value);
                    setPauseSeconds(sec);
                    pauseSecondsRef.current = sec;
                  }}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-foreground font-medium"
                >
                  <option value={1}>1 second</option>
                  <option value={2}>2 seconds</option>
                  <option value={3}>3 seconds</option>
                </select>
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => {
                    const spd = Number(e.target.value);
                    setPlaybackSpeed(spd);
                  }}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-foreground font-medium"
                >
                  <option value={0.75}>0.75× (Slow)</option>
                  <option value={1.0}>1.0× (Normal)</option>
                  <option value={1.25}>1.25× (Fast)</option>
                </select>
              </div>
            </div>

            {audioError && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg p-2">
                {audioError}
              </div>
            )}

            {/* Play Button & Reset */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={loadingAudio && playlist.length === 0}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  isPlaying
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                } ${loadingAudio && playlist.length === 0 ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {loadingAudio && playlist.length === 0 ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Loading Recitation...
                  </>
                ) : isPlaying ? (
                  <>
                    <Pause size={15} /> Pause Repetitions
                  </>
                ) : (
                  <>
                    <Play size={15} /> Play {repeatTarget}× Repetitions
                  </>
                )}
              </button>

              {(isPlaying || currentRepeat > 1 || currentTrackIndex > 0) && (
                <button
                  type="button"
                  onClick={handleRestart}
                  title="Restart from beginning"
                  className="p-2.5 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Self-Test / Hide Text Mode */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Self-Test Mode</span>
              <button
                type="button"
                onClick={() => setHideArabic(!hideArabic)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  hideArabic
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {hideArabic ? <Eye size={13} /> : <EyeOff size={13} />}
                <span>{hideArabic ? "Reveal all" : "Hide Arabic"}</span>
              </button>
            </div>

            {/* Render Lines */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 min-h-[140px] flex flex-col justify-center">
              {loadingText ? (
                <div className="text-center text-xs text-muted-foreground py-6 animate-pulse">
                  Loading Arabic text...
                </div>
              ) : targetLines.length > 0 ? (
                targetLines.map((line) => {
                  const isRevealed = !hideArabic || revealedLines.has(line.line_number);
                  const isLinePlaying = Boolean(
                    activeVerseKey &&
                      line.words?.some((w: any) => w.verse_key === activeVerseKey)
                  );

                  return (
                    <div
                      key={line.line_number}
                      onClick={() => hideArabic && toggleLineReveal(line.line_number)}
                      className={`transition-all rounded-xl p-2.5 text-right cursor-pointer border ${
                        isLinePlaying
                          ? "border-emerald-500/50 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30"
                          : "border-transparent"
                      } ${
                        !isRevealed
                          ? "bg-muted/40 filter blur-xs select-none hover:bg-muted/60"
                          : isLinePlaying
                          ? ""
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          L{line.line_number}
                        </span>
                        {isLinePlaying && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 flex items-center gap-1">
                            <Volume2 size={11} className="animate-pulse" /> Playing ({activeVerseKey})
                          </span>
                        )}
                      </div>
                      <p
                        dir="rtl"
                        className="font-uthmani text-xl sm:text-2xl text-foreground leading-loose inline-block w-full"
                      >
                        {line.words
                          ? line.words
                              .map((w: any) => w.text_uthmani || w.text_qpc_hafs || "")
                              .join(" ")
                          : `Line ${line.line_number}`}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-muted-foreground py-6">
                  Page {unit.startPage}, Lines {unit.startLine}–{unit.endLine}
                </div>
              )}
            </div>
            {hideArabic && (
              <p className="text-[11px] text-muted-foreground italic text-center">
                Tap any line above to reveal it individually as you recite from memory.
              </p>
            )}
          </div>
        </div>

        {/* Footer / Offline Download */}
        <div className="pt-3 border-t border-border flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleSaveOffline}
            disabled={isOfflineSaved || savingOffline}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isOfflineSaved
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            {isOfflineSaved ? (
              <>
                <Check size={13} className="text-emerald-500" /> Saved Offline
              </>
            ) : (
              <>
                <Download size={13} /> {savingOffline ? "Saving..." : "Download Offline"}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
