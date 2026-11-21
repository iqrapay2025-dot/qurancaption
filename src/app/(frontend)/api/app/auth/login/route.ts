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
    let accountUser = null;
    try {
      accountUser = user ? await userWithPlan(user as unknown as User) : null;
    } catch (planErr) {
      console.error("[auth] userWithPlan fallback:", planErr);
      accountUser = user
        ? {
            id: String(user.id),
            email: user.email,
            name: user.name ?? null,
            avatarUrl: (user as any).avatarUrl ?? null,
            plan: "free" as const,
            billing: { status: "none" as const, provider: null, proUntil: null, cancelAtPeriodEnd: false },
            emailVerified: true,
          }
        : null;
    }
    return ok({ user: accountUser });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : String(e ?? "");
    const name = typeof e?.name === "string" ? e.name : "";
    const status = typeof e?.status === "number" ? e.status : typeof e?.statusCode === "number" ? e.statusCode : 0;

    const locked = status === 423 || name === "LockedAuth" || /locked/i.test(msg);
    if (locked) return fail("Too many attempts. Try again in a few minutes.", 429);

    const isAuthError =
      status === 401 ||
      status === 400 ||
      name === "AuthenticationError" ||
      name === "ValidationError" ||
      /email or password|invalid.*credentials|incorrect|unauthorized|failed to authenticate/i.test(msg);
    if (isAuthError) return fail("Incorrect email or password.", 401);

    console.error("[auth] login failed:", e);
    return fail("We couldn't sign you in right now. Please try again.", 500);
  }
}
