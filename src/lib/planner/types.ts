export type LessonSize = number;

export type Direction = "forward" | "backward" | "custom";

export type UnitStatus = "new" | "learning" | "memorized" | "weak";

export type StrengthRating = "strong" | "okay" | "weak";

export type SabaqCompletion = "yes" | "partly";

export interface PlannerUnit {
  id: string; // e.g. "p2-l1-7"
  startPage: number;
  startLine: number;
  endPage: number;
  endLine: number;
  label: string; // e.g. "Al-Baqarah · Page 2, lines 1–7"
  surahNumber: number;
  surahName: string;
}

export interface UnitHistoryEntry {
  date: string; // YYYY-MM-DD
  type: "sabaq" | "sabqi" | "manzil";
  rating: StrengthRating | SabaqCompletion;
}

export interface UnitRecord {
  id: string; // matching PlannerUnit.id
  status: UnitStatus;
  learnedOn?: string; // YYYY-MM-DD
  lastRevised?: string; // YYYY-MM-DD
  nextDue?: string; // YYYY-MM-DD
  interval: number; // in days
  strength: StrengthRating;
  history: UnitHistoryEntry[];
  pausedUntil?: string; // YYYY-MM-DD if moved or deferred
}

export interface StartPoint {
  page: number;
  line?: number;
  surah?: number;
  ayah?: number;
}

export interface PlannerPlan {
  id: string;
  name: string;
  paceName?: string;
  startPoint: StartPoint;
  direction: Direction;
  dailyLessonSize: LessonSize;
  studyDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  sabqiDays: number; // default 5, range 3-7
  manzilCycleDays: number; // default 30
  reminderTimes: {
    sabaq: string; // "07:00"
    murajaah: string; // "19:00"
  };
  createdAt: string;
  paused: boolean;
  skippedDates: string[]; // YYYY-MM-DD dates explicitly skipped
  backlogSpreadDays?: number; // 3, 5, or 7
}

export interface DailySchedule {
  date: string; // YYYY-MM-DD
  isStudyDay: boolean;
  isPaused: boolean;
  isSkipped: boolean;
  sabaq: PlannerUnit | null;
  sabqi: PlannerUnit[];
  manzil: PlannerUnit[];
  backlog: PlannerUnit[];
  allCompleted: boolean;
  completedIds: string[];
}

export interface PlannerProgressStats {
  pagesMemorized: number;
  pagesLearning: number;
  pagesWeak: number;
  totalPages: number; // 604
  juzCompleted: number;
  currentStreak: number;
  bestStreak: number;
  consistencyLast30Days: number; // percentage 0-100
  estimatedCompletionDate: string | null; // YYYY-MM-DD
}
