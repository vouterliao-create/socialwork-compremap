// 社工個案管理系統 - Service Worker
// 用途：快取「網頁本身」讓已安裝的 App 離線也能打開；
// 地圖圖層與 Google Maps 仍需要網路連線才能顯示。

const CACHE_NAME = 'casemap-app-v3';
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

  // 「網路優先」：有網路時一律先向伺服器要最新版本（並同步更新快取），
  // 只有在真正離線、抓不到網路時，才退回使用快取裡的舊版本。
  // 這樣每次重新整理都會自動拿到最新版，不用再清快取或開無痕視窗；
  // 離線時仍然能打開 App（快取備援），不影響原本的離線閱覽功能。
  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request))
  );
});
