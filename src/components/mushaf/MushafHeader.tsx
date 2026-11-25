"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Search,
  BookOpen,
  FileText,
  SlidersHorizontal,
  Headphones,
  X,
  ChevronDown,
  Check,
  HardDrive,
  Sun,
  Moon,
  Palette,
} from "lucide-react";
import { SURAHS_META, JUZS_META } from "@/lib/mushaf/data";
import { MushafPageSurahSummary, MushafFontType } from "@/lib/mushaf/types";
import { Reciter, DEFAULT_RECITER } from "@/lib/quran/types";
import { filterReciters } from "@/lib/search/reciter-search";
import { useTheme, ThemeToggle } from "@/components/shared";
import { TAJWEED_GROUPS } from "@/lib/quran/tajweed";
import { TodayPlanChip } from "@/components/planner/TodayPlanChip";

interface MushafHeaderProps {
  pageNumber: number;
  juzNumber: number;
  surahs: MushafPageSurahSummary[];
  onPageChange: (newPage: number) => void;
  reciters: Reciter[];
  selectedReciterId: number;
  onSelectReciter: (id: number) => void;
  fontSizeMultiplier: number;
  onFontSizeChange: (multiplier: number) => void;
  fontType: MushafFontType;
  onFontTypeChange: (fontType: MushafFontType) => void;
  tajweedEnabled?: boolean;
  onTajweedChange?: (enabled: boolean) => void;
}

