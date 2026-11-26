"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { AdhkarItem } from "./types";
import {
  loadAdhkarAudioSettings,
  saveAdhkarAudioSettings,
  type AdhkarAudioSettings,
} from "./storage";
import {
  resolveAudioUrl,
  preloadAudioIfUnmetered,
} from "./audio-downloader";
import {
  registerAudioPlayback,
  notifyAudioPlaybackStarted,
} from "@/lib/audio/single-audio";

export interface AdhkarAudioState {
  activeItem: AdhkarItem | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  progress: number; // 0 - 100
  settings: AdhkarAudioSettings;
  currentRepeat: number; // 1 .. settings.repeat
  repeatPhase: "playing" | "user-turn" | "idle";
  userTurnCountdown: number; // seconds left for user to repeat
  showListenRepeatTip: boolean;
  reciterName: string;
  isQuranAudio: boolean;
}

export interface AdhkarAudioContextType extends AdhkarAudioState {
  play: (item: AdhkarItem, allItems?: AdhkarItem[]) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  togglePlay: (item: AdhkarItem, allItems?: AdhkarItem[]) => Promise<void>;
  retry: () => Promise<void>;
  updateSettings: (partial: Partial<AdhkarAudioSettings>) => void;
  dismissListenRepeatTip: () => void;
  reportAudioItem: AdhkarItem | null;
  setReportAudioItem: (item: AdhkarItem | null) => void;
  isCardVisible: boolean;
  setCardVisible: (visible: boolean) => void;
  playAll: (items: AdhkarItem[]) => Promise<void>;
  nextDhikr: () => void;
  previousDhikr: () => void;
  skipSeconds: (delta: number) => void;
  cycleSpeed: () => void;
  cycleRepeat: () => void;
  toggleAutoAdvance: () => void;
}

const AdhkarAudioContext = createContext<AdhkarAudioContextType | null>(null);

export function useAdhkarAudio() {
  const ctx = useContext(AdhkarAudioContext);
  if (!ctx) {
    throw new Error("useAdhkarAudio must be used within an AdhkarAudioProvider");
  }
  return ctx;
}

interface AdhkarAudioProviderProps {
  children: ReactNode;
  onItemCounted?: (id: string) => void;
}

