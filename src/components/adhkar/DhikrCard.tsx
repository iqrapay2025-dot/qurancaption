"use client";

import { useState } from "react";
import { Check, RotateCcw, Share2, BookOpen, ChevronDown, ExternalLink, Sparkles } from "lucide-react";
import type { AdhkarItem } from "@/lib/adhkar/types";
import type { AdhkarPreferences } from "@/lib/adhkar/storage";
import { decrementDhikr, resetDhikr } from "@/lib/adhkar/storage";
import { ShareDhikrModal } from "./ShareDhikrModal";

interface DhikrCardProps {
  item: AdhkarItem;
  remaining: number;
  onCountChange: (id: string, newRemaining: number) => void;
  prefs: AdhkarPreferences;
}

export function DhikrCard({ item, remaining, onCountChange, prefs }: DhikrCardProps) {
  const [showVirtue, setShowVirtue] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isTapping, setIsTapping] = useState(false);

  const isDone = remaining === 0;
  const progressPercent = Math.min(100, Math.round(((item.repeat - remaining) / item.repeat) * 100));

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
    setTimeout(() => setIsTapping(false), 120);

    const result = decrementDhikr(item.id, item.repeat);
    onCountChange(item.id, result.remaining);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = resetDhikr(item.id, item.repeat);
    onCountChange(item.id, res);
  };

  return (
    <>
      <article
        aria-label={item.title}
        className={`group relative rounded-2xl border transition-all duration-200 shadow-xs ${
          isDone
            ? "border-primary/40 bg-primary/[0.03] dark:bg-primary/[0.04]"
            : "border-border bg-card hover:border-border/80"
        }`}
      >
        {/* Top bar: Title, repeat badge, action buttons */}
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

        {/* Card Body: Arabic text */}
        <div className="p-4 sm:p-6 space-y-4">
          <div
            dir="rtl"
            lang="ar"
            className={`text-right leading-loose text-foreground transition-all duration-150 ${fontClass}`}
            style={{ fontSize: `${prefs.arabicSize}px` }}
          >
            {item.arabic}
          </div>

          {/* Transliteration */}
          {prefs.showTransliteration && item.transliteration && (
            <div className="rounded-xl bg-muted/40 p-3 text-xs sm:text-sm text-foreground/80 leading-relaxed italic border border-border/40">
              {item.transliteration}
            </div>
          )}

          {/* English Translation */}
          <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans">
            &ldquo;{item.translation_en}&rdquo;
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
                  <Sparkles size={13} />
                  <span>Virtue & Reward</span>
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
                <span>Evidence & Hadith Reference</span>
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
                  <div className="pt-1.5 border-t border-border/40">
                    <a
                      href={item.source.sunnah_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span>View on Sunnah.com</span>
                      <ExternalLink size={11} />
                    </a>
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
                <span className="text-xs opacity-90 font-medium">Tap</span>
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
    </>
  );
}
