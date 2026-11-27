"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  Clock,
  BookOpen,
  Layers,
  ChevronRight,
  HelpCircle,
  Headphones,
} from "lucide-react";
import { SURAHS_META, JUZS_META } from "@/lib/mushaf/data";
import { TOTAL_MUSHAF_PAGES, generateMushafUnits } from "@/lib/planner/mushaf-grid";
import {
  savePlan,
  saveRecords,
  loadSetupDraft,
  saveSetupDraft,
  clearSetupDraft,
  SetupDraft,
} from "@/lib/planner/storage";
import { PlannerPlan, UnitRecord, LessonSize, StrengthRating } from "@/lib/planner/types";
import { getPaceEstimate } from "@/lib/planner/pace";
import { DEFAULT_RECITER, type Reciter } from "@/lib/quran/types";
import { PlannerShell } from "./PlannerShell";

const LESSON_SIZES: Array<{ size: LessonSize; label: string; desc: string }> = [
  { size: 3, label: "3 Lines", desc: "Gentle pace · ~5–10 mins" },
  { size: 5, label: "5 Lines", desc: "Balanced pace · ~10–15 mins" },
  { size: 7, label: "7 Lines", desc: "Standard pace (Half page) · ~15–25 mins" },
  { size: 10, label: "10 Lines", desc: "Intensive pace · ~25–35 mins" },
  { size: 15, label: "15 Lines", desc: "Full page daily · ~35–50 mins" },
];

const DAYS_OF_WEEK = [
  { id: 1, label: "Mon", full: "Monday" },
  { id: 2, label: "Tue", full: "Tuesday" },
  { id: 3, label: "Wed", full: "Wednesday" },
  { id: 4, label: "Thu", full: "Thursday" },
  { id: 5, label: "Fri", full: "Friday" },
  { id: 6, label: "Sat", full: "Saturday" },
  { id: 0, label: "Sun", full: "Sunday" },
];

