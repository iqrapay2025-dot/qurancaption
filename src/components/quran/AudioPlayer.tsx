"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, AlertCircle, Loader2 } from "lucide-react";
import type { Chapter } from "@/lib/quran/server";
import { DEFAULT_RECITER, type AyahFile, type SurahAudio, type Reciter } from "@/lib/quran/types";
import { findStartIndex, nextFile, prevFile, shouldAdvanceAyah, type PlaybackScope } from "@/lib/quran/player";
import audioCoverage from "@/lib/quran/audio-coverage.json";
import { registerAudioPlayback, notifyAudioPlaybackStarted } from "@/lib/audio/single-audio";
import { getOfflineSurahAudio } from "@/lib/offline/db";

const COMPLETE_RECITER_IDS = new Set(
  audioCoverage.filter((entry) => entry.complete).map((entry) => entry.reciterId)
);

export type AudioPlayerHandle = {
  playAyah: (ayah: number, scope?: PlaybackScope) => void;
  playFromAyah: (ayah: number) => void;
  playEntireSurah: (startAyah?: number) => void;
  stop: () => void;
  getAudioFiles: () => AyahFile[];
  getReciters: () => Reciter[];
  getReciterId: () => number;
  getPlaybackScope: () => PlaybackScope;
  setPlaybackScope: (scope: PlaybackScope) => void;
  isPlaying: () => boolean;
};

type Props = {
  chapter: Chapter;
  onActiveAyahChange: (ayah: number | null) => void;
};

