"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { appFetch, type AppUser } from "../lib/app/client";
import { FREE_LIMITS, FREE_MONTHLY_VERSES, MONTHLY_PERIOD_DAYS, PRO_PRICE_NGN } from "../lib/app/plans";
import AccountMenu from "./AccountMenu";
import { Logo, ThemeToggle } from "./shared";

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "");

export default function Settings({ user, ready, dark, toggleTheme, checkout, refresh, onHome, onPricing, onProjects, onLogin, onSignOut }: {
  user: AppUser | null; ready: boolean; dark: boolean; toggleTheme: () => void;
  checkout: { provider: string; ref: string } | null; refresh: () => Promise<void>;
  onHome: () => void; onPricing: () => void; onProjects: () => void; onLogin: () => void; onSignOut: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<"idle" | "working" | "done" | "failed">(checkout ? "working" : "idle");
  const [verseUsage, setVerseUsage] = useState<{ used: number; limit: number | null; remaining: number | null; resetAt: string | null } | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!checkout || !user || ran.current) return;
    ran.current = true;
    (async () => {
      let attempts = 0;
      const maxAttempts = 10; // poll for up to ~30 seconds
      while (attempts < maxAttempts) {
        const r = await appFetch("/api/app/billing/confirm", { body: checkout });
        await refresh();
        history.replaceState(null, "", "#/settings");
        if (r.ok) { setConfirmState("done"); return; }
        // 409 means payment is still pending (e.g. bank transfer, USSD, QR)
        if (r.status === 409) {
          attempts++;
          await new Promise((res) => setTimeout(res, 3000));
          continue;
        }
        setConfirmState("failed");
        setError(r.error);
        return;
      }
      setConfirmState("failed");
      setError("We are still confirming your payment. It should activate shortly.");
    })();
  }, [checkout, user, refresh]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/app/usage", { credentials: "same-origin" }).catch(() => null);
      if (!r || cancelled) return;
      const j = await r.json().catch(() => null);
      if (!cancelled && j?.verses) setVerseUsage(j.verses);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    const r = await appFetch("/api/app/billing/cancel", { body: {} });
    setBusy(false);
    setConfirming(false);
    if (r.ok) { await refresh(); setNotice("Your subscription is cancelled. You keep Pro until the end of the period you've paid for."); }
    else setError(r.error);
  };

  const payForNextMonth = async () => {
    setPaying(true);
    setError(null);
    const r = await appFetch<{ url: string }>("/api/app/billing/checkout", { body: { provider: "paystack", mode: "manual" } });
    setPaying(false);
    if (r.ok) { window.location.href = r.data.url; }
    else setError(r.error);
  };

  const portal = async () => {
    setBusy(true);
    setError(null);
    const r = await appFetch<{ url: string }>("/api/app/billing/portal", { body: {} });
    if (r.ok) location.assign(r.data.url);
    else { setBusy(false); setError(r.error); }
  };

  const b = user?.billing;
  const pro = user?.plan === "pro";
  const providerName = b?.provider === "stripe" ? "Stripe" : b?.provider === "paystack" ? "Paystack" : null;
  const isManualPayer = pro && b?.provider === "paystack" && !b?.subscriptionRef;
  const daysUntilExpiry = b?.proUntil ? Math.max(0, Math.ceil((new Date(b.proUntil).getTime() - Date.now()) / 86400000)) : 0;
  const showExpiryBanner = daysUntilExpiry > 0 && daysUntilExpiry <= 5;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 md:px-8">
          <Logo onClick={onHome} />
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle dark={dark} toggle={toggleTheme} />
            <AccountMenu user={user} onLogin={onLogin} onProjects={onProjects} onSettings={() => {}} onSignOut={onSignOut} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl font-bold">Settings</h1>

        {!ready ? <div className="mt-8 h-40 animate-pulse rounded-md bg-muted" aria-busy="true" /> : !user ? (
          <div className="mt-8 rounded-md border border-dashed border-border p-10 text-center">
            <p className="font-display text-xl font-semibold">Log in to manage your account</p>
            <button onClick={onLogin} className="mt-5 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Log in or sign up</button>
          </div>
        ) : (
          <section aria-labelledby="billing-h" className="mt-8 rounded-md border border-border bg-card p-6">
            <h2 id="billing-h" className="flex items-center gap-2 font-display text-xl font-bold"><CreditCard size={18} /> Billing</h2>

            {confirmState === "working" && <p role="status" className="mt-4 flex items-center gap-2 rounded-sm bg-muted p-3 text-sm"><Loader2 size={15} className="animate-spin" /> Confirming your payment…</p>}
            {confirmState === "done" && pro && <p role="status" className="mt-4 rounded-sm border border-primary/40 bg-primary/10 p-3 text-sm">Welcome to Pro. Your new limits are active now.</p>}
            {confirmState === "done" && !pro && <p role="status" className="mt-4 rounded-sm bg-muted p-3 text-sm">Payment received. Pro will switch on in a moment. Refresh this page if it doesn't.</p>}
            {notice && <p role="status" className="mt-4 rounded-sm border border-primary/40 bg-primary/10 p-3 text-sm">{notice}</p>}
            {error && <p role="alert" className="mt-4 rounded-sm border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
            {b?.status === "past_due" && <p role="alert" className="mt-4 rounded-sm border border-amber-500/50 bg-amber-500/10 p-3 text-sm">Your last payment didn't go through. Update your card with {providerName ?? "your provider"} to keep Pro.</p>}
            {isManualPayer && showExpiryBanner && <p role="alert" className="mt-4 rounded-sm border border-amber-500/50 bg-amber-500/10 p-3 text-sm">Your Pro access expires on {fmtDate(b?.proUntil)}. Pay for next month to keep using Pro.</p>}

            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-semibold">{pro ? `Pro · ₦${PRO_PRICE_NGN.toLocaleString()}/month` : "Free"}</dd>
              {pro && providerName && (<><dt className="text-muted-foreground">Paid with</dt><dd>{providerName}</dd></>)}
              {pro && b?.proUntil && (<><dt className="text-muted-foreground">{isManualPayer ? "Pro until" : b.cancelAtPeriodEnd ? "Pro ends on" : "Renews on"}</dt><dd>{fmtDate(b.proUntil)}{isManualPayer ? " · renews only when you pay" : null}</dd></>)}
              {!pro && (
                <>
                  <dt className="text-muted-foreground">Includes</dt>
                  <dd>Up to {FREE_LIMITS.projects} saved projects · up to {FREE_LIMITS.verses} verses per export</dd>
                  {verseUsage && verseUsage.limit && (
                    <>
                      <dt className="text-muted-foreground">Free verses this month</dt>
                      <dd className={verseUsage.remaining === 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                        {verseUsage.used} of {verseUsage.limit} used{verseUsage.remaining === 0 ? " — upgrade for more" : `, ${verseUsage.remaining} left`}{verseUsage.resetAt && ` · resets ${new Date(verseUsage.resetAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} UTC`}
                      </dd>
                    </>
                  )}
                </>
              )}
            </dl>

            <div className="mt-6 border-t border-border pt-5">
              {pro && b?.provider === "stripe" && (
                <button onClick={portal} disabled={busy} className="mb-4 rounded-sm border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-60">Manage card &amp; invoices</button>
              )}
              {!pro ? (
                <button onClick={onPricing} className="rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Upgrade to Pro</button>
              ) : isManualPayer ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className="mr-auto">Pay for next month to renew · Pro until {fmtDate(b?.proUntil)}.</span>
                  <button onClick={payForNextMonth} disabled={paying} className="rounded-sm bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">{paying ? "Redirecting…" : "Pay for next month"}</button>
                </div>
              ) : b?.cancelAtPeriodEnd ? (
                <p className="text-sm text-muted-foreground">Cancelled. You won't be charged again. After {fmtDate(b.proUntil)} your account returns to Free.</p>
              ) : confirming ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="mr-auto">Cancel Pro? You keep it until {fmtDate(b?.proUntil)}.</span>
                  <button onClick={cancel} disabled={busy} className="rounded-sm bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60">{busy ? "Cancelling…" : "Yes, cancel"}</button>
                  <button onClick={() => setConfirming(false)} className="rounded-sm border border-border px-4 py-2 hover:bg-secondary">Keep Pro</button>
                </div>
              ) : (
                <button onClick={() => setConfirming(true)} className="rounded-sm border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary">Cancel subscription</button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
