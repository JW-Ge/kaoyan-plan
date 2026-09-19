/* 警校考研全栈助手 Service Worker —— 离线缓存 + PWA 可安装 + 自动更新 */
var CACHE='kaoyan-v7';
var SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install',function(e){
  // 不立即接管：等用户确认更新，避免页面/SW 版本混用
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(SHELL.map(function(u){
        return c.add(u).catch(function(){});
      }));
    })
  );
});

self.addEventListener('message',function(e){
  if(e.data==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;

  // 页面：网络优先（保证每次打开尽量拿到最新版），离线回退缓存
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){c.put('./index.html',copy);});
        return res;
      }).catch(function(){return caches.match('./index.html');})
    );
    return;
  }

  // 其余静态资源：缓存优先，同时后台静默更新
  e.respondWith(
    caches.match(req,{ignoreSearch:true}).then(function(hit){
      var fetcher=fetch(req).then(function(res){
        if(res&&(res.ok||res.type==='opaque')){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){c.put(req,copy);});
        }
        return res;
      }).catch(function(){return hit;});
      return hit||fetcher;
    })
  );
});
