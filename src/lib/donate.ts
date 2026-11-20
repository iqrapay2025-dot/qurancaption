/**
 * Parses and validates the donation URL.
 * Only valid https:// URLs are accepted.
 * Returns null if the value is empty, undefined, http://, javascript:, or invalid.
 */
export function getDonateUrl(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getActiveDonateUrl(): string | null {
  return getDonateUrl(process.env.NEXT_PUBLIC_DONATE_URL);
}
