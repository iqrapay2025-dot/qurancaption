// public/sw.js
importScripts("/sw-rules.js");

const CACHE_NAME = "ayah-studio-v1";
const PRECACHE_ASSETS = [
  "/offline",
  "/brand/ayah-badge-dark.png",
  "/brand/ayah-badge-light.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
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
      return fetch(req).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, cloned);
        });
        return response;
      });
    })
  );
});
