import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { setSession } from "@/lib/app/session";
import { userWithPlan } from "@/lib/app/accountInfo";
import { rateLimit } from "@/lib/app/rate-limit";
import type { User } from "@/payload-types";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const b = (await readJson(req)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b?.password === "string" ? b.password : "";
  const ip = clientIp(req);
  const rl = await rateLimit(`app:login:${email || "unknown"}:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  if (!email || !password) return fail("Enter your email and password.");
  const payload = await getPayloadClient();
  try {
    const { token, exp, user } = await payload.login({ collection: "users", data: { email, password } });
    if (!token) return fail("Incorrect email or password.", 401);
    await setSession(token, exp);
    const accountUser = user ? await userWithPlan(user as unknown as User) : null;
    return ok({ user: accountUser });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = typeof (e as { status?: unknown })?.status === "number" ? (e as { status: number }).status : 0;
    const locked = status === 423 || /locked/i.test(msg);
    if (locked) return fail("Too many attempts. Try again in a few minutes.", 429);
    const isAuthError =
      status === 401 ||
      (e instanceof Error && e.name === "AuthenticationError") ||
      /email or password|invalid.*credentials|incorrect/i.test(msg);
    if (isAuthError) return fail("Incorrect email or password.", 401);
    console.error("[auth] login failed:", e);
    return fail("We couldn't sign you in right now. Please try again.", 500);
  }
}
