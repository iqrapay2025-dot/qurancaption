"use client";

import { useCallback, useEffect, useState } from "react";

import type { Billing, Plan } from "./plans";

export type AppUser = { id: string; email: string; name?: string | null; plan?: Plan; billing?: Billing };
export type Upgrade = { code: "project_limit" | "verse_limit" | "preset_pro" | "own_audio" | "overlay_video" | "general"; message?: string };
export type Preset = { id: string; name: string; style: Record<string, string | number | boolean> };

export async function appFetch<T>(url: string, init?: { method?: string; body?: unknown }): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body ? { "content-type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: json?.error ?? "Something went wrong. Please try again." };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: "Can't reach the server. Check your connection and try again." };
  }
}

export function useSession() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    const r = await appFetch<{ user: AppUser | null }>("/api/app/auth/me");
    if (r.ok) setUser(r.data.user);
    setReady(true);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const signOut = useCallback(async () => {
    await appFetch("/api/app/auth/logout", { method: "POST", body: {} });
    setUser(null);
  }, []);
  return { user, ready, setUser, signOut, refresh };
}

export type ProjectSummary = {
  id: string; name: string; surah: number; fromAyah: number; toAyah: number;
  ratio: "9:16" | "16:9" | "1:1"; thumbnail: string | null; updatedAt: string;
};

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
