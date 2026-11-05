// Keeps Flashbulb working offline after the first visit.
// Pages are fetched from the network first (so updates arrive) and fall back to the saved copy.
const CACHE = "flashbulb-v2";
const CORE = [
  "./", "./index.html", "./solo/", "./solo/index.html",
  "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png",
  "./vendor/face-api/face-api.js",
  "./vendor/face-api/models/tiny_face_detector_model-weights_manifest.json", "./vendor/face-api/models/tiny_face_detector_model.bin",
  "./vendor/face-api/models/face_landmark_68_tiny_model-weights_manifest.json", "./vendor/face-api/models/face_landmark_68_tiny_model.bin",
];
const EXTRA = ["https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"]; // only needed for Together, so never wait on it

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => {
    EXTRA.forEach((u) => c.add(u).catch(() => {}));
    return Promise.all(CORE.map((u) => c.add(u).catch(() => {})));
  }));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameSite = url.origin === self.location.origin;
  const library = ["unpkg.com", "fonts.googleapis.com", "fonts.gstatic.com"].includes(url.host);
  if (!sameSite && !library) return; // video connection traffic is never touched

  if (sameSite) {
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
