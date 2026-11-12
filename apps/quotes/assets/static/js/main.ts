// Browser entry. esbuild bundles this (inlining ./quotes) into a self-contained
// classic script with no exports, so it loads from a plain <script>. Keep it
// export-free and free of top-level await.

// Side-effect import: installs the replaceChildren shim for the older-browser
// degraded mode. Must stay first so the shim is in place before any render.
import '@screenly-labs/signage-kit/polyfills'
import { trackPlayer } from '@screenly-labs/signage-kit/analytics'
import { removeScreenlyBranding } from '@screenly-labs/signage-kit/branding'
import { detectPlayer } from '@screenly-labs/signage-kit/profiler'
import { csvUrl, isQuote, pickRandomIndex, type Quote, readSheet } from './quotes'

// Shown if the quotes file can't be fetched or is empty, so the screen is never
// blank on signage with flaky connectivity.
const FALLBACK: Quote = {
  text: 'The best way to predict the future is to create it.',
  author: 'Peter Drucker'
}

const DATA_URL = '/static/data/quotes.json'

// Settings: sheet = the school's Quotes tab (Publish to web link, CSV);
// ours=1 = only the school's quotes. Mixed, a school quote is picked half the
// time, so a short list isn't drowned out by the built-in set.
const params = new URLSearchParams(window.location.search)
const SHEET = (params.get('sheet') || '').trim()
const OURS = /^(1|true|yes)$/i.test((params.get('ours') || '').trim())
const SHEET_KEY = `quotes:sheet:${SHEET}`

const render = (quote: Quote): void => {
  const textEl = document.getElementById('quote-text')
  const authorEl = document.getElementById('quote-author')
  if (textEl) textEl.textContent = quote.text
  if (authorEl) authorEl.textContent = quote.author
  const byEl = document.querySelector<HTMLElement>('.quote__by')
  if (byEl) byEl.hidden = !quote.author
  document.documentElement.dataset.state = 'ready'
}

// The school's quotes: fresh from the sheet when it answers within a few
// seconds, otherwise the last copy that loaded.
const loadSheet = async (): Promise<Quote[]> => {
  if (!SHEET) return []
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(csvUrl(SHEET), { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const parsed = readSheet(text)
    if (!parsed) throw new Error('not a quotes sheet')
    try {
      localStorage.setItem(SHEET_KEY, text)
    } catch {}
    return parsed
  } catch (error) {
    console.error('Quotes: sheet not loaded —', error)
    try {
      const cached = localStorage.getItem(SHEET_KEY)
      if (cached) return readSheet(cached) || []
    } catch {}
    return []
  }
}

const loadQuote = async (): Promise<Quote> => {
  const ours = await loadSheet()
  if (ours.length && (OURS || Math.random() < 0.5)) return ours[pickRandomIndex(ours.length)]
  try {
    // no-cache: revalidate so a redeploy's new quotes aren't masked by a stale
    // cached copy, while still working offline from cache when unreachable.
    const res = await fetch(DATA_URL, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: unknown = await res.json()
    const quotes = Array.isArray(data) ? data.filter(isQuote) : []
    if (quotes.length === 0) throw new Error('no valid quotes in payload')
    return quotes[pickRandomIndex(quotes.length)]
  } catch (error) {
    console.error('Quotes: using fallback —', error)
    return FALLBACK
  }
}

const init = (): void => {
  removeScreenlyBranding()
  // Report which player is showing this. A static app can only profile from the
  // user agent and referrer; the Worker apps additionally read X-Requested-With,
  // the only signal that names an Android WebView vendor.
  trackPlayer(detectPlayer(), { app: 'quotes', sendPageView: true })
  loadQuote().then(render)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
