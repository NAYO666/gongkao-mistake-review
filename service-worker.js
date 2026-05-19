const CACHE_NAME = 'gkbk-v1';
const CACHE_FILES = [
  './index.html',
  './styles.css',
  './app.js',
  './icon.png'
];

// 安装：缓存所有文件
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

// 激活：清除旧版本缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// 拦截请求：优先用缓存，没有再联网
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        // 只缓存同源的成功请求
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }).catch(function() {
      // 离线且没有缓存时，返回主页
      return caches.match('./index.html');
    })
  );
});
