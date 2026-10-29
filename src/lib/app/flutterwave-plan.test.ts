import { describe, it, expect } from "vitest";
import { flutterwavePlan } from "./flutterwave-plan";
import { PRO_PRICE_NGN, FLUTTERWAVE_PRICE_USD } from "./plans";

describe("flutterwavePlan", () => {
  it("NG users get NGN with bank transfer etc", () => {
    const p = flutterwavePlan("NG");
    expect(p.currency).toBe("NGN");
    expect(p.amount).toBe(PRO_PRICE_NGN);
    expect(p.payment_options).toBe("card, banktransfer, ussd, account");
  });

  it("non-NG users get USD card only", () => {
    const p = flutterwavePlan("US");
    expect(p.currency).toBe("USD");
    expect(p.amount).toBe(FLUTTERWAVE_PRICE_USD);
    expect(p.payment_options).toBe("card");
  });

  it("null country defaults to USD", () => {
    const p = flutterwavePlan(null);
    expect(p.currency).toBe("USD");
  });
});