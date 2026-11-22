import { siteUrl } from "@/lib/site";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

const SUPPORT_EMAIL = "aayahstudiomail@gmail.com";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface VerificationEmailProps {
  verifyUrl: string;
  name?: string | null;
  expiryHours?: number;
}

export function renderVerificationEmailHtml({
  verifyUrl,
  name,
  expiryHours = 24,
}: VerificationEmailProps): string {
  const base = siteUrl ? siteUrl() : "https://aayahstudio.vercel.app";
  const logoUrl = `${base}/brand/ayah-badge-dark-96.png`;
  const cleanName = name ? escapeHtml(name.trim()) : null;
  const greeting = cleanName ? `Assalamu Alaikum, ${cleanName}` : "Assalamu Alaikum,";
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address - ${BRAND_NAME}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0c1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; -webkit-font-smoothing: antialiased; word-break: break-word;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c1329; width: 100%; min-height: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px 48px 16px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #111a36; border: 1px solid #1e2d52; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 36px 32px 24px 32px; background-color: #0c142b; border-bottom: 1px solid #1a2747;">
              <a href="${base}" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${logoUrl}" alt="${BRAND_NAME}" width="64" height="64" style="display: block; margin: 0 auto 14px auto; border-radius: 14px; border: 0;" />
              </a>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; line-height: 1.2;">${BRAND_NAME}</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #10b981; font-weight: 500; letter-spacing: 0.02em;">${BRAND_TAGLINE}</p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff; line-height: 1.4;">${greeting}</h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Welcome to <strong>${BRAND_NAME}</strong>! We're glad to have you with us.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Please click the button below to confirm your email address and activate your account. Verifying allows you to save Quran projects, export synchronized captions (SRT/VTT), upload your own recitation audio, and upgrade to Pro features.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 32px auto; text-align: center;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #10b981;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${verifyUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="f" fillcolor="#10b981">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Verify Email Address</center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${verifyUrl}" target="_blank" style="display: inline-block; background-color: #10b981; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 15px 36px; border-radius: 10px; border: 1px solid #059669; letter-spacing: 0.01em; mso-hide: all; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 24px 0; background-color: #162244; border-left: 4px solid #10b981; border-radius: 6px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
                      <strong style="color: #f1f5f9;">Expiration:</strong> This verification link will expire in <strong style="color: #f1f5f9;">${expiryHours} hours</strong>. If the link expires, you can easily request a new one by logging into your account.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link -->
              <p style="margin: 28px 0 8px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                If the button above does not work on your device, copy and paste this verification URL into your browser:
              </p>
              <div style="background-color: #0c142b; border: 1px solid #1e2d52; border-radius: 8px; padding: 14px 16px; margin: 0 0 24px 0; word-break: break-all; font-family: ui-monospace, Menlo, Monaco, 'Courier New', monospace; font-size: 12px; line-height: 1.5; color: #38bdf8;">
                <a href="${verifyUrl}" style="color: #38bdf8; text-decoration: underline;">${verifyUrl}</a>
              </div>

              <!-- Security notice -->
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                <strong>Security Notice:</strong> If you did not create an account on ${BRAND_NAME}, no further action is required. You can safely ignore this email; your email address will not be activated.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #0c142b; border-top: 1px solid #1a2747; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #cbd5e1;">${BRAND_NAME}</p>
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;">
                Questions or feedback? Reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #10b981; text-decoration: underline;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${currentYear} ${BRAND_NAME} &middot; Free for the Ummah
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface PasswordResetEmailProps {
  resetUrl: string;
  name?: string | null;
}

export function renderPasswordResetEmailHtml({
  resetUrl,
  name,
}: PasswordResetEmailProps): string {
  const base = siteUrl ? siteUrl() : "https://aayahstudio.vercel.app";
  const logoUrl = `${base}/brand/ayah-badge-dark-96.png`;
  const cleanName = name ? escapeHtml(name.trim()) : null;
  const greeting = cleanName ? `Assalamu Alaikum, ${cleanName}` : "Assalamu Alaikum,";
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password - ${BRAND_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; -webkit-font-smoothing: antialiased; word-break: break-word;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c1329; width: 100%; min-height: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px 48px 16px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #111a36; border: 1px solid #1e2d52; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 36px 32px 24px 32px; background-color: #0c142b; border-bottom: 1px solid #1a2747;">
              <a href="${base}" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${logoUrl}" alt="${BRAND_NAME}" width="64" height="64" style="display: block; margin: 0 auto 14px auto; border-radius: 14px; border: 0;" />
              </a>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">${BRAND_NAME}</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #10b981; font-weight: 500;">Password Reset</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff; line-height: 1.4;">${greeting}</h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                We received a request to reset the password for your ${BRAND_NAME} account.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Click the button below to choose a new password. For security, this link is valid for <strong>1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 32px auto; text-align: center;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #10b981;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #10b981; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 15px 36px; border-radius: 10px; border: 1px solid #059669; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      Choose New Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link -->
              <p style="margin: 28px 0 8px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                If the button above does not work, copy and paste this URL into your browser:
              </p>
              <div style="background-color: #0c142b; border: 1px solid #1e2d52; border-radius: 8px; padding: 14px 16px; margin: 0 0 24px 0; word-break: break-all; font-family: ui-monospace, Menlo, Monaco, monospace; font-size: 12px; color: #38bdf8;">
                <a href="${resetUrl}" style="color: #38bdf8; text-decoration: underline;">${resetUrl}</a>
              </div>

              <!-- Security notice -->
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #0c142b; border-top: 1px solid #1a2747; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #cbd5e1;">${BRAND_NAME}</p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${currentYear} ${BRAND_NAME} &middot; Free for the Ummah
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
