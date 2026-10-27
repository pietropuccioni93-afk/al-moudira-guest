/* Keeps the app quick on the hotel wifi and readable with no signal.
 * Pages and photos come from the cache; /api calls always go to the network. */
const VERSION = "am-v3";
const CORE = ["./", "index.html", "styles.css", "config.js", "content.js", "api.js", "app.js", "img/logo.png", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Network first for the app itself (so updates show), cache first for photos
  if (url.pathname.includes("/img/") || url.pathname.includes("/files/")) { // photos, booklets and the map stay on the phone
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res;
    })));
  } else {
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
  }
});
