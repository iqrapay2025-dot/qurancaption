import { PlannerPlan, PlannerUnit, UnitRecord, PlannerProgressStats } from "./types";
import { TOTAL_MUSHAF_PAGES } from "./mushaf-grid";
import { JUZS_META } from "@/lib/mushaf/data";
import { diffDays } from "./spaced-repetition";

export const STORAGE_KEY_PLAN = "aayah_hifz_plan";
export const STORAGE_KEY_RECORDS = "aayah_hifz_records";
export const STORAGE_KEY_SETUP_DRAFT = "aayah_hifz_setup_draft";

export function loadPlan(): PlannerPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAN);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePlan(plan: PlannerPlan): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(plan));
  } catch {
    // ignore
  }
}

export function loadRecords(): Record<string, UnitRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveRecords(records: Record<string, UnitRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export interface SetupDraft {
  step: number;
  startPoint: { page: number; line?: number; surah?: number; ayah?: number };
  direction: "forward" | "backward";
  dailyLessonSize: number;
  paceName?: string;
  studyDays: number[];
  memorizedPages: number[];
  initialStrength: "strong" | "okay" | "weak";
  reminderTimes: { sabaq: string; murajaah: string };
  sabqiDays: number;
  manzilCycleDays: number;
}

export function loadSetupDraft(): SetupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETUP_DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSetupDraft(draft: SetupDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SETUP_DRAFT, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearSetupDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_SETUP_DRAFT);
  } catch {
    // ignore
  }
}

export function clearAllPlannerData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_PLAN);
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_SETUP_DRAFT);
  } catch {
    // ignore
  }
}

export interface ExportData {
  version: number;
  exportedAt: string;
  plan: PlannerPlan;
  records: Record<string, UnitRecord>;
}

export function exportPlannerData(): string | null {
  const plan = loadPlan();
  if (!plan) return null;
  const records = loadRecords();
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    plan,
    records,
  };
  return JSON.stringify(data, null, 2);
}

export function importPlannerData(jsonStr: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== "object" || !data.plan || !data.records) {
      return { success: false, error: "Invalid backup file format" };
    }
    savePlan(data.plan);
    saveRecords(data.records);
    return { success: true };
  } catch {
    return { success: false, error: "Malformed JSON file" };
  }
}

/**
 * Calculates user progress stats across the 604 pages and 30 Juz
 */
export function calculatePlannerStats(
  plan: PlannerPlan | null,
  units: PlannerUnit[],
  records: Record<string, UnitRecord>,
  todayStr: string
): PlannerProgressStats {
  const pageStatusMap = new Map<number, Set<string>>();

  // Group unit statuses by page
  for (const u of units) {
    const rec = records[u.id];
    const status = rec ? rec.status : "new";
    if (!pageStatusMap.has(u.startPage)) {
      pageStatusMap.set(u.startPage, new Set());
    }
    pageStatusMap.get(u.startPage)!.add(status);
  }

  let pagesMemorized = 0;
  let pagesLearning = 0;
  let pagesWeak = 0;

  for (let p = 1; p <= TOTAL_MUSHAF_PAGES; p++) {
    const statuses = pageStatusMap.get(p);
    if (!statuses) continue;

    if (statuses.has("weak")) {
      pagesWeak++;
    } else if (statuses.has("learning")) {
      pagesLearning++;
    } else if (statuses.size === 1 && statuses.has("memorized")) {
      pagesMemorized++;
    }
  }

  // Calculate Juz completed (a Juz is completed if all pages in it are memorized)
  let juzCompleted = 0;
  for (let j = 0; j < JUZS_META.length; j++) {
    const startP = JUZS_META[j].start_page;
    const endP = j === JUZS_META.length - 1 ? 604 : JUZS_META[j + 1].start_page - 1;
    let allPagesMem = true;
    for (let p = startP; p <= endP; p++) {
      const statuses = pageStatusMap.get(p);
      if (!statuses || !(statuses.size === 1 && statuses.has("memorized"))) {
        allPagesMem = false;
        break;
      }
    }
    if (allPagesMem) {
      juzCompleted++;
    }
  }

  // Calculate Streak & Consistency over last 30 days
  const activeDates = new Set<string>();
  Object.values(records).forEach((r) => {
    r.history.forEach((h) => activeDates.add(h.date));
  });

  let currentStreak = 0;
  let checkDate = todayStr;
  while (activeDates.has(checkDate)) {
    currentStreak++;
    const [y, m, d] = checkDate.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d));
    prev.setUTCDate(prev.getUTCDate() - 1);
    checkDate = prev.toISOString().split("T")[0];
  }

  let activeLast30 = 0;
  for (let i = 0; i < 30; i++) {
    const [y, m, d] = todayStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - i);
    const ds = dt.toISOString().split("T")[0];
    if (activeDates.has(ds)) {
      activeLast30++;
    }
  }
  const consistencyLast30Days = Math.round((activeLast30 / 30) * 100);

  // Estimate completion date
  let estimatedCompletionDate: string | null = null;
  if (plan) {
    const totalUnits = units.length;
    const unlearnedCount = units.filter((u) => !records[u.id] || records[u.id].status === "new").length;
    const studyDaysPerWeek = plan.studyDays.length || 7;
    const unitsPerWeek = studyDaysPerWeek; // 1 sabaq unit per study day
    if (unlearnedCount > 0 && unitsPerWeek > 0) {
      const weeksNeeded = Math.ceil(unlearnedCount / unitsPerWeek);
      const daysNeeded = weeksNeeded * 7;
      const [y, m, d] = todayStr.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() + daysNeeded);
      estimatedCompletionDate = dt.toISOString().split("T")[0];
    }
  }

  return {
    pagesMemorized,
    pagesLearning,
    pagesWeak,
    totalPages: TOTAL_MUSHAF_PAGES,
    juzCompleted,
    currentStreak,
    bestStreak: Math.max(currentStreak, activeDates.size > 0 ? currentStreak : 0),
    consistencyLast30Days,
    estimatedCompletionDate,
  };
}
