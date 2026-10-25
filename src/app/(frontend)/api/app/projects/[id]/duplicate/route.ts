import { csrf, deny } from "@/lib/app/http";
import { getAccount } from "@/lib/app/billing";
import { FREE_LIMITS, verseCount } from "@/lib/app/plans";
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
    return ok({ project: { id: copy.id } }, 201);
  } catch {
    return fail("Project not found.", 404);
  }
}
