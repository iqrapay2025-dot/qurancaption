export const FREE_LIMITS = { projects: 3, verses: 20 } as const;
export const FREE_MONTHLY_VERSES = 40;
export const FREE_MONTHLY_PROJECT_CREATIONS = 10;
export const PRO_PRICE_NGN = 8075.22;
export const PRO_PRICE_NGN_KOBO = 807522;
export const FLUTTERWAVE_PRICE_USD = 6;
export const FLUTTERWAVE_CURRENCY = "USD" as const;
export const MONTHLY_PERIOD_DAYS = 31;
export const MAX_PRESETS = 20;

export type Plan = "free" | "pro";
export type LimitCode = "project_limit" | "verse_limit" | "preset_pro" | "monthly_verse_limit" | "monthly_project_limit";

export const monthKey = (d: Date = new Date()) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export const nextMonthStart = (d: Date = new Date()) => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
};

export type Billing = {
  provider: "paystack" | "stripe" | "flutterwave" | null;
  status: "none" | "active" | "past_due" | "canceled";
  proUntil: string | null;
  cancelAtPeriodEnd: boolean;
  subscriptionRef: string | null;
};

export const verseCount = (from: number, to: number) => Math.max(0, to - from + 1);
