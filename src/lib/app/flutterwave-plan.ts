import { PRO_PRICE_NGN } from "./plans";
import { FLUTTERWAVE_PRICE_USD } from "./plans";

export const FLUTTERWAVE_PLAN_ID = "247120";

export function flutterwavePlan(country: string | null | undefined): {
  currency: "NGN" | "USD";
  amount: number;
  payment_options: string;
  plan_id: string;
} {
  const isNg = String(country ?? "").toUpperCase() === "NG";
  if (isNg) {
    return {
      currency: "NGN",
      amount: PRO_PRICE_NGN,
      payment_options: "card, banktransfer, ussd, account",
      plan_id: FLUTTERWAVE_PLAN_ID,
    };
  }
  return {
    currency: "USD",
    amount: FLUTTERWAVE_PRICE_USD,
    payment_options: "card",
    plan_id: FLUTTERWAVE_PLAN_ID,
  };
}