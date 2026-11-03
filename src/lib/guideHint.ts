export const GUIDE_HINT_DISMISSED_KEY = "qcs-guide-hint-dismissed";

export function shouldShowGuideHint(storedValue: string | null) {
  return storedValue !== "1";
}
