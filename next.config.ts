import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy. Notes / known breakage risks:
//   * script-src/style-src include 'unsafe-inline': the layout renders an inline
//     Google Analytics snippet and Tailwind v4 may inject inline styles. Tighten
//     to nonce/hash-based policies later (e.g. next/script nonces) and drop
//     'unsafe-inline'.
//   * connect-src is 'self': checkout is server-initiated (Paystack redirect is
//     top-level navigation, not restricted here). If a frontend Paystack
//     inline integration is added, allow https://js.paystack.co in script-src
//     and https://api.paystack.co in connect-src.
//   * media-src allows any https origin because UmmahAPI audio URLs are served
//     from their own host.
//   * img-src allows data:, blob: (base64 thumbnails/object URLs) and any https
//     origin so Payload media served from Vercel Blob storage keeps working.
const csp = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com 'unsafe-inline'",
  "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self'",
  "media-src 'self' https:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join(" ");

const securityHeaders = [
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

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
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
