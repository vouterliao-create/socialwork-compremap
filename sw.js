// 社工個案管理系統 - Service Worker
// 用途：快取「網頁本身」讓已安裝的 App 離線也能打開；
// 地圖圖層與 Google Maps 仍需要網路連線才能顯示。

const CACHE_NAME = 'casemap-app-v2';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 只快取「同網域」的請求（App 本身的檔案）。
  // 地圖圖磚、字型、Leaflet 等外部資源一律直接走網路，不快取、不攔截，
  // 避免離線時顯示錯誤或過期的地圖畫面。
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
