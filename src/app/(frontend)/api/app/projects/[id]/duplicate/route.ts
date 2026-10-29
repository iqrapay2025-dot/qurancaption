import { csrf, deny } from "@/lib/app/http";
import { getAccount } from "@/lib/app/billing";
import { FREE_LIMITS, FREE_MONTHLY_PROJECT_CREATIONS, monthKey, verseCount } from "@/lib/app/plans";
import { getPayloadClient } from "@/lib/payload";
import { fail, ok } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const bad = csrf(req); if (bad) return bad;
  const { id } = await params;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Sign in first.", 401);
  if (!/^[a-f0-9-]{8,40}$/i.test(id)) return fail("Project not found.", 404);
  const payload = await getPayloadClient();
  const acc = await getAccount(String(user.id));
  if (acc.plan !== "pro") {
    const { totalDocs } = await payload.count({ collection: "projects", user, overrideAccess: false });
    if (totalDocs >= FREE_LIMITS.projects)
      return deny("project_limit", `You've used all ${FREE_LIMITS.projects} free projects. Upgrade to Pro for unlimited projects.`);

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
    const src = await payload.findByID({ collection: "projects", id, user, overrideAccess: false, depth: 0 });
    const copy = await payload.create({
      collection: "projects", user, overrideAccess: false, depth: 0,
      data: {
        name: `${src.name} (copy)`.slice(0, 120), surah: src.surah, fromAyah: src.fromAyah, toAyah: src.toAyah, ranges: src.ranges ?? [],
        layers: src.layers, translations: src.translations, reciterId: src.reciterId, style: src.style, ratio: src.ratio, thumbnail: src.thumbnail,
      } as never,
    });
    // Increment the monthly project-creation counter (free users only).
    if (acc.plan !== "pro") {
      const month = monthKey();
      const up2 = await payload.find({
        collection: "usage-projects",
        where: { user: { equals: String(user.id) }, month: { equals: month } },
        limit: 1, depth: 0, overrideAccess: true,
      });
      if (up2.docs[0]) {
        await payload.update({
          collection: "usage-projects", id: up2.docs[0].id,
          data: { count: (up2.docs[0]?.count ?? 0) + 1 }, overrideAccess: true, depth: 0,
        });
      } else {
        await payload.create({
          collection: "usage-projects",
          data: { user: user.id, month, count: 1 },
          overrideAccess: true, depth: 0,
        });
      }
    }
    return ok({ project: { id: copy.id } }, 201);
  } catch {
    return fail("Project not found.", 404);
  }
}
