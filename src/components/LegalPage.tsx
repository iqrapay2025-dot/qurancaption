import Link from "next/link"
import type { ReactNode } from "react"
import { SITE } from "@/lib/site"

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-display text-lg font-bold">{SITE.name}</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to app</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {SITE.updated}</p>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline">{children}</div>
      </main>
      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
        <Link className="underline" href="/terms">Terms of use</Link> · <Link className="underline" href="/privacy">Privacy policy</Link> · <a className="underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>
      </footer>
    </div>
  )
}
