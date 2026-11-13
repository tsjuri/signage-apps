/* Countdown — a poster that counts down the days to an event.
 *
 * URL settings:
 *   target     YYYY-MM-DD, the day it happens (required)
 *   time       HH:MM (optional): on the day itself, count down the hours to it
 *   headline   big text on the left (empty = the theme's own, e.g. "Give Thanks"; | = line break)
 *   message    one or two lines under the count (| = new line)
 *   arrived    shown once the day is here (default "Today!")
 *   theme      auto (by the target's month) | halloween | fall | thanksgiving | winter |
 *              valentines | spring | summer | endofyear | plain
 *   audience   elementary | secondary (Halloween: cute or spooky)
 *   background a file in the site's media/backgrounds/ folder (empty = the theme's colours)
 *   nodrawings=true  leave out the theme's drawings (separate from the background)
 *   motion     gentle (default) | full | none
 *   date       YYYY-MM-DD: pretend today is another day (testing)
 *
 * Themes and drawings are the Gallery's (apps/gallery/themes.js).
 */
;(function () {
  'use strict'

  var params = new URLSearchParams(window.location.search)
  var get = function (k) { return (params.get(k) || '').trim() }
  var pick = function (v, list, def) { return list.indexOf(v) >= 0 ? v : def }
  var MOTION = pick(get('motion'), ['gentle', 'full', 'none'], 'gentle')
  var AUDIENCE = pick(get('audience'), ['elementary', 'secondary'], 'elementary')
  document.documentElement.className += ' motion-' + MOTION

  var THEMES = window.GALLERY_THEMES
  var ART = window.GALLERY_ART
  // Headline and the colours of the big number, per theme.
  var POSTER = {
    'halloween-elementary': { headline: 'Happy|Halloween', hot: ['#ffd36b', '#f08a24'] },
    'halloween-secondary': { headline: 'Halloween', hot: ['#ffb067', '#d9302b'] },
    fall: { headline: 'Hello|Fall', hot: ['#ffe08a', '#e0702b'] },
    thanksgiving: { headline: 'Give|Thanks', hot: ['#ff9a3c', '#e2382b'], bg1: '#5a2a24', bg2: '#1f0f10', accent: '#f6c945' },
    winter: { headline: 'Winter|Break', hot: ['#ffffff', '#9fd0ff'] },
    valentines: { headline: 'Valentine’s|Day', hot: ['#ffe0ea', '#ffffff'] },
    spring: { headline: 'Spring|Break', hot: ['#fff6c9', '#ffffff'] },
    summer: { headline: 'Summer|Vacation', hot: ['#fff3b0', '#ffd36b'] },
    endofyear: { headline: 'Last Day|of School', hot: ['#ffe58a', '#f6c945'] },
    plain: { headline: 'Coming|Up', hot: ['#f6c945', '#f08a24'] }
  }

  function dayOf(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
  }
  function now() {
    var d = dayOf(get('date'))
    if (!d) return new Date()
    var n = new Date()
    d.setHours(n.getHours(), n.getMinutes(), n.getSeconds())
    return d
  }
  var TARGET = dayOf(get('target'))

  function themeName() {
    var t = get('theme')
    if (!t || t === 'auto' || !(THEMES[t] || t === 'halloween')) t = THEMES.byMonth[(TARGET || now()).getMonth()]
    if (t === 'halloween') t = 'halloween-' + AUDIENCE
    return t
  }

  function applyTheme() {
    var name = themeName()
    var th = THEMES[name]
    var po = POSTER[name] || POSTER.plain
    var root = document.documentElement.style
    root.setProperty('--bg1', po.bg1 || th.bg1)
    root.setProperty('--bg2', po.bg2 || th.bg2)
    root.setProperty('--ink', th.ink)
    root.setProperty('--accent', po.accent || th.accent)
    root.setProperty('--hot1', po.hot[0])
    root.setProperty('--hot2', po.hot[1])
    lines(document.getElementById('headline'), get('headline') || po.headline, 'br')
    lines(document.getElementById('message'), get('message'), 'p')
    var bg = get('background')
    if (bg && bg !== 'none') {
      // A photo background; the theme keeps its colours for the text and rules.
      document.documentElement.classList.add('has-photo')
      document.querySelector('.stage').style.backgroundImage = 'url("../media/backgrounds/' + encodeURIComponent(bg) + '")'
    }
    if (/^(1|true|yes)$/i.test(get('nodrawings'))) return
    var back = document.getElementById('decor-back')
    var front = document.getElementById('decor-front')
    // The Gallery's decorations, pushed out to the side margins and a bit
    // smaller, so they frame the poster instead of covering it.
    th.decor.forEach(function (g, i) {
      var d = { art: g.art, size: Math.min(g.size, 11) * 0.85, x: g.x < 50 ? g.x * 0.06 : 97 + (g.x - 50) * 0.06, y: g.y, r: g.r, motion: g.motion, layer: g.layer, rx: g.rx, ry: g.ry }
      var size = 'calc(var(--u) * ' + d.size + ')'
      var svg = '<svg viewBox="0 0 100 100" class="' + d.motion + '" style="width:' + size + ';height:' + size +
        ';left:calc(' + d.x + '% - ' + (d.x / 100) + ' * ' + size + ');top:calc(' + d.y + '% - ' + (d.y / 100) + ' * ' + size + ')' +
        ';--r:' + d.r + 'deg;--t:' + (4 + (i % 4) * 1.3) + 's;--d:' + (-(i * 1.7) % 5) + 's' +
        (d.rx ? ';--rx:' + d.rx + ';--ry:' + d.ry : '') + ';transform:rotate(' + d.r + 'deg)">' + (ART[d.art] || '') + '</svg>'
      ;(d.layer === 'front' ? front : back).insertAdjacentHTML('beforeend', svg)
    })
  }

  // "A|B" -> A<br>B (headline) or <p>A</p><p>B</p> (message), as text, never HTML
  function lines(el, text, how) {
    el.textContent = ''
    text.split('|').map(function (s) { return s.trim() }).filter(Boolean).forEach(function (s, i) {
      if (how === 'br') {
        if (i) el.appendChild(document.createElement('br'))
        el.appendChild(document.createTextNode(s))
      } else {
        var p = document.createElement('p')
        p.textContent = s
        el.appendChild(p)
      }
    })
  }

  function update() {
    var num = document.getElementById('num')
    var unit = document.getElementById('unit')
    var arrived = get('arrived') || 'Today!'
    num.classList.remove('is-text')
    if (!TARGET) {
      num.textContent = '?'
      unit.textContent = 'Set a date'
      return
    }
    var n = now()
    var today = new Date(n.getFullYear(), n.getMonth(), n.getDate())
    var days = Math.round((TARGET - today) / 864e5)
    var t = /^(\d{1,2}):(\d{2})$/.exec(get('time'))
    if (days > 1) { num.textContent = days; unit.textContent = 'Days left' }
    else if (days === 1) { num.textContent = '1'; unit.textContent = 'Day left' }
    else if (days === 0 && t) {
      var at = new Date(TARGET); at.setHours(+t[1], +t[2], 0, 0)
      var mins = Math.ceil((at - n) / 60000)
      if (mins > 60) { num.textContent = Math.floor(mins / 60) + ':' + ('0' + (mins % 60)).slice(-2); unit.textContent = 'Hours left' }
      else if (mins > 0) { num.textContent = mins; unit.textContent = mins === 1 ? 'Minute left' : 'Minutes left' }
      else { num.textContent = arrived; num.classList.add('is-text'); unit.textContent = '' }
    } else { num.textContent = arrived; num.classList.add('is-text'); unit.textContent = '' }
  }

  // Shrink an element's font until it fits the width it's given.
  function fit(el, maxWidth) {
    el.style.fontSize = ''
    var size = parseFloat(getComputedStyle(el).fontSize)
    for (var k = 0; k < 40 && el.scrollWidth > maxWidth && size > 12; k++) {
      size *= 0.94
      el.style.fontSize = size + 'px'
    }
  }
  function fitAll() {
    var u = Math.min(window.innerWidth / 100, window.innerHeight / 56.25)
    var h = document.getElementById('headline')
    h.style.whiteSpace = 'nowrap'
    fit(h, u * 40)
    fit(document.getElementById('num'), u * 30)
  }
  window.addEventListener('resize', fitAll)

  function start() {
    applyTheme()
    update()
    fitAll()
    // measure again once the poster font is in, or the fit is done on the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll)
    document.documentElement.dataset.state = 'ready'
    setInterval(function () { update(); fitAll() }, 20 * 1000)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
