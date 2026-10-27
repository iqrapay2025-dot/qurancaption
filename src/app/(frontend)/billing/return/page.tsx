"use client";

import { useEffect, useRef, useState } from "react";
import { appFetch } from "../../../../lib/app/client";
import { FREE_LIMITS, PRO_PRICE_NGN } from "../../../../lib/app/plans";

const POLL_INTERVAL = 3000;
// Poll for up to about 2 minutes before falling back to a settled-later message.
const MAX_TIME = 2 * 60 * 1000;

type Confirmed = { ok: boolean; status?: number; error?: string; alreadyApplied?: boolean; granted?: boolean };

async function confirmPayment(provider: string, ref: string, transactionId: string): Promise<Confirmed> {
  const path = provider === "flutterwave"
    ? "/api/app/billing/flutterwave/confirm"
    : "/api/app/billing/confirm";
  const body = provider === "flutterwave"
    ? { provider: "flutterwave", ref, transaction_id: transactionId }
    : { provider: "paystack", ref };
  const r = await appFetch<Confirmed>(path, { method: "POST", body: JSON.stringify(body) });
  if (r.ok) {
    if (provider === "flutterwave") {
      const c = r.data;
      if (c.alreadyApplied === true) return { ok: true, alreadyApplied: true };
      if (c.granted === true || c.ok === true) return { ok: true, granted: true };
      return { ok: false, status: c.status, error: c.error ?? "We couldn't confirm this payment." };
    }
    return { ok: true, alreadyApplied: r.data.alreadyApplied };
  }
  return { ok: false, status: r.status, error: r.error ?? "We couldn't confirm this payment." };
}

export default function ReturnPage() {
  const [status, setStatus] = useState<"idle" | "confirming" | "done" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const provider = q.get("provider") || "";
    const canceled = q.get("canceled");

    if (canceled) {
      window.location.replace("/#/pricing");
      return;
    }

    if (provider === "stripe") {
      // Stripe (auto-renew card) is not handled here; hand off to settings unchanged.
      window.location.replace(`/#/settings?provider=stripe&ref=${encodeURIComponent(q.get("session_id") || "")}`);
      return;
    }

    // Flutterwave redirects back with status, tx_ref and transaction_id.
    if (provider === "flutterwave") {
      const txRef = q.get("tx_ref") || "";
      const statusParam = q.get("status") || "";
      if (statusParam === "cancelled") {
        window.location.replace("/#/pricing");
        return;
      }
      if (statusParam === "failed") {
        setStatus("error");
        setError("Your payment could not be completed. Please try again.");
        return;
      }
      if (!txRef) {
        window.location.replace("/#/pricing");
        return;
      }
      // The Flutterwave transaction id is numeric when present; otherwise fall back
      // to the reference (tx_ref) that the confirm route uses for verification.
      const transactionId = q.get("transaction_id") || txRef;
      let cancelled = false;
      const startTime = Date.now();

      const poll = async () => {
        setStatus("confirming");
        while (!cancelled && !done.current && Date.now() - startTime < MAX_TIME) {
          const r = await confirmPayment("flutterwave", txRef, transactionId);
          if (r.ok) {
            setStatus("done");
            done.current = true;
            window.location.replace(`/#/settings?provider=flutterwave&ref=${encodeURIComponent(txRef)}`);
            return;
          }
          // Flutterwave returns 400 while a payment is still settling (pending),
          // plus 409 and 502, so treat those as "not verified yet" and poll again.
          if (r.status === 400 || r.status === 409 || r.status === 502) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
            continue;
          }
          // Real failures: wrong amount, wrong currency, failed status, tx_ref
          // mismatch, or not your payment. Also treat a genuine 4xx/5xx as a
          // hard failure instead of retrying until the 2 minute timeout.
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
    }

    // Paystack: keep the existing behaviour untouched.
    const ref = q.get("reference") || q.get("trxref") || q.get("session_id") || "";
    if (!ref) {
      window.location.replace("/#/pricing");
      return;
    }

    let cancelled = false;
    const startTime = Date.now();

    const poll = async () => {
      setStatus("confirming");
      while (!cancelled && !done.current && Date.now() - startTime < MAX_TIME) {
        const r = await confirmPayment("paystack", ref, "");
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
