"use client";

import { Copy, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { appFetch, timeAgo, type AppUser, type ProjectSummary, type Upgrade } from "../lib/app/client";
import type { Chapter } from "../lib/quran/types";
import { useApi } from "../lib/quran/useApi";
import AccountMenu from "./AccountMenu";
import { Logo, ThemeToggle } from "./shared";

const ASPECT = { "9:16": "9 / 16", "16:9": "16 / 9", "1:1": "1 / 1" } as const;

export default function Projects({ user, ready, dark, toggleTheme, onHome, onNew, onOpen, onLogin, onSignOut, requestUpgrade, onSettings }: {
  user: AppUser | null; ready: boolean; dark: boolean; toggleTheme: () => void;
  onHome: () => void; onNew: () => void; onOpen: (id: string) => void; onLogin: () => void; onSignOut: () => void;
  requestUpgrade: (u: Upgrade) => void; onSettings: () => void;
}) {
  const [usage, setUsage] = useState<{ count: number; limit: number | null } | null>(null);
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const chapters = useApi<{ chapters: Chapter[] }>("/api/quran/chapters").data?.chapters ?? [];

  const load = useCallback(async () => {
    setError(null);
    const r = await appFetch<{ projects: ProjectSummary[]; usage: { count: number; limit: number | null } }>("/api/app/projects");
    if (r.ok) { setItems(r.data.projects); setUsage(r.data.usage); }
    else { setItems([]); setError(r.error); }
  }, []);
  useEffect(() => { if (user) load(); else setItems(null); }, [user, load]);

  const label = (p: ProjectSummary) => {
    const n = chapters.find((c) => c.id === p.surah)?.nameSimple ?? `Surah ${p.surah}`;
    return `${n} ${p.fromAyah}–${p.toAyah}`;
  };

  const duplicate = async (id: string) => {
    setBusyId(id);
    const r = await appFetch("/api/app/projects/" + id + "/duplicate", { method: "POST", body: {} });
    setBusyId(null);
    if (r.ok) load();
    else if (r.status === 402) requestUpgrade({ code: "project_limit", message: r.error });
    else setError(r.error);
  };
  const atLimit = !!usage && usage.limit !== null && usage.count >= usage.limit;
  const create = () => { if (atLimit) requestUpgrade({ code: "project_limit" }); else onNew(); };
  const remove = async (id: string) => {
    setBusyId(id);
    const r = await appFetch("/api/app/projects/" + id, { method: "DELETE" });
    setBusyId(null);
    setConfirmId(null);
    if (r.ok) setItems((l) => l?.filter((p) => p.id !== id) ?? l); else setError(r.error);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 md:px-8">
          <Logo onClick={onHome} />
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle dark={dark} toggle={toggleTheme} />
            <AccountMenu user={user} onLogin={onLogin} onProjects={() => {}} onSettings={onSettings} onSignOut={onSignOut} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">My projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything you create is saved automatically.
              {user && usage && usage.limit !== null && <> <b className={atLimit ? "text-red-600 dark:text-red-400" : "text-foreground"}>{usage.count} of {usage.limit} free projects used.</b></>}
            </p>
          </div>
          <button onClick={create} className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"><Plus size={16} /> New project</button>
        </div>

        {atLimit && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-sm border border-accent/60 bg-accent/10 p-4 text-sm">
            <span className="mr-auto">You've used all {usage?.limit} free projects. Delete one, or go Pro for unlimited projects.</span>
            <button onClick={() => requestUpgrade({ code: "project_limit" })} className="rounded-sm bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90">Upgrade to Pro</button>
          </div>
        )}
        {error && <p role="alert" className="mt-6 rounded-sm border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

        {!ready || (user && items === null) ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-md bg-muted" />)}
          </div>
        ) : !user ? (
          <div className="mt-10 rounded-md border border-dashed border-border p-10 text-center">
            <p className="font-display text-xl font-semibold">Log in to see your projects</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Projects are saved to your account so you can pick them up on any device.</p>
            <button onClick={onLogin} className="mt-6 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Log in or sign up</button>
          </div>
        ) : items && items.length === 0 ? (
          <div className="mt-10 rounded-md border border-dashed border-border p-10 text-center">
            <p className="font-display text-xl font-semibold">No projects yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Pick a surah and an ayah range, style the captions, and your project will appear here.</p>
            <button onClick={create} className="mt-6 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Start your first project</button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items?.map((p) => (
              <li key={p.id} className={`group flex flex-col overflow-hidden rounded-md border border-border bg-card ${busyId === p.id ? "opacity-60" : ""}`}>
                <button onClick={() => onOpen(p.id)} aria-label={`Open ${p.name}`} className="grid h-56 place-items-center bg-muted p-3">
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt="" style={{ aspectRatio: ASPECT[p.ratio] }} className="max-h-full max-w-full rounded-sm object-cover shadow-md" />
                  ) : (
                    <div style={{ aspectRatio: ASPECT[p.ratio] }} className="grid max-h-full max-w-full place-items-center rounded-sm bg-navy text-xs text-white/60">No preview</div>
                  )}
                </button>
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="truncate font-semibold" title={p.name}>{p.name}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{label(p)}</p>
                  <p className="text-xs text-muted-foreground">Edited {timeAgo(p.updatedAt)}</p>
                  {confirmId === p.id ? (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="mr-auto">Delete this project?</span>
                      <button onClick={() => remove(p.id)} className="rounded-sm bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700">Delete</button>
                      <button onClick={() => setConfirmId(null)} className="rounded-sm border border-border px-3 py-1.5 hover:bg-secondary">Cancel</button>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-1.5">
                      <button onClick={() => onOpen(p.id)} className="mr-auto flex items-center gap-1.5 rounded-sm bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/70"><FolderOpen size={14} /> Open</button>
                      <button onClick={() => duplicate(p.id)} disabled={busyId === p.id} aria-label={`Duplicate ${p.name}`} title="Duplicate" className="grid size-8 place-items-center rounded-sm border border-border hover:bg-secondary"><Copy size={14} /></button>
                      <button onClick={() => setConfirmId(p.id)} aria-label={`Delete ${p.name}`} title="Delete" className="grid size-8 place-items-center rounded-sm border border-border text-red-600 hover:bg-red-500/10"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
