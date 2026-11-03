const V = "azras-welt-fccefa732dc8", SCHALE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "state.js", "skills.js", "lernen.js", "bild.js", "woche.js", "aufgaben.js", "arten.js", "tag.js", "inhalt.js", "lesen.js", "buecher.js", "gehen.js", "jahr.js", "geschichten.js", "welt.js", "spiel.js", "regal.js", "spiele.js", "kochen.js", "katze.js", "einrichten.js", "malen.js", "puppenhaus.js", "eltern.js", "main.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.addAll(SCHALE)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(n => {
    if(n.ok || n.type === "opaque"){ const k = n.clone(); caches.open(V).then(c => c.put(e.request, k)); }
    return n;
  })));
});
