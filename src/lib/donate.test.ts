import { describe, it, expect } from "vitest";
import { getDonateUrl } from "./donate";

describe("getDonateUrl", () => {
  it("accepts a valid Paystack link", () => {
    expect(getDonateUrl("https://paystack.shop/pay/h1yuf0lgmx")).toBe("https://paystack.shop/pay/h1yuf0lgmx");
  });

  it("accepts a link with surrounding spaces", () => {
    expect(getDonateUrl("   https://paystack.shop/pay/h1yuf0lgmx   ")).toBe("https://paystack.shop/pay/h1yuf0lgmx");
  });

  it("returns null for undefined", () => {
    expect(getDonateUrl(undefined)).toBeNull();
  });

  it("returns null for empty string or whitespace", () => {
    expect(getDonateUrl("")).toBeNull();
    expect(getDonateUrl("   ")).toBeNull();
  });

  it("returns null for plain strings that are not URLs", () => {
    expect(getDonateUrl("paystack.shop/pay/h1yuf0lgmx")).toBeNull();
    expect(getDonateUrl("not a url")).toBeNull();
  });

  it("returns null for http:// links", () => {
    expect(getDonateUrl("http://paystack.shop/pay/h1yuf0lgmx")).toBeNull();
  });

  it("returns null for javascript: links", () => {
    expect(getDonateUrl("javascript:alert(1)")).toBeNull();
  });
});
