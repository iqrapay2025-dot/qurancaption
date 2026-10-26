import type { Metadata } from "next"
import { LegalPage } from "@/components/LegalPage"
import { SITE } from "@/lib/site"

export const metadata: Metadata = { title: "Terms of use", description: "Terms of use for Quran Caption Studio.", alternates: { canonical: "/terms" } }

export default function Terms() {
  return (
    <LegalPage title="Terms of use">
      <section><h2>1. Using the service</h2><p>{SITE.name} helps you create timed captions for Quran recitation videos and export them as SRT or VTT files. By using it you agree to these terms. If you do not agree, please do not use the service.</p></section>
      <section><h2>2. Quran text and respect</h2><p>The Arabic text, translations and recitation are shown exactly as supplied by UmmahAPI. We never alter the Quran text. Please use captions respectfully and in line with the dignity of the text, and do not use the service to distort, mock or misrepresent it.</p></section>
      <section><h2>3. Sources and attribution</h2><p>Quran data, translations and reciter audio links are provided by <a href={SITE.api.url} target="_blank" rel="noreferrer">UmmahAPI</a> (Quran text from Tanzil.net, CC BY 3.0; translations via quran.com). Each translation belongs to its named author or publisher and each recitation to its named reciter. Exports include or reference these credits, and we ask that you keep them with your published videos where the source requires it. Rights in that content remain with their owners.</p></section>
      <section><h2>4. Accounts</h2><p>You are responsible for your password and for activity on your account. Provide accurate information and tell us if you suspect unauthorised access.</p></section>
      <section><h2>5. Plans and payments</h2><ul><li>The Free plan includes up to 3 saved projects, SRT and VTT export and up to 20 verses per export.</li><li>The Pro plan removes those limits and adds custom style presets and priority support.</li><li>Payments are processed by Paystack. We do not store your card details.</li><li>Subscriptions renew until cancelled. You can cancel at any time in Settings, and Pro stays active until the end of the period you have paid for.</li><li>If a payment is refunded, Pro access ends immediately. To request a refund, please contact us.</li></ul></section>      <section><h2>6. Your projects</h2><p>You keep ownership of your projects and exports. You give us permission only to store and process them to run the service. Do not upload or store unlawful content.</p></section>
      <section><h2>7. Acceptable use</h2><p>Do not attempt to disrupt the service, bypass plan limits, scrape it at scale, or access other users&apos; data.</p></section>
      <section><h2>8. Availability and liability</h2><p>The service is provided as is. Caption timings come from third-party data, so please review exports before publishing. To the extent permitted by law, we are not liable for indirect losses arising from use of the service.</p></section>
      <section><h2>9. Changes</h2><p>We may update these terms and will change the date above when we do. Continued use means you accept the updated terms.</p></section>
      <section><h2>10. Contact</h2><p><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p></section>
    </LegalPage>
  )
}
