import { describe, expect, test } from 'bun:test'
import quotes from '../assets/static/data/quotes.json'
import { isQuote, pickRandomIndex, type Quote } from '../assets/static/js/quotes'

// Mirror the curation bounds in scripts/curate-quotes.ts so the shipped data
// can't silently drift out of what the layout was designed and tested for.
const MIN_LEN = 25
const MAX_LEN = 150

describe('pickRandomIndex', () => {
  test('returns an in-range integer for every rng value', () => {
    const length = 500
    for (const r of [0, 0.001, 0.25, 0.5, 0.999999, 1]) {
      const i = pickRandomIndex(length, () => r)
      expect(Number.isInteger(i)).toBe(true)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(length)
    }
  })

  test('maps the rng range across the full index range', () => {
    expect(pickRandomIndex(10, () => 0)).toBe(0)
    expect(pickRandomIndex(10, () => 0.99)).toBe(9)
    expect(pickRandomIndex(10, () => 1)).toBe(9) // clamped, never out of range
  })

  test('guards against empty or invalid lengths', () => {
    expect(pickRandomIndex(0)).toBe(0)
    expect(pickRandomIndex(-5)).toBe(0)
    expect(pickRandomIndex(Number.NaN)).toBe(0)
  })
})

describe('isQuote', () => {
  test('accepts a well-formed quote', () => {
    expect(isQuote({ text: 'A', author: 'B' })).toBe(true)
  })

  test('rejects malformed values', () => {
    expect(isQuote(null)).toBe(false)
    expect(isQuote('nope')).toBe(false)
    expect(isQuote({ text: 'only text' })).toBe(false)
    expect(isQuote({ text: '', author: 'B' })).toBe(false)
    expect(isQuote({ text: 'A', author: '' })).toBe(false)
    expect(isQuote({ text: 1, author: 2 })).toBe(false)
  })
})

describe('quotes.json dataset', () => {
  const data = quotes as Quote[]

  test('ships roughly 500 quotes', () => {
    expect(data.length).toBeGreaterThanOrEqual(450)
    expect(data.length).toBeLessThanOrEqual(520)
  })

  test('every entry is a valid quote within the display length bounds', () => {
    for (const q of data) {
      expect(isQuote(q)).toBe(true)
      expect(q.text.length).toBeGreaterThanOrEqual(MIN_LEN)
      expect(q.text.length).toBeLessThanOrEqual(MAX_LEN)
    }
  })

  test('has no duplicate quotes (case-insensitive)', () => {
    const seen = new Set(data.map((q) => q.text.toLowerCase()))
    expect(seen.size).toBe(data.length)
  })

  test('every quote can be selected', () => {
    expect(isQuote(data[pickRandomIndex(data.length, () => 0)])).toBe(true)
    expect(isQuote(data[pickRandomIndex(data.length, () => 0.999999)])).toBe(true)
  })
})
