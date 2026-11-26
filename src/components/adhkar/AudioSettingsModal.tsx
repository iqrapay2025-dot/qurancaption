"use client";

import React from "react";
import { X, Gauge, RotateCcw, Mic, CheckCircle2 } from "lucide-react";
import { useAdhkarAudio } from "@/lib/adhkar/audio-context";

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioSettingsModal({ isOpen, onClose }: AudioSettingsModalProps) {
  const { settings, updateSettings } = useAdhkarAudio();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h3 id="audio-settings-title" className="text-base font-bold text-foreground flex items-center gap-2">
            <Gauge size={18} className="text-primary" />
            <span>Audio Playback Settings</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audio settings"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Speed setting */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Playback Speed</span>
            <span className="text-primary font-bold">{settings.speed}x</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[0.75, 1, 1.25, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateSettings({ speed: s as 0.75 | 1 | 1.25 | 1.5 })}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border text-center ${
                  settings.speed === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Repeat setting */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <RotateCcw size={13} className="text-primary" />
              <span>Audio Repeat Count</span>
            </span>
            <span className="text-primary font-bold">{settings.repeat}x</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 5].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => updateSettings({ repeat: count as 1 | 3 | 5 })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  settings.repeat === count
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                {count} {count === 1 ? "time" : "times"}
              </button>
            ))}
          </div>
        </div>

        {/* Listen & Repeat Toggle */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
          <label className="flex items-start justify-between gap-3 cursor-pointer select-none">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Mic size={14} className="text-primary" />
                <span>Listen &amp; Repeat Mode</span>
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Plays the recording, then pauses with a countdown so you can recite it yourself, before repeating.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.listenAndRepeat}
              onChange={(e) => updateSettings({ listenAndRepeat: e.target.checked })}
              className="mt-1 size-4 accent-primary rounded cursor-pointer shrink-0"
            />
          </label>
        </div>

        {/* Auto-Advance Toggle */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
          <label className="flex items-start justify-between gap-3 cursor-pointer select-none">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-primary" />
                <span>Continuous Play (Auto-advance)</span>
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                When one dhikr finishes playing, automatically start reciting the next dhikr in sequence.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoAdvance !== false}
              onChange={(e) => updateSettings({ autoAdvance: e.target.checked })}
              className="mt-1 size-4 accent-primary rounded cursor-pointer shrink-0"
            />
          </label>
        </div>

        {/* Auto-Count Toggle */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
          <label className="flex items-start justify-between gap-3 cursor-pointer select-none">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-primary" />
                <span>Auto-count while playing</span>
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Automatically decrements 1 count each time the dhikr audio recording completes.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCount}
              onChange={(e) => updateSettings({ autoCount: e.target.checked })}
              className="mt-1 size-4 accent-primary rounded cursor-pointer shrink-0"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-95 transition-opacity"
        >
          Save &amp; Close
        </button>
      </div>
    </div>
  );
}
