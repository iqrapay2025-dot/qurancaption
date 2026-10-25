"use client"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0b1f3a", color: "#fff", minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
        <main>
          <p style={{ color: "#6fe3a0", fontWeight: 700 }}>500</p>
          <h1 style={{ fontSize: 28, margin: "8px 0" }}>Something went wrong</h1>
          <p style={{ opacity: 0.75 }}>Quran Caption Studio hit an unexpected error.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 6, border: 0, background: "#178f4a", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </main>
      </body>
    </html>
  )
}
