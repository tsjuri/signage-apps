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
const EXAMPLE = 'name=Alex&message=Have+an+amazing+day!&from=The+Office'

// How many scraps of confetti to scatter. Old/weak devices (flagged html.legacy
// by the inline gate in index.html) get a lighter field, since the CSS also drops
// the fall animation there and a full 60-piece static scatter is just extra DOM.
const CONFETTI_COUNT = 60
const CONFETTI_COUNT_LEGACY = 24

// signage-apps: Motion (gentle | full | none) and Celebration (surprise |
// confetti | balloons | fireworks | all). Motion: None gets a still confetti
// scatter only.
const query = new URLSearchParams(window.location.search)
const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback
const MOTION = pick(query.get('motion'), ['gentle', 'full', 'none'] as const, 'gentle')
// The Motion setting decides, not the kit's "weak device" guess (any player with
// 2 GB or 2 cores, which includes the Compute Sticks that run this fine on Gentle).
if (MOTION !== 'none') document.documentElement.classList.remove('legacy')
const STILL = (): boolean => MOTION === 'none'
const CELEBRATIONS = ['confetti', 'balloons', 'fireworks', 'all'] as const
const chosen = pick(query.get('celebration'), [...CELEBRATIONS, 'surprise'] as const, 'surprise')
const CELEBRATION =
  chosen === 'surprise' ? CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)] : chosen
const FULL = MOTION === 'full'

const confettiCount = (): number =>
  document.documentElement.classList.contains('legacy')
    ? CONFETTI_COUNT_LEGACY
    : FULL ? CONFETTI_COUNT : 36

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

  showNames(config.names)
  setLine('message', config.message)
  setLine('from', formatSignature(config.from))

  document.title = config.name ? `Happy Birthday, ${config.name}!` : 'Happy Birthday!'

  document.documentElement.classList.add(`motion-${STILL() ? 'none' : MOTION}`)
  const all = CELEBRATION === 'all'
  if (STILL() || all || CELEBRATION === 'confetti') scatterConfetti()
  if (!STILL() && (all || CELEBRATION === 'balloons')) releaseBalloons(all)
  if (!STILL() && (all || CELEBRATION === 'fireworks')) startFireworks(all)
  document.documentElement.dataset.state = 'ready'
}

// The greeting, with one name at a time when there are several: the name
// scrolls up and the next one comes in from below. The asset's duration is
// shared out so each name is shown once. A page can't ask the player for that
// duration, so it's measured: how long this page was on screen last time (from
// load until the player moved on). The very first showing uses 3.5 s a name.
const LOADED_AT = Date.now()
const DUR_KEY = 'birthday:duration'
const rememberDuration = (): void => {
  const s = (Date.now() - LOADED_AT) / 1000
  if (s >= 3 && s <= 900) {
    try {
      localStorage.setItem(DUR_KEY, String(Math.round(s * 10) / 10))
    } catch {}
  }
}
window.addEventListener('pagehide', rememberDuration)
window.addEventListener('beforeunload', rememberDuration)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) rememberDuration()
})
const nameSeconds = (count: number): number => {
  let measured = 0
  try {
    measured = Number(localStorage.getItem(DUR_KEY)) || 0
  } catch {}
  if (measured < 3) return 3.5
  return Math.max(2, (measured - 0.5) / count) // never faster than 2 s a name
}
const showNames = (names: string[]): void => {
  const h = document.getElementById('greeting')
  if (!h) return
  if (names.length < 2) {
    h.textContent = formatGreeting(names[0] ?? '')
    return
  }
  const lead = document.createElement('span')
  lead.className = 'greeting__lead'
  lead.textContent = 'Happy Birthday,'
  const box = document.createElement('span')
  box.className = 'names'
  const make = (n: string): HTMLSpanElement => {
    const el = document.createElement('span')
    el.className = 'names__one'
    el.textContent = `${n}!`
    return el
  }
  // The box is as wide as the longest name, so the line doesn't jump about.
  const sizer = make(names.reduce((a, b) => (b.length > a.length ? b : a)))
  sizer.classList.add('names__sizer')
  let i = 0
  let current = make(names[0])
  current.classList.add('is-in')
  box.replaceChildren(sizer, current)
  h.replaceChildren(lead, document.createTextNode(' '), box)
  // One after the other, never both at once: the name slides up and out, then
  // the next one slides up into its place.
  const OUT_MS = 450
  window.setInterval(() => {
    i = (i + 1) % names.length
    const old = current
    old.classList.remove('is-in')
    old.classList.add('is-out')
    const next = make(names[i])
    current = next
    window.setTimeout(() => {
      old.remove()
      box.appendChild(next)
      // next frame, so the browser sees the start position first
      window.setTimeout(() => next.classList.add('is-in'), 30)
    }, OUT_MS)
  }, nameSeconds(names.length) * 1000)
}

