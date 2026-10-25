"use client";

import { useEffect, useState } from "react";
import type { Reciter, TranslationRes } from "../lib/quran/types";
import { SITE } from "../lib/site";

export function sourcesFor(translations: TranslationRes[], ids: (string | null | undefined)[]) {
  return ids.flatMap((id) => {
    const t = id ? translations.find((x) => x.id === id) : undefined;
    return t ? [t] : [];
  });
}

export default function Attribution({ translations, reciter, className = "" }: { translations: TranslationRes[]; reciter?: Reciter | null; className?: string }) {
  return (
    <div className={`text-xs leading-relaxed text-muted-foreground ${className}`}>
      <p>
        Quran data, translations and recitation audio provided by{" "}
        <a href={SITE.api.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">UmmahAPI</a>
        {" "}(Quran text from Tanzil.net, CC BY 3.0; translations via quran.com). Shown exactly as published.
      </p>
      {(translations.length > 0 || reciter) && (
        <ul className="mt-1.5 space-y-0.5">
          {translations.map((t) => (
            <li key={t.id}><span className="font-medium text-foreground">Translation:</span> {t.name}{!t.author ? " (translator not named by the API)" : !t.name.includes(t.author) ? `, ${t.author}` : ""} · {t.language}</li>
          ))}
          {reciter && <li><span className="font-medium text-foreground">Recitation:</span> {reciter.name}{reciter.style ? ` (${reciter.style})` : ""}</li>}
        </ul>
      )}
    </div>
  );
}

const KEY = "qcs-attribution-closed";

export function AttributionBar({ translations, reciter }: { translations: TranslationRes[]; reciter?: Reciter | null }) {
  const [closed, setClosed] = useState(false);
  useEffect(() => { try { setClosed(localStorage.getItem(KEY) === "1"); } catch {} }, []);
  const set = (v: boolean) => { setClosed(v); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch {} };
  if (closed)
    return (
      <footer className="flex items-center justify-between gap-3 border-t border-border bg-card px-5 py-1.5 text-xs text-muted-foreground">
        <span>Data by UmmahAPI · <a className="underline underline-offset-2" href="/terms">Terms</a> · <a className="underline underline-offset-2" href="/privacy">Privacy</a></span>
        <button onClick={() => set(false)} className="rounded-sm underline underline-offset-2 hover:text-foreground">Show sources</button>
      </footer>
    );
  return (
    <footer className="relative border-t border-border bg-card px-5 py-3 pr-12">
      <button onClick={() => set(true)} aria-label="Close sources and attribution" title="Close" className="absolute right-3 top-2 grid h-7 w-7 place-items-center rounded-sm text-lg leading-none text-muted-foreground hover:bg-secondary hover:text-foreground">×</button>
      <Attribution translations={translations} reciter={reciter} />
      <p className="mt-1.5 text-xs text-muted-foreground"><a className="underline underline-offset-2" href="/terms">Terms</a> · <a className="underline underline-offset-2" href="/privacy">Privacy</a></p>
    </footer>
  );
}
