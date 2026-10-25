import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson } from "@/lib/app/http";
import { sendMail } from "@/lib/app/mail";
import { siteUrl } from "@/lib/site";
import { validEmail } from "@/lib/app/validate";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const b = (await readJson(req)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!validEmail(email)) return fail("Enter a valid email address.");
  try {
    const payload = await getPayloadClient();
    const token = await payload.forgotPassword({ collection: "users", data: { email }, disableEmail: true });
    if (token) {
      const link = `${siteUrl()}/#/reset?token=${encodeURIComponent(token)}`;
      if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
        await sendMail(email, "Reset your Quran Caption Studio password", `<p>We received a request to reset your password.</p><p><a href="${link}">Choose a new password</a></p><p>This link expires in one hour. If you didn't ask for this, you can ignore this email.</p>`);
      } else if (process.env.NODE_ENV !== "production") {
        console.log("[auth] password reset link (dev only):", link);
      } else {
        console.error("[auth] email not configured: set RESEND_API_KEY and EMAIL_FROM");
      }
    }
  } catch (e) {
    console.error("[auth] forgot-password failed:", e instanceof Error ? e.name : "error");
  }
  return ok({ ok: true });
}
