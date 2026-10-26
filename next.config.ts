import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const isProd = process.env.NODE_ENV === 'production'

// Fail the production build if the site URL is missing. It is baked in at
// build time and feeds reset links, Paystack return URLs, sitemap and OG tags.
if (isProd && !process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error(
    'NEXT_PUBLIC_SITE_URL is not set. Add it in Vercel (e.g. https://qurancaptionstudio.vercel.app, no trailing slash) and redeploy.',
  )
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

// Content-Security-Policy.
// Notes:
//   * 'unsafe-inline' stays on script-src/style-src for the inline Google
//     Analytics snippet and Tailwind v4. Move to nonces later.
//   * 'unsafe-eval' is added in development only: React uses eval() for
//     debugging there and never uses it in production.
//   * connect-src allows Google Analytics so its data requests are not blocked.
//   * worker-src allows blob workers used by the Payload admin editor.
//   * If an inline Paystack integration is added later, allow
//     https://js.paystack.co in script-src and https://api.paystack.co in
//     connect-src.
//   * media-src and img-src allow any https origin for UmmahAPI audio and
//     Vercel Blob media.
const csp = [
  "default-src 'self'",
  `script-src 'self' https://www.googletagmanager.com 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "media-src 'self' https:",
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
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  env: {
    NEXT_PUBLIC_SITE_URL: siteUrl,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })