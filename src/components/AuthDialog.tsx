"use client";

import { Eye, EyeOff, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { appFetch, type AppUser } from "../lib/app/client";

export type AuthMode = "signup" | "login" | "forgot" | "reset";

const TITLES: Record<AuthMode, string> = {
  signup: "Create your free account",
  login: "Welcome back",
  forgot: "Reset your password",
  reset: "Choose a new password",
};

const field = "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export default function AuthDialog({ mode: initial, reason, resetToken, onClose, onAuthed }: {
  mode: AuthMode; reason?: string; resetToken?: string; onClose: () => void; onAuthed: (u: AppUser) => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
const [sent, setSent] = useState(false);

  const switchTo = (m: AuthMode) => { setMode(m); setError(null); setSent(false); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "forgot") {
      const r = await appFetch("/api/app/auth/forgot", { body: { email } });
      setBusy(false);
      if (r.ok) setSent(true); else setError(r.error);
      return;
    }
    const url = { signup: "signup", login: "login", reset: "reset" }[mode];
    const body = mode === "signup" ? { name, email, password } : mode === "login" ? { email, password } : { token: resetToken, password };
    const r = await appFetch<{ user: AppUser }>(`/api/app/auth/${url}`, { body });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onAuthed(r.data.user);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/50 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()} className="max-h-[94vh] w-full overflow-y-auto rounded-none border border-border bg-card shadow-2xl sm:max-w-md sm:rounded-md">
        <div className="flex items-start justify-between p-5 pb-2">
          <div>
            <h2 id="auth-title" className="font-display text-xl font-bold">{TITLES[mode]}</h2>
            {reason && mode === "signup" && <p className="mt-1.5 text-sm text-muted-foreground">{reason}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-secondary"><X size={18} /></button>
        </div>

        {mode === "forgot" && sent ? (
          <div className="space-y-4 p-5 pt-2 text-sm">
            <p className="rounded-sm bg-secondary p-3.5">If an account exists for <strong>{email}</strong>, a reset link is on its way. It stays valid for one hour.</p>
            <button onClick={() => switchTo("login")} className="font-semibold text-primary hover:underline">Back to log in</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5 pt-3">
            {mode === "signup" && (
              <label className="block text-sm font-medium">Name <span className="font-normal text-muted-foreground">(optional)</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} className={`${field} mt-1.5`} />
              </label>
            )}
            {mode !== "reset" && (
              <label className="block text-sm font-medium">Email
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={`${field} mt-1.5`} />
              </label>
            )}
            {mode !== "forgot" && (
              <label className="block text-sm font-medium">{mode === "reset" ? "New password" : "Password"}
                <div className="relative mt-1.5">
                  <input type={showPassword ? "text" : "password"} required minLength={mode === "login" ? 1 : 8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} className={`${field} pr-10`} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode !== "login" && <span className="mt-1 block text-xs font-normal text-muted-foreground">At least 8 characters.</span>}
              </label>
            )}
            {mode === "login" && (
              <button type="button" onClick={() => switchTo("forgot")} className="text-sm font-medium text-primary hover:underline">Forgot password?</button>
            )}

            {error && <p role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

            <button type="submit" disabled={busy} className="w-full rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Please wait…" : { signup: "Create account", login: "Log in", forgot: "Send reset link", reset: "Save new password" }[mode]}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              {mode === "signup" && <>Already have an account? <button type="button" onClick={() => switchTo("login")} className="font-semibold text-primary hover:underline">Log in</button></>}
              {mode === "login" && <>New here? <button type="button" onClick={() => switchTo("signup")} className="font-semibold text-primary hover:underline">Create an account</button></>}
              {mode === "forgot" && <button type="button" onClick={() => switchTo("login")} className="font-semibold text-primary hover:underline">Back to log in</button>}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
