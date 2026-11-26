import { MushafLine, MushafWord } from "@/lib/mushaf/types";
import { StrengthRating, SabaqCompletion } from "./types";

export interface TargetVerseWord {
  globalWordIndex: number; // 0-based index in stage.passageWords
  text: string;
}

export interface TargetVerseItem {
  verseKey: string;
  surahNumber?: number;
  ayahNumber?: number;
  words: TargetVerseWord[];
  textArabic: string;
  isStartVerse: boolean;
  isStopVerse: boolean;
}

export interface SpotCheckStage {
  id: string;
  stageNumber: number;
  totalStages: number;
  // Starting verse key, e.g. "1:4"
  verseKey: string;
  surahNumber?: number;
  ayahNumber?: number;
  // Stopping verse key and label, e.g. "1:6" / "Ayah 6"
  endVerseKey: string;
  endAyahNumber?: number;
  // Clean instruction, e.g. "Start reciting from Ayah 4:"
  promptInstruction: string;
  // The anchor verse shown to the user
  promptVerseArabic: string;
  // Scope, e.g. "Recite this verse and continue to the end of the passage"
  scopeDescription: string;
  // Clear stop instruction, e.g. "Stop after reciting Ayah 6"
  stopInstruction: string;
  // Full text of the passage to be recited from this anchor forward
  passageArabic: string;
  passageWords: string[];
  // Structured verses for display with stop indicator
  targetVerses: TargetVerseItem[];
}

export interface MasterySpotCheckData {
  unitLabel: string;
  totalVersesInUnit: number;
  stages: SpotCheckStage[];
}

export interface MasteryVerdict {
  percentage: number;
  correctCount: number;
  totalCount: number;
  mistakesCount: number;
  rating: StrengthRating;
  sabaqResult: SabaqCompletion;
  title: string;
  description: string;
  badgeColor: string; // Flat color style
}

function cleanWord(w?: string): string {
  if (!w) return "";
  return w.trim();
}

/**
 * Generates an authentic 2-to-3 stage Quran Spot-Check Examination (Imtihan).
 * Instead of multiple choice questions, the student is asked to recite from
 * 2 or 3 random starting points within the memorized portion.
 * Clearly displays the target verses and indicates where to stop.
 */
