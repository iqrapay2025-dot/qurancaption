import { SITE } from "./site";

/**
 * Builds a mailto link for reporting mistakes, encoding subject and body safely.
 * Includes page address and the exact line: "Tell us what you found and where."
 */
export function buildMistakeReportMailto(pageUrl?: string): string {
  const email = SITE.email;
  const subject = "Mistake report";
  const url = pageUrl || (typeof window !== "undefined" ? window.location.href : "");
  const body = `Tell us what you found and where.\n\nPage: ${url}`;

  const query = new URLSearchParams();
  query.set("subject", subject);
  query.set("body", body);

  return `mailto:${email}?${query.toString().replace(/\+/g, "%20")}`;
}
