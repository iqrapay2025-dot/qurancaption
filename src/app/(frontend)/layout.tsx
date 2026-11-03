import React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { BodyCustomCode, renderHeadCustomCode } from "@/lib/make-custom-code"
import {
  makeSiteSettings,
  sanitizeHtmlAttribute,
} from "@/lib/make-site-settings"
import { SITE } from "@/lib/site"
import "./styles.css"
import CookieConsent from "@/components/CookieConsent"
import CookieSettingsBar from "@/components/CookieSettingsBar"
import SplashLoader from "@/components/SplashLoader"
import BackToTop from "@/components/BackToTop"

const title = makeSiteSettings.title ?? `${SITE.name} | ${SITE.tagline}`
const description = makeSiteSettings.description ?? SITE.description
const socialImage = makeSiteSettings.openGraph?.image
const googleAnalyticsId = sanitizeHtmlAttribute(
  makeSiteSettings.analytics?.googleAnalyticsId,
)

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3001",
  ),
  title: { default: title, template: `%s | ${SITE.name}` },
  description,
  applicationName: SITE.name,
  keywords: [
    "Quran captions",
    "Quran subtitles",
    "SRT",
    "VTT",
    "Quran video",
    "CapCut",
    "Premiere Pro",
    "Quran translation",
    "tilawah",
  ],
  alternates: { canonical: "/" },
  robots:
    process.env.ALLOW_INDEXING === "true"
      ? undefined
      : { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title,
    description,
    images: socialImage ? [socialImage] : undefined,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: socialImage ? [socialImage] : undefined,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const language = sanitizeHtmlAttribute(makeSiteSettings.language) || "en"
  const addBypassLinks = makeSiteSettings.accessibility?.addBypassLinks === true
  const customScripts = makeSiteSettings.customScripts

  return (
    <html lang={language} suppressHydrationWarning>
      <head>
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem("qcs-theme");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)d.classList.add("dark");if(sessionStorage.getItem("qcs-splash"))d.dataset.splash="seen"}catch(e){}})()`,
    }}
  />
  {renderHeadCustomCode(customScripts?.headStart, "head-start")}
  {renderHeadCustomCode(customScripts?.headEnd, "head-end")}<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" /><link rel="manifest" href="/site.webmanifest" /></head>
      <body className="min-h-screen antialiased">
        <SplashLoader />
        <BodyCustomCode html={customScripts?.bodyStart} />
        {addBypassLinks && (
          <a className="figma-bypass-link" href="#root">
            Skip to content
          </a>
        )}
        <div id="root" tabIndex={-1}>
          {children}
        </div>
        <BackToTop />
        {googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="figma-google-analytics" strategy="afterInteractive">
              {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(googleAnalyticsId)});
`}
            </Script>
          </>
        )}
        <BodyCustomCode html={customScripts?.bodyEnd} />
        <CookieSettingsBar />
        <CookieConsent />
      </body>
    </html>
  )
}