export function PlannerSetup() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [startType, setStartType] = useState<"surah" | "page" | "juz">("surah");
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [selectedJuz, setSelectedJuz] = useState<number>(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const [dailyLessonSize, setDailyLessonSize] = useState<LessonSize>(7);
  const [paceName, setPaceName] = useState<string>("Standard Pace (Half Page)");
  const [isCustomLessonSize, setIsCustomLessonSize] = useState<boolean>(false);
  const [customLinesInput, setCustomLinesInput] = useState<number>(7);
  const [customNameOverridden, setCustomNameOverridden] = useState<boolean>(false);
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // all 7 days
  const [sabqiDays, setSabqiDays] = useState<number>(5);
  const [manzilCycleDays, setManzilCycleDays] = useState<number>(30);

  const [memorizedPages, setMemorizedPages] = useState<Set<number>>(new Set());
  const [initialStrength, setInitialStrength] = useState<StrengthRating>("strong");

  const [reminderTimes, setReminderTimes] = useState({
    sabaq: "06:30",
    murajaah: "19:00",
  });

  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(DEFAULT_RECITER);

  // Load draft & reciters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("qcs-quran-reciter");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) setSelectedReciterId(parsed);
      }
    }

    fetch("/api/quran/reciters")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.reciters || [];
        if (Array.isArray(list) && list.length > 0) setReciters(list);
      })
      .catch(() => {});

    const draft = loadSetupDraft();
    if (draft) {
      setStep(draft.step || 1);
      if (draft.startPoint.page) setSelectedPage(draft.startPoint.page);
      if (draft.startPoint.surah) setSelectedSurah(draft.startPoint.surah);
      setDirection(draft.direction || "forward");
      const savedLessonSize = draft.dailyLessonSize || 7;
      setDailyLessonSize(savedLessonSize);
      if (![3, 5, 7, 10, 15].includes(savedLessonSize)) {
        setIsCustomLessonSize(true);
        setCustomLinesInput(savedLessonSize);
      }
      if (draft.paceName) {
        setPaceName(draft.paceName);
        setCustomNameOverridden(true);
      } else {
        setPaceName(getPaceEstimate(savedLessonSize).defaultPaceName);
      }
      setStudyDays(draft.studyDays || [1, 2, 3, 4, 5, 6, 0]);
      if (draft.memorizedPages) setMemorizedPages(new Set(draft.memorizedPages));
      setInitialStrength(draft.initialStrength || "strong");
      if (draft.reminderTimes) setReminderTimes(draft.reminderTimes);
      if (draft.sabqiDays) setSabqiDays(draft.sabqiDays);
      if (draft.manzilCycleDays) setManzilCycleDays(draft.manzilCycleDays);
    }
  }, []);

  // Save draft whenever state changes
  useEffect(() => {
    const draft: SetupDraft = {
      step,
      startPoint: {
        page: startType === "page" ? selectedPage : startType === "juz" ? (JUZS_META[selectedJuz - 1]?.start_page || 1) : (SURAHS_META.find((s) => s.id === selectedSurah)?.start_page || 1),
        surah: selectedSurah,
      },
      direction,
      dailyLessonSize,
      paceName: paceName || getPaceEstimate(dailyLessonSize).defaultPaceName,
      studyDays,
      memorizedPages: Array.from(memorizedPages),
      initialStrength,
      reminderTimes,
      sabqiDays,
      manzilCycleDays,
    };
    saveSetupDraft(draft);
  }, [
    step,
    startType,
    selectedSurah,
    selectedPage,
    selectedJuz,
    direction,
    dailyLessonSize,
    paceName,
    studyDays,
    memorizedPages,
    initialStrength,
    reminderTimes,
    sabqiDays,
    manzilCycleDays,
  ]);

  const toggleDay = (dayId: number) => {
    if (studyDays.includes(dayId)) {
      if (studyDays.length > 1) {
        setStudyDays(studyDays.filter((d) => d !== dayId));
      }
    } else {
      setStudyDays([...studyDays, dayId]);
    }
  };

  const handleSelectEntireJuz = (juzNumber: number) => {
    const juz = JUZS_META[juzNumber - 1];
    if (!juz) return;
    const nextJuz = JUZS_META[juzNumber];
    const endPage = nextJuz ? nextJuz.start_page - 1 : TOTAL_MUSHAF_PAGES;

    const nextSet = new Set(memorizedPages);
    let allIncluded = true;
    for (let p = juz.start_page; p <= endPage; p++) {
      if (!nextSet.has(p)) {
        allIncluded = false;
        break;
      }
    }

    for (let p = juz.start_page; p <= endPage; p++) {
      if (allIncluded) nextSet.delete(p);
      else nextSet.add(p);
    }
    setMemorizedPages(nextSet);
  };

  const handleSelectEntireSurah = (surahId: number) => {
    const surah = SURAHS_META.find((s) => s.id === surahId);
    if (!surah) return;
    const nextSet = new Set(memorizedPages);
    let allIncluded = true;
    for (let p = surah.start_page; p <= surah.end_page; p++) {
      if (!nextSet.has(p)) {
        allIncluded = false;
        break;
      }
    }

    for (let p = surah.start_page; p <= surah.end_page; p++) {
      if (allIncluded) nextSet.delete(p);
      else nextSet.add(p);
    }
    setMemorizedPages(nextSet);
  };

  const handleFinish = () => {
    const startPage =
      startType === "page"
        ? selectedPage
        : startType === "juz"
        ? JUZS_META[selectedJuz - 1]?.start_page || 1
        : SURAHS_META.find((s) => s.id === selectedSurah)?.start_page || 1;

    const todayStr = new Date().toISOString().split("T")[0];

    const plan: PlannerPlan = {
      id: "plan-" + Date.now(),
      name: "My Hifz Plan",
      startPoint: { page: startPage, surah: selectedSurah },
      direction,
      dailyLessonSize,
      paceName: paceName || getPaceEstimate(dailyLessonSize).defaultPaceName,
      studyDays,
      sabqiDays,
      manzilCycleDays,
      reminderTimes,
      createdAt: todayStr,
      paused: false,
      skippedDates: [],
    };

    // Generate initial units and records for already-memorized pages
    const allUnits = generateMushafUnits(dailyLessonSize, direction);
    const initialRecords: Record<string, UnitRecord> = {};

    for (const u of allUnits) {
      if (memorizedPages.has(u.startPage)) {
        initialRecords[u.id] = {
          id: u.id,
          status: "memorized",
          learnedOn: todayStr,
          lastRevised: todayStr,
          nextDue: todayStr,
          interval: initialStrength === "strong" ? 14 : initialStrength === "okay" ? 7 : 2,
          strength: initialStrength,
          history: [
            {
              date: todayStr,
              type: "manzil",
              rating: initialStrength,
            },
          ],
        };
      }
    }

    savePlan(plan);
    saveRecords(initialRecords);
    clearSetupDraft();
    router.push("/planner");
  };

  return (
    <PlannerShell activeTab="setup">
      <div className="space-y-6">
        {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Step {step} of 4
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {step === 1 && "Starting Point & Direction"}
            {step === 2 && "Pace & Study Days"}
            {step === 3 && "Already Memorized"}
            {step === 4 && "Reminders & Review"}
          </span>
        </div>
        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: Starting Point & Direction */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Where would you like to start?</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose your starting surah, page, or juz, and which direction you plan to memorize.
            </p>
          </div>

          {/* Direction */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDirection("forward")}
              className={`p-4 rounded-xl border text-left transition-all ${
                direction === "forward"
                  ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold ring-1 ring-emerald-600/30"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <div className="text-sm font-bold">Forward</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                From Surah Al-Fatihah / Al-Baqarah forward
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDirection("backward")}
              className={`p-4 rounded-xl border text-left transition-all ${
                direction === "backward"
                  ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold ring-1 ring-emerald-600/30"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <div className="text-sm font-bold">Backward (Juz 'Amma first)</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                From Surah An-Nas backward towards Al-Baqarah
              </div>
            </button>
          </div>

          {/* Starting Picker Type */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <button
                type="button"
                onClick={() => setStartType("surah")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  startType === "surah"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                By Surah
              </button>
              <button
                type="button"
                onClick={() => setStartType("juz")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  startType === "juz"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                By Juz
              </button>
              <button
                type="button"
                onClick={() => setStartType("page")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  startType === "page"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                By Mushaf Page
              </button>
            </div>

            {startType === "surah" && (
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Select Starting Surah
                </label>
                <select
                  value={selectedSurah}
                  onChange={(e) => setSelectedSurah(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {SURAHS_META.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id}. {s.name_simple} ({s.name_arabic}) — Page {s.start_page}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {startType === "juz" && (
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Select Starting Juz
                </label>
                <select
                  value={selectedJuz}
                  onChange={(e) => setSelectedJuz(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {JUZS_META.map((j) => (
                    <option key={j.juz_number} value={j.juz_number}>
                      Juz {j.juz_number} — Starts at Page {j.start_page}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {startType === "page" && (
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Select Starting Page (1 to 604)
                </label>
                <input
                  type="number"
                  min={1}
                  max={604}
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(Math.min(604, Math.max(1, Number(e.target.value))))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Lesson Size & Study Days */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Choose your pace and schedule</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select how many lines you wish to memorize per day and which days of the week you study.
            </p>
          </div>

          {/* Lesson Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Daily Sabaq (New Lesson) Size
              </label>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {paceName || getPaceEstimate(dailyLessonSize).defaultPaceName} · {getPaceEstimate(dailyLessonSize).timeEstimate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LESSON_SIZES.map((ls) => (
                <button
                  key={ls.size}
                  type="button"
                  onClick={() => {
                    setIsCustomLessonSize(false);
                    setDailyLessonSize(ls.size);
                    const est = getPaceEstimate(ls.size);
                    setPaceName(est.defaultPaceName);
                    setCustomNameOverridden(false);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    !isCustomLessonSize && dailyLessonSize === ls.size
                      ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold ring-1 ring-emerald-600/30"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="text-sm font-bold">{ls.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ls.desc}</div>
                </button>
              ))}

              {/* Custom lines card */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomLessonSize(true);
                  const lines = customLinesInput || 8;
                  setDailyLessonSize(lines);
                  if (!customNameOverridden) {
                    setPaceName(getPaceEstimate(lines).defaultPaceName);
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isCustomLessonSize
                    ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold ring-1 ring-emerald-600/30"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                <div className="text-sm font-bold flex items-center justify-between">
                  <span>Custom Lines</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-700 dark:text-emerald-300">
                    Flexible
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Write your own line count & name your pace
                </div>
              </button>
            </div>

            {/* Custom line configuration panel */}
            {isCustomLessonSize && (
              <div className="mt-3 p-4 rounded-xl border border-emerald-600/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Lines per day (1 to 30)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={customLinesInput}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                          setCustomLinesInput(val);
                          setDailyLessonSize(val);
                          if (!customNameOverridden) {
                            setPaceName(getPaceEstimate(val).defaultPaceName);
                          }
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground font-semibold shrink-0">
                        lines/day
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Pace Name
                    </label>
                    <input
                      type="text"
                      placeholder={getPaceEstimate(customLinesInput).defaultPaceName}
                      value={paceName}
                      onChange={(e) => {
                        setPaceName(e.target.value);
                        setCustomNameOverridden(true);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Dynamic Time Calculation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-background/80 border border-border text-xs">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-muted-foreground">Generated memorization time:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {getPaceEstimate(dailyLessonSize).timeEstimate}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Based on Quranic retention (~2.2–3.4 min/line)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Study Days */}
          <div className="space-y-2.5 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Study Days ({studyDays.length} days/week)
            </label>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = studyDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={`py-3 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Off-days have no new Sabaq scheduled, allowing time for revision and rest.
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: Already Memorized */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portions you already know</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select any Surahs or Juz you have previously memorized so they enter your daily Manzil revision cycle.
            </p>
          </div>

          {/* Initial Strength */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <span className="text-xs font-bold text-foreground block">
              Initial Strength of Previously Memorized Portions
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["strong", "okay", "weak"] as StrengthRating[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInitialStrength(st)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold capitalize border transition-all ${
                    initialStrength === st
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Weak portions will be revised more frequently with 1–2 day intervals.
            </p>
          </div>

          {/* Quick selection tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Quick Select Juz ({memorizedPages.size} pages selected)
              </span>
              {memorizedPages.size > 0 && (
                <button
                  type="button"
                  onClick={() => setMemorizedPages(new Set())}
                  className="text-xs text-muted-foreground hover:text-destructive underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1 border border-border rounded-xl bg-card">
              {JUZS_META.map((j) => {
                const nextJ = JUZS_META[j.juz_number];
                const endP = nextJ ? nextJ.start_page - 1 : TOTAL_MUSHAF_PAGES;
                let count = 0;
                for (let p = j.start_page; p <= endP; p++) {
                  if (memorizedPages.has(p)) count++;
                }
                const totalInJuz = endP - j.start_page + 1;
                const isAll = count === totalInJuz;

                return (
                  <button
                    key={j.juz_number}
                    type="button"
                    onClick={() => handleSelectEntireJuz(j.juz_number)}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      isAll
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : count > 0
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    Juz {j.juz_number}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Reminders & Review Summary */}
      {step === 4 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reminders & Plan Review</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set your preferred reminder times and confirm your customized Hifz plan.
            </p>
          </div>

          {/* Reminder Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-card">
            <div>
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                <Clock size={14} className="text-primary" /> Sabaq Reminder (Morning)
              </label>
              <input
                type="time"
                value={reminderTimes.sabaq}
                onChange={(e) => setReminderTimes({ ...reminderTimes, sabaq: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                <Clock size={14} className="text-primary" /> Manzil Revision (Evening)
              </label>
              <input
                type="time"
                value={reminderTimes.murajaah}
                onChange={(e) => setReminderTimes({ ...reminderTimes, murajaah: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Preferred Reciter */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <label htmlFor="setup-reciter-select" className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Headphones size={14} className="text-primary" /> Preferred Quran Reciter Voice
            </label>
            <select
              id="setup-reciter-select"
              value={selectedReciterId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedReciterId(id);
                try {
                  localStorage.setItem("qcs-quran-reciter", String(id));
                } catch {}
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
            >
              {reciters.length > 0 ? (
                reciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.style ? `· ${r.style}` : ""}
                  </option>
                ))
              ) : (
                <option value={selectedReciterId}>Mishary Rashid Alafasy</option>
              )}
            </select>
          </div>

          {/* Plan Summary Card */}
          <div className="p-5 rounded-2xl border border-emerald-600/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <Calendar size={16} /> Plan Overview
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Direction</span>
                <span className="font-semibold text-foreground capitalize">{direction}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Daily Lesson</span>
                <span className="font-semibold text-foreground">
                  {dailyLessonSize} lines/day · {paceName || getPaceEstimate(dailyLessonSize).defaultPaceName}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
                  {getPaceEstimate(dailyLessonSize).timeEstimate}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Study Days</span>
                <span className="font-semibold text-foreground">{studyDays.length} days/week</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Already Memorized</span>
                <span className="font-semibold text-foreground">{memorizedPages.size} pages</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Sabqi Window</span>
                <span className="font-semibold text-foreground">{sabqiDays} days</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Manzil Cycle</span>
                <span className="font-semibold text-foreground">{manzilCycleDays} days</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
            <HelpCircle size={16} className="text-primary shrink-0 mt-0.5" />
            <p>
              This planner helps you organize your memorization and revision. Review your recitation and tajweed regularly with a qualified teacher.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-6 border-t border-border mt-8">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            Continue <ArrowRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
          >
            Start My Plan <Check size={16} />
          </button>
        )}
      </div>
      </div>
    </PlannerShell>
  );
}
