const CACHE="qrajn-v6-static-1";
const CORE=["/","/styles.css","/v6-platform.css","/app.js","/v6-platform.js","/v6-media.js","/assets/qr-ajn-logo.svg","/manifest.webmanifest"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const r=event.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return;
  if(u.pathname.startsWith("/api/")||u.pathname.startsWith("/r/")||u.pathname.startsWith("/b/")||u.pathname==="/sitemap.xml")return;
  event.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(resp=>{if(resp.ok&&["style","script","image","font","manifest"].includes(r.destination)){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(r,copy));}return resp;}).catch(()=>cached)));
});
