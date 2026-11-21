"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  ChangeEvent,
} from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Clock,
  Search,
  AlertCircle,
  X,
} from "lucide-react";
import BadgeLoader from "@/components/BadgeLoader";
import { useApi } from "@/lib/quran/useApi";
import type { Chapter, Reciter, SurahAudio, ApiErr } from "@/lib/quran/types";
import { DEFAULT_RECITER } from "@/lib/quran/types";
import {
  nextSurah,
  prevSurah,
  formatTime,
  clampSpeed,
  parseListenQuery,
  type RepeatMode,
  type PlaybackSpeed,
  ALLOWED_SPEEDS,
} from "@/lib/listen/player";
import audioCoverage from "@/lib/quran/audio-coverage.json";
import { saveContinueListening } from "@/lib/library/storage";

const STORAGE_KEYS = {
  reciter: "ayah-listen-reciter",
  speed: "ayah-listen-speed",
  repeat: "ayah-listen-repeat",
  volume: "ayah-listen-volume",
  surah: "ayah-listen-surah",
} as const;

function Notice({
  what,
  err,
  retryIn,
  onRetry,
}: {
  what: string;
  err: ApiErr;
  retryIn: number | null;
  onRetry?: () => void;
}) {
  const limited = err.code === "rate_limited";
  return (
    <div
      role="alert"
      className="rounded-sm border border-red-500/40 bg-red-500/10 p-4 text-sm max-w-xl mx-auto my-6"
    >
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
        <AlertCircle size={18} />
        <span>{limited ? "Rate limit reached" : `Couldn't load ${what}`}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {limited
          ? `The Quran data service is asking us to slow down.${
              retryIn ? ` Retrying in ${retryIn}s…` : " Please wait a moment and try again."
            }`
          : err.message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function ListenPlayer() {
  // 1. Load chapters and reciters from API
  const chaptersQ = useApi<{ chapters: Chapter[] }>("/api/quran/chapters");
  const recitersQ = useApi<{ reciters: Reciter[] }>("/api/quran/reciters");

  // Filter reciters: only those marked complete: true in audioCoverage
  const completeReciterIds = useMemo(() => {
    return new Set(
      audioCoverage
        .filter((entry) => entry.complete)
        .map((entry) => entry.reciterId)
    );
  }, []);

  const availableReciters = useMemo(() => {
    const list = recitersQ.data?.reciters ?? [];
    return list.filter((r) => completeReciterIds.has(r.id));
  }, [recitersQ.data?.reciters, completeReciterIds]);

  // 2. Player State
  const [selectedSurah, setSelectedSurah] = useState<number>(DEFAULT_RECITER);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(DEFAULT_RECITER);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEverPlayed, setHasEverPlayed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  // Sleep timer state: null | 15 | 30 | 60 (in minutes)
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sleepFadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isInitializedRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);

  // 3. Audio query for selected surah and reciter
  const audioQueryUrl = useMemo(() => {
    if (!selectedSurah || !selectedReciterId) return null;
    return `/api/quran/audio?surah=${selectedSurah}&reciter=${selectedReciterId}`;
  }, [selectedSurah, selectedReciterId]);

  const audioQ = useApi<SurahAudio>(audioQueryUrl);

  const isAudioReady = Boolean(
    audioQ.data &&
    audioQ.data.surah === selectedSurah &&
    audioQ.data.reciterId === selectedReciterId &&
    audioQ.data.audioUrl
  );
  const currentAudioUrl = isAudioReady ? audioQ.data?.audioUrl : undefined;

  // Sync audio error with API error or network failure
  useEffect(() => {
    if (audioQ.error) {
      setAudioError("This recitation could not be loaded");
    } else {
      setAudioError(null);
    }
  }, [audioQ.error]);

  // 4. Initialize from URL / LocalStorage (Without Autoplay!)
  useEffect(() => {
    if (isInitializedRef.current) return;
    if (typeof window === "undefined") return;

    // First check URL query params
    const searchParams = new URLSearchParams(window.location.search);
    const parsed = parseListenQuery(searchParams, completeReciterIds);

    let initialSurah = parsed.surah;
    let initialReciter = parsed.reciter;

    // Check LocalStorage if URL didn't specify or to restore other preferences
    try {
      if (!searchParams.has("surah")) {
        const savedSurah = localStorage.getItem(STORAGE_KEYS.surah);
        if (savedSurah) {
          const num = Number(savedSurah);
          if (Number.isInteger(num) && num >= 1 && num <= 114) {
            initialSurah = num;
          }
        }
      }

      if (!searchParams.has("reciter")) {
        const savedReciter = localStorage.getItem(STORAGE_KEYS.reciter);
        if (savedReciter) {
          const num = Number(savedReciter);
          if (Number.isInteger(num) && completeReciterIds.has(num)) {
            initialReciter = num;
          }
        }
      }

      const savedSpeed = localStorage.getItem(STORAGE_KEYS.speed);
      if (savedSpeed) {
        setSpeed(clampSpeed(Number(savedSpeed)));
      }

      const savedRepeat = localStorage.getItem(STORAGE_KEYS.repeat) as RepeatMode;
      if (savedRepeat === "off" || savedRepeat === "surah" || savedRepeat === "all") {
        setRepeatMode(savedRepeat);
      }

      const savedVol = localStorage.getItem(STORAGE_KEYS.volume);
      if (savedVol !== null) {
        const v = Number(savedVol);
        if (Number.isFinite(v) && v >= 0 && v <= 1) {
          setVolume(v);
        }
      }
    } catch {}

    setSelectedSurah(initialSurah);
    setSelectedReciterId(initialReciter);

    const initialT = parseFloat(new URLSearchParams(window.location.search).get("t") || "0");
    if (!isNaN(initialT) && initialT > 0) {
      setCurrentTime(initialT);
      pendingSeekTimeRef.current = initialT;
    }

    isInitializedRef.current = true;
  }, [completeReciterIds]);

  // 5. Update URL search query without reloading
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (typeof window === "undefined") return;
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set("surah", String(selectedSurah));
    currentParams.set("reciter", String(selectedReciterId));
    window.history.replaceState(null, "", `${window.location.pathname}?${currentParams.toString()}`);
  }, [selectedSurah, selectedReciterId]);

  // 6. Save preferences to LocalStorage
  useEffect(() => {
    if (!isInitializedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.surah, String(selectedSurah));
    } catch {}
  }, [selectedSurah]);

  useEffect(() => {
    if (!isInitializedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.reciter, String(selectedReciterId));
    } catch {}
  }, [selectedReciterId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.speed, String(speed));
    } catch {}
  }, [speed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.repeat, repeatMode);
    } catch {}
  }, [repeatMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.volume, String(volume));
    } catch {}
  }, [volume]);

  // 7. Chapters & Reciter objects
  const chapters = chaptersQ.data?.chapters ?? [];
  const currentChapter = useMemo(
    () => chapters.find((c) => c.id === selectedSurah),
    [chapters, selectedSurah]
  );
  const currentReciter = useMemo(
    () => availableReciters.find((r) => r.id === selectedReciterId) ?? { id: 1, name: "Mishary Rashid Alafasy" },
    [availableReciters, selectedReciterId]
  );

  // 8. Filtered Surahs for search
  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter((c) => {
      return (
        c.nameSimple.toLowerCase().includes(q) ||
        c.nameArabic.toLowerCase().includes(q) ||
        c.meaning.toLowerCase().includes(q) ||
        String(c.id) === q ||
        String(c.id).padStart(2, "0") === q
      );
    });
  }, [chapters, searchQuery]);

  // 9. Auto-play when switching surahs once the audio URL is ready
  useEffect(() => {
    if (!shouldAutoPlay || !isAudioReady || !currentAudioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.play().then(() => {
      setIsPlaying(true);
      setShouldAutoPlay(false);
    }).catch((err) => {
      if (err?.name !== "AbortError") {
        console.warn("Auto-play error:", err);
        setAudioError("This recitation could not be loaded");
        setIsPlaying(false);
        setShouldAutoPlay(false);
      }
    });
  }, [shouldAutoPlay, isAudioReady, currentAudioUrl]);

  // 10. Update playbackRate & volume whenever state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.setAttribute("data-paused", String(!isPlaying));
    }
  }, [speed, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // 11. Play / Pause / Seek / Navigation Handlers
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setHasEverPlayed(true);
    setAudioError(null);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setShouldAutoPlay(false);
    } else {
      if (!isAudioReady || !currentAudioUrl) {
        setShouldAutoPlay(true);
        setIsPlaying(true);
        return;
      }
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        if (err?.name !== "AbortError") {
          console.warn("Playback error:", err);
          setAudioError("This recitation could not be loaded");
        }
        setIsPlaying(false);
      });
    }
  }, [isPlaying, isAudioReady, currentAudioUrl]);

  const playSurah = useCallback((surahId: number) => {
    setHasEverPlayed(true);
    setAudioError(null);
    if (surahId === selectedSurah) {
      togglePlay();
    } else {
      setSelectedSurah(surahId);
      setCurrentTime(0);
      setDuration(0);
      setShouldAutoPlay(true);
      setIsPlaying(true);
    }
  }, [selectedSurah, togglePlay]);

  const handleNext = useCallback(() => {
    const next = nextSurah(selectedSurah, repeatMode);
    if (next === selectedSurah && repeatMode === "off" && selectedSurah === 114) {
      setIsPlaying(false);
      setShouldAutoPlay(false);
      return;
    }
    setAudioError(null);
    setSelectedSurah(next);
    setCurrentTime(0);
    setDuration(0);
    setShouldAutoPlay(true);
    setIsPlaying(true);
  }, [selectedSurah, repeatMode]);

  const handlePrev = useCallback(() => {
    const prev = prevSurah(selectedSurah, repeatMode);
    setAudioError(null);
    setSelectedSurah(prev);
    setCurrentTime(0);
    setDuration(0);
    setShouldAutoPlay(true);
    setIsPlaying(true);
  }, [selectedSurah, repeatMode]);

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cycleSpeed = () => {
    const curIdx = ALLOWED_SPEEDS.indexOf(speed);
    const nextIdx = (curIdx + 1) % ALLOWED_SPEEDS.length;
    setSpeed(ALLOWED_SPEEDS[nextIdx]);
  };

  const cycleRepeat = () => {
    if (repeatMode === "off") setRepeatMode("surah");
    else if (repeatMode === "surah") setRepeatMode("all");
    else setRepeatMode("off");
  };

  // 12. Audio Event Listeners
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);
      audioRef.current.setAttribute("data-current-time", String(cur));
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      setDuration(dur);
      audioRef.current.setAttribute("data-duration", String(dur));
      if (pendingSeekTimeRef.current !== null && pendingSeekTimeRef.current > 0) {
        audioRef.current.currentTime = pendingSeekTimeRef.current;
        setCurrentTime(pendingSeekTimeRef.current);
        pendingSeekTimeRef.current = null;
      }
      if (shouldAutoPlay) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setShouldAutoPlay(false);
        }).catch(() => {});
      }
    }
  };

  // Save continue listening position every 5 seconds while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0) {
        saveContinueListening({
          surah: selectedSurah,
          reciterId: selectedReciterId,
          time: audioRef.current.currentTime,
          surahName: currentChapter?.nameSimple,
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, selectedSurah, selectedReciterId, currentChapter?.nameSimple]);

  const handleEnded = () => {
    if (repeatMode === "surah") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else if (repeatMode === "all") {
      handleNext();
    } else {
      if (selectedSurah < 114) {
        handleNext();
      } else {
        setIsPlaying(false);
        setShouldAutoPlay(false);
      }
    }
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (!audio.src || !isAudioReady) return;
    if (audio.error?.code === 1) return; // MEDIA_ERR_ABORTED
    setAudioError("This recitation could not be loaded");
    setIsPlaying(false);
    setShouldAutoPlay(false);
  };

  const retryAudio = () => {
    setAudioError(null);
    audioQ.retry();
    setShouldAutoPlay(true);
  };

  const skipToNext = () => {
    setAudioError(null);
    handleNext();
  };

  // 13. Sleep Timer Logic
  const startSleepTimer = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    setSleepMenuOpen(false);

    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if (sleepFadeIntervalRef.current) clearInterval(sleepFadeIntervalRef.current);

    if (!minutes) return;

    const ms = minutes * 60 * 1000;
    const fadeStartMs = Math.max(0, ms - 3000);

    sleepTimerRef.current = setTimeout(() => {
      const startVol = audioRef.current?.volume ?? 1;
      let step = 0;
      const steps = 30;
      const intervalTime = 3000 / steps;

      sleepFadeIntervalRef.current = setInterval(() => {
        step++;
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, startVol * (1 - step / steps));
        }
        if (step >= steps) {
          if (sleepFadeIntervalRef.current) clearInterval(sleepFadeIntervalRef.current);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.volume = volume;
          }
          setIsPlaying(false);
          setSleepTimerMinutes(null);
        }
      }, intervalTime);
    }, fadeStartMs);
  };

  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      if (sleepFadeIntervalRef.current) clearInterval(sleepFadeIntervalRef.current);
    };
  }, []);

  // 14. Media Session API
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    if (!currentChapter || !currentReciter) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentChapter.nameSimple,
        artist: currentReciter.name,
        album: "Ayah Studio",
        artwork: [
          {
            src: "/brand/ayah-badge-dark.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => handlePrev());
      navigator.mediaSession.setActionHandler("nexttrack", () => handleNext());
      navigator.mediaSession.setActionHandler("seekbackward", () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
        }
      });
      navigator.mediaSession.setActionHandler("seekforward", () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(
            audioRef.current.duration || 0,
            audioRef.current.currentTime + 10
          );
        }
      });
    } catch {}
  }, [currentChapter, currentReciter, handleNext, handlePrev]);

  // 15. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          (activeEl as HTMLElement).isContentEditable);

      if (e.key === "Escape") {
        if (searchQuery) {
          e.preventDefault();
          setSearchQuery("");
        }
        return;
      }

      if (isInput) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(
            audioRef.current.duration || 0,
            audioRef.current.currentTime + 10
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, togglePlay]);

  // Loading state for initial catalog (avoids empty flash)
  if (!chaptersQ.data && !chaptersQ.error) {
    return (
      <div className="py-24">
        <BadgeLoader size="page" label="Loading Quran..." />
      </div>
    );
  }

  return (
    <div className="pb-32 sm:pb-28 w-full max-w-full overflow-hidden">
      {/* Hidden single <audio> element with explicit DOM attributes */}
      <audio
        ref={audioRef}
        src={currentAudioUrl}
        data-duration={duration}
        data-current-time={currentTime}
        data-paused={!isPlaying}
        data-error={audioError || ""}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          if (!shouldAutoPlay) {
            setIsPlaying(false);
          }
        }}
      />

      {/* Header controls: Reciter picker & Search box */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full max-w-full">
        {/* Reciter picker */}
        <div className="flex flex-col gap-1 sm:max-w-xs w-full">
          <label htmlFor="reciter-select" className="text-xs font-medium text-muted-foreground">
            Reciter
          </label>
          <select
            id="reciter-select"
            value={selectedReciterId}
            onChange={(e) => {
              const newId = Number(e.target.value);
              setSelectedReciterId(newId);
              setAudioError(null);
              if (isPlaying) {
                setShouldAutoPlay(true);
              }
            }}
            className="w-full rounded-sm border border-border bg-card px-3 py-2 text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
          >
            {availableReciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.style ? ` (${r.style})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Search box */}
        <div className="flex flex-col gap-1 sm:max-w-sm w-full">
          <label htmlFor="search-input" className="text-xs font-medium text-muted-foreground">
            Search Surahs
          </label>
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="search-input"
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by surah name, Arabic, meaning or number..."
              className="w-full rounded-sm border border-border bg-card pl-9 pr-8 py-2 text-xs sm:text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* API Notice / Errors */}
      {chaptersQ.error && (
        <Notice
          what="surahs"
          err={chaptersQ.error}
          retryIn={chaptersQ.retryIn}
          onRetry={chaptersQ.retry}
        />
      )}
      {recitersQ.error && (
        <Notice
          what="reciters"
          err={recitersQ.error}
          retryIn={recitersQ.retryIn}
          onRetry={recitersQ.retry}
        />
      )}

      {/* Surah Rows List */}
      <div className="grid gap-2 w-full max-w-full overflow-hidden">
        {filteredChapters.map((chapter) => {
          const isCurrent = chapter.id === selectedSurah;
          const isRowActivePlaying = isCurrent && isPlaying;

          return (
            <div
              key={chapter.id}
              onClick={() => playSurah(chapter.id)}
              className={`group flex items-center justify-between rounded-md border p-2 sm:px-4 sm:py-3.5 transition-colors cursor-pointer w-full max-w-full overflow-hidden ${
                isCurrent
                  ? "border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:border-border/80 hover:bg-muted/50"
              }`}
            >
              {/* Left side: Number, Names, Meaning, Verse count */}
              <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 overflow-hidden pr-2">
                <span
                  className={`grid size-7 sm:size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {chapter.id}
                </span>

                <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-xs sm:text-base text-foreground truncate">
                      {chapter.nameSimple}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                      ({chapter.meaning})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    <span className="sm:hidden truncate">{chapter.meaning} · </span>
                    <span className="shrink-0">{chapter.versesCount} verses</span>
                  </div>
                </div>
              </div>

              {/* Right side: Arabic name & Play button / Equaliser */}
              <div className="flex items-center gap-2 sm:gap-5 shrink-0 pl-1">
                <span className="font-quran text-base sm:text-xl text-foreground/90 font-medium text-right shrink-0">
                  {chapter.nameArabic}
                </span>

                <button
                  type="button"
                  aria-label={isRowActivePlaying ? `Pause ${chapter.nameSimple}` : `Play ${chapter.nameSimple}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    playSurah(chapter.id);
                  }}
                  className={`grid size-8 sm:size-9 place-items-center rounded-full transition-all shrink-0 focus-visible:outline-2 focus-visible:outline-ring ${
                    isRowActivePlaying
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  {isRowActivePlaying ? (
                    <div className="flex items-end gap-0.5 h-3.5 w-3.5" aria-hidden="true">
                      <span className="w-0.5 bg-current rounded-full animate-pulse h-3.5 motion-reduce:animate-none motion-reduce:h-3" />
                      <span className="w-0.5 bg-current rounded-full animate-pulse delay-75 h-2 motion-reduce:animate-none motion-reduce:h-2" />
                      <span className="w-0.5 bg-current rounded-full animate-pulse delay-150 h-3 motion-reduce:animate-none motion-reduce:h-2.5" />
                    </div>
                  ) : (
                    <Play size={15} className="ml-0.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {filteredChapters.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
            No surahs found matching &quot;{searchQuery}&quot;. Press Escape to clear.
          </div>
        )}
      </div>

      {/* Desktop keyboard shortcuts hint */}
      <div className="mt-6 hidden md:block text-center text-xs text-muted-foreground font-mono">
        Keyboard shortcuts: <kbd className="px-1 py-0.5 border border-border rounded bg-muted">Space</kbd> Play/Pause ·{" "}
        <kbd className="px-1 py-0.5 border border-border rounded bg-muted">←</kbd> /{" "}
        <kbd className="px-1 py-0.5 border border-border rounded bg-muted">→</kbd> Seek 10s ·{" "}
        <kbd className="px-1 py-0.5 border border-border rounded bg-muted">Esc</kbd> Clear search
      </div>

      {/* Bottom Fixed Player Bar (Hidden until first play) */}
      {hasEverPlayed && (
        <div
          role="region"
          aria-label="Audio player"
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md shadow-2xl px-3 sm:px-4 py-2 sm:py-3 transition-transform"
        >
          <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 w-full overflow-hidden">
            {/* Top row on mobile / Left column on desktop: Surah Info */}
            <div className="flex items-center justify-between md:justify-start gap-2 sm:gap-3 min-w-0 md:w-64 shrink-0">
              <div className="flex flex-col min-w-0 truncate">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {currentChapter ? `${currentChapter.id}. ${currentChapter.nameSimple}` : "Quran Recitation"}
                  </span>
                  {currentChapter && (
                    <span className="text-xs font-quran text-foreground/80 hidden sm:inline shrink-0">
                      {currentChapter.nameArabic}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground truncate">
                  {currentReciter?.name || "Reciter"}
                </span>
              </div>

              {/* Loading indicator while audio buffer loads */}
              {audioQ.loading && (
                <div className="shrink-0 flex items-center gap-1">
                  <BadgeLoader size="inline" className="scale-75" />
                </div>
              )}
            </div>

            {/* Error notice in player bar */}
            {audioError ? (
              <div className="flex flex-1 items-center justify-center gap-3 py-1 text-xs text-red-600 dark:text-red-400 font-medium">
                <span>{audioError}</span>
                <button
                  type="button"
                  onClick={retryAudio}
                  className="rounded-sm border border-border bg-card px-2 py-0.5 text-xs text-foreground hover:bg-muted font-normal focus-visible:outline-2 focus-visible:outline-ring"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={skipToNext}
                  className="rounded-sm border border-border bg-card px-2 py-0.5 text-xs text-foreground hover:bg-muted font-normal focus-visible:outline-2 focus-visible:outline-ring"
                >
                  Skip to next
                </button>
              </div>
            ) : (
              /* Center Controls & Seek Bar */
              <div className="flex flex-1 flex-col items-center gap-1 min-w-0 w-full">
                {/* Control buttons: Prev, Play/Pause, Next */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    aria-label="Previous surah"
                    onClick={handlePrev}
                    className="grid size-8 place-items-center rounded-full text-foreground/80 hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <SkipBack size={18} />
                  </button>

                  <button
                    type="button"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    onClick={togglePlay}
                    className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all shadow focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    aria-label="Next surah"
                    onClick={handleNext}
                    className="grid size-8 place-items-center rounded-full text-foreground/80 hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <SkipForward size={18} />
                  </button>
                </div>

                {/* Seek Bar with Time Stamps */}
                <div className="flex w-full items-center gap-1.5 sm:gap-2 max-w-lg">
                  <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground w-9 sm:w-10 text-right shrink-0">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    aria-label="Seek time"
                    className="h-1.5 w-full cursor-pointer accent-primary rounded-lg bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                  />
                  <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground w-9 sm:w-10 text-left shrink-0">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            )}

            {/* Right side controls: Speed, Repeat, Sleep Timer, Volume */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 md:w-64">
              {/* Speed button */}
              <button
                type="button"
                onClick={cycleSpeed}
                title={`Playback speed: ${speed}x`}
                aria-label={`Playback speed: ${speed}x`}
                className="rounded-sm border border-border bg-card px-2 py-1 text-xs font-mono font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                {speed}x
              </button>

              {/* Repeat button */}
              <button
                type="button"
                onClick={cycleRepeat}
                title={`Repeat: ${repeatMode}`}
                aria-label={`Repeat mode: ${repeatMode}`}
                className={`grid size-7 place-items-center rounded-sm border transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                  repeatMode !== "off"
                    ? "border-primary/50 bg-primary/10 text-primary font-bold"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {repeatMode === "surah" ? (
                  <Repeat1 size={15} />
                ) : (
                  <Repeat size={15} />
                )}
              </button>

              {/* Sleep timer button with menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSleepMenuOpen((prev) => !prev)}
                  title={sleepTimerMinutes ? `Sleep timer: ${sleepTimerMinutes}m` : "Sleep timer"}
                  aria-label={sleepTimerMinutes ? `Sleep timer: ${sleepTimerMinutes}m` : "Sleep timer"}
                  className={`flex items-center gap-1 rounded-sm border px-2 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                    sleepTimerMinutes
                      ? "border-primary/50 bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Clock size={14} />
                  {sleepTimerMinutes ? <span>{sleepTimerMinutes}m</span> : null}
                </button>

                {sleepMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Sleep timer options"
                    className="absolute bottom-full right-0 mb-2 w-32 rounded-sm border border-border bg-card p-1 shadow-lg z-50 text-xs"
                  >
                    {[null, 15, 30, 60].map((min) => (
                      <button
                        key={String(min)}
                        type="button"
                        role="menuitem"
                        onClick={() => startSleepTimer(min)}
                        className={`w-full rounded-sm px-2.5 py-1.5 text-left font-medium transition-colors hover:bg-muted ${
                          sleepTimerMinutes === min ? "text-primary font-bold bg-muted/60" : "text-foreground"
                        }`}
                      >
                        {min === null ? "Off" : `${min} minutes`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume (Desktop only) */}
              <div className="hidden md:flex items-center gap-1 pl-2 border-l border-border/60">
                <button
                  type="button"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                  onClick={() => setIsMuted((prev) => !prev)}
                  className="grid size-7 place-items-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
                >
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (isMuted && v > 0) setIsMuted(false);
                  }}
                  aria-label="Volume slider"
                  className="h-1.5 w-16 cursor-pointer accent-primary rounded bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
