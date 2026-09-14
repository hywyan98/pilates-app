// 定義快取名稱與版本 (若未來有更新，可更改為 v2, v3 讓瀏覽器重新快取)
const CACHE_NAME = 'pilates-cache-v1';

// 預設需要快取的檔案清單
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // 快取 Tailwind CSS 的 CDN，確保離線時依然有樣式
  'https://cdn.tailwindcss.com'
];

// 1. 安裝階段 (Install) - 將指定的檔案加入快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 快取檔案中...');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 攔截請求階段 (Fetch) - 離線策略
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果在快取中找到匹配的檔案，就直接回傳快取 (離線可讀)
        if (response) {
          return response;
        }
        
        // 如果快取中沒有，則透過網路發送請求，並將新結果存入快取 (動態快取)
        return fetch(event.request).then(networkResponse => {
          // 檢查回應是否有效 (略過不支援跨域的無效回應)
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // 如果沒有網路，且找不到快取，可以在這裡設定 fallback
          console.log('[Service Worker] 處於離線狀態，無法取得資源。');
        });
      })
  );
});

// 3. 啟用階段 (Activate) - 清除舊版快取釋放空間
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});