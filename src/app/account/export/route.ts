import { getPayloadClient } from "@/lib/payload";
import { fail, noStore, rateLimited } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { rateLimit } from "@/lib/app/rate-limit";
import { getAccount } from "@/lib/app/billing";

// Downloads a JSON copy of the signed-in user's own data.
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in first.", 401);
  const uid = String(user.id);
  const rl = rateLimit(`app:data-export:${uid}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const payload = await getPayloadClient();
  const [acc, projects, usage] = await Promise.all([
    getAccount(uid),
    payload.find({ collection: "projects", where: { owner: { equals: uid } }, pagination: false, depth: 0, overrideAccess: true }),
    payload.find({ collection: "usage-projects", where: { user: { equals: uid } }, pagination: false, depth: 0, overrideAccess: true }),
  ]);
  const data = {
    exportedAt: new Date().toISOString(),
    account: { email: user.email, name: user.name ?? null, createdAt: user.createdAt },
    plan: { plan: acc.plan, provider: acc.billing.provider, status: acc.billing.status, proUntil: acc.billing.proUntil, cancelAtPeriodEnd: acc.billing.cancelAtPeriodEnd },
    stylePresets: acc.presets,
    projects: projects.docs.map(({ owner: _owner, ...p }) => p),
    monthlyProjectCreation: usage.docs.map((u) => ({ month: u.month, count: u.count })),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { ...noStore, "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="quran-caption-studio-data.json"' },
  });
}