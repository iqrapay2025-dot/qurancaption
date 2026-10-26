"use client";

import { useEffect, useRef, useState } from "react";
import { appFetch } from "../../../../lib/app/client";
import { FREE_LIMITS, PRO_PRICE_NGN } from "../../../../lib/app/plans";

const POLL_INTERVAL = 3000;
// Poll for up to about 2 minutes before falling back to a settled-later message.
const MAX_TIME = 2 * 60 * 1000;

async function confirmPayment(ref: string) {
  const r = await appFetch<{ ok: boolean; status: number; error?: string; alreadyApplied?: boolean }>("/api/app/billing/confirm", {
    body: JSON.stringify({ provider: "paystack", ref }),
    
  });
  if (r.ok) {
          return { ok: true, alreadyApplied: r.data.alreadyApplied };
        }
        return { ok: false, status: r.status, error: r.error };
}

export default function ReturnPage() {
  const [status, setStatus] = useState<"idle" | "confirming" | "done" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const provider = q.get("provider") === "stripe" ? "stripe" : "paystack";
    const ref = q.get("reference") || q.get("trxref") || q.get("session_id") || "";
    const canceled = q.get("canceled");

    if (canceled) {
      window.location.replace("/#/pricing");
      return;
    }

    // Stripe (auto-renew card) is not handled here; hand off to settings unchanged.
    if (provider === "stripe") {
      window.location.replace(`/#/settings?provider=stripe&ref=${encodeURIComponent(ref)}`);
      return;
    }

    if (!ref) {
      window.location.replace("/#/pricing");
      return;
    }

    let cancelled = false;
    const startTime = Date.now();

    const poll = async () => {
      setStatus("confirming");
      while (!cancelled && !done.current && Date.now() - startTime < MAX_TIME) {
        const r = await confirmPayment(ref);
        if (r.ok) {
          setStatus("done");
          done.current = true;
          // Confirm succeeded: refresh account state via the settings view.
          window.location.replace(`/#/settings?provider=paystack&ref=${encodeURIComponent(ref)}`);
          return;
        }
        // 409 or 502 means Paystack hasn't recorded the charge yet (e.g. bank transfer, USSD, QR).
        if (r.status === 409 || r.status === 502) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
          continue;
        }
        // Real failures: wrong amount, wrong owner, failed or abandoned.
        setStatus("error");
        setError(r.error || "We couldn't confirm this payment.");
        return;
      }
      if (!cancelled && !done.current) {
        setStatus("pending");
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "confirming") return <p>We are confirming your payment</p>;
  if (status === "pending") {
    return (
      <p>
        Still processing. You'll get Pro automatically once it settles.
      </p>
    );
  }
  if (status === "error") return <p>{error}</p>;
  return <p>Confirming your payment…</p>;
}