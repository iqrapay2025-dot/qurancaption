// Arabic text normalization for matching recognized speech against Quran verses.
// All character classes use single-backslash \u escapes (no pasted Arabic letters).

const REMOVE_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED\u200C-\u200F\u060C\u061B\u061F\u06D4]/g;
const PUNCT_REGEX = /[.,;:?!'"\u2026\u201E()\[\]\-]/g;

export function normalizeArabic(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .replace(REMOVE_REGEX, "")
    .replace(PUNCT_REGEX, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627") // alef forms, incl. alef wasla
    .replace(/\u0649/g, "\u064A") // alef maqsura to ya
    .replace(/\u0629/g, "\u0647") // ta marbuta to ha
    .replace(/\u0624/g, "\u0648") // hamza on waw to waw
    .replace(/\u0626/g, "\u064A") // hamza on ya to ya
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const n = normalizeArabic(text);
  return n ? n.split(" ") : [];
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

// 1 = identical after normalization, 0 = nothing in common.
export function wordSimilarity(a: string, b: string): number {
  const x = normalizeArabic(a);
  const y = normalizeArabic(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}
