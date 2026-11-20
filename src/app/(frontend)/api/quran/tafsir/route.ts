import { getTafsir, respond, errorResponse, ApiError } from "@/lib/quran/server";
import { rateLimit } from "@/lib/app/rate-limit";
import { clientIp } from "@/lib/app/http";

export const GET = async (req: Request) => {
  // Rate limiting per IP: 60 requests per minute
  const ip = clientIp(req);
  const rlResult = await rateLimit(`quran:tafsir:${ip}`, 60, 60 * 1000, { failClosed: false });
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
  const tafsir = q.get("tafsir");
  const surahStr = q.get("surah");
  const ayahStr = q.get("ayah");

  const surah = Number(surahStr);
  const ayah = Number(ayahStr);

  try {
    if (!tafsir) {
      throw new ApiError("bad_request", "Missing required parameter 'tafsir'.", 400);
    }
    if (!surahStr || !Number.isInteger(surah) || surah < 1 || surah > 114) {
      throw new ApiError("bad_request", "Surah must be an integer between 1 and 114.", 400);
    }
    if (!ayahStr || !Number.isInteger(ayah) || ayah < 1) {
      throw new ApiError("bad_request", "Ayah must be a positive integer.", 400);
    }

    return await respond(() => getTafsir(tafsir, surah, ayah), true);
  } catch (e: unknown) {
    return errorResponse(e);
  }
};
