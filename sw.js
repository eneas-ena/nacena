// NaCena — service worker
// Prefixo próprio "nacena-": os apps do Bispo dividem o mesmo endereço (eneas-ena.github.io)
// e um não pode apagar o cache do outro.
const VERSAO = '0.2.0';
const CACHE = 'nacena-v' + VERSAO;
const ARQUIVOS = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'mammoth.browser.min.js'];

self.addEventListener('install', e => {
  // cache: 'reload' = baixa da internet, sem aproveitar cópia antiga (lição do iPad)
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ARQUIVOS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('nacena-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // conferência de versão: nunca guardar nem responder do cache
  if (url.searchParams.has('nc')) return;
  // fontes do Google: guarda para funcionar sem internet
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith(caches.open(CACHE).then(async c => {
      const salvo = await c.match(req);
      const rede = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => salvo);
      return salvo || rede;
    }));
    return;
  }
  // só cuida dos arquivos deste app
  if (!req.url.startsWith(self.registration.scope)) return;
  // primeiro a internet (para pegar a versão nova); sem internet, a cópia guardada
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await fetch(req, { cache: 'no-cache' });
      if (r && r.ok && url.search === '') c.put(req, r.clone());
      return r;
    } catch {
      return (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
    }
  })());
});