export function MushafHeader({
  pageNumber,
  juzNumber,
  surahs,
  onPageChange,
  reciters,
  selectedReciterId,
  onSelectReciter,
  fontSizeMultiplier,
  onFontSizeChange,
  fontType,
  onFontTypeChange,
  tajweedEnabled = false,
  onTajweedChange,
}: MushafHeaderProps) {
  const { dark, toggle: toggleTheme } = useTheme();
  const [jumpOpen, setJumpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"surah" | "juz" | "page">("surah");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputPage, setInputPage] = useState(String(pageNumber));
  const [reciterMenuOpen, setReciterMenuOpen] = useState(false);
  const [reciterSearch, setReciterSearch] = useState("");
  const reciterDropdownRef = useRef<HTMLDivElement | null>(null);

  const primarySurah = surahs[0] || SURAHS_META[0];

  useEffect(() => {
    setInputPage(String(pageNumber));
  }, [pageNumber]);

  useEffect(() => {
    if (!reciterMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        reciterDropdownRef.current &&
        !reciterDropdownRef.current.contains(e.target as Node)
      ) {
        setReciterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [reciterMenuOpen]);

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return SURAHS_META;
    const q = searchQuery.toLowerCase().trim();
    return SURAHS_META.filter(
      (s) =>
        s.id.toString() === q ||
        s.name_simple.toLowerCase().includes(q) ||
        s.name_english.toLowerCase().includes(q) ||
        s.name_arabic.includes(q)
    );
  }, [searchQuery]);

  const filteredReciters = useMemo(() => {
    return filterReciters(reciters, reciterSearch);
  }, [reciters, reciterSearch]);

  const currentReciter = reciters.find((r) => r.id === selectedReciterId);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p >= 1 && p <= 604) {
      onPageChange(p);
      setJumpOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          {/* Left: Back button + Jump to Surah / Page Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Link
              href={`/quran/${primarySurah.id}`}
              className="size-9 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 transition-colors shadow-2xs"
              title="Back to Quran Surah list"
              aria-label="Back to Surah list"
            >
              <ChevronLeft size={18} />
            </Link>

            <button
              type="button"
              data-tour="mushaf-nav"
              onClick={() => setJumpOpen(true)}
              className="h-9 px-2.5 sm:px-3 rounded-xl border border-border/80 bg-card hover:bg-muted/70 hover:border-primary/40 transition-all flex items-center gap-1.5 min-w-0 shadow-2xs group"
              title="Jump to Surah, Juz, or Page"
            >
              <span className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[180px]">
                {primarySurah.name_simple}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary shrink-0 whitespace-nowrap">
                P. {pageNumber}
              </span>
              <span className="hidden sm:inline-block text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                · Juz {juzNumber}
              </span>
              <ChevronDown size={13} className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
            </button>
          </div>

          {/* Right: Actions Cluster */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <TodayPlanChip className="hidden xl:inline-flex" />

            {/* Desktop: Segmented switch (Verses / Mushaf) */}
            <div className="hidden md:inline-flex items-center p-0.5 rounded-xl border border-border/80 bg-muted/60 text-xs h-9">
              <Link
                href={`/quran/${primarySurah.id}`}
                className="px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 font-medium"
                title="Switch to Verse-by-verse translation reader"
              >
                <FileText size={13} />
                <span>Verses</span>
              </Link>
              <span
                className="px-2.5 py-1 rounded-lg bg-background text-foreground shadow-2xs font-semibold flex items-center gap-1"
                title="Currently in Mushaf page view"
              >
                <BookOpen size={13} className="text-primary" />
                <span>Mushaf</span>
              </span>
            </div>

            {/* Mobile: Compact icon button to switch to Verses view */}
            <Link
              href={`/quran/${primarySurah.id}`}
              className="md:hidden size-9 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shadow-2xs shrink-0"
              title="Switch to Verse-by-verse reader"
              aria-label="Switch to Verse-by-verse reader"
            >
              <FileText size={16} className="text-primary" />
            </Link>

            {/* Font & Display Settings Button */}
            <button
              type="button"
              data-tour="mushaf-display-settings"
              onClick={() => setSettingsOpen(true)}
              className="size-9 rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center shadow-2xs shrink-0"
              title="Adjust Font Size & Script"
              aria-label="Font settings"
            >
              <SlidersHorizontal size={16} className="text-primary" />
            </button>

            {/* Reciter Selector dropdown */}
            <div className="relative shrink-0" ref={reciterDropdownRef} data-tour="mushaf-reciter">
              <button
                type="button"
                onClick={() => setReciterMenuOpen(!reciterMenuOpen)}
                className="h-9 px-2 sm:px-2.5 rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Select Reciter"
                aria-label="Select audio reciter"
              >
                <Headphones size={16} className="text-primary shrink-0" />
                <span className="hidden lg:inline text-xs max-w-[80px] truncate text-foreground font-medium">
                  {currentReciter?.name.split(" ")[0] || "Reciter"}
                </span>
              </button>

              {reciterMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-border bg-popover p-2 shadow-xl z-50 animate-fade-in">
                  <div className="p-2 border-b border-border/60">
                    <p className="text-xs font-bold text-foreground">Select Reciter</p>
                    <div className="mt-2 relative">
                      <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={reciterSearch}
                        onChange={(e) => setReciterSearch(e.target.value)}
                        placeholder="Search reciter..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {filteredReciters.map((r) => {
                      const isSelected = r.id === selectedReciterId;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            onSelectReciter(r.id);
                            setReciterMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate">{r.name}</p>
                            {r.style && (
                              <p className="text-[10px] text-muted-foreground capitalize">{r.style}</p>
                            )}
                          </div>
                          {isSelected && <Check size={14} className="text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Offline Downloads link */}
            <Link
              href="/offline"
              className="hidden lg:inline-flex size-9 rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors items-center justify-center shadow-2xs shrink-0"
              title="Offline Downloads & Storage"
              aria-label="Offline downloads and storage"
            >
              <HardDrive size={16} />
            </Link>

            {/* Dark / Light Mode Toggle */}
            <ThemeToggle dark={dark} toggle={toggleTheme} />
          </div>
        </div>
      </header>

      {/* Quick Jump Navigation Modal */}
      {jumpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0" onClick={() => setJumpOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Jump to in Mushaf</h3>
              <button
                type="button"
                onClick={() => setJumpOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border mt-3">
              <button
                type="button"
                onClick={() => setActiveTab("surah")}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "surah"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Surah (1-114)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("juz")}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "juz"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Juz (1-30)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("page")}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "page"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Page (1-604)
              </button>
            </div>

            {/* Tab Contents */}
            <div className="mt-4">
              {activeTab === "surah" && (
                <div>
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Surah by name or number..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                    {filteredSurahs.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onPageChange(s.start_page);
                          setJumpOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-muted text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="size-6 flex items-center justify-center rounded-md bg-muted text-[11px] font-mono text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                            {s.id}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{s.name_simple}</p>
                            <p className="text-[10px] text-muted-foreground">{s.name_english}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-uthmani text-base font-bold text-foreground">
                            {s.name_arabic}
                          </span>
                          <p className="text-[10px] text-muted-foreground">Page {s.start_page}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "juz" && (
                <div className="max-h-72 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {JUZS_META.map((j) => (
                    <button
                      key={j.juz_number}
                      type="button"
                      onClick={() => {
                        onPageChange(j.start_page);
                        setJumpOpen(false);
                      }}
                      className="p-3 rounded-xl border border-border/70 hover:border-primary hover:bg-primary/5 text-left transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Juz {j.juz_number}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          p. {j.start_page}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "page" && (
                <form onSubmit={handlePageSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Enter Page Number (1 to 604)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={604}
                      value={inputPage}
                      onChange={(e) => setInputPage(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-center"
                    />
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={604}
                    value={inputPage}
                    onChange={(e) => setInputPage(e.target.value)}
                    className="w-full accent-primary"
                  />

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity"
                  >
                    Go to Page {inputPage}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Font & Display Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0" onClick={() => setSettingsOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xl animate-scale-in space-y-4 sm:space-y-5 max-h-[88vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-primary" />
                <h3 className="font-bold text-base text-foreground">Mushaf Font &amp; Display</h3>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                title="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            {/* Font Size Adjuster */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Arabic Font Size</span>
                <span className="font-mono text-primary font-bold">
                  {Math.round(fontSizeMultiplier * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onFontSizeChange(Math.max(0.7, Math.round((fontSizeMultiplier - 0.1) * 10) / 10))}
                  disabled={fontSizeMultiplier <= 0.7}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold disabled:opacity-40 transition-colors shrink-0"
                  title="Decrease font size"
                >
                  A-
                </button>
                <input
                  type="range"
                  min="0.7"
                  max="1.6"
                  step="0.05"
                  value={fontSizeMultiplier}
                  onChange={(e) => onFontSizeChange(parseFloat(e.target.value))}
                  className="flex-1 min-w-[60px] accent-primary h-2 rounded-lg bg-muted cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => onFontSizeChange(Math.min(1.6, Math.round((fontSizeMultiplier + 0.1) * 10) / 10))}
                  disabled={fontSizeMultiplier >= 1.6}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold disabled:opacity-40 transition-colors shrink-0"
                  title="Increase font size"
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => onFontSizeChange(1)}
                  className="px-2 sm:px-2.5 py-1.5 rounded-lg border border-border/70 hover:bg-muted text-[11px] text-muted-foreground transition-colors shrink-0"
                  title="Reset to 100%"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Font Type / Script Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Arabic Font / Script Type
              </label>
              <div className="space-y-2">
                {/* 1. KFGQPC Uthman Taha */}
                <button
                  type="button"
                  onClick={() => onFontTypeChange("kfgqpc")}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    fontType === "kfgqpc"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      KFGQPC Uthman Taha Script
                    </span>
                    {fontType === "kfgqpc" && <Check size={16} className="text-primary" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    King Fahd Complex Madani Mushaf page-accurate calligraphy
                  </span>
                  <div className="mt-1 text-right" dir="rtl">
                    <span className="font-uthmani text-base text-foreground/90">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </span>
                  </div>
                </button>

                {/* 2. Amiri Quran */}
                <button
                  type="button"
                  onClick={() => onFontTypeChange("amiri")}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    fontType === "amiri"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Amiri Font (Amiri Quran)
                    </span>
                    {fontType === "amiri" && <Check size={16} className="text-primary" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Classical Arabic Naskh typeface designed for Quranic text
                  </span>
                  <div className="mt-1 text-right" dir="rtl">
                    <span style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }} className="text-lg text-foreground/90">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </span>
                  </div>
                </button>

                {/* 3. Uthmanic Hafs */}
                <button
                  type="button"
                  onClick={() => onFontTypeChange("uthmanic")}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    fontType === "uthmanic"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Uthmanic Hafs Script
                    </span>
                    {fontType === "uthmanic" && <Check size={16} className="text-primary" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Digital Uthmanic Hafs font by Quran Foundation
                  </span>
                  <div className="mt-1 text-right" dir="rtl">
                    <span style={{ fontFamily: "'UthmanicHafs', serif" }} className="text-lg text-foreground/90">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Tajweed Colors Setting */}
            {onTajweedChange && (
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div className="pr-3">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Palette size={14} className="text-gold" />
                      <span>Tajweed Colors</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Highlight recitation rules (ghunnah, ikhfa, idgham, qalqalah, madd)
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tajweedEnabled}
                    onClick={() => onTajweedChange(!tajweedEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      tajweedEnabled ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        tajweedEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Tajweed Color Legend */}
                {tajweedEnabled && (
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 animate-fade-in">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Tajweed Rules Color Legend
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {TAJWEED_GROUPS.map((g) => (
                        <div key={g.id} className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="size-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: g.color }}
                          />
                          <span className="text-foreground/90 font-medium truncate">
                            {g.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Appearance / Theme Mode */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <label className="text-xs font-semibold text-foreground block">
                Appearance Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (dark) toggleTheme();
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    !dark
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Sun size={15} />
                  <span>Light Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!dark) toggleTheme();
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    dark
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Moon size={15} />
                  <span>Dark Mode</span>
                </button>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 rounded-xl border border-border/80 bg-muted/40 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Live Preview
              </span>
              <p
                dir="rtl"
                style={{
                  fontSize: `${20 * fontSizeMultiplier}px`,
                  fontFamily:
                    fontType === "amiri"
                      ? "'Amiri Quran', 'Amiri', serif"
                      : fontType === "uthmanic"
                      ? "'UthmanicHafs', serif"
                      : "'UthmanicHafs', 'Amiri Quran', serif",
                }}
                className="text-foreground transition-all duration-150 leading-relaxed"
              >
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
