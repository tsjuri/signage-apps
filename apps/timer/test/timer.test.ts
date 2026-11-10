import { describe, expect, test } from 'bun:test'
import { computeState, pad2, parseTarget, splitDuration, tzOffsetMs } from '../assets/static/js/timer'

const S = 1000
const MIN = 60 * S
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('pad2', () => {
  test('zero-pads to two digits', () => {
    expect(pad2(0)).toBe('00')
    expect(pad2(7)).toBe('07')
    expect(pad2(42)).toBe('42')
  })

  test('clamps negatives and floors fractions', () => {
    expect(pad2(-3)).toBe('00')
    expect(pad2(9.9)).toBe('09')
  })
})

describe('splitDuration', () => {
  test('breaks a span into day/hour/minute/second parts', () => {
    const ms = 2 * DAY + 3 * HOUR + 4 * MIN + 5 * S
    expect(splitDuration(ms)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 })
  })

  test('rolls units over correctly and never overflows', () => {
    expect(splitDuration(23 * HOUR + 59 * MIN + 59 * S)).toEqual({
      days: 0,
      hours: 23,
      minutes: 59,
      seconds: 59
    })
    expect(splitDuration(DAY)).toEqual({ days: 1, hours: 0, minutes: 0, seconds: 0 })
  })

  test('clamps negative spans to zero', () => {
    expect(splitDuration(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })

  test('supports large day counts', () => {
    expect(splitDuration(365 * DAY).days).toBe(365)
  })
})

describe('computeState', () => {
  const now = Date.UTC(2026, 0, 1, 0, 0, 0)

  test('counts down toward a future target', () => {
    const state = computeState(now + (2 * DAY + 3 * HOUR), now)
    expect(state.direction).toBe('down')
    expect(state.reached).toBe(false)
    expect(state.parts).toEqual({ days: 2, hours: 3, minutes: 0, seconds: 0 })
  })

  test('counts up once the target is in the past', () => {
    const state = computeState(now - (1 * HOUR + 30 * MIN), now)
    expect(state.direction).toBe('up')
    expect(state.reached).toBe(true)
    expect(state.parts).toEqual({ days: 0, hours: 1, minutes: 30, seconds: 0 })
  })

  test('flips to reached exactly at zero', () => {
    const state = computeState(now, now)
    expect(state.direction).toBe('up')
    expect(state.reached).toBe(true)
    expect(state.parts).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })
})

describe('tzOffsetMs', () => {
  test('is zero for UTC and for an empty/invalid zone', () => {
    const instant = Date.UTC(2026, 5, 1)
    expect(tzOffsetMs(instant, 'UTC')).toBe(0)
    expect(tzOffsetMs(instant, '')).toBe(0)
    expect(tzOffsetMs(instant, 'Not/AZone')).toBe(0)
  })

  test('tracks standard vs daylight offsets for a zone', () => {
    // New York: UTC-5 in January (EST), UTC-4 in July (EDT).
    expect(tzOffsetMs(Date.UTC(2026, 0, 15, 12), 'America/New_York')).toBe(-5 * HOUR)
    expect(tzOffsetMs(Date.UTC(2026, 6, 15, 12), 'America/New_York')).toBe(-4 * HOUR)
  })
})

describe('parseTarget', () => {
  test('parses an instant with an explicit offset, ignoring tz', () => {
    expect(parseTarget('2026-01-01T00:00:00Z', 'America/New_York')).toBe(Date.UTC(2026, 0, 1))
    expect(parseTarget('2026-01-01T00:00:00+02:00')).toBe(Date.UTC(2025, 11, 31, 22))
  })

  test('interprets a zoneless target as UTC when no tz is given', () => {
    expect(parseTarget('2026-06-01T12:00:00')).toBe(Date.UTC(2026, 5, 1, 12))
  })

  test('interprets a zoneless target in the given tz (DST-aware)', () => {
    // Midnight in New York on a winter date is 05:00 UTC (EST, UTC-5).
    expect(parseTarget('2026-01-01T00:00:00', 'America/New_York')).toBe(Date.UTC(2026, 0, 1, 5))
    // Midnight in New York on a summer date is 04:00 UTC (EDT, UTC-4).
    expect(parseTarget('2026-07-01T00:00:00', 'America/New_York')).toBe(Date.UTC(2026, 6, 1, 4))
  })

  test('accepts a date-only target as midnight', () => {
    expect(parseTarget('2026-12-25')).toBe(Date.UTC(2026, 11, 25))
  })

  test('accepts a space-separated date and time', () => {
    expect(parseTarget('2026-06-01 12:30')).toBe(Date.UTC(2026, 5, 1, 12, 30))
  })

  test('returns null for empty or malformed input', () => {
    expect(parseTarget('')).toBeNull()
    expect(parseTarget('   ')).toBeNull()
    expect(parseTarget('next tuesday')).toBeNull()
    expect(parseTarget('2026/12/31')).toBeNull()
  })
})
