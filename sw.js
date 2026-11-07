/* Mis Apps — service worker.
   Desde 2026-11-07: «caché primero y actualizar en segundo plano» (stale-while-revalidate)
   para el shell: abre al instante aunque la señal sea mala, y la versión nueva queda lista
   para la próxima apertura. Los datos de cada widget viven en localStorage y siempre van a la red. */
const CACHE = "misapps-swr-20261107";
const SHELL = [
  ".", "index.html", "manifest.json", "icon-192.png", "icon-512.png",
  "css/styles.css", "icons/finanzas.png", "icons/inversiones.png", "icons/kratos.png", "icons/salud.png", "icons/viajes.png", "icons/calculadora.png",
  "vendor/supabase-2.118.0.js",
  "js/config.js", "js/core.js", "js/google.js", "js/app.js",
  "js/widgets/hero.js", "js/widgets/finanzas.js", "js/widgets/inversiones.js",
  "js/widgets/kratos.js", "js/widgets/salud.js", "js/widgets/viajes.js", "js/widgets/agenda.js", "js/widgets/correo.js",
  "js/widgets/tareas.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Solo el shell propio pasa por la caché; Supabase, Google, clima y fuentes van directo a la red.
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const guardada = await cache.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request, { cache: "no-store" }).then(r => {
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    }).catch(() => null);
    if (guardada) { e.waitUntil(red); return guardada; }
    return (await red) || (await cache.match("index.html")) || Response.error();
  }));
});
