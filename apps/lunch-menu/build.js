#!/usr/bin/env bun
// Assembles dist/ for the lunch-menu app. The banner-image settings are dropdowns
// built from the shared ../../media folder, so uploading a photo there and pushing
// is all it takes to make it selectable in Anthias.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const DIST = 'dist'
const MEDIA = join(import.meta.dir, '../../media')
rmSync(DIST, { recursive: true, force: true })
mkdirSync(join(DIST, 'fonts'), { recursive: true })
mkdirSync(join(DIST, '.well-known'), { recursive: true })

const v = createHash('sha256')
for (const f of ['app.js', 'styles.css', 'index.html']) v.update(readFileSync(f))
const VERSION = v.digest('hex').slice(0, 10)

copyFileSync('app.js', join(DIST, 'app.js'))
copyFileSync('styles.css', join(DIST, 'styles.css'))
writeFileSync(join(DIST, 'index.html'), readFileSync('index.html', 'utf8').replaceAll('__V__', VERSION))
for (const w of [500, 600, 800]) {
  copyFileSync(`node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2`, join(DIST, `fonts/poppins-${w}.woff2`))
}

const images = readdirSync(MEDIA).filter((f) => /\.(jpe?g|png|webp|gif|svg)$/i.test(f)).sort()
const label = (f) => f.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const imageSetting = (n, def) => ({
  type: 'string',
  title: `Banner image ${n}`,
  ...(n === 1 ? { description: 'Ignored when the calendar feed has a photo folder: then the photos in that Drive folder are shown.' } : {}),
  default: images.includes(def) ? def : '',
  enum: ['none', ...images],
  'x-enumLabels': ['(none)', ...images.map(label)]
})
const defaults = ['fruit.svg', 'tacos.svg', 'burger.svg', 'salad.svg', 'pizza.svg']

const manifest = {
  manifestVersion: '1',
  id: 'lunch-menu',
  name: 'Lunch Menu',
  description:
    'A lunch menu for the next five school days, read from a Google Calendar and rolling forward every day so the left column is always today. A banner of food photos frames the title. Enter each day as one all-day event: the dish in the title, sides in the description, one per line. Banner photos can come from a shared Google Drive folder.',
  summary: 'This week’s school lunches, straight from the calendar.',
  tags: ['Menu', 'School', 'Calendar'],
  playback: { pacing: 'fixed', refreshIntervalS: 3600 },
  settings: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      source: {
        type: 'string',
        title: 'Calendar feed URL',
        description: 'The Apps Script web-app URL for a district-only calendar. Leave empty when using a public calendar below.',
        'x-widget': 'url'
      },
      calendarId: {
        type: 'string',
        title: 'Public calendar ID',
        description: 'Only for a public calendar, e.g. abc123@group.calendar.google.com',
        'x-widget': 'text'
      },
      apiKey: {
        type: 'string',
        title: 'Google API key',
        description: 'Only for a public calendar: a Calendar API key restricted to this site.',
        'x-widget': 'text'
      },
      eyebrow: { type: 'string', title: 'Small title', default: 'Calendar', 'x-widget': 'text' },
      heading: {
        type: 'string',
        title: 'Big title',
        description: 'Use | for a line break, e.g. Lunch|Menu',
        default: 'Lunch|Menu',
        'x-widget': 'text'
      },
      img1: imageSetting(1, defaults[0]),
      img2: imageSetting(2, defaults[1]),
      img3: imageSetting(3, defaults[2]),
      img4: imageSetting(4, defaults[3]),
      img5: imageSetting(5, defaults[4])
    }
  },
  launch: {
    baseUrl: 'https://example.invalid/lunch-menu/',
    template: '{?source,calendarId,apiKey,eyebrow,heading,img1,img2,img3,img4,img5}'
  }
}
writeFileSync(join(DIST, '.well-known/signage-app.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`✓ lunch-menu built (${images.length} images selectable)`)
