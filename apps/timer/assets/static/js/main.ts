// Browser entry. esbuild bundles this (inlining ./timer) into a self-contained
// classic script with no exports, so it loads from a plain <script>. Keep it
// export-free and free of top-level await.

// Side-effect import: installs the replaceChildren shim for the older-browser
// degraded mode. Must stay first so the shim is in place before any render.
import '@screenly-labs/signage-kit/polyfills'
import { trackPlayer } from '@screenly-labs/signage-kit/analytics'
import { removeScreenlyBranding } from '@screenly-labs/signage-kit/branding'
import { detectPlayer } from '@screenly-labs/signage-kit/profiler'

import { computeState, pad2, parseTarget } from './timer'

// Shown when the page is opened with no settings (e.g. the store preview or a
// bare visit), so the clock is never blank and demonstrates the format. Real
// deployments carry the target in the launch URL's query string.
const EXAMPLE = 'title=New+Year&target=2027-01-01T00:00:00&tz=UTC&message=Happy+New+Year!'

const text = (id: string, value: string): void => {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}

// Reveal an element only when it has content; otherwise take it out of the flow.
const setLine = (id: string, value: string): void => {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = value
  el.hidden = value.length === 0
}

// Send a GA4 event via the gtag stub in index.html. Guarded so the app keeps
// working when Analytics is blocked, offline, or absent (common on signage).
type Gtag = (...args: unknown[]) => void
const track = (event: string, params: Record<string, unknown>): void => {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag
  if (typeof gtag === 'function') gtag('event', event, params)
}

// Human-readable target datetime for the sub-line, rendered in the chosen zone.
const formatTarget = (targetMs: number, tz: string): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: tz || undefined
    }).format(new Date(targetMs))
  } catch {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(
      new Date(targetMs)
    )
  }
}

const params = new URLSearchParams(window.location.search || `?${EXAMPLE}`)
const title = params.get('title')?.trim() || 'Countdown'
const tz = params.get('tz')?.trim() || ''
const message = params.get('message')?.trim() || ''
const targetMs = parseTarget(params.get('target') ?? '', tz)
// The formatted target is constant; only its "Until / Since" prefix changes when
// the clock crosses zero, so format it once and re-prefix each tick.
const targetLabel = targetMs === null ? '' : formatTarget(targetMs, tz)

document.title = title === 'Countdown' ? 'Timer' : `${title} | Timer`

// Paint one frame from the current clock. Returns nothing; it's called on a
// timer. When the target can't be parsed we show a dashed placeholder and stop.
const paint = (): void => {
  if (targetMs === null) {
    for (const id of ['days', 'hours', 'minutes', 'seconds']) text(id, '--')
    return
  }
  const { direction, parts, reached } = computeState(targetMs, Date.now())
  text('days', String(parts.days))
  text('hours', pad2(parts.hours))
  text('minutes', pad2(parts.minutes))
  text('seconds', pad2(parts.seconds))
  document.documentElement.dataset.direction = direction
  // The "days" field drops its label plural for exactly one day.
  text('days-label', parts.days === 1 ? 'Day' : 'Days')
  // Re-prefix the target line for the current direction.
  setLine('target-line', reached ? `Since ${targetLabel}` : `Until ${targetLabel}`)
  // Message only appears once the target has been reached (count-up).
  setLine('message', reached ? message : '')
}

// Align ticks to the wall-clock second so the seconds field flips crisply rather
// than drifting a few hundred ms after each interval.
const scheduleTick = (): void => {
  paint()
  const delay = 1000 - (Date.now() % 1000)
  window.setTimeout(scheduleTick, delay)
}

const render = (): void => {
  text('title', title)
  document.documentElement.dataset.state = targetMs === null ? 'invalid' : 'ready'
  if (targetMs === null) {
    setLine('target-line', 'Set a target date to start the timer.')
  } else {
    // Report once per load whether this timer is counting down to a future
    // target or up from a past one; the page reloads periodically, so each
    // load re-reports the current mode.
    const { direction } = computeState(targetMs, Date.now())
    track('timer_direction', { direction: direction === 'down' ? 'countdown' : 'countup' })
  }
  setLine('message', '')
  // paint() fills the target line and digits for a valid target and keeps them
  // ticking; for an invalid one it just shows the dashed placeholder.
  scheduleTick()
}

// How this screen is configured, for the telemetry. `direction` is the timer's whole
// point, so a census that says "1,200 BrightSigns" without it cannot tell a launch
// countdown from a "days since" board. `none` is its own value rather than an omission,
// so a screen deployed with no target at all is visible instead of missing.
const timerConfig = (): { direction: string } => {
  if (targetMs === null) return { direction: 'none' }
  return { direction: computeState(targetMs, Date.now()).direction === 'down' ? 'countdown' : 'countup' }
}

const init = (): void => {
  removeScreenlyBranding()
  // Report which player is showing this, and how it is set up. A static app can only
  // profile from the user agent and referrer; the Worker apps additionally read
  // X-Requested-With, the only signal that names an Android WebView vendor.
  trackPlayer(detectPlayer(), { app: 'timer', sendPageView: true,
    config: timerConfig() })
  render()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
