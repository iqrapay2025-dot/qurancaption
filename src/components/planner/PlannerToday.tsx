"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  CheckCircle2,
  BookOpen,
  Headphones,
  RotateCcw,
  AlertTriangle,
  Settings,
  BarChart3,
  Calendar,
  Layers,
  ChevronRight,
  ArrowRight,
  Check,
  Sparkles,
  LayoutGrid,
  Database,
  Users,
  Clock,
  FileText,
  Megaphone,
  User,
  Shield,
  Disc,
  Edit2,
  Compass,
  Award,
  Bookmark,
} from "lucide-react";
import {
  PlannerPlan,
  PlannerUnit,
  UnitRecord,
  DailySchedule,
  StrengthRating,
} from "@/lib/planner/types";
import { getPaceEstimate } from "@/lib/planner/pace";
import { generateMushafUnits } from "@/lib/planner/mushaf-grid";
import {
  generateToday,
  togglePausePlan,
  skipDay,
  setBacklogSpread,
} from "@/lib/planner/scheduler";
import {
  applyRevisionRating,
  applySabaqResult,
} from "@/lib/planner/spaced-repetition";
import {
  loadPlan,
  savePlan,
  loadRecords,
  saveRecords,
  calculatePlannerStats,
} from "@/lib/planner/storage";
import { useSession } from "@/lib/app/client";
import { Logo, ThemeToggle, useTheme } from "@/components/shared";
import { PracticeModal } from "./PracticeModal";

