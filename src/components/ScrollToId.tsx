"use client";

import { useEffect } from "react";

/**
 * Scrolls the element with the given id into view on mount.
 * Used by the marketing section pages (/home, /how-it-works, /editors,
 * /pricing) so a direct path visit lands on the intended section instead
 * of the very top of the page.
 */
export default function ScrollToId({ id }: { id: string }) {
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: "start", inline: "nearest", behavior: "smooth" });
  }, [id]);
  return null;
}
