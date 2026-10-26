import "server-only";

import { getPayloadClient } from "@/lib/payload";
import { sendMail } from "@/lib/app/mail";
import { claimEvent, releaseEvent } from "@/lib/app/billing";

const DAY = 86_400_000;

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "");

export async function GET(req: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>.
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
  const token = auth.slice("Bearer ".length);
  if (token !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    // Email not configured: skip silently.
    return new Response("Email not configured", { status: 200 });
  }

  const payload = await getPayloadClient();
  const now = Date.now();
  const fiveDaysFromNow = new Date(now + 5 * DAY).toISOString();

  // Find manual payers: paystack provider, active billing, no subscription ref, proUntil within 5 days.
  const users = await payload.find({
    collection: "users",
    where: {
      provider: { equals: "paystack" },
      billingStatus: { equals: "active" },
      proUntil: { greater_than: new Date(now).toISOString(), less_than: fiveDaysFromNow },
    },
    limit: 100,
    depth: 0,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

  for (const u of users.docs) {
    const proUntil = u.proUntil as string | null | undefined;
    if (!proUntil) continue;
    const until = new Date(proUntil).getTime();
    const daysLeft = Math.ceil((until - now) / DAY);
    if (daysLeft < 1 || daysLeft > 5) continue; // only 1-5 days remaining (includes last day)
    const email = u.email as string | undefined;
    if (!email) continue;
    // Ensure this is a manual payer (no subscription ref)
    if (u.subscriptionRef) continue;
    // Don't send a reminder twice for the same expiry. When proUntil changes
    // (user pays early) the key changes, so a new reminder is sent.
    const reminderKey = `reminder:${u.id}:${proUntil}`;
    if (!(await claimEvent(reminderKey, "billing:reminder"))) continue;

    try {
      await sendMail(
        email,
        "Your Qurancaption Pro access is expiring soon",
        `<p>Your Pro access expires on ${fmtDate(proUntil)}.</p><p>You chose pay-each-month, so it won’t renew automatically. <a href="${siteUrl}/#/settings">Pay for next month</a> to keep using Pro.</p>`
      );
    } catch (e) {
      console.error("[cron] reminder email failed for", u.id, e instanceof Error ? e.message : e);
      // Release the claim so the reminder can be retried the next day
      await releaseEvent(reminderKey);
    }
  }

  return new Response("OK", { status: 200 });
}
