export interface SearchableReciter {
  id: number;
  name: string;
  nameArabic?: string | null;
  style?: string | null;
  [key: string]: any;
}

/**
 * Normalizes Arabic-to-English transliterated names so common spelling variants match:
 * - ahmed <-> ahmad
 * - nufeis <-> nufais
 * - al- / el- prefix handling
 * - double consonants, vowels (y/i, ee/i, oo/u, etc.)
 */
export function normalizeReciterString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[-_'.]/g, " ") // replace punctuation with spaces
    .replace(/\bal\b|\bel\b/g, " ") // separate/remove "al" / "el" particles
    .replace(/\bahmed\b/g, "ahmad")
    .replace(/\bmohammed\b|\bmohamed\b/g, "muhammad")
    .replace(/\babdel\b/g, "abdul")
    .replace(/ei/g, "ai")
    .replace(/ey/g, "ay")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/ou/g, "u")
    .replace(/y/g, "i")
    .replace(/ss/g, "s")
    .replace(/jj/g, "j")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filters and ranks a list of reciters against a search query.
 * Supports:
 * - Multi-token queries (e.g. "Ahmed Nufeis" or "Mishary Alafasi")
 * - Transliteration variations ("Ahmed" vs "Ahmad", "Nufeis" vs "Nufais")
 * - Arabic script queries (e.g. "أحمد النفيس")
 * - Prefix-based ranking (names starting with the query appear first)
 */
export function filterReciters<T extends SearchableReciter>(
  reciters: T[],
  query: string
): T[] {
  if (!query || !query.trim()) return reciters;

  const rawQuery = query.toLowerCase().trim();
  const normQuery = normalizeReciterString(query);
  const queryTokens = rawQuery.split(/\s+/).filter(Boolean);
  const normTokens = normQuery.split(/\s+/).filter(Boolean);

  interface ScoredReciter {
    reciter: T;
    score: number;
    index: number;
  }

  const scored: ScoredReciter[] = [];

  reciters.forEach((reciter, index) => {
    const rawName = reciter.name.toLowerCase();
    const normName = normalizeReciterString(reciter.name);
    const nameArabic = reciter.nameArabic || "";
    const style = (reciter.style || "").toLowerCase();
    const normStyle = normalizeReciterString(reciter.style || "");

    // 1. Check if all query terms match
    let allTokensMatch = true;
    for (let i = 0; i < queryTokens.length; i++) {
      const qToken = queryTokens[i];
      const nToken = normTokens[i] || qToken;

      const inRaw = rawName.includes(qToken);
      const inNorm = normName.includes(nToken);
      const inArabic = nameArabic.includes(qToken);
      const inStyle = style.includes(qToken) || normStyle.includes(nToken);

      if (!inRaw && !inNorm && !inArabic && !inStyle) {
        allTokensMatch = false;
        break;
      }
    }

    if (!allTokensMatch) return;

    // 2. Compute relevance score (higher is better)
    let score = 0;

    // Exact raw or normalized match
    if (rawName === rawQuery || normName === normQuery) {
      score += 1000;
    }
    // Starts with raw or normalized query
    else if (rawName.startsWith(rawQuery) || normName.startsWith(normQuery)) {
      score += 500;
    }
    // First name matches first token
    else {
      const firstRawWord = rawName.split(/\s+/)[0];
      const firstNormWord = normName.split(/\s+/)[0];
      if (
        firstRawWord === queryTokens[0] ||
        firstNormWord === normTokens[0]
      ) {
        score += 300;
      } else if (
        firstRawWord?.startsWith(queryTokens[0]) ||
        firstNormWord?.startsWith(normTokens[0])
      ) {
        score += 200;
      }
    }

    // Bonus for matching in Arabic directly
    if (nameArabic.includes(rawQuery)) {
      score += 150;
    }

    // Match in name is worth more than style
    if (rawName.includes(rawQuery) || normName.includes(normQuery)) {
      score += 100;
    }

    scored.push({ reciter, score, index });
  });

  // Sort descending by score, then preserve original order
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored.map((s) => s.reciter);
}
