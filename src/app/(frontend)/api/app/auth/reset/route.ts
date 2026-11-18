import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { setSession } from "@/lib/app/session";
import { userWithPlan } from "@/lib/app/accountInfo";
import { validPassword } from "@/lib/app/validate";
import { rateLimit } from "@/lib/app/rate-limit";
import type { User } from "@/payload-types";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const ip = clientIp(req);
  const rl = await rateLimit(`app:reset:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  const b = (await readJson(req)) as Record<string, unknown> | null;
  if (typeof b?.token !== "string" || b.token.length > 200) return fail("This reset link is not valid.");
  if (!validPassword(b.password)) return fail("Use a password of at least 8 characters.");
  try {
    const payload = await getPayloadClient();
    const { token, user } = await payload.resetPassword({ collection: "users", data: { token: b.token, password: b.password }, overrideAccess: true });
    if (token) await setSession(token);
    // Also mark email as verified on password reset and clear any lingering verification tokens
    if (user) {
      await payload.update({
        collection: "users",
        id: String(user.id),
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString(),
          emailVerificationSource: "password_reset",
          emailToken: null,
          emailTokenExpires: null,
        },
        overrideAccess: true,
        depth: 0,
      });
    }
    const accountUser = user ? await userWithPlan(user as unknown as User) : null;
    return ok({ user: accountUser });
  } catch {
    return fail("This reset link is invalid or has expired. Request a new one.", 400);
  }
}
