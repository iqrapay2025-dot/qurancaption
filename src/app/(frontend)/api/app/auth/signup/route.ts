import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { publicUser, setSession } from "@/lib/app/session";
import { validEmail, validPassword } from "@/lib/app/validate";
import { rateLimit } from "@/lib/app/rate-limit";
import crypto from "node:crypto";
import { sendMail } from "@/lib/app/mail";
import { siteUrl } from "@/lib/app/billing";

const VERIFICATION_EXPIRY_HOURS = 24;

function generateVerificationToken(): { token: string; hash: string; expiresAt: Date } {
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(randomBytes).digest("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
  return { token: randomBytes, hash, expiresAt };
}

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
    const { token, hash, expiresAt } = generateVerificationToken();
    await payload.create({
      collection: "users",
      data: {
        email,
        password: b.password as string,
        name,
        emailVerified: false,
        emailToken: hash,
        emailTokenExpires: expiresAt.toISOString(),
      },
      overrideAccess: false,
    });
    const verificationLink = `${siteUrl()}/api/verify?token=${encodeURIComponent(token)}`;
    const sent = await sendMail(
      email,
      "Verify your email address",
      `<p>Click the link below to verify your email address:</p><p><a href="${verificationLink}">Verify Email</a></p><p>This link expires in 24 hours.</p>`
    );
    if (!sent) {
      console.error(`[auth] verification email failed for ${email}`);
      // Still allow signup even if email fails; user can retry resend
    }
    // Log the user in so they can start using the app immediately,
    // but they'll have restrictions until they verify
    try {
      const { token: loginToken, exp, user } = await payload.login({
        collection: "users",
        data: { email, password: b.password as string },
      });
      if (loginToken) {
        await setSession(loginToken, exp);
      }
    } catch (loginError) {
      // If login fails for some reason, still return success but warn
      console.error("[auth] login after signup failed:", loginError);
    }
    return ok({ user: { email, name: name ?? null, emailVerified: false }, requiresVerification: true }, 201);
  } catch {
    return fail("We couldn't create your account. Please try again.", 500);
  }
}
