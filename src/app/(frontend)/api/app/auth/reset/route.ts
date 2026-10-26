import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { publicUser, setSession } from "@/lib/app/session";
import { validPassword } from "@/lib/app/validate";
import { rateLimit } from "@/lib/app/rate-limit";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const ip = clientIp(req);
  const rl = rateLimit(`app:reset:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  const b = (await readJson(req)) as Record<string, unknown> | null;
  if (typeof b?.token !== "string" || b.token.length > 200) return fail("This reset link is not valid.");
  if (!validPassword(b.password)) return fail("Use a password of at least 8 characters.");
  try {
    const payload = await getPayloadClient();
    const { token, user } = await payload.resetPassword({ collection: "users", data: { token: b.token, password: b.password }, overrideAccess: true });
    if (token) await setSession(token);
    return ok({ user: user ? publicUser(user as never) : null });
  } catch {
    return fail("This reset link is invalid or has expired. Request a new one.", 400);
  }
}