export function PlannerToday() {
  const { user } = useSession();
  const { dark, toggle, themeMode, setThemeMode } = useTheme();
  const [plan, setPlan] = useState<PlannerPlan | null>(null);
  const [records, setRecords] = useState<Record<string, UnitRecord>>({});
  const [allUnits, setAllUnits] = useState<PlannerUnit[]>([]);
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "sabaq" | "sabqi" | "manzil">("all");

  // User display name customization
  const [customName, setCustomName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempNameInput, setTempNameInput] = useState<string>("");

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

  // Load plan, records, and user preferences on mount
  useEffect(() => {
    const p = loadPlan();
    setPlan(p);
    const r = loadRecords();
    setRecords(r);

    if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem("qcs-qari-name") ||
        localStorage.getItem("qcs-user-name") ||
        localStorage.getItem("userName");
      if (saved) {
        setCustomName(saved);
        setTempNameInput(saved);
      }
    }
  }, []);

  // Update tempNameInput if user name loads from session
  useEffect(() => {
    if (!customName && user?.name) {
      setTempNameInput(user.name);
    }
  }, [user?.name, customName]);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const displayName = customName || user?.name || "Qari";

  // If no plan, render setup onboarding prompt
  if (!plan) {
    return (
      <div className="min-h-screen bg-[#b9d5c8] dark:bg-[#14231e] p-4 sm:p-8 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#15231e] p-6 sm:p-8 shadow-2xl border border-white/60 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <BookOpen size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Hifz & Muraja'ah Planner
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Organize your daily Quran memorization into Sabaq (new lesson),
              Sabqi (recent revision), and Manzil (cycle revision).
            </p>
          </div>
          <Link
            href="/planner/setup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0c8a66] hover:bg-[#097455] text-white font-bold text-sm shadow-md transition-all"
          >
            Create Your Plan <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const isSabaqDone = Boolean(schedule?.sabaq && schedule.completedIds.includes(schedule.sabaq.id));
  const completedCount = schedule ? schedule.completedIds.length : 0;
  const totalTasksCount =
    (schedule?.sabaq ? 1 : 0) + (schedule?.sabqi.length || 0) + (schedule?.manzil.length || 0);

  return (
    <div className="min-h-screen bg-[#bcd5ca] dark:bg-[#101c17] p-2 sm:p-4 md:p-8 flex items-center justify-center overflow-x-hidden">
      {/* Outer Dashboard Window Container */}
      <div className="w-full max-w-6xl rounded-2xl sm:rounded-3xl md:rounded-[36px] bg-[#f8faf9] dark:bg-[#121c18] shadow-2xl border border-white/80 dark:border-white/10 overflow-hidden flex flex-col md:flex-row min-h-[640px] md:min-h-[680px]">
        
        {/* Left Vertical Dock / Icon Rail (Desktop only: md:flex) */}
        <aside className="hidden md:flex w-20 bg-white/95 dark:bg-[#15241f] border-r border-slate-200/70 dark:border-slate-800/80 flex-col items-center justify-between py-7 shrink-0">
          <div className="flex flex-col items-center gap-6">
            {/* Brand Logo Mark */}
            <Link
              href="/"
              className="size-10 rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
              title="Aayah Studio"
            >
              <Logo iconOnly />
            </Link>

            {/* Vertical Icons Nav */}
            <nav className="flex flex-col items-center gap-3">
              <Link
                href="/planner"
                className="w-10 h-10 rounded-xl bg-[#e6f4ee] dark:bg-[#1c382e] text-[#0c8a66] dark:text-[#52d3a7] flex items-center justify-center shadow-xs transition-colors"
                title="Today's Schedule"
              >
                <LayoutGrid size={18} />
              </Link>

              <Link
                href={`/mushaf/${schedule?.sabaq?.startPage || 1}`}
                className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center justify-center transition-colors"
                title="Open Mushaf"
              >
                <BookOpen size={18} />
              </Link>

              <Link
                href="/planner/progress"
                className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center justify-center transition-colors"
                title="604-Page Progress Grid"
              >
                <BarChart3 size={18} />
              </Link>

              <Link
                href="/planner/settings"
                className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center justify-center transition-colors"
                title="Planner Settings & Schedule"
              >
                <Settings size={18} />
              </Link>

              <Link
                href="/adhkar"
                className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center justify-center transition-colors"
                title="Adhkar & Duas"
              >
                <Headphones size={18} />
              </Link>
            </nav>
          </div>

          {/* Bottom Dock Actions: Theme Toggle & Profile / Dev Tool */}
          <div className="flex flex-col items-center gap-2.5">
            <ThemeToggle
              dark={dark}
              toggle={toggle}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
            />

            <button
              type="button"
              onClick={() => {
                const next = prompt("Enter simulated date (YYYY-MM-DD):", currentDate);
                if (next && /^\d{4}-\d{2}-\d{2}$/.test(next)) {
                  setCurrentDate(next);
                }
              }}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors"
              title="Profile / Simulated Date"
            >
              <User size={16} />
            </button>
          </div>
        </aside>

        {/* Mobile Header Bar (md:hidden) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#15241f] border-b border-slate-200/70 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <Logo compact />
          </Link>
          <ThemeToggle
            dark={dark}
            toggle={toggle}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-7 md:p-9 space-y-6 overflow-y-auto max-w-full pb-20 md:pb-8">
          {/* Greeting Header & Status Row */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800/80">
            <div>
              {/* Dynamic Name Header with Inline Edit Pencil */}
              {isEditingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = tempNameInput.trim();
                    if (trimmed) {
                      setCustomName(trimmed);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("qcs-qari-name", trimmed);
                      }
                    }
                    setIsEditingName(false);
                  }}
                  className="flex items-center gap-2 flex-wrap"
                >
                  <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                    {getGreeting()},
                  </span>
                  <input
                    type="text"
                    value={tempNameInput}
                    onChange={(e) => setTempNameInput(e.target.value)}
                    placeholder="Your name"
                    className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0c8a66] w-36"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-[#0c8a66] text-white text-xs font-bold shadow-xs"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {getGreeting()}, {displayName}!
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setTempNameInput(displayName === "Qari" ? "" : displayName);
                      setIsEditingName(true);
                    }}
                    title="Change your name"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Here is your Quran memorization & revision schedule for today.
              </p>
            </div>

            {/* Quick Header Pills & Theme Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              {stats && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-xs">
                  <Flame size={13} className="fill-amber-500 text-amber-500" />
                  <span>{stats.currentStreak} day streak</span>
                </div>
              )}

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#0c8a66] dark:text-emerald-400 text-xs font-bold shadow-xs">
                <CheckCircle2 size={13} />
                <span>
                  {completedCount}/{totalTasksCount} Completed
                </span>
              </div>

              {/* Theme Toggle (Light / Dark / System) */}
              <div className="shrink-0 ml-1">
                <ThemeToggle
                  dark={dark}
                  toggle={toggle}
                  themeMode={themeMode}
                  setThemeMode={setThemeMode}
                />
              </div>
            </div>
          </header>

          {/* Backlog Alert Notice if portions are overdue */}
          {schedule && schedule.backlog.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-amber-400/40 bg-amber-50/80 dark:bg-amber-950/20 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-amber-800 dark:text-amber-300">Overdue Portions:</strong>{" "}
                  You have {schedule.backlog.length} portions from missed days. They are prioritized below.
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-xs">
                <span className="text-[11px] text-muted-foreground">Spread:</span>
                {[3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleBacklogSpread(days as 3 | 5 | 7)}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-amber-400/30 text-xs font-semibold hover:bg-amber-100"
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 6-CARD GRID (Responsive: 1 col on mobile, 2 on tablet, 3 on desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full">
            
            {/* CARD 1: SABAQ (Featured Deep Emerald Card with Quranic Backdrop & Holy Mushaf Art) */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-[#0c8a66] via-[#097556] to-[#065b43] text-white p-5 sm:p-6 shadow-md shadow-emerald-950/15 overflow-hidden flex flex-col justify-between min-h-[210px] sm:min-h-[225px] transition-all duration-200 hover:shadow-lg">
              {/* Subtle Real Islamic Photo Background Layer */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity pointer-events-none select-none z-0"
                style={{ backgroundImage: "url('/images/daily-ayah-quran.jpg')" }}
              />

              {/* Top Row: Title & Top-Right Islamic Star Icon */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1 pr-2">
                  <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                    <span>Sabaq (New Lesson)</span>
                    {isSabaqDone && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/40 text-emerald-100 font-semibold">
                        Done ✓
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-emerald-100/90 leading-relaxed font-normal">
                    {schedule?.sabaq ? (
                      <>
                        <strong className="text-white">{schedule.sabaq.label}</strong>
                        <span className="block text-[11px] text-emerald-200/80 mt-0.5">
                          Page {schedule.sabaq.startPage} · Lines {schedule.sabaq.startLine}–{schedule.sabaq.endLine}
                        </span>
                      </>
                    ) : (
                      "No new lesson scheduled today. Review your previous portions!"
                    )}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg bg-emerald-400/20 text-emerald-100 flex items-center justify-center shrink-0 shadow-xs">
                  <BookOpen size={17} />
                </div>
              </div>

              {/* Bottom Row: Actions & Arrow */}
              <div className="flex items-end justify-between pt-3 relative z-10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {schedule?.sabaq ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setRatingTarget({ unit: schedule.sabaq!, type: "sabaq" })}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-[#0c8a66] font-bold text-xs shadow-xs hover:bg-emerald-50 transition-colors flex items-center gap-1 min-h-[32px]"
                      >
                        <Check size={13} />
                        <span>{isSabaqDone ? "Done ✓" : "Mark Done"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPracticeUnit(schedule.sabaq)}
                        className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Practice & Repeat"
                      >
                        <Headphones size={15} />
                      </button>

                      <Link
                        href={`/mushaf/${schedule.sabaq.startPage}?lines=${schedule.sabaq.startLine}-${schedule.sabaq.endLine}`}
                        className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Open in Mushaf"
                      >
                        <BookOpen size={15} />
                      </Link>
                    </>
                  ) : (
                    <span className="text-[11px] text-emerald-200/80 font-medium">Rest Day</span>
                  )}
                </div>

                {/* Arrow Icon */}
                <div className="w-8 h-8 rounded-full bg-white/25 text-white flex items-center justify-center group-hover:bg-white group-hover:text-[#0c8a66] transition-all shrink-0">
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Bottom-Right Authentic Islamic Art: Illuminated Holy Quran on Rehal with Golden Pages */}
              <div className="absolute -bottom-1 -right-1 pointer-events-none select-none z-0">
                <svg viewBox="0 0 160 160" className="w-28 h-28 sm:w-32 sm:h-32 opacity-80" fill="none">
                  {/* Glowing 8-Pointed Rub el Hizb Star */}
                  <path d="M125 70 L135 60 L145 70 L155 60 L145 50 L155 40 L145 30 L135 40 L125 30 L115 40 L125 50 L115 60 Z" fill="#7ee4c4" opacity="0.3" />
                  {/* Carved Rehal (Quran Stand) Base */}
                  <path d="M60 145 L110 115 L145 145" stroke="#043828" strokeWidth="6" strokeLinecap="round" />
                  <path d="M75 145 L110 115 L130 145" stroke="#5cd9b2" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Open Quran Pages */}
                  <path d="M80 120 C95 105, 110 112, 110 115 C110 112, 125 105, 140 120 L138 98 C123 85, 110 92, 110 95 C110 92, 97 85, 82 98 Z" fill="#fdfbf7" stroke="#e0c885" strokeWidth="1.5" />
                  {/* Left Page Calligraphy Lines */}
                  <line x1="88" y1="102" x2="104" y2="96" stroke="#0a7e5c" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="88" y1="107" x2="104" y2="101" stroke="#0a7e5c" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="90" y1="112" x2="103" y2="106" stroke="#0a7e5c" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Right Page Calligraphy Lines */}
                  <line x1="116" y1="96" x2="132" y2="102" stroke="#0a7e5c" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="116" y1="101" x2="132" y2="107" stroke="#0a7e5c" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="117" y1="106" x2="130" y2="112" stroke="#0a7e5c" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Silk Bookmark Ribbon */}
                  <path d="M110 95 C112 110, 115 125, 122 135" stroke="#e8a838" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* CARD 2: SABQI (Recent Revision · Golden Amber Theme & Rub el Hizb Geometric Rosette) */}
            <div className="group relative rounded-2xl bg-white dark:bg-[#15231e] text-slate-900 dark:text-slate-100 p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[210px] sm:min-h-[225px]">
              {/* Subtle Mosque Archway Background Photo Layer */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-[0.05] mix-blend-luminosity pointer-events-none select-none z-0"
                style={{ backgroundImage: "url('/images/mosque-arch.jpg')" }}
              />

              {/* Top Row: Title & Top-Right Star Icon */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1 pr-2">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Sabqi (Recent)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Review your last {plan.sabqiDays || 5} days of memorized lessons.
                    <span className="block font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                      {schedule?.sabqi.length || 0} {schedule?.sabqi.length === 1 ? "portion" : "portions"} scheduled today
                    </span>
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
                  <Bookmark size={17} />
                </div>
              </div>

              {/* Bottom Row: Actions & Arrow */}
              <div className="flex items-end justify-between pt-3 relative z-10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {schedule && schedule.sabqi.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setRatingTarget({ unit: schedule.sabqi[0], type: "sabqi" })}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/20 border border-amber-500/30 transition-colors min-h-[32px]"
                      >
                        Rate Portion
                      </button>

                      <button
                        type="button"
                        onClick={() => setPracticeUnit(schedule.sabqi[0])}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-200 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Practice Sabqi"
                      >
                        <Headphones size={15} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">Up to date ✓</span>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Bottom-Right Authentic Islamic Art: 8-Pointed Rub el Hizb Star Rosette with Arabesque Petals */}
              <div className="absolute -bottom-1 -right-1 pointer-events-none select-none z-0">
                <svg viewBox="0 0 160 160" className="w-28 h-28 sm:w-32 sm:h-32" fill="none">
                  {/* Outer Interlocking Square 1 */}
                  <rect x="85" y="85" width="50" height="50" rx="4" fill="#fdf0d5" stroke="#f3b43f" strokeWidth="2" />
                  {/* Outer Interlocking Square 2 (Rotated 45 degrees around center 110, 110) */}
                  <rect x="85" y="85" width="50" height="50" rx="4" transform="rotate(45 110 110)" fill="#fbe6be" stroke="#e59f2a" strokeWidth="2" />
                  {/* Inner Arabesque Ring */}
                  <circle cx="110" cy="110" r="18" fill="#e8a838" stroke="#b87a1a" strokeWidth="1.5" />
                  <circle cx="110" cy="110" r="10" fill="#fff9ed" />
                  <circle cx="110" cy="110" r="4" fill="#b87a1a" />
                  {/* Radiating Islamic Geometric Petals */}
                  <path d="M110 82 L113 90 L110 94 L107 90 Z" fill="#b87a1a" />
                  <path d="M110 138 L113 130 L110 126 L107 130 Z" fill="#b87a1a" />
                  <path d="M82 110 L90 113 L94 110 L90 107 Z" fill="#b87a1a" />
                  <path d="M138 110 L130 113 L126 110 L130 107 Z" fill="#b87a1a" />
                </svg>
              </div>
            </div>

            {/* CARD 3: MANZIL (Cycle Revision · Coral/Rose Theme & Mihrab Dome Silhouette) */}
            <div className="group relative rounded-2xl bg-white dark:bg-[#15231e] text-slate-900 dark:text-slate-100 p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[210px] sm:min-h-[225px]">
              {/* Subtle Makkah Grand Mosque Background Photo Layer */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-[0.05] mix-blend-luminosity pointer-events-none select-none z-0"
                style={{ backgroundImage: "url('/images/makkah-grand-mosque.jpg')" }}
              />

              {/* Top Row: Title & Top-Right Kaaba Icon */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1 pr-2">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Manzil (Cycle)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Long-term retention across your {plan.manzilCycleDays || 30}-day revision cycle.
                    <span className="block font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                      {schedule?.manzil.length || 0} {schedule?.manzil.length === 1 ? "portion" : "portions"} scheduled today
                    </span>
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 shadow-xs">
                  <Award size={17} />
                </div>
              </div>

              {/* Bottom Row: Actions & Arrow */}
              <div className="flex items-end justify-between pt-3 relative z-10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {schedule && schedule.manzil.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setRatingTarget({ unit: schedule.manzil[0], type: "manzil" })}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-500/20 border border-rose-500/30 transition-colors min-h-[32px]"
                      >
                        Rate Portion
                      </button>

                      <button
                        type="button"
                        onClick={() => setPracticeUnit(schedule.manzil[0])}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-200 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Practice Manzil"
                      >
                        <Headphones size={15} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">All revised ✓</span>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all shrink-0">
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Bottom-Right Authentic Islamic Art: Horseshoe Mihrab Archway & Minaret Dome */}
              <div className="absolute -bottom-1 -right-1 pointer-events-none select-none z-0">
                <svg viewBox="0 0 160 160" className="w-28 h-28 sm:w-32 sm:h-32" fill="none">
                  {/* Outer Mihrab Arch */}
                  <path d="M85 145 L85 105 C85 85, 140 85, 140 105 L140 145 Z" fill="#ffebee" stroke="#f5949d" strokeWidth="2" />
                  {/* Pointed Islamic Arch Head */}
                  <path d="M95 145 L95 110 Q95 95 112.5 88 Q130 95 130 110 L130 145 Z" fill="#fce4e4" stroke="#e85b67" strokeWidth="2" />
                  {/* Minaret Dome & Crescent Finial */}
                  <path d="M104 88 Q112.5 75 121 88 Z" fill="#c23f4c" />
                  <line x1="112.5" y1="75" x2="112.5" y2="68" stroke="#a83540" strokeWidth="1.5" />
                  <circle cx="112.5" cy="67" r="2" fill="#e85b67" />
                  {/* Ornamental Hanging Mosque Lamp (Qandeel) */}
                  <line x1="112.5" y1="88" x2="112.5" y2="100" stroke="#a83540" strokeWidth="1" strokeDasharray="1.5 1.5" />
                  <path d="M109 100 L116 100 L114 108 L111 108 Z" fill="#e8a838" stroke="#b87a1a" strokeWidth="1" />
                </svg>
              </div>
            </div>

            {/* CARD 4: PRACTICE & AUDIO (Royal Violet Theme & Islamic Crescent Moon with Quran Waves) */}
            <div
              onClick={() => {
                const target = schedule?.sabaq || schedule?.sabqi?.[0] || schedule?.manzil?.[0];
                if (target) setPracticeUnit(target);
              }}
              className="group relative rounded-2xl bg-white dark:bg-[#15231e] text-slate-900 dark:text-slate-100 p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[210px] sm:min-h-[225px] cursor-pointer"
            >
              {/* Subtle Adhkar & Beads Background Photo Layer */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-[0.05] mix-blend-luminosity pointer-events-none select-none z-0"
                style={{ backgroundImage: "url('/images/adhkar-hero.jpg')" }}
              />

              {/* Top Row: Title & Top-Right Headphones Icon */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1 pr-2">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Practice & Audio
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Verse-by-verse repetition, speed controls, reciters, and line hiding.
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 shadow-xs">
                  <Headphones size={17} />
                </div>
              </div>

              {/* Bottom Row: Actions & Arrow */}
              <div className="flex items-end justify-between pt-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                  <Headphones size={14} />
                  <span>Start Practice Session</span>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Bottom-Right Authentic Islamic Art: Crescent Moon (Hilal) & Acoustic Quranic Audio Waves */}
              <div className="absolute -bottom-1 -right-1 pointer-events-none select-none z-0">
                <svg viewBox="0 0 160 160" className="w-28 h-28 sm:w-32 sm:h-32" fill="none">
                  {/* Islamic Crescent Moon (Hilal) */}
                  <path d="M135 75 C105 75, 85 95, 85 125 C85 138, 90 145, 95 145 C80 140, 75 125, 75 110 C75 80, 100 65, 125 65 C132 65, 137 68, 135 75 Z" fill="#6d39ad" />
                  {/* 5-Pointed Star Inside Crescent */}
                  <path d="M120 95 L122 100 L127 101 L123 105 L124 110 L120 107 L116 110 L117 105 L113 101 L118 100 Z" fill="#b993f3" />
                  {/* Quranic Soundwaves Radiating from Crescent */}
                  <path d="M102 140 C102 120, 120 120, 130 140" stroke="#a475e6" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M112 140 C112 128, 125 128, 132 140" stroke="#d5bdf8" strokeWidth="2" strokeLinecap="round" />
                  {/* Prayer Beads (Tasbih) strand arc */}
                  <circle cx="85" cy="142" r="3" fill="#884ecc" />
                  <circle cx="93" cy="143" r="3" fill="#884ecc" />
                  <circle cx="101" cy="144" r="3" fill="#884ecc" />
                </svg>
              </div>
            </div>

            {/* CARD 5: PROGRESS & GRID (Sky Blue Theme & 30-Juz Mushaf Matrix Stack) */}
            <Link
              href="/planner/progress"
              className="group relative rounded-2xl bg-white dark:bg-[#15231e] text-slate-900 dark:text-slate-100 p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[210px] sm:min-h-[225px]"
            >
              {/* Top Row: Title & Top-Right Chart Icon */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1 pr-2">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Progress & Grid
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    View your full 604-page Mushaf memorization matrix and estimated completion date.
                    {stats && (
                      <span className="block font-semibold text-sky-600 dark:text-sky-400 mt-0.5">
                        {stats.pagesMemorized} Pages ({Math.round(((stats.pagesMemorized || 0) / 604) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 shadow-xs">
                  <BarChart3 size={17} />
                </div>
              </div>

              {/* Bottom Row: Actions & Arrow */}
              <div className="flex items-end justify-between pt-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
                  <BarChart3 size={14} />
                  <span>View 604-Page Grid</span>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all shrink-0">
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Bottom-Right Authentic Islamic Art: 30-Juz Stack with Gold-Edged Leaves & Progress Matrix */}
              <div className="absolute -bottom-1 -right-1 pointer-events-none select-none z-0">
                <svg viewBox="0 0 160 160" className="w-28 h-28 sm:w-32 sm:h-32" fill="none">
                  {/* Bottom Book Volume */}
                  <rect x="75" y="128" width="65" height="14" rx="2" fill="#1e40af" />
                  <rect x="80" y="129" width="60" height="4" fill="#fbbf24" opacity="0.8" />
                  {/* Middle Book Volume */}
                  <rect x="80" y="112" width="60" height="14" rx="2" fill="#2563eb" />
                  <rect x="85" y="113" width="55" height="4" fill="#fbbf24" opacity="0.8" />
                  {/* Top Book Volume */}
                  <rect x="85" y="96" width="55" height="14" rx="2" fill="#3b82f6" />
                  <rect x="90" y="97" width="50" height="4" fill="#fbbf24" opacity="0.8" />
                  {/* 604-Page Completion Gauge Ring */}
                  <circle cx="112" cy="72" r="18" stroke="#93c5fd" strokeWidth="3" />
                  <circle cx="112" cy="72" r="18" stroke="#1d4ed8" strokeWidth="3" strokeDasharray="30 80" strokeLinecap="round" />
                  {/* Center Star */}
                  <path d="M112 66 L114 70 L118 70 L115 73 L116 77 L112 74 L108 77 L109 73 L106 70 L110 70 Z" fill="#1d4ed8" />
                </svg>
              </div>
            </Link>

            {/* CARD 6: SETTINGS & PACE (Warm Caramel / Ochre Theme & Astrolabe Qibla Compass) */}
            <Link
              href="/planner/settings"
              className="group relative rounded-2xl bg-white dark:bg-[#15231e] text-slate-900 dark:text-slate-100 p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[210px] sm:min-h-[225px]"
            >
              {/* Top Row: Title & Top-Right Sliders Icon */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1 pr-2">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Pace & Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Adjust lesson size, Sabqi days, backup progress data, or pause & skip schedule.
                    <span className="block font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                      Pace: {plan.paceName || getPaceEstimate(plan.dailyLessonSize).defaultPaceName}
                    </span>
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
                  <Compass size={17} />
                </div>
              </div>

              {/* Bottom Row: Actions & Arrow */}
              <div className="flex items-end justify-between pt-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Settings size={14} />
                  <span>Configure Schedule</span>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Bottom-Right Authentic Islamic Art: Brass Qibla Astrolabe & Sundial Compass */}
              <div className="absolute -bottom-1 -right-1 pointer-events-none select-none z-0">
                <svg viewBox="0 0 160 160" className="w-28 h-28 sm:w-32 sm:h-32" fill="none">
                  {/* Astrolabe Hanging Ring (Kursi) */}
                  <circle cx="115" cy="72" r="8" stroke="#d9892c" strokeWidth="2.5" />
                  <path d="M111 80 L119 80 L122 86 L108 86 Z" fill="#b46f1e" />
                  {/* Astrolabe Circular Rim (Limbus) */}
                  <circle cx="115" cy="115" r="30" fill="#fdf3e2" stroke="#d9892c" strokeWidth="3" />
                  <circle cx="115" cy="115" r="24" stroke="#e0973e" strokeWidth="1.5" strokeDasharray="2 3" />
                  {/* Celestial Coordinates Cross */}
                  <line x1="88" y1="115" x2="142" y2="115" stroke="#b46f1e" strokeWidth="1" />
                  <line x1="115" y1="88" x2="115" y2="142" stroke="#b46f1e" strokeWidth="1" />
                  {/* Astrolabe Rotating Pointer (Alidade) */}
                  <line x1="95" y1="135" x2="135" y2="95" stroke="#a1580d" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="115" cy="115" r="4" fill="#a1580d" />
                </svg>
              </div>
            </Link>

          </div>

          {/* DETAILED ACTIVE PORTIONS SECTION (Sabaq, Sabqi, Manzil portion lists) */}
          <section className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              {/* Filter Tabs (Horizontal scroll on mobile with zero overflow) */}
              <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-1 max-w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                    activeTab === "all"
                      ? "bg-[#0c8a66] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  All Tasks ({totalTasksCount})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("sabaq")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                    activeTab === "sabaq"
                      ? "bg-[#0c8a66] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Sabaq ({schedule?.sabaq ? 1 : 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("sabqi")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                    activeTab === "sabqi"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Sabqi ({schedule?.sabqi.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("manzil")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                    activeTab === "manzil"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Manzil ({schedule?.manzil.length || 0})
                </button>
              </div>

              {/* Pause / Skip Controls */}
              <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                <button
                  type="button"
                  onClick={handleSkipToday}
                  className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Skip Day
                </button>

                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  {plan.paused ? "Resume Plan" : "Pause Plan"}
                </button>
              </div>
            </div>

            {/* List of active portions */}
            <div className="space-y-3">
              {/* SABAQ ITEM */}
              {(activeTab === "all" || activeTab === "sabaq") && schedule?.sabaq && (
                <div className="p-4 rounded-2xl bg-white dark:bg-[#15231e] border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 mt-1 sm:mt-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs uppercase font-extrabold text-emerald-700 dark:text-emerald-400 tracking-wider">
                          1. Sabaq (New Lesson)
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {schedule.sabaq.label}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                        Page {schedule.sabaq.startPage} · Lines {schedule.sabaq.startLine}–{schedule.sabaq.endLine}
                      </span>
                    </div>
                  </div>

                  {/* Actions (3-col grid on mobile, flex row on desktop) */}
                  <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <Link
                      href={`/mushaf/${schedule.sabaq.startPage}?lines=${schedule.sabaq.startLine}-${schedule.sabaq.endLine}`}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors text-center"
                    >
                      <BookOpen size={13} className="text-[#0c8a66]" /> Mushaf
                    </Link>

                    <button
                      type="button"
                      onClick={() => setPracticeUnit(schedule.sabaq)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors text-center"
                    >
                      <Headphones size={13} className="text-[#0c8a66]" /> Practice
                    </button>

                    <button
                      type="button"
                      onClick={() => setRatingTarget({ unit: schedule.sabaq!, type: "sabaq" })}
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                        isSabaqDone
                          ? "bg-[#0c8a66] text-white"
                          : "bg-emerald-500/10 text-[#0c8a66] hover:bg-[#0c8a66] hover:text-white"
                      }`}
                    >
                      <CheckCircle2 size={13} />
                      {isSabaqDone ? "Done ✓" : "Mark Done"}
                    </button>
                  </div>
                </div>
              )}

              {/* SABQI ITEMS */}
              {(activeTab === "all" || activeTab === "sabqi") &&
                schedule &&
                schedule.sabqi.map((u) => {
                  const isDone = schedule.completedIds.includes(u.id);
                  const rec = records[u.id];

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#15231e] border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1 sm:mt-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs uppercase font-extrabold text-amber-700 dark:text-amber-400 tracking-wider">
                              2. Sabqi
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {u.label}
                            </span>
                            {rec?.strength === "weak" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600">
                                Needs Review
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                            Page {u.startPage} · Lines {u.startLine}–{u.endLine} · Interval {rec?.interval || 1}d
                          </span>
                        </div>
                      </div>

                      {/* Actions (3-col grid on mobile, flex row on desktop) */}
                      <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <Link
                          href={`/mushaf/${u.startPage}?lines=${u.startLine}-${u.endLine}`}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors text-center"
                        >
                          <BookOpen size={13} className="text-amber-600" /> Mushaf
                        </Link>

                        <button
                          type="button"
                          onClick={() => setPracticeUnit(u)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors text-center"
                        >
                          <Headphones size={13} className="text-amber-600" /> Practice
                        </button>

                        <button
                          type="button"
                          onClick={() => setRatingTarget({ unit: u, type: "sabqi" })}
                          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                            isDone
                              ? "bg-amber-600 text-white"
                              : "bg-amber-500/10 text-amber-700 hover:bg-amber-600 hover:text-white"
                          }`}
                        >
                          <CheckCircle2 size={13} />
                          {isDone ? "Done ✓" : "Rate"}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* MANZIL ITEMS */}
              {(activeTab === "all" || activeTab === "manzil") &&
                schedule &&
                schedule.manzil.map((u) => {
                  const isDone = schedule.completedIds.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#15231e] border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1 sm:mt-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs uppercase font-extrabold text-rose-700 dark:text-rose-400 tracking-wider">
                              3. Manzil
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {u.label}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                            Page {u.startPage} · Lines {u.startLine}–{u.endLine}
                          </span>
                        </div>
                      </div>

                      {/* Actions (3-col grid on mobile, flex row on desktop) */}
                      <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <Link
                          href={`/mushaf/${u.startPage}?lines=${u.startLine}-${u.endLine}`}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors text-center"
                        >
                          <BookOpen size={13} className="text-rose-600" /> Mushaf
                        </Link>

                        <button
                          type="button"
                          onClick={() => setPracticeUnit(u)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors text-center"
                        >
                          <Headphones size={13} className="text-rose-600" /> Practice
                        </button>

                        <button
                          type="button"
                          onClick={() => setRatingTarget({ unit: u, type: "manzil" })}
                          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                            isDone
                              ? "bg-rose-600 text-white"
                              : "bg-rose-500/10 text-rose-700 hover:bg-rose-600 hover:text-white"
                          }`}
                        >
                          <CheckCircle2 size={13} />
                          {isDone ? "Done ✓" : "Rate"}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (md:hidden - fixed bottom for thumb-friendly native mobile UX) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#15231e]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 py-2 px-3 flex items-center justify-around shadow-lg"
      >
        <Link
          href="/planner"
          className="flex flex-col items-center gap-0.5 text-xs font-bold text-[#0c8a66] dark:text-[#52d3a7]"
        >
          <LayoutGrid size={18} />
          <span className="text-[10px]">Today</span>
        </Link>

        <Link
          href={`/mushaf/${schedule?.sabaq?.startPage || 1}`}
          className="flex flex-col items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <BookOpen size={18} />
          <span className="text-[10px]">Mushaf</span>
        </Link>

        <Link
          href="/planner/progress"
          className="flex flex-col items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <BarChart3 size={18} />
          <span className="text-[10px]">Matrix</span>
        </Link>

        <Link
          href="/adhkar"
          className="flex flex-col items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <Headphones size={18} />
          <span className="text-[10px]">Adhkar</span>
        </Link>

        <Link
          href="/planner/settings"
          className="flex flex-col items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <Settings size={18} />
          <span className="text-[10px]">Pace</span>
        </Link>
      </nav>

      {/* SABAQ OUTCOME MODAL */}
      {ratingTarget && ratingTarget.type === "sabaq" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-foreground">Did you memorize today's lesson?</h3>
            <p className="text-xs text-muted-foreground">
              {ratingTarget.unit.label}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSabaqChoice("yes")}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                Yes, memorized ✓
              </button>

              <button
                type="button"
                onClick={() => handleSabaqChoice("partly")}
                className="py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs"
              >
                Partly (Repeat tomorrow)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRatingTarget(null)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* REVISION RATING MODAL (Sabqi / Manzil) */}
      {ratingTarget && (ratingTarget.type === "sabqi" || ratingTarget.type === "manzil") && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-foreground">How was your recitation?</h3>
            <p className="text-xs text-muted-foreground">
              {ratingTarget.unit.label}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleRevisionRating("strong")}
                className="p-3 rounded-xl border border-emerald-600/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs text-center"
              >
                <div>Strong ⭐</div>
                <span className="text-[10px] text-muted-foreground font-normal">Next in 4–10d</span>
              </button>

              <button
                type="button"
                onClick={() => handleRevisionRating("okay")}
                className="p-3 rounded-xl border border-sky-600/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold text-xs text-center"
              >
                <div>Okay 👍</div>
                <span className="text-[10px] text-muted-foreground font-normal">Next in 2–4d</span>
              </button>

              <button
                type="button"
                onClick={() => handleRevisionRating("weak")}
                className="p-3 rounded-xl border border-rose-600/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xs text-center"
              >
                <div>Weak ⚠️</div>
                <span className="text-[10px] text-muted-foreground font-normal">Due tomorrow</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRatingTarget(null)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* PRACTICE MODAL */}
      <PracticeModal
        unit={practiceUnit}
        isOpen={practiceUnit !== null}
        onClose={() => setPracticeUnit(null)}
      />
    </div>
  );
}
