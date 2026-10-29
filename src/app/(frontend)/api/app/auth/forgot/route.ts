import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { sendMail } from "@/lib/app/mail";
import { siteUrl } from "@/lib/site";
import { validEmail } from "@/lib/app/validate";
import { rateLimit } from "@/lib/app/rate-limit";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const b = (await readJson(req)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const ip = clientIp(req);
  const rl = rateLimit(`app:forgot:${email || "unknown"}:${ip}`, 3, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  if (!validEmail(email)) return fail("Enter a valid email address.");
  try {
    const payload = await getPayloadClient();
    const token = await payload.forgotPassword({ collection: "users", data: { email }, disableEmail: true });
    if (token) {
      const link = `${siteUrl()}/#/reset?token=${encodeURIComponent(token)}`;
      await sendMail(email, "Reset your Quran Caption Studio password", `<p>We received a request to reset your password.</p><p><a href="${link}">Choose a new password</a></p><p>This link expires in one hour. If you didn't ask for this, you can ignore this email.</p>`);
    }
  } catch (e) {
    console.error("[auth] forgot-password failed:", e instanceof Error ? e.name : "error");
  }
  return ok({ ok: true });
}
