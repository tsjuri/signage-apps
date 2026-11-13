#!/usr/bin/env bun
// Countdown: a poster counting down the days to an event, in the Gallery's themes.
// Background photos come from the shared media/backgrounds/ folder: upload an
// image there and it appears in the app's Background dropdown after the next build.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const DIST = 'dist'
const BACKGROUNDS = join(import.meta.dir, '../../media/backgrounds')
const FILES = { 'app.js': 'app.js', 'styles.css': 'styles.css', 'themes.js': '../gallery/themes.js' }
rmSync(DIST, { recursive: true, force: true })
mkdirSync(join(DIST, 'fonts'), { recursive: true })
mkdirSync(join(DIST, '.well-known'), { recursive: true })
const h = createHash('sha256')
for (const src of [...Object.values(FILES), 'index.html']) h.update(readFileSync(src))
const V = h.digest('hex').slice(0, 10)
for (const [out, src] of Object.entries(FILES)) copyFileSync(src, join(DIST, out))
writeFileSync(join(DIST, 'index.html'), readFileSync('index.html', 'utf8').replaceAll('__V__', V))
for (const w of [600, 800]) {
  copyFileSync(`node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2`, join(DIST, `fonts/poppins-${w}.woff2`))
}
copyFileSync('node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2', join(DIST, 'fonts/bebas-400.woff2'))

const backgrounds = existsSync(BACKGROUNDS)
  ? readdirSync(BACKGROUNDS).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f)).sort()
  : []
const label = (f) => f.replace(/\.[a-z]+$/i, '').replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

const manifest = {
  manifestVersion: '1',
  id: 'countdown',
  name: 'Countdown',
  description:
    'A poster that counts down the days to an event: a big headline (“Give Thanks”, “Winter Break”), the number of days left, and a line or two of your own (“We are closed November 25–29”). Themed for the season like the Gallery, or on a background photo of your choice. On the day itself it can count down the hours.',
  summary: 'Days to go, poster style.',
  tags: ['School', 'Countdown', 'Events'],
  playback: { pacing: 'fixed', refreshIntervalS: 3600 },
  settings: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      target: { type: 'string', format: 'date', title: 'Count down to', description: 'The day it happens.' },
      headline: { type: 'string', title: 'Headline', description: 'Leave empty for the theme’s own, e.g. “Give Thanks”. Use | for a line break.', 'x-widget': 'text' },
      message: { type: 'string', title: 'Message', description: 'Optional, under the count. Use | for a second line, e.g. We are closed November 25–29.|Happy Thanksgiving!', 'x-widget': 'text' },
      time: { type: 'string', title: 'Time (optional)', description: 'HH:MM, e.g. 14:30: on the day itself it counts down the hours to it.', 'x-widget': 'text' },
      arrived: { type: 'string', title: 'When the day is here', description: 'Default: Today!', 'x-widget': 'text' },
      theme: {
        type: 'string',
        title: 'Theme',
        default: 'auto',
        enum: ['auto', 'halloween', 'fall', 'thanksgiving', 'winter', 'valentines', 'spring', 'summer', 'endofyear', 'plain'],
        'x-enumLabels': ['Automatic (by the date)', 'Halloween', 'Fall', 'Thanksgiving', 'Winter', 'Valentine’s', 'Spring', 'Summer', 'End of year', 'Plain']
      },
      background: {
        type: 'string',
        title: 'Background',
        description: 'The theme’s colours, or a photo or GIF from the media/backgrounds folder.',
        default: '',
        enum: ['', ...backgrounds],
        'x-enumLabels': ['Theme colours', ...backgrounds.map(label)]
      },
      nodrawings: { type: 'boolean', title: 'Hide the theme drawings', description: 'Leave out the turkeys, leaves, snowmen… e.g. when the background photo says enough.', default: false },
      audience: {
        type: 'string',
        title: 'Audience',
        description: 'Elementary gets a cute Halloween; middle and high school a spooky one.',
        default: 'elementary',
        enum: ['elementary', 'secondary'],
        'x-enumLabels': ['Elementary school', 'Middle & high school']
      },
      motion: {
        type: 'string',
        title: 'Motion',
        default: 'gentle',
        enum: ['gentle', 'full', 'none'],
        'x-enumLabels': ['Gentle', 'Full', 'None']
      },
      date: { type: 'string', format: 'date', title: 'Preview as of (testing only)', description: 'Pretend today is another day. Leave empty.' }
    }
  },
  launch: {
    baseUrl: 'https://example.invalid/countdown/',
    template: '{?target,headline,message,time,arrived,theme,background,nodrawings,audience,motion,date}'
  }
}
writeFileSync(join(DIST, '.well-known/signage-app.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`✓ countdown built (${backgrounds.length} background photo(s))`)
