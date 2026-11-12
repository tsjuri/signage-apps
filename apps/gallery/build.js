#!/usr/bin/env bun
// Gallery: photos from a private Google Drive folder, one at a time, in a themed frame.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const DIST = 'dist'
const FILES = { 'app.js': 'app.js', 'themes.js': 'themes.js', 'styles.css': 'styles.css' }
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
  id: 'gallery',
  name: 'Gallery',
  description:
    'A photo slideshow from a private Google Drive folder, one photo at a time in a themed frame: Halloween (cute for elementary, spooky for middle and high school), fall, Thanksgiving, winter, Valentine’s, spring, summer and end of year, or picked automatically by date. Photos stay private: the school’s Apps Script hands them out only with its secret key.',
  summary: 'School photos from a private Drive folder, in a seasonal frame.',
  tags: ['School', 'Photos', 'Slideshow'],
  playback: { pacing: 'fixed', refreshIntervalS: 3600 },
  settings: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      source: {
        type: 'string',
        title: 'Photo feed URL',
        description: 'The School Gallery Apps Script web-app URL (ends in /exec). Leave empty to see sample photos.',
        'x-widget': 'url'
      },
      key: { type: 'string', title: 'Secret key', description: 'The KEY from the script.', 'x-widget': 'text' },
      folder: { type: 'string', title: 'Folder', description: 'Optional: the folder’s short name from the script’s FOLDERS list. Empty = its first folder.', 'x-widget': 'text' },
      title: { type: 'string', title: 'Title', description: 'Leave empty for the theme’s own, e.g. “Halloween Gallery”.', 'x-widget': 'text' },
      theme: {
        type: 'string',
        title: 'Theme',
        default: 'auto',
        enum: ['auto', 'halloween', 'fall', 'thanksgiving', 'winter', 'valentines', 'spring', 'summer', 'endofyear', 'plain'],
        'x-enumLabels': ['Automatic (by date)', 'Halloween', 'Fall', 'Thanksgiving', 'Winter', 'Valentine’s', 'Spring', 'Summer', 'End of year', 'Plain']
      },
      audience: {
        type: 'string',
        title: 'Audience',
        description: 'Elementary gets a cute Halloween; middle and high school a spooky one.',
        default: 'elementary',
        enum: ['elementary', 'secondary'],
        'x-enumLabels': ['Elementary school', 'Middle & high school']
      },
      order: { type: 'string', title: 'Order', default: 'name', enum: ['name', 'shuffle'], 'x-enumLabels': ['By file name', 'Shuffled (new order each day)'] },
      motion: {
        type: 'string',
        title: 'Motion',
        description: 'Gentle: photos fade and zoom slowly, decorations sway. None: no movement.',
        default: 'gentle',
        enum: ['gentle', 'full', 'none'],
        'x-enumLabels': ['Gentle', 'Full', 'None']
      },
      date: { type: 'string', format: 'date', title: 'Preview as of (testing only)', description: 'Shows the “Automatic” theme for another day. Leave empty.' }
    }
  },
  launch: {
    baseUrl: 'https://example.invalid/gallery/',
    template: '{?source,key,folder,title,theme,audience,order,motion,date}'
  }
}
writeFileSync(join(DIST, '.well-known/signage-app.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log('✓ gallery built')
