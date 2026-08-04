/* DentPilot Student — Service Worker (تحديث آمن مُتحكَّم به) */
const CACHE = 'dentpilot-student-v1.19.1';
const ASSETS = [
  './', 'index.html', 'case-sheet-print.html', 'style.css', 'script.js', 'activation.js', 'manifest.json', 'version.json',
  'firebase-config.js', 'firebase-auth.js', 'firebase-sync.js', 'account-ui.js',
  'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png', 'favicon.ico', 'favicon-32.png',
  'dental-chair.png', 'genius-endo-p1.jpg', 'genius-endo-p2.jpg', 'genius-oralsurg-p1.jpg', 'genius-oralsurg-p2.jpg'
];

// التثبيت: تخزين مسبق — بلا skipWaiting تلقائي (ينتظر موافقة المستخدم عبر «تحديث الآن»)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => {
      return Promise.all(
        ASSETS.map(url => {
          return fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + new Date().getTime())
            .then(res => {
              if (res.ok) return c.put(url, res);
            })
            .catch(err => console.log('SW cache error:', url, err));
        })
      );
    })
  );
});

// التفعيل: حذف الكاش القديم + السيطرة الفورية على الصفحات
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// رسالة من الصفحة لتفعيل التحديث المنتظر
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // version.json: الشبكة أولاً (لكشف التحديثات بدقة)، مع رجوع للكاش دون اتصال
  if (url.pathname.endsWith('version.json')) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // بقية الملفات: الكاش أولاً
  e.respondWith(
    caches.match(req).then((c) => c || fetch(req).then((res) => {
      if (url.origin === self.location.origin) { const cp = res.clone(); caches.open(CACHE).then((ch) => ch.put(req, cp)); }
      return res;
    }).catch(() => { if (req.mode === 'navigate') return caches.match('index.html'); }))
  );
});
