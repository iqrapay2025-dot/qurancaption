import { getReciters, respond, errorResponse } from "@/lib/quran/server";
import { rateLimit } from "@/lib/app/rate-limit";
import { clientIp } from "@/lib/app/http";

export const GET = async (req: Request) => {
  // Rate limiting per IP
  const ip = clientIp(req);
  const rlResult = await rateLimit(`quran:reciters:${ip}`, 5, 60 * 1000, { failClosed: false });
  if (!rlResult.ok) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later.", retryAfter: rlResult.retryAfter }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(rlResult.retryAfter) },
      }
    );
  }

  try {
    return respond(getReciters, true);
  } catch (e: unknown) {
    return errorResponse(e);
  }
};
