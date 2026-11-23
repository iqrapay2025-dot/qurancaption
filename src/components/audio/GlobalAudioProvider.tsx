"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { Chapter } from "@/lib/quran/server";
import {
  type Reciter,
  DEFAULT_RECITER,
} from "@/lib/quran/types";
import {
  type RepeatMode,
  type PlaybackSpeed,
  ALLOWED_SPEEDS,
  nextSurah as getNextSurah,
  prevSurah as getPrevSurah,
  computeTrackEndTransition,
} from "@/lib/listen/player";
import {
  mapLegacyReciterId,
  DEFAULT_LISTEN_RECITER_ID,
  buildListenAudioUrl,
} from "@/lib/listen/mp3quran";
import {
  parseSavedAudioState,
  serializeAudioState,
  GLOBAL_AUDIO_STORAGE_KEY,
} from "@/lib/audio/saved-state";
import {
  registerAudioPlayback,
  notifyAudioPlaybackStarted,
} from "@/lib/audio/single-audio";
import { saveContinueListening } from "@/lib/library/storage";
import { getOfflineSurahAudio } from "@/lib/offline/db";

const LEGACY_STORAGE_KEYS = {
  reciter: "ayah-listen-reciter",
  speed: "ayah-listen-speed",
  repeat: "ayah-listen-repeat",
  volume: "ayah-listen-volume",
  surah: "ayah-listen-surah",
} as const;

export interface GlobalAudioContextValue {
  // State
  surah: number;
  reciterId: number;
  isPlaying: boolean;
  hasEverPlayed: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string | null;
  speed: PlaybackSpeed;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  sleepTimerMinutes: number | null;
  currentChapter: Chapter | null;
  currentReciter: Reciter | null;
  chapters: Chapter[];
  availableReciters: Reciter[];
  audioUrl: string | null;

  // Actions
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  nextSurah: () => void;
  prevSurah: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  cycleSpeed: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeat: () => void;
  setSleepTimer: (minutes: number | null) => void;
  loadSurah: (surahNum: number, reciterId?: number, options?: { autoplay?: boolean }) => void;
  selectReciter: (newReciterId: number) => void;
  retry: () => void;
  stop: () => void;
}

const GlobalAudioContext = createContext<GlobalAudioContextValue | null>(null);

export function useGlobalAudio() {
  const ctx = useContext(GlobalAudioContext);
  if (!ctx) {
    throw new Error("useGlobalAudio must be used within a GlobalAudioProvider");
  }
  return ctx;
}

