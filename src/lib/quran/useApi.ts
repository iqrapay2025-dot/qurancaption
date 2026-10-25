"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiErr } from "./types";

const MAX_AUTO_RETRIES = 3;

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiErr | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const autoRetries = useRef(0);
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    if (lastUrl.current !== url) {
      autoRetries.current = 0;
      lastUrl.current = url;
    }
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setInterval> | undefined;
    setLoading(true);
    setError(null);
    setRetryIn(null);
    fetch(url, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const e: ApiErr = body?.error ?? { code: "upstream", message: `Request failed (HTTP ${res.status}).` };
          if (e.code === "rate_limited" && !e.retryAfter) e.retryAfter = Number(res.headers.get("retry-after")) || undefined;
          throw e;
        }
        setData(body as T);
        autoRetries.current = 0;
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        const err: ApiErr = e?.code ? e : { code: "network", message: "Could not reach the server. Check your connection." };
        setError(err);
        if (err.code === "rate_limited" && autoRetries.current < MAX_AUTO_RETRIES) {
          autoRetries.current++;
          let left = Math.max(3, err.retryAfter ?? 5) * autoRetries.current;
          setRetryIn(left);
          timer = setInterval(() => {
            left--;
            setRetryIn(left);
            if (left <= 0) {
              clearInterval(timer);
              setNonce((n) => n + 1);
            }
          }, 1000);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [url, nonce]);

  const retry = useCallback(() => {
    autoRetries.current = 0;
    setNonce((n) => n + 1);
  }, []);

  return { data, error, loading, retryIn, retry };
}
