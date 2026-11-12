"use client";

import { useState, type FormEvent } from "react";
import { appFetch } from "../lib/app/client";

const field = "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: real people leave this empty
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await appFetch("/api/contact", { body: { email, message, website } });
    setBusy(false);
    if (r.ok) setSent(true); else setError(r.error);
  };

  if (sent) return <p role="status" className="rounded-sm border border-primary/40 bg-primary/10 p-4 text-sm">Thanks, your message has been sent. We will reply to {email}.</p>;

  return (
    <form onSubmit={submit} className="space-y-4 not-prose">
      <label className="block text-sm font-medium">Your email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={`${field} mt-1.5`} />
      </label>
      <label className="block text-sm font-medium">Message
        <textarea required minLength={10} maxLength={2000} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className={`${field} mt-1.5`} />
        <span className="mt-1 block text-xs font-normal text-muted-foreground">For billing problems, include the email on your account and the payment reference.</span>
      </label>
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      </div>
      {error && <p role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy ? "Sending…" : "Send message"}</button>
    </form>
  );
}