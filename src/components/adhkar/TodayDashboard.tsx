"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Sunrise,
  Sunset,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Calendar,
} from "lucide-react";
import type { PrayerTimings, PrayerName } from "@/lib/prayer-times/types";
import { formatPrayerDisplayTime } from "@/lib/prayer-times/client";
import {
  loadTodayDashboardState,
  markPrayerAdhkarDone,
  markWindowAdhkarDone,
  getWeeklyHistory,
  evaluateItemStatus,
  type DailyStatus,
  type TodayDashboardState,
} from "@/lib/adhkar/tracking";

interface TodayDashboardProps {
  timings: PrayerTimings;
  onRefreshStreak?: () => void;
}

const SALAH_PRAYERS: { name: PrayerName; arabic: string }[] = [
  { name: "Fajr", arabic: "الفجر" },
  { name: "Dhuhr", arabic: "الظهر" },
  { name: "Asr", arabic: "العصر" },
  { name: "Maghrib", arabic: "المغرب" },
  { name: "Isha", arabic: "العشاء" },
];

export function TodayDashboard({ timings, onRefreshStreak }: TodayDashboardProps) {
  const [dashboard, setDashboard] = useState<TodayDashboardState>(loadTodayDashboardState());
  const [weeklyHistory, setWeeklyHistory] = useState<TodayDashboardState[]>([]);

  useEffect(() => {
    setDashboard(loadTodayDashboardState());
    setWeeklyHistory(getWeeklyHistory());
  }, []);

  const handleMarkPrayerDone = (e: React.MouseEvent, prayer: PrayerName) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = markPrayerAdhkarDone(prayer);
    setDashboard(updated);
    onRefreshStreak?.();
  };

  const handleMarkWindowDone = (e: React.MouseEvent, windowName: "morning" | "evening") => {
    e.stopPropagation();
    e.preventDefault();
    const updated = markWindowAdhkarDone(windowName);
    setDashboard(updated);
    onRefreshStreak?.();
  };

  // Evaluate dynamic status
  const getEvaluatedStatus = (prayer: PrayerName): DailyStatus => {
    const rawStatus = dashboard.prayers[prayer] || "pending";
    if (rawStatus === "done") return "done";
    const time = timings[prayer];
    return time ? evaluateItemStatus(rawStatus, time, 120) : rawStatus;
  };

  const morningEvaluated = dashboard.morningStatus === "done"
    ? "done"
    : timings.Sunrise
    ? evaluateItemStatus(dashboard.morningStatus, timings.Sunrise, 60)
    : "pending";

  const eveningEvaluated = dashboard.eveningStatus === "done"
    ? "done"
    : timings.Maghrib
    ? evaluateItemStatus(dashboard.eveningStatus, timings.Maghrib, 60)
    : "pending";

  // Check if there are any missed reminders today
  const missedPrayers = SALAH_PRAYERS.filter((p) => getEvaluatedStatus(p.name) === "missed");
  const isMorningMissed = morningEvaluated === "missed";
  const isEveningMissed = eveningEvaluated === "missed";
  const hasMissed = missedPrayers.length > 0 || isMorningMissed || isEveningMissed;

  const renderStatusBadge = (status: DailyStatus) => {
    switch (status) {
      case "done":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            <CheckCircle2 size={12} strokeWidth={2.5} />
            <span>Done ✓</span>
          </span>
        );
      case "missed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle size={12} />
            <span>Missed</span>
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Clock size={12} />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <section
      aria-label="Today's Adhkar Tracking Dashboard"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Today&apos;s Adhkar Schedule & Tracking
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Track completion across your 5 daily prayers and morning/evening windows
          </p>
        </div>

        {/* Weekly Mini Streak */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/40 p-2 rounded-xl border border-border/60">
          <Calendar size={14} className="text-muted-foreground ml-1 mr-1" />
          <span className="text-[11px] text-muted-foreground font-semibold mr-1.5">7-Day History:</span>
          {Array.from({ length: 7 }).map((_, idx) => {
            const histItem = weeklyHistory[idx];
            const isFinished = histItem?.morningStatus === "done" && histItem?.eveningStatus === "done";
            return (
              <span
                key={idx}
                title={histItem ? `${histItem.date}: ${isFinished ? "Completed" : "Partial"}` : "No record"}
                className={`size-2.5 rounded-full transition-colors ${
                  isFinished
                    ? "bg-primary"
                    : histItem
                    ? "bg-amber-500/70"
                    : "bg-muted-foreground/30"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Missed Reminders Notice if any */}
      {hasMissed && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-700 dark:text-amber-300">
              Catch up on missed remembrances:
            </span>{" "}
            <span className="text-amber-900/80 dark:text-amber-200/80">
              {isMorningMissed ? "Morning Adhkar, " : ""}
              {isEveningMissed ? "Evening Adhkar, " : ""}
              {missedPrayers.map((p) => `After-${p.name}`).join(", ")}
              {". "}You can still recite and mark them completed below!
            </span>
          </div>
        </div>
      )}

      {/* Morning & Evening Windows Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Morning Window */}
        <Link
          href="/adhkar/morning"
          className="group flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sunrise size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                Morning Adhkar
              </div>
              <div className="text-[11px] text-muted-foreground">
                Fajr ({timings.Fajr}) to Sunrise ({timings.Sunrise})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {renderStatusBadge(morningEvaluated)}
            {morningEvaluated !== "done" && (
              <button
                type="button"
                onClick={(e) => handleMarkWindowDone(e, "morning")}
                className="rounded-lg bg-card border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors shadow-2xs"
              >
                Mark Done
              </button>
            )}
          </div>
        </Link>

        {/* Evening Window */}
        <Link
          href="/adhkar/evening"
          className="group flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Sunset size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                Evening Adhkar
              </div>
              <div className="text-[11px] text-muted-foreground">
                Asr ({timings.Asr}) to Maghrib ({timings.Maghrib})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {renderStatusBadge(eveningEvaluated)}
            {eveningEvaluated !== "done" && (
              <button
                type="button"
                onClick={(e) => handleMarkWindowDone(e, "evening")}
                className="rounded-lg bg-card border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors shadow-2xs"
              >
                Mark Done
              </button>
            )}
          </div>
        </Link>
      </div>

      {/* 5 Prayers After-Salah Rows */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Post-Prayer Supplications (5 Obligatory Prayers)
        </div>

        <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
          {SALAH_PRAYERS.map(({ name, arabic }) => {
            const status = getEvaluatedStatus(name);
            const prayerTime = timings[name] || "00:00";

            return (
              <div
                key={name}
                className="flex items-center justify-between p-3.5 text-xs sm:text-sm hover:bg-muted/30 transition-colors"
              >
                <Link
                  href={`/adhkar/after-salah?prayer=${name.toLowerCase()}`}
                  className="flex items-center gap-3 flex-1 group"
                >
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                    After {name}
                  </span>
                  <span
                    dir="rtl"
                    lang="ar"
                    className="font-quran text-xs text-primary/80 hidden sm:inline"
                  >
                    {arabic}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ({formatPrayerDisplayTime(prayerTime, true)})
                  </span>
                </Link>

                <div className="flex items-center gap-2.5">
                  {renderStatusBadge(status)}

                  {status !== "done" ? (
                    <button
                      type="button"
                      onClick={(e) => handleMarkPrayerDone(e, name)}
                      className="rounded-lg bg-card border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors shadow-2xs"
                    >
                      Mark Done
                    </button>
                  ) : (
                    <Link
                      href={`/adhkar/after-salah?prayer=${name.toLowerCase()}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
