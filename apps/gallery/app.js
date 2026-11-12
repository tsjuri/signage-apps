/* Gallery — photos from a private Google Drive folder, one at a time, in a
 * themed frame.
 *
 * URL settings (Anthias builds them from the app's settings form):
 *   source     the School Gallery Apps Script URL (…/exec)
 *   key        its secret key
 *   folder     which of the script's folders (empty = its first one)
 *   title      the big title (empty = the theme's own, e.g. "Halloween Gallery")
 *   theme      auto (by date) | halloween | fall | thanksgiving | winter |
 *              valentines | spring | summer | endofyear | plain
 *   audience   elementary (cute Halloween) | secondary (spooky Halloween)
 *   order      name (default) | shuffle (a new order each day)
 *   motion     gentle (default) | full | none
 *   date       YYYY-MM-DD: pretend it's another day (for previewing "auto")
 *
 * Timing: the asset's duration in Anthias is shared out, about 8 seconds a
 * photo; the next showing carries on with the next photos. A page can't ask the
 * player for the duration, so it's measured (see trivia-facts); the very first
 * showing uses 8 seconds a photo.
 */
;(function () {
  'use strict'

  var params = new URLSearchParams(window.location.search)
  var get = function (k) { return (params.get(k) || '').trim() }
  var pick = function (v, list, def) { return list.indexOf(v) >= 0 ? v : def }
  var MOTION = pick(get('motion'), ['gentle', 'full', 'none'], 'gentle')
  var AUDIENCE = pick(get('audience'), ['elementary', 'secondary'], 'elementary')
  var PER_PHOTO = 8 // seconds, roughly
  document.documentElement.className += ' motion-' + MOTION

  function today() {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(get('date'))
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date()
  }

  // ---------- theme ----------
  var THEMES = window.GALLERY_THEMES
  var ART = window.GALLERY_ART
  function themeName() {
    var t = get('theme')
    if (!t || t === 'auto' || !(THEMES[t] || t === 'halloween')) t = THEMES.byMonth[today().getMonth()]
    if (t === 'halloween') t = 'halloween-' + AUDIENCE
    return t
  }
  function applyTheme() {
    var th = THEMES[themeName()]
    var root = document.documentElement.style
    root.setProperty('--bg1', th.bg1)
    root.setProperty('--bg2', th.bg2)
    root.setProperty('--ink', th.ink)
    root.setProperty('--accent', th.accent)
    root.setProperty('--frame', th.frame)
    document.getElementById('title').textContent = get('title') || th.title
    var back = document.getElementById('decor-back')
    var front = document.getElementById('decor-front')
    back.innerHTML = ''
    front.innerHTML = ''
    th.decor.forEach(function (d, i) {
      var size = 'calc(var(--u) * ' + d.size + ')'
      var svg = '<svg viewBox="0 0 100 100" class="' + d.motion + '" style="width:' + size + ';height:' + size +
        ';left:calc(' + d.x + '% - ' + (d.x / 100) + ' * ' + size + ');top:calc(' + d.y + '% - ' + (d.y / 100) + ' * ' + size + ')' +
        ';--r:' + d.r + 'deg;--t:' + (4 + (i % 4) * 1.3) + 's;--d:' + (-(i * 1.7) % 5) + 's' +
        (d.rx ? ';--rx:' + d.rx + ';--ry:' + d.ry : '') + ';transform:rotate(' + d.r + 'deg)">' + (ART[d.art] || '') + '</svg>'
      ;(d.layer === 'front' ? front : back).insertAdjacentHTML('beforeend', svg)
    })
  }

  // ---------- duration (measured) ----------
  var LOADED_AT = Date.now()
  var DUR_KEY = 'gallery:duration'
  function rememberDuration() {
    var s = (Date.now() - LOADED_AT) / 1000
    if (s >= 4 && s <= 900) { try { localStorage.setItem(DUR_KEY, String(Math.round(s * 10) / 10)) } catch (e) {} }
  }
  window.addEventListener('pagehide', rememberDuration)
  window.addEventListener('beforeunload', rememberDuration)
  document.addEventListener('visibilitychange', function () { if (document.hidden) rememberDuration() })
  // How many photos fit in one showing, and how long each gets.
  function plan() {
    var d = 0
    try { d = parseFloat(localStorage.getItem(DUR_KEY)) || 0 } catch (e) {}
    if (d < 4) return { secs: PER_PHOTO, count: 0 } // not measured yet: just keep going
    var n = Math.max(1, Math.round(d / PER_PHOTO))
    return { secs: d / n, count: n }
  }

  // ---------- photos ----------
  var SOURCE = get('source')
  var LIST_KEY = 'gallery:list:' + SOURCE + ':' + get('folder')
  function feed(extra) {
    var u = SOURCE + (SOURCE.indexOf('?') < 0 ? '?' : '&') + 'key=' + encodeURIComponent(get('key')) + (get('folder') ? '&folder=' + encodeURIComponent(get('folder')) : '') + extra
    return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('feed ' + r.status); return r.json() })
  }
  function loadList() {
    if (!SOURCE) return Promise.resolve(samples())
    var cached = null
    try { cached = JSON.parse(localStorage.getItem(LIST_KEY) || 'null') } catch (e) {}
    var fresh = feed('&list=1').then(function (j) {
      if (j.error) throw new Error(j.error)
      var list = j.photos || []
      try { localStorage.setItem(LIST_KEY, JSON.stringify(list)) } catch (e) {}
      return list
    })
    return cached && cached.length ? Promise.resolve(cached).then(function (c) { fresh.catch(function () {}); return c }) : fresh
  }
  var srcCache = {}
  function photoSrc(p) {
    if (p.src) return Promise.resolve(p.src)
    if (srcCache[p.id]) return srcCache[p.id]
    srcCache[p.id] = feed('&photo=' + encodeURIComponent(p.id)).then(function (j) {
      if (!j.src) throw new Error(j.error || 'no photo')
      return j.src
    })
    srcCache[p.id].catch(function () { delete srcCache[p.id] })
    return srcCache[p.id]
  }

  // Shown when no feed is set: soft colour cards so the theme can be seen.
  function samples() {
    var cols = [['#f6c945', '#f08a24'], ['#8fc3ea', '#3a5bd9'], ['#c9e3b0', '#5aa04a'], ['#f7a6bd', '#c23a64']]
    return cols.map(function (c, i) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs>' +
        '<rect width="1600" height="1000" fill="url(#g)"/><circle cx="' + (400 + i * 250) + '" cy="380" r="160" fill="#fff" opacity=".35"/><path d="M0 1000 L520 560 L860 820 L1160 520 L1600 900 L1600 1000Z" fill="#fff" opacity=".3"/>' +
        '<text x="800" y="930" font-family="sans-serif" font-size="56" fill="#fff" text-anchor="middle" opacity=".9">Sample photo ' + (i + 1) + ' — add the Photo feed in this app’s settings</text></svg>'
      return { id: 's' + i, name: 'sample' + i, src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) }
    })
  }

  var dayNumber = function () { var t = today(); return Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5) }
  function ordered(list) {
    if (get('order') !== 'shuffle') return list
    var a = list.slice(), h = 2166136261 ^ dayNumber()
    var r = function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t }
    return a
  }

  // ---------- showing ----------
  var box = document.getElementById('photos')
  var list = []
  var index = 0
  var current = null
  var PLAN = plan()
  var SECS = PLAN.secs
  var POS_KEY = 'gallery:pos:' + LIST_KEY
  document.documentElement.style.setProperty('--secs', (SECS + 1.5) + 's')

  function show(i) {
    if (!list.length) return
    index = ((i % list.length) + list.length) % list.length
    try { localStorage.setItem(POS_KEY, String(index + 1)) } catch (e) {}
    var p = list[index]
    photoSrc(p).then(function (src) {
      var shot = document.createElement('div')
      shot.className = 'shot'
      var tilt = ((index * 37) % 5) - 2
      shot.innerHTML = '<div class="print" style="--tilt:' + (tilt * 0.6) + 'deg"><div class="print__pic"><img alt=""></div></div>'
      var img = shot.querySelector('img')
      img.style.setProperty('--dx', (((index * 53) % 7) - 3) * 0.6 + '%')
      img.style.setProperty('--dy', (((index * 29) % 5) - 2) * 0.6 + '%')
      img.onload = function () {
        box.appendChild(shot)
        setTimeout(function () { shot.classList.add('is-on') }, 30)
        var old = current
        current = shot
        if (old) {
          old.classList.remove('is-on')
          setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old) }, 1300)
        }
        document.documentElement.dataset.state = 'ready'
        if (list.length > 1) photoSrc(list[(index + 1) % list.length]).catch(function () {}) // get the next one ready
      }
      img.src = src
    }).catch(function () {
      if (list.length > 1) setTimeout(function () { show(index + 1) }, 1000) // skip a photo that won't load
    })
  }

  function status(msg) {
    var s = document.getElementById('status')
    s.textContent = msg
    s.hidden = !msg
  }

  function start() {
    applyTheme()
    loadList().then(function (l) {
      list = ordered(l)
      if (!list.length) {
        status('No photos in the folder yet')
        document.documentElement.dataset.state = 'ready'
        return
      }
      var resume = 0
      try { resume = parseInt(localStorage.getItem(POS_KEY), 10) || 0 } catch (e) {}
      show(resume)
      // The last photo of a showing stays until the player moves on, so the
      // next one never flashes up at the very end. (If the page is never
      // switched away, it carries on after a while.)
      var shown = 1
      var timer = setInterval(function () {
        if (PLAN.count && shown >= PLAN.count) {
          clearInterval(timer)
          setTimeout(function () { setInterval(function () { show(index + 1) }, SECS * 1000) }, SECS * 1000)
          return
        }
        shown++
        show(index + 1)
      }, SECS * 1000)
    }).catch(function () {
      status('Photos not available right now')
      document.documentElement.dataset.state = 'ready'
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
