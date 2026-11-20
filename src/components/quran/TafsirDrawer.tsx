"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, AlertCircle, RefreshCw } from "lucide-react";
import { useApi } from "@/lib/quran/useApi";
import BadgeLoader from "@/components/BadgeLoader";
import type { TafsirInfo, TafsirEntry } from "@/lib/quran/types";

type Props = {
  surah: number;
  ayah: number;
  totalVerses: number;
  arabicText?: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateAyah: (ayah: number) => void;
};

const STORAGE_KEY = "qcs-quran-tafsir";

export function TafsirDrawer({
  surah,
  ayah,
  totalVerses,
  arabicText,
  isOpen,
  onClose,
  onNavigateAyah,
}: Props) {
  const [selectedTafsir, setSelectedTafsir] = useState<string>("ibn_kathir");
  const drawerRef = useRef<HTMLDivElement>(null);
  const prevActiveElement = useRef<HTMLElement | null>(null);

  // Load saved tafsir preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSelectedTafsir(saved);
    } catch {}
  }, []);

  const handleTafsirChange = (id: string) => {
    setSelectedTafsir(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  // Fetch catalog of tafsirs
  const { data: catalogData } = useApi<{ tafsirs: TafsirInfo[] }>("/api/quran/tafsirs");
  const tafsirs = catalogData?.tafsirs ?? [
    { id: "ibn_kathir", name: "Ibn Kathir (Abridged)", language: "english" },
    { id: "maarif", name: "Ma'arif al-Qur'an", language: "english" },
    { id: "muyassar", name: "Tafsir Muyassar", language: "arabic" },
  ];

  // Fetch commentary for current tafsir & ayah
  const tafsirUrl = isOpen
    ? `/api/quran/tafsir?tafsir=${encodeURIComponent(selectedTafsir)}&surah=${surah}&ayah=${ayah}`
    : null;
  const { data, error, loading, retry } = useApi<TafsirEntry>(tafsirUrl);

  // Focus management & Escape key handling
  useEffect(() => {
    if (isOpen) {
      prevActiveElement.current = document.activeElement as HTMLElement;
      // Focus drawer
      drawerRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        prevActiveElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTafsir = tafsirs.find((t) => t.id === selectedTafsir);
  const isArabic = data?.language === "arabic" || currentTafsir?.language === "arabic";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tafsir for Surah ${surah}, Ayah ${ayah}`}
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="relative z-50 flex h-full w-full flex-col bg-card border-border shadow-2xl outline-none md:max-w-xl md:border-l max-md:max-h-[85vh] max-md:mt-auto max-md:rounded-t-2xl max-md:border-t"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base sm:text-lg text-foreground">
              Tafsir — Ayah {surah}:{ayah}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNavigateAyah(ayah - 1)}
              disabled={ayah <= 1}
              aria-label="Previous ayah tafsir"
              className="grid size-8 place-items-center rounded-sm border border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => onNavigateAyah(ayah + 1)}
              disabled={ayah >= totalVerses}
              aria-label="Next ayah tafsir"
              className="grid size-8 place-items-center rounded-sm border border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tafsir panel"
              className="ml-2 grid size-8 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tafsir Selector */}
        <div className="border-b border-border bg-muted/30 px-5 py-3 shrink-0 flex items-center justify-between gap-3">
          <label htmlFor="tafsir-select" className="text-xs font-medium text-muted-foreground shrink-0">
            Select Tafsir:
          </label>
          <select
            id="tafsir-select"
            value={selectedTafsir}
            onChange={(e) => handleTafsirChange(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs sm:text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {tafsirs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.language})
              </option>
            ))}
          </select>
        </div>

        {/* Ayah Arabic Preview */}
        {arabicText && (
          <div className="border-b border-border bg-muted/10 px-5 py-3 shrink-0">
            <p
              dir="rtl"
              lang="ar"
              className="font-quran text-lg sm:text-xl text-right leading-loose text-foreground"
            >
              {arabicText}
            </p>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {loading && (
            <div className="py-12 flex justify-center">
              <BadgeLoader size="inline" label="Loading commentary..." />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-md border border-border bg-destructive/10 p-4 text-center">
              <AlertCircle className="mx-auto mb-2 text-destructive size-6" />
              <p className="text-sm font-medium text-foreground">{error.message}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {data && !loading && !error && (
            <div
              dir={isArabic ? "rtl" : "ltr"}
              lang={isArabic ? "ar" : "en"}
              className={`space-y-4 text-sm sm:text-base leading-relaxed text-foreground/90 ${
                isArabic ? "font-quran text-right text-lg sm:text-xl leading-loose" : ""
              }`}
            >
              {data.paragraphs.length > 0 ? (
                data.paragraphs.map((p, idx) => (
                  <p key={idx} className="whitespace-pre-line">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground italic">No commentary text available for this ayah.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
