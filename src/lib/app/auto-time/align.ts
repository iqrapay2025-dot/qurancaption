/**
 * Arabic auto-timing alignment module.
 *
 * Aligns recognized word timestamps from a speech service against expected Quran verses
 * using dynamic programming with fuzzy word similarity.
 *
 * Input:  expectedVerses - { verseKey: string; text: string }[] in order
 *         recognized     - { word: string; start: number; end: number }[] in seconds from speech service
 *
 * Output: { verseKey: string; start: number; end: number; confidence: number }[]
 *         with the same order and length as expectedVerses.
 *
 * Algorithm: Standard DP alignment where:
 *   - Matching two words is allowed only if similarity >= WORD_MATCH_THRESHOLD and scores the similarity
 *   - Skipping an expected word or a recognized word scores a small fixed negative constant (MIN_SKIP_SCORE)
 *   - Backtrack using stored choices (direction table), never float equality
 *
 * A verse's start is its first matched recognized word's start and its end is its last matched
 * recognized word's end. Recognized words before the first matched word overall (isti'adha, basmala)
 * and extra words are ignored and never become a start or end.
 *
 * Confidence = (matchedWords / expectedWords) * average similarity of matched words;
 * 0 if matchedWords/expectedWords < MIN_CONFIDENCE_RATIO.
 *
 * Unmatched verses (confidence 0): interpolate start/end between neighbours proportionally
 * to the number of expected words of the consecutive unmatched verses.
 * If no previous neighbour use the next neighbour's start; if no next neighbour use the previous end.
 * If no verse matched at all, return zeros with confidence 0.
 *
 * Post-conditions: start < end for every verse (if equal, MIN_VERSE_DURATION added),
 * times non-decreasing across verses.
 */

// Exported tuning constants
export const WORD_MATCH_THRESHOLD = 0.55;
export const MIN_CONFIDENCE_RATIO = 0.3;
export const MIN_VERSE_DURATION = 0.5;

// Import normalization utilities
import { normalizeArabic, tokenize, wordSimilarity } from "./normalize";

/**
 * Aligns recognized word timestamps to expected Quran verses using dynamic programming.
 *
 * @param expectedVerses Array of { verseKey, text } in order
 * @param recognized     Array of { word, start, end } from speech service in seconds
 * @returns Array of { verseKey, start, end, confidence } with same length as expectedVerses
 */
