// public/sw-rules.js

function getUrl(req) {
  if (typeof req === "string") return new URL(req, "https://ayahstudio.com");
  if (req && req.url) return new URL(req.url, "https://ayahstudio.com");
  return new URL("https://ayahstudio.com");
}

function shouldCache(request) {
  if (!request) return false;

  // Only GET requests are ever cacheable
  const method = (request && request.method) || "GET";
  if (method.toUpperCase() !== "GET") return false;

  // NEVER cache range requests (audio streaming HTTP 206)
  if (request.headers) {
    if (typeof request.headers.get === "function") {
      if (request.headers.get("range") || request.headers.get("Range")) return false;
      if (request.headers.get("authorization") || request.headers.get("Authorization")) return false;
    } else if (request.headers.range || request.headers.Range || request.headers.authorization) {
      return false;
    }
  }

  const url = getUrl(request);
  const pathname = url.pathname;

  // NEVER cache anything under /api
  if (pathname.startsWith("/api/") || pathname === "/api") return false;

  // NEVER cache audio files
  if (/\.(mp3|m4a|wav|ogg|aac)(\?.*)?$/i.test(pathname) || pathname.includes("/audio")) return false;

  // Cache Google Fonts stylesheets and font assets
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    return true;
  }

  // Cache static assets: /_next/static, /brand, /fonts, /icon-*, font files, apple-touch-icon
  if (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/brand/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/icon-") ||
    pathname === "/apple-touch-icon.png" ||
    /\.(woff|woff2|ttf|otf|png|jpg|jpeg|svg|ico)$/i.test(pathname)
  ) {
    return true;
  }

  // Precached offline fallback page
  if (pathname === "/offline") return true;

  return false;
}

function isPageNavigation(request) {
  if (!request) return false;
  if (request.mode === "navigate") return true;

  if (request.headers) {
    const accept = typeof request.headers.get === "function" ? request.headers.get("accept") : request.headers.accept;
    if (typeof accept === "string" && accept.includes("text/html")) return true;
  }

  const url = getUrl(request);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return false;
  return false;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { shouldCache, isPageNavigation };
}
