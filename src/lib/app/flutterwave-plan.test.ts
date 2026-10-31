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
import { flutterwaveCountryInfo } from "./flutterwave-plan";

describe("flutterwaveCountryInfo", () => {
  it("NG", () => expect(flutterwaveCountryInfo("NG").currency).toBe("NGN"));
  it("GH", () => expect(flutterwaveCountryInfo("GH").currency).toBe("GHS"));
  it("lowercase gh", () => expect(flutterwaveCountryInfo("gh").currency).toBe("GHS"));
  it("unknown", () => expect(flutterwaveCountryInfo("XX").currency).toBe("USD"));
  it("undefined", () => expect(flutterwaveCountryInfo(undefined).currency).toBe("USD"));
  it("agrees with flutterwavePlan", () => {
    for (const c of ["NG", "GH", "gh", "XX", undefined]) {
      const info = flutterwaveCountryInfo(c);
      const plan = flutterwavePlan(c);
      expect(plan.currency).toBe(info.currency);
      expect(plan.amount).toBe(info.amount);
    }
  });
});

describe("display/methodsLabel", () => {
  it("NG", () => { const i=flutterwaveCountryInfo("NG"); expect(i.display).toBe("₦8,075.22"); expect(i.methodsLabel).toBe("Card, bank transfer, USSD"); });
  it("GH", () => { const i=flutterwaveCountryInfo("GH"); expect(i.display).toBe("GH₵69.88"); expect(i.methodsLabel).toBe("Card"); });
  it("gh", () => { const i=flutterwaveCountryInfo("gh"); expect(i.display).toBe("GH₵69.88"); });
  it("unknown", () => { const i=flutterwaveCountryInfo("XX"); expect(i.display).toBe("$6"); expect(i.methodsLabel).toBe("Card"); });
  it("undefined", () => { const i=flutterwaveCountryInfo(undefined); expect(i.display).toBe("$6"); });
});
