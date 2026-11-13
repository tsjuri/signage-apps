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
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
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
  clock: { props: 'env="" country="US" timezone="America/New_York"' },
  // Default location Kingston, NY; a screen can override it with the Location setting.
  moon: { props: 'lat="41.93" lng="-74.00" city="Kingston" country="United States" timezone="America/New_York"' }
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
  // Offline cache: every app page registers the site-wide service worker
  // (shared/sw.js, published at the site root) and hands it its own files.
  const page = join(out, 'index.html')
  if (existsSync(page)) {
    const html = readFileSync(page, 'utf8')
    let out2 = html
    if (!out2.includes('serviceWorker.register')) out2 = out2.replace('</body>', `${OFFLINE}</body>`)
    if (BG_APPS.includes(id) && !out2.includes('signage-bg')) out2 = out2.replace('</body>', `${BG_SCRIPT}</body>`)
    writeFileSync(page, out2)
  }
}
const BG_APPS = ['birthday', 'capitals', 'clock', 'world-clock', 'timer', 'moon', 'quotes', 'word', 'learning-clock', 'observances-sheet', 'on-this-day', 'trivia-facts']
const BACKGROUNDS = existsSync(join(ROOT, 'media/backgrounds'))
  ? readdirSync(join(ROOT, 'media/backgrounds')).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f)).sort()
  : []
const BG_SCRIPT = `<script>${readFileSync(join(ROOT, 'shared/background.js'), 'utf8')}</script>`
const OFFLINE = `<script>(function(){if(!('serviceWorker' in navigator))return;navigator.serviceWorker.register('../sw.js',{scope:'../'}).then(function(){return navigator.serviceWorker.ready}).then(function(r){var urls=[location.href].concat(performance.getEntriesByType('resource').map(function(e){return e.name}));(r.active||navigator.serviceWorker.controller).postMessage({store:urls})}).catch(function(){})})()</script>`


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
  // Background photo option (shared/background.js) for most apps.
  if (BG_APPS.includes(id)) {
    clean.settings = clean.settings || { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', properties: {} }
    clean.settings.properties = clean.settings.properties || {}
    clean.settings.properties.background = {
      type: 'string',
      title: 'Background',
      description: 'The app’s own, or a photo or GIF from the media/backgrounds folder.',
      default: '',
      enum: ['', ...BACKGROUNDS],
      'x-enumLabels': ['The app’s own', ...BACKGROUNDS.map((f) => f.replace(/\.[a-z]+$/i, '').replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase()))]
    }
    // trivia-facts: a second background, for the fun facts
    if (id === 'trivia-facts') {
      const bgSetting = clean.settings.properties.background
      bgSetting.title = 'Background for quiz questions'
      bgSetting.description = 'A photo or GIF from the media/backgrounds folder. If only one of the two is set, it is used for both.'
      clean.settings.properties.background2 = { ...bgSetting, title: 'Background for fun facts', enum: [...bgSetting.enum], 'x-enumLabels': [...bgSetting['x-enumLabels']] }
    }
    clean.launch = clean.launch || {}
    const t = clean.launch.template
    const extra = id === 'trivia-facts' ? 'background,background2' : 'background'
    clean.launch.template = t ? t.replace(/\}$/, ',' + extra + '}') : '{?' + extra + '}'
  }
  // Anthias names a new asset after the label of the first dropdown with
  // x-enumLabels (meant for the RSS Reader's feed), so "On This Day" became
  // "Gentle". Use the labels themselves as the option values instead, so no
  // dropdown carries x-enumLabels and the asset gets the app's own name; a
  // tiny script in the page turns a label back into the value the app expects.
  const map = {}
  for (const [key, sch] of Object.entries(clean.settings?.properties ?? {})) {
    if (sch['x-asset-name']) { delete sch['x-asset-name']; continue } // this one should name the asset
    if (!sch.enum || !sch['x-enumLabels']) continue
    const labels = sch.enum.map((v, i) => sch['x-enumLabels'][i] || (v === '' ? 'Default' : String(v)))
    if (new Set(labels).size !== labels.length) continue
    map[key] = Object.fromEntries(labels.map((l, i) => [l, sch.enum[i]]))
    if ('default' in sch) sch.default = labels[sch.enum.indexOf(sch.default)] ?? labels[0]
    sch.enum = labels
    delete sch['x-enumLabels']
  }
  const page = join(out, 'index.html')
  if (Object.keys(map).length && existsSync(page)) {
    const fix = `<script>(function(){var M=${JSON.stringify(map)},p=new URLSearchParams(location.search),n=0;for(var k in M){var v=p.get(k);if(v!==null&&Object.prototype.hasOwnProperty.call(M[k],v)){p.set(k,M[k][v]);n++}}if(n)history.replaceState(null,'',location.pathname+'?'+p+location.hash)})()</script>`
    const html = readFileSync(page, 'utf8')
    writeFileSync(page, html.includes('<head>') ? html.replace('<head>', `<head>${fix}`) : fix + html)
  }
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
      const render = `
        import App from './src/components/App'
        const html = (<App ${SSR[id].props} v="${Date.now().toString(36)}" />).toString()
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
    // Manifest source, first that exists: Worker apps' signage-app.json, a static
    // app's checked-in .well-known, or one the app's own build generated.
    const manifestSrc = [
      join(dir, 'signage-app.json'),
      join(dir, '.well-known/signage-app.json'),
      join(out, '.well-known/signage-app.json')
    ].find((p) => existsSync(p))
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
copyFileSync(join(ROOT, 'shared/sw.js'), join(SITE, 'sw.js'))
// The original Observances app was replaced by observances-sheet (same slides, plus the
// school's Google Sheet). Players that still have the old URL are sent on, settings kept.
mkdirSync(join(SITE, 'observances'), { recursive: true })
writeFileSync(
  join(SITE, 'observances', 'index.html'),
  `<!doctype html><meta charset="utf-8"><script>location.replace('../observances-sheet/' + location.search)</script>`
)
// Shared images (banner photos etc.), served at <site>/media/<file>.
if (existsSync(join(ROOT, 'media'))) cpSync(join(ROOT, 'media'), join(SITE, 'media'), { recursive: true })
writeFileSync(
  join(SITE, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>signage-apps</title>
<h1>signage-apps</h1><p>Catalog index: <a href="manifest.json">manifest.json</a></p>
<ul>${index.map((a) => `<li><a href="${a.id}/">${a.id}</a></li>`).join('')}</ul>
<p>Source: <a href="${REPO}">${REPO}</a> (AGPL-3.0, adapted from Screenly-Labs).</p>\n`
)

console.log(`\nBuilt ${index.length} app(s) into site/${failed.length ? `; FAILED: ${failed.join(', ')}` : ''}`)
if (failed.length) process.exit(1)
