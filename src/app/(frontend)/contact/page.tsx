import type { Metadata } from "next"
import { LegalPage } from "@/components/LegalPage"
import ContactForm from "@/components/ContactForm"
import { SITE } from "@/lib/site"

export const metadata: Metadata = { title: "Contact", description: "Get help with Quran Caption Studio.", alternates: { canonical: "/contact" } }

export default function Contact() {
  return (
    <LegalPage title="Contact">
      <section><p>Questions, billing problems or feedback? Send us a message and we will reply by email. You can also write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p></section>
      <ContactForm />
    </LegalPage>
  )
}
