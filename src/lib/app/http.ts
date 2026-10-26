import "server-only";
import { rateLimit } from "./rate-limit";

export const noStore = { "Cache-Control": "no-store" };
export const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: noStore });
export const ok = (body: unknown = { ok: true }, status = 200) => Response.json(body, { status, headers: noStore });
export const rateLimited = (retryAfter: number, message = "Too many requests. Please try again later.") =>
  Response.json({ error: message }, { status: 429, headers: { ...noStore, "Retry-After": String(retryAfter) } });
export const readJson = async (req: Request): Promise<unknown> => req.json().catch(() => null);
export const clientIp = (req: Request): string => {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return "unknown";
};
export const csrf = (req: Request): Response | null => {
  const origin = req.headers.get("origin");
  const allowed = new Set<string>();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  allowed.add(new URL(site).host.toLowerCase());
  for (const o of (process.env.ALLOWED_ORIGINS || "").split(",")) { const t = o.trim(); if (t) try { allowed.add(new URL(t).host.toLowerCase()); } catch {} }
  if (process.env.NODE_ENV !== "production") { allowed.add("localhost"); allowed.add("127.0.0.1"); }
  if (origin) {
    let host = "";
    try { host = new URL(origin).host.toLowerCase(); } catch { return fail("Invalid request origin.", 403); }
    const forwarded = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
    if (!allowed.has(host) && host !== forwarded) return fail("Invalid request origin.", 403);
    return null;
  }
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs === "same-origin" || sfs === "none") return null;
  return fail("Invalid request origin.", 403);
};
export const deny = (code: string, error: string) => Response.json({ error, code }, { status: 402, headers: noStore });
