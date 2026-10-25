import "server-only";
import { getAccount } from "./billing";
import { publicUser } from "./session";
import type { User } from "@/payload-types";

export async function userWithPlan(u: User) {
  const a = await getAccount(String(u.id));
  return { ...publicUser(u), plan: a.plan, billing: a.billing };
}
