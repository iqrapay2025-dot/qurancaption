import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { rateLimit } from "@/lib/app/rate-limit";
import { validEmail } from "@/lib/app/validate";
import { sendMail } from "@/lib/app/mail";
import { SITE } from "@/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const b = (await readJson(req)) as Record<string, unknown> | null;
  const ip = clientIp(req);
  const rl = rateLimit(`app:contact:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  // Honeypot: pretend success so bots learn nothing.
  if (typeof b?.website === "string" && b.website.trim()) return ok();
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const message = typeof b?.message === "string" ? b.message.trim() : "";
  if (!validEmail(email)) return fail("Enter a valid email address.");
  if (message.length < 10) return fail("Please write a little more so we can help.");
  if (message.length > 2000) return fail("Please keep your message under 2000 characters.");
  const sent = await sendMail(SITE.email, `Contact form: ${email}`, `<p><b>From:</b> ${esc(email)}</p><p style="white-space:pre-wrap">${esc(message)}</p>`, { replyTo: email });
  if (!sent) return fail(`We couldn't send your message. Please email ${SITE.email} directly.`, 502);
  return ok();
}