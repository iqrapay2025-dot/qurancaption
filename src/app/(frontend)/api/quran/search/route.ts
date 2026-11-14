import { respond, searchQuran, errorResponse } from "@/lib/quran/server";
import { validateSearchQuery, validatePositiveInt } from "@/lib/quran/validate";
import { rateLimit } from "@/lib/app/rate-limit";
import { clientIp } from "@/lib/app/http";

export const GET = async (req: Request) => {
  // Rate limiting per IP
  const ip = clientIp(req);
  const rlResult = await rateLimit(`quran:search:${ip}`, 10, 60 * 1000, { failClosed: false });
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
  let searchQuery: string | undefined;
  let translation: string | undefined;
  let limit: number | undefined;

  try {
    searchQuery = q.get("q") ?? "";
    validateSearchQuery(searchQuery);

    const t = q.get("translation");
    if (t !== null && t !== undefined && t !== "") {
      validatePositiveInt(Number(t));
      translation = t; // pass string to searchQuran
    }

    const l = q.get("limit");
    if (l !== null && l !== undefined && l !== "") {
      limit = Number(l);
      if (limit > 100 || limit < 1) {
        throw new Error("Limit must be between 1 and 100.");
      }
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    return respond(() => searchQuran(searchQuery ?? "", translation ?? undefined, limit ?? 25));
  } catch (e: unknown) {
    return errorResponse(e);
  }
};
