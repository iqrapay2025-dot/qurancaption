import { StrengthRating, UnitRecord, SabaqCompletion, UnitStatus } from "./types";

/**
 * Timezone-safe addition of calendar days to a YYYY-MM-DD string.
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const nextY = dt.getUTCFullYear();
  const nextM = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const nextD = String(dt.getUTCDate()).padStart(2, "0");
  return `${nextY}-${nextM}-${nextD}`;
}

/**
 * Returns difference in whole calendar days (dateA - dateB).
 */
export function diffDays(dateA: string, dateB: string): number {
  const [y1, m1, d1] = dateA.split("-").map(Number);
  const [y2, m2, d2] = dateB.split("-").map(Number);
  const msA = Date.UTC(y1, m1 - 1, d1);
  const msB = Date.UTC(y2, m2 - 1, d2);
  return Math.round((msA - msB) / (1000 * 60 * 60 * 24));
}

/**
 * Applies spaced repetition calculation after revision of Sabqi or Manzil.
 * - Weak: due tomorrow, interval resets to 1 day.
 * - Okay: interval x 1.5 (minimum 2 days).
 * - Strong: interval x 2.5 (minimum 4 days, maximum 60 days).
 */
export function applyRevisionRating(
  record: UnitRecord,
  rating: StrengthRating,
  reviewDate: string,
  taskType: "sabqi" | "manzil"
): UnitRecord {
  let nextInterval: number;
  let nextStatus: UnitStatus = record.status;

  if (rating === "weak") {
    nextInterval = 1;
    nextStatus = "weak";
  } else if (rating === "okay") {
    const currentInterval = record.interval || 1;
    nextInterval = Math.max(2, Math.round(currentInterval * 1.5));
    nextStatus = "memorized";
  } else {
    // strong
    const currentInterval = record.interval || 1;
    nextInterval = Math.min(60, Math.max(4, Math.round(currentInterval * 2.5)));
    nextStatus = "memorized";
  }

  const nextDue = addDays(reviewDate, nextInterval);

  return {
    ...record,
    status: nextStatus,
    lastRevised: reviewDate,
    nextDue,
    interval: nextInterval,
    strength: rating,
    history: [
      ...record.history,
      {
        date: reviewDate,
        type: taskType,
        rating,
      },
    ],
  };
}

/**
 * Applies outcome after Sabaq (new lesson).
 * - "yes": successfully memorized today -> enters "learning" status, interval = 1, nextDue = tomorrow.
 * - "partly": repeats the lesson tomorrow -> stays "new" or "learning".
 */
export function applySabaqResult(
  record: UnitRecord,
  result: SabaqCompletion,
  reviewDate: string
): UnitRecord {
  if (result === "yes") {
    return {
      ...record,
      status: "learning",
      learnedOn: reviewDate,
      lastRevised: reviewDate,
      nextDue: addDays(reviewDate, 1),
      interval: 1,
      strength: "okay",
      history: [
        ...record.history,
        {
          date: reviewDate,
          type: "sabaq",
          rating: "yes",
        },
      ],
    };
  }

  // partly: repeat tomorrow
  return {
    ...record,
    status: "new",
    lastRevised: reviewDate,
    nextDue: addDays(reviewDate, 1),
    interval: 1,
    strength: "weak",
    history: [
      ...record.history,
      {
        date: reviewDate,
        type: "sabaq",
        rating: "partly",
      },
    ],
  };
}
