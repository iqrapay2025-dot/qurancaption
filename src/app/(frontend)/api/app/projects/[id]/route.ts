import { csrf, deny } from "@/lib/app/http";
import { getAccount } from "@/lib/app/billing";
import { FREE_LIMITS } from "@/lib/app/plans";
import { getPayloadClient } from "@/lib/payload";
import { fail, ok, readJson } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { parseProject, parseRanges, totalVerses } from "@/lib/app/validate";

type Ctx = { params: Promise<{ id: string }> };
const validId = (id: string) => /^[A-Za-z0-9_-]{1,64}$/.test(id);

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Sign in to open projects.", 401);
  if (!validId(id)) return fail("Project not found.", 404);
  const payload = await getPayloadClient();
  try {
    const doc = await payload.findByID({ collection: "projects", id, user, overrideAccess: false, depth: 0 });
    return ok({ project: doc });
  } catch (e) {
    console.error("project GET failed", id, e);
    return fail("Project not found.", 404);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const bad = csrf(req); if (bad) return bad;
  const { id } = await params;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Sign in to save projects.", 401);
  if (!validId(id)) return fail("Project not found.", 404);
  const parsed = parseProject(await readJson(req), true);
  if (!parsed.ok) return fail(parsed.error);
  const payload = await getPayloadClient();
  if (parsed.data.fromAyah != null || parsed.data.toAyah != null || parsed.data.ranges) {
    const acc = await getAccount(String(user.id));
    if (acc.plan !== "pro") {
      const cur = await payload.findByID({ collection: "projects", id, user, overrideAccess: false, depth: 0, select: { fromAyah: true, toAyah: true, ranges: true } }).catch(() => null);
      if (!cur) return fail("Project not found.", 404);
      const merged = {
        fromAyah: parsed.data.fromAyah ?? cur.fromAyah, toAyah: parsed.data.toAyah ?? cur.toAyah,
        ranges: parsed.data.ranges ?? parseRanges(cur.ranges) ?? [],
      };
      if (totalVerses(merged) > FREE_LIMITS.verses)
        return deny("verse_limit", `Free projects cover up to ${FREE_LIMITS.verses} verses. Upgrade to Pro for longer passages.`);
    }
  }
  try {
    const doc = await payload.update({ collection: "projects", id, user, overrideAccess: false, depth: 0, data: parsed.data as never, select: { updatedAt: true } });
    return ok({ project: { id: doc.id, updatedAt: doc.updatedAt } });
  } catch {
    return fail("Project not found or could not be saved.", 404);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const bad = csrf(req); if (bad) return bad;
  const { id } = await params;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Sign in first.", 401);
  if (!validId(id)) return fail("Project not found.", 404);
  const payload = await getPayloadClient();
  try {
    await payload.delete({ collection: "projects", id, user, overrideAccess: false });
    return ok();
  } catch {
    return fail("Project not found.", 404);
  }
}
