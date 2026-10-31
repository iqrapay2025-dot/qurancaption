import { PRO_PRICE_NGN, FLUTTERWAVE_PRICE_USD, FLUTTERWAVE_PRICE_GHS } from "./plans";

export type FlutterwaveCountryInfo = {
  currency: "NGN" | "GHS" | "USD";
  amount: number;
  label: string;
  methods: string;
  display: string;
  methodsLabel: string;
};

export function flutterwaveCountryInfo(country: string | null | undefined): FlutterwaveCountryInfo {
  const c = String(country ?? "").toUpperCase();
  if (c === "NG") return { currency: "NGN", amount: PRO_PRICE_NGN, label: `NGN ${PRO_PRICE_NGN}`, methods: "card, banktransfer, ussd, account", display: `₦${PRO_PRICE_NGN.toLocaleString()}`, methodsLabel: "Card, bank transfer, USSD" };
  if (c === "GH") return { currency: "GHS", amount: FLUTTERWAVE_PRICE_GHS, label: `GHS ${FLUTTERWAVE_PRICE_GHS}`, methods: "card", display: `GH₵${FLUTTERWAVE_PRICE_GHS.toLocaleString()}`, methodsLabel: "Card" };
  return { currency: "USD", amount: FLUTTERWAVE_PRICE_USD, label: `USD ${FLUTTERWAVE_PRICE_USD}`, methods: "card", display: `$${FLUTTERWAVE_PRICE_USD}`, methodsLabel: "Card" };
}

export function flutterwavePlanIdForCurrency(currency: string): string {
  const c = String(currency).toUpperCase();
  if (c === "NGN") return process.env.FLUTTERWAVE_PLAN_ID_NGN || "247191";
  if (c === "GHS") return process.env.FLUTTERWAVE_PLAN_ID_GHS || "247192";
  return process.env.FLUTTERWAVE_PLAN_ID_USD || process.env.FLUTTERWAVE_PLAN_ID || "247120";
}

export type FlutterwavePlan = {
  currency: "NGN" | "GHS" | "USD";
  amount: number;
  payment_options: string;
  plan_id: string;
};

export function flutterwavePlan(country: string | null | undefined): FlutterwavePlan {
  const info = flutterwaveCountryInfo(country);
  return {
    currency: info.currency,
    amount: info.amount,
    payment_options: info.methods,
    plan_id: flutterwavePlanIdForCurrency(info.currency),
  };
}
