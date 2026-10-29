// Installable web app: registers the service worker (public/sw.js) and keeps the browser's
// "install" prompt so Settings can offer an Install button instead of relying on the address bar.
//
// Service workers only exist on secure origins (https, or localhost), so over plain http this does
// nothing - one more reason to turn HTTPS on in Settings.

let deferredPrompt = null
const listeners = new Set()

const notify = () => listeners.forEach(fn => fn(canInstall()))

export function canInstall() {
	return deferredPrompt !== null
}

// is the UI already running as an installed app?
export function isInstalled() {
	return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true
}

export function onInstallAvailabilityChange(fn) {
	listeners.add(fn)
	return () => listeners.delete(fn)
}

export async function promptInstall() {
	if (!deferredPrompt) {
		return false
	}
	const prompt = deferredPrompt
	deferredPrompt = null // a prompt can be used once
	notify()
	prompt.prompt()
	const choice = await prompt.userChoice
	return choice.outcome === 'accepted'
}

export function registerPwa() {
	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault()
		deferredPrompt = event
		notify()
	})
	window.addEventListener('appinstalled', () => {
		deferredPrompt = null
		notify()
	})

	// not on the dev server (this project marks it with NODE_ENV=dev, see main.js): hot reload fights
	// with a caching worker
	if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'dev') {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('/sw.js').catch((err) => {
				console.warn('service worker not registered', err)
			})
		})
	}
}
