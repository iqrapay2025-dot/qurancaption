import { PRO_PRICE_NGN } from "./plans";
import { FLUTTERWAVE_PRICE_USD } from "./plans";

export function flutterwavePlan(country: string | null | undefined): {
  currency: "NGN" | "USD";
  amount: number;
  payment_options: string;
} {
  const isNg = String(country ?? "").toUpperCase() === "NG";
  if (isNg) {
    return { currency: "NGN", amount: PRO_PRICE_NGN, payment_options: "card, banktransfer, ussd, account" };
  }
  return { currency: "USD", amount: FLUTTERWAVE_PRICE_USD, payment_options: "card" };
}