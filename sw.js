/* Mi Día — service worker: network-first para el shell, con caché de respaldo
   para funcionar offline (los datos por-widget viven en localStorage). */
const CACHE = "midia-v7";
const SHELL = [
  ".", "index.html", "manifest.json", "icon.svg",
  "css/styles.css",
  "js/config.js", "js/core.js", "js/google.js", "js/app.js",
  "js/widgets/hero.js", "js/widgets/finanzas.js", "js/widgets/inversiones.js",
  "js/widgets/kratos.js", "js/widgets/salud.js", "js/widgets/agenda.js", "js/widgets/correo.js",
  "js/widgets/tareas.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"
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
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Datos (Supabase, Open-Meteo, Google) siempre van a la red, sin caché del SW.
  if (url.hostname.endsWith("supabase.co") || url.hostname.includes("open-meteo") ||
      url.hostname.includes("googleapis") || url.hostname.includes("accounts.google")) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
