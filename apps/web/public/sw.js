// Vybx Service Worker — cache strategy per resource type
// Version bumped by changing CACHE_VER to bust stale caches.
const CACHE_VER = "v1";
const STATIC_CACHE = `vybx-static-${CACHE_VER}`;
const IMAGE_CACHE = `vybx-images-${CACHE_VER}`;
const OFFLINE_URL = "/offline.html";
const ALL_CACHES = [STATIC_CACHE, IMAGE_CACHE];

// ── Install: pre-cache offline page ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: delete stale caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET over HTTP(S)
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Cross-origin (CDN images, fonts, etc.) — network only
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => new Response("", { status: 503 })));
    return;
  }

  // API routes — network only, never cache auth/payment data
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Next.js static assets (content-hashed) — cache first, long TTL
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(STATIC_CACHE, request));
    return;
  }

  // Next.js image optimization — stale-while-revalidate
  if (url.pathname.startsWith("/_next/image")) {
    event.respondWith(staleWhileRevalidate(IMAGE_CACHE, request));
    return;
  }

  // Static image files (public/)
  if (/\.(png|jpe?g|webp|avif|svg|ico|gif)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(IMAGE_CACHE, request));
    return;
  }

  // Navigation — network first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((r) => r ?? new Response("Offline", { status: 503 })),
      ),
    );
    return;
  }
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached ?? fetchPromise;
}
