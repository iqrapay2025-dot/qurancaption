"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Chapter } from "@/lib/quran/server";
import { filterChapters } from "@/lib/quran/filter";

export function SurahList({ chapters }: { chapters: Chapter[] }) {
  const [query, setQuery] = useState("");
  const filtered = filterChapters(chapters, query);

  return (
    <div className="w-full">
      {/* Search Input */}
      <div data-tour="surah-search" className="relative mb-8">
        <label htmlFor="surah-search" className="sr-only">
          Search surahs
        </label>
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={18}
            aria-hidden="true"
          />
          <input
            id="surah-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by surah name, number, or meaning..."
            className="w-full rounded-md border border-border bg-card py-3 pl-10 pr-4 text-sm sm:text-base text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {query ? (
            <span>
              Showing {filtered.length} of {chapters.length} surahs
            </span>
          ) : (
            <span>Filter surahs by name, number, or meaning</span>
          )}
          <Link
            href={query ? `/quran/search?q=${encodeURIComponent(query)}` : "/quran/search"}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Search all ayahs across Quran →
          </Link>
        </div>
      </div>

      {/* Grid of Surah Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/quran/${c.id}`}
              className="group relative flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-gold hover:shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted text-xs font-semibold text-foreground group-hover:bg-gold/10 group-hover:text-gold transition-colors">
                  {c.id}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-sm sm:text-base text-foreground group-hover:text-gold transition-colors">
                    {c.nameSimple}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.meaning}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                    {c.versesCount} verses
                  </div>
                </div>
              </div>

              <div
                dir="rtl"
                lang="ar"
                className="font-quran shrink-0 text-xl sm:text-2xl text-foreground/90 group-hover:text-gold transition-colors select-none"
              >
                {c.nameArabic}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-base text-muted-foreground">
            No surahs found matching &ldquo;<span className="font-semibold text-foreground">{query}</span>&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 text-sm font-semibold text-gold underline hover:opacity-80"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
