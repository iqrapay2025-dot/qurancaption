import type { TourStep } from "./types";

/**
 * Filter out steps whose target selector does not exist in the DOM.
 * Centered steps (no target) are always preserved.
 */
export function filterAvailableSteps(
  steps: TourStep[],
  doc: Document = typeof document !== "undefined" ? document : ({} as Document)
): TourStep[] {
  if (!doc.querySelector) {
    // If not in a browser/DOM environment, return all steps
    return steps;
  }

  return steps.filter((step) => {
    if (!step.target || step.target.trim() === "") {
      return true; // Centered popover, always valid
    }
    try {
      const el = doc.querySelector(step.target);
      return Boolean(el);
    } catch {
      return false;
    }
  });
}
