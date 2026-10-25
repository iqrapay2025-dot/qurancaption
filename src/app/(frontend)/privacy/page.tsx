import type { Metadata } from "next"
import { LegalPage } from "@/components/LegalPage"
import { SITE } from "@/lib/site"

export const metadata: Metadata = { title: "Privacy policy", description: "How Quran Caption Studio handles your data.", alternates: { canonical: "/privacy" } }

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <section><h2>What we collect</h2><ul><li>Account data: email address, display name and a salted password hash. We never store your plain password.</li><li>Project data: the surah, verse range, caption style and settings you save.</li><li>Billing status: your plan, and customer and subscription identifiers from Paystack or Stripe.</li></ul></section>
      <section><h2>What we do not collect</h2><p>We do not store payment card numbers, and we do not run advertising trackers. Video files are not uploaded; captions are generated for you to export.</p></section>
      <section><h2>Cookies</h2><p>We use one essential, HTTP-only cookie (<code>app-session</code>) to keep you signed in, and local storage for your theme and editor preferences. No analytics or advertising cookies are set by us.</p></section>
      <section><h2>Service providers</h2><ul><li><a href={SITE.api.url} target="_blank" rel="noreferrer">UmmahAPI</a>: our servers request Quran text, translations and audio on your behalf. Your personal data is not sent to them.</li><li>Paystack and Stripe: process payments under their own privacy policies.</li><li>An email provider: sends password-reset messages.</li></ul></section>
      <section><h2>How we use data</h2><p>To run your account, save your projects, enforce plan limits, process payments and respond to support requests. We do not sell personal data.</p></section>
      <section><h2>Retention and your rights</h2><p>We keep data while your account is active. You can ask us to access, correct, export or delete your data by emailing us, and you can delete projects yourself in the app.</p></section>
      <section><h2>Security</h2><p>Sessions use secure HTTP-only cookies, passwords are hashed, and payment webhooks are signature-verified. No system is perfectly secure, so please use a strong, unique password.</p></section>
      <section><h2>Contact</h2><p><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p></section>
    </LegalPage>
  )
}
