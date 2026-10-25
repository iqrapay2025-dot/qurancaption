import { csrf, fail, ok } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { getAccount, stripePortal } from "@/lib/app/billing";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in first.", 401);
  const acc = await getAccount(String(user.id));
  if (acc.billing.provider !== "stripe" || !acc.customerRef) return fail("No Stripe subscription on this account.", 400);
  try {
    return ok({ url: (await stripePortal(acc.customerRef)).url });
  } catch (e) {
    console.error("[billing] portal failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't open the billing page. Please try again.", 502);
  }
}