export function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Chapters & reciters catalog
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const recitersRef = useRef<Reciter[]>([]);
  recitersRef.current = reciters;

  // Core playback state
  const [surah, setSurah] = useState<number>(1);
  const [reciterId, setReciterId] = useState<number>(DEFAULT_LISTEN_RECITER_ID);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasEverPlayed, setHasEverPlayed] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1);
  const [volume, setVolumeState] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>("off");
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);

  const currentTimeRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0);
  const shouldAutoPlayRef = useRef<boolean>(false);
  const sleepTimerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Available reciters from MP3Quran catalog
  const availableReciters = useMemo(() => {
    return reciters;
  }, [reciters]);

  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.id === surah) || null;
  }, [chapters, surah]);

  const currentReciter = useMemo(() => {
    return availableReciters.find((r) => r.id === reciterId) || availableReciters[0] || null;
  }, [availableReciters, reciterId]);

  // Load catalogs on mount
  useEffect(() => {
    let active = true;

    fetch("/api/quran/chapters")
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d?.chapters)) {
          setChapters(d.chapters);
        }
      })
      .catch(() => {});

    fetch("/api/listen/reciters")
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d?.reciters)) {
          setReciters(d.reciters);
          recitersRef.current = d.reciters;
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Restore saved state paused on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // 1. Try unified storage key
      const raw = localStorage.getItem(GLOBAL_AUDIO_STORAGE_KEY);
      const parsed = parseSavedAudioState(raw);

      // Check legacy overrides if available
      const legacySurah = Number(localStorage.getItem(LEGACY_STORAGE_KEYS.surah));
      const legacyReciter = Number(localStorage.getItem(LEGACY_STORAGE_KEYS.reciter));
      const legacySpeed = Number(localStorage.getItem(LEGACY_STORAGE_KEYS.speed));
      const legacyRepeat = localStorage.getItem(LEGACY_STORAGE_KEYS.repeat) as RepeatMode;
      const legacyVol = Number(localStorage.getItem(LEGACY_STORAGE_KEYS.volume));

      const finalSurah =
        Number.isInteger(legacySurah) && legacySurah >= 1 && legacySurah <= 114
          ? legacySurah
          : parsed.surah;

      const mappedLegacyReciter =
        Number.isInteger(legacyReciter) && legacyReciter > 0 ? mapLegacyReciterId(legacyReciter) : null;
      const parsedReciter = mapLegacyReciterId(parsed.reciterId);

      const finalReciter =
        mappedLegacyReciter ?? (parsedReciter > 0 ? parsedReciter : DEFAULT_LISTEN_RECITER_ID);

      const finalSpeed =
        ALLOWED_SPEEDS.includes(legacySpeed as any) ? (legacySpeed as PlaybackSpeed) : parsed.speed;

      const finalRepeat =
        legacyRepeat === "surah" || legacyRepeat === "all" || legacyRepeat === "off"
          ? legacyRepeat
          : parsed.repeatMode;

      const finalVol =
        Number.isFinite(legacyVol) && legacyVol >= 0 && legacyVol <= 1
          ? legacyVol
          : parsed.volume;

      setSurah(finalSurah);
      setReciterId(finalReciter);
      setSpeedState(finalSpeed);
      setRepeatModeState(finalRepeat);
      setVolumeState(finalVol);

      if (parsed.currentTime > 0) {
        setCurrentTime(parsed.currentTime);
      }
    } catch {}
  }, []);

  // Fetch audio url whenever surah or reciter changes
  const fetchAudio = useCallback(async (surahNum: number, reciterNum: number) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check offline storage first
      try {
        const offline = await getOfflineSurahAudio(surahNum, reciterNum);
        if (offline?.fullAudioUrl) {
          setAudioUrl(offline.fullAudioUrl);
          setLoading(false);
          return;
        }
      } catch {}

      // 2. Direct MP3Quran CDN stream URL if reciter server is known
      const reciter = recitersRef.current.find((r) => r.id === reciterNum);
      if (reciter?.server) {
        const url = buildListenAudioUrl(reciter.server, surahNum);
        setAudioUrl(url);
        setLoading(false);
        return;
      }

      // 3. Fallback to /api/quran/audio if reciters catalog is still loading
      const res = await fetch(`/api/quran/audio?surah=${surahNum}&reciter=${reciterNum}`);
      if (res.ok) {
        const data = await res.json();
        const url = typeof data?.audioUrl === "string" ? data.audioUrl : null;
        if (url) {
          setAudioUrl(url);
          setLoading(false);
          return;
        }
      }
      throw new Error("Recitation audio could not be loaded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audio stream.");
      setAudioUrl(null);
      setIsPlaying(false);
      shouldAutoPlayRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudio(surah, reciterId);
  }, [surah, reciterId, reciters.length, fetchAudio]);

  // Audio Playback Actions
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      notifyAudioPlaybackStarted("global");
      await audio.play();
      setIsPlaying(true);
      setHasEverPlayed(true);
    } catch {
      // If play failed because audio is still buffering/loading, attach a one-time canplay listener
      if (audio.readyState < 2) {
        const onCanPlayOnce = async () => {
          audio.removeEventListener("canplay", onCanPlayOnce);
          try {
            notifyAudioPlaybackStarted("global");
            await audio.play();
            setIsPlaying(true);
            setHasEverPlayed(true);
          } catch {
            setIsPlaying(false);
          }
        };
        audio.addEventListener("canplay", onCanPlayOnce, { once: true });
      } else {
        setIsPlaying(false);
      }
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(seconds)) {
      audio.currentTime = seconds;
      currentTimeRef.current = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const setSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeedState(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    try {
      localStorage.setItem(LEGACY_STORAGE_KEYS.speed, String(newSpeed));
    } catch {}
  }, []);

  const cycleSpeed = useCallback(() => {
    const currentIndex = ALLOWED_SPEEDS.indexOf(speed);
    const nextIndex = (currentIndex + 1) % ALLOWED_SPEEDS.length;
    setSpeed(ALLOWED_SPEEDS[nextIndex]);
  }, [speed, setSpeed]);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = clamped === 0;
    }
    try {
      localStorage.setItem(LEGACY_STORAGE_KEYS.volume, String(clamped));
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted || volume === 0) {
      setIsMuted(false);
      const targetVol = volume > 0 ? volume : 1;
      if (volume === 0) {
        setVolumeState(targetVol);
        try {
          localStorage.setItem(LEGACY_STORAGE_KEYS.volume, String(targetVol));
        } catch {}
      }
      if (audioRef.current) {
        audioRef.current.muted = false;
        audioRef.current.volume = targetVol;
      }
    } else {
      setIsMuted(true);
      if (audioRef.current) {
        audioRef.current.muted = true;
      }
    }
  }, [isMuted, volume]);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setRepeatModeState(mode);
    try {
      localStorage.setItem(LEGACY_STORAGE_KEYS.repeat, mode);
    } catch {}
  }, []);

  const cycleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ["off", "surah", "all"];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIdx]);
  }, [repeatMode, setRepeatMode]);

  const nextSurah = useCallback(() => {
    const next = getNextSurah(surah, repeatMode);
    shouldAutoPlayRef.current = isPlaying;
    setSurah(next);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    try {
      localStorage.setItem(LEGACY_STORAGE_KEYS.surah, String(next));
    } catch {}
  }, [surah, repeatMode, isPlaying]);

  const prevSurah = useCallback(() => {
    const prev = getPrevSurah(surah, repeatMode);
    shouldAutoPlayRef.current = isPlaying;
    setSurah(prev);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    try {
      localStorage.setItem(LEGACY_STORAGE_KEYS.surah, String(prev));
    } catch {}
  }, [surah, repeatMode, isPlaying]);

  const loadSurah = useCallback(
    (surahNum: number, newReciterId?: number, options?: { autoplay?: boolean }) => {
      if (surahNum < 1 || surahNum > 114) return;
      if (options?.autoplay) {
        shouldAutoPlayRef.current = true;
      }
      setSurah(surahNum);
      if (newReciterId && newReciterId > 0) {
        const mapped = mapLegacyReciterId(newReciterId);
        setReciterId(mapped);
        try {
          localStorage.setItem(LEGACY_STORAGE_KEYS.reciter, String(mapped));
        } catch {}
      }
      currentTimeRef.current = 0;
      setCurrentTime(0);
      try {
        localStorage.setItem(LEGACY_STORAGE_KEYS.surah, String(surahNum));
      } catch {}
    },
    []
  );

  const selectReciter = useCallback((newReciterId: number) => {
    if (!newReciterId || newReciterId <= 0) return;
    const mapped = mapLegacyReciterId(newReciterId);
    shouldAutoPlayRef.current = isPlaying;
    setReciterId(mapped);
    try {
      localStorage.setItem(LEGACY_STORAGE_KEYS.reciter, String(mapped));
    } catch {}
  }, [isPlaying]);

  const stop = useCallback(() => {
    pause();
    setHasEverPlayed(false);
    currentTimeRef.current = 0;
    setCurrentTime(0);
  }, [pause]);

  const retry = useCallback(() => {
    fetchAudio(surah, reciterId);
  }, [surah, reciterId, fetchAudio]);

  const setSleepTimer = useCallback(
    (minutes: number | null) => {
      if (sleepTimerIdRef.current) {
        clearTimeout(sleepTimerIdRef.current);
        sleepTimerIdRef.current = null;
      }

      setSleepTimerMinutes(minutes);

      if (minutes && minutes > 0) {
        sleepTimerIdRef.current = setTimeout(() => {
          pause();
          setSleepTimerMinutes(null);
        }, minutes * 60 * 1000);
      }
    },
    [pause]
  );

  // Single-Audio Rule: Pause if another player begins playing
  useEffect(() => {
    return registerAudioPlayback("global", () => {
      pause();
    });
  }, [pause]);

  // Handle Autoplay when new audioUrl loads
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.playbackRate = speed;
    audio.volume = isMuted ? 0 : volume;

    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false;
      play();
    }
  }, [audioUrl, speed, volume, isMuted, play]);

  // Audio Event Handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const nowTime = audioRef.current.currentTime;
      currentTimeRef.current = nowTime;
      const now = performance.now();
      // Throttle React state update to at most once per 250ms (4 fps) to prevent mobile re-render storms
      if (now - lastTimeUpdateRef.current >= 250) {
        lastTimeUpdateRef.current = now;
        setCurrentTime(nowTime);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      audioRef.current.playbackRate = speed;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  };

  const handleCanPlay = () => {
    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false;
      play();
    }
  };

  const handleEnded = () => {
    const transition = computeTrackEndTransition(surah, repeatMode);
    if (transition.action === "replay") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        currentTimeRef.current = 0;
        setCurrentTime(0);
        play();
      }
    } else if (transition.action === "advance") {
      shouldAutoPlayRef.current = true;
      setSurah(transition.nextSurah);
      currentTimeRef.current = 0;
      setCurrentTime(0);
      try {
        localStorage.setItem(LEGACY_STORAGE_KEYS.surah, String(transition.nextSurah));
      } catch {}
    } else {
      setIsPlaying(false);
      currentTimeRef.current = 0;
      setCurrentTime(0);
    }
  };

  // Throttled position saving to localStorage (every 5 seconds)
  useEffect(() => {
    if (!hasEverPlayed) return;

    const interval = setInterval(() => {
      try {
        const timeToSave = currentTimeRef.current;
        const json = serializeAudioState({
          surah,
          reciterId,
          currentTime: timeToSave,
          speed,
          repeatMode,
          volume,
        });
        localStorage.setItem(GLOBAL_AUDIO_STORAGE_KEY, json);

        // Save continue listening card in library
        const chap = chapters.find((c) => c.id === surah);
        saveContinueListening({
          surah,
          surahName: chap?.nameSimple || `Surah ${surah}`,
          reciterId,
          time: timeToSave,
        });
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [surah, reciterId, speed, repeatMode, volume, hasEverPlayed, chapters]);

  // Save on pagehide / beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const json = serializeAudioState({
          surah,
          reciterId,
          currentTime: currentTimeRef.current,
          speed,
          repeatMode,
          volume,
        });
        localStorage.setItem(GLOBAL_AUDIO_STORAGE_KEY, json);
      } catch {}
    };

    window.addEventListener("pagehide", handleBeforeUnload);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [surah, reciterId, speed, repeatMode, volume]);

  // Media Session API Integration
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const chap = currentChapter;
    const rec = currentReciter;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: chap ? `${chap.id}. ${chap.nameSimple} (${chap.nameArabic})` : "Quran Recitation",
      artist: rec ? rec.name : "Aayah Studio Reciter",
      album: "Aayah Studio",
      artwork: [
        {
          src: "/brand/ayah-badge-dark.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    navigator.mediaSession.setActionHandler("play", () => play());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => prevSurah());
    navigator.mediaSession.setActionHandler("nexttrack", () => nextSurah());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const offset = details.seekOffset || 10;
      seek(Math.max(0, currentTime - offset));
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      const offset = details.seekOffset || 10;
      seek(Math.min(duration || Infinity, currentTime + offset));
    });

    if ("setPositionState" in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: speed,
          position: Math.min(duration, Math.max(0, currentTime)),
        });
      } catch {}
    }
  }, [currentChapter, currentReciter, isPlaying, currentTime, duration, speed, play, pause, prevSurah, nextSurah, seek]);

  const value = useMemo(
    () => ({
      surah,
      reciterId,
      isPlaying,
      hasEverPlayed,
      currentTime,
      duration,
      loading,
      error,
      speed,
      volume,
      isMuted,
      repeatMode,
      sleepTimerMinutes,
      currentChapter,
      currentReciter,
      chapters,
      availableReciters,
      audioUrl,
      play,
      pause,
      togglePlay,
      seek,
      nextSurah,
      prevSurah,
      setSpeed,
      cycleSpeed,
      setVolume,
      toggleMute,
      setRepeatMode,
      cycleRepeat,
      setSleepTimer,
      loadSurah,
      selectReciter,
      retry,
      stop,
    }),
    [
      surah,
      reciterId,
      isPlaying,
      hasEverPlayed,
      currentTime,
      duration,
      loading,
      error,
      speed,
      volume,
      isMuted,
      repeatMode,
      sleepTimerMinutes,
      currentChapter,
      currentReciter,
      chapters,
      availableReciters,
      audioUrl,
      play,
      pause,
      togglePlay,
      seek,
      nextSurah,
      prevSurah,
      setSpeed,
      cycleSpeed,
      setVolume,
      toggleMute,
      setRepeatMode,
      cycleRepeat,
      setSleepTimer,
      loadSurah,
      selectReciter,
      retry,
      stop,
    ]
  );

  return (
    <GlobalAudioContext.Provider value={value}>
      {children}
      {/* Single persistent audio element in root */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="metadata"
        playsInline
        data-duration={duration}
        data-current-time={currentTime}
        data-paused={!isPlaying}
        data-error={error || ""}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          if (audioUrl) {
            setError("Audio playback error occurred.");
            setIsPlaying(false);
          }
        }}
      />
    </GlobalAudioContext.Provider>
  );
}
