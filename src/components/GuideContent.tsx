import Link from "next/link";
import {
  GUIDE_FREE_LIMITS,
  GUIDE_PRO_FEATURES,
  GUIDE_STEPS,
  GUIDE_TROUBLESHOOTING,
} from "@/lib/guide";

export function GuideContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-6" : "space-y-8"}>
      <section aria-labelledby="guide-steps">
        <h2 id="guide-steps" className="text-xl font-bold">
          Step by step
        </h2>
        <ol className="mt-4 space-y-4">
          {GUIDE_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-sm border border-border bg-card p-4"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
                {step.link && (
                  <Link
                    className="mt-2 inline-block text-sm font-semibold text-primary underline underline-offset-2"
                    href={step.link.href}
                  >
                    {step.link.label}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guide-limits" className="space-y-3">
        <h2 id="guide-limits" className="text-xl font-bold">
          Free plan and Pro
        </h2>
        <p className="rounded-sm border border-border bg-card p-4 text-sm leading-relaxed">
          {GUIDE_FREE_LIMITS}
        </p>
        <p className="rounded-sm border border-border bg-card p-4 text-sm leading-relaxed">
          {GUIDE_PRO_FEATURES}
        </p>
      </section>

      <section aria-labelledby="guide-troubleshooting">
        <h2 id="guide-troubleshooting" className="text-xl font-bold">
          Troubleshooting
        </h2>
        <ul className="mt-4 space-y-3">
          {GUIDE_TROUBLESHOOTING.map(({ problem, solution }) => (
            <li
              key={problem}
              className="rounded-sm border border-border bg-card p-4 text-sm leading-relaxed"
            >
              <h3 className="font-semibold">{problem}</h3>
              <p className="mt-1 text-muted-foreground">{solution}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
