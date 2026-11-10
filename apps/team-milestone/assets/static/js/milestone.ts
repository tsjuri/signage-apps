// Pure, framework-free helpers for the team-milestone app. Kept separate from
// main.ts so they can be unit-tested with `bun:test`; main.ts is the (untestable,
// no-exports) browser entry that wires these into the DOM.
//
// The app takes no dataset — a single milestone is described entirely by the
// launch URL's query string (see .well-known/signage-app.json). These helpers
// normalise those params and lay out the celebratory confetti.

export type MilestoneConfig = {
  team: string // eyebrow, e.g. "Team Phoenix"
  value: string // the hero value, e.g. "5 Years" or "1,000,000 Users"
  label: string // caption under the value, e.g. "of building together"
  message: string // optional supporting sentence
  date: string // optional dateline, e.g. "July 2026"
}

// Shown as the hero value when none is supplied, so the screen still reads as a
// celebration on a bare visit or in the store preview.
export const DEFAULT_VALUE = 'Milestone'

// Read + normalise the settings from the launch URL. Every field is trimmed;
// only `value` has a fallback so the layout never collapses to nothing.
export const parseConfig = (params: URLSearchParams): MilestoneConfig => ({
  team: (params.get('team') ?? '').trim(),
  value: (params.get('value') ?? '').trim() || DEFAULT_VALUE,
  label: (params.get('label') ?? '').trim(),
  message: (params.get('message') ?? '').trim(),
  date: (params.get('date') ?? '').trim()
})

// One scrap of confetti. All values are unit-normalised (0..1) or degrees so the
// CSS can scale them to the viewport; `hue` indexes the palette in the stylesheet.
export type ConfettiPiece = {
  left: number // horizontal start, 0..1 of the viewport width
  top: number // resting vertical position, 0..1 (used for the still reduced-motion scatter)
  delay: number // animation delay in seconds — spans one full fall (see below)
  duration: number // fall duration in seconds
  drift: number // horizontal drift, -1..1
  rotate: number // total rotation in degrees
  hue: number // palette index, 0..(HUES-1)
  size: number // relative size, ~0.6..1.4
  round: boolean // circle sequin vs ticker-tape streamer
}

// Number of distinct confetti colours the stylesheet defines (--confetti-0..N).
export const CONFETTI_HUES = 4

// Deterministically lay out `count` confetti pieces. `rng` is injectable so the
// layout is testable and reproducible; main.ts passes Math.random at runtime.
//
// `delay` spans a piece's own `duration` so that, applied as a *negative*
// animation-delay, each scrap starts mid-fall — the loop's steady state fills the
// whole frame from the first paint instead of clustering at the top. `top` gives
// each piece a resting position for the still, reduced-motion scatter. Streamers
// dominate (mostly rectangles) for the ticker-tape look; a few round sequins.
export const buildConfetti = (count: number, rng: () => number = Math.random): ConfettiPiece[] => {
  const pieces: ConfettiPiece[] = []
  if (!Number.isFinite(count) || count <= 0) return pieces
  for (let i = 0; i < count; i++) {
    const duration = 4 + rng() * 4
    pieces.push({
      left: rng(),
      top: rng(),
      duration,
      delay: rng() * duration,
      drift: rng() * 2 - 1,
      rotate: (rng() * 2 - 1) * 720,
      hue: Math.min(CONFETTI_HUES - 1, Math.floor(rng() * CONFETTI_HUES)),
      size: 0.6 + rng() * 0.8,
      round: rng() < 0.25
    })
  }
  return pieces
}
