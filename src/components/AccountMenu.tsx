"use client";

import { FolderOpen, LogOut, Settings, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AppUser } from "../lib/app/client";

export default function AccountMenu({ user, onLogin, onProjects, onSettings, onSignOut }: {
  user: AppUser | null; onLogin: () => void; onProjects: () => void; onSettings: () => void; onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!user) {
    return (
      <button onClick={onLogin} aria-label="Log in" className="grid size-9 place-items-center rounded-full border border-border bg-secondary sm:size-auto sm:rounded-sm sm:border-foreground/80 sm:bg-transparent sm:px-3.5 sm:py-2 sm:text-sm sm:font-semibold sm:hover:bg-foreground sm:hover:text-background">
        <UserRound size={16} className="sm:hidden" /><span className="hidden sm:inline">Log in</span>
      </button>
    );
  }
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open} className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{initial}</button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-md border border-border bg-card shadow-xl">
          <div className="border-b border-border px-4 py-3 text-sm">
            {user.name && <div className="truncate font-semibold">{user.name}</div>}
            {user.plan === "pro" && <span className="mb-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground uppercase">Pro</span>}
            <div className="truncate text-muted-foreground">{user.email}</div>
          </div>
          <button role="menuitem" onClick={() => { setOpen(false); onProjects(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary"><FolderOpen size={15} /> My projects</button>
          <button role="menuitem" onClick={() => { setOpen(false); onSettings(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary"><Settings size={15} /> Settings and billing</button>
          <button role="menuitem" onClick={() => { setOpen(false); onSignOut(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary"><LogOut size={15} /> Sign out</button>
        </div>
      )}
    </div>
  );
}