export function generateMasteryQuiz(
  lines: MushafLine[],
  unitLabel: string,
  _allPageLines?: MushafLine[]
): MasterySpotCheckData {
  // Group words in the unit by verse_key in order
  const verseMap = new Map<string, MushafWord[]>();
  for (const line of lines) {
    if (Array.isArray(line.words)) {
      for (const w of line.words) {
        if (w.char_type_name === "word" && (w.text_uthmani || w.text_qpc_hafs)) {
          const vk = w.verse_key || `L-${line.line_number}`;
          if (!verseMap.has(vk)) {
            verseMap.set(vk, []);
          }
          verseMap.get(vk)!.push(w);
        }
      }
    }
  }

  const verseKeys = Array.from(verseMap.keys());
  const totalVerses = verseKeys.length;
  const stages: SpotCheckStage[] = [];

  if (totalVerses >= 5) {
    // 3 Spot-Check Stages across the portion
    // Stage 1: Spot check from ~50% (middle)
    // Stage 2: Spot check from ~20% (early-middle)
    // Stage 3: Spot check from ~80% (late portion)
    const midIdx = Math.floor(totalVerses * 0.5);
    const earlyIdx = Math.max(1, Math.floor(totalVerses * 0.2));
    const lateIdx = Math.min(totalVerses - 1, Math.floor(totalVerses * 0.8));

    const selectedIndices = [midIdx, earlyIdx, lateIdx];

    selectedIndices.forEach((vIdx, sNum) => {
      const vk = verseKeys[vIdx];
      const words = verseMap.get(vk)!;
      const parts = vk.split(":");
      const surahNum = parts.length === 2 ? parseInt(parts[0], 10) : undefined;
      const ayahNum = parts.length === 2 ? parseInt(parts[1], 10) : undefined;

      const promptVerseArabic = words.map((w) => cleanWord(w.text_uthmani || w.text_qpc_hafs)).join(" ");

      // Passage spans from this verse forward 2-3 verses or to the end of the unit
      const passageWordsList: string[] = [];
      const targetVerses: TargetVerseItem[] = [];
      const endSlice = Math.min(totalVerses, vIdx + 3);

      let globalWordCounter = 0;
      for (let i = vIdx; i < endSlice; i++) {
        const curVk = verseKeys[i];
        const curWords = verseMap.get(curVk) || [];
        const cParts = curVk.split(":");
        const cSurah = cParts.length === 2 ? parseInt(cParts[0], 10) : undefined;
        const cAyah = cParts.length === 2 ? parseInt(cParts[1], 10) : undefined;

        const verseWords: TargetVerseWord[] = [];
        const verseTextList: string[] = [];

        for (const pw of curWords) {
          const wClean = cleanWord(pw.text_uthmani || pw.text_qpc_hafs);
          if (wClean) {
            verseWords.push({
              globalWordIndex: globalWordCounter,
              text: wClean,
            });
            verseTextList.push(wClean);
            passageWordsList.push(wClean);
            globalWordCounter++;
          }
        }

        targetVerses.push({
          verseKey: curVk,
          surahNumber: cSurah,
          ayahNumber: cAyah,
          words: verseWords,
          textArabic: verseTextList.join(" "),
          isStartVerse: i === vIdx,
          isStopVerse: i === endSlice - 1,
        });
      }

      const endVk = verseKeys[endSlice - 1];
      const endParts = endVk.split(":");
      const endAyahNum = endParts.length === 2 ? parseInt(endParts[1], 10) : undefined;
      const ayahLabel = ayahNum ? `Ayah ${ayahNum}` : vk;
      const endAyahLabel = endAyahNum ? `Ayah ${endAyahNum}` : endVk;
      const numToRecite = endSlice - vIdx;

      stages.push({
        id: `stage-${sNum + 1}`,
        stageNumber: sNum + 1,
        totalStages: 3,
        verseKey: vk,
        surahNumber: surahNum,
        ayahNumber: ayahNum,
        endVerseKey: endVk,
        endAyahNumber: endAyahNum,
        promptInstruction: `Start reciting from ${ayahLabel}:`,
        promptVerseArabic,
        scopeDescription:
          numToRecite > 1
            ? `Recite ${ayahLabel} and continue through the next ${numToRecite - 1} ${numToRecite - 1 === 1 ? "verse" : "verses"}.`
            : `Recite ${ayahLabel} completely to the end.`,
        stopInstruction: `Stop after reciting ${endAyahLabel}`,
        passageArabic: passageWordsList.join(" "),
        passageWords: passageWordsList,
        targetVerses,
      });
    });
  } else if (totalVerses >= 2) {
    // 2 Spot-Check Stages for smaller portions (2 to 4 verses)
    const firstIdx = Math.floor(totalVerses / 2); // Middle
    const secondIdx = 0; // Beginning or end

    [firstIdx, secondIdx].forEach((vIdx, sNum) => {
      const vk = verseKeys[vIdx];
      const words = verseMap.get(vk)!;
      const parts = vk.split(":");
      const surahNum = parts.length === 2 ? parseInt(parts[0], 10) : undefined;
      const ayahNum = parts.length === 2 ? parseInt(parts[1], 10) : undefined;

      const promptVerseArabic = words.map((w) => cleanWord(w.text_uthmani || w.text_qpc_hafs)).join(" ");
      const passageWordsList: string[] = [];
      const targetVerses: TargetVerseItem[] = [];

      let globalWordCounter = 0;
      for (let i = vIdx; i < totalVerses; i++) {
        const curVk = verseKeys[i];
        const curWords = verseMap.get(curVk) || [];
        const cParts = curVk.split(":");
        const cSurah = cParts.length === 2 ? parseInt(cParts[0], 10) : undefined;
        const cAyah = cParts.length === 2 ? parseInt(cParts[1], 10) : undefined;

        const verseWords: TargetVerseWord[] = [];
        const verseTextList: string[] = [];

        for (const pw of curWords) {
          const wClean = cleanWord(pw.text_uthmani || pw.text_qpc_hafs);
          if (wClean) {
            verseWords.push({
              globalWordIndex: globalWordCounter,
              text: wClean,
            });
            verseTextList.push(wClean);
            passageWordsList.push(wClean);
            globalWordCounter++;
          }
        }

        targetVerses.push({
          verseKey: curVk,
          surahNumber: cSurah,
          ayahNumber: cAyah,
          words: verseWords,
          textArabic: verseTextList.join(" "),
          isStartVerse: i === vIdx,
          isStopVerse: i === totalVerses - 1,
        });
      }

      const endVk = verseKeys[totalVerses - 1];
      const endParts = endVk.split(":");
      const endAyahNum = endParts.length === 2 ? parseInt(endParts[1], 10) : undefined;
      const ayahLabel = ayahNum ? `Ayah ${ayahNum}` : vk;
      const endAyahLabel = endAyahNum ? `Ayah ${endAyahNum}` : endVk;

      stages.push({
        id: `stage-${sNum + 1}`,
        stageNumber: sNum + 1,
        totalStages: 2,
        verseKey: vk,
        surahNumber: surahNum,
        ayahNumber: ayahNum,
        endVerseKey: endVk,
        endAyahNumber: endAyahNum,
        promptInstruction: `Start reciting from ${ayahLabel}:`,
        promptVerseArabic,
        scopeDescription: `Recite ${ayahLabel} and continue through the portion.`,
        stopInstruction: `Stop after reciting ${endAyahLabel}`,
        passageArabic: passageWordsList.join(" "),
        passageWords: passageWordsList,
        targetVerses,
      });
    });
  } else {
    // 1 Verse Portion (e.g. single long ayah)
    const vk = verseKeys[0] || "Portion";
    const words = verseMap.get(vk) || [];
    const parts = vk.split(":");
    const surahNum = parts.length === 2 ? parseInt(parts[0], 10) : undefined;
    const ayahNum = parts.length === 2 ? parseInt(parts[1], 10) : undefined;

    const midPoint = Math.max(2, Math.floor(words.length / 2));
    const firstHalfWords = words.slice(0, midPoint).map((w) => cleanWord(w.text_uthmani || w.text_qpc_hafs));
    const secondHalfWords = words.slice(midPoint).map((w) => cleanWord(w.text_uthmani || w.text_qpc_hafs));

    const ayahLabel = ayahNum ? `Ayah ${ayahNum}` : vk;

    stages.push({
      id: "stage-1",
      stageNumber: 1,
      totalStages: 2,
      verseKey: vk,
      surahNumber: surahNum,
      ayahNumber: ayahNum,
      endVerseKey: vk,
      endAyahNumber: ayahNum,
      promptInstruction: `Recite the first half of ${ayahLabel}:`,
      promptVerseArabic: firstHalfWords.slice(0, 4).join(" ") + " ...",
      scopeDescription: `Recite from the beginning of ${ayahLabel} through the middle pause.`,
      stopInstruction: `Stop at the middle pause of ${ayahLabel}`,
      passageArabic: firstHalfWords.join(" "),
      passageWords: firstHalfWords,
      targetVerses: [
        {
          verseKey: vk,
          surahNumber: surahNum,
          ayahNumber: ayahNum,
          words: firstHalfWords.map((t, idx) => ({ globalWordIndex: idx, text: t })),
          textArabic: firstHalfWords.join(" "),
          isStartVerse: true,
          isStopVerse: true,
        },
      ],
    });

    stages.push({
      id: "stage-2",
      stageNumber: 2,
      totalStages: 2,
      verseKey: vk,
      surahNumber: surahNum,
      ayahNumber: ayahNum,
      endVerseKey: vk,
      endAyahNumber: ayahNum,
      promptInstruction: `Now continue from the middle of ${ayahLabel}:`,
      promptVerseArabic: secondHalfWords.slice(0, 4).join(" ") + " ...",
      scopeDescription: `Recite the second half through to the end of the verse.`,
      stopInstruction: `Stop at the end of ${ayahLabel}`,
      passageArabic: secondHalfWords.join(" "),
      passageWords: secondHalfWords,
      targetVerses: [
        {
          verseKey: vk,
          surahNumber: surahNum,
          ayahNumber: ayahNum,
          words: secondHalfWords.map((t, idx) => ({ globalWordIndex: idx, text: t })),
          textArabic: secondHalfWords.join(" "),
          isStartVerse: true,
          isStopVerse: true,
        },
      ],
    });
  }

  return {
    unitLabel,
    totalVersesInUnit: totalVerses,
    stages,
  };
}

