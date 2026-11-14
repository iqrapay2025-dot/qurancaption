import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { rateLimit } from "@/lib/app/rate-limit";
import { sendMail } from "@/lib/app/mail";
import { siteUrl } from "@/lib/app/billing";
import crypto from "node:crypto";

const VERIFICATION_EXPIRY_HOURS = 24;

function generateVerificationToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

export async function POST(req: Request) {
  const bad = csrf(req);
  if (bad) return bad;

  const b = (await readJson(req)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email) return fail("Email is required.", 400);

  const ip = clientIp(req);
  const rl = await rateLimit(`app:resend-verification:${email}:${ip}`, 3, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  try {
    const payload = await getPayloadClient();

    // Only unverified users get a new email.
    const users = await payload.find({
      collection: "users",
      where: {
        and: [
          { email: { equals: email } },
          { emailVerified: { equals: false } },
        ],
      },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    });

    const userDoc = users.docs[0];
    if (!userDoc) {
      // Don't reveal whether the account exists or is already verified.
      return ok({ ok: true });
    }

    const { token, hash, expiresAt } = generateVerificationToken();

    await payload.update({
      collection: "users",
      id: userDoc.id,
      data: {
        emailToken: hash,
        emailTokenExpires: expiresAt.toISOString(),
      },
      overrideAccess: true,
      depth: 0,
    });

    const verificationLink = `${siteUrl()}/api/verify?token=${encodeURIComponent(token)}`;
    const sent = await sendMail(
      email,
      "Verify your email address",
      `<p>Click the link below to verify your email address:</p><p><a href="${verificationLink}">Verify Email</a></p><p>This link expires in ${VERIFICATION_EXPIRY_HOURS} hours.</p>`,
    );

    if (!sent) {
      console.error(`[resend-verification] email failed for ${email}`);
    }

    return ok({ ok: true });
  } catch (e) {
    console.error("[resend-verification] error:", e);
    return fail("An error occurred while resending verification email.", 500);
  }
}