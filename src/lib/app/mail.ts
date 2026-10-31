// EMAIL_FROM can be Resend's test sender (onboarding@resend.dev) which only delivers to the account owner's own email; a verified domain is required before real users can receive resets.
import "server-only";

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
  const from = process.env.EMAIL_FROM;

  // Validate recipient before any provider
  if (!validRecipient(to)) {
    console.error("[mail] invalid recipient");
    return false;
  }

  let brevoConfigured = !!(brevoKey && from);
  let resendConfigured = !!(resendKey && from);

  // Try Brevo first if configured
  if (brevoConfigured) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey as string,
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
      console.error(`[mail] Brevo failed: ${res.status} - ${text}`);
    } catch (e) {
      console.error(`[mail] Brevo failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Fall back to Resend if configured
  if (resendConfigured) {
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
      console.error(`[mail] Resend failed: ${res.status} - ${text}`);
    } catch (e) {
      console.error(`[mail] Resend failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (!brevoConfigured && !resendConfigured) {
    console.error(
      "[mail] email not configured: set BREVO_API_KEY and EMAIL_FROM, or RESEND_API_KEY and EMAIL_FROM"
    );
  }
  return false;
}