/**
 * Calculates the automated spaced-repetition verdict based on spot-check stages passed.
 * - Flawless (0 mistakes/peeks across stages): Strong ⭐
 * - 1 slip or peek: Okay 👍
 * - 2+ slips or abandoned: Weak ⚠️
 */
export function calculateMasteryVerdict(
  passedStagesCount: number,
  totalStagesCount: number,
  mistakesCount: number = 0
): MasteryVerdict {
  const percentage =
    totalStagesCount > 0
      ? Math.max(0, Math.round(((passedStagesCount * 10 - mistakesCount * 3) / (totalStagesCount * 10)) * 100))
      : 0;

  if (percentage >= 85 && mistakesCount <= 1) {
    return {
      percentage,
      correctCount: passedStagesCount,
      totalCount: totalStagesCount,
      mistakesCount,
      rating: "strong",
      sabaqResult: "yes",
      title: "Flawless Spot-Check Recall!",
      description:
        "You recited accurately from random starting points without hesitation. Review interval expanded (due in 5–8 days).",
      badgeColor: "emerald",
    };
  }

  if (percentage >= 50 && mistakesCount <= 3) {
    return {
      percentage,
      correctCount: passedStagesCount,
      totalCount: totalStagesCount,
      mistakesCount,
      rating: "okay",
      sabaqResult: "yes",
      title: "Good Recitation!",
      description:
        "Good overall recall with slight hesitation on one spot check. Maintained in your revision cycle (due in 2–4 days).",
      badgeColor: "sky",
    };
  }

  return {
    percentage,
    correctCount: passedStagesCount,
    totalCount: totalStagesCount,
    mistakesCount,
    rating: "weak",
    sabaqResult: "partly",
    title: "Needs Revision",
    description:
      "Difficulty jumping into verses from random starting points. Scheduled for review tomorrow to solidify recall.",
    badgeColor: "amber",
  };
}