const COLORS = ['#f6c453', '#ff6b9d', '#6ad3c9', '#ff8c66', '#c8a2ff', '#7fb4ff']

// Balloons drifting up past the card, each with its own colour, size, speed and
// sway. Negative delays fill the screen from the first frame.
const releaseBalloons = (withOthers: boolean): void => {
  const fx = document.getElementById('fx')
  if (!fx) return
  const count = (FULL ? 12 : 8) - (withOthers ? 3 : 0)
  for (let k = 0; k < count; k++) {
    const b = document.createElement('span')
    b.className = 'balloon'
    const dur = 11 + Math.random() * 7
    // keep to the sides, clear of the greeting in the middle
    const lane = (k + Math.random() * 0.8) / count
    b.style.setProperty('--left', `${lane < 0.5 ? lane * 2 * 26 + 1 : 73 + (lane - 0.5) * 2 * 24}%`)
    b.style.setProperty('--dur', `${dur}s`)
    b.style.setProperty('--delay', `${-Math.random() * dur}s`)
    b.style.setProperty('--size', `${0.8 + Math.random() * 0.6}`)
    b.style.setProperty('--sway', `${(Math.random() * 2 - 1) * 4}vw`)
    b.style.setProperty('--color', COLORS[k % COLORS.length])
    fx.appendChild(b)
  }
}

// Firework bursts popping now and then, away from the middle where the card is.
const startFireworks = (withOthers: boolean): void => {
  const fx = document.getElementById('fx')
  if (!fx) return
  const sparks = FULL ? 20 : 14
  const burst = (): void => {
    const side = Math.random() < 0.5
    const x = side ? 6 + Math.random() * 24 : 70 + Math.random() * 24
    const y = 10 + Math.random() * 45
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const g = document.createElement('span')
    g.className = 'firework'
    g.style.left = `${x}%`
    g.style.top = `${y}%`
    const color2 = COLORS[Math.floor(Math.random() * COLORS.length)]
    const reach = 15 + Math.random() * 8
    // two rings of streaks, pointing outward: a big one and a smaller, offset one
    for (const [ring, n, c] of [[1, sparks, color], [0.55, Math.round(sparks * 0.6), color2]] as const) {
      for (let k = 0; k < n; k++) {
        const s = document.createElement('i')
        const a = (k / n) * Math.PI * 2 + (ring < 1 ? Math.PI / n : 0)
        s.style.setProperty('--dx', `${Math.cos(a) * reach * ring}vmin`)
        s.style.setProperty('--dy', `${Math.sin(a) * reach * ring}vmin`)
        s.style.setProperty('--angle', `${(a * 180) / Math.PI + 90}deg`)
        s.style.setProperty('--color', c)
        g.appendChild(s)
      }
    }
    const flash = document.createElement('b')
    flash.style.setProperty('--color', color)
    g.appendChild(flash)
    fx.appendChild(g)
    window.setTimeout(() => g.remove(), 1800)
  }
  burst()
  window.setTimeout(burst, 500)
  window.setInterval(burst, (FULL ? 900 : 1400) + (withOthers ? 600 : 0))
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
