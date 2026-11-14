import { getAudio, respond, errorResponse } from "@/lib/quran/server";
import { validateSurah, validateReciter } from "@/lib/quran/validate";
import { rateLimit } from "@/lib/app/rate-limit";
import { clientIp } from "@/lib/app/http";

export const GET = async (req: Request) => {
  // Rate limiting per IP
  const ip = clientIp(req);
  const rlResult = await rateLimit(`quran:audio:${ip}`, 10, 60 * 1000, { failClosed: false });
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
  let reciter: number | undefined;

  try {
    surah = Number(q.get("surah"));
    validateSurah(surah);

    reciter = Number(q.get("reciter"));
    validateReciter(reciter);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    return respond(() => getAudio(surah!, reciter!));
  } catch (e: unknown) {
    return errorResponse(e);
  }
};
