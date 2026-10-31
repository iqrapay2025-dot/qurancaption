import type { Metadata } from "next";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const nf = new Intl.NumberFormat("en-US");

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</dd>
      {note && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{note}</p>}
    </div>
  );
}

function Bars({ title, days, values }: { title: string; days: string[]; values: number[] }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <figcaption className="text-sm font-medium text-slate-900 dark:text-white">
        {title} <span className="font-normal text-slate-600 dark:text-slate-300">· {nf.format(total)} in the last 30 days</span>
      </figcaption>
      <div role="img" aria-label={`${title}, last 30 days, ${total} total. Full figures are in the table below.`} className="mt-4 flex h-32 items-end gap-0.5">
        {values.map((v, i) => (
          <div key={days[i]} title={`${days[i]}: ${v}`} className="flex-1 rounded-t bg-emerald-600 dark:bg-emerald-400" style={{ height: `${Math.max(v ? 4 : 1, (v / max) * 100)}%`, opacity: v ? 1 : 0.25 }} />
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-emerald-800 underline dark:text-emerald-300">View as table</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">{title} per day</caption>
          <thead><tr><th scope="col" className="py-1 pr-4">Day</th><th scope="col" className="py-1">Count</th></tr></thead>
          <tbody>{days.map((d, i) => <tr key={d} className="border-t border-slate-100 dark:border-slate-800"><th scope="row" className="py-1 pr-4 font-normal">{d}</th><td className="tabular-nums">{values[i]}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

function Locked({ signedIn }: { signedIn: boolean }) {
  return (
    <main className="mx-auto max-w-lg p-8 text-slate-900 dark:text-white">
      <h1 className="text-2xl font-semibold">Admin sign-in required</h1>
      <p className="mt-3 text-slate-700 dark:text-slate-300">
        {signedIn ? "This account is an app user, not an admin, so it cannot open the dashboard." : "This dashboard is only for site admins."}
      </p>
      <a href="/admin/login?redirect=/dashboard" className="mt-5 inline-block rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400">Sign in to the admin panel</a>
    </main>
  );
}

export default async function Dashboard() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user || user.collection !== "admins") return <Locked signedIn={!!user} />;

  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const since7 = now - 7 * DAY;
  const q = { overrideAccess: true, depth: 0, pagination: false, limit: 20000 } as const;

  const [users, projects, active, pastDue, canceled] = await Promise.all([
    payload.find({ ...q, collection: "users", select: { createdAt: true } }),
    payload.find({ ...q, collection: "projects", select: { createdAt: true, updatedAt: true, owner: true, surah: true, ratio: true } }),
    payload.count({ collection: "users", overrideAccess: true, where: { billingStatus: { equals: "active" } } }),
    payload.count({ collection: "users", overrideAccess: true, where: { billingStatus: { equals: "past_due" } } }),
    payload.count({ collection: "users", overrideAccess: true, where: { billingStatus: { equals: "canceled" } } }),
  ]);

  const days = Array.from({ length: 30 }, (_, i) => new Date(now - (29 - i) * DAY).toISOString().slice(0, 10));
  const series = (rows: { createdAt: string }[]) => {
    const m = new Map(days.map((d) => [d, 0]));
    for (const r of rows) { const d = r.createdAt.slice(0, 10); if (m.has(d)) m.set(d, (m.get(d) ?? 0) + 1); }
    return days.map((d) => m.get(d) ?? 0);
  };
  const signups = series(users.docs);
  const made = series(projects.docs);

  const owner = (p: { owner?: unknown }) => (typeof p.owner === "object" && p.owner ? (p.owner as { id: string | number }).id : p.owner);
  const activeOwners = new Set(projects.docs.filter((p) => new Date(p.updatedAt).getTime() >= since7).map(owner));
  const owners = new Set(projects.docs.map(owner));
  const count = (rows: { createdAt: string }[], from: number) => rows.filter((r) => new Date(r.createdAt).getTime() >= from).length;

  const bySurah = new Map<number, number>();
  const byRatio = new Map<string, number>();
  for (const p of projects.docs) {
    bySurah.set(p.surah, (bySurah.get(p.surah) ?? 0) + 1);
    const r = p.ratio ?? "9:16";
    byRatio.set(r, (byRatio.get(r) ?? 0) + 1);
  }
  const topSurahs = [...bySurah].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const env = (k: string) => !!process.env[k];
  const checks: [string, boolean, string][] = [
    ["Database", true, "Answered the queries on this page"],
    ["Quran data key (UMMAH_API_KEY)", env("UMMAH_API_KEY"), "Not set means anonymous, rate-limited access"],
    ["Email sending (RESEND_API_KEY + EMAIL_FROM)", env("RESEND_API_KEY") && env("EMAIL_FROM"), "Not set means reset emails are only logged"],
    ["Paystack (PAYSTACK_SECRET_KEY + PLAN_CODE)", env("PAYSTACK_SECRET_KEY") && env("PAYSTACK_PLAN_CODE"), "Needed for Paystack subscriptions"],
  ];
  const totalUsers = users.totalDocs;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-white focus:p-2 focus:text-black">Skip to content</a>
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-4">
          <h1 className="text-xl font-semibold">Quran Caption Studio · Dashboard</h1>
          <nav aria-label="Admin" className="flex gap-4 text-sm">
            <a className="underline" href="/admin">Admin panel</a>
            <a className="underline" href="/admin/collections/users">Users</a>
            <a className="underline" href="/">Open app</a>
          </nav>
        </div>
      </header>
      <div id="content" className="mx-auto max-w-5xl space-y-8 p-4 pb-16">
        <p className="text-sm text-slate-700 dark:text-slate-300">Updated {new Date(now).toUTCString()}. Reload to refresh. Dates are UTC.</p>

        <section aria-labelledby="h-people">
          <h2 id="h-people" className="mb-3 text-lg font-semibold">People</h2>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total accounts" value={nf.format(totalUsers)} />
            <Stat label="New in 7 days" value={nf.format(count(users.docs, since7))} />
            <Stat label="New in 30 days" value={nf.format(count(users.docs, now - 30 * DAY))} />
            <Stat label="Active creators (7 days)" value={nf.format(activeOwners.size)} note="Accounts that saved a project in the last 7 days" />
          </dl>
        </section>

        <section aria-labelledby="h-plans">
          <h2 id="h-plans" className="mb-3 text-lg font-semibold">Plans</h2>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Pro, active" value={nf.format(active.totalDocs)} />
            <Stat label="Payment overdue" value={nf.format(pastDue.totalDocs)} />
            <Stat label="Canceled" value={nf.format(canceled.totalDocs)} />
            <Stat label="Free accounts" value={nf.format(Math.max(0, totalUsers - active.totalDocs - pastDue.totalDocs - canceled.totalDocs))} />
          </dl>
        </section>

        <section aria-labelledby="h-use">
          <h2 id="h-use" className="mb-3 text-lg font-semibold">Usage</h2>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Saved projects" value={nf.format(projects.totalDocs)} />
            <Stat label="New in 7 days" value={nf.format(count(projects.docs, since7))} />
            <Stat label="Accounts with a project" value={nf.format(owners.size)} note={totalUsers ? `${Math.round((owners.size / totalUsers) * 100)}% of accounts` : undefined} />
            <Stat label="Projects per creator" value={owners.size ? (projects.totalDocs / owners.size).toFixed(1) : "0"} />
          </dl>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Bars title="Sign-ups per day" days={days} values={signups} />
            <Bars title="Projects created per day" days={days} values={made} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-medium">Most used surahs</h3>
              {topSurahs.length ? (
                <ol className="mt-2 space-y-1 text-sm">{topSurahs.map(([s, n]) => <li key={s} className="flex justify-between"><span>Surah {s}</span><span className="tabular-nums">{n} {n === 1 ? "project" : "projects"}</span></li>)}</ol>
              ) : <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No projects saved yet.</p>}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-medium">Video formats</h3>
              {byRatio.size ? (
                <ul className="mt-2 space-y-1 text-sm">{[...byRatio].map(([r, n]) => <li key={r} className="flex justify-between"><span>{r}</span><span className="tabular-nums">{n}</span></li>)}</ul>
              ) : <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No projects saved yet.</p>}
            </div>
          </div>
        </section>

        <section aria-labelledby="h-health">
          <h2 id="h-health" className="mb-3 text-lg font-semibold">System status</h2>
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
            {checks.map(([name, ok, hint]) => (
              <li key={name} className="flex items-start justify-between gap-4 p-3 text-sm">
                <span>{name}<span className="block text-xs text-slate-600 dark:text-slate-400">{hint}</span></span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100" : "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100"}`}>{ok ? "Configured" : "Not set"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">The app does not track page views, exports or sign-in times. These figures come from accounts and saved projects only. Secret values are never shown, only whether they are set.</p>
        </section>
      </div>
    </main>
  );
}
