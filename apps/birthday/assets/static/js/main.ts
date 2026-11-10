// Browser entry. esbuild bundles this (inlining ./birthday) into a self-contained
// classic IIFE with no exports, so it loads from a plain <script>. Keep it
// export-free and free of top-level await.

// Side-effect import: installs the replaceChildren shim for the older-browser
// degraded mode (shared across all apps). Must stay first.
import '@screenly-labs/signage-kit/polyfills'
import { trackPlayer } from '@screenly-labs/signage-kit/analytics'
import { removeScreenlyBranding } from '@screenly-labs/signage-kit/branding'
import { detectPlayer } from '@screenly-labs/signage-kit/profiler'
import {
  buildConfetti,
  type ConfettiPiece,
  formatGreeting,
  formatSignature,
  parseConfig
} from './birthday'

// Shown when the page is opened with no settings (e.g. the store preview or a
// bare visit), so the card is never blank and demonstrates the format. Real
// deployments carry the celebration in the launch URL's query string.
const EXAMPLE = 'name=Alex&message=Have+an+amazing+day!&from=The+Screenly+Team'

// How many scraps of confetti to scatter. Old/weak devices (flagged html.legacy
// by the inline gate in index.html) get a lighter field, since the CSS also drops
// the fall animation there and a full 60-piece static scatter is just extra DOM.
const CONFETTI_COUNT = 60
const CONFETTI_COUNT_LEGACY = 24

const confettiCount = (): number =>
  document.documentElement.classList.contains('legacy')
    ? CONFETTI_COUNT_LEGACY
    : CONFETTI_COUNT

const text = (id: string, value: string): void => {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}

// Reveal an element only when it has content; otherwise take it out of the flow
// so an absent message/signature doesn't leave a gap.
const setLine = (id: string, value: string): void => {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = value
  el.hidden = value.length === 0
}

const render = (params: URLSearchParams): void => {
  const config = parseConfig(params)

  const greeting = formatGreeting(config.name)
  text('greeting', greeting)
  setLine('message', config.message)
  setLine('from', formatSignature(config.from))

  document.title = config.name ? `Happy Birthday, ${config.name}!` : 'Happy Birthday!'

  scatterConfetti()
  document.documentElement.dataset.state = 'ready'
}

// Build the confetti DOM from the pure layout helper, handing each scrap its
// geometry via custom properties the stylesheet animates.
const scatterConfetti = (): void => {
  const field = document.getElementById('confetti')
  if (!field) return
  const pieces = buildConfetti(confettiCount())
  const nodes = pieces.map((piece: ConfettiPiece) => {
    const el = document.createElement('span')
    el.className = piece.round ? 'confetti__bit confetti__bit--round' : 'confetti__bit'
    el.style.setProperty('--left', `${piece.left * 100}%`)
    el.style.setProperty('--top', `${piece.top * 100}%`)
    el.style.setProperty('--delay', `${piece.delay}s`)
    el.style.setProperty('--duration', `${piece.duration}s`)
    el.style.setProperty('--drift', `${piece.drift * 12}vw`)
    el.style.setProperty('--rotate', `${piece.rotate}deg`)
    el.style.setProperty('--size', `${piece.size}`)
    // Colour is a reference to a palette token defined in the stylesheet.
    el.style.setProperty('--bit-color', `var(--confetti-${piece.hue})`)
    return el
  })
  field.replaceChildren(...nodes)
}

const init = (): void => {
  removeScreenlyBranding()
  // Report which player is showing this, and whether the screen was actually set up.
  // An empty query string means it is still showing the built-in EXAMPLE, which is the
  // difference between a deployed screen and one nobody has configured yet.
  trackPlayer(detectPlayer(), {
    app: 'birthday',
    sendPageView: true,
    config: { configured: window.location.search ? 1 : 0 }
  })
  render(new URLSearchParams(window.location.search || `?${EXAMPLE}`))
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
