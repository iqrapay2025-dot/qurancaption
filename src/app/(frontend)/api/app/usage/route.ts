import { getPayloadClient } from "@/lib/payload";
import { getAccount } from "@/lib/app/billing";
import { fail, ok } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { FREE_MONTHLY_VERSES, monthKey } from "@/lib/app/plans";

export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Sign in to see usage.", 401);
  const payload = await getPayloadClient();
  const month = monthKey();
  const acc = await getAccount(String(user.id));
  if (acc.plan === "pro") {
    return ok({ plan: "pro", verses: { used: 0, limit: null, remaining: null }, resetAt: null });
  }
  const uv = await payload.find({
    collection: "usage-verses",
    where: { user: { equals: String(user.id) }, month: { equals: month } },
    depth: 0, limit: 1000, overrideAccess: true,
  });
  const used = uv.docs.length;
  const remaining = Math.max(0, FREE_MONTHLY_VERSES - used);
  const up = await payload.find({
    collection: "usage-projects",
    where: { user: { equals: String(user.id) }, month: { equals: month } },
    limit: 1, depth: 0, overrideAccess: true,
  });
  const projectsCreated = up.docs[0]?.count ?? 0;
  const { totalDocs: savedCount } = await payload.count({
    collection: "projects", user, overrideAccess: false,
  });
  const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString();
  return ok({
    plan: "free",
    verses: { used, limit: FREE_MONTHLY_VERSES, remaining },
    projects: { created: projectsCreated, limit: 10, savedLimit: 3, savedCount: 0 },
    resetAt,
  });
}