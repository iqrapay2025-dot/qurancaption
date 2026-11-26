"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  RotateCcw,
  Share2,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Play,
  Pause,
  Loader2,
  Settings2,
  Mic,
  AlertCircle,
  Flag,
  Sparkles,
} from "lucide-react";
import type { AdhkarItem } from "@/lib/adhkar/types";
import type { AdhkarPreferences } from "@/lib/adhkar/storage";
import { decrementDhikr, resetDhikr } from "@/lib/adhkar/storage";
import { ShareDhikrModal } from "./ShareDhikrModal";
import { useAdhkarAudio } from "@/lib/adhkar/audio-context";
import { AudioSettingsModal } from "./AudioSettingsModal";

interface DhikrCardProps {
  item: AdhkarItem;
  remaining: number;
  onCountChange: (id: string, newRemaining: number) => void;
  prefs: AdhkarPreferences;
  allItems?: AdhkarItem[];
}

export function DhikrCard({
  item,
  remaining,
  onCountChange,
  prefs,
  allItems = [],
}: DhikrCardProps) {
  const [showVirtue, setShowVirtue] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const [tapPrompt, setTapPrompt] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const cardRef = useRef<HTMLElement | null>(null);

  const hasSlides = Boolean(item.slides && item.slides.length > 0);
  const currentSlide = hasSlides ? item.slides![slideIndex] : null;

  const displayArabic = currentSlide ? currentSlide.arabic : item.arabic;
  const displayTransliteration = currentSlide ? currentSlide.transliteration : item.transliteration;
  const displayTranslation = currentSlide ? currentSlide.translation_en : item.translation_en;

  const {
    activeItem,
    isPlaying,
    isLoading,
    error,
    currentRepeat,
    repeatPhase,
    userTurnCountdown,
    showListenRepeatTip,
    dismissListenRepeatTip,
    togglePlay,
    retry,
    settings,
    setReportAudioItem,
    setCardVisible,
  } = useAdhkarAudio();

  const isActive = activeItem?.id === item.id;
  const isCurrentlyPlaying = isActive && isPlaying;
  const isCurrentlyLoading = isActive && isLoading;
  const hasAudio = Boolean(item.audioUrl) || Boolean(item.quranAudio?.verses?.length);
  const isQuranAudioItem = !item.audioUrl && Boolean(item.quranAudio?.verses?.length);

  const isDone = remaining === 0;
  const progressPercent = Math.min(
    100,
    Math.round(((item.repeat - remaining) / item.repeat) * 100)
  );

  // Monitor intersection for mini player
  useEffect(() => {
    if (!isActive || !cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCardVisible(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isActive, setCardVisible]);

  // If audio finishes and auto-count is off, flash gentle "Tap to count" prompt
  useEffect(() => {
    if (isActive && !settings.autoCount && !isPlaying && remaining > 0 && repeatPhase === "idle") {
      setTapPrompt(true);
      const t = setTimeout(() => setTapPrompt(false), 4000);
      return () => clearTimeout(t);
    }
  }, [isActive, isPlaying, settings.autoCount, remaining, repeatPhase]);

  const fontClass =
    prefs.arabicFont === "Amiri Quran"
      ? "font-amiri"
      : prefs.arabicFont === "Amiri"
      ? "font-amiri"
      : prefs.arabicFont === "Scheherazade New"
      ? "font-scheherazade"
      : "font-uthmani";

  const handleTap = () => {
    setIsTapping(true);
    setTapPrompt(false);
    setTimeout(() => setIsTapping(false), 120);

    const result = decrementDhikr(item.id, item.repeat);
    if (item.subItemIds && item.subItemIds.length > 0) {
      for (const subId of item.subItemIds) {
        if (subId !== item.id) {
          decrementDhikr(subId, item.repeat);
        }
      }
    }
    onCountChange(item.id, result.remaining);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = resetDhikr(item.id, item.repeat);
    if (item.subItemIds && item.subItemIds.length > 0) {
      for (const subId of item.subItemIds) {
        if (subId !== item.id) {
          resetDhikr(subId, item.repeat);
        }
      }
    }
    onCountChange(item.id, res);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasSlides) return;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!hasSlides || touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    touchStartXRef.current = null;
    if (diff > 45) {
      // Swiped left -> next slide
      setSlideIndex((prev) => Math.min(item.slides!.length - 1, prev + 1));
    } else if (diff < -45) {
      // Swiped right -> prev slide
      setSlideIndex((prev) => Math.max(0, prev - 1));
    }
  };

  // Keyboard navigation: Spacebar toggles audio when card is focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " && (e.target as HTMLElement).tagName !== "BUTTON" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      if (hasAudio) {
        e.preventDefault();
        togglePlay(item, allItems);
      }
    }
  };

  return (
    <>
      <article
        ref={cardRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`${item.title}, ${item.repeat} times`}
        className={`group relative rounded-2xl border transition-all duration-200 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40 ${
          isCurrentlyPlaying
            ? "border-primary shadow-md ring-2 ring-primary/20 bg-card"
            : isDone
            ? "border-primary/40 bg-primary/[0.03] dark:bg-primary/[0.04]"
            : "border-border bg-card hover:border-border/80"
        }`}
      >
        {/* Top bar: Title, repeat badge, share button */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
              #{item.order}
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-foreground">
              {item.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Repeat count badge */}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                isDone
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isDone ? "Done ✓" : `${item.repeat}x`}
            </span>

            {/* Share button */}
            <button
              type="button"
              onClick={() => setShowShare(true)}
              aria-label={`Share ${item.title}`}
              title="Share this dhikr"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Share2 size={15} />
            </button>
          </div>
        </div>

        {/* Audio Player Bar on Card */}
        <div className="px-4 py-2.5 sm:px-6 bg-muted/15 border-b border-border/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {hasAudio ? (
              <button
                type="button"
                onClick={() => togglePlay(item, allItems)}
                disabled={isCurrentlyLoading}
                aria-label={
                  isCurrentlyPlaying
                    ? `Pause ${item.title}`
                    : `Play ${item.title}`
                }
                title={isCurrentlyPlaying ? "Pause audio" : "Play audio"}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-2xs select-none ${
                  isCurrentlyPlaying
                    ? "bg-primary text-primary-foreground hover:opacity-95"
                    : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                }`}
              >
                {isCurrentlyLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isCurrentlyPlaying ? (
                  <Pause size={14} />
                ) : (
                  <Play size={14} className="ml-0.5" />
                )}
                <span>{isCurrentlyPlaying ? "Pause" : "Play"}</span>

                {/* Animated sound waves icon when playing (respects reduce motion) */}
                {isCurrentlyPlaying && (
                  <div
                    aria-hidden="true"
                    className="flex items-end gap-0.5 h-3 ml-0.5"
                  >
                    <span className="w-0.5 bg-current rounded-full h-1.5 motion-safe:animate-[bounce_0.6s_ease-in-out_infinite]" />
                    <span className="w-0.5 bg-current rounded-full h-3 motion-safe:animate-[bounce_0.8s_ease-in-out_infinite_0.2s]" />
                    <span className="w-0.5 bg-current rounded-full h-2 motion-safe:animate-[bounce_0.7s_ease-in-out_infinite_0.4s]" />
                  </div>
                )}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-[11px] font-medium text-muted-foreground">
                <span>Audio coming soon</span>
              </span>
            )}

            {/* Quran audio tag if applicable */}
            {isQuranAudioItem && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-[10px]">
                Quran audio
              </span>
            )}

            {/* Repetition indicator if playing repeat cycle > 1 */}
            {isActive && settings.repeat > 1 && (
              <span className="text-[11px] font-semibold text-primary">
                Repeat {currentRepeat}/{settings.repeat}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Gear button for speed & repeat settings */}
            {hasAudio && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                aria-label={`Audio playback settings for ${item.title}`}
                title="Audio playback settings"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Settings2 size={14} />
              </button>
            )}

            {/* Report audio issue button */}
            {hasAudio && (
              <button
                type="button"
                onClick={() => setReportAudioItem(item)}
                aria-label="Report an audio problem"
                title="Report an audio problem"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground/80 hover:text-amber-500 hover:bg-muted transition-colors"
              >
                <Flag size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Listen & Repeat Active User-Turn Notification */}
        {isActive && repeatPhase === "user-turn" && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-950 dark:text-emerald-200 animate-in fade-in duration-150">
            <span className="flex items-center gap-2 font-medium">
              <Mic size={15} className="text-emerald-500 animate-pulse" />
              <span>Your turn: Recite the dhikr now</span>
            </span>
            <span className="font-bold text-xs bg-emerald-500/20 px-2 py-0.5 rounded-md">
              {userTurnCountdown}s
            </span>
          </div>
        )}

        {/* One-time tip for Listen & Repeat */}
        {isActive && showListenRepeatTip && (
          <div className="mx-4 sm:mx-6 mt-3 rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-foreground space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="font-bold text-primary flex items-center gap-1.5">
                  <Mic size={13} />
                  <span>Listen &amp; Repeat Mode Active</span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The recording plays once, then pauses so you can recite it yourself, before repeating for your selected repeat count.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissListenRepeatTip}
                className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-[10px] hover:opacity-95 shrink-0"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Playback Error Alert with Retry button */}
        {isActive && error && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-center justify-between gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={retry}
              className="px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground font-bold text-[10px] hover:opacity-95 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Card Body: Arabic text */}
        <div
          className="p-4 sm:p-6 space-y-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Carousel Slide Switcher if card has multiple slides (e.g. After Salah 3 Quls) */}
          {hasSlides && item.slides && (
            <div className="space-y-2.5 pb-2 border-b border-border/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Recitation {slideIndex + 1} of {item.slides.length} (Swipe to read along)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSlideIndex((prev) => Math.max(0, prev - 1))}
                    disabled={slideIndex === 0}
                    aria-label="Previous Surah"
                    title="Previous Surah"
                    className="grid size-7 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSlideIndex((prev) => Math.min(item.slides!.length - 1, prev + 1))
                    }
                    disabled={slideIndex === item.slides.length - 1}
                    aria-label="Next Surah"
                    title="Next Surah"
                    className="grid size-7 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Tabs for fast switching */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {item.slides.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSlideIndex(idx)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                      idx === slideIndex
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            dir="rtl"
            lang="ar"
            className={`text-right leading-loose text-foreground transition-all duration-150 ${fontClass}`}
            style={{ fontSize: `${prefs.arabicSize}px` }}
          >
            {displayArabic}
          </div>

          {/* Transliteration */}
          {prefs.showTransliteration && displayTransliteration && (
            <div className="rounded-xl bg-muted/40 p-3 text-xs sm:text-sm text-foreground/80 leading-relaxed italic border border-border/40">
              {displayTransliteration}
            </div>
          )}

          {/* English Translation */}
          <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans">
            &ldquo;{displayTranslation}&rdquo;
          </div>

          {/* Expandable: Virtue Section */}
          {item.virtue && (
            <div className="border-t border-border/50 pt-2">
              <button
                type="button"
                onClick={() => setShowVirtue(!showVirtue)}
                className="flex items-center justify-between w-full py-1 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
              >
                <span className="flex items-center gap-1.5">
                  <Heart size={13} />
                  <span>Virtue &amp; Reward</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    showVirtue ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showVirtue && (
                <div className="mt-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed animate-in fade-in duration-150">
                  {item.virtue}
                </div>
              )}
            </div>
          )}

          {/* Expandable: Evidence Section */}
          <div className="border-t border-border/50 pt-2">
            <button
              type="button"
              onClick={() => setShowEvidence(!showEvidence)}
              className="flex items-center justify-between w-full py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen size={13} />
                <span>Evidence &amp; Hadith Reference</span>
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  showEvidence ? "rotate-180" : ""
                }`}
              />
            </button>

            {showEvidence && (
              <div className="mt-2 rounded-xl bg-muted/50 border border-border/60 p-3 text-xs text-foreground/85 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Source:</span>
                  <span>{item.source.book}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Reference:</span>
                  <span>{item.source.hadith_reference}</span>
                </div>
                {item.source.narrator && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Narrator:</span>
                    <span>{item.source.narrator}</span>
                  </div>
                )}
                {item.source.grading && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Grading:</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-medium text-[11px]">
                      {item.source.grading}
                    </span>
                  </div>
                )}
                {item.source.sunnah_url && (
                  <div className="pt-1.5 border-t border-border/40 flex items-center justify-between">
                    <a
                      href={item.source.sunnah_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span>View on Sunnah.com</span>
                      <ExternalLink size={11} />
                    </a>

                    {hasAudio && (
                      <button
                        type="button"
                        onClick={() => setReportAudioItem(item)}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Flag size={11} />
                        <span>Report audio issue</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Interactive Tap Area */}
        <div className="p-4 sm:p-5 border-t border-border/50 bg-muted/20 rounded-b-2xl flex items-center justify-between gap-3">
          {/* Progress bar inside card */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Progress</span>
              <span>
                {item.repeat - remaining} / {item.repeat}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Reset button if dirty */}
          {remaining < item.repeat && (
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset counter"
              title="Reset count"
              className="grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              <RotateCcw size={14} />
            </button>
          )}

          {/* Large Tap Button */}
          <button
            type="button"
            onClick={handleTap}
            disabled={isDone}
            aria-label={
              isDone
                ? `Completed ${item.title}`
                : `Tap counter for ${item.title}, ${remaining} remaining`
            }
            className={`min-w-28 sm:min-w-32 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-xs shrink-0 select-none ${
              isTapping ? "scale-95" : "scale-100"
            } ${
              tapPrompt ? "ring-2 ring-primary ring-offset-2 animate-pulse" : ""
            } ${
              isDone
                ? "bg-primary text-primary-foreground opacity-90 cursor-default"
                : "bg-primary text-primary-foreground hover:opacity-95 active:scale-95"
            }`}
          >
            {isDone ? (
              <>
                <Check size={16} strokeWidth={3} />
                <span>Done ✓</span>
              </>
            ) : (
              <>
                <span className="text-base">{remaining}</span>
                <span className="text-xs opacity-90 font-medium">
                  {tapPrompt ? "Tap to count" : "Tap"}
                </span>
              </>
            )}
          </button>
        </div>
      </article>

      {/* Share Modal */}
      <ShareDhikrModal
        item={item}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