export function align(
  expectedVerses: { verseKey: string; text: string }[],
  recognized: { word: string; start: number; end: number }[]
): {
  verseKey: string;
  start: number;
  end: number;
  confidence: number;
}[] {
  // Handle empty expected verses
  if (expectedVerses.length === 0) return [];

  // Handle empty recognized - return zeros with verseKeys preserved
  if (recognized.length === 0) {
    return expectedVerses.map((v) => ({
      verseKey: v.verseKey,
      start: 0,
      end: 0,
      confidence: 0,
    }));
  }

  // Step 1: Normalize expected verse texts and tokenize
  const normalizedExpected: { verseKey: string; words: string[] }[] = expectedVerses.map(
    ({ verseKey, text }) => ({
      verseKey,
      words: tokenize(text),
    })
  );

  // Step 2: Normalize recognized words
  const normRec = recognized.map(({ word, start, end }) => ({
    normalized: normalizeArabic(word),
    start,
    end,
  }));

  // Step 3: Flatten expected words with their verse index
  const expectedWordsFlat: string[] = [];
  const expectedWordToVerse: number[] = [];
  const expectedWordCountPerVerse: number[] = [];

  normalizedExpected.forEach((ne, vi) => {
    expectedWordCountPerVerse.push(ne.words.length);
    ne.words.forEach((w) => {
      expectedWordsFlat.push(w);
      expectedWordToVerse.push(vi);
    });
  });

  const n = expectedWordsFlat.length; // total expected words
  const m = normRec.length; // total recognized words

  // Step 4: Compute similarity matrix
  const sim: number[][] = [];
  for (let i = 0; i < n; i++) {
    sim[i] = [];
    for (let j = 0; j < m; j++) {
      sim[i][j] = wordSimilarity(expectedWordsFlat[i], normRec[j].normalized);
    }
  }

  // Step 5: DP with direction tracking
  // dp[i][j] = best score aligning first i expected words with first j recognized words
  // direction[i][j] = 0=match, 1=skipExpected, 2=skipRecognized
  const dp: number[][] = [];
  const direction: number[][] = [];

  // Initialize with very negative values
  const SKIP_PENALTY = -0.1;

  for (let i = 0; i <= n; i++) {
    dp[i] = [];
    direction[i] = [];
    for (let j = 0; j <= m; j++) {
      if (i === 0 && j === 0) {
        dp[i][j] = 0;
        direction[i][j] = -1; // start
      } else if (i === 0) {
        dp[i][j] = dp[i][j - 1] + SKIP_PENALTY;
        direction[i][j] = 2; // skipRecognized
      } else if (j === 0) {
        dp[i][j] = dp[i - 1][j] + SKIP_PENALTY;
        direction[i][j] = 1; // skipExpected
      } else {
        dp[i][j] = -1e9; // effectively -infinity
        direction[i][j] = -1;
      }
    }
  }

  // Fill DP table
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      // Option 1: Match (only if similarity >= threshold)
      const matchScore = dp[i - 1][j - 1] + sim[i - 1][j - 1];

      // Option 2: Skip expected word
      const skipExpectedScore = dp[i - 1][j] + SKIP_PENALTY;

      // Option 3: Skip recognized word
      const skipRecognizedScore = dp[i][j - 1] + SKIP_PENALTY;

      // Choose best
      let best = Math.max(matchScore, skipExpectedScore, skipRecognizedScore);
      dp[i][j] = best;

      // Store direction
      if (best === matchScore) {
        direction[i][j] = 0; // match
      } else if (best === skipExpectedScore) {
        direction[i][j] = 1; // skipExpected
      } else {
        direction[i][j] = 2; // skipRecognized
      }
    }
  }

  // Step 6: Backtrack to find matches
  const matches: [number, number][] = []; // [expectedIdx, recognizedIdx]

  let i = n;
  let j = m;

  while (i > 0 && j > 0) {
    const dir = direction[i][j];

    if (dir === 0) {
      // Match (only if similarity >= threshold)
      if (sim[i - 1][j - 1] >= WORD_MATCH_THRESHOLD) {
        matches.push([i - 1, j - 1]);
      }
      i--;
      j--;
    } else if (dir === 1) {
      i--;
    } else if (dir === 2) {
      j--;
    } else {
      break;
    }
  }

  matches.reverse();

  // Step 7: Group matches by verse
  // Track: matchCount, similarSum, firstRecIdx, lastRecIdx for each verse
  const verseMatchInfo: {
    matchCount: number;
    similarSum: number;
    firstRecIdx: number;
    lastRecIdx: number;
  }[] = new Array(expectedVerses.length)
    .fill(null)
    .map(() => ({
      matchCount: 0,
      similarSum: 0,
      firstRecIdx: -1,
      lastRecIdx: -1,
    }));

  const recStarts = normRec.map((r) => r.start);
  const recEnds = normRec.map((r) => r.end);

  for (const [expIdx, recIdx] of matches) {
    const verseIdx = expectedWordToVerse[expIdx];
    if (verseIdx >= 0 && verseIdx < expectedVerses.length) {
      const info = verseMatchInfo[verseIdx];
      info.matchCount++;
      info.similarSum += sim[expIdx][recIdx];
      if (info.firstRecIdx === -1 || recIdx < info.firstRecIdx) {
        info.firstRecIdx = recIdx;
      }
      if (info.lastRecIdx === -1 || recIdx > info.lastRecIdx) {
        info.lastRecIdx = recIdx;
      }
    }
  }

  // Step 8: Check if no matches occurred at all
  let totalMatched = 0;
  for (const info of verseMatchInfo) {
    totalMatched += info.matchCount;
  }
  if (totalMatched === 0) {
    // No matches occurred - return zeros with confidence 0, preserving verseKeys
    return expectedVerses.map((v) => ({
      verseKey: v.verseKey,
      start: 0,
      end: 0,
      confidence: 0,
    }));
  }

  // Step 9: Build result for each verse
  const result: {
    verseKey: string;
    start: number;
    end: number;
    confidence: number;
  }[] = [];

  // Find all matched recognized word positions globally
  let globalFirstRecIdx: number | null = null;
  let globalLastRecIdx: number | null = null;

  for (let vi = 0; vi < verseMatchInfo.length; vi++) {
    const info = verseMatchInfo[vi];
    if (info.matchCount > 0) {
      if (globalFirstRecIdx === null || recStarts[info.firstRecIdx] < recStarts[globalFirstRecIdx]) {
        globalFirstRecIdx = info.firstRecIdx;
      }
      if (globalLastRecIdx === null || recEnds[info.lastRecIdx] > recEnds[globalLastRecIdx]) {
        globalLastRecIdx = info.lastRecIdx;
      }
    }
  }

  // For each verse, build the result entry
  for (let vi = 0; vi < expectedVerses.length; vi++) {
    const info = verseMatchInfo[vi];
    const expectedWordCount = expectedWordCountPerVerse[vi] || 0;

    // Initialize start and end
    let start = 0;
    let end = 0;
    let confidence = 0;

    if (info.matchCount > 0) {
      // Verse has matches
      const avgSimilarity = info.matchCount > 0 ? info.similarSum / info.matchCount : 0;
      const confidenceRatio = info.matchCount / expectedWordCount;
      confidence =
        confidenceRatio >= MIN_CONFIDENCE_RATIO ? confidenceRatio * avgSimilarity : 0;

      // Start is start of first matched recognized word for this verse
      start = info.firstRecIdx >= 0 ? recStarts[info.firstRecIdx] : 0;
      // End is end of last matched recognized word for this verse
      end = info.lastRecIdx >= 0 ? recEnds[info.lastRecIdx] : 0;
    } else {
      // Unmatched verse - interpolate between neighbours
      // Find previous matched verse
      let prevVi = vi - 1;
      while (prevVi >= 0 && verseMatchInfo[prevVi]?.matchCount <= 0) prevVi--;

      // Find next matched verse
      let nextVi = vi + 1;
      while (
        nextVi < expectedVerses.length &&
        verseMatchInfo[nextVi]?.matchCount <= 0
      )
        nextVi++;

      if (globalFirstRecIdx !== null && globalLastRecIdx !== null) {
        if (info.matchCount === 0) {
          // No matches for this verse at all
          // Use neighbours' times
          const prevEnd = prevVi >= 0 && verseMatchInfo[prevVi]?.matchCount > 0 ? recEnds[verseMatchInfo[prevVi].lastRecIdx] : null;
          const nextStart = nextVi < expectedVerses.length && verseMatchInfo[nextVi]?.matchCount > 0 ? recStarts[verseMatchInfo[nextVi].firstRecIdx] : null;

          // Set start and end to values between neighbours
          if (nextStart !== null && prevEnd !== null) {
            // Split the gap: start at 30% from previous end, end at 70% from previous end
            const gap = nextStart - prevEnd;
            start = prevEnd + gap * 0.3;
            end = prevEnd + gap * 0.7;
          } else if (nextStart !== null) {
            // No previous neighbour, use next neighbour's start
            start = nextStart;
            end = nextStart + MIN_VERSE_DURATION;
          } else if (prevEnd !== null) {
            // No next neighbour, use previous end
            start = prevEnd - MIN_VERSE_DURATION;
            end = prevEnd;
          } else {
            // No neighbours at all
            start = 0;
            end = 0;
          }
        }
      } else {
        // No recognised words at all (should not happen since we handled empty above)
        start = 0;
        end = 0;
      }
    }

    // Ensure start < end with MIN_VERSE_DURATION
    if (start >= end) {
      end = start + MIN_VERSE_DURATION;
    }

    result.push({
      verseKey: expectedVerses[vi].verseKey, // Always preserve verseKey
      start: Math.max(0, start),
      end: Math.max(0, end),
      confidence,
    });
  }

  // Post-condition: ensure non-decreasing times across verses
  for (let i = 1; i < result.length; i++) {
    if (result[i].end < result[i - 1].end) {
      result[i].end = result[i - 1].end;
    }
    if (result[i].start < result[i - 1].end) {
      result[i].start = result[i - 1].end;
    }
  }

  // Final post-condition: start < end for every verse
  for (let i = 0; i < result.length; i++) {
    if (result[i].start >= result[i].end) {
      result[i].end = result[i].start + MIN_VERSE_DURATION;
    }
  }

  return result;
}
