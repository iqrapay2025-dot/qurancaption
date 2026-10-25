import { ok } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { userWithPlan } from "@/lib/app/accountInfo";

export async function GET() {
  const u = await currentUser().catch(() => null);
  return ok({ user: u ? await userWithPlan(u) : null });
}
