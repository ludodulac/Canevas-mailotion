const CACHE='mailotion-studio-v2';
const CORE=['./','./index.html','./style.css','./app.js','./templates.json','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./assets/solea-summer.svg','./assets/aura-skincare.svg','./assets/noma-coffee.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const u=new URL(e.request.url);
 if(u.pathname.endsWith('/templates.json')){e.respondWith(fetch(e.request).then(r=>{if(r.ok){let copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put('./templates.json',copy)))}return r}).catch(()=>caches.match('./templates.json')));return}
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request).then(cached=>cached||caches.match('./'))));
});
