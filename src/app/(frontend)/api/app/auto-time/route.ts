import { csrf, deny, fail, ok, rateLimited } from "@/lib/app/http";
import { rateLimit } from "@/lib/app/rate-limit";
import { getAccount } from "@/lib/app/billing";
import { getPayloadClient } from "@/lib/payload";
import { currentUser } from "@/lib/app/session";
import { AUTO_TIME_MONTHLY_RUNS, monthKey } from "@/lib/app/plans";
import { checkFile } from "@/lib/ownAudio";
import { align } from "@/lib/app/auto-time/align";
import { transcribeWords, AutoTimeProviderError } from "@/lib/app/auto-time/provider";

export const maxDuration = 120;

const MAX_VERSES = 200;

type VerseInput = { verseKey: string; text: string };

function parseVerses(v: unknown): VerseInput[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_VERSES) return null;
  const out: VerseInput[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") return null;
    const r = item as Record<string, unknown>;
    const verseKey = String(r.verseKey ?? "").trim();
    const text = String(r.text ?? "").trim();
    if (!verseKey || verseKey.length > 80) return null;
    if (!text || text.length > 1000) return null;
    out.push({ verseKey, text });
  }
  return out;
}

export async function POST(req: Request) {
  const bad = csrf(req);
  if (bad) return bad;

  const user = await currentUser().catch(() => null);
  if (!user) return fail("Sign in to use auto-timing.", 401);

  // Rate limit per user (shared helper).
  const rl = await rateLimit(`auto-time:${String(user.id)}`, 30, 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter, "Too many auto-timing requests. Please wait and try again.");

  const acc = await getAccount(String(user.id));
  const limit = acc.plan === "pro" ? AUTO_TIME_MONTHLY_RUNS.pro : AUTO_TIME_MONTHLY_RUNS.free;
  const month = monthKey();
  const payload = await getPayloadClient();
  const usage = await payload.find({
    collection: "usage-auto-time",
    where: { user: { equals: String(user.id) }, month: { equals: month } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const used = usage.docs[0]?.count ?? 0;
  if (used >= limit) {
    return deny(
      "auto_time_limit",
      `You've used your free auto-timing runs this month. Upgrade to Pro for up to ${AUTO_TIME_MONTHLY_RUNS.pro} runs per month.`,
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Upload an audio file (mp3, m4a or wav, up to 25 MB).", 400);
  }
  const fileError = checkFile(file);
  if (fileError) return fail(fileError, 400);

  const verses = parseVerses(form.get("verses"));
  if (!verses) return fail("Provide the verse keys and Arabic text (1–200 verses).", 400);

  let words: { word: string; start: number; end: number }[];
  try {
    words = await transcribeWords(file as File, { prompt: verses[0].text });
  } catch (e) {
    if (e instanceof AutoTimeProviderError) return fail(e.message, e.status);
    return fail("Auto-timing failed. Please try again.", 500);
  }

  // Failed or timed-out runs never reach this point, so the allowance is only
  // consumed by successful runs.
  const timings = align(verses, words);

  try {
    if (usage.docs[0]) {
      await payload.update({
        collection: "usage-auto-time",
        id: usage.docs[0].id,
        data: { count: used + 1 },
        overrideAccess: true,
        depth: 0,
      });
    } else {
      await payload.create({
        collection: "usage-auto-time",
        data: { user: user.id, month, count: 1 },
        overrideAccess: true,
        depth: 0,
      });
    }
  } catch {
    return fail("The timing was computed but your usage could not be recorded. Please try again.", 500);
  }

  return ok({ timings });
}
