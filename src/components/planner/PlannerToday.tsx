"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  CheckCircle2,
  Circle,
  BookOpen,
  Headphones,
  RotateCcw,
  AlertTriangle,
  Play,
  Pause,
  Settings,
  BarChart3,
  Calendar,
  Layers,
  ChevronRight,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { PlannerPlan, PlannerUnit, UnitRecord, DailySchedule, StrengthRating, SabaqCompletion } from "@/lib/planner/types";
import { getPaceEstimate } from "@/lib/planner/pace";
import { generateMushafUnits } from "@/lib/planner/mushaf-grid";
import { generateToday, togglePausePlan, skipDay, setBacklogSpread } from "@/lib/planner/scheduler";
import { applyRevisionRating, applySabaqResult, addDays } from "@/lib/planner/spaced-repetition";
import {
  loadPlan,
  savePlan,
  loadRecords,
  saveRecords,
  calculatePlannerStats,
} from "@/lib/planner/storage";
import { PracticeModal } from "./PracticeModal";
import { MasteryCheckModal } from "./MasteryCheckModal";
import { MasteryVerdict } from "@/lib/planner/mastery-quiz";
import { getOfflineMushafPage } from "@/lib/offline/db";
import { MushafLine } from "@/lib/mushaf/types";

export function PlannerToday() {
  const [plan, setPlan] = useState<PlannerPlan | null>(null);
  const [records, setRecords] = useState<Record<string, UnitRecord>>({});
  const [allUnits, setAllUnits] = useState<PlannerUnit[]>([]);
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [stats, setStats] = useState<any | null>(null);

  // Time-travel / dev date state
  const [currentDate, setCurrentDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Active Practice modal unit
  const [practiceUnit, setPracticeUnit] = useState<PlannerUnit | null>(null);

  // Rating modal/prompt state
  const [ratingTarget, setRatingTarget] = useState<{
    unit: PlannerUnit;
    type: "sabaq" | "sabqi" | "manzil";
  } | null>(null);

  // Mushaf lines for the unit currently being verified
  const [verificationLines, setVerificationLines] = useState<MushafLine[]>([]);

  useEffect(() => {
    if (!ratingTarget?.unit) {
      setVerificationLines([]);
      return;
    }
    let active = true;
    const pageNum = ratingTarget.unit.startPage;
    getOfflineMushafPage(pageNum).then((offlineData) => {
      if (!active) return;
      if (offlineData?.lines) {
        setVerificationLines(offlineData.lines);
      } else {
        fetch(`/api/quran/mushaf?page=${pageNum}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!active) return;
            setVerificationLines(data?.lines || []);
          })
          .catch(() => {});
      }
    });
    return () => {
      active = false;
    };
  }, [ratingTarget?.unit?.startPage]);

  // Load plan and records on mount
  useEffect(() => {
    const p = loadPlan();
    setPlan(p);
    const r = loadRecords();
    setRecords(r);
  }, []);

  // Generate units and schedule whenever plan, records, or currentDate changes
  useEffect(() => {
    if (!plan) return;
    const units = generateMushafUnits(plan.dailyLessonSize, plan.direction);
    setAllUnits(units);

    const sched = generateToday(plan, units, currentDate, records);
    setSchedule(sched);

    const st = calculatePlannerStats(plan, units, records, currentDate);
    setStats(st);
  }, [plan, records, currentDate]);

  const handleTogglePause = () => {
    if (!plan) return;
    const updated = togglePausePlan(plan);
    setPlan(updated);
    savePlan(updated);
  };

  const handleSkipToday = () => {
    if (!plan) return;
    const updated = skipDay(plan, currentDate);
    setPlan(updated);
    savePlan(updated);
  };

  const handleBacklogSpread = (spreadDays: 3 | 5 | 7) => {
    if (!plan) return;
    const updated = setBacklogSpread(plan, spreadDays);
    setPlan(updated);
    savePlan(updated);
  };

  const handleSabaqChoice = (choice: "yes" | "partly") => {
    if (!ratingTarget || !ratingTarget.unit) return;
    const unitId = ratingTarget.unit.id;
    const currentRec: UnitRecord = records[unitId] || {
      id: unitId,
      status: "new",
      interval: 1,
      strength: "okay",
      history: [],
    };

    const nextRec = applySabaqResult(currentRec, choice, currentDate);
    const updatedRecords = { ...records, [unitId]: nextRec };
    setRecords(updatedRecords);
    saveRecords(updatedRecords);
    setRatingTarget(null);
  };

  const handleRevisionRating = (rating: StrengthRating) => {
    if (!ratingTarget || !ratingTarget.unit) return;
    const unitId = ratingTarget.unit.id;
    const currentRec: UnitRecord = records[unitId] || {
      id: unitId,
      status: "learning",
      interval: 1,
      strength: "okay",
      history: [],
    };

    const taskType = ratingTarget.type === "manzil" ? "manzil" : "sabqi";
    const nextRec = applyRevisionRating(currentRec, rating, currentDate, taskType);
    const updatedRecords = { ...records, [unitId]: nextRec };
    setRecords(updatedRecords);
    saveRecords(updatedRecords);
    setRatingTarget(null);
  };

  const handleMasteryComplete = (verdict: MasteryVerdict) => {
    if (!ratingTarget || !ratingTarget.unit) return;
    if (ratingTarget.type === "sabaq") {
      handleSabaqChoice(verdict.sabaqResult);
    } else {
      handleRevisionRating(verdict.rating);
    }
  };

  const handleManualOverride = (rating: StrengthRating | SabaqCompletion) => {
    if (!ratingTarget || !ratingTarget.unit) return;
    if (ratingTarget.type === "sabaq") {
      handleSabaqChoice(rating as SabaqCompletion);
    } else {
      handleRevisionRating(rating as StrengthRating);
    }
  };

  // If no plan, render empty state
  if (!plan) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <BookOpen size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Hifz & Muraja'ah Planner
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Organize your daily Quran memorization and revision into three clear, achievable tasks:
            Sabaq (new lesson), Sabqi (recent revision), and Manzil (cycle revision).
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/planner/setup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
          >
            Create Your Plan <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const isTodayCompleted = schedule ? schedule.allCompleted : false;
  const completedCount = schedule ? schedule.completedIds.length : 0;
  const totalTasksCount =
    (schedule?.sabaq ? 1 : 0) + (schedule?.sabqi.length || 0) + (schedule?.manzil.length || 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Top Header & Streak */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Today's Schedule
            </span>
            <span className="text-border">·</span>
            <span className="text-xs text-muted-foreground font-mono">{currentDate}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5">
            Hifz & Muraja'ah
          </h1>
        </div>

        {/* Streak & Quick Navigation Links */}
        <div className="flex items-center gap-2">
          {stats && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold"
              title="Daily memorization streak"
            >
              <Flame size={15} className="fill-amber-500" />
              <span>{stats.currentStreak} day streak</span>
            </div>
          )}

          <Link
            href="/planner/progress"
            data-tour="planner-progress-link"
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-card hover:bg-muted transition-colors"
            title="View 604-Page Progress Grid"
          >
            <BarChart3 size={16} />
          </Link>

          <Link
            href="/planner/settings"
            data-tour="planner-settings-link"
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-card hover:bg-muted transition-colors"
            title="Planner Settings & Backup"
          >
            <Settings size={16} />
          </Link>
        </div>
      </div>

      {/* Backlog Alert Banner */}
      {schedule && schedule.backlog.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Backlog Notice
              </h4>
              <p className="text-xs text-foreground/90 mt-0.5">
                You have <strong>{schedule.backlog.length} overdue portions</strong> from missed days. They are prioritized below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            <span className="text-[11px] text-muted-foreground mr-1 hidden sm:inline">Spread:</span>
            {[3, 5, 7].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => handleBacklogSpread(days as 3 | 5 | 7)}
                className="px-2 py-1 rounded bg-background border border-amber-500/30 hover:bg-amber-500/20 text-xs font-medium"
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paused / Skipped Notice */}
      {plan.paused && (
        <div className="p-4 rounded-xl border border-border bg-muted/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            Your plan is currently paused.
          </span>
          <button
            type="button"
            onClick={handleTogglePause}
            className="text-xs font-bold text-primary hover:underline"
          >
            Resume Plan
          </button>
        </div>
      )}

      {schedule?.isSkipped && (
        <div className="p-4 rounded-xl border border-border bg-muted/40">
          <span className="text-xs text-muted-foreground font-medium">
            Today was marked as skipped. Take your time to rest or catch up on revision!
          </span>
        </div>
      )}

      {/* Today Progress Overview Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
        <div>
          <span className="text-xs text-muted-foreground block font-medium">Daily Completion</span>
          <span className="text-base font-bold text-foreground">
            {completedCount} of {totalTasksCount} tasks completed
          </span>
        </div>
        <div className="h-2.5 w-32 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
            style={{ width: `${totalTasksCount > 0 ? (completedCount / totalTasksCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Three Main Tasks Grid */}
      <div className="space-y-4">
        {/* TASK 1: SABAQ (New Lesson) */}
        <div data-tour="planner-sabaq" className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="bg-emerald-500/10 dark:bg-emerald-950/20 px-5 py-3 border-b border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <h2 className="text-xs uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-300">
                1. Sabaq (New Lesson)
              </h2>
            </div>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              {plan.paceName || getPaceEstimate(plan.dailyLessonSize).defaultPaceName} · {getPaceEstimate(plan.dailyLessonSize).timeEstimate}
            </span>
          </div>

          <div className="p-5">
            {schedule?.sabaq ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-base font-bold text-foreground block">
                    {schedule.sabaq.label}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Memorize these lines today. Repeat each verse 3–10 times until fluent.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/mushaf/${schedule.sabaq.startPage}?lines=${schedule.sabaq.startLine}-${schedule.sabaq.endLine}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                  >
                    <BookOpen size={13} className="text-primary" /> Mushaf
                  </Link>

                  <button
                    type="button"
                    onClick={() => setPracticeUnit(schedule.sabaq)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                  >
                    <Headphones size={13} className="text-primary" /> Practice
                  </button>

                  <button
                    type="button"
                    onClick={() => setRatingTarget({ unit: schedule.sabaq!, type: "sabaq" })}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      schedule.completedIds.includes(schedule.sabaq.id)
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    <Sparkles size={14} />
                    {schedule.completedIds.includes(schedule.sabaq.id) ? "Mastered ✓" : "Verify Mastery"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-2">
                No new Sabaq scheduled for today (Rest / Revision day).
              </div>
            )}
          </div>
        </div>

        {/* TASK 2: SABQI (Recent Revision) */}
        <div data-tour="planner-sabqi" className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="bg-sky-500/10 dark:bg-sky-950/20 px-5 py-3 border-b border-sky-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
              <h2 className="text-xs uppercase font-bold tracking-wider text-sky-800 dark:text-sky-300">
                2. Sabqi (Recent Revision · Last {plan.sabqiDays || 5} Days)
              </h2>
            </div>
            <span className="text-[11px] font-medium text-sky-700 dark:text-sky-400">
              {schedule?.sabqi.length || 0} portions
            </span>
          </div>

          <div className="p-5 divide-y divide-border/60">
            {schedule && schedule.sabqi.length > 0 ? (
              schedule.sabqi.map((u) => {
                const rec = records[u.id];
                const isDone = schedule.completedIds.includes(u.id);

                return (
                  <div
                    key={u.id}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{u.label}</span>
                        {rec?.strength === "weak" && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400">
                            Needs Review
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground block">
                        Last revised: {rec?.lastRevised || "Never"} · Interval: {rec?.interval || 1}d
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/mushaf/${u.startPage}?lines=${u.startLine}-${u.endLine}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                      >
                        <BookOpen size={13} className="text-primary" /> Mushaf
                      </Link>

                      <button
                        type="button"
                        onClick={() => setPracticeUnit(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                      >
                        <Headphones size={13} className="text-primary" /> Practice
                      </button>

                      <button
                        type="button"
                        onClick={() => setRatingTarget({ unit: u, type: "sabqi" })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isDone
                            ? "bg-sky-600 text-white"
                            : "bg-sky-600/10 text-sky-600 hover:bg-sky-600 hover:text-white"
                        }`}
                      >
                        <Sparkles size={13} />
                        {isDone ? "Mastered ✓" : "Verify"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-xs text-muted-foreground py-2">
                No recent Sabqi portions yet. Once you complete your first lessons, they will appear here.
              </div>
            )}
          </div>
        </div>

        {/* TASK 3: MANZIL (Old Revision Cycle) */}
        <div data-tour="planner-manzil" className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="bg-purple-500/10 dark:bg-purple-950/20 px-5 py-3 border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <h2 className="text-xs uppercase font-bold tracking-wider text-purple-800 dark:text-purple-300">
                3. Manzil (Cumulative Revision · {plan.manzilCycleDays || 30}-Day Cycle)
              </h2>
            </div>
            <span className="text-[11px] font-medium text-purple-700 dark:text-purple-400">
              {schedule?.manzil.length || 0} portions
            </span>
          </div>

          <div className="p-5 divide-y divide-border/60">
            {schedule && schedule.manzil.length > 0 ? (
              schedule.manzil.map((u) => {
                const rec = records[u.id];
                const isDone = schedule.completedIds.includes(u.id);

                return (
                  <div
                    key={u.id}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{u.label}</span>
                        {rec?.strength === "weak" && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400">
                            Weak
                          </span>
                        )}
                        {rec?.nextDue && rec.nextDue < currentDate && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            Overdue
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground block">
                        Last revised: {rec?.lastRevised || "Never"} · Interval: {rec?.interval || 1}d
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/mushaf/${u.startPage}?lines=${u.startLine}-${u.endLine}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                      >
                        <BookOpen size={13} className="text-primary" /> Mushaf
                      </Link>

                      <button
                        type="button"
                        onClick={() => setPracticeUnit(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                      >
                        <Headphones size={13} className="text-primary" /> Practice
                      </button>

                      <button
                        type="button"
                        onClick={() => setRatingTarget({ unit: u, type: "manzil" })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isDone
                            ? "bg-purple-600 text-white"
                            : "bg-purple-600/10 text-purple-600 hover:bg-purple-600 hover:text-white"
                        }`}
                      >
                        <Sparkles size={13} />
                        {isDone ? "Mastered ✓" : "Verify"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-xs text-muted-foreground py-2">
                No older Manzil portions scheduled for today.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Mastery Verification Modal */}
      {ratingTarget && (
        <MasteryCheckModal
          isOpen={Boolean(ratingTarget)}
          unit={ratingTarget.unit}
          unitType={ratingTarget.type}
          pageLines={verificationLines}
          onClose={() => setRatingTarget(null)}
          onComplete={handleMasteryComplete}
          onManualOverride={handleManualOverride}
        />
      )}

      {/* Practice / Listening Modal */}
      <PracticeModal
        unit={practiceUnit}
        isOpen={practiceUnit !== null}
        onClose={() => setPracticeUnit(null)}
        onVerifyMastery={(u) => {
          const type =
            schedule?.sabaq?.id === u.id
              ? "sabaq"
              : schedule?.manzil?.some((m) => m.id === u.id)
              ? "manzil"
              : "sabqi";
          setPracticeUnit(null);
          setRatingTarget({ unit: u, type });
        }}
      />

      {/* DEV TIME-TRAVEL TOOL (Only enabled in dev mode) */}
      {process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true" && (
        <div className="mt-12 p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-primary">
            <span>Dev Time-Travel & Simulator</span>
            <span>Simulated Date: {currentDate}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
              className="px-2 py-1 rounded bg-background border border-border"
            >
              -1 Day
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="px-2 py-1 rounded bg-background border border-border"
            >
              +1 Day
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="px-2 py-1 rounded bg-background border border-border"
            >
              +1 Week (Simulate Missed Days)
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date().toISOString().split("T")[0])}
              className="px-2 py-1 rounded bg-primary text-primary-foreground font-semibold"
            >
              Reset to Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
