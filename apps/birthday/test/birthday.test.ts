import { describe, expect, test } from 'bun:test'
import {
  buildConfetti,
  CONFETTI_HUES,
  DEFAULT_MESSAGE,
  formatGreeting,
  formatSignature,
  parseConfig
} from '../assets/static/js/birthday'

describe('parseConfig', () => {
  test('reads and trims every field', () => {
    const params = new URLSearchParams('?name=+Alex+&message=+Have+fun+&from=+The+Team+')
    expect(parseConfig(params)).toEqual({
      name: 'Alex',
      message: 'Have fun',
      from: 'The Team'
    })
  })

  test('falls back to the default message when absent or blank', () => {
    expect(parseConfig(new URLSearchParams('')).message).toBe(DEFAULT_MESSAGE)
    expect(parseConfig(new URLSearchParams('?message=+++')).message).toBe(DEFAULT_MESSAGE)
  })

  test('name and from are empty strings when absent', () => {
    const config = parseConfig(new URLSearchParams(''))
    expect(config.name).toBe('')
    expect(config.from).toBe('')
  })
})

describe('formatGreeting', () => {
  test('personalises when a name is given', () => {
    expect(formatGreeting('Alex')).toBe('Happy Birthday, Alex!')
  })

  test('stays a valid non-empty greeting without a name', () => {
    expect(formatGreeting('')).toBe('Happy Birthday!')
  })
})

describe('formatSignature', () => {
  test('prefixes an em dash when present', () => {
    expect(formatSignature('The Team')).toBe('— The Team')
  })

  test('is empty when no sender is given', () => {
    expect(formatSignature('')).toBe('')
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
