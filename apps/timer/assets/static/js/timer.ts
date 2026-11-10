// Pure, framework-free helpers for the timer app. Kept separate from main.ts so
// they can be unit-tested with `bun:test`; main.ts is the (untestable, no-exports)
// browser entry that wires these into the DOM and ticks the clock.
//
// The app takes no dataset; a single timer is described entirely by the launch
// URL's query string (see .well-known/signage-app.json): a target instant, plus
// an optional title, time zone, and message. Direction is automatic: a future
// target counts down; once it passes (or a past target) it counts up the elapsed
// time.

export type Direction = 'down' | 'up'

export type Parts = { days: number; hours: number; minutes: number; seconds: number }

export type TimerState = {
  direction: Direction
  parts: Parts
  reached: boolean // true once now is at or past the target
}

// Zero-pad to two digits for the hours/minutes/seconds fields.
export const pad2 = (n: number): string => String(Math.max(0, Math.floor(n))).padStart(2, '0')

// Break a non-negative millisecond span into whole day/hour/minute/second parts.
// Negative input is clamped to zero so the display never shows a minus sign.
export const splitDuration = (ms: number): Parts => {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60
  }
}

// The live state for a given target and "now" (both epoch ms). Before the target
// it counts down; at or after it, it counts up. `reached` flips exactly at zero.
export const computeState = (targetMs: number, nowMs: number): TimerState => {
  const diff = targetMs - nowMs
  return {
    direction: diff > 0 ? 'down' : 'up',
    parts: splitDuration(Math.abs(diff)),
    reached: diff <= 0
  }
}

// The offset, in ms, of a named IANA time zone at a given instant, i.e. how far
// that zone's wall-clock is ahead of UTC (e.g. +3600000 for CET in winter). Uses
// the Intl tz database, which is always available, so results don't depend on the
// host's local zone. Returns 0 for an unknown/empty zone (treated as UTC).
export const tzOffsetMs = (instant: number, tz: string): number => {
  if (!tz) return 0
  let parts: Intl.DateTimeFormatPart[]
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    parts = dtf.formatToParts(new Date(instant))
  } catch {
    return 0 // invalid zone → fall back to UTC
  }
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  )
  return asUtc - instant
}

// Matches an ISO-8601 date, optionally with a time and an explicit offset
// (`Z` or `±HH:MM`). Date-only defaults to midnight.
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/

// Resolve a target string to an epoch-ms instant, or null if unparseable.
//   - With an explicit offset (…Z / …+02:00), that offset wins and `tz` is ignored.
//   - Without one, the wall-clock time is interpreted in `tz` (or UTC if blank).
// The two-pass tz resolution corrects the offset across DST boundaries.
export const parseTarget = (raw: string, tz = ''): number | null => {
  const value = raw.trim()
  if (!value) return null
  const m = ISO.exec(value)
  if (!m) return null

  const [, y, mo, d, h = '0', mi = '0', s = '0', offset] = m
  if (offset) {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  const wall = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  if (!tz) return wall

  const firstOffset = tzOffsetMs(wall, tz)
  let instant = wall - firstOffset
  const secondOffset = tzOffsetMs(instant, tz)
  if (secondOffset !== firstOffset) instant = wall - secondOffset
  return instant
}
