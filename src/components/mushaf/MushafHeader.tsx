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
} from "lucide-react";
import { SURAHS_META, JUZS_META } from "@/lib/mushaf/data";
import { MushafPageSurahSummary } from "@/lib/mushaf/types";
import { Reciter, DEFAULT_RECITER } from "@/lib/quran/types";

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
}: MushafHeaderProps) {
  const [jumpOpen, setJumpOpen] = useState(false);
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
    if (!reciterSearch.trim()) return reciters;
    const q = reciterSearch.toLowerCase().trim();
    return reciters.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.nameArabic && r.nameArabic.includes(q)) ||
        (r.style && r.style.toLowerCase().includes(q))
    );
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
        <div className="max-w-4xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-1 sm:gap-3">
          {/* Left: Back button */}
          <div className="flex items-center shrink-0">
            <Link
              href={`/quran/${primarySurah.id}`}
              className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              title="Back to Quran Surah list"
              aria-label="Back to Surah list"
            >
              <ChevronLeft size={20} />
            </Link>
          </div>

          {/* Center: Surah & Page Navigation Trigger (Centered & Responsive) */}
          <div className="flex-1 min-w-0 flex items-center justify-center px-1">
            <button
              type="button"
              onClick={() => setJumpOpen(true)}
              className="max-w-full inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-border/70 bg-card/70 hover:border-gold hover:bg-gold/5 transition-all text-center"
              title="Jump to Surah, Juz, or Page"
            >
              <div className="min-w-0 flex flex-col items-center">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-foreground truncate max-w-[95px] xs:max-w-[140px] sm:max-w-[200px]">
                    {primarySurah.name_simple}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-primary/10 text-primary shrink-0 whitespace-nowrap">
                    Juz {juzNumber}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate">
                  Page {pageNumber} of 604
                </span>
              </div>
              <ChevronDown size={13} className="text-muted-foreground shrink-0" />
            </button>
          </div>

          {/* Right: Toggle Switch & Reciter Selector */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Desktop: Segmented switch */}
            <div className="hidden sm:inline-flex items-center p-0.5 rounded-lg border border-border bg-muted/60 text-xs">
              <Link
                href={`/quran/${primarySurah.id}`}
                className="px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 font-medium"
                title="Switch to Verse-by-verse translation reader"
              >
                <FileText size={13} />
                <span>Verses</span>
              </Link>
              <span
                className="px-2.5 py-1 rounded-md bg-background text-foreground shadow-2xs font-semibold flex items-center gap-1"
                title="Currently in Mushaf page view"
              >
                <BookOpen size={13} className="text-primary" />
                <span>Mushaf</span>
              </span>
            </div>

            {/* Mobile: Compact button to switch to Verses view */}
            <Link
              href={`/quran/${primarySurah.id}`}
              className="sm:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border/80 bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
              title="Switch to Verse-by-verse reader"
            >
              <FileText size={14} className="text-primary" />
              <span className="text-[11px]">Verses</span>
            </Link>

            {/* Reciter Selector dropdown */}
            <div className="relative shrink-0" ref={reciterDropdownRef}>
              <button
                type="button"
                onClick={() => setReciterMenuOpen(!reciterMenuOpen)}
                className="p-1.5 sm:p-2 rounded-lg border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                title="Select Reciter"
                aria-label="Select audio reciter"
              >
                <Headphones size={16} className="text-primary" />
                <span className="hidden md:inline text-xs max-w-[90px] truncate text-foreground font-medium">
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
    </>
  );
}
