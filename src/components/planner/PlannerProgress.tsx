"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  Flame,
  CheckCircle2,
  Calendar,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { TOTAL_MUSHAF_PAGES, generateMushafUnits } from "@/lib/planner/mushaf-grid";
import { JUZS_META } from "@/lib/mushaf/data";
import { loadPlan, loadRecords, calculatePlannerStats } from "@/lib/planner/storage";
import { PlannerPlan, PlannerUnit, UnitRecord, PlannerProgressStats } from "@/lib/planner/types";

export function PlannerProgress() {
  const [plan, setPlan] = useState<PlannerPlan | null>(null);
  const [records, setRecords] = useState<Record<string, UnitRecord>>({});
  const [units, setUnits] = useState<PlannerUnit[]>([]);
  const [stats, setStats] = useState<PlannerProgressStats | null>(null);
  const [filter, setFilter] = useState<"all" | "memorized" | "learning" | "weak" | "new">("all");
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);

  useEffect(() => {
    const p = loadPlan();
    setPlan(p);
    const r = loadRecords();
    setRecords(r);

    const todayStr = new Date().toISOString().split("T")[0];
    const u = generateMushafUnits(p?.dailyLessonSize || 7, p?.direction || "forward");
    setUnits(u);

    const st = calculatePlannerStats(p, u, r, todayStr);
    setStats(st);
  }, []);

  // Compute status for each page (1 to 604)
  const pageStatusMap = new Map<number, "memorized" | "learning" | "weak" | "new">();

  for (let page = 1; page <= TOTAL_MUSHAF_PAGES; page++) {
    const pageUnits = units.filter((u) => u.startPage === page);
    if (pageUnits.length === 0) {
      pageStatusMap.set(page, "new");
      continue;
    }

    const statuses = pageUnits.map((u) => (records[u.id] ? records[u.id].status : "new"));

    if (statuses.some((s) => s === "weak")) {
      pageStatusMap.set(page, "weak");
    } else if (statuses.some((s) => s === "learning")) {
      pageStatusMap.set(page, "learning");
    } else if (statuses.every((s) => s === "memorized")) {
      pageStatusMap.set(page, "memorized");
    } else {
      pageStatusMap.set(page, "new");
    }
  }

  // Filtered pages
  let pagesToDisplay: number[] = [];
  for (let p = 1; p <= TOTAL_MUSHAF_PAGES; p++) {
    if (selectedJuz !== null) {
      const jMeta = JUZS_META[selectedJuz - 1];
      const nextJ = JUZS_META[selectedJuz];
      const endP = nextJ ? nextJ.start_page - 1 : 604;
      if (p < jMeta.start_page || p > endP) continue;
    }

    const st = pageStatusMap.get(p) || "new";
    if (filter === "all" || filter === st) {
      pagesToDisplay.push(p);
    }
  }

  const percentComplete = stats
    ? Math.round((stats.pagesMemorized / TOTAL_MUSHAF_PAGES) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/planner"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Back to Today
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
            Memorization Progress
          </h1>
        </div>

        {/* Action Link to settings */}
        <Link
          href="/planner/settings"
          className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors"
        >
          Planner Settings
        </Link>
      </div>

      {/* Primary Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Pages Memorized */}
          <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">
              Pages Memorized
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{stats.pagesMemorized}</span>
              <span className="text-xs text-muted-foreground">/ 604</span>
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {percentComplete}% of Mushaf
            </div>
          </div>

          {/* Juz Completed */}
          <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Juz Completed</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{stats.juzCompleted}</span>
              <span className="text-xs text-muted-foreground">/ 30</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats.juzCompleted === 30 ? "Full Quran Hafiz!" : `${30 - stats.juzCompleted} Juz to go`}
            </div>
          </div>

          {/* Current Streak */}
          <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Daily Streak</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.currentStreak}
              </span>
              <span className="text-xs text-muted-foreground">days</span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Flame size={12} className="text-amber-500 fill-amber-500" />
              <span>Best: {stats.bestStreak} days</span>
            </div>
          </div>

          {/* Revision Consistency */}
          <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">
              30-Day Consistency
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">
                {stats.consistencyLast30Days}%
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <TrendingUp size={12} className="text-emerald-500" />
              <span>Revision frequency</span>
            </div>
          </div>
        </div>
      )}

      {/* Estimated Completion Card */}
      {stats?.estimatedCompletionDate && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Pace Forecast
              </span>
              <p className="text-sm font-semibold text-foreground">
                Estimated completion:{" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {stats.estimatedCompletionDate}
                </span>
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Based on {plan?.dailyLessonSize || 7} lines/day and {plan?.studyDays.length || 7} study days/week
          </span>
        </div>
      )}

      {/* 604-Page Grid Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">604-Page Madani Mushaf Grid</h2>
            <p className="text-xs text-muted-foreground">
              Tap any page to open it directly in the Mushaf reader with tajweed and translations.
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-600" />
              <span className="text-muted-foreground">Memorized</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-sky-500" />
              <span className="text-muted-foreground">Learning</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500" />
              <span className="text-muted-foreground">Weak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs border border-border bg-card" />
              <span className="text-muted-foreground">Not Started</span>
            </div>
          </div>
        </div>

        {/* Filter and Juz jumping */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl border border-border bg-card text-xs">
            {(["all", "memorized", "learning", "weak", "new"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "new" ? "Not Started" : f}
              </button>
            ))}
          </div>

          {/* Juz Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Juz:</label>
            <select
              value={selectedJuz === null ? "" : selectedJuz}
              onChange={(e) =>
                setSelectedJuz(e.target.value === "" ? null : Number(e.target.value))
              }
              className="text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground font-medium"
            >
              <option value="">All 30 Juz</option>
              {JUZS_META.map((j) => (
                <option key={j.juz_number} value={j.juz_number}>
                  Juz {j.juz_number} (p. {j.start_page})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* The 604 Pages Grid */}
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-1.5 max-h-[460px] overflow-y-auto p-1">
            {pagesToDisplay.map((page) => {
              const st = pageStatusMap.get(page) || "new";

              let colorClass =
                "bg-muted/40 border-border/80 text-muted-foreground hover:border-foreground/40";
              if (st === "memorized") {
                colorClass =
                  "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-2xs";
              } else if (st === "learning") {
                colorClass =
                  "bg-sky-500 text-white border-sky-500 hover:bg-sky-600 shadow-2xs";
              } else if (st === "weak") {
                colorClass =
                  "bg-rose-500 text-white border-rose-500 hover:bg-rose-600 shadow-2xs";
              }

              return (
                <Link
                  key={page}
                  href={`/mushaf/${page}`}
                  title={`Page ${page} · ${st}`}
                  className={`flex items-center justify-center h-8 rounded-md border text-[11px] font-mono font-bold transition-transform hover:scale-105 ${colorClass}`}
                >
                  {page}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
