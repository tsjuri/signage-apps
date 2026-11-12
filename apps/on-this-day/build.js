#!/usr/bin/env bun
// On This Day: the school's own history, from a Google Sheet tab.
// Shares its look (styles, icons, colours) with apps/observances and apps/trivia-facts.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const DIST = 'dist'
const FILES = {
  'app.js': 'app.js',
  'extra.css': '../trivia-facts/extra.css',
  'icons.js': '../../shared/observances/icons.js',
  'styles.css': '../../shared/observances/styles.css',
  'palettes.js': '../../shared/observances/data.js' // defines window.PALETTES (and the observances, unused here)
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
  id: 'on-this-day',
  name: 'On This Day (our history)',
  description:
    'Moments from your own school’s history on the day they happened: “On this day in 1957, our school opened its doors.” Everything comes from your Google Sheet, nothing from the internet. On days without an entry it shows one from this week, or another from your history.',
  summary: 'Your school’s own history, on the day it happened.',
  tags: ['School', 'Education'],
  playback: { pacing: 'fixed', refreshIntervalS: 3600 },
  settings: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      sheet: {
        type: 'string',
        title: 'Our history (Google Sheet)',
        description: 'The On This Day tab’s Publish to web link (CSV), with columns Show, Date (e.g. Sep 5), Year, What happened. Each time this asset comes up it shows one entry for the whole duration you set in Anthias.',
        'x-widget': 'url'
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
    baseUrl: 'https://example.invalid/on-this-day/',
    template: '{?sheet,motion,date}'
  }
}
writeFileSync(join(DIST, '.well-known/signage-app.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log('✓ on-this-day built')
