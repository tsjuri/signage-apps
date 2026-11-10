#!/usr/bin/env bun
/* global Bun */
// Builds the static site into ./dist for GitHub Pages. The degraded-mode support
// floor, the CSS down-leveling recipe (cascade-layers flatten + Lightning CSS),
// the JS bundler, and the inline degraded-mode gate all come from
// @screenly-labs/signage-kit. This file only orchestrates the app-specific steps.

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { bundleJs, injectGate, processCss } from '@screenly-labs/signage-kit/build'
import { run as syncFonts } from './sync-fonts.js'

const DIST = 'dist'
const DOMAIN = 'birthday.srly.io'

// 1. Vendor the Bun-managed webfonts into ./assets.
await syncFonts()

// 2. Fresh dist/, copy the web root + manifest, and copy the page shell with the
//    shared degraded-mode gate injected before the stylesheet.
await rm(DIST, { recursive: true, force: true })
await mkdir(`${DIST}/static/styles`, { recursive: true })
await mkdir(`${DIST}/static/js`, { recursive: true })
await cp('assets/static/fonts', `${DIST}/static/fonts`, { recursive: true })
await cp('assets/static/images', `${DIST}/static/images`, { recursive: true })
await cp('.well-known', `${DIST}/.well-known`, { recursive: true })
try {
  await writeFile(`${DIST}/index.html`, injectGate(await readFile('index.html', 'utf8')))
} catch (error) {
  console.error('✗ HTML build failed')
  console.error(error)
  process.exit(1)
}

// 3. Tailwind -> the kit's CSS pipeline (flatten @layer, down-level to the floor).
const cssOut = `${DIST}/static/styles/main.css`
const tailwind = Bun.spawn(
  ['node_modules/.bin/tailwindcss', '--input', 'assets/static/styles/tailwind.css', '--output', cssOut],
  { stdout: 'inherit', stderr: 'inherit' }
)
if ((await tailwind.exited) !== 0) {
  console.error('✗ Tailwind build failed')
  process.exit(1)
}
try {
  await writeFile(cssOut, await processCss(await readFile(cssOut, 'utf8'), { flattenLayers: true, filename: cssOut }))
} catch (error) {
  console.error(`✗ CSS build failed (${cssOut})`)
  console.error(error)
  process.exit(1)
}
console.log(`✓ CSS: ${cssOut}`)

// 4. Client TS -> the kit's bundler (self-contained IIFE at the floor's syntax level).
try {
  await bundleJs('assets/static/js/main.ts', `${DIST}/static/js/main.js`)
} catch (error) {
  console.error('✗ JS build failed')
  console.error(error)
  process.exit(1)
}
console.log(`✓ JS: ${DIST}/static/js/main.js`)

// 5. Cache-busting: stamp a content hash of the built JS+CSS into the page's ?v= URLs.
const hasher = new Bun.CryptoHasher('sha256')
for (const path of [`${DIST}/static/js/main.js`, cssOut]) hasher.update(await readFile(path))
const version = hasher.digest('hex').slice(0, 10)
await writeFile(`${DIST}/index.html`, (await readFile(`${DIST}/index.html`, 'utf8')).replaceAll('__ASSET_VERSION__', version))
console.log(`✓ Stamped asset version ${version}`)

// 6. Custom domain for GitHub Pages.
await writeFile(`${DIST}/CNAME`, `${DOMAIN}\n`)
console.log('Build complete → dist/')
