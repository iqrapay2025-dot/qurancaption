import "server-only";
import { getAccount } from "./billing";
import { publicUser } from "./session";
import type { User } from "@/payload-types";

export async function userWithPlan(u: User) {
  const a = await getAccount(String(u.id));

  // Support either a boolean field or a date field, whichever your migration created.
  const raw = u as unknown as { emailVerified?: boolean | null; emailVerifiedAt?: string | null };
  const emailVerified = raw.emailVerified ?? !!raw.emailVerifiedAt;

  return { ...publicUser(u), plan: a.plan, billing: a.billing, emailVerified };
}