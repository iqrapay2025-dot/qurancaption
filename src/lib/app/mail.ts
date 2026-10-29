// EMAIL_FROM can be Resend's test sender (onboarding@resend.dev) which only delivers to the account owner's own email; a verified domain is required before real users can receive resets.
import "server-only";
import { getPayloadClient } from "@/lib/payload";

export async function sendMail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  // Try Brevo first if configured
  if (brevoKey && from) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: from, name: "Quran Caption Studio" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      cache: "no-store",
    });
    if (res.ok) return true;
    const text = await res.text();
    console.error(`[mail] Brevo error: ${res.status} - ${text}`);
  }

  // Fall back to Resend if configured
  if (resendKey && from) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
      cache: "no-store",
    });
    if (res.ok) return true;
    const text = await res.text();
    console.error(`[mail] Resend error: ${res.status} - ${text}`);
  }

  // Neither provider configured or both failed: log error and return false
  console.error(
    "[mail] email not configured: set BREVO_API_KEY and EMAIL_FROM, or RESEND_API_KEY and EMAIL_FROM"
  );
  return false;
}
