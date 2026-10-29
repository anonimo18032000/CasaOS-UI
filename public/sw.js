/* CasaOS service worker.
 *
 * Purpose: make the web UI installable as an app and keep its static files fast. It never touches
 * the API: anything under /v1 /v2 /v3 /doc, websockets and non-GET requests go straight to the network,
 * so it can't serve stale data or interfere with login and token refresh.
 *
 * Bump CACHE_VERSION to drop everything cached by an older worker.
 */
const CACHE_VERSION = 'v1'
const CACHE = `casaos-static-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'
const API_PREFIXES = ['/v1/', '/v2/', '/v3/', '/doc/', '/socket.io/']
const STATIC_PATTERN = /\.(?:js|css|woff2?|ttf|svg|png|jpe?g|gif|webp|ico|webmanifest)$/i

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then(keys => Promise.all(keys.filter(k => k.startsWith('casaos-static-') && k !== CACHE).map(k => caches.delete(k))))
			.then(() => self.clients.claim()),
	)
})

self.addEventListener('fetch', (event) => {
	const request = event.request
	if (request.method !== 'GET' || request.headers.has('range')) {
		return
	}
	const url = new URL(request.url)
	if (url.origin !== self.location.origin || API_PREFIXES.some(p => url.pathname.startsWith(p))) {
		return
	}

	// page loads: always try the network first (so a new UI version shows up at once);
	// only if the server is unreachable show the offline page
	if (request.mode === 'navigate') {
		event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
		return
	}

	// static files: answer from cache and refresh it in the background
	if (STATIC_PATTERN.test(url.pathname)) {
		event.respondWith(
			caches.open(CACHE).then(cache =>
				cache.match(request).then((cached) => {
					const network = fetch(request).then((response) => {
						if (response.ok && response.type === 'basic') {
							cache.put(request, response.clone())
						}
						return response
					}).catch(() => cached)
					return cached || network
				}),
			),
		)
	}
})
