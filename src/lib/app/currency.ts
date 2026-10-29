// Client-safe helper for estimating the NGN price of the Pro plan.
// Rounds PRO_PRICE_NGN * rate to the nearest 50 and formats with thousands separators.
// Returns null when rate is missing so the UI can show nothing.
import { PRO_PRICE_NGN } from "./plans";

export function formatNgnEstimate(rate: number | null): string | null {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  const rounded = Math.round((PRO_PRICE_NGN * rate) / 50) * 50;
  return rounded.toLocaleString("en-US");
}