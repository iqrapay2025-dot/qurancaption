import crypto from "node:crypto";
import { getPayloadClient } from "@/lib/payload";
import { siteUrl } from "@/lib/site";
import { currentUser } from "@/lib/app/session";
import { isEmailVerified } from "@/lib/app/accountInfo";

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
        emailToken: { equals: hash },
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const user = found.docs[0];
    if (!user) {
      const u = await currentUser().catch(() => null);
      if (u && isEmailVerified(u)) {
        return Response.redirect(new URL("/?verified=1", siteUrl()), 302);
      }
      return Response.redirect(new URL("/?verify=invalid", siteUrl()), 302);
    }

    // Check expiration
    if (user.emailTokenExpires && new Date(user.emailTokenExpires).getTime() < Date.now()) {
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

    // Send them back to the app with verified notice.
    return Response.redirect(new URL("/?verified=1", siteUrl()), 302);
  } catch (e) {
    console.error("[verify] error:", e);
    return Response.redirect(new URL("/?verify=invalid", siteUrl()), 302);
  }
}