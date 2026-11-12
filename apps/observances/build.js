#!/usr/bin/env bun
// Assembles dist/ for the Observances app and writes its catalog manifest.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const DIST = 'dist'
const FILES = ['app.js', 'data.js', 'icons.js', 'styles.css']
rmSync(DIST, { recursive: true, force: true })
mkdirSync(join(DIST, 'fonts'), { recursive: true })
mkdirSync(join(DIST, '.well-known'), { recursive: true })

const h = createHash('sha256')
for (const f of [...FILES, 'index.html']) h.update(readFileSync(f))
const V = h.digest('hex').slice(0, 10)
for (const f of FILES) copyFileSync(f, join(DIST, f))
writeFileSync(join(DIST, 'index.html'), readFileSync('index.html', 'utf8').replaceAll('__V__', V))
for (const w of [500, 600, 800]) {
  copyFileSync(`node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2`, join(DIST, `fonts/poppins-${w}.woff2`))
}

const toggle = (title, description) => ({ type: 'boolean', title, description, default: false })
const manifest = {
  manifestVersion: '1',
  id: 'observances',
  name: 'Observances',
  description:
    'Heritage months, awareness months, school weeks and special days, one animated slide each. The app knows the calendar: it shows only what is current today, with days and weeks appearing a few days ahead, and rotates through them. Hide whole kinds, skip any observance, or change the message on a slide.',
  summary: 'This month’s heritage and awareness slides, automatically.',
  tags: ['School', 'Calendar', 'Celebration'],
  playback: { pacing: 'fixed', refreshIntervalS: 3600 },
  settings: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      seconds: {
        type: 'integer',
        title: 'Seconds per slide',
        description: 'Set the asset’s duration to this times the number of slides to see them all in one go; otherwise it carries on where it left off next time round.',
        default: 12,
        minimum: 4,
        maximum: 120
      },
      hideHeritage: toggle('Hide heritage months', 'e.g. Hispanic Heritage Month, Black History Month'),
      hideAwareness: toggle('Hide awareness & safety', 'e.g. Bullying Prevention, Fire Prevention Week'),
      hideSchool: toggle('Hide school weeks', 'e.g. Teacher Appreciation Week, School Library Month'),
      hideDays: toggle('Hide special days', 'e.g. Veterans Day, Earth Day, Pi Day'),
      hideHolidays: toggle('Hide holiday greetings', 'e.g. Thanksgiving, Happy Holidays, Lunar New Year'),
      skip: {
        type: 'array',
        title: 'Skip these',
        description: 'One per row; part of the name is enough, e.g. Pi Day, Columbus, Red Ribbon.',
        items: { type: 'string', title: 'Observance to skip' }
      },
      msg: {
        type: 'array',
        title: 'Our own message',
        description: 'Replace the text on a slide: the observance (part of its name) and your message.',
        items: {
          type: 'object',
          'x-format': '{name}|{text}',
          required: ['name', 'text'],
          properties: {
            name: { type: 'string', title: 'Observance' },
            text: { type: 'string', title: 'Message' }
          }
        }
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
    baseUrl: 'https://example.invalid/observances/',
    template: '{?seconds,hideHeritage,hideAwareness,hideSchool,hideDays,hideHolidays,skip*,msg*,date}'
  }
}
writeFileSync(join(DIST, '.well-known/signage-app.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log('✓ observances built')
