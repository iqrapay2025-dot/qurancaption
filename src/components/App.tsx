"use client";

import { useCallback, useEffect, useState } from "react";
import { appFetch, useSession, type Upgrade } from "../lib/app/client";
import AuthDialog, { type AuthMode } from "./AuthDialog";
import Editor from "./Editor";
import Landing from "./Landing";
import Pricing from "./Pricing";
import Projects from "./Projects";
import Settings from "./Settings";
import UpgradeDialog from "./UpgradeDialog";
import { useTheme } from "./shared";

type Route = { view: "landing" } | { view: "editor"; id: string | null } | { view: "projects" } | { view: "pricing" } | { view: "settings"; provider: string; ref: string } | { view: "reset"; token: string };

// Must match the folder of the route: src/app/(frontend)/api/app/resend-verification/route.ts
const RESEND_VERIFICATION_URL = "/api/resend-verification";
const RESEND_COOLDOWN_MS = 60_000;
const GENERIC_RESEND_ERROR = "Could not send the email. Please try again in a few minutes.";

function read(): Route {
  if (location.pathname === "/pricing") return { view: "pricing" };
  const h = location.hash;
  if (h.startsWith("#/reset")) return { view: "reset", token: new URLSearchParams(h.split("?")[1] ?? "").get("token") ?? "" };
  if (h === "#/projects") return { view: "projects" };
  if (h === "#/pricing") return { view: "pricing" };
  if (h.startsWith("#/settings")) {
    const q = new URLSearchParams(h.split("?")[1] ?? "");
    return { view: "settings", provider: q.get("provider") ?? "", ref: q.get("ref") ?? "" };
  }
  const m = h.match(/^#\/editor(?:\/([\w-]+))?$/);
  if (m) return { view: "editor", id: m[1] ?? null };
  return { view: "landing" };
}

export type AuthRequest = { mode: AuthMode; reason?: string; after?: () => void };

type Notice = "verified" | "invalid" | null;

export default function App() {
  const { dark, toggle } = useTheme();
  const session = useSession();
  const [route, setRoute] = useState<Route>({ view: "landing" });
  const [auth, setAuth] = useState<AuthRequest | null>(null);
  const [upgrade, setUpgrade] = useState<Upgrade | null>(null);

  // Email verification UI state (all hooks stay up here, never inside the JSX)
  const [resend, setResend] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    const toAdmin = () => {
      const m = location.hash.match(/^#\/(admin|dashboard)(\/|$|\?)/);
      if (m) {
        location.replace(m[1] === "dashboard" ? "/dashboard" : "/admin");
        return true;
      }
      return false;
    };
    if (toAdmin()) return;
    setRoute(read());
    const on = () => {
      if (!toAdmin()) setRoute(read());
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Read ?verified=1 / ?verify=invalid once on load, then clean the URL.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const verified = q.get("verified") === "1";
    const invalid = q.get("verify") === "invalid";
    if (!verified && !invalid) return;
    if (verified) {
      setNotice("verified");
      session.refresh();
    } else {
      setNotice("invalid");
    }
    // Keep the hash (e.g. #/editor), drop only the query string.
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Let the user resend again after the cooldown.
  useEffect(() => {
    if (resend !== "sent") return;
    const t = setTimeout(() => setResend("idle"), RESEND_COOLDOWN_MS);
    return () => clearTimeout(t);
  }, [resend]);

  const go = useCallback((hash: string) => {
    location.hash = hash;
    window.scrollTo(0, 0);
  }, []);

  const requestUpgrade = useCallback((u: Upgrade) => setUpgrade(u), []);
  const requestAuth = useCallback((r: AuthRequest) => setAuth(r), []);
  const signOut = useCallback(async () => {
    setResend("idle");
    setResendError(null);
    setBannerDismissed(false);
    await session.signOut();
    if (route.view === "projects" || route.view === "settings") go("#/");
  }, [session, route.view, go]);

  const email = session.user?.email;

  const resendVerification = useCallback(async () => {
    if (!email) return;
    setResend("sending");
    setResendError(null);
    try {
      const res = await appFetch<{ ok: true }>(RESEND_VERIFICATION_URL, {
        method: "POST",
        body: { email },
      });
      if (res.ok) {
        setResend("sent");
        return;
      }
      setResendError(
        res.status === 429 ? "Please wait a few minutes before trying again." : GENERIC_RESEND_ERROR,
      );
      setResend("error");
    } catch {
      setResendError(GENERIC_RESEND_ERROR);
      setResend("error");
    }
  }, [email]);

  const resetting = route.view === "reset" && route.token;
  const emailVerified = (session.user as { emailVerified?: boolean } | null)?.emailVerified;
  const unverified = !!session.user && emailVerified === false;

  const noticeText =
    notice === "verified"
      ? "Email verified. You can now export, save and upgrade."
      : notice === "invalid"
        ? emailVerified
          ? "Your email is already verified."
          : session.user
            ? "This verification link is invalid or has expired. Tap “Resend verification email” to get a new one."
            : "This verification link is invalid or has expired. Log in and request a new one."
        : "";

  return (
    <>
      {notice && (
        <div
          role="status"
          className="border-b border-amber-300 bg-amber-100 text-amber-900 px-4 py-2.5"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm">{noticeText}</p>
            <button onClick={() => setNotice(null)} aria-label="Close message" className="text-sm leading-none p-1 hover:bg-amber-200 rounded-sm">
              ✕
            </button>
          </div>
        </div>
      )}

      {unverified && !bannerDismissed && (
        <div className="border-b border-amber-300 bg-amber-100 text-amber-900 px-4 py-2.5">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="font-medium text-sm">Confirm your email address.</span>{" "}
              <span className="text-sm text-amber-800">
                We sent a verification link to your email. Click it to unlock exports, saving and upgrades.
              </span>
              {resend === "error" && resendError && <p className="mt-1 text-xs text-red-700">{resendError}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={resendVerification}
                disabled={resend === "sending" || resend === "sent"}
                className="rounded-md bg-amber-200 text-amber-900 px-3 py-1 text-xs font-medium hover:bg-amber-300 disabled:opacity-60"
              >
                {resend === "sending" ? "Sending..." : resend === "sent" ? "Email sent" : "Resend verification email"}
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="rounded-md bg-amber-200 text-amber-900 px-2 py-1 text-xs hover:bg-amber-300"
                aria-label="Close verification banner"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {route.view === "editor" ? (
        <Editor
          key={route.id ?? "new"}
          projectId={route.id}
          user={session.user}
          sessionReady={session.ready}
          requestAuth={requestAuth}
          requestUpgrade={requestUpgrade}
          onSettings={() => go("#/settings")}
          onSignOut={signOut}
          onHome={() => go("#/")}
          onProjects={() => go("#/projects")}
          dark={dark}
          toggleTheme={toggle}
        />
      ) : route.view === "projects" ? (
        <Projects
          user={session.user}
          ready={session.ready}
          dark={dark}
          toggleTheme={toggle}
          onHome={() => go("#/")}
          onNew={() => go("#/editor")}
          onOpen={(id) => go(`#/editor/${id}`)}
          onLogin={() => requestAuth({ mode: "login" })}
          onSignOut={signOut}
          requestUpgrade={requestUpgrade}
          onSettings={() => go("#/settings")}
        />
      ) : route.view === "pricing" ? (
        <Pricing
          user={session.user}
          ready={session.ready}
          dark={dark}
          toggleTheme={toggle}
          onHome={() => {
            if (location.pathname === "/pricing") location.assign("/");
            else go("#/");
          }}
          onStart={() => go("#/editor")}
          onLogin={() => requestAuth({ mode: "login" })}
          onSignup={(reason, after) => requestAuth({ mode: "signup", reason, after })}
          onProjects={() => go("#/projects")}
          onSettings={() => go("#/settings")}
          onSignOut={signOut}
        />
      ) : route.view === "settings" ? (
        <Settings
          user={session.user}
          ready={session.ready}
          dark={dark}
          toggleTheme={toggle}
          checkout={route.ref ? { provider: route.provider, ref: route.ref } : null}
          refresh={session.refresh}
          onHome={() => go("#/")}
          onPricing={() => go("#/pricing")}
          onProjects={() => go("#/projects")}
          onLogin={() => requestAuth({ mode: "login" })}
          onSignOut={signOut}
        />
      ) : (
        <Landing
          onStart={() => go("#/editor")}
          user={session.user}
          onLogin={() => requestAuth({ mode: "login" })}
          onSignup={() => requestAuth({ mode: "signup" })}
          onProjects={() => go("#/projects")}
          onPricing={() => go("#/pricing")}
          onSettings={() => go("#/settings")}
          onSignOut={signOut}
          dark={dark}
          toggleTheme={toggle}
        />
      )}

      {upgrade && (
        <UpgradeDialog
          upgrade={upgrade}
          signedIn={!!session.user}
          onClose={() => setUpgrade(null)}
          onPlans={() => { setUpgrade(null); go("#/pricing"); }}
        />
      )}

      {resetting && !auth && (
        <AuthDialog
          mode="reset"
          resetToken={route.token}
          onClose={() => go("#/")}
          onAuthed={(u) => { session.setUser(u); session.refresh(); go("#/projects"); }}
        />
      )}
      {auth && (
        <AuthDialog
          mode={auth.mode}
          reason={auth.reason}
          onClose={() => setAuth(null)}
          onAuthed={(u) => {
            session.setUser(u);
            session.refresh();
            setAuth(null);
            auth.after?.();
          }}
        />
      )}
    </>
  );
}