import crypto from "node:crypto";
import { csrf, deny, fail, ok, readJson } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { getAccount, setBilling } from "@/lib/app/billing";
import { MAX_PRESETS } from "@/lib/app/plans";
import { parseProject } from "@/lib/app/validate";

export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return ok({ presets: [] });
  return ok({ presets: (await getAccount(String(user.id))).presets });
}

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in to save presets.", 401);
  const acc = await getAccount(String(user.id));
  if (acc.plan !== "pro") return deny("preset_pro", "Custom style presets are part of Pro.");
  const b = (await readJson(req)) as { name?: unknown; style?: unknown } | null;
  const name = typeof b?.name === "string" ? b.name.trim().slice(0, 40) : "";
  if (!name) return fail("Give the preset a name.");
  const parsed = parseProject({ style: b?.style }, true);
  if (!parsed.ok || !parsed.data.style) return fail("Invalid style settings.");
  if (acc.presets.length >= MAX_PRESETS) return fail(`You can keep up to ${MAX_PRESETS} presets. Delete one first.`);
  const presets = [...acc.presets, { id: crypto.randomUUID(), name, style: parsed.data.style }];
  await setBilling(String(user.id), { presets });
  return ok({ presets }, 201);
}

export async function DELETE(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in first.", 401);
  const id = new URL(req.url).searchParams.get("id");
  const acc = await getAccount(String(user.id));
  const presets = acc.presets.filter((p) => p.id !== id);
  await setBilling(String(user.id), { presets });
  return ok({ presets });
}
