import "server-only";
import crypto from "node:crypto";
import { getPayloadClient } from "@/lib/payload";
import { sendMail } from "@/lib/app/mail";
import { siteUrl } from "@/lib/site";

export const VERIFICATION_EXPIRY_HOURS = 24;

export function isEmailVerified(user: { emailVerified?: boolean | null; emailVerifiedAt?: string | null }): boolean {
  return user.emailVerified ?? !!user.emailVerifiedAt;
}

// Stores a hashed one-time token on the user and emails the raw token as a link.
// Returns true if the email was sent.
export async function issueVerificationEmail(userId: string, email: string): Promise<boolean> {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

  const payload = await getPayloadClient();
  // overrideAccess must be true: these fields have `create/update: () => false`
  // field access, and Payload silently drops them otherwise.
  await payload.update({
    collection: "users",
    id: userId,
    data: { emailToken: hash, emailTokenExpires: expiresAt.toISOString() },
    overrideAccess: true,
    depth: 0,
  });

  const link = `${siteUrl()}/api/verify?token=${encodeURIComponent(token)}`;
  return sendMail(
    email,
    "Verify your email address",
    `<p>Click the link below to verify your email address:</p><p><a href="${link}">Verify Email</a></p><p>This link expires in ${VERIFICATION_EXPIRY_HOURS} hours.</p>`,
  );
}