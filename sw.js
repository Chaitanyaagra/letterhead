const C='mhm-letter-v1',R='mhm-letter-r1';
const PRE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-512-maskable.png','./apple-touch-icon-180.png','./apple-touch-icon-167.png','./apple-touch-icon-152.png','./apple-touch-icon-120.png'];
const CDN=['www.gstatic.com','cdnjs.cloudflare.com'];
const SKIP=['firestore.googleapis.com','firebase.googleapis.com','identitytoolkit.googleapis.com','securetoken.googleapis.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(PRE)).then(()=>self.skipWaiting()).catch(err=>{console.error('SW precache failed — offline mode may be incomplete until this is fixed:',err);}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!==R).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  // Never touch Firebase/Firestore/Auth traffic — this app's live multi-user
  // save/lock/approve workflow depends on real, un-cached network calls.
  if(SKIP.some(h=>url.hostname.includes(h))) return;
  if(CDN.some(h=>url.hostname.includes(h))){
    e.respondWith(caches.match(req).then(h=>h||fetch(req).then(r=>{caches.open(R).then(c=>c.put(req,r.clone())).catch(()=>{});return r;}).catch(()=>new Response('',{status:503}))));
    return;
  }
  if(url.origin===self.location.origin){
    // Stale-while-revalidate: an already-cached response is served
    // immediately (so the app opens instantly even on a weak signal),
    // while a fetch still goes out in the background to refresh the
    // cache for next time. Only a genuinely first-ever load (or a file
    // added to PRE since the last install) actually waits on the network.
    const network=fetch(req).then(r=>{caches.open(C).then(c=>c.put(req,r.clone())).catch(()=>{});return r;}).catch(()=>null);
    e.waitUntil(network);
    e.respondWith(caches.match(req).then(cached=>{
      if(cached) return cached;
      return network.then(r=>{
        if(r) return r;
        if(req.mode==='navigate'||req.destination==='document') return caches.match('./index.html');
        return new Response('',{status:504,statusText:'Offline and not cached'});
      });
    }));
  }
});
self.addEventListener('message',e=>{
  if(e.data?.type==='SKIP_WAITING') self.skipWaiting();
  if(e.data?.type==='CLEAR_CACHE') caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))));
});
