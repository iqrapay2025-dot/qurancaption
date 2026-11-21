"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useGlobalAudio } from "./GlobalAudioProvider";
import { formatTime } from "@/lib/listen/player";
import BadgeLoader from "@/components/BadgeLoader";

export function MiniPlayer() {
  const pathname = usePathname();
  const [closed, setClosed] = useState(false);

  const {
    surah,
    isPlaying,
    hasEverPlayed,
    currentTime,
    duration,
    loading,
    error,
    currentChapter,
    currentReciter,
    isMuted,
    togglePlay,
    nextSurah,
    prevSurah,
    seek,
    toggleMute,
    stop,
  } = useGlobalAudio();

  // Hide on /listen page to avoid duplicate controls
  if (pathname === "/listen" || pathname?.startsWith("/listen/")) {
    return null;
  }

  // Hide if never played, or closed, or no audio active
  if (closed || (!hasEverPlayed && currentTime === 0 && !isPlaying)) {
    return null;
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
    setClosed(true);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <aside
      role="region"
      aria-label="Persistent Quran audio player"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md shadow-2xl transition-transform animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]"
    >
      {/* Interactive Progress Bar */}
      <div className="relative w-full h-1.5 bg-muted/70 group cursor-pointer">
        <div
          className="h-full bg-primary transition-all duration-150"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek track"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="mx-auto max-w-6xl px-3 sm:px-5 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Track Info (Click navigates to /listen) */}
        <Link
          href={`/listen?surah=${surah}`}
          className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring rounded-md py-0.5"
          title="Open full audio player on /listen"
        >
          {loading ? (
            <div className="shrink-0 size-9 grid place-items-center rounded-lg bg-muted">
              <BadgeLoader size="inline" className="scale-60" />
            </div>
          ) : (
            <div className="shrink-0 size-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {surah}
            </div>
          )}

          <div className="flex flex-col min-w-0 truncate" aria-live="polite">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {currentChapter ? `${currentChapter.id}. ${currentChapter.nameSimple}` : `Surah ${surah}`}
              </span>
              {currentChapter?.nameArabic && (
                <span className="text-xs font-quran text-foreground/80 hidden sm:inline shrink-0">
                  {currentChapter.nameArabic}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
              <span className="truncate">{currentReciter?.name || "Reciter"}</span>
              <span>·</span>
              <span className="font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </Link>

        {/* Center/Right: Playback Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={prevSurah}
            aria-label="Previous surah"
            title="Previous surah"
            className="grid size-9 sm:size-10 place-items-center rounded-full text-foreground/80 hover:text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
          >
            <SkipBack size={17} />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            title={isPlaying ? "Pause" : "Play"}
            className="grid size-10 sm:size-11 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
          >
            {isPlaying ? <Pause size={19} /> : <Play size={19} className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={nextSurah}
            aria-label="Next surah"
            title="Next surah"
            className="grid size-9 sm:size-10 place-items-center rounded-full text-foreground/80 hover:text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
          >
            <SkipForward size={17} />
          </button>

          {/* Mute button (hidden on very narrow screens) */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            title={isMuted ? "Unmute" : "Mute"}
            className="hidden sm:grid size-9 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Close mini player */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Stop audio and close player"
            title="Close player"
            className="grid size-9 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1 touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
