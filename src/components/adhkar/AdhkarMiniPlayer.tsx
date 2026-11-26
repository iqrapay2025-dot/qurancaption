"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  X,
  Settings2,
  Loader2,
  Mic,
  RotateCcw,
  SkipBack,
  SkipForward,
  Gauge,
  Repeat,
} from "lucide-react";
import { useAdhkarAudio } from "@/lib/adhkar/audio-context";
import { AudioSettingsModal } from "./AudioSettingsModal";

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function AdhkarMiniPlayer() {
  const {
    activeItem,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    progress,
    settings,
    currentRepeat,
    repeatPhase,
    userTurnCountdown,
    reciterName,
    pause,
    resume,
    stop,
    previousDhikr,
    nextDhikr,
    skipSeconds,
    cycleSpeed,
    cycleRepeat,
    toggleAutoAdvance,
  } = useAdhkarAudio();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // If no item is active, do not render
  if (!activeItem) return null;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    const targetTime = (percent / 100) * (duration || 0);
    skipSeconds(targetTime - currentTime);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40 animate-in fade-in duration-200">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-xl border border-primary/20 text-xs font-bold hover:opacity-95 transition-all"
        >
          {isPlaying ? (
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-current rounded-full h-1.5 animate-bounce" />
              <span className="w-0.5 bg-current rounded-full h-3 animate-bounce [animation-delay:0.2s]" />
              <span className="w-0.5 bg-current rounded-full h-2 animate-bounce [animation-delay:0.4s]" />
            </div>
          ) : (
            <Play size={14} className="fill-current" />
          )}
          <span className="truncate max-w-[140px]">{activeItem.title}</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        role="region"
        aria-label="Adhkar media player"
        className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-[440px] z-50 animate-in slide-in-from-bottom-5 duration-200 select-none"
      >
        <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md p-3 sm:p-3.5 shadow-2xl space-y-2">
          {/* Progress / Scrub bar */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
            <span className="w-8 text-right shrink-0">{formatSeconds(currentTime)}</span>
            <div className="relative flex-1 flex items-center h-2">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                aria-label="Audio scrubber"
                className="w-full h-1 bg-muted rounded-full accent-primary appearance-none cursor-pointer focus:outline-none"
              />
            </div>
            <span className="w-8 shrink-0">{formatSeconds(duration)}</span>
          </div>

          {/* Media Info & Primary Controls */}
          <div className="flex items-center justify-between gap-2.5">
            {/* Title & Info */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">
                  #{activeItem.order}
                </span>
                <span className="truncate text-xs font-bold text-foreground">
                  {activeItem.title}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="truncate max-w-[100px] sm:max-w-[140px]">{reciterName}</span>
                {settings.repeat > 1 && (
                  <>
                    <span>·</span>
                    <span className="text-primary font-semibold shrink-0">
                      Cycle {currentRepeat}/{settings.repeat}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Playback Transport Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Previous Dhikr */}
              <button
                type="button"
                onClick={previousDhikr}
                aria-label="Previous dhikr"
                title="Previous dhikr"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <SkipBack size={14} />
              </button>

              {/* Rewind 5s */}
              <button
                type="button"
                onClick={() => skipSeconds(-5)}
                aria-label="Rewind 5 seconds"
                title="Rewind 5s"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative"
              >
                <RotateCcw size={13} />
                <span className="sr-only">Rewind 5s</span>
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={isPlaying ? pause : resume}
                disabled={isLoading}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
                className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground hover:opacity-95 transition-all shrink-0 shadow-xs"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={16} className="fill-current" />
                ) : (
                  <Play size={16} className="ml-0.5 fill-current" />
                )}
              </button>

              {/* Forward 5s */}
              <button
                type="button"
                onClick={() => skipSeconds(5)}
                aria-label="Forward 5 seconds"
                title="Forward 5s"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <span className="text-[10px] font-bold text-muted-foreground hover:text-foreground">+5s</span>
              </button>

              {/* Next Dhikr */}
              <button
                type="button"
                onClick={nextDhikr}
                aria-label="Next dhikr"
                title="Next dhikr"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <SkipForward size={14} />
              </button>
            </div>
          </div>

          {/* Secondary Quick Controls Bar: Speed, Repeat, Auto-advance, Settings, Close */}
          <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-xs gap-1">
            <div className="flex items-center gap-1.5">
              {/* Speed Button (Go faster/slower) */}
              <button
                type="button"
                onClick={cycleSpeed}
                title={`Playback speed: ${settings.speed}x (Tap to cycle)`}
                aria-label={`Playback speed ${settings.speed}x`}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-[11px] font-bold text-foreground transition-colors"
              >
                <Gauge size={11} className="text-primary" />
                <span>{settings.speed}x</span>
              </button>

              {/* Repeat Button */}
              <button
                type="button"
                onClick={cycleRepeat}
                title={`Audio repeat: ${settings.repeat}x (Tap to cycle 1x, 3x, 5x)`}
                aria-label={`Repeat ${settings.repeat} times`}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  settings.repeat > 1
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "bg-muted/60 hover:bg-muted text-foreground"
                }`}
              >
                <RotateCcw size={10} />
                <span>{settings.repeat}x</span>
              </button>

              {/* Auto-advance toggle */}
              <button
                type="button"
                onClick={toggleAutoAdvance}
                title={
                  settings.autoAdvance !== false
                    ? "Continuous play enabled: plays next dhikr automatically"
                    : "Continuous play disabled"
                }
                aria-label="Toggle continuous play"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  settings.autoAdvance !== false
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground"
                }`}
              >
                <Repeat size={11} />
                <span className="hidden sm:inline">Auto-next</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Settings modal gear */}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Full audio settings"
                title="Full audio settings"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Settings2 size={13} />
              </button>

              {/* Close / Stop */}
              <button
                type="button"
                onClick={stop}
                aria-label="Close media player"
                title="Close player"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Repeat user-turn prompt inside mini player */}
          {repeatPhase === "user-turn" && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] text-emerald-950 dark:text-emerald-200">
              <span className="flex items-center gap-1.5 font-medium">
                <Mic size={12} className="text-emerald-500 animate-pulse" />
                <span>Your turn to recite</span>
              </span>
              <span className="font-bold">{userTurnCountdown}s</span>
            </div>
          )}
        </div>
      </div>

      <AudioSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
