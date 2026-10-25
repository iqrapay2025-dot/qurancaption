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

export type Chapter = { id: number; nameArabic: string; nameSimple: string; meaning: string; versesCount: number; available: boolean };
export type TranslationRes = { id: string; name: string; author: string; language: string };
export type Reciter = { id: number; name: string; nameArabic: string | null; style: string | null };
export type ApiVerse = { key: string; n: number; arabic: string; translations: Record<string, string>; tajweed?: [string, string?][] };

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

export async function getReciters() {
  return cached("reciters", DAY, async () => {
    const d = await ummah<{ reciters: any[] }>("/quran/reciters");
    need(Array.isArray(d.reciters) && d.reciters.length > 0, 0);
    const reciters: Reciter[] = d.reciters.map((r) => {
      need(Number.isInteger(r.id) && typeof r.name === "string", 0);
      return { id: r.id, name: r.name, nameArabic: r.name_arabic ?? null, style: r.style ?? null };
    });
    return { reciters };
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
        need(!/[<>]/.test(t), 0);
        if (t) segs.push(rule ? [t, rule] : [t]);
      };
      for (const m of html.matchAll(/<tajweed class=([a-z_]+)>([^<]*)<\/tajweed>/g)) {
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
  const taj = tajweed ? await getTajweed(surah) : null;
  const verses = all
    .filter((v) => v.n >= from && v.n <= to)
    .map((v) => ({ ...v, translations: Object.fromEntries(Object.entries(v.translations).filter(([k]) => want.has(k))), ...(taj?.get(v.key) ? { tajweed: taj.get(v.key) } : {}) }));
  return { verses };
}

export async function getAudio(surah: number, reciter: number) {
  assertSurah(surah);
  if (!Number.isInteger(reciter) || reciter < 1) throw new ApiError("bad_request", "Invalid reciter.", 400);
  return cached(`audio:${surah}:${reciter}`, DAY, async () => {
    const d = await ummah<any>(`/quran/audio/${surah}`, { reciter });
    const url = (u: unknown) => (typeof u === "string" && /^https:\/\//i.test(u) ? u : null);
    const surahUrl = url(d.full_surah_audio);
    need(surahUrl && Array.isArray(d.ayah_by_ayah) && d.reciter?.id === reciter, 0);
    const files = (d.ayah_by_ayah as any[]).flatMap((a) => {
      const u = url(a?.audio_url);
      return u && typeof a.verse_key === "string" && a.verse_key.startsWith(`${surah}:`) ? [{ verseKey: a.verse_key as string, audioUrl: u }] : [];
    });
    return { reciterId: reciter, surah, audioUrl: surahUrl!, files };
  });
}

export async function searchQuran(q: string, translation: string | undefined, limit: number) {
  if (!q.trim() || q.length > 200) throw new ApiError("bad_request", "Enter a search term (up to 200 characters).", 400);
  const d = await ummah<{ results: any[]; results_count: number }>("/quran/search", { q, translation, limit: Math.min(Math.max(limit || 25, 1), 50) });
  need(Array.isArray(d.results), 0);
  return { results: d.results.map((r) => ({ key: r.verse_key, surah: r.surah_number, surahName: r.surah_name, n: r.ayah, arabic: r.arabic })), count: d.results_count };
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
