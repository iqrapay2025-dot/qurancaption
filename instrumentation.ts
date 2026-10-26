// Next.js instrumentation entry: runs on server startup (dev, build, production).
// Only configuration *names* are touched — never secret values.
export async function register(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!process.env.PAYSTACK_SECRET_KEY) missing.push("PAYSTACK_SECRET_KEY");
  if (!process.env.PAYSTACK_PLAN_CODE) missing.push("PAYSTACK_PLAN_CODE");
  if (/^(1|true|yes)$/i.test(process.env.UMMAH_REQUIRE_KEY ?? "") && !process.env.UMMAH_API_KEY) {
    missing.push("UMMAH_API_KEY");
  }
  if (missing.length) {
    console.error("[startup] Required configuration is missing: " + missing.join(", "));
  }

  if (process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_")) {
    console.warn(
      "[startup] PAYSTACK_SECRET_KEY starts with sk_test_ in production — this is a Paystack TEST key; real payments will not work.",
    );
  }
}
