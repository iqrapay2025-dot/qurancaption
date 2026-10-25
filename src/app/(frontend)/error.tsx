"use client"

import { ErrorShell } from "@/components/ErrorShell"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorShell code="500" title="Something went wrong" body="An unexpected error occurred. Your saved projects are safe. Please try again." onRetry={reset} />
}
