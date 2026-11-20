export const RECENT_SEARCHES_KEY = "ayah-recent-searches";
export const MAX_RECENT = 5;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, MAX_RECENT);
    }
  } catch {}
  return [];
}

export function addRecentSearch(query: string): string[] {
  if (typeof window === "undefined") return [];
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return getRecentSearches();
  try {
    const current = getRecentSearches();
    const updated = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {}
  return [];
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
}
