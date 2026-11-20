"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon, X, RotateCcw, ArrowRight, Clock } from "lucide-react";
import BadgeLoader from "@/components/BadgeLoader";
import { splitHighlight, validateQuery } from "@/lib/search";
import { getRecentSearches, addRecentSearch, clearRecentSearches } from "@/lib/search/recent";
import type { TranslationRes } from "@/lib/quran/types";
import { DEFAULT_TR1 } from "@/lib/quran/types";

interface SearchResultItem {
  key: string;
  surah: number;
  surahName?: string;
  n: number;
  arabic?: string;
  translation?: string;
}

interface SearchApiResponse {
  results: SearchResultItem[];
  count?: number;
}

export function QuranSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams?.get("q") ?? "";
  const initialTr = searchParams?.get("translation") ?? DEFAULT_TR1;

  const [query, setQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [translation, setTranslation] = useState(initialTr);
  const [availableTranslations, setAvailableTranslations] = useState<TranslationRes[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [limit, setLimit] = useState(20);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(initialQ.trim().length >= 2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; retryAfter?: number } | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load translations catalog & recent searches on mount
  useEffect(() => {
    setRecent(getRecentSearches());

    let active = true;
    fetch("/api/quran/translations")
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data?.translations)) {
          setAvailableTranslations(data.translations);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Desktop '/' key shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounce query input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setLimit(20); // Reset limit on new query
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Sync URL with query and translation
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) {
      params.set("q", debouncedQuery.trim());
    }
    if (translation && translation !== DEFAULT_TR1) {
      params.set("translation", translation);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `/quran/search?${queryString}` : "/quran/search";
    window.history.replaceState(null, "", newUrl);
  }, [debouncedQuery, translation]);

  // Execute search when debouncedQuery, translation, or limit changes
  const executeSearch = useCallback(
    async (qTerm: string, tr: string, fetchLimit: number, isLoadMore = false) => {
      const val = validateQuery(qTerm);
      if (!val.valid) {
        setResults([]);
        setTotalCount(null);
        setError(null);
        setLoading(false);
        return;
      }

      if (abortCtrlRef.current) {
        abortCtrlRef.current.abort();
      }
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Save to recent searches
      setRecent(addRecentSearch(val.query));

      const params = new URLSearchParams({
        q: val.query,
        translation: tr,
        limit: String(fetchLimit),
      });

      try {
        const res = await fetch(`/api/quran/search?${params.toString()}`, {
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const retryAfter =
            res.status === 429 ? Number(res.headers.get("retry-after")) || 10 : undefined;
          const msg = body?.error?.message || body?.error || `Search failed (HTTP ${res.status}).`;

          if (res.status === 429 && retryAfter) {
            setRetryCountdown(retryAfter);
            if (retryTimerRef.current) clearInterval(retryTimerRef.current);
            let left = retryAfter;
            retryTimerRef.current = setInterval(() => {
              left--;
              setRetryCountdown(left);
              if (left <= 0) {
                if (retryTimerRef.current) clearInterval(retryTimerRef.current);
                setRetryCountdown(null);
              }
            }, 1000);
          }

          setError({ message: msg, retryAfter });
          if (!isLoadMore) setResults([]);
          return;
        }

        const data: SearchApiResponse = await res.json();
        setResults(data.results || []);
        setTotalCount(typeof data.count === "number" ? data.count : (data.results?.length ?? 0));
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError({ message: "Could not reach the search service. Please check your connection." });
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      executeSearch(debouncedQuery, translation, limit, false);
    } else {
      setResults([]);
      setTotalCount(null);
      setError(null);
      setLoading(false);
    }
  }, [debouncedQuery, translation, executeSearch]);

  const handleLoadMore = () => {
    const nextLimit = limit + 20;
    setLimit(nextLimit);
    executeSearch(debouncedQuery, translation, nextLimit, true);
  };

  const handleSelectRecent = (term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecent([]);
  };

  const hasMore = totalCount !== null ? results.length < totalCount : results.length >= limit;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Search the Quran</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find verses across the entire Quran by Arabic text or translation keywords.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={18}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, e.g. mercy, peace, رحمة... (Press '/' to focus)"
            className="w-full rounded-md border border-border bg-card py-3 pl-10 pr-10 text-sm sm:text-base text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Translation Selector */}
        <div className="w-full sm:w-64">
          <label htmlFor="search-translation" className="sr-only">
            Translation
          </label>
          <select
            id="search-translation"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-3 text-sm text-foreground shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
          >
            {availableTranslations.length > 0 ? (
              availableTranslations.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.language})
                </option>
              ))
            ) : (
              <option value="sahih_international">Sahih International (English)</option>
            )}
          </select>
        </div>
      </div>

      {/* Recent Searches Chips */}
      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock size={12} /> Recent:
          </span>
          {recent.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleSelectRecent(term)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-foreground hover:border-gold hover:text-gold transition-colors"
            >
              {term}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearRecent}
            className="text-muted-foreground underline hover:text-foreground ml-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Search State Container */}
      <div className="mt-8">
        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <BadgeLoader size="inline" label="Searching the Quran..." />
            <p className="text-xs text-muted-foreground">Searching verses...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm font-medium text-foreground">{error.message}</p>
            {retryCountdown !== null && retryCountdown > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Rate limited. Retrying automatically in {retryCountdown}s...
              </p>
            ) : (
              <button
                type="button"
                onClick={() => executeSearch(debouncedQuery, translation, limit, false)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <RotateCcw size={14} /> Retry
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && debouncedQuery.trim().length >= 2 && results.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <p className="text-base font-medium text-foreground">
              No ayahs found for &ldquo;{debouncedQuery}&rdquo;
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try searching with another word, checking spelling, or switching the translation.
            </p>
          </div>
        )}

        {/* Results Header Count */}
        {!loading && !error && results.length > 0 && (
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Found {totalCount !== null ? totalCount : results.length} verse
              {(totalCount ?? results.length) === 1 ? "" : "s"} for &ldquo;{debouncedQuery}&rdquo;
            </span>
            <span>Showing {results.length}</span>
          </div>
        )}

        {/* Results List */}
        {!loading && !error && results.length > 0 && (
          <div className="space-y-4">
            {results.map((r) => {
              const arabicParts = r.arabic ? splitHighlight(r.arabic, debouncedQuery) : [];
              const transParts = r.translation
                ? splitHighlight(r.translation, debouncedQuery)
                : [];

              return (
                <div
                  key={r.key}
                  className="rounded-lg border border-border bg-card p-5 transition-all hover:border-gold shadow-xs"
                >
                  {/* Top Bar: Reference & Surah Name */}
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-3 mb-3">
                    <span className="font-semibold text-sm text-foreground">
                      {r.surahName ? `${r.surahName} ` : ""}
                      <span className="text-primary font-mono">{r.key}</span>
                    </span>
                    <Link
                      href={`/quran/${r.surah}#ayah-${r.n}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Read in context <ArrowRight size={13} />
                    </Link>
                  </div>

                  {/* Arabic Text with Highlights */}
                  {r.arabic && (
                    <div
                      className="text-right font-serif text-xl sm:text-2xl leading-relaxed text-foreground my-2"
                      dir="rtl"
                    >
                      {arabicParts.map((p, idx) =>
                        p.match ? (
                          <mark
                            key={idx}
                            className="bg-primary/20 text-foreground font-semibold px-0.5 rounded"
                          >
                            {p.text}
                          </mark>
                        ) : (
                          <span key={idx}>{p.text}</span>
                        )
                      )}
                    </div>
                  )}

                  {/* Translation Text with Highlights */}
                  {r.translation && (
                    <div className="text-sm text-muted-foreground leading-relaxed mt-2">
                      {transParts.map((p, idx) =>
                        p.match ? (
                          <mark
                            key={idx}
                            className="bg-primary/20 text-foreground font-semibold px-0.5 rounded"
                          >
                            {p.text}
                          </mark>
                        ) : (
                          <span key={idx}>{p.text}</span>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading more..." : "Load more results"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
