import { getVerses, respond, errorResponse } from "@/lib/quran/server";
import { validateSurah, validateAyah } from "@/lib/quran/validate";
import { rateLimit } from "@/lib/app/rate-limit";
import { clientIp } from "@/lib/app/http";
import { SURAH_VERSE_COUNTS } from "@/lib/editor-link";
import { DEFAULT_TR1 } from "@/lib/quran/types";

export const GET = async (req: Request) => {
  // Rate limiting per IP
  const ip = clientIp(req);
  const rlResult = await rateLimit(`quran:verses:${ip}`, 60, 60 * 1000, { failClosed: false });
  if (!rlResult.ok) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later.", retryAfter: rlResult.retryAfter }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(rlResult.retryAfter) },
      }
    );
  }

  const q = new URL(req.url).searchParams;
  let surah: number | undefined;
  let from: number | undefined;
  let to: number | undefined;
  let translationsStr: string | null | undefined;
  let tajweed: boolean | undefined;

  try {
    surah = Number(q.get("surah"));
    validateSurah(surah);

    const rawFrom = q.get("from");
    from = rawFrom !== null && rawFrom !== "" ? Number(rawFrom) : 1;
    validateAyah(from);

    const rawTo = q.get("to");
    const maxVerses = SURAH_VERSE_COUNTS[surah - 1] || 286;
    to = rawTo !== null && rawTo !== "" ? Number(rawTo) : maxVerses;
    validateAyah(to);

    if (from > to) {
      throw new Error("Invalid ayah range: 'from' must be less than or equal to 'to'.");
    }

    translationsStr = q.get("translations");

    const tajweedStr = q.get("tajweed");
    tajweed = tajweedStr !== null && tajweedStr !== undefined && tajweedStr !== "0";
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse translations keys (comma-separated, validate each)
  const keys: string[] = [];
  if (translationsStr !== null && translationsStr !== undefined) {
    const rawKeys = translationsStr.split(",").filter((k) => k.trim());
    for (const k of rawKeys) {
      if (/^[a-z_]{2,40}$/.test(k.trim())) {
        keys.push(k.trim());
      }
    }
  } else {
    keys.push(DEFAULT_TR1);
  }

  try {
    return respond(() => getVerses(surah!, from!, to!, keys, tajweed));
  } catch (e: unknown) {
    return errorResponse(e);
  }
};
