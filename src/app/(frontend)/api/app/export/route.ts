import { buildCaptions, creditLines, toSRT, toVTT, type CaptionLine, type Verse } from "@/data";
import { MAX_RANGES } from "@/lib/app/validate";
import { csrf, deny, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { getAccount } from "@/lib/app/billing";
import { FREE_LIMITS, FREE_MONTHLY_VERSES, monthKey } from "@/lib/app/plans";
import { currentUser } from "@/lib/app/session";
import { rateLimit } from "@/lib/app/rate-limit";
import { getVerses, getTranslations, ApiError } from "@/lib/quran/server";
import { getPayloadClient } from "@/lib/payload";

const KEY = /^[a-z_]{2,40}$/;
const NAME = /^[A-Za-z0-9_.-]{1,80}\.(srt|vtt)$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const key = (v: unknown) => (v == null ? null : typeof v === "string" && KEY.test(v) ? v : undefined);
const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);

type Layers = { arabic: boolean; tr1: string | null; tr2: string | null; translit: boolean; verseKey: boolean };
type Timing = { start: number; end: number };

function parseRange(r: unknown): { surah: number; from: number; to: number; timings: Map<number, Timing> } | null {
  if (!isObj(r) || !Array.isArray(r.timings)) return null;
  const surah = num(r.surah, 1, 114), from = num(r.from, 1, 286), to = num(r.to, 1, 286);
  if (!surah || !from || !to || to < from || r.timings.length !== to - from + 1) return null;
  const timings = new Map<number, Timing>();
  for (const t of r.timings) {
    if (!isObj(t)) return null;
    const n = num(t.n, from, to), start = num(t.start, 0, 1e6), end = num(t.end, 0, 1e6);
    if (n === undefined || start === undefined || end === undefined || end < start) return null;
    timings.set(n, { start, end });
  }
  return { surah, from, to, timings };
}