export const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(function AudioPlayer(
  { chapter, onActiveAyahChange },
  ref
) {
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [reciterId, setReciterId] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_RECITER;
    try {
      const saved = localStorage.getItem("qcs-quran-reciter");
      if (saved) {
        const parsed = Number(saved);
        if (Number.isInteger(parsed) && parsed > 0 && COMPLETE_RECITER_IDS.has(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_RECITER;
  });

  const [currentAyah, setCurrentAyah] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [playbackScope, setPlaybackScope] = useState<PlaybackScope>("single");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioDataRef = useRef<SurahAudio | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;

  const playbackScopeRef = useRef<PlaybackScope>("single");
  playbackScopeRef.current = playbackScope;

  const currentAyahRef = useRef<number>(1);
  currentAyahRef.current = currentAyah;

  const currentSurahRef = useRef<number>(chapter.id);
  currentSurahRef.current = chapter.id;

  const currentReciterRef = useRef<number>(reciterId);
  currentReciterRef.current = reciterId;

  // Scroll ayah into view helper
  const scrollToAyah = useCallback((ayahNum: number) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(`ayah-${ayahNum}`);
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "center",
    });
  }, []);

  // Preload next audio file helper
  const preloadNext = useCallback((files: AyahFile[], verseKey: string) => {
    const next = nextFile(files, verseKey);
    if (next?.audioUrl) {
      const img = new Audio();
      img.preload = "auto";
      img.src = next.audioUrl;
    }
  }, []);

  // Fetch reciters catalog on mount
  useEffect(() => {
    let active = true;
    fetch("/api/quran/reciters")
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data?.reciters)) {
          const available = data.reciters.filter((r: Reciter) => COMPLETE_RECITER_IDS.has(r.id));
          setReciters(available);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Clean up audio element on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      onActiveAyahChange(null);
    };
  }, [onActiveAyahChange]);

  // Single-audio coordination
  useEffect(() => {
    const unregister = registerAudioPlayback("reader", () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        onActiveAyahChange(null);
      }
    });
    return unregister;
  }, [onActiveAyahChange]);

  const handlePlayEvent = useCallback(() => {
    notifyAudioPlaybackStarted("reader");
  }, []);

  // Fetch audio for given surah and reciter
  const fetchAudioData = useCallback(async (surah: number, reciter: number): Promise<SurahAudio | null> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Check offline storage first
      try {
        const offline = await getOfflineSurahAudio(surah, reciter);
        if (offline && offline.files.length > 0) {
          const offlineData: SurahAudio = {
            surah,
            reciterId: reciter,
            audioUrl: offline.fullAudioUrl || "",
            files: offline.files,
          };
          audioDataRef.current = offlineData;
          return offlineData;
        }
      } catch {}

      // 2. Fall back to online API
      const res = await fetch(`/api/quran/audio?surah=${surah}&reciter=${reciter}`);
      if (!res.ok) {
        throw new Error("Failed to load audio");
      }
      const data: SurahAudio = await res.json();
      // Ignore if state changed while fetching
      if (data.surah !== currentSurahRef.current || data.reciterId !== currentReciterRef.current) {
        return null;
      }
      audioDataRef.current = data;
      return data;
    } catch {
      setErrorMsg("Failed to load recitation audio");
      setIsPlaying(false);
      onActiveAyahChange(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onActiveAyahChange]);

  // Play a specific ayah
  const playAyah = useCallback(
    async (ayahNum: number, startPlaying: boolean = true, scope?: PlaybackScope) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (scope) {
        setPlaybackScope(scope);
        playbackScopeRef.current = scope;
      }

      let data = audioDataRef.current;
      if (!data || data.surah !== chapter.id || data.reciterId !== reciterId) {
        data = await fetchAudioData(chapter.id, reciterId);
      }
      if (!data) return;

      const verseKey = `${chapter.id}:${ayahNum}`;
      const fileIdx = findStartIndex(data.files, verseKey);
      if (fileIdx === null) {
        setErrorMsg(`Audio for ayah ${verseKey} not found`);
        setIsPlaying(false);
        onActiveAyahChange(null);
        return;
      }

      const file = data.files[fileIdx];
      setCurrentAyah(ayahNum);
      setErrorMsg(null);

      if (audio.src !== file.audioUrl) {
        audio.src = file.audioUrl;
      }

      if (startPlaying) {
        try {
          await audio.play();
          setIsPlaying(true);
          onActiveAyahChange(ayahNum);
          scrollToAyah(ayahNum);
          preloadNext(data.files, verseKey);
        } catch {
          setErrorMsg("Playback failed");
          setIsPlaying(false);
          onActiveAyahChange(null);
        }
      }
    },
    [chapter.id, reciterId, fetchAudioData, onActiveAyahChange, scrollToAyah, preloadNext]
  );

  // Expose imperative handle for single ayah play, entire surah play, and practice mode
  useImperativeHandle(
    ref,
    () => ({
      playAyah: (ayah: number, scope: PlaybackScope = "single") => {
        if (currentAyahRef.current === ayah && isPlayingRef.current) {
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            onActiveAyahChange(null);
          }
        } else {
          playAyah(ayah, true, scope);
        }
      },
      playFromAyah: (ayah: number) => {
        playAyah(ayah, true, "single");
      },
      playEntireSurah: (startAyah: number = 1) => {
        playAyah(startAyah, true, "continuous");
      },
      stop: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
          onActiveAyahChange(null);
        }
      },
      getAudioFiles: () => audioDataRef.current?.files ?? [],
      getReciters: () => reciters,
      getReciterId: () => reciterId,
      getPlaybackScope: () => playbackScopeRef.current,
      setPlaybackScope: (scope: PlaybackScope) => {
        setPlaybackScope(scope);
        playbackScopeRef.current = scope;
      },
      isPlaying: () => isPlayingRef.current,
    }),
    [playAyah, onActiveAyahChange, reciters, reciterId]
  );

  // Audio event handlers
  const handleEnded = useCallback(() => {
    // If playing in "single" ayah mode, stop immediately after this ayah finishes!
    if (!shouldAdvanceAyah(playbackScopeRef.current)) {
      setIsPlaying(false);
      onActiveAyahChange(null);
      return;
    }

    const data = audioDataRef.current;
    if (!data) {
      setIsPlaying(false);
      onActiveAyahChange(null);
      return;
    }

    const currentKey = `${chapter.id}:${currentAyahRef.current}`;
    const next = nextFile(data.files, currentKey);

    if (next) {
      const parts = next.verseKey.split(":");
      const nextAyahNum = Number(parts[1]);
      if (nextAyahNum) {
        playAyah(nextAyahNum, true, "continuous");
      }
    } else {
      // Reached end of surah
      setIsPlaying(false);
      onActiveAyahChange(null);
    }
  }, [chapter.id, onActiveAyahChange, playAyah]);

  const handleError = useCallback(() => {
    setErrorMsg("Audio file failed to load");
    setIsPlaying(false);
    onActiveAyahChange(null);
  }, [onActiveAyahChange]);

  // Reciter change
  const handleReciterChange = async (newReciterId: number) => {
    setReciterId(newReciterId);
    try {
      localStorage.setItem("qcs-quran-reciter", String(newReciterId));
    } catch {}

    const currentlyPlaying = isPlayingRef.current;
    const activeAyah = currentAyahRef.current;

    // Fetch new reciter's audio
    const data = await fetchAudioData(chapter.id, newReciterId);
    if (!data) return;

    const verseKey = `${chapter.id}:${activeAyah}`;
    const fileIdx = findStartIndex(data.files, verseKey);
    if (fileIdx !== null && audioRef.current) {
      audioRef.current.src = data.files[fileIdx].audioUrl;
      if (currentlyPlaying) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          onActiveAyahChange(activeAyah);
        } catch {
          setErrorMsg("Playback failed");
          setIsPlaying(false);
          onActiveAyahChange(null);
        }
      }
    }
  };

  // Play/Pause button
  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onActiveAyahChange(null);
    } else {
      playAyah(currentAyah, true);
    }
  };

  // Prev Ayah
  const handlePrev = () => {
    const data = audioDataRef.current;
    if (!data) {
      if (currentAyah > 1) {
        playAyah(currentAyah - 1, isPlaying);
      }
      return;
    }
    const currentKey = `${chapter.id}:${currentAyah}`;
    const prev = prevFile(data.files, currentKey);
    if (prev) {
      const prevAyahNum = Number(prev.verseKey.split(":")[1]);
      if (prevAyahNum) playAyah(prevAyahNum, isPlaying);
    }
  };

  // Next Ayah
  const handleNext = () => {
    const data = audioDataRef.current;
    if (!data) {
      if (currentAyah < chapter.versesCount) {
        playAyah(currentAyah + 1, isPlaying);
      }
      return;
    }
    const currentKey = `${chapter.id}:${currentAyah}`;
    const next = nextFile(data.files, currentKey);
    if (next) {
      const nextAyahNum = Number(next.verseKey.split(":")[1]);
      if (nextAyahNum) playAyah(nextAyahNum, isPlaying);
    }
  };

  // Media Session API integration
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const currentReciter = reciters.find((r) => r.id === reciterId);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${chapter.nameSimple} ${chapter.id}:${currentAyah}`,
      artist: currentReciter?.name || "Aayah Studio Recitation",
      album: `Surah ${chapter.nameSimple}`,
    });

    navigator.mediaSession.setActionHandler("play", () => togglePlayPause());
    navigator.mediaSession.setActionHandler("pause", () => togglePlayPause());
    navigator.mediaSession.setActionHandler("previoustrack", () => handlePrev());
    navigator.mediaSession.setActionHandler("nexttrack", () => handleNext());

    return () => {
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
      } catch {}
    };
  });

  const isFirstAyah = currentAyah <= 1;
  const isLastAyah = currentAyah >= chapter.versesCount;

  return (
    <>
      {/* HTML Audio element */}
      <audio
        ref={audioRef}
        id="quran-audio-player"
        preload="auto"
        onPlay={handlePlayEvent}
        onEnded={handleEnded}
        onError={handleError}
        className="hidden"
      />

      {/* Sticky Player Bar */}
      <aside
        data-tour="quran-audio-player"
        aria-label="Quran audio player"
        className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-card/95 backdrop-blur-md px-3 py-2.5 sm:px-6 sm:py-3 shadow-lg"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 sm:gap-4">
          {/* Left: Current Ayah Label */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="font-mono text-xs sm:text-sm font-semibold rounded bg-muted px-2 py-1 text-foreground"
              aria-label={`Current ayah ${chapter.id}:${currentAyah}`}
            >
              {chapter.id}:{currentAyah}
            </span>

            {isLoading && (
              <span className="inline-flex items-center text-xs text-muted-foreground gap-1">
                <Loader2 size={13} className="animate-spin text-primary" />
                <span className="hidden sm:inline">Loading...</span>
              </span>
            )}
          </div>

          {/* Center: Controls (Prev, Play/Pause, Next) */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirstAyah}
              aria-label="Previous ayah"
              className="rounded-full p-1.5 text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <SkipBack size={18} />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              disabled={isLoading}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
              className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isLastAyah}
              aria-label="Next ayah"
              className="rounded-full p-1.5 text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <SkipForward size={18} />
            </button>

            {/* Scope toggle: Single Ayah vs Entire Surah */}
            <button
              type="button"
              onClick={() => {
                const nextScope = playbackScope === "single" ? "continuous" : "single";
                setPlaybackScope(nextScope);
                playbackScopeRef.current = nextScope;
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring ${
                playbackScope === "continuous"
                  ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                  : "border-border bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
              title={
                playbackScope === "continuous"
                  ? "Entire Surah: Playing verses continuously"
                  : "Single Ayah: Playing just one ayah and stopping"
              }
              aria-label={`Playback mode: ${playbackScope === "continuous" ? "Entire Surah" : "Single Ayah"}. Click to toggle.`}
            >
              <span className="hidden sm:inline">
                {playbackScope === "continuous" ? "Entire Surah" : "Single Ayah"}
              </span>
              <span className="sm:hidden text-[11px] font-mono">
                {playbackScope === "continuous" ? "All" : "1 Ayah"}
              </span>
            </button>
          </div>

          {/* Right: Reciter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="reciter-select" className="sr-only">
              Choose reciter
            </label>
            <select
              id="reciter-select"
              value={reciterId}
              onChange={(e) => handleReciterChange(Number(e.target.value))}
              className="rounded-sm border border-border bg-card px-2 py-1 text-xs sm:text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring max-w-[130px] sm:max-w-[210px] truncate"
            >
              {reciters.length > 0 ? (
                reciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))
              ) : (
                <option value={DEFAULT_RECITER}>Mishari Rashid al-`Afasy</option>
              )}
            </select>
          </div>
        </div>

        {/* Short error message if audio fails */}
        {errorMsg && (
          <div className="mt-1 text-center text-xs text-destructive flex items-center justify-center gap-1">
            <AlertCircle size={12} />
            <span>{errorMsg}</span>
          </div>
        )}
      </aside>
    </>
  );
});
