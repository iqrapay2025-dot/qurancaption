import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { setSession } from "@/lib/app/session";
import { validEmail, validPassword } from "@/lib/app/validate";
import { rateLimit } from "@/lib/app/rate-limit";
import { issueVerificationEmail } from "@/lib/app/verification";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const b = (await readJson(req)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const name = typeof b?.name === "string" ? b.name.trim().slice(0, 80) : "";
  const ip = clientIp(req);
  const rl = await rateLimit(`app:signup:${email || "unknown"}:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  if (!validEmail(email)) return fail("Enter a valid email address.");
  if (!validPassword(b?.password)) return fail("Use a password of at least 8 characters.");
  const payload = await getPayloadClient();
  const existing = await payload.count({ collection: "users", where: { email: { equals: email } }, overrideAccess: true });
  if (existing.totalDocs > 0) return fail("An account with this email already exists. Try logging in instead.", 409);
  try {
    // emailVerified defaults to false. Use overrideAccess: true so system default and fields apply reliably.
    const createdUser = await payload.create({
      collection: "users",
      data: { email, password: b.password as string, name },
      overrideAccess: true,
    });

    // Don't fail signup if the email or token step breaks; the user can use "resend".
    try {
      const sent = await issueVerificationEmail(String(createdUser.id), email);
      if (!sent) console.error(`[auth] verification email failed for ${email}`);
    } catch (e) {
      console.error("[auth] could not issue verification email:", e instanceof Error ? e.message : e);
    }

    // Log in so they can start using the app; paid features stay locked until verified.
    try {
      const { token: loginToken, exp } = await payload.login({
        collection: "users",
        data: { email, password: b.password as string },
      });
      if (loginToken) await setSession(loginToken, exp);
    } catch (loginError) {
      console.error("[auth] login after signup failed:", loginError);
    }
    const userObj = {
      id: String(createdUser.id),
      email,
      name: name || null,
      emailVerified: false,
      plan: "free" as const,
      billing: { status: "none" as const, provider: null, proUntil: null, cancelAtPeriodEnd: false },
    };
    return ok({ user: userObj, requiresVerification: true }, 201);
  } catch (e: any) {
    if (e?.message?.toLowerCase().includes("duplicate") || e?.message?.toLowerCase().includes("unique") || e?.code === "23505") {
      return fail("An account with this email already exists. Try logging in instead.", 409);
    }
    console.error("[auth] signup failed:", e);
    return fail("We couldn't create your account. Please try again.", 500);
  }
}