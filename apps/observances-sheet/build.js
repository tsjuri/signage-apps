#!/usr/bin/env bun
// Observances (Google Sheet): the same slides as apps/observances, chosen and
// worded from each school's own Google Sheet. The observance list, icons and
// look are shared with apps/observances; only app.js differs.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const DIST = 'dist'
const SHARED = '../../shared/observances'
const FILES = { 'app.js': 'app.js', 'data.js': `${SHARED}/data.js`, 'icons.js': `${SHARED}/icons.js`, 'styles.css': `${SHARED}/styles.css` }
rmSync(DIST, { recursive: true, force: true })
mkdirSync(join(DIST, 'fonts'), { recursive: true })
mkdirSync(join(DIST, '.well-known'), { recursive: true })

const h = createHash('sha256')
for (const src of [...Object.values(FILES), 'index.html']) h.update(readFileSync(src))
const V = h.digest('hex').slice(0, 10)
for (const [out, src] of Object.entries(FILES)) copyFileSync(src, join(DIST, out))
copyFileSync('observances-template.csv', join(DIST, 'observances-template.csv'))
writeFileSync(join(DIST, 'index.html'), readFileSync('index.html', 'utf8').replaceAll('__V__', V))
for (const w of [500, 600, 800]) {
  copyFileSync(`node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2`, join(DIST, `fonts/poppins-${w}.woff2`))
}

const manifest = {
  manifestVersion: '1',
  id: 'observances-sheet',
  name: 'Observances',
  description:
    'Heritage months, awareness months, school weeks and special days, one animated slide each, shown automatically when current. Each school controls its own slides from a Google Sheet: tick or untick observances, rewrite the messages and add its own events. Changes reach the screen within the hour.',
  summary: 'Observance slides, chosen and worded in the school’s own Google Sheet.',
  tags: ['School', 'Calendar', 'Celebration'],
  playback: { pacing: 'fixed', refreshIntervalS: 3600 },
  settings: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      sheet: {
        type: 'string',
        title: 'School’s Google Sheet',
        description: 'The sheet’s link from File → Share → Publish to web (choose the sheet and “Comma-separated values”). Without it, every observance shows with the standard text.',
        'x-widget': 'url'
      },
      seconds: {
        type: 'integer',
        title: 'Seconds per slide',
        description: 'Set the asset’s duration to a multiple of this.',
        default: 12,
        minimum: 4,
        maximum: 120
      },
      motion: {
        type: 'string',
        title: 'Motion',
        description: 'Gentle suits small players like Intel Compute Sticks. Full adds drifting background shapes; None turns all movement off.',
        default: 'gentle',
        enum: ['gentle', 'full', 'none'],
        'x-enumLabels': ['Gentle', 'Full', 'None']
      },
      date: {
        type: 'string',
        format: 'date',
        title: 'Preview as of (testing only)',
        description: 'Show the slides for another day. Leave empty for normal use.'
      }
    }
  },
  launch: {
    baseUrl: 'https://example.invalid/observances-sheet/',
    template: '{?sheet,seconds,motion,date}'
  }
}
writeFileSync(join(DIST, '.well-known/signage-app.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log('✓ observances-sheet built')
