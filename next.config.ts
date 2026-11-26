import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const isProd = process.env.NODE_ENV === 'production'

// Derive site URL for sitemaps, metadata, and auth redirects.
// Automatically falls back to Vercel production URL or default domain if unset.
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'https://aayahstudio.vercel.app'

const siteUrl = rawSiteUrl.replace(/\/$/, '')

// Content-Security-Policy.
// Notes:
//   * 'unsafe-inline' stays on script-src/style-src for the inline Google
//     Analytics snippet and Tailwind v4. Move to nonces later.
//   * 'unsafe-eval' is added in development only: React uses eval() for
//     debugging there and never uses it in production.
//   * connect-src allows Google Analytics and the two public UmmahAPI audio hosts.
//   * worker-src allows blob workers used by the Payload admin editor.
//   * If an inline Paystack integration is added later, allow
//     https://js.paystack.co in script-src and https://api.paystack.co in
//     connect-src.
//   * media-src and img-src allow any https origin for UmmahAPI audio and
//     Vercel Blob media.
const csp = [
  "default-src 'self'",
  `script-src 'self' https://www.googletagmanager.com https://*.googletagmanager.com https://va.vercel-scripts.com 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com https://verses.quran.com https://static.qurancdn.com data:",
  "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://api.quran.com https://apis.quran.foundation https://verses.quran.com https://static.qurancdn.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.googletagmanager.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://download.quranicaudio.com https://everyayah.com https://mp3quran.net https://*.mp3quran.net https://api.aladhan.com",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]
    : []),
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
  { key: 'Content-Security-Policy', value: csp },
]

const nextConfig: NextConfig = {
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
  output: 'standalone',
  enablePrerenderSourceMaps: false,
  async headers() {
    return [
      {
        source: '/audio/opendua/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      { source: '/:path*', headers: securityHeaders },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/ayah/:surah/:ayah/opengraph-image',
        destination: '/api/og/ayah?surah=:surah&ayah=:ayah',
      },
      {
        source: '/verify',
        destination: '/api/verify',
      },
    ]
  },
  env: {
    NEXT_PUBLIC_SITE_URL: siteUrl,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })