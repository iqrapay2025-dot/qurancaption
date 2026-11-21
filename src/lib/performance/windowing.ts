/**
 * Windowing / visible range calculation helper for large lists (e.g. Surah Al-Baqarah with 286 verses).
 */
export type VisibleRange = {
  startIndex: number;
  endIndex: number;
  totalItems: number;
  isVirtual: boolean;
};

export function calculateVisibleRange(
  totalItems: number,
  scrollTop: number,
  viewportHeight: number,
  itemHeight = 200,
  overscan = 5
): VisibleRange {
  if (totalItems <= 0) {
    return { startIndex: 0, endIndex: 0, totalItems: 0, isVirtual: false };
  }

  // If item count is small (e.g. <= 20 verses), no need to window
  if (totalItems <= 20) {
    return { startIndex: 0, endIndex: totalItems - 1, totalItems, isVirtual: false };
  }

  const rawStart = Math.floor(Math.max(0, scrollTop) / itemHeight);
  const visibleCount = Math.ceil(Math.max(100, viewportHeight) / itemHeight);

  const startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(totalItems - 1, rawStart + visibleCount + overscan);

  return {
    startIndex,
    endIndex,
    totalItems,
    isVirtual: true,
  };
}
