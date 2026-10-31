// EMAIL_FROM can be Resend's test sender (onboarding@resend.dev) which only delivers to the account owner's own email; a verified domain is required before real users can receive resets.
import "server-only";
import nodemailer from "nodemailer";

function validRecipient(to: string): boolean {
  if (typeof to !== "string" || to.length === 0 || to.length > 254) return false;
  if (/[,\s;<>"'()\\]/.test(to)) return false;
  if (/[\x00-\x1f\x7f]/.test(to)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
}
export async function sendMail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const from = process.env.EMAIL_FROM;

  // Validate recipient before any provider
  if (!validRecipient(to)) {
    console.error("[mail] invalid recipient");
    return false;
  }

  // Try Brevo first if configured
  if (brevoKey && from) {
    try {
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
    } catch (e) {
      console.error(`[mail] Brevo error: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Fall back to Resend if configured
  if (resendKey && from) {
    try {
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
    } catch (e) {
      console.error(`[mail] Resend error: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Fall back to Gmail SMTP if configured
  if (gmailUser && gmailPass) {
    const sender = from && from === gmailUser ? from : gmailUser;
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({ from: sender, to, subject, html });
      return true;
    } catch (e) {
      console.error(`[mail] Gmail error: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Neither provider configured or all failed: log error and return false
  console.error(
    "[mail] email not configured: set BREVO_API_KEY and EMAIL_FROM, or RESEND_API_KEY and EMAIL_FROM, or GMAIL_USER and GMAIL_APP_PASSWORD"
  );
  return false;
}
