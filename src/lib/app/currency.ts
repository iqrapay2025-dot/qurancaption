// Client-safe helper for estimating the NGN price of the $6 Pro plan.
// Rounds 6 * rate to the nearest 50 and formats with thousands separators.
// Returns null when rate is missing so the UI can show nothing.
export function formatNgnEstimate(rate: number | null): string | null {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  const rounded = Math.round((6 * rate) / 50) * 50;
  return rounded.toLocaleString("en-US");
}