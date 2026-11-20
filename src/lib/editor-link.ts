export const SURAH_VERSE_COUNTS: number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6,
];

export interface EditorLinkParams {
  surah: number;
  from?: number;
  to?: number;
}

export interface ParsedEditorParams {
  valid: boolean;
  surah?: number;
  from?: number;
  to?: number;
}

/**
 * Returns the verse count for a surah (1 to 114).
 * Returns 0 if invalid surah.
 */
export function getSurahVerseCount(surah: number): number {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return 0;
  return SURAH_VERSE_COUNTS[surah - 1] || 0;
}

/**
 * Builds a hash link for the caption editor with preselected surah and ayah range.
 * Example: buildEditorLink({ surah: 36, from: 5, to: 12 }) -> "/#/editor?surah=36&from=5&to=12"
 */
export function buildEditorLink(params?: EditorLinkParams): string {
  if (!params || !params.surah) {
    return "/#/editor";
  }

  const query = new URLSearchParams();
  query.set("surah", String(params.surah));
  if (params.from !== undefined && params.from !== null) {
    query.set("from", String(params.from));
  }
  if (params.to !== undefined && params.to !== null) {
    query.set("to", String(params.to));
  }

  return `/#/editor?${query.toString()}`;
}

/**
 * Parses and validates editor hash or query string.
 * Enforces:
 * - surah: integer 1 to 114
 * - from, to: within that surah's verse count, and from <= to
 * Invalid or missing values return { valid: false }.
 */
export function parseEditorHash(hashOrUrl: string): ParsedEditorParams {
  if (!hashOrUrl) return { valid: false };

  let queryStr = "";
  if (hashOrUrl.includes("?")) {
    queryStr = hashOrUrl.slice(hashOrUrl.indexOf("?") + 1);
  } else {
    return { valid: false };
  }

  const searchParams = new URLSearchParams(queryStr);
  const rawSurah = searchParams.get("surah");
  if (!rawSurah) return { valid: false };

  const surah = parseInt(rawSurah, 10);
  if (isNaN(surah) || surah < 1 || surah > 114) {
    return { valid: false };
  }

  const maxVerses = getSurahVerseCount(surah);
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");

  if (!rawFrom && !rawTo) {
    // Only surah specified: valid!
    return {
      valid: true,
      surah,
      from: 1,
      to: Math.min(maxVerses, 7),
    };
  }

  const from = rawFrom ? parseInt(rawFrom, 10) : 1;
  const to = rawTo ? parseInt(rawTo, 10) : maxVerses;

  if (isNaN(from) || isNaN(to) || from < 1 || to > maxVerses || from > to) {
    return { valid: false };
  }

  return {
    valid: true,
    surah,
    from,
    to,
  };
}
