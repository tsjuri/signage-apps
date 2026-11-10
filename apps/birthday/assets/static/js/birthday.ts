// Pure, framework-free helpers for the birthday app. Kept separate from main.ts
// so they can be unit-tested with `bun:test`; main.ts is the (untestable,
// no-exports) browser entry that wires these into the DOM.
//
// The app takes no dataset — a single celebration is described entirely by the
// launch URL's query string (see .well-known/signage-app.json). These helpers
// normalise those params and lay out the confetti.

export type BirthdayConfig = {
  name: string
  message: string
  from: string
}

// Shown when no message is supplied, so the card always has a warm second line.
export const DEFAULT_MESSAGE = 'Wishing you a wonderful day!'

// Read + normalise the settings from the launch URL. Every field is trimmed;
// `name` and `from` are optional (empty string when absent) and `message` falls
// back to the default so the layout never collapses.
export const parseConfig = (params: URLSearchParams): BirthdayConfig => ({
  name: (params.get('name') ?? '').trim(),
  message: (params.get('message') ?? '').trim() || DEFAULT_MESSAGE,
  from: (params.get('from') ?? '').trim()
})

// The hero line. With a name it's personalised; without one it stays a valid,
// non-empty greeting so a bare visit or store preview still reads correctly.
export const formatGreeting = (name: string): string =>
  name ? `Happy Birthday, ${name}!` : 'Happy Birthday!'

// The signature line, or '' when no sender was given (the element is then hidden).
export const formatSignature = (from: string): string => (from ? `— ${from}` : '')

// One scrap of confetti. All values are unit-normalised (0..1) or degrees so the
// CSS can scale them to the viewport; `hue` indexes the festive palette in the
// stylesheet.
export type ConfettiPiece = {
  left: number // horizontal start, 0..1 of the viewport width
  top: number // resting vertical position, 0..1 (used for the still reduced-motion scatter)
  delay: number // animation delay in seconds — spans one full fall (see below)
  duration: number // fall duration in seconds
  drift: number // horizontal drift, -1..1
  rotate: number // total rotation in degrees
  hue: number // palette index, 0..(HUES-1)
  size: number // relative size, ~0.6..1.4
  round: boolean // circle vs rectangle scrap
}

// Number of distinct confetti colours the stylesheet defines (--confetti-0..N).
export const CONFETTI_HUES = 5

// Deterministically lay out `count` confetti pieces. `rng` is injectable so the
// layout is testable and reproducible; main.ts passes Math.random at runtime.
//
// `delay` spans a piece's own `duration` so that, applied as a *negative*
// animation-delay, each scrap starts mid-fall — the loop's steady state fills the
// whole frame from the first paint instead of clustering at the top. `top` gives
// each piece a resting position for the still, reduced-motion scatter.
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
      round: rng() < 0.5
    })
  }
  return pieces
}
