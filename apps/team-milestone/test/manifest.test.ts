import { describe, expect, test } from 'bun:test'
import manifest from '../.well-known/signage-app.json'

// Guards the signage app manifest (.well-known/signage-app.json) against the
// core rules of the app-store manifest schema. The store's index build rejects
// any app whose manifest fails validation, so keep this in step with
// static/schemas/signage-app-manifest.schema.json in the app-store repo.
//
// Like Opening Hours, Team Milestone is a *settings* app: it carries a JSON
// Schema of configurable fields and a launch template that serialises them into
// the URL.

describe('signage-app.json manifest', () => {
  test('declares the current manifest version', () => {
    expect(manifest.manifestVersion).toBe('1')
  })

  test('has a store-valid id slug', () => {
    expect(manifest.id).toBe('team-milestone')
    expect(manifest.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })

  test('has non-empty required human copy', () => {
    for (const key of ['name', 'description'] as const) {
      expect(typeof manifest[key]).toBe('string')
      expect(manifest[key].length).toBeGreaterThan(0)
    }
  })

  test('URL fields are absolute https URLs', () => {
    for (const field of ['homepage', 'source', 'support'] as const) {
      const url = new URL(manifest[field])
      expect(url.protocol).toBe('https:')
    }
  })

  test('launches from a valid https base URL', () => {
    const url = new URL(manifest.launch.baseUrl)
    expect(url.protocol).toBe('https:')
  })

  test('is a settings app: a template requires a settings schema', () => {
    expect('template' in manifest.launch).toBe(true)
    expect('settings' in manifest).toBe(true)
    expect(manifest.settings.type).toBe('object')
  })

  test('exposes the team/value/label/message/date fields', () => {
    const props = Object.keys(manifest.settings.properties)
    for (const field of ['team', 'value', 'label', 'message', 'date']) {
      expect(props).toContain(field)
    }
  })

  test('every launch-template variable maps to a settings property', () => {
    const vars = (manifest.launch.template.match(/[a-z0-9]+/gi) ?? []).filter(
      (v: string) => v.length > 0
    )
    const props = new Set(Object.keys(manifest.settings.properties))
    for (const v of vars) expect(props.has(v)).toBe(true)
  })

  test('puts every parameter in a single query expression', () => {
    const groups = manifest.launch.template.match(/\{[?&][^}]*\}/g) ?? []
    expect(groups.length).toBe(1)
    expect(groups[0]?.startsWith('{?')).toBe(true)
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
    for (const key of Object.keys(manifest)) expect(allowed).toContain(key)
  })
})
