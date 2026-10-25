export const FREE_LIMITS = { projects: 3, verses: 20 } as const;
export const PRO_PRICE_USD = 6;
export const PRO_PRICE_NGN = Number(process.env.PRO_PRICE_NGN ?? 9000);
export const MAX_PRESETS = 20;

export type Plan = "free" | "pro";
export type LimitCode = "project_limit" | "verse_limit" | "preset_pro";

export type Billing = {
  provider: "paystack" | "stripe" | null;
  status: "none" | "active" | "past_due" | "canceled";
  proUntil: string | null;
  cancelAtPeriodEnd: boolean;
};

export const verseCount = (from: number, to: number) => Math.max(0, to - from + 1);
