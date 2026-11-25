"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Sparkles,
} from "lucide-react";
import { PlannerUnit } from "@/lib/planner/types";
import { saveOfflineMushafPage, hasOfflineMushafPage, getOfflineMushafPage } from "@/lib/offline/db";

interface PracticeModalProps {
  unit: PlannerUnit | null;
  isOpen: boolean;
  onClose: () => void;
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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch page data for Arabic text and audio
  useEffect(() => {
    if (!unit || !isOpen) return;

    let active = true;
    setLoadingText(true);
    setCurrentRepeat(1);
    setIsPlaying(false);
    setRevealedLines(new Set());

    // Check offline DB first, otherwise fetch from /api/quran/mushaf
    getOfflineMushafPage(unit.startPage).then((offlineData) => {
      if (!active) return;
      if (offlineData) {
        setPageData(offlineData);
        setLoadingText(false);
        setIsOfflineSaved(true);
      } else {
        fetch(`/api/quran/mushaf?page=${unit.startPage}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!active) return;
            setPageData(data);
            setLoadingText(false);
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
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [unit, isOpen]);

  if (!isOpen || !unit) return null;

  // Extract lines for this unit
  const targetLines: any[] = [];
  if (pageData && Array.isArray(pageData.lines)) {
    for (let l = unit.startLine; l <= unit.endLine; l++) {
      const lineObj = pageData.lines.find((item: any) => item.line_number === l);
      if (lineObj) targetLines.push(lineObj);
    }
  }

  // Audio URL for the first ayah on this page or word audio
  const candidateAudio =
    targetLines.find((l) => l.words?.some((w: any) => w.audio_url))?.words?.find((w: any) => w.audio_url)?.audio_url;

  const handleTogglePlay = () => {
    if (!audioRef.current) {
      if (!candidateAudio) return;
      const fullUrl = candidateAudio.startsWith("http")
        ? candidateAudio
        : `https://audio.qurancdn.com/${candidateAudio}`;
      audioRef.current = new Audio(fullUrl);
      audioRef.current.playbackRate = playbackSpeed;

      audioRef.current.onended = () => {
        if (currentRepeat < repeatTarget) {
          setTimeout(() => {
            setCurrentRepeat((prev) => prev + 1);
            audioRef.current?.play().catch(() => setIsPlaying(false));
          }, pauseSeconds * 1000);
        } else {
          setIsPlaying(false);
          setCurrentRepeat(1);
        }
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
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
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Repeat {currentRepeat} of {repeatTarget}
              </span>
            </div>

            {/* Repeat count selection */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium w-16">Repeats:</span>
              <div className="flex items-center gap-1.5">
                {[3, 5, 10, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setRepeatTarget(count)}
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
                  onChange={(e) => setPauseSeconds(Number(e.target.value))}
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
                    if (audioRef.current) audioRef.current.playbackRate = spd;
                  }}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-foreground font-medium"
                >
                  <option value={0.75}>0.75× (Slow)</option>
                  <option value={1.0}>1.0× (Normal)</option>
                  <option value={1.25}>1.25× (Fast)</option>
                </select>
              </div>
            </div>

            {/* Play Button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isPlaying
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause size={15} /> Pause Repetitions
                </>
              ) : (
                <>
                  <Play size={15} /> Play {repeatTarget}× Repetitions
                </>
              )}
            </button>
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
                  return (
                    <div
                      key={line.line_number}
                      onClick={() => hideArabic && toggleLineReveal(line.line_number)}
                      className={`transition-all rounded-lg p-2 text-right cursor-pointer ${
                        !isRevealed
                          ? "bg-muted/40 filter blur-xs select-none hover:bg-muted/60"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <span className="text-[10px] text-muted-foreground font-mono ml-2 float-left">
                        L{line.line_number}
                      </span>
                      <p
                        dir="rtl"
                        className="font-uthmani text-xl sm:text-2xl text-foreground leading-loose inline-block"
                      >
                        {line.words
                          ? line.words.map((w: any) => w.text_uthmani || w.text_qpc_hafs || "").join(" ")
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
