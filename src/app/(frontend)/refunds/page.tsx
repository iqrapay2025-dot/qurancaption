import type { Metadata } from "next"
import { LegalPage } from "@/components/LegalPage"
import { SITE } from "@/lib/site"

export const metadata: Metadata = { title: "Refund policy", description: "Refunds and cancellations for Quran Caption Studio Pro.", alternates: { canonical: "/refunds" } }

// TODO(owner): confirm the refund window below before publishing.
const REFUND_WINDOW_DAYS = 7

export default function Refunds() {
  return (
    <LegalPage title="Refund policy">
      <section><h2>Cancelling</h2><ul><li>Auto-renew subscriptions can be cancelled any time in Settings. You keep Pro until the end of the period you have paid for and are not charged again.</li><li>Pay-each-month payments never renew by themselves, so there is nothing to cancel.</li></ul></section>
      <section><h2>Refunds</h2><p>If Pro is not working for you, contact us within {REFUND_WINDOW_DAYS} days of a payment and we will review a refund. Please include the email on your account and the payment reference from your receipt.</p><p>If a refund is approved, Pro access ends immediately and your account returns to the Free plan. Your projects are kept, but Free plan limits apply.</p></section>
      <section><h2>Failed or duplicate payments</h2><p>If you were charged but Pro did not activate, or you were charged twice, contact us right away and we will fix it or refund the extra payment.</p></section>
      <section><h2>How long refunds take</h2><p>Refunds go back to the original payment method through Paystack or Flutterwave. Your bank or card issuer controls how quickly the money appears.</p></section>
      <section><h2>Contact</h2><p><a href="/contact">Contact page</a> or <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p></section>
    </LegalPage>
  )
}