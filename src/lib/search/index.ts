import { VALID_TRANSLATION_KEYS } from "@/lib/quran/types";

export interface HighlightPart {
  text: string;
  match: boolean;
}

/**
 * Escapes regex special characters in a string.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates a search query for Quran search.
 * Minimum 2 characters, maximum 100 characters (after trim).
 */
export function validateQuery(q: unknown): { valid: boolean; query: string; error?: string } {
  if (typeof q !== "string") {
    return { valid: false, query: "", error: "Query must be a string." };
  }
  const trimmed = q.trim();
  if (trimmed.length < 2) {
    return { valid: false, query: trimmed, error: "Search query must be at least 2 characters." };
  }
  if (trimmed.length > 100) {
    return { valid: false, query: trimmed, error: "Search query must be at most 100 characters." };
  }
  return { valid: true, query: trimmed };
}

/**
 * Parses an ayah hash like "#ayah-12" or "ayah-12" to return ayah number 12.
 * Returns null if invalid.
 */
export function parseAyahHash(hash: string): number | null {
  if (!hash) return null;
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const match = clean.match(/^ayah-(\d+)$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Safely splits a text string into parts with match flag, escaping regex chars.
 * Works for Latin, Arabic, and any Unicode strings.
 * Does not throw on special regex characters like ( or *.
 */
export function splitHighlight(text: string, query: string): HighlightPart[] {
  if (!text) return [];
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 1) {
    return [{ text, match: false }];
  }

  try {
    const escaped = escapeRegex(trimmedQuery);
    // Split by escaped query case-insensitively while preserving matched groups
    const regex = new RegExp(`(${escaped})`, "gi");
    const tokens = text.split(regex);

    const parts: HighlightPart[] = [];
    for (const token of tokens) {
      if (!token) continue;
      const isMatch = token.toLowerCase() === trimmedQuery.toLowerCase();
      parts.push({
        text: token,
        match: isMatch,
      });
    }

    return parts.length > 0 ? parts : [{ text, match: false }];
  } catch {
    // Fallback if regex fails unexpectedly
    return [{ text, match: false }];
  }
}
