const BASE = (process.env.UMMAH_API_BASE_URL || "https://ummahapi.com").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public code: "not_configured" | "auth_failed" | "network_error" | "rate_limited" | "bad_request" | "upstream" | "malformed",
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

type Store = { cache: Map<string, { value: unknown; expiresAt: number }>; inflight: Map<string, Promise<unknown>> };
const g = globalThis as unknown as { __ummah?: Store };
const store: Store = (g.__ummah ??= { cache: new Map(), inflight: new Map() });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// UMMAH_API_KEY is optional (higher rate limits). UMMAH_REQUIRE_KEY=true turns a missing key into a configuration error.
function apiKey() {
  const k = process.env.UMMAH_API_KEY?.trim();
  if (!k && /^(1|true|yes)$/i.test(process.env.UMMAH_REQUIRE_KEY ?? "")) {
    throw new ApiError("not_configured", "UmmahAPI key is required but UMMAH_API_KEY is not set on the server.", 503);
  }
  return k || undefined;
}

export function keyMode() {
  return process.env.UMMAH_API_KEY?.trim() ? "keyed" : "anonymous";
}

function parseRetryAfter(res: Response) {
  const v = Number(res.headers.get("retry-after") ?? res.headers.get("ratelimit-reset"));
  return Number.isFinite(v) && v > 0 ? Math.ceil(v) : undefined;
}

type Query = Record<string, string | number | undefined>;
const isObj = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v);

export async function ummah<T = any>(path: string, query: Query = {}): Promise<T> {
  const key = apiKey();
  const url = new URL(`${BASE}/api${path}`);
  for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, String(v));
  const headers: Record<string, string> = { accept: "application/json", "User-Agent": "QuranCaptionStudio/1.0" };
  if (key) headers["X-API-Key"] = key;

  let attempt = 0;
  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    } catch {
      if (attempt < 1) { attempt++; await sleep(500); continue; }
      throw new ApiError("network_error", "The server could not reach UmmahAPI. Please try again in a moment.", 502);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      const wait = Math.min((res.status === 429 ? parseRetryAfter(res) ?? 2 ** attempt : 2 ** attempt) * 1000, 3000) + Math.random() * 250;
      attempt++;
      await sleep(wait);
      continue;
    }
    if (res.status === 429) throw new ApiError("rate_limited", "UmmahAPI is rate-limiting requests.", 429, parseRetryAfter(res));
    if (res.status === 401 || res.status === 403) {
      throw new ApiError("auth_failed", key ? "UmmahAPI rejected the configured UMMAH_API_KEY. Check that the key is valid and has not been revoked." : "UmmahAPI requires an API key for this request. Set UMMAH_API_KEY on the server.", 502);
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ApiError(res.ok ? "malformed" : "upstream", res.ok ? "UmmahAPI returned a response that is not valid JSON." : `UmmahAPI returned HTTP ${res.status}.`, 502);
    }
    if (!res.ok || (isObj(body) && body.success === false)) {
      const msg = isObj(body) && typeof body.message === "string" ? body.message : `UmmahAPI returned HTTP ${res.status}.`;
      if (res.status === 400 || res.status === 404) throw new ApiError("bad_request", msg, res.status);
      throw new ApiError("upstream", msg, 502);
    }
    if (!isObj(body) || body.success !== true || !isObj(body.data)) {
      throw new ApiError("malformed", "UmmahAPI returned an unexpected response shape.", 502);
    }
    return body.data as T;
  }
}

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>, maxEntries = 400): Promise<T> {
  const hit = store.cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const running = store.inflight.get(key);
  if (running) return running as Promise<T>;
  const p = load()
    .then((value) => {
      store.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      if (store.cache.size > maxEntries) store.cache.delete(store.cache.keys().next().value as string);
      return value;
    })
    .catch((e) => {
      if (hit) return hit.value as T;
      throw e;
    })
    .finally(() => store.inflight.delete(key));
  store.inflight.set(key, p);
  return p;
}

export const DAY = 24 * 3600_000;
export const HOUR = 3600_000;

import type { TafsirInfo, TafsirEntry } from "./types";
export type { TafsirInfo, TafsirEntry };

export type Chapter = { id: number; nameArabic: string; nameSimple: string; meaning: string; versesCount: number; available: boolean };
export type TranslationRes = { id: string; name: string; author: string; language: string };
export type Reciter = { id: number; name: string; nameArabic: string | null; style: string | null };
export type ApiVerse = { key: string; n: number; arabic: string; translations: Record<string, string>; tajweed?: [string, string?][] };

function splitTafsirSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = "";
  let inParen = 0;
  let inBracket = 0;
  let inDoubleQuote = false;
  let inGuillemet = false;

  const len = text.length;
  for (let i = 0; i < len; i++) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : "";
    const next = i + 1 < len ? text[i + 1] : "";

    if (ch === "(") inParen++;
    else if (ch === ")" && inParen > 0) inParen--;
    else if (ch === "[") inBracket++;
    else if (ch === "]" && inBracket > 0) inBracket--;
    else if (ch === '"' || ch === "“" || ch === "”") inDoubleQuote = !inDoubleQuote;
    else if (ch === "«") inGuillemet = true;
    else if (ch === "»") inGuillemet = false;

    current += ch;

    const isEnder =
      ch === "." || ch === "?" || ch === "!" || ch === "؟" || ch === "۔" || ch === "।";

    if (isEnder && inParen === 0 && inBracket === 0 && !inDoubleQuote && !inGuillemet) {
      const isAbbr = /\b(e\.g|i\.e|etc|vs|vol|no|dr|mr|mrs|prof)\.$/i.test(current.trim());
      const isDecimal = /\d$/.test(prev) && /^\d/.test(next);

      if (!isAbbr && !isDecimal) {
        if (
          next === " " ||
          next === "\n" ||
          next === "\t" ||
          next === '"' ||
          next === "'" ||
          next === "”" ||
          next === "»" ||
          next === ")" ||
          i === len - 1
        ) {
          if (next === '"' || next === "'" || next === "”" || next === "»" || next === ")") {
            current += next;
            i++;
          }
          if (current.trim().length > 0) {
            sentences.push(current.trim());
            current = "";
          }
        }
      }
    }
  }

  if (current.trim().length > 0) {
    sentences.push(current.trim());
  }

  return sentences;
}

