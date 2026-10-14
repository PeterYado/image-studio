/* Mosaic Studio - service worker (M1)
   앱 셸을 캐싱해 오프라인 동작을 지원한다.
   화질업 AI 모델(ONNX)은 페이지가 MODEL_CACHE에 별도로 캐싱한다. */

const CACHE = 'image-studio-v28';
const MODEL_CACHE = 'image-studio-models';  // 페이지가 직접 관리하는 ONNX 모델용 (업데이트 시에도 유지)
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(() => {})           // 일부 자산 누락 시에도 설치 진행
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== MODEL_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).pathname.endsWith('.onnx')) return;  // 모델은 페이지 측에서 캐싱한다

  // 폰트 등 외부 origin: 네트워크 우선, 실패 시 캐시
  if (new URL(req.url).origin !== self.location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 동일 origin(앱 셸): 캐시 우선, 없으면 네트워크
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