export async function POST(req: Request) {
  const csrfBad = csrf(req);
  if (csrfBad) return csrfBad;

  const b = await readJson(req);
  const bad = () => fail("Invalid export request.");
  if (!isObj(b)) return bad();

  const offset = num(b.offset, -3600, 3600);
  const format = b.format === "srt" || b.format === "vtt" ? b.format : undefined;
  if (offset === undefined || !format || !Array.isArray(b.ranges) || !b.ranges.length || b.ranges.length > MAX_RANGES) return bad();
  if (!Array.isArray(b.files) || !b.files.length || b.files.length > MAX_RANGES * 2) return bad();

  const ranges = [];
  for (const r of b.ranges) {
    const p = parseRange(r);
    if (!p) return bad();
    ranges.push(p);
  }

  const user = await currentUser().catch(() => null);

  // Unverified users cannot export.
  if (user && !user.emailVerified) {
    return fail("Please verify your email address before exporting.", 403);
  }

  const rl = await rateLimit(`app:export:${user ? String(user.id) : clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const plan = user ? (await getAccount(String(user.id))).plan : "free";
  const total = ranges.reduce((n, r) => n + (r.to - r.from + 1), 0);
  if (plan !== "pro" && total > FREE_LIMITS.verses) {
    return deny(
      "verse_limit",
      "Free exports cover up to " + FREE_LIMITS.verses + " verses in total across all ranges. Upgrade to Pro for longer passages.",
    );
  }

  // Monthly unique-verse allowance for free accounts.
  // Re-exporting already-recorded verses costs nothing; only new verse keys consume allowance.
  const recordedKeys = new Set<string>();
  const requestedVerseKeys = new Set<string>();
  for (const r of ranges) {
    for (let n = r.from; n <= r.to; n++) requestedVerseKeys.add(`${r.surah}:${n}`);
  }

  if (user && plan !== "pro") {
    const payload = await getPayloadClient();
    const month = monthKey();

    // Step 1: check the allowance first (read-only, nothing is recorded yet).
    const alreadyRecorded = await payload.find({
      collection: "usage-verses",
      where: { user: { equals: String(user.id) }, month: { equals: month } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    for (const doc of alreadyRecorded.docs) {
      if (doc.verseKey) recordedKeys.add(doc.verseKey);
    }

    const newVerseKeys = [...requestedVerseKeys].filter((k) => !recordedKeys.has(k));
    if (recordedKeys.size + newVerseKeys.length > FREE_MONTHLY_VERSES) {
      return deny(
        "monthly_verse_limit",
        `You've used your free monthly allowance of ${FREE_MONTHLY_VERSES} verses. Upgrade to Pro for unlimited verses, or they reset on the 1st of next month (UTC).`,
      );
    }
  }

  // Step 2: validate the split settings and files, then build the export.
  const sp = isObj(b.split) ? b.split : null;
  const maxAr = sp ? num(sp.maxAr, 10, 500) : undefined;
  const maxTr = sp ? num(sp.maxTr, 10, 500) : undefined;
  if (!sp || typeof sp.enabled !== "boolean" || maxAr === undefined || maxTr === undefined) return bad();
  const split = { enabled: sp.enabled, maxAr, maxTr };

  const files: { name: string; layers: Layers; ranges: number[] }[] = [];
  const names = new Set<string>();
  const wanted = new Set<string>();
  for (const f of b.files) {
    if (!isObj(f) || typeof f.name !== "string" || !NAME.test(f.name) || !f.name.endsWith("." + format) || !isObj(f.layers) || names.has(f.name)) return bad();
    if (!Array.isArray(f.ranges) || !f.ranges.length || !f.ranges.every((i) => Number.isInteger(i) && i >= 0 && i < ranges.length)) return bad();
    names.add(f.name);
    const l = f.layers, tr1 = key(l.tr1), tr2 = key(l.tr2);
    if (tr1 === undefined || tr2 === undefined || typeof l.arabic !== "boolean" || typeof l.translit !== "boolean" || typeof l.verseKey !== "boolean") return bad();
    if (tr1) wanted.add(tr1);
    if (tr2) wanted.add("transliteration");
    files.push({ name: f.name, layers: { arabic: l.arabic, tr1, tr2, translit: l.translit, verseKey: l.verseKey }, ranges: f.ranges as number[] });
  }

  try {
    const timedRanges: Verse[][] = await Promise.all(
      ranges.map(async (r) => {
        const { verses } = await getVerses(r.surah, r.from, r.to, [...wanted]);
        const timed: Verse[] = verses.map((v) => ({ ...v, ...(r.timings.get(v.n) ?? { start: NaN, end: NaN }) }));
        if (timed.length !== r.timings.size || timed.some((v) => !Number.isFinite(v.start))) throw new RangeError("timings");
        return timed;
      }),
    );

    // Determine if credit should be included: Pro users can opt-out, free users always get it
    const isFree = plan === "free";
    const userRequestedCredit = b.credit === true;
    const includeCredit = isFree ? true : userRequestedCredit;  // Free always, Pro respects toggle
    const trs = includeCredit ? (await getTranslations()).translations : [];
    const out = files.map((f) => {
      let run = 0;
      const caps: CaptionLine[] = [];
      for (const i of f.ranges) {
        const vs = timedRanges[i];
        caps.push(...buildCaptions(vs, f.layers, offset + run, split));
        run += vs[vs.length - 1].end - vs[0].start;
      }
      const cr = includeCredit ? creditLines(trs.filter((t) => t.id === f.layers.tr1 || t.id === f.layers.tr2)) : undefined;
      const body = (format === "srt" ? toSRT(caps, cr, isFree) : toVTT(caps, cr, isFree)).replace(/\r?\n/g, "\r\n");
      return { name: f.name, body, empty: caps.length === 0 };
    });
    const response = ok({ files: out });

    // Step 3: record NEW verse keys only after the export was built successfully.
    if (user && plan !== "pro") {
      const payload = await getPayloadClient();
      const month = monthKey();
      for (const k of requestedVerseKeys) {
        if (recordedKeys.has(k)) continue;
        await payload
          .create({
            collection: "usage-verses",
            data: { user: user.id, month, verseKey: k },
            overrideAccess: true,
            depth: 0,
          })
          .catch(() => {
            // Already recorded (unique index on user, month, verseKey): costs nothing.
          });
      }
    }

    return response;
  } catch (e) {
    if (e instanceof RangeError) return bad();
    if (e instanceof ApiError) return fail(e.message, e.status >= 400 && e.status < 600 ? e.status : 502);
    return fail("The export could not be produced.", 500);
  }
}