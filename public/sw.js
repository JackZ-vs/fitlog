const CACHE = "fitlog-v1";

// App shell — pages to cache on install
const PRECACHE = ["/", "/history", "/stats", "/foods", "/exercises", "/offline"];

// Install: pre-cache shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for navigation/API, cache-first for static assets
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET, non-same-origin, and Supabase API calls
  if (request.method !== "GET") return;
  if (!url.origin.includes(self.location.origin) && !url.hostname.includes("supabase")) return;
  if (url.hostname.includes("supabase")) return; // never cache API calls

  // Static assets (JS, CSS, images, fonts) → cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  ) {
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Navigation (HTML pages) → network-first, fall back to cache, then offline
  e.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(request, clone));
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/offline"))
      )
  );
});
