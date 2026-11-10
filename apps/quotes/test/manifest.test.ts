import { describe, expect, test } from 'bun:test'
import manifest from '../.well-known/signage-app.json'

// Guards the signage app manifest (.well-known/signage-app.json) against the
// core rules of the app-store manifest schema. The store's index build rejects
// any app whose manifest fails validation, so keep this in step with
// static/schemas/signage-app-manifest.schema.json in the app-store repo.

describe('signage-app.json manifest', () => {
  test('declares the current manifest version', () => {
    expect(manifest.manifestVersion).toBe('1')
  })

  test('has a store-valid id slug', () => {
    expect(manifest.id).toBe('quotes')
    expect(manifest.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })

  test('has non-empty required human copy', () => {
    for (const key of ['name', 'description'] as const) {
      expect(typeof manifest[key]).toBe('string')
      expect(manifest[key].length).toBeGreaterThan(0)
    }
  })

  test('launches from a valid https base URL', () => {
    expect(typeof manifest.launch.baseUrl).toBe('string')
    const url = new URL(manifest.launch.baseUrl)
    expect(url.protocol).toBe('https:')
  })

  test('every URL field is an absolute https URL', () => {
    for (const key of ['icon', 'homepage', 'source', 'support'] as const) {
      if (!(key in manifest)) continue
      const value = (manifest as Record<string, unknown>)[key]
      expect(typeof value).toBe('string')
      expect(new URL(value as string).protocol).toBe('https:')
    }
  })

  test('is a no-settings app: no launch template without settings', () => {
    const hasTemplate = 'template' in manifest.launch
    const hasSettings = 'settings' in manifest
    // A template only makes sense when settings exist (schema allOf rule).
    expect(hasTemplate).toBe(false)
    expect(hasSettings).toBe(false)
    // Single-shot app: the manifest and docs require playback to be omitted.
    expect('playback' in manifest).toBe(false)
  })

  test('tags are unique strings', () => {
    if ('tags' in manifest) {
      const tags = (manifest as { tags: string[] }).tags
      for (const t of tags) expect(typeof t).toBe('string')
      expect(new Set(tags).size).toBe(tags.length)
    }
  })

  test('only carries known top-level keys', () => {
    const allowed = new Set([
      'manifestVersion',
      'id',
      'name',
      'description',
      'summary',
      'vendor',
      'tags',
      'icon',
      'screenshots',
      'homepage',
      'source',
      'support',
      'playback',
      'settings',
      'launch'
    ])
    for (const key of Object.keys(manifest)) expect(allowed.has(key)).toBe(true)
  })
})
