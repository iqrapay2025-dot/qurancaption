"use client"

import Link from "next/link"

export function ErrorShell({ code, title, body, onRetry }: { code: string; title: string; body: string; onRetry?: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <p className="font-mono text-sm font-bold text-gold">{code}</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{body}</p>
      <div className="mt-6 flex gap-3">
        {onRetry && <button onClick={onRetry} className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>}
        <Link href="/" className="rounded-sm border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Back to home</Link>
      </div>
    </main>
  )
}
