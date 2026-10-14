// Service worker: permite que la app abra sin internet.
// Si cambias index.html y no ves los cambios en el celular, sube el número de VERSION.
const VERSION = "v1";
const SHELL = "app-" + VERSION;
const CANCIONES = "canciones-v1";
const ARCHIVOS = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith("app-") && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.headers.has("range")) return; // el audio en streaming lo maneja el navegador

  e.respondWith((async () => {
    // 1) Canciones descargadas
    const guardada = await caches.match(req, { cacheName: CANCIONES });
    if (guardada) return guardada;
    // 2) Red primero (para ver siempre la última versión) y copia de respaldo
    try {
      const r = await fetch(req);
      if (r.ok && !/\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(url.pathname)) {
        const c = await caches.open(SHELL);
        c.put(req, r.clone());
      }
      return r;
    } catch (err) {
      const r = await caches.match(req);
      if (r) return r;
      if (req.mode === "navigate") { const i = await caches.match("index.html"); if (i) return i; }
      throw err;
    }
  })());
});
