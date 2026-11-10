#!/usr/bin/env bun
// Builds every app in ./apps into ./site, ready for GitHub Pages:
//   site/<id>/...                     the app itself
//   site/<id>/.well-known/signage-app.json   its manifest
//   site/manifest.json                the catalog index Anthias reads
//
// The apps are adapted from Screenly-Labs' open-source signage apps (AGPL-3.0).
// Changes made here: Screenly badge and Google Analytics removed, paths rewritten
// so each app can live in a sub-folder, manifests pointed at this site.
//
// Env:
//   SITE_ORIGIN  e.g. https://tsjuri.github.io        (default below)
//   SITE_BASE    e.g. /signage-apps  (path the site is served under; "" for a custom domain)
//   REPO_URL     source link written into each manifest

import { $ } from 'bun'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ORIGIN = (process.env.SITE_ORIGIN || 'https://tsjuri.github.io').replace(/\/$/, '')
const BASE = (process.env.SITE_BASE ?? '/signage-apps').replace(/\/$/, '')
const REPO = process.env.REPO_URL || 'https://github.com/tsjuri/signage-apps'
const VENDOR = process.env.VENDOR || 'signage-apps'

const ROOT = import.meta.dir
const SITE = join(ROOT, 'site')
const only = process.argv.slice(2)

// Worker-based apps that are rendered to static HTML here instead of by Cloudflare.
const SSR = {
  // Rendered once with a fixed location; the clock itself runs client-side.
  clock: { country: 'US', timezone: 'America/New_York' }
}

rmSync(SITE, { recursive: true, force: true })
mkdirSync(SITE, { recursive: true })

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

const stripHtml = (html) =>
  html
    // Google Analytics: loader tag plus the inline config script that follows it
    .replace(/<!--\s*Google tag \(gtag\.js\)\s*-->\s*/g, '')
    .replace(/<script[^>]*googletagmanager\.com[^>]*><\/script>\s*(<script>[\s\S]*?gtag\([\s\S]*?<\/script>)?/g, '')
    // Sentry error reporting (Screenly's account)
    .replace(/<script[^>]*sentry-cdn\.com[^>]*><\/script>/g, '')
    // "Powered by Screenly" badge
    .replace(/<a\s+class="brand"[\s\S]*?<\/a>/g, '')

const rebase = (text, id) => text.replace(/(["'`(=])\/static\//g, `$1${BASE}/${id}/static/`)

function postProcess(id, out) {
  rmSync(join(out, 'CNAME'), { force: true })
  for (const f of walk(out)) {
    if (f.includes('/.well-known/')) continue
    if (!/\.(html|css|js|json|svg)$/.test(f)) continue
    let s = readFileSync(f, 'utf8')
    if (f.endsWith('.html')) s = stripHtml(s)
    s = rebase(s, id)
    writeFileSync(f, s)
  }
  rmSync(join(out, 'static/images/screenly-logo.svg'), { force: true })
}

function writeManifest(id, src, out) {
  const m = JSON.parse(readFileSync(src, 'utf8'))
  const url = `${ORIGIN}${BASE}/${id}/`
  m.id = id
  m.vendor = VENDOR
  m.homepage = url
  m.source = `${REPO}/tree/main/apps/${id}`
  m.support = `${REPO}/issues`
  if (m.launch) m.launch.baseUrl = url
  const scrub = (v) =>
    typeof v === 'string'
      ? v.replace(/,?\s*e\.g\. The Screenly Team/g, '').replace(/The Screenly Team/g, 'The Office').replace(/Screenly /g, '')
      : Array.isArray(v)
        ? v.map(scrub)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)]))
          : v
  const clean = scrub(m)
  mkdirSync(join(out, '.well-known'), { recursive: true })
  writeFileSync(join(out, '.well-known/signage-app.json'), `${JSON.stringify(clean, null, 2)}\n`)
  return clean
}

const apps = readdirSync(join(ROOT, 'apps')).filter((a) => !only.length || only.includes(a)).sort()
const index = []
const failed = []

for (const id of apps) {
  const dir = join(ROOT, 'apps', id)
  const out = join(SITE, id)
  console.log(`\n── ${id}`)
  try {
    await $`bun install`.cwd(dir).quiet()
    await $`bun run build`.cwd(dir)

    if (SSR[id]) {
      // Render the Worker's page once, then serve its assets statically.
      const { country, timezone } = SSR[id]
      const render = `
        import App from './src/components/App'
        const html = (<App env="" country="${country}" timezone="${timezone}" v="${Date.now().toString(36)}" />).toString()
        await Bun.write('dist/index.html', await html)
      `
      writeFileSync(join(dir, '.render.jsx'), render)
      rmSync(join(dir, 'dist'), { recursive: true, force: true })
      mkdirSync(join(dir, 'dist'), { recursive: true })
      await $`bun .render.jsx`.cwd(dir)
      rmSync(join(dir, '.render.jsx'))
      cpSync(join(dir, 'assets/static'), join(dir, 'dist/static'), { recursive: true })
    }

    cpSync(join(dir, 'dist'), out, { recursive: true })
    postProcess(id, out)
    const manifestSrc = existsSync(join(dir, 'signage-app.json'))
      ? join(dir, 'signage-app.json')
      : join(dir, '.well-known/signage-app.json')
    writeManifest(id, manifestSrc, out)
    index.push({ id, manifest: `${ORIGIN}${BASE}/${id}/.well-known/signage-app.json` })
    console.log(`✓ ${id}`)
  } catch (e) {
    console.error(`✗ ${id}: ${e.message}`)
    failed.push(id)
  }
}

writeFileSync(
  join(SITE, 'manifest.json'),
  `${JSON.stringify({ apps: index, indexVersion: '1', updated: new Date().toISOString() }, null, 2)}\n`
)
writeFileSync(join(SITE, '.nojekyll'), '')
writeFileSync(
  join(SITE, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>signage-apps</title>
<h1>signage-apps</h1><p>Catalog index: <a href="manifest.json">manifest.json</a></p>
<ul>${index.map((a) => `<li><a href="${a.id}/">${a.id}</a></li>`).join('')}</ul>
<p>Source: <a href="${REPO}">${REPO}</a> (AGPL-3.0, adapted from Screenly-Labs).</p>\n`
)

console.log(`\nBuilt ${index.length} app(s) into site/${failed.length ? `; FAILED: ${failed.join(', ')}` : ''}`)
if (failed.length) process.exit(1)
