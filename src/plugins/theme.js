// Light / dark / automatic theme and the accent colour.
//
// The choice lives in localStorage (it is a per-browser preference) and is applied as
// <html data-theme="light|dark"> plus the --accent CSS variable; the rules that react to them are in
// assets/scss/common/_theme.scss. "auto" follows the operating system and switches live.

const THEME_KEY = 'casaos_theme'
const ACCENT_KEY = 'casaos_accent'

export const THEMES = ['auto', 'light', 'dark']
// the stock CasaOS blue ($casablue); while it is selected no accent override is applied at all
export const DEFAULT_ACCENT = '#2074f3'
export const ACCENTS = ['#2074f3', '#7c4dff', '#00a37a', '#e8590c', '#d6336c']

const read = (key) => {
	try {
		return localStorage.getItem(key)
	}
	catch (e) {
		return null // private mode / blocked storage: just don't remember anything
	}
}

const write = (key, value) => {
	try {
		localStorage.setItem(key, value)
	}
	catch (e) { /* not remembered */ }
}

export function getTheme() {
	const stored = read(THEME_KEY)
	return THEMES.includes(stored) ? stored : 'auto'
}

export function getAccent() {
	const stored = read(ACCENT_KEY)
	return /^#[0-9a-f]{6}$/i.test(stored || '') ? stored : DEFAULT_ACCENT
}

const systemPrefersDark = () =>
	typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

export function resolveTheme(mode = getTheme()) {
	return mode === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode
}

export function applyTheme() {
	const root = document.documentElement
	const resolved = resolveTheme()
	root.setAttribute('data-theme', resolved)
	const accent = getAccent()
	root.style.setProperty('--accent', accent)
	if (accent.toLowerCase() === DEFAULT_ACCENT) {
		root.removeAttribute('data-accent')
	}
	else {
		root.setAttribute('data-accent', 'custom')
	}

	// colour of the browser / installed-app title bar
	const meta = document.querySelector('meta[name="theme-color"]')
	if (meta) {
		meta.setAttribute('content', resolved === 'dark' ? '#1e1f24' : '#ffffff')
	}
}

export function setTheme(mode) {
	write(THEME_KEY, THEMES.includes(mode) ? mode : 'auto')
	applyTheme()
}

export function setAccent(color) {
	write(ACCENT_KEY, color)
	applyTheme()
}

export function initTheme() {
	applyTheme()
	if (window.matchMedia) {
		const query = window.matchMedia('(prefers-color-scheme: dark)')
		const onChange = () => {
			if (getTheme() === 'auto') {
				applyTheme()
			}
		}
		// Safari < 14 only has the deprecated addListener
		query.addEventListener ? query.addEventListener('change', onChange) : query.addListener(onChange)
	}
}
