// public/sw.js
importScripts("/sw-rules.js");

const CACHE_NAME = "ayah-studio-v6";
const PRECACHE_ASSETS = [
  "/offline",
  "/brand/ayah-badge-dark-48.webp",
  "/brand/ayah-badge-dark-96.webp",
  "/brand/ayah-badge-light-48.webp",
  "/brand/ayah-badge-light-96.webp",
  "/brand/ayah-badge-dark.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
  "/fonts/Figtree-Regular.woff2",
  "/fonts/Figtree-LatinExt.woff2",
  "/fonts/JetBrainsMono-Regular.woff2",
  "/fonts/AmiriQuran-Regular.woff2",
  "/fonts/Amiri-Regular.woff2",
  "/fonts/Amiri-Bold.woff2",
  "/fonts/Amiri-Regular.ttf",
  "/fonts/ScheherazadeNew-Regular.woff2",
  "/fonts/ScheherazadeNew-SemiBold.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 1. Page navigations: network first, cache fallback, then /offline
  if (isPageNavigation(req)) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            return caches.match("/offline").then((res) => {
              return res || new Response("You are offline", { headers: { "Content-Type": "text/html" } });
            });
          });
        })
    );
    return;
  }

  // 2. Check if request is cacheable according to sw-rules
  if (!shouldCache(req)) {
    // Pass straight to network without caching
    return;
  }

  // 3. Static assets: Cache first, then network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((response) => {
          if (!response || response.status !== 200 || (response.type !== "basic" && response.type !== "cors")) {
            return response;
          }
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, cloned);
          });
          return response;
        })
        .catch(() => {
          return caches.match(req);
        });
    })
  );
});
