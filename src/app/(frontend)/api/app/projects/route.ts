import { csrf, deny } from "@/lib/app/http";
import { getAccount } from "@/lib/app/billing";
import { FREE_LIMITS } from "@/lib/app/plans";
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
  }
  try {
    const doc = await payload.create({ collection: "projects", user, overrideAccess: false, depth: 0, data: parsed.data as never });
    return ok({ project: { id: doc.id, updatedAt: doc.updatedAt } }, 201);
  } catch {
    return fail("The project could not be saved.", 500);
  }
}
