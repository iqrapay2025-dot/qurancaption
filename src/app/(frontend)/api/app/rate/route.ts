import "server-only";
import { clientIp, fail, ok, rateLimited } from "@/lib/app/http";
import { rateLimit } from "@/lib/app/rate-limit";

const FALLBACK_USD_NGN_RATE = process.env.FALLBACK_USD_NGN_RATE
  ? Number(process.env.FALLBACK_USD_NGN_RATE)
  : null;

const TIMEOUT_MS = 5000;

async function fetchRate(): Promise<{ rate: number | null; updated: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 21600 },
      signal: controller.signal,
    });
    if (!res.ok) return { rate: null, updated: null };
    const data = (await res.json()) as { rates?: { NGN?: unknown }; time_last_update_utc?: unknown };
    const raw = data?.rates?.NGN;
    const rate = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(rate) || rate <= 0) return { rate: null, updated: null };
    const updated = typeof data?.time_last_update_utc === "string" ? data.time_last_update_utc : null;
    return { rate, updated };
  } catch {
    return { rate: null, updated: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`app:rate:${ip}`, 60, 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const country = req.headers.get("x-vercel-ip-country") ?? null;

  let { rate, updated } = await fetchRate();

  if (rate == null && FALLBACK_USD_NGN_RATE != null && Number.isFinite(FALLBACK_USD_NGN_RATE) && FALLBACK_USD_NGN_RATE > 0) {
    rate = FALLBACK_USD_NGN_RATE;
    updated = null;
  }

  return ok({ rate, updated, country });
}