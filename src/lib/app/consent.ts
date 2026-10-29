import { useCookieConsent } from "@/components/CookieConsent";

export function hasAnalyticsConsent(): boolean {
  const { hasAnalyticsConsent } = useCookieConsent();
  return hasAnalyticsConsent();
}
