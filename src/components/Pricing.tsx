"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { appFetch, type AppUser } from "../lib/app/client";
import { PRO_PRICE_NGN } from "../lib/app/plans";
import { flutterwaveCountryInfo } from "../lib/app/flutterwave-plan";
import AccountMenu from "../components/AccountMenu";
import { Logo, ThemeToggle } from "../components/shared";

const FREE = ["Up to 3 saved projects", "SRT and VTT export", "Up to 20 verses per export"];
const FAQ: [string, string][] = [
  ["What does the Free plan include?", "Up to 3 saved projects, SRT and VTT export, and up to 20 verses per export. Free accounts can export up to 40 unique verses per month (UTC calendar month). Re-exporting a verse you already exported that month does not use more of your allowance."],
  ["Can I cancel any time?", "Yes. Cancel auto-renew in Settings and you keep Pro until the end of the period you have paid for. If you pay each month, nothing renews by itself, so there is nothing to cancel."],
  ["What is the difference between auto-renew and pay monthly?", "Auto-renew charges your card every month. Pay monthly lets you pay with a card, bank transfer, USSD or QR, and gives you Pro for one period at a time. You pay again when you want to continue."],
  ["Why is the price shown in naira or another currency?", "Paystack charges in naira. Flutterwave charges in dollars, or in local currency where we support it. The amount shown is what you will be charged at checkout."],
  ["Will I lose my projects if Pro ends?", "No. Your projects are kept and your account returns to the Free plan limits."],
  ["How do I get a refund?", "Read our refund policy and contact us with your account email and payment reference."],
]
const PRO = ["Unlimited projects and verses", "SRT and VTT export", "Custom style presets", "Priority support"];

export default function Pricing({ user, ready, dark, toggleTheme, onHome, onStart, onLogin, onSignup, onProjects, onSettings, onSignOut }: {
  user: AppUser | null; ready: boolean; dark: boolean; toggleTheme: () => void;
  onHome: () => void; onStart: () => void; onLogin: () => void; onSignup: (reason: string, after: () => void) => void;
  onProjects: () => void; onSettings: () => void; onSignOut: () => void;
}) {
  const [provider, setProvider] = useState<"paystack" | "flutterwave">("paystack");
  const [country, setCountry] = useState<string | null>(null);
  const fw = flutterwaveCountryInfo(country);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPro = user?.plan === "pro";

  useEffect(() => {
    let cancelled = false;
    appFetch<{ rate: number | null; updated: string | null; country: string | null }>("/api/app/rate").then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setCountry(r.data.country);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const checkout = async () => {
    setError(null);
    setBusy(true);
    const r = await appFetch<{ url: string }>(`/api/app/billing/checkout`, { body: { provider, mode } });
    if (r.ok) { window.location.href = r.data.url; return; }
    setBusy(false);
    setError(r.error);
  };
  const upgrade = () => {
    if (!user) return onSignup("Create a free account first, then you can upgrade to Pro.", () => {});
    checkout();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-5 md:px-8">
          <Logo onClick={onHome} compact />
          <button
            type="button"
            onClick={onHome}
            className="shrink-0 rounded-sm border border-border px-2.5 py-2 text-xs font-semibold hover:bg-muted sm:px-3 sm:text-sm"
          >
            Go back to home
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle dark={dark} toggle={toggleTheme} />
            <AccountMenu user={user} onLogin={onLogin} onProjects={onProjects} onSettings={onSettings} onSignOut={onSignOut} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <h1 className="text-center font-display text-3xl font-bold sm:text-4xl">Free to begin, Pro when you grow</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Cancel any time. You keep Pro until the end of the period you've paid for.</p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-md border border-border bg-card p-7">
            <div className="flex items-baseline justify-between"><h2 className="text-xl font-bold">Free</h2><p><span className="text-4xl font-bold">$0</span><span className="text-sm text-muted-foreground"> /month</span></p></div>
            <ul className="mt-6 flex-1 space-y-3">{FREE.map((i) => <li key={i} className="flex gap-3 text-sm text-muted-foreground"><Check size={18} className="mt-0.5 shrink-0 text-gold" />{i}</li>)}</ul>
            <button onClick={onStart} className="mt-8 w-full rounded-sm border border-foreground/80 px-5 py-3 text-sm font-semibold hover:bg-foreground hover:text-background">{user && !isPro ? "Your current plan · Open editor" : "Start free"}</button>
          </div>
          <div className="flex flex-col rounded-md border-2 border-accent bg-card p-7">
            <div className="flex items-baseline justify-between"><h2 className="text-xl font-bold">Pro</h2><p><span className="text-4xl font-bold">{fw.display}</span><span className="text-sm text-muted-foreground"> /month</span></p></div>
            <ul className="mt-6 flex-1 space-y-3">{PRO.map((i) => <li key={i} className="flex gap-3 text-sm text-muted-foreground"><Check size={18} className="mt-0.5 shrink-0 text-gold" />{i}</li>)}</ul>
            {isPro ? (
              <button onClick={onSettings} className="mt-8 w-full rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">You're on Pro · Manage billing</button>
            ) : (
              <>
                <fieldset className="mt-8">
                  <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pay with</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {([["paystack", `Pay ₦${PRO_PRICE_NGN.toLocaleString()} with Paystack`, "Cards, bank, mobile money"], ["flutterwave", `Pay ${fw.display} with Flutterwave`, fw.methodsLabel]] as const).map(([k, n, d]) => (
                      <label key={k} className={`cursor-pointer rounded-sm border p-3 text-sm ${provider === k ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}>
                        <input type="radio" name="provider" value={k} checked={provider === k} onChange={() => setProvider(k)} className="sr-only" />
                        <b className="block">{n}</b><span className="text-xs text-muted-foreground">{d}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {provider === "paystack" && (
                  <fieldset className="mt-6">
                    <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">How to pay</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["auto", "Auto-renew monthly", "Card only · renews automatically every month"],
                        ["manual", "Pay monthly", "Card, bank transfer, USSD, QR · renews only when you pay"],
                      ] as const).map(([k, n, d]) => (
                        <label key={k} className={`cursor-pointer rounded-sm border p-3 text-sm ${mode === k ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}>
                          <input type="radio" name="mode" value={k} checked={mode === k} onChange={() => setMode(k)} className="sr-only" />
                          <b className="block">{n}</b><span className="text-xs text-muted-foreground">{d}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                {error && <p role="alert" className="mt-4 rounded-sm border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
                <button onClick={upgrade} disabled={busy || !ready} className="mt-4 w-full rounded-sm bg-linear-to-b from-[#2cbd6d] to-[#178f4a] px-5 py-3 text-sm font-semibold text-white shadow-md hover:brightness-95 disabled:opacity-60">
                  {busy ? "Redirecting to checkout…" : user ? `Upgrade to Pro with ${provider === "paystack" ? "Paystack" : "Flutterwave"}` : "Sign up to upgrade"}
                </button>
              </>
            )}
          </div>
        </div>
              <section aria-labelledby="faq-h" className="mx-auto mt-16 max-w-2xl">
          <h2 id="faq-h" className="text-center font-display text-2xl font-bold">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-border rounded-md border border-border bg-card">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">{q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}{q === "How do I get a refund?" && <> <a className="underline" href="/refunds">Refund policy</a> · <a className="underline" href="/contact">Contact us</a></>}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
