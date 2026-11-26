"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sunrise,
  Sunset,
  Moon,
  Sun,
  BookOpen,
  Search,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  ArrowRight,
  Download,
  Clock,
  ChevronRight,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useTheme } from "@/components/shared";
import {
  ADHKAR_CATEGORIES,
  type AdhkarCategory,
  type AdhkarItem,
} from "@/lib/adhkar/types";
import {
  getAllAdhkar,
  getAdhkarByCategory,
  getSuggestedCategory,
  searchAdhkar,
} from "@/lib/adhkar/data";
import {
  loadAdhkarPreferences,
  saveAdhkarPreferences,
  calculateStreak,
  saveOfflineAdhkar,
  isAdhkarOffline,
  getCategoryProgress,
  DEFAULT_PREFERENCES,
  type AdhkarPreferences,
} from "@/lib/adhkar/storage";
import { AdhkarSettingsDrawer } from "@/components/adhkar/AdhkarSettingsDrawer";
import { DhikrCard } from "@/components/adhkar/DhikrCard";
import { PrayerTimesCard } from "@/components/prayer-times/PrayerTimesCard";
import { PrayerSettingsSheet } from "@/components/prayer-times/PrayerSettingsSheet";
import { LocationPrePromptCard } from "@/components/prayer-times/LocationPrePromptCard";
import { TodayDashboard } from "@/components/adhkar/TodayDashboard";
import { ReminderBanner } from "@/components/adhkar/ReminderBanner";
import { AdhkarFooter } from "@/components/adhkar/AdhkarFooter";
import { DevTimeTravelTool } from "@/components/adhkar/DevTimeTravelTool";
import { AdhkarAudioProvider, useAdhkarAudio } from "@/lib/adhkar/audio-context";
import { AdhkarMiniPlayer } from "@/components/adhkar/AdhkarMiniPlayer";
import { ReportAudioModal } from "@/components/adhkar/ReportAudioModal";
import {
  loadPrayerSettings,
  savePrayerSettings,
  getTodayPrayerTimes,
  requestRoundedGeolocation,
} from "@/lib/prayer-times/client";
import {
  DEFAULT_PRAYER_SETTINGS,
  type PrayerSettings,
  type PrayerTimings,
  type PrayerLocation,
} from "@/lib/prayer-times/types";

function renderCategoryIcon(iconName: string) {
  switch (iconName) {
    case "Sunrise":
      return <Sunrise size={22} className="text-amber-500" />;
    case "Sunset":
      return <Sunset size={22} className="text-indigo-400" />;
    case "Moon":
      return <Moon size={22} className="text-purple-400" />;
    case "Sun":
      return <Sun size={22} className="text-amber-400" />;
    case "Clock":
    default:
      return <Clock size={22} className="text-emerald-500" />;
  }
}

