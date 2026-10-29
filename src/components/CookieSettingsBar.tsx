"use client";

export default function CookieSettingsBar() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-4 sm:flex-row sm:justify-between sm:px-8">
        <p className="text-xs text-muted-foreground">
          We use essential cookies to keep you signed in and process payments.
          <br className="sm:hidden" />
          Analytics cookies are optional — see{" "}
          <a
            href="/privacy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            privacy policy
          </a>
          .
        </p>
        <button
          onClick={() => {
            try {
              localStorage.removeItem("cookie_consent_choice");
            } catch (e) {
              // ignore
            }
            window.dispatchEvent(
              new CustomEvent("cookie-consent:reset"),
            );
          }}
          className="rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          Cookie settings
        </button>
      </div>
    </footer>
  );
}