export function AdhkarAudioProvider({ children, onItemCounted }: AdhkarAudioProviderProps) {
  const [activeItem, setActiveItem] = useState<AdhkarItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [settings, setSettings] = useState<AdhkarAudioSettings>(() => loadAdhkarAudioSettings());
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [repeatPhase, setRepeatPhase] = useState<"playing" | "user-turn" | "idle">("idle");
  const [userTurnCountdown, setUserTurnCountdown] = useState(0);
  const [showListenRepeatTip, setShowListenRepeatTip] = useState(false);
  const [reciterName, setReciterName] = useState("Muhammad Jumah (OpenDua)");
  const [isQuranAudio, setIsQuranAudio] = useState(false);
  const [reportAudioItem, setReportAudioItem] = useState<AdhkarItem | null>(null);
  const [isCardVisible, setCardVisible] = useState(true);

  // References for playback and intervals
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeItemRef = useRef<AdhkarItem | null>(null);
  const settingsRef = useRef<AdhkarAudioSettings>(settings);
  const currentRepeatRef = useRef(1);
  const userTurnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const allCategoryItemsRef = useRef<AdhkarItem[]>([]);
  const onItemCountedRef = useRef(onItemCounted);
  const playRef = useRef<((item: AdhkarItem, allItems?: AdhkarItem[]) => Promise<void>) | null>(null);

  // Quran playlist state if dhikr uses Quran verses
  const quranPlaylistRef = useRef<string[]>([]);
  const quranPlaylistIndexRef = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    activeItemRef.current = activeItem;
  }, [activeItem]);

  useEffect(() => {
    currentRepeatRef.current = currentRepeat;
  }, [currentRepeat]);

  useEffect(() => {
    onItemCountedRef.current = onItemCounted;
  }, [onItemCounted]);

  // Clean up user turn interval
  const clearUserTurnInterval = () => {
    if (userTurnTimerRef.current) {
      clearInterval(userTurnTimerRef.current);
      userTurnTimerRef.current = null;
    }
  };

  // Register with single-audio coordination so opening player elsewhere pauses this
  useEffect(() => {
    const unregister = registerAudioPlayback("adhkar", () => {
      pauseAudioInternal();
    });
    return () => {
      unregister();
      clearUserTurnInterval();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const pauseAudioInternal = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    clearUserTurnInterval();
    setIsPlaying(false);
    setIsLoading(false);
    setRepeatPhase("idle");
  };

  // Fetch Quran Ayah audio URLs for Quranic dhikr items
  const resolveQuranAudioUrls = async (
    item: AdhkarItem
  ): Promise<{ urls: string[]; reciterTitle: string }> => {
    if (!item.quranAudio || !item.quranAudio.verses.length) {
      return { urls: [], reciterTitle: "Selected Reciter" };
    }

    let reciterId = 7; // Mishari Rashid al-`Afasy by default
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("qcs-quran-reciter");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) reciterId = parsed;
      }
    }

    // Extract Surah from first verse (e.g. "2:255" -> 2)
    const firstVerse = item.quranAudio.verses[0];
    const surah = parseInt(firstVerse.split(":")[0], 10) || 1;

    try {
      const res = await fetch(`/api/quran/audio?surah=${surah}&reciter=${reciterId}`);
      if (!res.ok) throw new Error("Could not load Quran recitation");
      const data = await res.json();
      const files = data?.files || [];
      const reciterTitle = data?.reciterName || "Quran Reciter";

      const matchedUrls: string[] = [];
      for (const vKey of item.quranAudio.verses) {
        const file = files.find((f: any) => f.verseKey === vKey);
        if (file?.audioUrl) {
          matchedUrls.push(file.audioUrl);
        }
      }

      if (matchedUrls.length === 0) {
        throw new Error("No verse audio found for this reciter");
      }

      return { urls: matchedUrls, reciterTitle };
    } catch (e: any) {
      throw new Error(e?.message || "Failed to load Quran ayah audio");
    }
  };

  // Preload next playable item on unmetered connection
  const preloadNextPlayable = (current: AdhkarItem, allItems: AdhkarItem[]) => {
    const currentIndex = allItems.findIndex((it) => it.id === current.id);
    if (currentIndex >= 0 && currentIndex < allItems.length - 1) {
      for (let i = currentIndex + 1; i < allItems.length; i++) {
        const next = allItems[i];
        if (next.audioUrl) {
          preloadAudioIfUnmetered(next.audioUrl);
          break;
        }
      }
    }
  };

  // Advance to next playable item in the current category list
  const advanceToNextPlayableItem = () => {
    const all = allCategoryItemsRef.current;
    const cur = activeItemRef.current;
    if (!all.length || !cur) return;
    const idx = all.findIndex((x) => x.id === cur.id);
    if (idx < 0) return;
    for (let i = idx + 1; i < all.length; i++) {
      const candidate = all[i];
      if (candidate.audioUrl || (candidate.quranAudio && candidate.quranAudio.verses?.length)) {
        playRef.current?.(candidate, all);
        return;
      }
    }
  };

  // Handle cycle end (repetition / listen & repeat / auto-count / auto-advance)
  const handlePlaybackFinished = () => {
    const curSettings = settingsRef.current;
    const curRepeat = currentRepeatRef.current;
    const targetRepeat = curSettings.repeat;
    const item = activeItemRef.current;

    // Auto-count if enabled
    if (curSettings.autoCount && item && onItemCountedRef.current) {
      onItemCountedRef.current(item.id);
    }

    if (curSettings.listenAndRepeat) {
      // Enter user-turn phase
      setRepeatPhase("user-turn");
      // Give the user the recorded duration (min 2 seconds, max 45 seconds)
      const pauseDurationSec = Math.max(
        2,
        Math.min(45, Math.round(duration || (item?.audioDuration ? item.audioDuration : 5)))
      );
      setUserTurnCountdown(pauseDurationSec);

      let remainingSec = pauseDurationSec;
      clearUserTurnInterval();

      userTurnTimerRef.current = setInterval(() => {
        remainingSec -= 1;
        setUserTurnCountdown(remainingSec);
        if (remainingSec <= 0) {
          clearUserTurnInterval();
          // Check if repeats remain
          if (curRepeat < targetRepeat) {
            const nextRepeat = curRepeat + 1;
            setCurrentRepeat(nextRepeat);
            currentRepeatRef.current = nextRepeat;
            setRepeatPhase("playing");
            playCurrentMedia(false);
          } else {
            // Done all repeats
            setRepeatPhase("idle");
            setIsPlaying(false);
            setCurrentRepeat(1);
            currentRepeatRef.current = 1;

            if (curSettings.autoAdvance) {
              advanceToNextPlayableItem();
            }
          }
        }
      }, 1000);
    } else {
      // Normal repetition
      if (curRepeat < targetRepeat) {
        const nextRepeat = curRepeat + 1;
        setCurrentRepeat(nextRepeat);
        currentRepeatRef.current = nextRepeat;
        playCurrentMedia(false);
      } else {
        // Done all repeats
        setRepeatPhase("idle");
        setIsPlaying(false);
        setCurrentRepeat(1);
        currentRepeatRef.current = 1;

        if (curSettings.autoAdvance) {
          advanceToNextPlayableItem();
        }
      }
    }
  };

  // Plays the audio currently configured in audioRef
  const playCurrentMedia = async (isFirstStart: boolean) => {
    if (!audioRef.current) return;
    try {
      setIsLoading(true);
      setError(null);
      audioRef.current.playbackRate = settingsRef.current.speed;
      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoading(false);
      setRepeatPhase("playing");
      notifyAudioPlaybackStarted("adhkar");

      if (isFirstStart) {
        // Track first play for feedback prompt if not already tracked
        if (!settingsRef.current.firstPlayedAt) {
          const updated = saveAdhkarAudioSettings({ firstPlayedAt: Date.now() });
          setSettings(updated);
        }
      }
    } catch (err: any) {
      setIsPlaying(false);
      setIsLoading(false);
      if (err.name !== "AbortError") {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setError("Offline and audio not saved. Download for offline first.");
        } else {
          setError("Couldn't load audio. Check your connection.");
        }
      }
    }
  };

  // Start playback for a given item
  const play = useCallback(
    async (item: AdhkarItem, allItems?: AdhkarItem[]) => {
      // Stop previous
      pauseAudioInternal();
      clearUserTurnInterval();

      if (allItems && allItems.length > 0) {
        allCategoryItemsRef.current = allItems;
      }

      setActiveItem(item);
      setCurrentRepeat(1);
      currentRepeatRef.current = 1;
      setIsLoading(true);
      setError(null);
      setCurrentTime(0);
      setDuration(item.audioDuration || 0);

      try {
        let directUrl = "";
        let isQuran = false;

        if (item.audioUrl) {
          // OpenDua MP3
          directUrl = await resolveAudioUrl(item.audioUrl);
          setReciterName("Muhammad Jumah (OpenDua)");
          setIsQuranAudio(false);
        } else if (item.quranAudio && item.quranAudio.verses.length > 0) {
          // Quran Ayah Audio Fallback
          isQuran = true;
          setIsQuranAudio(true);
          const { urls, reciterTitle } = await resolveQuranAudioUrls(item);
          quranPlaylistRef.current = urls;
          quranPlaylistIndexRef.current = 0;
          directUrl = urls[0];
          setReciterName(`${reciterTitle} (Quran audio)`);
        } else {
          setIsLoading(false);
          setError("Audio coming soon");
          return;
        }

        const audio = new Audio();
        audio.preload = "auto";
        audio.playbackRate = settingsRef.current.speed;

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
          if (audio.duration && !isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
        };

        audio.onloadedmetadata = () => {
          if (audio.duration && !isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
          setIsLoading(false);
        };

        audio.onerror = () => {
          setIsLoading(false);
          setIsPlaying(false);
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            setError("Offline and audio not saved. Download for offline first.");
          } else {
            setError("Couldn't load audio. Check your connection.");
          }
        };

        audio.onended = () => {
          if (isQuran && quranPlaylistRef.current.length > 1) {
            // Check next verse in multi-verse Quran dhikr (e.g. 3 Quls or last 2 ayahs)
            const nextIdx = quranPlaylistIndexRef.current + 1;
            if (nextIdx < quranPlaylistRef.current.length) {
              quranPlaylistIndexRef.current = nextIdx;
              audio.src = quranPlaylistRef.current[nextIdx];
              audio.play().catch(() => {});
              return;
            }
            // End of Quran playlist
            quranPlaylistIndexRef.current = 0;
          }

          handlePlaybackFinished();
        };

        audio.src = directUrl;
        audioRef.current = audio;

        // Start playback
        await playCurrentMedia(true);

        // Preload next playable item if Wi-Fi
        if (allCategoryItemsRef.current.length > 0) {
          preloadNextPlayable(item, allCategoryItemsRef.current);
        }
      } catch (err: any) {
        setIsLoading(false);
        setIsPlaying(false);
        setError(err.message || "Couldn't load audio. Check your connection.");
      }
    },
    []
  );

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const pause = useCallback(() => {
    pauseAudioInternal();
  }, []);

  const resume = useCallback(async () => {
    if (!audioRef.current && activeItem) {
      await play(activeItem, allCategoryItemsRef.current);
      return;
    }
    if (audioRef.current) {
      await playCurrentMedia(false);
    }
  }, [activeItem, play]);

  const stop = useCallback(() => {
    pauseAudioInternal();
    setActiveItem(null);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setCurrentRepeat(1);
  }, []);

  const togglePlay = useCallback(
    async (item: AdhkarItem, allItems?: AdhkarItem[]) => {
      if (activeItem?.id === item.id) {
        if (isPlaying) {
          pause();
        } else {
          await resume();
        }
      } else {
        await play(item, allItems);
      }
    },
    [activeItem, isPlaying, pause, resume, play]
  );

  const retry = useCallback(async () => {
    if (activeItem) {
      await play(activeItem, allCategoryItemsRef.current);
    }
  }, [activeItem, play]);

  const updateSettings = useCallback((partial: Partial<AdhkarAudioSettings>) => {
    const next = saveAdhkarAudioSettings(partial);
    setSettings(next);

    if (partial.listenAndRepeat && !next.hasSeenTip) {
      setShowListenRepeatTip(true);
    }

    if (audioRef.current && typeof partial.speed === "number") {
      audioRef.current.playbackRate = partial.speed;
    }
  }, []);

  const dismissListenRepeatTip = useCallback(() => {
    setShowListenRepeatTip(false);
    updateSettings({ hasSeenTip: true });
  }, [updateSettings]);

  const nextDhikr = useCallback(() => {
    advanceToNextPlayableItem();
  }, []);

  const previousDhikr = useCallback(() => {
    const all = allCategoryItemsRef.current;
    const cur = activeItemRef.current;
    if (!all.length || !cur) return;
    const idx = all.findIndex((x) => x.id === cur.id);
    if (idx <= 0) return;
    for (let i = idx - 1; i >= 0; i--) {
      const candidate = all[i];
      if (candidate.audioUrl || (candidate.quranAudio && candidate.quranAudio.verses?.length)) {
        playRef.current?.(candidate, all);
        return;
      }
    }
  }, []);

  const skipSeconds = useCallback((delta: number) => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const maxDur = audioRef.current.duration || 9999;
    const newTime = Math.max(0, Math.min(maxDur, cur + delta));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const cycleSpeed = useCallback(() => {
    const speeds: (0.75 | 1 | 1.25 | 1.5)[] = [0.75, 1, 1.25, 1.5];
    const cur = settingsRef.current.speed;
    const nextIdx = (speeds.indexOf(cur) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx >= 0 ? nextIdx : 1];
    updateSettings({ speed: nextSpeed });
  }, [updateSettings]);

  const cycleRepeat = useCallback(() => {
    const repeats: (1 | 3 | 5)[] = [1, 3, 5];
    const cur = settingsRef.current.repeat;
    const nextIdx = (repeats.indexOf(cur) + 1) % repeats.length;
    const nextRepeat = repeats[nextIdx >= 0 ? nextIdx : 0];
    updateSettings({ repeat: nextRepeat });
  }, [updateSettings]);

  const toggleAutoAdvance = useCallback(() => {
    const cur = settingsRef.current.autoAdvance !== false;
    updateSettings({ autoAdvance: !cur });
  }, [updateSettings]);

  const playAll = useCallback(
    async (items: AdhkarItem[]) => {
      if (!items || items.length === 0) return;
      allCategoryItemsRef.current = items;
      updateSettings({ autoAdvance: true });
      const firstPlayable = items.find(
        (it) => Boolean(it.audioUrl) || Boolean(it.quranAudio?.verses?.length)
      );
      if (firstPlayable) {
        await play(firstPlayable, items);
      }
    },
    [play, updateSettings]
  );

  const progress = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  return (
    <AdhkarAudioContext.Provider
      value={{
        activeItem,
        isPlaying,
        isLoading,
        error,
        currentTime,
        duration,
        progress,
        settings,
        currentRepeat,
        repeatPhase,
        userTurnCountdown,
        showListenRepeatTip,
        reciterName,
        isQuranAudio,
        play,
        pause,
        resume,
        stop,
        togglePlay,
        retry,
        updateSettings,
        dismissListenRepeatTip,
        reportAudioItem,
        setReportAudioItem,
        isCardVisible,
        setCardVisible,
        playAll,
        nextDhikr,
        previousDhikr,
        skipSeconds,
        cycleSpeed,
        cycleRepeat,
        toggleAutoAdvance,
      }}
    >
      {children}
    </AdhkarAudioContext.Provider>
  );
}
