/**
 * Arabic Voice Recognition and Word Alignment Helper
 * Normalizes classical Quranic Arabic and spoken Arabic transcripts to evaluate recitation accuracy.
 * Identifies accurately recited words (green) and errors/skipped words (red text).
 */

export type WordRecitationStatus = "matched" | "error" | "unrecited";

export interface WordMatchResult {
  matchedIndices: number[]; // Indices of target words matched correctly (green)
  missedIndices: number[]; // Indices of target words not matched
  errorIndices: number[]; // Explicit indices of words with errors or skips (red text)
  wordStatuses: WordRecitationStatus[]; // Per-word status for direct UI rendering
  highestRecitedIndex: number;
  accuracyPercentage: number;
  spokenTranscript: string;
}

/**
 * Strips tashkeel (harakat), tatweel, and normalizes alefs/yehs for accurate speech matching.
 */
export function normalizeArabicSpeech(input: string): string {
  if (!input) return "";

  return input
    // Remove diacritics / harakat including dagger alif (\u0670)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, "")
    // Remove tatweel (kashida \u0640)
    .replace(/\u0640/g, "")
    // Normalize Alefs (أ, إ, آ, ٱ, ء -> ا)
    .replace(/[أإآٱء]/g, "ا")
    // Normalize Yehs (ى -> ي)
    .replace(/ى/g, "ي")
    // Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, "ه")
    // Remove Quranic pause marks, verse end symbols, and punctuation
    .replace(/[\u06D6-\u06ED\uFD3E\uFD3F.,:;!?()\[\]{}"'\-—ـ]/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Checks whether a spoken token matches a Quranic target word,
 * accounting for classical orthography differences (e.g. الرحمن vs الرحمان, مالك vs ملك).
 */
export function isArabicWordMatch(spokenToken: string, targetWord: string): boolean {
  const s = normalizeArabicSpeech(spokenToken);
  const t = normalizeArabicSpeech(targetWord);
  if (!s || !t) return false;
  if (s === t) return true;
  if (s.includes(t) || t.includes(s)) return true;
  // Match ignoring internal alifs (e.g. الرحمن vs الرحمان, صرط vs صراط, ملك vs مالك)
  if (s.replace(/ا/g, "") === t.replace(/ا/g, "")) return true;
  return false;
}

/**
 * Evaluates spoken transcript against the expected words of a verse/passage.
 * Flags matched words (green), error/skipped words (red), and unrecited words.
 */
export function evaluateSpokenRecitation(
  spokenTranscript: string,
  expectedWords: string[],
  options?: { isLive?: boolean }
): WordMatchResult {
  const normSpoken = normalizeArabicSpeech(spokenTranscript);
  const spokenTokens = normSpoken.split(" ").filter(Boolean);

  const matchedIndices: number[] = [];
  const missedIndices: number[] = [];
  const errorIndices: number[] = [];

  let searchStartIndex = 0;
  let highestMatchedIdx = -1;

  expectedWords.forEach((rawWord, idx) => {
    const normTarget = normalizeArabicSpeech(rawWord);
    if (!normTarget) {
      matchedIndices.push(idx);
      return;
    }

    // Look for target word in spoken tokens starting from last match position
    let found = false;
    for (let sIdx = searchStartIndex; sIdx < spokenTokens.length; sIdx++) {
      const token = spokenTokens[sIdx];
      if (isArabicWordMatch(token, normTarget)) {
        found = true;
        searchStartIndex = sIdx + 1;
        break;
      }
    }

    if (found) {
      matchedIndices.push(idx);
      if (idx > highestMatchedIdx) {
        highestMatchedIdx = idx;
      }
    } else {
      missedIndices.push(idx);
    }
  });

  // Calculate error indices:
  // If live: any missed word that came before the highest matched index is an error (user skipped or errored).
  // If finalized (not live): any missed word is an error if the user actually spoke words.
  expectedWords.forEach((_, idx) => {
    if (missedIndices.includes(idx)) {
      if (options?.isLive) {
        if (highestMatchedIdx >= 0 && idx < highestMatchedIdx) {
          errorIndices.push(idx);
        }
      } else {
        if (spokenTokens.length > 0) {
          errorIndices.push(idx);
        }
      }
    }
  });

  const wordStatuses: WordRecitationStatus[] = expectedWords.map((_, idx) => {
    if (matchedIndices.includes(idx)) return "matched";
    if (errorIndices.includes(idx)) return "error";
    return "unrecited";
  });

  const accuracyPercentage =
    expectedWords.length > 0
      ? Math.round((matchedIndices.length / expectedWords.length) * 100)
      : 100;

  return {
    matchedIndices,
    missedIndices,
    errorIndices,
    wordStatuses,
    highestRecitedIndex: highestMatchedIdx,
    accuracyPercentage,
    spokenTranscript,
  };
}
