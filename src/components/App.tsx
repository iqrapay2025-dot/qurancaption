"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, type Upgrade } from "../lib/app/client";
import AuthDialog, { type AuthMode } from "./AuthDialog";
import Editor from "./Editor";
import Landing from "./Landing";
import Pricing from "./Pricing";
import Projects from "./Projects";
import Settings from "./Settings";
import UpgradeDialog from "./UpgradeDialog";
import { useTheme } from "./shared";

type Route = { view: "landing" } | { view: "editor"; id: string | null } | { view: "projects" } | { view: "pricing" } | { view: "settings"; provider: string; ref: string } | { view: "reset"; token: string };

function read(): Route {
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

export default function App() {
  const { dark, toggle } = useTheme();
  const session = useSession();
  const [route, setRoute] = useState<Route>({ view: "landing" });
  const [auth, setAuth] = useState<AuthRequest | null>(null);
  const [upgrade, setUpgrade] = useState<Upgrade | null>(null);

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

  const go = useCallback((hash: string) => {
    location.hash = hash;
    window.scrollTo(0, 0);
  }, []);

  const requestUpgrade = useCallback((u: Upgrade) => setUpgrade(u), []);
  const requestAuth = useCallback((r: AuthRequest) => setAuth(r), []);
  const signOut = useCallback(async () => {
    await session.signOut();
    if (route.view === "projects" || route.view === "settings") go("#/");
  }, [session, route.view, go]);

  const resetting = route.view === "reset" && route.token;

  return (
    <>
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
          onHome={() => go("#/")}
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
