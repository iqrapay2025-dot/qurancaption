"use client";

import { Camera, CreditCard, Download, Loader2, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState, ChangeEvent } from "react";
import { appFetch, type AppUser } from "../lib/app/client";
import { FREE_LIMITS, FREE_MONTHLY_VERSES, MONTHLY_PERIOD_DAYS, PRO_PRICE_NGN } from "../lib/app/plans";
import AccountMenu from "./AccountMenu";
import { Logo, ThemeToggle } from "./shared";

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "");

function processAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Please select an image file (PNG, JPG, WebP)."));
    }
    if (file.size > 10 * 1024 * 1024) {
      return reject(new Error("Image is too large. Please select a photo under 10MB."));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image."));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable."));

        // Center crop to a perfect square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        try {
          const dataUrl = canvas.toDataURL("image/webp", 0.85);
          resolve(dataUrl);
        } catch {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
    const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState(user?.name || "");
  const [nameBusy, setNameBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.name) setNameInput(user.name);
  }, [user?.name]);

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setProfileMsg(null);
    try {
      const dataUrl = await processAvatarFile(file);
      const res = await appFetch<{ user: AppUser }>("/api/app/account", {
        method: "PATCH",
        body: { avatarUrl: dataUrl },
      });
      if (!res.ok) {
        setProfileMsg({ type: "error", text: res.error });
      } else {
        await refresh();
        setProfileMsg({ type: "success", text: "Profile photo updated successfully." });
      }
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Failed to process image." });
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true);
    setProfileMsg(null);
    try {
      const res = await appFetch<{ user: AppUser }>("/api/app/account", {
        method: "PATCH",
        body: { avatarUrl: null },
      });
      if (!res.ok) {
        setProfileMsg({ type: "error", text: res.error });
      } else {
        await refresh();
        setProfileMsg({ type: "success", text: "Profile photo removed." });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Could not remove photo. Please try again." });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setNameBusy(true);
    setProfileMsg(null);
    const res = await appFetch<{ user: AppUser }>("/api/app/account", {
      method: "PATCH",
      body: { name: nameInput.trim() },
    });
    setNameBusy(false);
    if (!res.ok) {
      setProfileMsg({ type: "error", text: res.error });
    } else {
      await refresh();
      setProfileMsg({ type: "success", text: "Display name saved successfully." });
    }
  };

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

    const deleteAccount = async () => {
    setDeleteBusy(true);
    setDeleteError(null);
    const r = await appFetch("/api/app/account", { method: "DELETE", body: { password: deletePassword } });
    setDeleteBusy(false);
    if (!r.ok) return setDeleteError(r.error);
    await onSignOut();
    onHome();
  };
  const b = user?.billing;
  const pro = user?.plan === "pro";
  const providerName = b?.provider === "paystack" ? "Paystack" : b?.provider === "flutterwave" ? "Flutterwave" : null;
  const isManualPayer = pro && b?.provider === "paystack" && !b?.subscriptionRef;
  const daysUntilExpiry = b?.proUntil ? Math.max(0, Math.ceil((new Date(b.proUntil).getTime() - Date.now()) / 86400000)) : 0;
  const showExpiryBanner = daysUntilExpiry > 0 && daysUntilExpiry <= 5;

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
          <>
            {/* Profile Section */}
            <section aria-labelledby="profile-h" className="mt-8 rounded-md border border-border bg-card p-6">
              <h2 id="profile-h" className="flex items-center gap-2 font-display text-xl font-bold"><User size={18} /> Profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manage your avatar and personal display details.</p>

              {profileMsg && (
                <p
                  role={profileMsg.type === "error" ? "alert" : "status"}
                  className={`mt-4 rounded-sm border p-3 text-sm ${
                    profileMsg.type === "error"
                      ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                      : "border-primary/40 bg-primary/10 text-primary"
                  }`}
                >
                  {profileMsg.text}
                </p>
              )}

              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="relative group">
                  <div className="grid size-20 place-items-center rounded-full overflow-hidden border-2 border-border bg-primary text-2xl font-bold text-primary-foreground shadow-sm">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name || user.email} className="size-full object-cover" />
                    ) : (
                      <span>{(user.name || user.email).trim().charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {avatarBusy && (
                    <div className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-sm bg-primary px-3.5 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      <Camera size={15} /> Change photo
                    </button>
                    {user.avatarUrl && (
                      <button
                        type="button"
                        disabled={avatarBusy}
                        onClick={handleRemoveAvatar}
                        className="rounded-sm border border-border px-3 py-2 text-xs sm:text-sm font-medium hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-60"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Recommended: square JPG, PNG, or WebP. Max 10MB.</span>
                </div>
              </div>

              <div className="mt-6 border-t border-border pt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Email address
                  </label>
                  <div className="text-sm font-medium text-foreground">{user.email}</div>
                </div>

                <div>
                  <label htmlFor="settings-name-input" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Display name
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                    <input
                      id="settings-name-input"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Abdullah"
                      maxLength={80}
                      className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      disabled={nameBusy || nameInput.trim() === (user.name || "")}
                      onClick={handleSaveName}
                      className="rounded-sm border border-border bg-secondary px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-muted text-foreground disabled:opacity-50"
                    >
                      {nameBusy ? "Saving…" : "Save name"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="billing-h" className="mt-6 rounded-md border border-border bg-card p-6">
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
              <dd className="font-semibold">{pro ? "Pro" : "Free"}</dd>
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
        </>
      )}

      {user && (
        <section aria-labelledby="data-h" className="mt-6 rounded-md border border-border bg-card p-6">
            <h2 id="data-h" className="flex items-center gap-2 font-display text-xl font-bold"><Download size={18} /> Your data</h2>
            <p className="mt-3 text-sm text-muted-foreground">Download a copy of your account details, projects and style presets as a JSON file.</p>
            <a href="/api/app/account/export" download className="mt-4 inline-block rounded-sm border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary">Download my data</a>

            <div className="mt-6 border-t border-border pt-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300"><Trash2 size={15} /> Delete account</h3>
              {!deleting ? (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">Permanently deletes your account, projects and usage records. This cannot be undone. Any auto-renewing subscription is cancelled first.</p>
                  <button onClick={() => setDeleting(true)} className="mt-4 rounded-sm border border-red-500/50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-500/10 dark:text-red-300">Delete my account</button>
                </>
              ) : (
                <div className="mt-3 space-y-3 text-sm">
                  <label className="block font-medium">Enter your password to confirm
                    <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </label>
                  {deleteError && <p role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 p-3 text-red-700 dark:text-red-300">{deleteError}</p>}
                  <div className="flex flex-wrap gap-3">
                    <button onClick={deleteAccount} disabled={deleteBusy || !deletePassword} className="rounded-sm bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60">{deleteBusy ? "Deleting…" : "Permanently delete"}</button>
                    <button onClick={() => { setDeleting(false); setDeletePassword(""); setDeleteError(null); }} className="rounded-sm border border-border px-4 py-2 hover:bg-secondary">Keep my account</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
