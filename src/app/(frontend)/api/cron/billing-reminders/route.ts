import "server-only";

import crypto from "node:crypto";
import { getPayloadClient } from "@/lib/payload";
import { sendMail } from "@/lib/app/mail";
import { claimEvent, releaseEvent, siteUrl } from "@/lib/app/billing";

const DAY = 86_400_000;

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "");

export async function GET(req: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>.
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Unauthorized", { status: 401 });
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
  const token = auth.slice("Bearer ".length);
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return new Response("Unauthorized", { status: 401 });

  const payload = await getPayloadClient();
  const now = Date.now();
  const fiveDaysFromNow = new Date(now + 5 * DAY).toISOString();

  const baseUrl = siteUrl();
  const deadline = now + 50_000; // stop before function timeout

  let page = 1;
  let hasNext = true;
  while (hasNext && Date.now() < deadline) {
    const users = await payload.find({
      collection: "users",
      where: {
        provider: { equals: "paystack" },
        billingStatus: { equals: "active" },
        proUntil: { greater_than: new Date(now).toISOString(), less_than: fiveDaysFromNow },
      },
      limit: 100,
      page,
      depth: 0,
    });
    hasNext = !!users.hasNextPage;
    page++;

    for (const u of users.docs) {
      if (Date.now() >= deadline) break;
      const proUntil = u.proUntil as string | null | undefined;
      if (!proUntil) continue;
      const until = new Date(proUntil).getTime();
      const daysLeft = Math.ceil((until - now) / DAY);
      if (daysLeft < 1 || daysLeft > 5) continue;
      const email = u.email as string | undefined;
      if (!email) continue;
      if (u.subscriptionRef) continue;
      const reminderKey = `reminder:${u.id}:${proUntil}`;
      if (!(await claimEvent(reminderKey, "billing:reminder"))) continue;

      try {
        const sent = await sendMail(
          email,
          "Your Qurancaption Pro access is expiring soon",
          `<p>Your Pro access expires on ${fmtDate(proUntil)}.</p><p>You chose pay-each-month, so it won’t renew automatically. <a href="${baseUrl}/#/settings">Pay for next month</a> to keep using Pro.</p>`
        );
        if (!sent) {
          console.error("[cron] reminder email failed for", u.id);
          await releaseEvent(reminderKey);
        }
      } catch (e) {
        console.error("[cron] reminder send threw for", u.id, e instanceof Error ? e.message : e);
        await releaseEvent(reminderKey);
      }
    }
  }

  if (!process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY) {
    console.error("[cron] no email provider configured (BREVO_API_KEY or RESEND_API_KEY)");
  }

  return new Response("OK", { status: 200 });
}
