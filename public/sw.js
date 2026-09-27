self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Member and financial records are never stored in an offline cache.
self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>DLCF Buea</title></head><body style="font-family:Arial;padding:40px;color:#24295d"><h1>You are offline</h1><p>Connect to the internet to access your fellowship records.</p><button onclick="location.reload()">Try again</button></body></html>',{headers:{'Content-Type':'text/html'}})));}});
