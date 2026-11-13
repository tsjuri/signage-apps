/* Offline cache for the signage apps (one service worker for the whole site).
 *
 * Every file an app loads from this site is stored on the player. When the site
 * can be reached, the fresh copy is used (and stored again); when it can't
 * (internet or GitHub down), the stored copy is used instead, so the screen
 * keeps showing the app with the last data it had.
 *
 * Other sites (Google calendar/sheet feeds) are left alone: the apps keep
 * their own last copy of that data.
 */
const CACHE = 'signage-apps-v1'
const TIMEOUT_MS = 6000 // after this, use the stored copy instead of waiting

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  e.respondWith(networkFirst(req))
})

async function networkFirst(req) {
  const cache = await caches.open(CACHE)
  try {
    const res = await withTimeout(fetch(req), TIMEOUT_MS)
    if (res && res.ok) cache.put(req, res.clone())
    return res
  } catch (err) {
    // Same file first; for a page, any stored copy of it (the settings in the
    // address may differ a little, e.g. after editing the asset).
    const hit = (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }))
    if (hit) return hit
    throw err
  }
}

function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then((r) => { clearTimeout(t); resolve(r) }, (e) => { clearTimeout(t); reject(e) })
  })
}

// A page that has just started using the cache asks for its own files to be
// stored right away (they loaded before the cache was in charge).
self.addEventListener('message', (e) => {
  const urls = (e.data && e.data.store) || []
  e.waitUntil(caches.open(CACHE).then((cache) =>
    Promise.all(urls.filter((u) => new URL(u).origin === self.location.origin).map((u) =>
      fetch(u).then((r) => (r.ok ? cache.put(u, r) : null)).catch(() => null)))))
})
