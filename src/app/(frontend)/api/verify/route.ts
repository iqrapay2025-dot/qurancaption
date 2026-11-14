import crypto from "node:crypto";
import { getPayloadClient } from "@/lib/payload";
import { siteUrl } from "@/lib/app/billing";

// Email verification link: GET /api/verify?token=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || token.length > 200) {
    return Response.redirect(new URL("/?verify=invalid", siteUrl()), 302);
  }

  // Tokens are stored hashed, so hash the incoming one before looking it up.
  const hash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const payload = await getPayloadClient();

    const found = await payload.find({
      collection: "users",
      where: {
        and: [
          { emailToken: { equals: hash } },
          { emailTokenExpires: { greater_than: new Date().toISOString() } },
          { emailVerified: { equals: false } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const user = found.docs[0];
    if (!user) {
      return Response.redirect(new URL("/?verify=invalid", siteUrl()), 302);
    }

    // Mark verified and clear the one-time token. Use null, because Payload ignores undefined.
    await payload.update({
      collection: "users",
      id: user.id,
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        emailVerificationSource: "email_link",
        emailToken: null,
        emailTokenExpires: null,
      },
      overrideAccess: true,
      depth: 0,
    });

    // The user logs in normally afterwards. Send them back to the app.
    return Response.redirect(new URL("/?verified=1", siteUrl()), 302);
  } catch (e) {
    console.error("[verify] error:", e);
    return Response.redirect(new URL("/?verify=invalid", siteUrl()), 302);
  }
}