"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Clock,
  Sunrise,
  Sunset,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useTheme } from "@/components/shared";
import {
  getAdhkarByCategory,
  getCategoryMeta,
  searchAdhkar,
} from "@/lib/adhkar/data";
import { ADHKAR_CATEGORIES, type AdhkarCategory, type AdhkarItem } from "@/lib/adhkar/types";
import {
  loadAdhkarPreferences,
  saveAdhkarPreferences,
  getDhikrRemaining,
  resetCategoryCounters,
  saveOfflineAdhkar,
  isAdhkarOffline,
  DEFAULT_PREFERENCES,
  type AdhkarPreferences,
} from "@/lib/adhkar/storage";
import { DhikrCard } from "@/components/adhkar/DhikrCard";
import { CategoryProgressBar } from "@/components/adhkar/CategoryProgressBar";
import { AdhkarSettingsDrawer } from "@/components/adhkar/AdhkarSettingsDrawer";
import { AdhkarFooter } from "@/components/adhkar/AdhkarFooter";
import { ReminderBanner } from "@/components/adhkar/ReminderBanner";

function renderCategoryIcon(iconName: string) {
  switch (iconName) {
    case "Sunrise":
      return <Sunrise size={20} className="text-amber-500" />;
    case "Sunset":
      return <Sunset size={20} className="text-indigo-400" />;
    case "Moon":
      return <Moon size={20} className="text-purple-400" />;
    case "Sun":
      return <Sun size={20} className="text-amber-400" />;
    case "Clock":
    default:
      return <Clock size={20} className="text-emerald-500" />;
  }
}

export default function AdhkarCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const resolvedParams = use(params);
  const categorySlug = resolvedParams.category as AdhkarCategory;
  const meta = getCategoryMeta(categorySlug);

  if (!meta) {
    notFound();
  }

  const allItems = useMemo(() => getAdhkarByCategory(categorySlug), [categorySlug]);
  const [searchQuery, setSearchQuery] = useState("");
  const [prefs, setPrefs] = useState<AdhkarPreferences>(DEFAULT_PREFERENCES);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [countsMap, setCountsMap] = useState<Record<string, number>>({});
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const themeHook = useTheme();

  // Load preferences and remaining counts for all items today
  useEffect(() => {
    setPrefs(loadAdhkarPreferences());
    const map: Record<string, number> = {};
    for (const item of allItems) {
      map[item.id] = getDhikrRemaining(item.id, item.repeat);
    }
    setCountsMap(map);
    isAdhkarOffline().then(setIsOfflineCached);
  }, [allItems]);

  const handleCountChange = (id: string, newRemaining: number) => {
    setCountsMap((prev) => ({
      ...prev,
      [id]: newRemaining,
    }));
  };

  const handleResetCategory = () => {
    if (confirm("Reset all counters in this category for today?")) {
      resetCategoryCounters(allItems);
      const map: Record<string, number> = {};
      for (const item of allItems) {
        map[item.id] = item.repeat;
      }
      setCountsMap(map);
      showToast("Counters reset to initial repeats");
    }
  };

  const handleDownloadOffline = async () => {
    try {
      await saveOfflineAdhkar(allItems);
      setIsOfflineCached(true);
      showToast("Adhkar saved locally for 100% offline access!");
    } catch {
      showToast("Could not save to offline storage");
    }
  };

  const handleUpdatePrefs = (updated: Partial<AdhkarPreferences>) => {
    const next = saveAdhkarPreferences(updated);
    setPrefs(next);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter items by search query
  const filteredItems = useMemo(() => {
    return searchAdhkar(searchQuery, allItems);
  }, [searchQuery, allItems]);

  // Calculate completed count
  const completedCount = useMemo(() => {
    return allItems.filter((item) => (countsMap[item.id] ?? item.repeat) === 0).length;
  }, [allItems, countsMap]);

  // Find next and previous category
  const currentIndex = ADHKAR_CATEGORIES.findIndex((c) => c.slug === categorySlug);
  const prevCat = currentIndex > 0 ? ADHKAR_CATEGORIES[currentIndex - 1] : null;
  const nextCat =
    currentIndex < ADHKAR_CATEGORIES.length - 1 ? ADHKAR_CATEGORIES[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation / Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/adhkar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
            <span>All Adhkar Categories</span>
          </Link>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 bg-card hover:bg-muted transition-colors"
          >
            <SlidersHorizontal size={13} />
            <span>Customize</span>
          </button>
        </div>

        {/* Category Header */}
        <header className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-muted flex items-center justify-center">
                  {renderCategoryIcon(meta.icon)}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {meta.title}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {meta.description}
              </p>
            </div>

            <div
              dir="rtl"
              lang="ar"
              className="font-quran text-2xl sm:text-3xl text-primary font-semibold sm:text-left self-start sm:self-center"
            >
              {meta.titleArabic}
            </div>
          </div>

          {meta.suggestedTime && (
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Recitation Window:</span>
              <span className="font-semibold text-foreground">{meta.suggestedTime}</span>
            </div>
          )}
        </header>

        {/* Sticky Progress Bar */}
        <CategoryProgressBar
          meta={meta}
          completedCount={completedCount}
          totalCount={allItems.length}
          onOpenSettings={() => setSettingsOpen(true)}
          onResetCategory={handleResetCategory}
          onDownloadOffline={handleDownloadOffline}
          isOfflineCached={isOfflineCached}
        />

        {/* Search Bar */}
        <div className="relative my-5">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            placeholder="Search within this category (Arabic or English)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-2 focus:outline-primary transition-all"
          />
        </div>

        {/* Adhkar Cards List */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground">
                No adhkar matched &ldquo;{searchQuery}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <DhikrCard
                key={item.id}
                item={item}
                remaining={countsMap[item.id] ?? item.repeat}
                onCountChange={handleCountChange}
                prefs={prefs}
              />
            ))
          )}
        </div>

        {/* Bottom Category Navigation */}
        <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-4">
          {prevCat ? (
            <Link
              href={`/adhkar/${prevCat.slug}`}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={16} />
              <span>{prevCat.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {nextCat && (
            <Link
              href={`/adhkar/${nextCat.slug}`}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:opacity-85 transition-opacity"
            >
              <span>{nextCat.title}</span>
              <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </main>

      {/* Settings Drawer */}
      <AdhkarSettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onUpdatePrefs={handleUpdatePrefs}
        themeMode={themeHook.themeMode}
        setThemeMode={themeHook.setThemeMode}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-xs sm:text-sm font-medium shadow-xl animate-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 size={16} className="text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Active Reminder Banner */}
      <ReminderBanner />

      {/* Adhkar Footer */}
      <AdhkarFooter />
    </div>
  );
}
