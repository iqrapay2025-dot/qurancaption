import { csrf, deny } from "@/lib/app/http";
import { getAccount } from "@/lib/app/billing";
import { FREE_LIMITS, FREE_MONTHLY_PROJECT_CREATIONS, monthKey } from "@/lib/app/plans";
import { getPayloadClient } from "@/lib/payload";
import { fail, ok, readJson } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { parseProject, totalVerses } from "@/lib/app/validate";

export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Sign in to see your projects.", 401);
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "projects", user, overrideAccess: false, depth: 0, limit: 200, sort: "-updatedAt",
    select: { name: true, surah: true, fromAyah: true, toAyah: true, ratio: true, thumbnail: true, updatedAt: true, createdAt: true },
  });
  const acc = await getAccount(String(user.id));
  return ok({ projects: docs, usage: { count: docs.length, limit: acc.plan === "pro" ? null : FREE_LIMITS.projects }, plan: acc.plan });
}

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Sign in to save projects.", 401);
  const parsed = parseProject(await readJson(req));
  if (!parsed.ok) return fail(parsed.error);
  const payload = await getPayloadClient();
  const acc = await getAccount(String(user.id));
  if (acc.plan !== "pro") {
    const d = parsed.data;
    if (totalVerses(d) > FREE_LIMITS.verses)
      return deny("verse_limit", `Free projects cover up to ${FREE_LIMITS.verses} verses. Upgrade to Pro for longer passages.`);
    const { totalDocs } = await payload.count({ collection: "projects", user, overrideAccess: false });
    if (totalDocs >= FREE_LIMITS.projects)
      return deny("project_limit", `You've used all ${FREE_LIMITS.projects} free projects. Upgrade to Pro for unlimited projects.`);

    // Monthly project-creation counter: deleting and recreating does not reset the monthly count.
    const month = monthKey();
    const up = await payload.find({
      collection: "usage-projects",
      where: { user: { equals: String(user.id) }, month: { equals: month } },
      limit: 1, depth: 0, overrideAccess: true,
    });
    const createdThisMonth = up.docs[0]?.count ?? 0;
    if (createdThisMonth >= FREE_MONTHLY_PROJECT_CREATIONS)
      return deny("monthly_project_limit", `You've created ${createdThisMonth} projects this month (limit ${FREE_MONTHLY_PROJECT_CREATIONS}). Deleting and recreating does not reset this count. It resets on the 1st of next month (UTC).`);
  }
  try {
    const doc = await payload.create({ collection: "projects", user, overrideAccess: false, depth: 0, data: parsed.data as never });
    // Increment the monthly project-creation counter (free users only).
    if (acc.plan !== "pro") {
      const month = monthKey();
      const up = await payload.find({
        collection: "usage-projects",
        where: { user: { equals: String(user.id) }, month: { equals: month } },
        limit: 1, depth: 0, overrideAccess: true,
      });
      if (up.docs[0]) {
        await payload.update({
          collection: "usage-projects", id: up.docs[0].id,
          data: { count: (up.docs[0]?.count ?? 0) + 1 }, overrideAccess: true, depth: 0,
        });
      } else {
        await payload.create({
          collection: "usage-projects",
          data: { user: user.id, month, count: 1 },
          overrideAccess: true, depth: 0,
        });
      }
    }
    return ok({ project: { id: doc.id, updatedAt: doc.updatedAt } }, 201);
  } catch {
    return fail("The project could not be saved.", 500);
  }
}
