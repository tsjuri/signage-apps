#!/usr/bin/env bun
// Learning Clock: an analog clock that teaches kids how to read it.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const DIST = 'dist'
const FILES = { 'app.js': 'app.js', 'styles.css': 'styles.css' }
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
  id: 'learning-clock',
  name: 'Learning Clock',
  description:
    'An analog clock that teaches kids to read it: a short orange hour hand and a long blue minute hand, the minutes marked around the face, “past” and “to” halves, and the time in words with a plain explanation of where each hand points.',
  summary: 'An analog clock that shows kids how to read it.',
  tags: ['School', 'Education', 'Clock'],
  settings: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      words: {
        type: 'string',
        title: 'Time in words',
        default: 'past',
        enum: ['past', 'plain'],
        'x-enumLabels': ['Quarter past ten', 'Ten fifteen']
      },
      seconds: {
        type: 'boolean',
        title: 'Second hand',
        description: 'Off is calmer and lighter on small players.',
        default: false
      },
      time: {
        type: 'string',
        title: 'Fixed time (testing only)',
        description: 'HH:MM, e.g. 10:25. Leave empty for the real time.'
      }
    }
  },
  launch: {
    baseUrl: 'https://example.invalid/learning-clock/',
    template: '{?words,seconds,time}'
  }
}
writeFileSync(join(DIST, '.well-known/signage-app.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log('✓ learning-clock built')
