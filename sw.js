// Keeps Flashbulb working offline after the first visit.
// Pages are fetched from the network first (so updates arrive) and fall back to the saved copy.
const CACHE = "flashbulb-v8";
const CORE = [
  "./", "./index.html", "./solo/", "./solo/index.html", "./config.js",
  "./css/booth.css", "./js/looks.js", "./js/designs.js", "./js/poses.js", "./js/stickers.js", "./js/booth.js",
  "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png",
  "./vendor/face-api/face-api.js",
  "./vendor/face-api/models/tiny_face_detector_model-weights_manifest.json", "./vendor/face-api/models/tiny_face_detector_model.bin",
  "./vendor/face-api/models/face_landmark_68_tiny_model-weights_manifest.json", "./vendor/face-api/models/face_landmark_68_tiny_model.bin",
  // sticker artwork (Fluent Emoji, Noto Animated Emoji)
  "./assets/memes/solo/01.jpg",
  "./assets/memes/solo/02.jpg",
  "./assets/memes/solo/03.jpg",
  "./assets/memes/solo/04.jpg",
  "./assets/memes/solo/05.jpg",
  "./assets/memes/solo/06.jpg",
  "./assets/memes/solo/07.jpg",
  "./assets/memes/solo/08.jpg",
  "./assets/memes/solo/09.jpg",
  "./assets/memes/solo/10.jpg",
  "./assets/memes/solo/11.jpg",
  "./assets/memes/solo/12.jpg",
  "./assets/memes/solo/13.jpg",
  "./assets/memes/solo/14.jpg",
  "./assets/memes/solo/15.jpg",
  "./assets/memes/solo/16.jpg",
  "./assets/memes/solo/17.jpg",
  "./assets/memes/solo/18.jpg",
  "./assets/memes/solo/19.jpg",
  "./assets/memes/solo/20.jpg",
  "./assets/memes/solo/21.jpg",
  "./assets/memes/solo/22.jpg",
  "./assets/memes/solo/23.jpg",
  "./assets/memes/duo/01.jpg",
  "./assets/memes/duo/02.jpg",
  "./assets/memes/duo/03.jpg",
  "./assets/memes/duo/04.jpg",
  "./assets/memes/duo/05.jpg",
  "./assets/memes/duo/06.jpg",
  "./assets/memes/duo/07.jpg",
  "./assets/memes/duo/08.jpg",
  "./assets/memes/duo/09.jpg",
  "./assets/memes/duo/10.jpg",
  "./assets/memes/duo/11.jpg",
  "./assets/memes/duo/12.jpg",
  "./assets/memes/duo/13.jpg",
  "./assets/memes/duo/14.jpg",
  "./assets/memes/duo/15.jpg",
  "./assets/memes/duo/16.jpg",
  "./assets/memes/duo/17.jpg",
  "./assets/memes/duo/18.jpg",
  "./assets/memes/duo/19.jpg",
  "./assets/memes/duo/20.jpg",
  "./assets/stickers/fluent/billed_cap.png",
  "./assets/stickers/fluent/blossom.png",
  "./assets/stickers/fluent/cherry_blossom.png",
  "./assets/stickers/fluent/crown.png",
  "./assets/stickers/fluent/glasses.png",
  "./assets/stickers/fluent/graduation_cap.png",
  "./assets/stickers/fluent/hibiscus.png",
  "./assets/stickers/fluent/ribbon.png",
  "./assets/stickers/fluent/sunglasses.png",
  "./assets/stickers/fluent/top_hat.png",
  "./assets/stickers/fluent/womans_hat.png",
  "./assets/stickers/noto/butterfly-icon.png",
  "./assets/stickers/noto/butterfly.webp",
  "./assets/stickers/noto/dizzy-icon.png",
  "./assets/stickers/noto/dizzy.webp",
  "./assets/stickers/noto/fire-icon.png",
  "./assets/stickers/noto/fire.webp",
  "./assets/stickers/noto/glowing_star-icon.png",
  "./assets/stickers/noto/glowing_star.webp",
  "./assets/stickers/noto/party_popper-icon.png",
  "./assets/stickers/noto/party_popper.webp",
  "./assets/stickers/noto/red_heart-icon.png",
  "./assets/stickers/noto/red_heart.webp",
  "./assets/stickers/noto/sparkles-icon.png",
  "./assets/stickers/noto/sparkles.webp",
  "./assets/stickers/noto/sparkling_heart-icon.png",
  "./assets/stickers/noto/sparkling_heart.webp",
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
