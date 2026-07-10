// STOKMASTER service worker — offline-first (NetworkFirst nav, CacheFirst assets).
// Bump CACHE_VERSION to force refresh of cached shell.
const CACHE_VERSION = "stokmaster-v1";
const RUNTIME = `${CACHE_VERSION}-runtime`;
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(RUNTIME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("stokmaster-") && !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // NetworkFirst for HTML navigations
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          const fallback = await caches.match("/");
          if (fallback) return fallback;
          return new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } });
        }
      })(),
    );
    return;
  }

  // CacheFirst for same-origin assets
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh.ok && fresh.type === "basic") {
          const cache = await caches.open(RUNTIME);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        return cached || new Response("", { status: 504 });
      }
    })(),
  );
});
