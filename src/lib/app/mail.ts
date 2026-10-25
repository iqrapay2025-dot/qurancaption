// EMAIL_FROM can be Resend's test sender (onboarding@resend.dev) which only delivers to the account owner's own email; a verified domain is required before real users can receive resets.
import "server-only";
import { getPayloadClient } from "@/lib/payload";

export async function sendMail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (key && from) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`mail provider returned ${res.status}`);
    return;
  }
  const payload = await getPayloadClient();
  await payload.sendEmail({ to, subject, html });
}
