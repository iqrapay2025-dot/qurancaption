import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { rateLimit } from "@/lib/app/rate-limit";
import { issueVerificationEmail } from "@/lib/app/verification";
import { isEmailVerified } from "@/lib/app/accountInfo";
import { validEmail } from "@/lib/app/validate";
import type { User } from "@/payload-types";

export async function POST(req: Request) {
  const bad = csrf(req);
  if (bad) return bad;

  const b = (await readJson(req)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || !validEmail(email)) return fail("A valid email is required.", 400);

  const ip = clientIp(req);
  const rl = await rateLimit(`app:resend-verification:${email}:${ip}`, 3, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  try {
    const payload = await getPayloadClient();

    const users = await payload.find({
      collection: "users",
      where: {
        email: { equals: email },
      },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    });

    const userDoc = users.docs[0];
    if (!userDoc) {
      // Don't reveal whether the account exists
      return ok({ ok: true });
    }

    if (isEmailVerified(userDoc as User)) {
      // Already verified, don't send another email
      return ok({ ok: true });
    }

    const sent = await issueVerificationEmail(String(userDoc.id), email);
    if (!sent) {
      console.error(`[resend-verification] email failed for ${email}`);
      return fail("Could not send verification email. Please check your email configuration or try again later.", 502);
    }

    return ok({ ok: true });
  } catch (e) {
    console.error("[resend-verification] error:", e);
    return fail("An error occurred while resending verification email.", 500);
  }
}