#!/usr/bin/env bun
// Trivia & Fun Facts. Shares its look (styles, icons, colours) with apps/observances.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const DIST = 'dist'
const SHARED = '../observances'
const FILES = {
  'app.js': 'app.js',
  'data.js': 'data.js',
  'extra.css': 'extra.css',
  'icons-extra.js': 'icons-extra.js',
  'icons.js': `${SHARED}/icons.js`,
  'styles.css': `${SHARED}/styles.css`,
  'palettes.js': `${SHARED}/data.js` // defines window.PALETTES (and the observances, unused here)
}
rmSync(DIST, { recursive: true, force: true })
mkdirSync(join(DIST, 'fonts'), { recursive: true })
mkdirSync(join(DIST, '.well-known'), { recursive: true })
const h = createHash('sha256')
for (const src of [...Object.values(FILES), 'index.html']) h.update(readFileSync(src))
const V = h.digest('hex').slice(0, 10)
for (const [out, src] of Object.entries(FILES)) copyFileSync(src, join(DIST, out))
writeFileSync(join(DIST, 'index.html'), readFileSync('index.html', 'utf8').replaceAll('__V__', V))
for (const w of [500, 600, 800]) {
  copyFileSync(`node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2`, join(DIST, `fonts/poppins-${w}.woff2`))
}

const manifest = {
  manifestVersion: '1',
  id: 'trivia-facts',
  name: 'Trivia & Fun Facts',
  description:
    'A quick quiz (the question first, then the answer slides in) alternating with a fun fact, about animals, space, the human body, science, history and more. A new order every day. Schools can add their own questions and facts from a Google Sheet.',
  summary: 'Kid-friendly quiz questions and fun facts, a new mix every day.',
  tags: ['School', 'Education', 'Fun'],
  playback: { pacing: 'fixed', refreshIntervalS: 3600 },
  settings: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        title: 'Show',
        default: 'both',
        enum: ['both', 'trivia', 'facts'],
        'x-enumLabels': ['Quiz and facts, alternating', 'Quiz only', 'Facts only']
      },
      seconds: {
        type: 'integer',
        title: 'Seconds per slide',
        description: 'A quiz question shows its answer about 60% of the way through.',
        default: 14,
        minimum: 6,
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
      sheet: {
        type: 'string',
        title: 'Our own questions and facts (Google Sheet)',
        description: 'Optional. A sheet’s Publish to web link (CSV) with columns Show, Type (Fact or Trivia), Text, Answer, Topic. Your items come first each day.',
        'x-widget': 'url'
      },
      ours: {
        type: 'boolean',
        title: 'Only our own items',
        description: 'Leave off to mix your sheet with the built-in set.',
        default: false
      }
    }
  },
  launch: {
    baseUrl: 'https://example.invalid/trivia-facts/',
    template: '{?mode,seconds,motion,sheet,ours}'
  }
}
writeFileSync(join(DIST, '.well-known/signage-app.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log('✓ trivia-facts built')
