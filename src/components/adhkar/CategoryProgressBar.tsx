"use client";

import { SlidersHorizontal, RotateCcw, Download, CheckCircle2, Play } from "lucide-react";
import type { AdhkarCategoryMeta } from "@/lib/adhkar/types";

interface CategoryProgressBarProps {
  meta: AdhkarCategoryMeta;
  completedCount: number;
  totalCount: number;
  onOpenSettings: () => void;
  onResetCategory: () => void;
  onDownloadOffline?: () => void;
  isOfflineCached?: boolean;
  audioSizeEstimate?: string;
  isDownloadingAudio?: boolean;
  downloadAudioProgress?: number;
  isAudioOffline?: boolean;
  onDownloadAudioOffline?: () => void;
  onPlayAll?: () => void;
}

export function CategoryProgressBar({
  meta,
  completedCount,
  totalCount,
  onOpenSettings,
  onResetCategory,
  onDownloadOffline,
  isOfflineCached,
  audioSizeEstimate,
  isDownloadingAudio,
  downloadAudioProgress,
  isAudioOffline,
  onDownloadAudioOffline,
  onPlayAll,
}: CategoryProgressBarProps) {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isDone = completedCount === totalCount && totalCount > 0;

  return (
    <div className="sticky top-14 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/95 backdrop-blur-md border-b border-border shadow-xs transition-all">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Progress
            </span>
            <span className="text-xs font-bold text-foreground">
              {completedCount} of {totalCount} completed ({percentage}%)
            </span>
            {isDone && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} />
                <span>All Done!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Play All Button */}
            {onPlayAll && (
              <button
                type="button"
                onClick={onPlayAll}
                title="Play all adhkar sequentially in order"
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-2xs transition-all"
              >
                <Play size={11} className="fill-current" />
                <span>Play All</span>
              </button>
            )}

            {/* Audio offline download */}
            {onDownloadAudioOffline && (
              <button
                type="button"
                onClick={onDownloadAudioOffline}
                disabled={isDownloadingAudio}
                title={
                  isAudioOffline
                    ? "Audio saved offline"
                    : `Download ${audioSizeEstimate || "audio"} for offline listening (Wi-Fi suggested)`
                }
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  isAudioOffline
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : isDownloadingAudio
                    ? "border-primary/40 bg-primary/10 text-primary animate-pulse"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Download size={13} />
                <span>
                  {isDownloadingAudio
                    ? `Downloading ${downloadAudioProgress || 0}%`
                    : isAudioOffline
                    ? "Audio Offline ✓"
                    : `Audio (${audioSizeEstimate || "offline"})`}
                </span>
              </button>
            )}

            {completedCount > 0 && (
              <button
                type="button"
                onClick={onResetCategory}
                title="Reset all counters in this category"
                className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <RotateCcw size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSettings}
              title="Adhkar Settings"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs"
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>

        {/* Full width visual progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-300 ${
              isDone ? "bg-primary" : "bg-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