function groupTafsirSentences(sentences: string[], targetLength = 400): string[] {
  if (sentences.length <= 1) return sentences;
  const paras: string[] = [];
  let cur = "";
  let sentenceCount = 0;

  for (const s of sentences) {
    const isDistinct = /^([«"“]|###|[A-Z][\w\s]{3,60}:)/.test(s);
    if (isDistinct && cur) {
      paras.push(cur.trim());
      cur = s;
      sentenceCount = 1;
      continue;
    }

    if (!cur) {
      cur = s;
      sentenceCount = 1;
    } else if (sentenceCount >= 4 || cur.length + s.length + 1 > targetLength) {
      paras.push(cur.trim());
      cur = s;
      sentenceCount = 1;
    } else {
      cur += " " + s;
      sentenceCount++;
    }
  }
  if (cur.trim()) paras.push(cur.trim());
  return paras;
}

export function parseParagraphs(raw: string): string[] {
  if (!raw || typeof raw !== "string") return [];
  let s = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n\n")
    .replace(/<(p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  s = s
    .replace(/&quot;/gi, '"')
    .replace(/&(apos|#39|#x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&hellip;/gi, "…")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCodePoint(Number(code));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return "";
      }
    })
    .replace(/&amp;/gi, "&");

  // Separate jammed headings or sentences like "Introduction to FatihahWhich was revealed"
  s = s.replace(/([a-z\)])([A-Z][a-z]{2,})/g, "$1\n\n$2");

  // Ensure lines ending in colons, ending in sentence punctuation, or starting/ending with quotes break into paragraphs
  s = s.replace(/:\s*\n+/g, ":\n\n");
  s = s.replace(/([.:!?؟۔।])\s*\n+/g, "$1\n\n");
  s = s.replace(/\n+([«"“])/g, "\n\n$1");
  s = s.replace(/([»"”])\s*\n+/g, "$1\n\n");

  const rawBlocks = s
    .split(/\r?\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const finalParas: string[] = [];
  for (const block of rawBlocks) {
    const sentences = splitTafsirSentences(block);
    if (sentences.length <= 3 && block.length <= 350) {
      finalParas.push(block);
    } else {
      const grouped = groupTafsirSentences(sentences, 400);
      finalParas.push(...grouped);
    }
  }

  return finalParas.map((p) => p.trim()).filter((p) => p.length > 0);
}

// "maarif" is disabled for now
export const ALLOWED_TAFSIR_IDS = ["ibn_kathir", "muyassar"] as const;

export async function getTafsirs() {
  return cached("tafsirs", DAY, async () => {
    const d = await ummah<{ tafasir: any[] }>("/tafsir");
    need(Array.isArray(d.tafasir) && d.tafasir.length > 0, 0);
    const allowed = new Set<string>(ALLOWED_TAFSIR_IDS);
    const tafsirs: TafsirInfo[] = d.tafasir
      .filter((t) => typeof t.key === "string" && allowed.has(t.key))
      .map((t) => {
        need(typeof t.name === "string" && typeof t.language === "string", 0);
        return {
          id: t.key,
          name: t.name,
          language: t.language,
          ...(typeof t.author === "string" && t.author.trim() ? { author: t.author.trim() } : {}),
        };
      });
    need(tafsirs.length > 0, 0);
    return { tafsirs };
  });
}

export const SURAH_VERSE_COUNTS = [
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

export async function getTafsir(tafsirId: string, surah: number, ayah: number): Promise<TafsirEntry> {
  if (!ALLOWED_TAFSIR_IDS.includes(tafsirId as any)) {
    throw new ApiError("bad_request", `Invalid tafsir '${tafsirId}'. Available: ${ALLOWED_TAFSIR_IDS.join(", ")}`, 400);
  }
  assertSurah(surah);
  const verseCount = SURAH_VERSE_COUNTS[surah - 1];
  if (!Number.isInteger(ayah) || ayah < 1 || ayah > verseCount) {
    throw new ApiError("bad_request", `Ayah ${ayah} out of range for surah ${surah} (total verses: ${verseCount}).`, 400);
  }

  const SIX_HOURS = 6 * HOUR;
  let surahData: {
    language: string;
    verses: { verse_key?: string; ayah: number; text: string }[];
  };

  try {
    surahData = await cached(
      `tafsir:v2:${tafsirId}:${surah}`,
      SIX_HOURS,
      async () => {
        const d = await ummah<{
          surah: number;
          tafsir: { key: string; name: string; language: string; author?: string };
          total_verses?: number;
          verses: any[];
        }>(`/tafsir/${tafsirId}/surah/${surah}`);

        need(
          isObj(d.tafsir) &&
          typeof d.tafsir.language === "string" &&
          Array.isArray(d.verses) &&
          d.verses.length > 0,
          0
        );

        for (const v of d.verses) {
          need(isObj(v) && Number.isInteger(v.ayah) && typeof v.text === "string", 0);
        }

        return {
          language: d.tafsir.language,
          verses: d.verses.map((v) => ({ verse_key: v.verse_key, ayah: v.ayah, text: v.text })),
        };
      },
      12
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError("bad_request", e.message, 400);
    }
    throw e;
  }

  let matched = surahData.verses.find((v) => v.ayah === ayah);
  if (!matched) {
    for (const v of surahData.verses) {
      if (v.ayah <= ayah) {
        if (!matched || v.ayah > matched.ayah) {
          matched = v;
        }
      }
    }
  }

  const paragraphs = matched ? parseParagraphs(matched.text) : [];

  return {
    tafsir: tafsirId,
    surah,
    ayah,
    language: surahData.language,
    paragraphs,
  };
}

const need = <T,>(ok: unknown, v: T): T => {
  if (!ok) throw new ApiError("malformed", "UmmahAPI returned an unexpected response shape.", 502);
  return v;
};

export async function getChapters() {
  return cached("chapters", DAY, async () => {
    const d = await ummah<{ surahs: any[] }>("/quran/surahs");
    need(Array.isArray(d.surahs) && d.surahs.length === 114, 0);
    const chapters: Chapter[] = d.surahs.map((s) => {
      need(Number.isInteger(s.number) && typeof s.name_arabic === "string" && Number.isInteger(s.verses_count), 0);
      return { id: s.number, nameArabic: s.name_arabic, nameSimple: s.name_english, meaning: s.name_translation ?? "", versesCount: s.verses_count, available: true };
    });
    return { chapters };
  });
}

const TRANSLATION_META: Record<string, { name: string; author: string; language: string }> = {
  sahih_international: { name: "Sahih International", author: "Saheeh International", language: "english" },
  pickthall: { name: "Pickthall", author: "Marmaduke Pickthall", language: "english" },
  yusuf_ali: { name: "Yusuf Ali", author: "Abdullah Yusuf Ali", language: "english" },
  urdu: { name: "Urdu", author: "", language: "urdu" },
  turkish: { name: "Turkish", author: "", language: "turkish" },
  indonesian: { name: "Indonesian", author: "", language: "indonesian" },
  french: { name: "French", author: "", language: "french" },
  german: { name: "German", author: "", language: "german" },
  bengali: { name: "Bengali", author: "", language: "bengali" },
  spanish: { name: "Spanish", author: "", language: "spanish" },
  malay: { name: "Malay", author: "", language: "malay" },
  bosnian: { name: "Bosnian", author: "", language: "bosnian" },
};

export async function getTranslations() {
  return cached("translations", DAY, async () => {
    const d = await ummah<{ translations_available: unknown; attribution?: string }>("/quran");
    need(Array.isArray(d.translations_available), 0);
    const translations: TranslationRes[] = (d.translations_available as unknown[])
      .filter((k): k is string => typeof k === "string")
      .map((k) => ({ id: k, ...(TRANSLATION_META[k] ?? { name: k.replace(/_/g, " "), author: "", language: "other" }) }));
    need(translations.length > 0, 0);
    return { translations, attribution: typeof d.attribution === "string" ? d.attribution : null };
  });
}

export const EVERYAYAH_ADDITIONAL_RECITERS = [
  {
    id: 14,
    name: "Mahmoud Khalil Al-Husary (Murattal)",
    nameArabic: "محمود خليل الحصري - مرتل",
    style: "Murattal",
    cdnPath: "mahmood_khaleel_al-husaree",
    everyAyah: "Husary_128kbps",
  },
  {
    id: 15,
    name: "Mahmoud Khalil Al-Husary (Mujawwad)",
    nameArabic: "محمود خليل الحصري - مجود",
    style: "Mujawwad",
    cdnPath: "mahmood_khaleel_al-husaree_mujawwad",
    everyAyah: "Husary_128kbps_Mujawwad",
  },
  {
    id: 16,
    name: "Mahmoud Khalil Al-Husary (Muallim)",
    nameArabic: "محمود خليل الحصري - معلم",
    style: "Muallim",
    cdnPath: "mahmood_khaleel_al-husaree",
    everyAyah: "Husary_Muallim_128kbps",
  },
  {
    id: 17,
    name: "Mohamed Siddiq Al-Minshawi (Murattal)",
    nameArabic: "محمد صديق المنشاوي - مرتل",
    style: "Murattal",
    cdnPath: "muhammad_siddeeq_al-minshaawee",
    everyAyah: "Minshawy_Murattal_128kbps",
  },
  {
    id: 18,
    name: "Mohamed Siddiq Al-Minshawi (Mujawwad)",
    nameArabic: "محمد صديق المنشاوي - مجود",
    style: "Mujawwad",
    cdnPath: "muhammad_siddeeq_al-minshaawee_mujawwad",
    everyAyah: "Minshawy_Mujawwad_192kbps",
  },
  {
    id: 19,
    name: "Mohamed Siddiq Al-Minshawi (Teacher)",
    nameArabic: "محمد صديق المنشاوي - معلم",
    style: "Teacher",
    cdnPath: "muhammad_siddeeq_al-minshaawee",
    everyAyah: "Minshawy_Teacher_128kbps",
  },
  {
    id: 20,
    name: "Ali Abdur-Rahman Al-Hudhaify",
    nameArabic: "علي بن عبدالرحمن الحذيفي",
    style: "Murattal",
    cdnPath: "ali_alhuthaify",
    everyAyah: "Hudhaify_128kbps",
  },
  {
    id: 21,
    name: "Muhammad Ayyoub",
    nameArabic: "محمد أيوب",
    style: "Murattal",
    cdnPath: "muhammad_ayyoob",
    everyAyah: "Muhammad_Ayyoub_128kbps",
  },
  {
    id: 22,
    name: "Muhammad Jibreel",
    nameArabic: "محمد جبريل",
    style: "Murattal",
    cdnPath: "muhammad_jibreel",
    everyAyah: "Muhammad_Jibreel_128kbps",
  },
  {
    id: 23,
    name: "Abdullah Basfar",
    nameArabic: "عبدالله بصفر",
    style: "Murattal",
    cdnPath: "abdullaah_basfar",
    everyAyah: "Abdullah_Basfar_192kbps",
  },
  {
    id: 24,
    name: "Ahmed ibn Ali Al-Ajamy",
    nameArabic: "أحمد بن علي العجمي",
    style: "Murattal",
    cdnPath: "ahmed_ibn_3ali_al-3ajamy",
    everyAyah: "ahmed_ibn_ali_al_ajamy_128kbps",
  },
  {
    id: 25,
    name: "Ali Jaber",
    nameArabic: "علي جابر",
    style: "Murattal",
    cdnPath: "ali_jaaber",
    everyAyah: "Ali_Jaber_64kbps",
  },
  {
    id: 26,
    name: "Fares Abbad",
    nameArabic: "فارس عباد",
    style: "Murattal",
    cdnPath: "fares_abbad",
    everyAyah: "Fares_Abbad_64kbps",
  },
  {
    id: 27,
    name: "Nasser Al-Qatami",
    nameArabic: "ناصر القطامي",
    style: "Murattal",
    cdnPath: "nasser_alqatami",
    everyAyah: "Nasser_Alqatami_128kbps",
  },
  {
    id: 28,
    name: "Salah Al-Budair",
    nameArabic: "صلاح البدير",
    style: "Murattal",
    cdnPath: "salah_albudair",
    everyAyah: "Salah_Al_Budair_128kbps",
  },
  {
    id: 29,
    name: "Muhsin Al-Qasim",
    nameArabic: "عبدالمحسن القاسم",
    style: "Murattal",
    cdnPath: "muhsin_al_qasim",
    everyAyah: "Muhsin_Al_Qasim_192kbps",
  },
  {
    id: 30,
    name: "Mohammad Al-Tablaway",
    nameArabic: "محمد محمود الطبلاوي",
    style: "Murattal",
    cdnPath: "mohammad_altablawi",
    everyAyah: "Mohammad_al_Tablaway_128kbps",
  },
  {
    id: 31,
    name: "Mustafa Ismail",
    nameArabic: "مصطفى إسماعيل",
    style: "Murattal",
    cdnPath: "mustafa_ismail",
    everyAyah: "Mustafa_Ismail_48kbps",
  },
  {
    id: 32,
    name: "Ibrahim Al-Akhdar",
    nameArabic: "إبراهيم الأخضر",
    style: "Murattal",
    cdnPath: "ibrahim_al-akhdar",
    everyAyah: "Ibrahim_Akhdar_64kbps",
  },
  {
    id: 33,
    name: "Abdullah Matroud",
    nameArabic: "عبدالله مطرود",
    style: "Murattal",
    cdnPath: "abdullah_matrood",
    everyAyah: "Abdullah_Matroud_128kbps",
  },
  {
    id: 34,
    name: "Salah Bukhatir",
    nameArabic: "صلاح بوخاطر",
    style: "Murattal",
    cdnPath: "salah_bukhatir",
    everyAyah: "Salaah_AbdulRahman_Bukhatir_128kbps",
  },
  {
    id: 35,
    name: "Khalid Al-Qahtani",
    nameArabic: "خالد القحطاني",
    style: "Murattal",
    cdnPath: "khalid_al-qahtani",
    everyAyah: "Khaalid_Abdullaah_al-Qahtaanee_192kbps",
  },
  {
    id: 36,
    name: "Ayman Sowaid",
    nameArabic: "أيمن سويد",
    style: "Murattal",
    cdnPath: "ayman_sowaid",
    everyAyah: "Ayman_Sowaid_64kbps",
  },
  {
    id: 37,
    name: "Mahmoud Ali Al-Banna",
    nameArabic: "محمود علي البنا",
    style: "Murattal",
    cdnPath: "mahmood_ali_al-banna",
    everyAyah: "mahmoud_ali_al_banna_32kbps",
  },
  {
    id: 38,
    name: "Khalefa Al-Tunaiji",
    nameArabic: "خليفة الطنيجي",
    style: "Murattal",
    cdnPath: "khalefa_al-tunaiji",
    everyAyah: "khalefa_al_tunaiji_64kbps",
  },
  {
    id: 39,
    name: "Ahmed Neana",
    nameArabic: "أحمد نعينع",
    style: "Murattal",
    cdnPath: "ahmed_nauina",
    everyAyah: "Ahmed_Neana_128kbps",
  },
  {
    id: 40,
    name: "Muhammad Abdul-Kareem",
    nameArabic: "محمد عبدالكريم",
    style: "Murattal",
    cdnPath: "muhammad_abdulkareem",
    everyAyah: "Muhammad_AbdulKareem_128kbps",
  },
  {
    id: 41,
    name: "Sahl Yassin",
    nameArabic: "سهل ياسين",
    style: "Murattal",
    cdnPath: "sahl_yasin",
    everyAyah: "Sahl_Yassin_128kbps",
  },
  {
    id: 42,
    name: "Yaser Salamah",
    nameArabic: "ياسر سلامة",
    style: "Murattal",
    cdnPath: "yasser_salama",
    everyAyah: "Yaser_Salamah_128kbps",
  },
  {
    id: 43,
    name: "Akram Al-Alaqimy",
    nameArabic: "أكرم العلاقمي",
    style: "Murattal",
    cdnPath: "akram_alalaqimy",
    everyAyah: "Akram_AlAlaqimy_128kbps",
  },
  {
    id: 44,
    name: "Ali Hajjaj Al-Suesy",
    nameArabic: "علي حجاج السويسي",
    style: "Murattal",
    cdnPath: "ali_hajjaj_alsuesy",
    everyAyah: "Ali_Hajjaj_AlSuesy_128kbps",
  },
  {
    id: 45,
    name: "Aziz Alili",
    nameArabic: "عزيز عليلي",
    style: "Murattal",
    cdnPath: "aziz_alili",
    everyAyah: "aziz_alili_128kbps",
  },
  {
    id: 46,
    name: "Abdul-Samad",
    nameArabic: "عبدالصمد",
    style: "Murattal",
    cdnPath: "abdulsamad",
    everyAyah: "AbdulSamad_64kbps_QuranExplorer.Com",
  },
  {
    id: 47,
    name: "Ibrahim Al-Dosary (Warsh)",
    nameArabic: "إبراهيم الدوسري - ورش",
    style: "Warsh",
    cdnPath: "ibrahim_al-dosari",
    everyAyah: "warsh/warsh_ibrahim_aldosary_128kbps",
  },
  {
    id: 48,
    name: "Yassin Al-Jazaery (Warsh)",
    nameArabic: "ياسين الجزائري - ورش",
    style: "Warsh",
    cdnPath: "yassin_al-jazaery",
    everyAyah: "warsh/warsh_yassin_al_jazaery_64kbps",
  },
  {
    id: 49,
    name: "Abdul Basit (Warsh)",
    nameArabic: "عبدالباسط عبدالصمد - ورش",
    style: "Warsh",
    cdnPath: "abdul_basit_warsh",
    everyAyah: "warsh/warsh_Abdul_Basit_128kbps",
  },
] as const;

export async function getReciters() {
  return cached("reciters", DAY, async () => {
    let baseReciters: Reciter[] = [];
    try {
      const d = await ummah<{ reciters: any[] }>("/quran/reciters");
      if (Array.isArray(d.reciters) && d.reciters.length > 0) {
        baseReciters = d.reciters.map((r) => ({
          id: r.id,
          name: r.name,
          nameArabic: r.name_arabic ?? null,
          style: r.style ?? null,
        }));
      }
    } catch {}

    // Fallback base reciters (1-11) if UmmahAPI was unreachable
    if (baseReciters.length === 0) {
      baseReciters = [
        { id: 1, name: "Mishary Rashid Alafasy", nameArabic: "مشاري راشد العفاسي", style: "Murattal" },
        { id: 2, name: "Abdul Rahman Al-Sudais", nameArabic: "عبدالرحمن السديس", style: "Murattal" },
        { id: 3, name: "Abdul Basit Abdul Samad", nameArabic: "عبدالباسط عبدالصمد", style: "Murattal" },
        { id: 4, name: "Abdul Basit Abdul Samad (Mujawwad)", nameArabic: "عبدالباسط عبدالصمد - مجود", style: "Mujawwad" },
        { id: 5, name: "Maher Al Muaiqly", nameArabic: "ماهر المعيقلي", style: "Murattal" },
        { id: 6, name: "Saad Al-Ghamdi", nameArabic: "سعد الغامدي", style: "Murattal" },
        { id: 7, name: "Hani Ar-Rifai", nameArabic: "هاني الرفاعي", style: "Murattal" },
        { id: 8, name: "Abu Bakr Al Shatri", nameArabic: "أبوبكر الشاطري", style: "Murattal" },
        { id: 9, name: "Yasser Al-Dosari", nameArabic: "ياسر الدوسري", style: "Murattal" },
        { id: 10, name: "Saud Al-Shuraim", nameArabic: "سعود الشريم", style: "Murattal" },
        { id: 11, name: "Abdullah Al-Juhany", nameArabic: "عبدالله الجهني", style: "Murattal" },
      ];
    }

    const existingIds = new Set(baseReciters.map((r) => r.id));
    const additionals: Reciter[] = EVERYAYAH_ADDITIONAL_RECITERS.filter(
      (r) => !existingIds.has(r.id)
    ).map((r) => ({
      id: r.id,
      name: r.name,
      nameArabic: r.nameArabic,
      style: r.style,
    }));

    return { reciters: [...baseReciters, ...additionals] };
  });
}

export function assertSurah(surah: number) {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new ApiError("bad_request", "Surah must be between 1 and 114.", 400);
}

async function getSurah(surah: number) {
  assertSurah(surah);
  return cached(`surah:${surah}`, HOUR, async () => {
    const d = await ummah<{ verses: any[] }>(`/quran/surah/${surah}`, { script: "uthmani" });
    need(Array.isArray(d.verses) && d.verses.length > 0, 0);
    return d.verses.map((v): ApiVerse => {
      need(typeof v.verse_key === "string" && Number.isInteger(v.ayah) && typeof v.arabic === "string" && isObj(v.translations), 0);
      const translations: Record<string, string> = {};
      for (const [k, t] of Object.entries(v.translations)) if (typeof t === "string") translations[k] = t.replace(/\s+/g, " ").trim();
      if (typeof v.transliteration === "string") translations[TRANSLITERATION_KEY] = v.transliteration;
      return { key: v.verse_key, n: v.ayah, arabic: v.arabic, translations };
    });
  }, 8);
}

export const TRANSLITERATION_KEY = "transliteration";

// UmmahAPI's tajweed script is its own edition of the text (marked up with <tajweed class=...>), kept exactly as returned.
async function getTajweed(surah: number) {
  assertSurah(surah);
  return cached(`tajweed:${surah}`, HOUR, async () => {
    const d = await ummah<{ verses: any[] }>(`/quran/surah/${surah}`, { script: "tajweed" });
    need(Array.isArray(d.verses) && d.verses.length > 0, 0);
    const out = new Map<string, [string, string?][]>();
    for (const v of d.verses) {
      need(typeof v.verse_key === "string" && typeof v.arabic === "string", 0);
      const html = v.arabic.replace(/<span class=end>[^<]*<\/span>/g, "").trim();
      const segs: [string, string?][] = [];
      let last = 0;
            const push = (t: string, rule?: string) => {
        const clean = t.replace(/<[^>]*>/g, "");
        if (clean) segs.push(rule ? [clean, rule] : [clean]);
      };
      for (const m of html.matchAll(/<tajweed class=["']?([a-z0-9_-]+)["']?>([^<]*)<\/tajweed>/g)) {
                push(html.slice(last, m.index));
        push(m[2], m[1]);
        last = m.index! + m[0].length;
      }
      push(html.slice(last));
      need(segs.length > 0, 0);
      out.set(v.verse_key, segs);
    }
    return out;
  }, 8);
}

export async function getVerses(surah: number, from: number, to: number, keys: string[], tajweed = false) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) throw new ApiError("bad_request", "Invalid ayah range.", 400);
  const all = await getSurah(surah);
  if (from > all.length) throw new ApiError("bad_request", `Surah ${surah} has only ${all.length} verses.`, 400);
  const want = new Set(keys);
  let taj: Map<string, [string, string?][]> | null = null;
  if (tajweed) {
    try { taj = await getTajweed(surah); }
    catch (e) { console.error("[quran-api] tajweed unavailable, surah", surah, e instanceof Error ? e.message : "error"); }
  }  const verses = all
    .filter((v) => v.n >= from && v.n <= to)
    .map((v) => ({ ...v, translations: Object.fromEntries(Object.entries(v.translations).filter(([k]) => want.has(k))), ...(taj?.get(v.key) ? { tajweed: taj.get(v.key) } : {}) }));
  return { verses };
}

const RECITER_CDN_PATHS: Record<number, { path: string; everyAyah: string }> = {
  1: { path: "mishaari_raashid_al_3afaasee", everyAyah: "Alafasy_128kbps" },
  2: { path: "abdurrahmaan_as-sudays", everyAyah: "Abdurrahmaan_As-Sudais_192kbps" },
  3: { path: "abdulbaset_mujawwad", everyAyah: "Abdul_Basit_Murattal_192kbps" },
  4: { path: "abdul_baasit_mujawwad", everyAyah: "Abdul_Basit_Mujawwad_128kbps" },
  5: { path: "maher_almu3aiqly/year1440", everyAyah: "Maher_AlMuaiqly_64kbps" },
  6: { path: "sa3d_al-ghaamidi/complete", everyAyah: "Ghamadi_40kbps" },
  7: { path: "haani_ar-rifa3ee", everyAyah: "Hani_Rifai_192kbps" },
  8: { path: "abu_bakr_ash-shatri", everyAyah: "Abu_Bakr_Ash-Shaatree_128kbps" },
  9: { path: "yasser_ad-dussary", everyAyah: "Yasser_Ad-Dussary_128kbps" },
  10: { path: "sa3ood_al-shuraym", everyAyah: "Saood_ash-Shuraym_128kbps" },
  11: { path: "abdullah_al-juhanee", everyAyah: "Abdullah_Juhany_128kbps" },
};

for (const add of EVERYAYAH_ADDITIONAL_RECITERS) {
  RECITER_CDN_PATHS[add.id] = { path: add.cdnPath, everyAyah: add.everyAyah };
}

export async function getAudio(surah: number, reciter: number) {
  assertSurah(surah);
  if (!Number.isInteger(reciter) || reciter < 1) throw new ApiError("bad_request", "Invalid reciter.", 400);
  return cached(`audio:${surah}:${reciter}`, DAY, async () => {
    try {
      const d = await ummah<any>(`/quran/audio/${surah}`, { reciter });
      const url = (u: unknown) => (typeof u === "string" && /^https:\/\//i.test(u) ? u : null);
      const surahUrl = url(d.full_surah_audio);
      if (surahUrl && Array.isArray(d.ayah_by_ayah) && d.reciter?.id === reciter) {
        const files = (d.ayah_by_ayah as any[]).flatMap((a) => {
          const u = url(a?.audio_url);
          return u && typeof a.verse_key === "string" && a.verse_key.startsWith(`${surah}:`) ? [{ verseKey: a.verse_key as string, audioUrl: u }] : [];
        });
        return { reciterId: reciter, surah, audioUrl: surahUrl, files };
      }
    } catch (e) {
      console.warn(`[quran-audio] UmmahAPI fetch failed for surah ${surah}, reciter ${reciter}, using verified CDN fallback:`, e instanceof Error ? e.message : e);
    }

    const cdn = RECITER_CDN_PATHS[reciter];
    if (cdn) {
      const pad3 = String(surah).padStart(3, "0");
      const surahUrl = `https://download.quranicaudio.com/quran/${cdn.path}/${pad3}.mp3`;
      const verseCount = SURAH_VERSE_COUNTS[surah - 1] || 7;
      const files = Array.from({ length: verseCount }, (_, i) => {
        const v = i + 1;
        const padV = String(v).padStart(3, "0");
        return {
          verseKey: `${surah}:${v}`,
          audioUrl: `https://everyayah.com/data/${cdn.everyAyah}/${pad3}${padV}.mp3`,
        };
      });
      return { reciterId: reciter, surah, audioUrl: surahUrl, files };
    }

    throw new ApiError("upstream", "Recitation audio could not be loaded.", 502);
  });
}

export async function searchQuran(q: string, translation: string | undefined, limit: number) {
  if (!q.trim() || q.length > 200) throw new ApiError("bad_request", "Enter a search term (up to 200 characters).", 400);
  const d = await ummah<{ results: any[]; results_count: number }>("/quran/search", { q, translation, limit: Math.min(Math.max(limit || 20, 1), 100) });
  need(Array.isArray(d.results), 0);
  return {
    results: d.results.map((r) => ({
      key: r.verse_key,
      surah: r.surah_number,
      surahName: r.surah_name,
      n: r.ayah,
      arabic: r.arabic,
      translation:
        typeof r.translation === "string"
          ? r.translation
          : typeof r.text === "string"
          ? r.text
          : r.translations && typeof r.translations === "object"
          ? (Object.values(r.translations)[0] as string) ?? ""
          : "",
    })),
    count: d.results_count,
  };
}

export function errorResponse(e: unknown) {
  const err = e instanceof ApiError ? e : new ApiError("upstream", "Unexpected server error.", 500);
  if (!(e instanceof ApiError)) console.error("[quran-api]", e instanceof Error ? e.name : "error");
  const headers: Record<string, string> = {};
  if (err.retryAfter) headers["Retry-After"] = String(err.retryAfter);
  return Response.json({ error: { code: err.code, message: err.message, retryAfter: err.retryAfter } }, { status: err.status, headers });
}

const CACHE_HEADERS = { "Cache-Control": "private, max-age=60" };
const STATIC_HEADERS = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" };
export async function respond(fn: () => Promise<unknown>, catalog = false) {
  try {
    return Response.json(await fn(), { headers: catalog ? STATIC_HEADERS : CACHE_HEADERS });
  } catch (e) {
    return errorResponse(e);
  }
}