function AdhkarHubContent() {
  const { reportAudioItem, setReportAudioItem } = useAdhkarAudio();
  const [prefs, setPrefs] = useState<AdhkarPreferences>(DEFAULT_PREFERENCES);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [streakData, setStreakData] = useState({ currentStreak: 0, bestStreak: 0, todayActive: false });
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);

  // Prayer Times State
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings>(DEFAULT_PRAYER_SETTINGS);
  const [prayerTimings, setPrayerTimings] = useState<PrayerTimings | null>(null);
  const [prayerSettingsOpen, setPrayerSettingsOpen] = useState(false);

  const themeHook = useTheme();
  const allAdhkar = useMemo(() => getAllAdhkar(), []);

  // Load Prayer Times & Preferences on mount to prevent hydration mismatch
  useEffect(() => {
    let mounted = true;
    setPrefs(loadAdhkarPreferences());
    const s = loadPrayerSettings();
    setPrayerSettings(s);
    getTodayPrayerTimes(s)
      .then((t) => {
        if (mounted) setPrayerTimings(t);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdatePrayerSettings = async (updated: Partial<PrayerSettings>) => {
    const next = savePrayerSettings(updated);
    setPrayerSettings(next);
    const t = await getTodayPrayerTimes(next);
    setPrayerTimings(t);
  };

  const handleLocationSaved = async (loc: PrayerLocation) => {
    await handleUpdatePrayerSettings({ location: loc });
    showToast(`Location set to ${loc.city}. Prayer times updated!`);
  };

  const handleDetectLocation = async () => {
    try {
      const loc = await requestRoundedGeolocation();
      await handleLocationSaved(loc);
    } catch (err: any) {
      setPrayerSettingsOpen(true);
      showToast(err?.message || "Location access unavailable.");
    }
  };

  // Time-based suggestion
  const suggested = useMemo(() => getSuggestedCategory(), []);
  const suggestedMeta = ADHKAR_CATEGORIES.find((c) => c.slug === suggested.category);

  useEffect(() => {
    setStreakData(calculateStreak());
    isAdhkarOffline().then(setIsOfflineCached);
  }, [progressRefreshKey]);

  const handleUpdatePrefs = (updated: Partial<AdhkarPreferences>) => {
    const next = saveAdhkarPreferences(updated);
    setPrefs(next);
  };

  const handleDownloadAllOffline = async () => {
    try {
      await saveOfflineAdhkar(allAdhkar);
      setIsOfflineCached(true);
      showToast("All 106 Adhkar & Du'as saved locally for offline use!");
    } catch {
      showToast("Could not save to offline storage");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tolerant search across all 106 items
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchAdhkar(searchQuery, allAdhkar);
  }, [searchQuery, allAdhkar]);

  // Compute category progress for each category card
  const categoryProgress = useMemo(() => {
    const map: Record<AdhkarCategory, { completed: number; total: number; percentage: number }> = {} as any;
    for (const cat of ADHKAR_CATEGORIES) {
      const items = getAdhkarByCategory(cat.slug);
      map[cat.slug] = getCategoryProgress(cat.slug, items);
    }
    return map;
  }, [progressRefreshKey]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
        {/* Top Header & Hero with Du'a Supplication Image */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] p-4 sm:p-6 lg:p-7 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_260px] gap-5 sm:gap-6 items-center">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-primary/10 text-primary">
                  <BookOpen size={12} />
                  <span>Hisn al-Muslim & Authentic Sunnah</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-muted text-muted-foreground">
                  <Clock size={11} />
                  <span>Daily Remembrance</span>
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
                Daily Adhkar & Supplications
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                Authentic morning, evening, and post-prayer adhkar with tap counters,
                evidence references, prayer schedules, and 100% offline support.
              </p>

              {/* Action Controls: Streak, Offline, Settings */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Streak Counter Chip */}
                <div
                  data-tour="adhkar-streak"
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-xs transition-colors ${
                    streakData.currentStreak > 0
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <Flame size={16} className={streakData.currentStreak > 0 ? "fill-amber-500" : ""} />
                  <div className="text-left">
                    <div className="text-xs font-bold leading-none">
                      {streakData.currentStreak} Day{streakData.currentStreak === 1 ? "" : "s"}
                    </div>
                    <div className="text-[10px] opacity-80 leading-tight">Streak</div>
                  </div>
                </div>

                {/* Offline Cache Button */}
                <button
                  type="button"
                  onClick={handleDownloadAllOffline}
                  title={isOfflineCached ? "All Adhkar saved for offline reading" : "Download all Adhkar offline"}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold shadow-xs transition-colors ${
                    isOfflineCached
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Download size={14} />
                  <span>
                    {isOfflineCached ? "Downloaded" : "Save Offline"}
                  </span>
                </button>

                {/* Settings Trigger */}
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Adhkar Settings"
                  className="grid size-9 place-items-center rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs"
                >
                  <SlidersHorizontal size={16} />
                </button>
              </div>
            </div>

            {/* Right Hero Image (Silhouette of Du'a through Arabesque Screen) */}
            <div className="relative h-44 sm:h-52 md:h-full min-h-[180px] w-full rounded-xl overflow-hidden border border-border/80 shadow-xs shrink-0 group">
              <Image
                src="/images/adhkar-hero.jpg"
                alt="Supplication and Du'a"
                fill
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 260px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-left">
                <span className="text-xs font-bold text-white/95 drop-shadow-xs block font-quran" dir="rtl">
                  وَٱذْكُر رَّبَّكَ فِي نَفْسِكَ
                </span>
                <span className="text-[10px] text-white/80 block mt-0.5">
                  “Remember your Lord within yourself”
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Soft Pre-Prompt Card (Milestone 4 / Part 2) */}
        <LocationPrePromptCard
          settings={prayerSettings}
          onLocationSaved={handleLocationSaved}
          onOpenCityPicker={() => setPrayerSettingsOpen(true)}
        />

        {/* Prayer Times Card (Milestone 4) */}
        {prayerTimings && (
          <div data-tour="adhkar-prayer-times" className="w-full">
            <PrayerTimesCard
              timings={prayerTimings}
              settings={prayerSettings}
              onOpenSettings={() => setPrayerSettingsOpen(true)}
              onDetectLocation={handleDetectLocation}
            />
          </div>
        )}

        {/* Today's Schedule & Tracking Dashboard (Milestone 5) */}
        {prayerTimings && (
          <div data-tour="adhkar-today-dashboard" className="w-full">
            <TodayDashboard
              timings={prayerTimings}
              onRefreshStreak={() => {
                setStreakData(calculateStreak());
                setProgressRefreshKey((k) => k + 1);
              }}
            />
          </div>
        )}

        {/* Time-Based Smart Suggestion Banner with Makkah Mosque Image & Premium Gradient */}
        {suggestedMeta && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 shadow-md group">
            {/* Background Image: Holy Mosque Architecture (Saudi Arabia Makkah) */}
            <Image
              src="/images/makkah-grand-mosque.jpg"
              alt="Holy Mosque of Makkah at Night"
              fill
              className="object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
            {/* Dark Professional Gradient Overlays for High Contrast & Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/85 to-black/70 sm:from-black/90 sm:via-black/80 sm:to-black/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 sm:hidden" />
            <div className="absolute inset-0 bg-emerald-950/20 mix-blend-color" />

            {/* Foreground Content */}
            <div className="relative z-10 p-4 sm:p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="size-11 sm:size-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 flex items-center justify-center shrink-0 shadow-inner">
                    {renderCategoryIcon(suggestedMeta.icon)}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 backdrop-blur-xs w-fit whitespace-nowrap">
                      <Clock size={11} className="text-emerald-300 shrink-0" />
                      <span>Suggested for this hour</span>
                    </span>
                    <span className="text-[11px] text-zinc-300/90 font-medium">
                      {suggested.reason}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-1 sm:pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                    <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight drop-shadow-xs">
                      {suggestedMeta.title}
                    </h2>
                    <span
                      dir="rtl"
                      lang="ar"
                      className="font-quran text-base sm:text-lg text-emerald-200/90 font-semibold drop-shadow-xs"
                    >
                      {suggestedMeta.titleArabic}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-200/90 max-w-xl leading-relaxed">
                    {suggestedMeta.description}
                  </p>
                </div>
              </div>

              <Link
                href={`/adhkar/${suggestedMeta.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs sm:text-sm px-5 py-3 shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/60 transition-all active:scale-[0.98] shrink-0 w-full sm:w-auto text-center"
              >
                <span>Open {suggestedMeta.title}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* Global Search across all Adhkar */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            placeholder="Search all 106 Adhkar (Arabic, English, topics)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card pl-11 pr-4 py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-2 focus:outline-primary transition-all shadow-xs"
          />
        </div>

        {/* If Search is Active: Display matching cards */}
        {searchQuery.trim() ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Found {searchResults.length} matching dhikr{searchResults.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-primary font-semibold hover:underline"
              >
                Clear search
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No adhkar found matching &ldquo;{searchQuery}&rdquo;.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try searching for keywords like &ldquo;kursi&rdquo;, &ldquo;morning&rdquo;, &ldquo;istighfar&rdquo;, or &ldquo;subhanallah&rdquo;.
                </p>
              </div>
            ) : (
              searchResults.map((item) => (
                <DhikrCard
                  key={item.id}
                  item={item}
                  remaining={item.repeat}
                  onCountChange={() => setProgressRefreshKey((k) => k + 1)}
                  prefs={prefs}
                />
              ))
            )}
          </div>
        ) : (
          /* Normal Category Grid View */
          <div className="space-y-6" data-tour="adhkar-categories">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                Adhkar Categories
              </h2>
              <span className="text-xs text-muted-foreground">
                6 Categories · 106 Total Adhkar
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ADHKAR_CATEGORIES.map((cat) => {
                const count = getAdhkarByCategory(cat.slug).length;
                const prog = categoryProgress[cat.slug] || { completed: 0, total: count, percentage: 0 };
                const isComplete = prog.completed === count && count > 0;

                return (
                  <Link
                    key={cat.slug}
                    href={`/adhkar/${cat.slug}`}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 transition-all duration-200 shadow-xs hover:border-primary/50 hover:shadow-md ${
                      isComplete
                        ? "border-primary/40 bg-primary/[0.03]"
                        : "border-border bg-card hover:bg-card/90"
                    }`}
                  >
                    <div>
                      {/* Top icon and counts */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="size-10 rounded-xl bg-muted flex items-center justify-center group-hover:scale-105 transition-transform">
                          {renderCategoryIcon(cat.icon)}
                        </div>

                        <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                          {count} Adhkar
                        </span>
                      </div>

                      {/* Titles */}
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {cat.title}
                      </h3>

                      <div
                        dir="rtl"
                        lang="ar"
                        className="font-quran text-lg text-primary/90 font-medium my-1.5"
                      >
                        {cat.titleArabic}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {cat.description}
                      </p>
                    </div>

                    {/* Progress Bar & CTA */}
                    <div className="mt-5 pt-3 border-t border-border/50 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Daily Progress</span>
                        <span className="font-semibold text-foreground">
                          {prog.completed} / {count} ({prog.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${prog.percentage}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
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

      {/* Prayer Settings Sheet */}
      <PrayerSettingsSheet
        isOpen={prayerSettingsOpen}
        onClose={() => setPrayerSettingsOpen(false)}
        settings={prayerSettings}
        onUpdateSettings={handleUpdatePrayerSettings}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-xs sm:text-sm font-medium shadow-xl animate-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 size={16} className="text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Active In-App Reminder Banner (Milestone 5) */}
      <ReminderBanner />

      {/* Adhkar Footer (Milestone 6) */}
      <AdhkarFooter />

      {/* Mini Audio Player */}
      <AdhkarMiniPlayer />

      {/* Report Audio Problem Modal */}
      <ReportAudioModal
        item={reportAudioItem}
        onClose={() => setReportAudioItem(null)}
      />

      {/* Dev Time Travel & Simulator Tool (Milestone 6) */}
      <DevTimeTravelTool
        onSimulateTime={(h, m) => {
          showToast(`Simulated time set to ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        }}
        onResetTime={() => {
          showToast("Simulated time reset to real time.");
        }}
      />
    </div>
  );
}

export default function AdhkarHubPage() {
  return (
    <AdhkarAudioProvider>
      <AdhkarHubContent />
    </AdhkarAudioProvider>
  );
}
