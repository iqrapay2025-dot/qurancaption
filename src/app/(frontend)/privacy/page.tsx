import type { Metadata } from "next"
import { LegalPage } from "@/components/LegalPage"
import { SITE } from "@/lib/site"

export const metadata: Metadata = { title: "Privacy policy", description: "How Quran Caption Studio handles your data.", alternates: { canonical: "/privacy" } }

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <section><h2>What we collect</h2><ul><li>Account data: email address, display name and a salted password hash. We never store your plain password.</li><li>Project data: the surah, verse range, caption style and settings you save.</li><li>Billing status: your plan, and customer and subscription identifiers from Paystack or Flutterwave.</li></ul></section>
      <section><h2>What we do not collect</h2><p>We do not store payment card numbers, and we do not run advertising trackers. Video files are not uploaded; captions are generated for you to export.</p></section>
      <section><h2>Cookies</h2><p>This site uses the following cookies:</p><ul><li><strong>app-session</strong> (HTTP-only, essential): Keeps you signed in across pages. Set on login, cleared on logout. Essential for the site to function.</li><li><strong>Local storage preferences</strong> (client-side, optional): Stores your theme choice ("dark" or "light") and export counter. Stored locally in your browser; never sent to our servers.</li></ul><p>With your permission (via the cookie banner at the bottom of each page), we may also use analytics cookies to improve the site. These are not set unless you accept them.</p></section>
      <section><h2>Service providers</h2><ul><li><a href={SITE.api.url} target="_blank" rel="noreferrer">UmmahAPI</a>: our servers request Quran text, translations and audio on your behalf. Your personal data is not sent to them.</li><li>Paystack and Flutterwave: process payments under their own privacy policies.</li><li>An email provider: sends password-reset messages.</li></ul></section>
      <section><h2>How we use data</h2><p>To run your account, save your projects, enforce plan limits, process payments and respond to support requests. We do not sell personal data.</p></section>
      <section><h2>Retention and your rights</h2><p>We keep data while your account is active. You can ask us to access, correct, export or delete your data by emailing us, and you can delete projects yourself in the app.</p></section>
      <section><h2>Security</h2><p>Sessions use secure HTTP-only cookies, passwords are hashed, and payment webhooks are signature-verified. No system is perfectly secure, so please use a strong, unique password.</p></section>
      <section><h2>Contact</h2><p><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p></section>
    </LegalPage>
  )
}
