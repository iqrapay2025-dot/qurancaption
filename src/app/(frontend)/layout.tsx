import React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { BodyCustomCode, renderHeadCustomCode } from "@/lib/make-custom-code"
import {
  makeSiteSettings,
  sanitizeHtmlAttribute,
} from "@/lib/make-site-settings"
import { SITE } from "@/lib/site"
import { BRAND_NAME, BRAND_DESCRIPTION, SEO_TITLE } from "@/lib/brand"
import "./styles.css"
import CookieConsent from "@/components/CookieConsent"
import CookieSettingsBar from "@/components/CookieSettingsBar"
import SplashLoader from "@/components/SplashLoader"
import BackToTop from "@/components/BackToTop"

const title = SEO_TITLE
const description = BRAND_DESCRIPTION
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
  title: { default: title, template: `%s | ${BRAND_NAME}` },
  description,
  applicationName: BRAND_NAME,
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
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND_NAME,
  },
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
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
        {renderHeadCustomCode(customScripts?.headEnd, "head-end")}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ayah Studio" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0c1329" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof window!=="undefined"&&"serviceWorker" in navigator&&location.hostname!=="localhost"&&location.hostname!=="127.0.0.1"&&!location.port){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})}`,
          }}
        />
      </head>
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
