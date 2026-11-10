import { describe, expect, test } from 'bun:test'
import {
  buildConfetti,
  CONFETTI_HUES,
  DEFAULT_VALUE,
  parseConfig
} from '../assets/static/js/milestone'

describe('parseConfig', () => {
  test('reads and trims every field', () => {
    const params = new URLSearchParams(
      '?team=+Team+Phoenix+&value=+5+Years+&label=+of+building+&message=+Well+done+&date=+July+2026+'
    )
    expect(parseConfig(params)).toEqual({
      team: 'Team Phoenix',
      value: '5 Years',
      label: 'of building',
      message: 'Well done',
      date: 'July 2026'
    })
  })

  test('falls back to the default value when absent or blank', () => {
    expect(parseConfig(new URLSearchParams('')).value).toBe(DEFAULT_VALUE)
    expect(parseConfig(new URLSearchParams('?value=+++')).value).toBe(DEFAULT_VALUE)
  })

  test('optional fields are empty strings when absent', () => {
    const config = parseConfig(new URLSearchParams(''))
    expect(config.team).toBe('')
    expect(config.label).toBe('')
    expect(config.message).toBe('')
    expect(config.date).toBe('')
  })
})

describe('buildConfetti', () => {
  test('produces exactly the requested number of pieces', () => {
    expect(buildConfetti(60).length).toBe(60)
  })

  test('guards against non-positive or invalid counts', () => {
    expect(buildConfetti(0)).toEqual([])
    expect(buildConfetti(-5)).toEqual([])
    expect(buildConfetti(Number.NaN)).toEqual([])
  })

  test('every piece is within its documented ranges', () => {
    // A deterministic rng makes the layout reproducible and assertable.
    let seed = 0
    const rng = () => {
      seed = (seed + 0.137) % 1
      return seed
    }
    for (const p of buildConfetti(200, rng)) {
      expect(p.left).toBeGreaterThanOrEqual(0)
      expect(p.left).toBeLessThanOrEqual(1)
      expect(p.drift).toBeGreaterThanOrEqual(-1)
      expect(p.drift).toBeLessThanOrEqual(1)
      expect(p.duration).toBeGreaterThanOrEqual(4)
      expect(p.hue).toBeGreaterThanOrEqual(0)
      expect(p.hue).toBeLessThan(CONFETTI_HUES)
      expect(Number.isInteger(p.hue)).toBe(true)
      expect(typeof p.round).toBe('boolean')
    }
  })

  test('never emits an out-of-range hue even when rng returns 1', () => {
    for (const p of buildConfetti(10, () => 1)) {
      expect(p.hue).toBe(CONFETTI_HUES - 1)
    }
  })
})
