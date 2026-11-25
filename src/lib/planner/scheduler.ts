import { PlannerPlan, PlannerUnit, UnitRecord, DailySchedule } from "./types";
import { addDays, diffDays } from "./spaced-repetition";

/**
 * Returns the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * in a timezone-independent manner from a YYYY-MM-DD string.
 */
export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCDay();
}

/**
 * Deterministically generates today's Hifz & Muraja'ah tasks:
 * 1. Sabaq (new lesson)
 * 2. Sabqi (recent revision from last N days)
 * 3. Manzil (cycle slice of older memorization + overdue)
 * 4. Backlog (missed due items)
 */
export function generateToday(
  plan: PlannerPlan,
  units: PlannerUnit[],
  dateStr: string,
  records: Record<string, UnitRecord>
): DailySchedule {
  const dayOfWeek = getDayOfWeek(dateStr);
  const isStudyDay = plan.studyDays.includes(dayOfWeek);
  const isPaused = plan.paused;
  const isSkipped = plan.skippedDates.includes(dateStr);

  const unitMap = new Map<string, PlannerUnit>();
  for (const u of units) {
    unitMap.set(u.id, u);
  }

  // 1. Identify Sabaq (Check completed today first, then repeated, then next unlearned)
  let sabaq: PlannerUnit | null = null;
  if (isStudyDay && !isPaused && !isSkipped) {
    // A. Check if a Sabaq was already completed today
    for (const unit of units) {
      const rec = records[unit.id];
      if (
        rec &&
        rec.history.some((h) => h.date === dateStr && h.type === "sabaq" && h.rating === "yes")
      ) {
        sabaq = unit;
        break;
      }
    }

    // B. Check if there's any unit marked partly memorized yesterday/recently that needs repeating
    if (!sabaq) {
      for (const unit of units) {
        const rec = records[unit.id];
        if (rec && rec.status === "new" && rec.history.length > 0) {
          const lastH = rec.history[rec.history.length - 1];
          if (lastH.type === "sabaq" && lastH.rating === "partly") {
            sabaq = unit;
            break;
          }
        }
      }
    }

    // C. Pick the first untouched "new" unit honoring plan.startPoint
    if (!sabaq) {
      for (const unit of units) {
        if (
          plan.direction === "forward" &&
          plan.startPoint?.page &&
          unit.startPage < plan.startPoint.page
        ) {
          continue;
        }
        if (
          plan.direction === "backward" &&
          plan.startPoint?.page &&
          unit.startPage > plan.startPoint.page
        ) {
          continue;
        }
        const rec = records[unit.id];
        if (!rec || rec.status === "new") {
          sabaq = unit;
          break;
        }
      }
    }
  }

  // 2. Identify Sabqi (learned within the last sabqiDays calendar days)
  const sabqiDays = plan.sabqiDays || 5;
  const sabqiCutoff = addDays(dateStr, -sabqiDays);
  const sabqiUnits: PlannerUnit[] = [];

  for (const unit of units) {
    // Do not include the current Sabaq
    if (sabaq && unit.id === sabaq.id) continue;

    const rec = records[unit.id];
    if (!rec) continue;

    // A unit belongs to Sabqi if it was learned recently (before today) within the window
    // or if its status is "learning" and it was not learned today as Sabaq
    const isRecent = rec.learnedOn && rec.learnedOn >= sabqiCutoff && rec.learnedOn < dateStr;
    const isLearningStatus = rec.status === "learning" && rec.learnedOn !== dateStr;

    if (isRecent || isLearningStatus) {
      sabqiUnits.push(unit);
    }
  }

  // Prioritize weak units in Sabqi
  sabqiUnits.sort((a, b) => {
    const recA = records[a.id];
    const recB = records[b.id];
    const weightA = recA?.strength === "weak" ? 0 : recA?.strength === "okay" ? 1 : 2;
    const weightB = recB?.strength === "weak" ? 0 : recB?.strength === "okay" ? 1 : 2;
    return weightA - weightB;
  });

  // 3. Identify Manzil and Backlog
  // Memorized units outside of Sabqi
  const sabqiIdSet = new Set(sabqiUnits.map((u) => u.id));
  const memorizedUnits: PlannerUnit[] = [];
  const backlogUnits: PlannerUnit[] = [];

  for (const unit of units) {
    if (sabaq && unit.id === sabaq.id) continue;
    if (sabqiIdSet.has(unit.id)) continue;

    const rec = records[unit.id];
    if (!rec) continue;

    if (rec.status === "memorized" || rec.status === "weak") {
      memorizedUnits.push(unit);

      // Check if overdue (nextDue was before dateStr)
      if (rec.nextDue && rec.nextDue < dateStr) {
        backlogUnits.push(unit);
      }
    }
  }

  // Calculate today's Manzil slice from the memorized units
  const cycleDays = plan.manzilCycleDays || 30;
  // Day offset from plan creation
  const daysSinceStart = Math.max(0, diffDays(dateStr, plan.createdAt));
  const todaySliceIdx = daysSinceStart % cycleDays;

  const manzilUnits: PlannerUnit[] = [];
  const addedManzilIds = new Set<string>();

  // Overdue units are prioritized in Manzil or surfaced in Backlog
  for (const bUnit of backlogUnits) {
    if (!addedManzilIds.has(bUnit.id)) {
      manzilUnits.push(bUnit);
      addedManzilIds.add(bUnit.id);
    }
  }

  // Add the rotating daily slice
  for (let i = 0; i < memorizedUnits.length; i++) {
    if (i % cycleDays === todaySliceIdx) {
      const u = memorizedUnits[i];
      if (!addedManzilIds.has(u.id)) {
        manzilUnits.push(u);
        addedManzilIds.add(u.id);
      }
    }
  }

  // Sort Manzil: Weak units first, then overdue, then regular
  manzilUnits.sort((a, b) => {
    const recA = records[a.id];
    const recB = records[b.id];
    const weightA = recA?.strength === "weak" ? 0 : (recA?.nextDue && recA.nextDue < dateStr ? 1 : 2);
    const weightB = recB?.strength === "weak" ? 0 : (recB?.nextDue && recB.nextDue < dateStr ? 1 : 2);
    return weightA - weightB;
  });

  // Calculate completed status for today
  const completedIds: string[] = [];
  const checkCompleted = (u: PlannerUnit | null, type: "sabaq" | "sabqi" | "manzil") => {
    if (!u) return;
    const rec = records[u.id];
    if (!rec) return;
    const doneToday = rec.history.some((h) => h.date === dateStr && h.type === type);
    if (doneToday) {
      completedIds.push(u.id);
    }
  };

  checkCompleted(sabaq, "sabaq");
  sabqiUnits.forEach((u) => checkCompleted(u, "sabqi"));
  manzilUnits.forEach((u) => checkCompleted(u, "manzil"));

  const allTaskIds = [
    ...(sabaq ? [sabaq.id] : []),
    ...sabqiUnits.map((u) => u.id),
    ...manzilUnits.map((u) => u.id),
  ];

  const allCompleted = allTaskIds.length > 0 && allTaskIds.every((id) => completedIds.includes(id));

  return {
    date: dateStr,
    isStudyDay,
    isPaused,
    isSkipped,
    sabaq,
    sabqi: sabqiUnits,
    manzil: manzilUnits,
    backlog: backlogUnits,
    allCompleted,
    completedIds,
  };
}

/**
 * Pause / Resume helper
 */
export function togglePausePlan(plan: PlannerPlan): PlannerPlan {
  return {
    ...plan,
    paused: !plan.paused,
  };
}

/**
 * Skip a day helper
 */
export function skipDay(plan: PlannerPlan, dateStr: string): PlannerPlan {
  if (plan.skippedDates.includes(dateStr)) return plan;
  return {
    ...plan,
    skippedDates: [...plan.skippedDates, dateStr],
  };
}

/**
 * Move a lesson to another day
 */
export function moveLesson(record: UnitRecord, targetDate: string): UnitRecord {
  return {
    ...record,
    nextDue: targetDate,
    pausedUntil: targetDate,
  };
}

/**
 * Spread backlog over 3, 5, or 7 days
 */
export function setBacklogSpread(plan: PlannerPlan, spreadDays: 3 | 5 | 7): PlannerPlan {
  return {
    ...plan,
    backlogSpreadDays: spreadDays,
  };
}
