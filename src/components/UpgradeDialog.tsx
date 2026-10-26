"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import type { Upgrade } from "../lib/app/client";
import { FREE_LIMITS, PRO_PRICE_NGN } from "../lib/app/plans";

const COPY: Record<Upgrade["code"], { title: string; body: string }> = {
  project_limit: { title: "You've filled your 3 free projects", body: `Free accounts keep up to ${FREE_LIMITS.projects} saved projects. Delete one you no longer need, or go Pro for unlimited projects.` },
  verse_limit: { title: "That's more than 20 verses", body: `Free exports cover up to ${FREE_LIMITS.verses} verses at a time. Pick a shorter range, or go Pro for longer passages.` },
  preset_pro: { title: "Style presets are a Pro feature", body: "Save your favourite fonts, colours and layout once, then apply them to any project in a click." },
  overlay_video: { title: "Transparent video overlay is a Pro feature", body: "Render your styled captions to a transparent WebM to place above your footage in a video editor." },
  own_audio: { title: "Your own recitation is a Pro feature", body: "Upload your own recording, find the pauses and time every verse to it. The audio never leaves your browser." },
  general: { title: "Upgrade to Pro", body: "Unlimited projects and verses, custom style presets and priority support." },
};

export default function UpgradeDialog({ upgrade, signedIn, onClose, onPlans }: { upgrade: Upgrade; signedIn: boolean; onClose: () => void; onPlans: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const c = COPY[upgrade.code];
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="upg-title" className="relative w-full max-w-md rounded-md border border-border bg-card p-7 shadow-2xl">
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 grid size-8 place-items-center rounded-sm hover:bg-secondary"><X size={16} /></button>
        <div className="grid size-11 place-items-center rounded-full bg-secondary text-primary"><Sparkles size={20} /></div>
        <h2 id="upg-title" className="mt-4 font-display text-2xl font-bold">{c.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{upgrade.message ?? c.body}</p>
        <ul className="mt-5 space-y-2 text-sm">
          {["Unlimited projects and verses", "Custom style presets", "Priority support"].map((i) => <li key={i} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-primary" />{i}</li>)}
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button onClick={onPlans} className="flex-1 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">{signedIn ? `See Pro · ₦${PRO_PRICE_NGN.toLocaleString()}/month` : "See plans"}</button>
          <button onClick={onClose} className="flex-1 rounded-sm border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary">Not now</button>
        </div>
      </div>
    </div>
  );
}
