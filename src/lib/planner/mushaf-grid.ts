import { SURAHS_META, getSurahByPage } from "@/lib/mushaf/data";
import { LessonSize, Direction, PlannerUnit } from "./types";

export const TOTAL_MUSHAF_PAGES = 604;

export function getPageTotalLines(page: number): number {
  if (page <= 0 || page > TOTAL_MUSHAF_PAGES) return 15;
  if (page === 1 || page === 2) return 8;
  return 15;
}

export function formatUnitLabel(page: number, startLine: number, endLine: number): { label: string; surahNumber: number; surahName: string } {
  const surahs = getSurahByPage(page);
  const primarySurah = surahs[0] || SURAHS_META[0];
  const surahName = primarySurah.name_simple;
  const surahNumber = primarySurah.id;
  
  const lineStr = startLine === endLine ? `line ${startLine}` : `lines ${startLine}–${endLine}`;
  const label = `${surahName} · Page ${page}, ${lineStr}`;
  return { label, surahNumber, surahName };
}

/**
 * Generates all sequential units across the Madani Mushaf for a given lesson size.
 * Lessons are aligned to pages (a lesson does not cross a page boundary so students
 * always practice a discrete block of lines on a single Mushaf page).
 */
export function generateMushafUnits(lessonSize: LessonSize = 7, direction: Direction = "forward"): PlannerUnit[] {
  const units: PlannerUnit[] = [];

  const pageOrder: number[] = [];
  if (direction === "backward") {
    // Juz 30 back to Juz 1
    for (let p = TOTAL_MUSHAF_PAGES; p >= 1; p--) {
      pageOrder.push(p);
    }
  } else {
    // Forward from Page 1 to 604
    for (let p = 1; p <= TOTAL_MUSHAF_PAGES; p++) {
      pageOrder.push(p);
    }
  }

  for (const page of pageOrder) {
    const totalLines = getPageTotalLines(page);
    let curLine = 1;

    while (curLine <= totalLines) {
      const endLine = Math.min(totalLines, curLine + lessonSize - 1);
      const { label, surahNumber, surahName } = formatUnitLabel(page, curLine, endLine);
      const id = `p${page}-l${curLine}-${endLine}`;

      units.push({
        id,
        startPage: page,
        startLine: curLine,
        endPage: page,
        endLine,
        label,
        surahNumber,
        surahName,
      });

      curLine = endLine + 1;
    }
  }

  return units;
}

/**
 * Finds all units belonging to specific pages, surahs, or juzs.
 */
export function getUnitsForPages(units: PlannerUnit[], pages: number[]): PlannerUnit[] {
  const pageSet = new Set(pages);
  return units.filter((u) => pageSet.has(u.startPage));
}

export function getUnitsForSurah(units: PlannerUnit[], surahId: number): PlannerUnit[] {
  return units.filter((u) => u.surahNumber === surahId);
}
