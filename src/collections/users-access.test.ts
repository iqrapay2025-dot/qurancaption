import { describe, it, expect } from "vitest";
import { Users } from "./Users";

describe("Users access", () => {
  const fields = Users.fields as any[];
  const get = (name: string) => fields.find((f) => f.name === name);
  const admin = { req: { user: { collection: "admins" } } };
  const customer = { req: { user: { collection: "users" } } };
  const anon = { req: {} };

  const neverWritable = (n: string) => {
    for (const who of [admin, customer, anon]) {
      expect(get(n).access.create(who)).toBe(false);
      expect(get(n).access.update(who)).toBe(false);
    }
  };

  // Secrets: nobody can read them through Payload, admins included.
  for (const n of ["customerRef", "subscriptionRef", "emailToken", "presets"]) {
    it(`${n} is unreadable and unwritable for everyone, admins included`, () => {
      neverWritable(n);
      for (const who of [admin, customer, anon]) expect(get(n).access.read(who)).toBe(false);
    });
  }

  // Billing status: admins may read it, nobody may write it.
  for (const n of ["provider", "billingStatus", "proUntil", "cancelAtPeriodEnd"]) {
    it(`${n} is readable by admins only and writable by nobody`, () => {
      neverWritable(n);
      expect(get(n).access.read(admin)).toBe(true);
      expect(get(n).access.read(customer)).toBe(false);
      expect(get(n).access.read(anon)).toBe(false);
    });
  }

  it("provider options include paystack, flutterwave and stripe", () => {
    const f = get("provider");
    expect(f.options).toContain("paystack");
    expect(f.options).toContain("flutterwave");
    expect(f.options).toContain("stripe");
  });
});