"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Clock,
  Volume2,
  VolumeX,
  Search,
  BookOpen,
  X,
} from "lucide-react";
import {
  formatTime,
  parseListenQuery,
} from "@/lib/listen/player";
import { mapLegacyReciterId } from "@/lib/listen/mp3quran";
import { useGlobalAudio } from "@/components/audio/GlobalAudioProvider";
import BadgeLoader from "@/components/BadgeLoader";
import { TourReplayButton } from "@/components/tour/TourReplayButton";

export const STORAGE_KEYS = {
  reciter: "ayah-listen-reciter",
  speed: "ayah-listen-speed",
  repeat: "ayah-listen-repeat",
  volume: "ayah-listen-volume",
  surah: "ayah-listen-surah",
} as const;

export function ListenPlayer() {
  const {
    surah,
    reciterId,
    isPlaying,
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
    togglePlay,
    seek,
    nextSurah,
    prevSurah,
    cycleSpeed,
    setVolume,
    toggleMute,
    cycleRepeat,
    setSleepTimer,
    loadSurah,
    selectReciter,
    retry,
  } = useGlobalAudio();

  const [searchQuery, setSearchQuery] = useState("");
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize from URL query params once on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    if (typeof window === "undefined") return;
    isInitializedRef.current = true;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("surah") || searchParams.has("reciter")) {
      const validReciterIds = availableReciters.length > 0 ? new Set(availableReciters.map((r) => r.id)) : undefined;
      const parsed = parseListenQuery(searchParams, validReciterIds);
      const mappedReciter = mapLegacyReciterId(parsed.reciter);
      const shouldAuto = searchParams.get("autoplay") === "true";

      loadSurah(parsed.surah, mappedReciter, { autoplay: shouldAuto });

      const initialT = parseFloat(searchParams.get("t") || "0");
      if (!isNaN(initialT) && initialT > 0) {
        seek(initialT);
      }
    }
  }, [availableReciters, loadSurah, seek]);

  // Keyboard shortcuts (Space, ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === "Escape") {
        if (searchQuery) {
          e.preventDefault();
          setSearchQuery("");
        }
        setSleepMenuOpen(false);
        return;
      }

      if (isInput) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(0, currentTime - 10));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seek(Math.min(duration || Infinity, currentTime + 10));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, currentTime, duration, togglePlay, seek]);

  // Filter surahs
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase().trim();
    return chapters.filter((c) => {
      const matchesNum = String(c.id) === q;
      const matchesSimple = c.nameSimple.toLowerCase().includes(q);
      const matchesArabic = c.nameArabic.includes(q);
      const matchesMeaning = c.meaning.toLowerCase().includes(q);
      return matchesNum || matchesSimple || matchesArabic || matchesMeaning;
    });
  }, [chapters, searchQuery]);

  // Loading catalog state
  if (chapters.length === 0 && loading) {
    return (
      <div className="py-24">
        <BadgeLoader size="page" label="Loading Quran..." />
      </div>
    );
  }

  return (
    <div className="pb-36 sm:pb-32 w-full max-w-full overflow-hidden">
      {/* Header controls: Reciter picker & Search box */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full max-w-full">
        {/* Reciter picker */}
        <div data-tour="listen-reciter-select" className="flex flex-col gap-1 sm:max-w-xs w-full">
          <div className="flex items-center justify-between">
            <label htmlFor="reciter-select" className="text-xs font-medium text-muted-foreground">
              Reciter
            </label>
            <TourReplayButton tourId="listen" className="sm:hidden" />
          </div>
          <select
            id="reciter-select"
            value={reciterId}
            onChange={(e) => selectReciter(Number(e.target.value))}
            className="w-full rounded-sm border border-border bg-card px-3 py-2 text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
          >
            {availableReciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.style ? ` (${r.style})` : ""}
                {r.surahTotal && r.surahTotal < 114 ? ` [${r.surahTotal} Surahs]` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Search box & Tour replay button on desktop */}
        <div className="flex items-center gap-3 sm:max-w-md w-full">
          <div className="flex flex-col gap-1 w-full">
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
          <div className="hidden sm:flex flex-col justify-end pt-5 shrink-0">
            <TourReplayButton tourId="listen" />
          </div>
        </div>
      </div>

      {/* Surah Rows List */}
      <div data-tour="listen-surah-list" className="grid gap-2 w-full max-w-full overflow-hidden">
        {filteredChapters.map((chapter) => {
          const isCurrent = chapter.id === surah;
          const isRowActivePlaying = isCurrent && isPlaying;
          const isAvailable =
            !currentReciter?.surahList ||
            currentReciter.surahList.length === 0 ||
            currentReciter.surahList.includes(chapter.id);

          return (
            <div
              key={chapter.id}
              onClick={() => {
                if (!isAvailable) return;
                if (isCurrent) {
                  togglePlay();
                } else {
                  loadSurah(chapter.id, reciterId, { autoplay: true });
                }
              }}
              className={`group flex items-center justify-between gap-3 rounded-lg border p-3 sm:p-4 transition-all ${
                !isAvailable
                  ? "opacity-50 border-border/60 bg-card cursor-not-allowed"
                  : isCurrent
                  ? "border-primary/50 bg-primary/5 shadow-xs cursor-pointer"
                  : "border-border bg-card hover:border-border/80 hover:bg-muted/30 cursor-pointer"
              }`}
            >
              {/* Left: Play button & Surah names */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <button
                  type="button"
                  disabled={!isAvailable}
                  aria-label={
                    !isAvailable
                      ? `${chapter.nameSimple} not available for this reciter`
                      : isRowActivePlaying
                      ? `Pause ${chapter.nameSimple}`
                      : `Play ${chapter.nameSimple}`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAvailable) return;
                    if (isCurrent) {
                      togglePlay();
                    } else {
                      loadSurah(chapter.id, reciterId, { autoplay: true });
                    }
                  }}
                  className={`grid size-9 sm:size-10 shrink-0 place-items-center rounded-full transition-all ${
                    !isAvailable
                      ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                      : isRowActivePlaying
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                  }`}
                >
                  {isRowActivePlaying ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} className="ml-0.5" />
                  )}
                </button>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                      {chapter.id}. {chapter.nameSimple}
                    </span>
                    {isCurrent && isAvailable && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {isRowActivePlaying ? "Playing" : "Loaded"}
                      </span>
                    )}
                    {!isAvailable && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        Not in reciter catalogue
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                    <span className="truncate">{chapter.meaning}</span>
                    <span>·</span>
                    <span className="shrink-0">{chapter.versesCount} ayahs</span>
                  </div>
                </div>
              </div>

              {/* Right: Arabic name & Read context link */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <span
                  dir="rtl"
                  lang="ar"
                  className="font-quran text-lg sm:text-xl text-foreground/90 select-none hidden xs:inline"
                >
                  {chapter.nameArabic}
                </span>

                <Link
                  href={`/quran/${chapter.id}`}
                  onClick={(e) => e.stopPropagation()}
                  title={`Read Surah ${chapter.nameSimple}`}
                  aria-label={`Read Surah ${chapter.nameSimple}`}
                  className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <BookOpen size={13} />
                  <span className="hidden sm:inline">Read</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredChapters.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No surahs found matching &ldquo;{searchQuery}&rdquo;.
        </div>
      )}

      {/* Persistent Bottom Player Bar on /listen */}
      <div
        data-tour="listen-player-bar"
        role="region"
        aria-label="Audio player"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md shadow-2xl px-3 sm:px-4 py-2 sm:py-3 transition-transform pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 w-full">
          {/* Top row on mobile / Left column on desktop: Surah Info */}
          <div className="flex items-center justify-between md:justify-start gap-2 sm:gap-3 min-w-0 md:w-64 shrink-0">
            <div className="flex flex-col min-w-0 truncate">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                  {currentChapter ? `${currentChapter.id}. ${currentChapter.nameSimple}` : "Quran Recitation"}
                </span>
                {currentChapter?.nameArabic && (
                  <span className="text-xs font-quran text-foreground/80 hidden sm:inline shrink-0">
                    {currentChapter.nameArabic}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground truncate">
                {currentReciter?.name || "Reciter"}
              </span>
            </div>

            {loading && (
              <div className="shrink-0 flex items-center gap-1">
                <BadgeLoader size="inline" className="scale-75" />
              </div>
            )}
          </div>

          {/* Error notice in player bar */}
          {error ? (
            <div className="flex flex-1 items-center justify-center gap-3 py-1 text-xs text-red-600 dark:text-red-400 font-medium">
              <span>{error}</span>
              <button
                type="button"
                onClick={retry}
                className="rounded-sm border border-border bg-card px-2 py-0.5 text-xs text-foreground hover:bg-muted font-normal focus-visible:outline-2 focus-visible:outline-ring"
              >
                Retry
              </button>
            </div>
          ) : (
            /* Center Controls & Seek Bar */
            <div data-tour="listen-playback-controls" className="flex flex-1 flex-col items-center gap-1 min-w-0 w-full">
              {/* Control buttons: Prev, Play/Pause, Next */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label="Previous surah"
                  onClick={prevSurah}
                  className="grid size-9 place-items-center rounded-full text-foreground/80 hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring touch-manipulation"
                >
                  <SkipBack size={18} />
                </button>

                <button
                  type="button"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all shadow focus-visible:outline-2 focus-visible:outline-ring touch-manipulation"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>

                <button
                  type="button"
                  aria-label="Next surah"
                  onClick={nextSurah}
                  className="grid size-9 place-items-center rounded-full text-foreground/80 hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring touch-manipulation"
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
                  onChange={(e) => seek(Number(e.target.value))}
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
          <div data-tour="listen-extra-controls" className="flex items-center justify-center md:justify-end gap-1.5 sm:gap-2 w-full md:w-64 shrink-0">
            {/* Speed button */}
            <button
              type="button"
              onClick={cycleSpeed}
              title={`Playback speed: ${speed}x`}
              aria-label={`Playback speed: ${speed}x`}
              className="rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-mono font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring touch-manipulation"
            >
              {speed}x
            </button>

            {/* Repeat button */}
            <button
              type="button"
              onClick={cycleRepeat}
              title={`Repeat: ${repeatMode}`}
              aria-label={`Repeat mode: ${repeatMode}`}
              className={`grid size-8 place-items-center rounded-sm border transition-colors focus-visible:outline-2 focus-visible:outline-ring touch-manipulation ${
                repeatMode !== "off"
                  ? "border-primary/50 bg-primary/10 text-primary font-bold"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {repeatMode === "surah" ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </button>

            {/* Sleep timer button with menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSleepMenuOpen((prev) => !prev)}
                title={sleepTimerMinutes ? `Sleep timer: ${sleepTimerMinutes}m` : "Sleep timer"}
                aria-label={sleepTimerMinutes ? `Sleep timer: ${sleepTimerMinutes}m` : "Sleep timer"}
                className={`flex items-center gap-1 rounded-sm border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring touch-manipulation ${
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
                      onClick={() => {
                        setSleepTimer(min);
                        setSleepMenuOpen(false);
                      }}
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

            {/* Volume control */}
            <div className="flex items-center gap-1 pl-1.5 sm:pl-2 border-l border-border/60">
              <button
                type="button"
                aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                onClick={toggleMute}
                className="grid size-7 place-items-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring rounded-sm touch-manipulation"
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume slider"
                className="h-1.5 w-14 sm:w-16 cursor-pointer accent-primary rounded bg-muted focus-visible:outline-2 focus-visible:outline-ring touch-manipulation"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
