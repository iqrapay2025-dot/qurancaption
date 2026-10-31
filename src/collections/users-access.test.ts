import { describe, it, expect } from "vitest";
import { Users } from "./Users";

describe("Users access", () => {
  const fields = Users.fields as any[];
  const get = (name: string) => fields.find((f) => f.name === name);
  const serverOnly = (f: any) => {
    expect(f.access.create()).toBe(false);
    expect(f.access.update()).toBe(false);
    expect(f.access.read()).toBe(false);
  };
  for (const n of ["provider", "customerRef", "subscriptionRef", "emailToken", "billingStatus", "proUntil", "cancelAtPeriodEnd", "presets"]) {
    it(`${n} denies create/update/read`, () => serverOnly(get(n)));
  }
  it("provider options include flutterwave", () => {
    const f = get("provider");
    expect(f.options).toContain("paystack");
    expect(f.options).toContain("flutterwave");
    expect(f.options).toContain("stripe");
  });
});
