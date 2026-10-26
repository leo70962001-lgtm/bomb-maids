// BOMB MAIDS offline cache (written by tools/build-site.js — do not edit)
const CACHE = 'bomb-maids-e234a80c1947';
const CORE = ["./","img/emo-berry-anger.webp","img/emo-berry-fun.webp","img/emo-berry-joy.webp","img/emo-berry-sorrow.webp","img/emo-honey-anger.webp","img/emo-honey-fun.webp","img/emo-honey-joy.webp","img/emo-honey-sorrow.webp","img/emo-yoru-anger.webp","img/emo-yoru-fun.webp","img/emo-yoru-joy.webp","img/emo-yoru-sorrow.webp","img/emo-yukino-anger.webp","img/emo-yukino-fun.webp","img/emo-yukino-joy.webp","img/emo-yukino-sorrow.webp","img/ex-berry-cheer.webp","img/ex-berry-cry.webp","img/ex-berry-excited.webp","img/ex-berry-giggle.webp","img/ex-berry-overjoy.webp","img/ex-berry-panic.webp","img/ex-berry-peace.webp","img/ex-berry-proud.webp","img/ex-berry-rage.webp","img/ex-berry-smug.webp","img/ex-berry-tender.webp","img/ex-berry-wonder.webp","img/ex-honey-cheer.webp","img/ex-honey-confused.webp","img/ex-honey-content.webp","img/ex-honey-dreamy.webp","img/ex-honey-fluster.webp","img/ex-honey-gift.webp","img/ex-honey-nervous.webp","img/ex-honey-panic.webp","img/ex-honey-pout.webp","img/ex-honey-shy.webp","img/ex-honey-wonder.webp","img/ex-honey-worry.webp","img/ex-yoru-calm.webp","img/ex-yoru-content.webp","img/ex-yoru-cry.webp","img/ex-yoru-disgust.webp","img/ex-yoru-pout.webp","img/ex-yoru-rage.webp","img/ex-yoru-serve.webp","img/ex-yoru-shy.webp","img/ex-yoru-surprise.webp","img/ex-yoru-sweat.webp","img/ex-yoru-tender.webp","img/ex-yoru-wonder.webp","img/ex-yukino-angry.webp","img/ex-yukino-arrogant.webp","img/ex-yukino-confident.webp","img/ex-yukino-excited.webp","img/ex-yukino-sad.webp","img/ex-yukino-seduce.webp","img/ex-yukino-serious.webp","img/ex-yukino-shy.webp","img/ex-yukino-surprise.webp","img/ex-yukino-tease.webp","img/ex-yukino-tender.webp","img/ex-yukino-tired.webp","img/icon-192.png","img/icon-512.png","img/maids-cg2.jpg","img/op-1.webp","img/op-2.webp","img/op-3.webp","img/op-4.webp","img/stand-berry.webp","img/stand-honey.webp","img/stand-yoru.webp","img/stand-yukino.webp","index.html","js/anim-data.js","js/art.js","js/data.js","js/engine.js","js/game.js","js/i18n.js","js/lang-data.js","js/lang-ui.js","js/main.js","js/pixel.js","js/room.js","js/scenes.js","manifest.webmanifest"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('bomb-maids-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // the page itself: the network when there is one (so a new build shows up), the cache when offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
