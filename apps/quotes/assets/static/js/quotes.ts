// Pure, framework-free helpers for the quotes app. Kept separate from main.ts
// so they can be unit-tested with `bun:test`; main.ts is the (untestable,
// no-exports) browser entry that wires these into the DOM.

export type Quote = { text: string; author: string }

// Returns an integer in [0, length). `rng` is injectable so tests are
// deterministic. Guards against empty/invalid input and an rng that returns 1.
export const pickRandomIndex = (length: number, rng: () => number = Math.random): number => {
  if (!Number.isFinite(length) || length <= 0) return 0
  return Math.min(length - 1, Math.floor(rng() * length))
}

// Runtime type guard — the fetched JSON is untrusted `unknown` until validated.
export const isQuote = (value: unknown): value is Quote => {
  if (typeof value !== 'object' || value === null) return false
  const quote = value as Record<string, unknown>
  return (
    typeof quote.text === 'string' &&
    quote.text.length > 0 &&
    typeof quote.author === 'string' &&
    quote.author.length > 0
  )
}
