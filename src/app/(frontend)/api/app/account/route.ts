import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited } from "@/lib/app/http";
import { clearSession, currentUser } from "@/lib/app/session";
import { rateLimit } from "@/lib/app/rate-limit";
import { getAccount, paystackCancel, paystackDisable } from "@/lib/app/billing";
import { userWithPlan } from "@/lib/app/accountInfo";

// Updates user profile (name and/or avatarUrl)
export async function PATCH(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in first.", 401);
  const uid = String(user.id);

  const rl = await rateLimit(`app:update-profile:${uid}`, 30, 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const b = (await readJson(req)) as Record<string, unknown> | null;
  const payload = await getPayloadClient();

  const data: { name?: string; avatarUrl?: string | null } = {};
  if (typeof b?.name === "string") {
    data.name = b.name.trim().slice(0, 80);
  }
  if (b?.avatarUrl === null) {
    data.avatarUrl = null;
  } else if (typeof b?.avatarUrl === "string") {
    const av = b.avatarUrl.trim();
    if (av) {
      if (!av.startsWith("data:image/") && !av.startsWith("http://") && !av.startsWith("https://")) {
        return fail("Avatar must be a valid image or image data URL.");
      }
      if (av.length > 500_000) {
        return fail("Avatar image is too large. Please select a smaller photo (under 500KB).");
      }
      data.avatarUrl = av;
    } else {
      data.avatarUrl = null;
    }
  }

  try {
    const updated = await payload.update({
      collection: "users",
      id: uid,
      data,
      overrideAccess: true,
    });
    return ok({ user: await userWithPlan(updated as any) });
  } catch (e) {
    console.error("[account] profile update failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't update your profile. Please try again.", 500);
  }
}

// Permanently deletes the signed-in user's account and everything tied to it.
export async function DELETE(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in first.", 401);
  const uid = String(user.id);
  const rl = await rateLimit(`app:delete-account:${uid}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const b = (await readJson(req)) as Record<string, unknown> | null;
  const password = typeof b?.password === "string" ? b.password : "";
  if (!password) return fail("Enter your password to confirm.");
  const payload = await getPayloadClient();
  try {
    await payload.login({ collection: "users", data: { email: user.email, password } });
  } catch {
    return fail("That password is incorrect.", 401);
  }

  // Stop any auto-renewing Paystack subscription first so they are never charged again.
  const acc = await getAccount(uid);
  const autoRenews = acc.billing.provider === "paystack" && (!!acc.subscriptionRef || !!acc.customerRef) && !acc.billing.cancelAtPeriodEnd;
  if (autoRenews) {
    try {
      if (acc.subscriptionRef && acc.emailToken) await paystackDisable(acc.subscriptionRef, acc.emailToken);
      else await paystackCancel(acc);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      // "no subscription found" just means there is nothing to cancel.
      if (!/no subscription found/i.test(m)) {
        console.error("[account] could not cancel subscription before delete:", m);
        return fail("We couldn't cancel your subscription, so your account was not deleted. Please contact support and we will do it for you.", 502);
      }
    }
  }

  try {
    for (const collection of ["projects", "usage-projects", "usage-verses", "usage-auto-time"] as const) {
      await payload.delete({ collection, where: { [collection === "projects" ? "owner" : "user"]: { equals: uid } }, overrideAccess: true });
    }
    await payload.delete({ collection: "users", id: uid, overrideAccess: true });
  } catch (e) {
    console.error("[account] delete failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't delete your account. Please contact support.", 500);
  }
  await clearSession();
  return ok();
}