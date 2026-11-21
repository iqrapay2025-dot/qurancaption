"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  HardDrive,
  Trash2,
  BookOpen,
  Volume2,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import {
  listOfflineDownloads,
  deleteOfflineSurahContent,
  deleteOfflineSurahAudio,
  clearAllOfflineData,
  formatBytes,
  type OfflineDownloadSummary,
} from "@/lib/offline/db";

export function OfflineDownloadsView() {
  const [downloads, setDownloads] = useState<OfflineDownloadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadDownloads = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listOfflineDownloads();
      setDownloads(list);
    } catch {
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const handleDelete = async (surah: number, reciterId?: number) => {
    try {
      await deleteOfflineSurahContent(surah);
      if (reciterId) {
        await deleteOfflineSurahAudio(surah, reciterId);
      }
      await loadDownloads();
    } catch {}
  };

  const handleClearAll = async () => {
    try {
      await clearAllOfflineData();
      setConfirmClear(false);
      await loadDownloads();
    } catch {}
  };

  const totalStorage = downloads.reduce((acc, d) => acc + d.totalBytes, 0);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading offline storage...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <HardDrive size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              Offline Storage: <span className="text-primary">{formatBytes(totalStorage)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {downloads.length} {downloads.length === 1 ? "Surah" : "Surahs"} downloaded on this device for offline reading and Muraja&apos;a.
            </p>
          </div>
        </div>

        {downloads.length > 0 && (
          <div>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-sm bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
                >
                  Yes, delete all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-sm border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
              >
                <Trash2 size={13} /> Clear all downloads
              </button>
            )}
          </div>
        )}
      </div>

      {/* Downloads List */}
      {downloads.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-base font-semibold text-foreground">No offline Surahs downloaded</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
            Open any Surah in the Quran reader and tap <strong>&quot;Download offline&quot;</strong> in the header to save its text and recitation audio for offline reading and practice.
          </p>
          <div className="mt-5">
            <Link
              href="/quran"
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <BookOpen size={14} /> Browse Quran
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {downloads.map((item) => (
            <div
              key={`${item.surah}_${item.reciterId || 0}`}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/30 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-muted text-xs font-bold text-foreground">
                    {item.surah}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{item.surahName}</h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {item.versesCount} verses · {formatBytes(item.totalBytes)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.surah, item.reciterId)}
                  title="Remove from offline"
                  aria-label={`Delete download for Surah ${item.surahName}`}
                  className="rounded-sm p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {item.reciterName && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1">
                  <Volume2 size={12} className="text-primary shrink-0" />
                  <span className="truncate">{item.reciterName}</span>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
                <Link
                  href={`/quran/${item.surah}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <BookOpen size={13} /> Read &amp; Revise
                </Link>
                <Link
                  href={`/listen?surah=${item.surah}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Volume2 size={13} /> Listen
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
