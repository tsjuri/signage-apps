/* On This Day — the school's own history, from its Google Sheet.
 *
 * Each showing in the playlist is one entry, up for the whole asset duration.
 * Today's entries first ("On this day in 1957"); on a day without one, an entry
 * from this week ("This week in our history"); otherwise another entry from the
 * sheet ("From our history"). Nothing comes from the internet but the sheet.
 *
 * URL settings:
 *   sheet     the On This Day tab: Show, Date (Sep 5 / 9/5), Year, What happened
 *   ours=1    only the school's own entries, not the built-in facts (facts.js)
 *   motion    gentle (default) | full | none
 *   date      YYYY-MM-DD: show the slides for another day (testing)
 */
;(function () {
  'use strict'

  var params = new URLSearchParams(window.location.search)
  var get = function (k) { return (params.get(k) || '').trim() }
  var MOTION = ({ full: 1, none: 1 })[get('motion')] ? get('motion') : 'gentle'
  document.documentElement.className += ' motion-' + MOTION

  // How long the player shows this asset, measured last time (see trivia-facts).
  var LOADED_AT = Date.now()
  var DUR_KEY = 'on-this-day:duration'
  function rememberDuration() {
    var s = (Date.now() - LOADED_AT) / 1000
    if (s >= 5 && s <= 900) { try { localStorage.setItem(DUR_KEY, String(Math.round(s))) } catch (e) {} }
  }
  window.addEventListener('pagehide', rememberDuration)
  window.addEventListener('beforeunload', rememberDuration)
  document.addEventListener('visibilitychange', function () { if (document.hidden) rememberDuration() })
  var DURATION = 12
  try { var measured = parseFloat(localStorage.getItem(DUR_KEY)) || 0; if (measured >= 5) DURATION = measured } catch (e) {}

  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
  var SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  var LONG = MONTHS.map(function (m) { return m[0].toUpperCase() + m.slice(1) })
  var OURS = /^(1|true|yes)$/i.test(get('ours'))
  var TOPICS = window.OTD_TOPICS
  var BUILTIN = window.OTD_FACTS.map(function (f) { return { m: f[0] - 1, d: f[1], y: f[2], topic: f[3], text: f[4], own: false } })

  function today() {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(get('date'))
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  // ---------- the sheet ----------
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim() }
  function csvUrl(u) {
    if (!u) return ''
    if (/\/pubhtml/.test(u)) u = u.replace(/\/pubhtml(\?[^#]*)?(#.*)?$/, '/pub$1')
    if (/\/pub(\?|$)/.test(u)) return /[?&]output=csv/.test(u) ? u : u + (u.indexOf('?') < 0 ? '?' : '&') + 'output=csv'
    var m = /\/spreadsheets\/d\/([\w-]{20,})/.exec(u)
    if (m) {
      var gid = /[#&?]gid=(\d+)/.exec(u)
      return 'https://docs.google.com/spreadsheets/d/' + m[1] + '/export?format=csv' + (gid ? '&gid=' + gid[1] : '')
    }
    return u
  }
  function parseCsv(text) {
    var rows = [], row = [], cell = '', q = false
    for (var i = 0; i < text.length; i++) {
      var c = text[i]
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false }
        else cell += c
      } else if (c === '"') q = true
      else if (c === ',') { row.push(cell); cell = '' }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++
        row.push(cell); rows.push(row); row = []; cell = ''
      } else cell += c
    }
    if (cell || row.length) { row.push(cell); rows.push(row) }
    return rows
  }
  // "Sep 5", "September 5", "5 Sep", "9/5", "9/5/1957", "1957-09-05" → { m, d, y }
  function parseDay(s) {
    s = String(s || '').trim()
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
    if (m) return { m: +m[2] - 1, d: +m[3], y: +m[1] }
    m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(s)
    if (m) return { m: +m[1] - 1, d: +m[2], y: m[3] && m[3].length === 4 ? +m[3] : 0 }
    var t = s.toLowerCase().replace(/[.,]/g, ' ').split(/\s+/)
    var mon = -1, day = 0, year = 0
    t.forEach(function (w) {
      if (/^\d{4}$/.test(w)) year = +w
      else if (/^\d{1,2}(st|nd|rd|th)?$/.test(w)) day = parseInt(w, 10)
      else if (w.length >= 3) MONTHS.forEach(function (n, i) { if (n.indexOf(w) === 0) mon = i })
    })
    return mon >= 0 && day >= 1 && day <= 31 ? { m: mon, d: day, y: year } : null
  }
  function readSheet(text) {
    var rows = parseCsv(text).filter(function (r) { return r.some(function (c) { return c.trim() }) })
    if (!rows.length) return null
    var head = rows[0].map(norm)
    var col = function () { for (var i = 0; i < arguments.length; i++) { var k = head.indexOf(arguments[i]); if (k >= 0) return k } return -1 }
    var cShow = col('show'), cDate = col('date'), cYear = col('year'), cText = col('what happened', 'text', 'event')
    if (cDate < 0 || cText < 0) return null
    var out = []
    var thisYear = today().getFullYear()
    rows.slice(1).forEach(function (r) {
      var cell = function (c) { return c >= 0 && r[c] ? r[c].trim() : '' }
      if (cShow >= 0 && !/^(true|yes|y|x|1|✓|✔)$/i.test(cell(cShow))) return
      var text = cell(cText), day = parseDay(cell(cDate))
      if (!text || !day) return
      var y = parseInt(cell(cYear), 10) || day.y
      if (y >= thisYear) y = 0 // a date Sheets filled in with the current year is not the year it happened
      out.push({ m: day.m, d: day.d, y: y, text: text, topic: 'ours', own: true })
    })
    return out
  }

  var SHEET = null
  var SHEET_KEY = 'on-this-day:sheet:' + get('sheet')
  function loadSheet(done) {
    var url = csvUrl(get('sheet'))
    if (!url) return done && done()
    fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('sheet ' + r.status); return r.text() })
      .then(function (text) {
        var parsed = readSheet(text)
        if (parsed) { SHEET = parsed; try { localStorage.setItem(SHEET_KEY, text) } catch (e) {} }
      })
      .catch(function () {}) // keep the last copy we had
      .then(function () { done && done() })
  }
  try { var cached = localStorage.getItem(SHEET_KEY); if (cached && get('sheet')) SHEET = readSheet(cached) } catch (e) {}

  // ---------- choosing ----------
  var dayNumber = function () { var n = today(); return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5) }
  function rng(seed) {
    var h = 2166136261 ^ seed
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }
  }
  // days from today to this year's (or the nearest year's) anniversary: −3 … +3 is "this week"
  function offset(e) {
    var t = today(), best = 999
    ;[-1, 0, 1].forEach(function (k) {
      var a = new Date(t.getFullYear() + k, e.m, e.d)
      var diff = Math.round((a - t) / 864e5)
      if (Math.abs(diff) < Math.abs(best)) best = diff
    })
    return best
  }
  // The school's own entries always come first.
  function sequence() {
    var own = SHEET || []
    var all = own.concat(OURS && own.length ? [] : BUILTIN)
    if (!all.length) return []
    var first = function (a, b) { return (b.own - a.own) || (Math.abs(offset(a)) - Math.abs(offset(b))) }
    var on = all.filter(function (e) { return offset(e) === 0 }).sort(first).map(function (e) { return { e: e, kind: 'today' } })
    if (on.length) return on
    var week = all.filter(function (e) { return Math.abs(offset(e)) <= 3 }).sort(first)
      .map(function (e) { return { e: e, kind: 'week' } })
    if (week.length) return week
    var r = rng(dayNumber()), list = all.slice()
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var x = list[i]; list[i] = list[j]; list[j] = x }
    return list.sort(function (a, b) { return b.own - a.own }).map(function (e) { return { e: e, kind: 'other' } })
  }

  // ---------- drawing ----------
  var el = function (tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }
  function ago(y) {
    if (!y) return ''
    var n = today().getFullYear() - y
    return n === 1 ? 'one year ago' : n + ' years ago'
  }
  function buildSlide(item, seed) {
    var e = item.e
    var topic = TOPICS[e.topic] || TOPICS.ours
    var p = window.PALETTES[topic.palette] || window.PALETTES.navy
    var slide = el('section', 'slide')
    slide.style.setProperty('--bg1', p[0])
    slide.style.setProperty('--bg2', p[1])
    slide.style.setProperty('--accent', p[2])
    slide.style.setProperty('--ink', p[3])

    var r = rng(seed)
    var shapes = MOTION === 'full' ? 5 : 4
    for (var i = 0; i < shapes; i++) {
      var sh = el('div', 'shape' + (i % 3 === 0 ? ' shape--accent' : i % 3 === 1 ? '' : ' shape--ring'))
      var size = 7 + r() * 17
      sh.style.width = sh.style.height = size + 'vmax'
      sh.style.left = (r() * 110 - 10) + '%'
      sh.style.top = (r() * 110 - 10) + '%'
      sh.style.setProperty('--dx', (r() * 14 - 7) + 'vw')
      sh.style.setProperty('--dy', (r() * 14 - 7) + 'vh')
      sh.style.setProperty('--r', (r() * 60 - 30) + 'deg')
      sh.style.setProperty('--t', (28 + r() * 24) + 's')
      sh.style.animationDelay = (-r() * 30) + 's'
      if (i % 4 === 3) sh.style.borderRadius = '28%'
      slide.appendChild(sh)
    }

    var when = SHORT[e.m] + ' ' + e.d
    var eyebrow = item.kind === 'today' ? (e.y ? 'On this day in ' + e.y : 'On this day')
      : item.kind === 'week' ? (e.own ? 'This week in our history' : 'This week in history')
      : (e.own ? 'From our history' : 'From history')
    var layout = el('div', 'layout')
    var text = el('div', 'text')
    text.appendChild(el('p', 'eyebrow', eyebrow))
    var title = el('h1', 'title title--fact', e.text)
    text.appendChild(title)
    text.appendChild(el('div', 'bar'))
    var line = item.kind === 'today' ? ago(e.y)
      : LONG[e.m] + ' ' + e.d + (e.y ? ', ' + e.y : '') + (e.y ? ' · ' + ago(e.y) : '')
    if (line) text.appendChild(el('p', 'message', line[0].toUpperCase() + line.slice(1)))
    layout.appendChild(text)

    var emblem = el('div', 'emblem')
    emblem.appendChild(el('div', 'emblem__disc'))
    emblem.appendChild(el('div', 'emblem__ring'))
    var icon = el('div', 'emblem__icon')
    icon.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">' + (window.ICONS[topic.icon] || window.ICONS.star) + '</svg>'
    emblem.appendChild(icon)
    layout.appendChild(emblem)

    var foot = el('div', 'foot')
    var badge = el('div', 'badge')
    badge.appendChild(el('b', null, SHORT[e.m].toUpperCase()))
    badge.appendChild(el('span', null, String(e.d)))
    foot.appendChild(badge)
    foot.appendChild(el('span', 'foot__when', e.y ? when + ', ' + e.y : when))
    foot.appendChild(el('span', 'foot__kind', topic.label))
    layout.appendChild(foot)

    slide.appendChild(layout)
    return { slide: slide, title: title, text: text }
  }
  function emptySlide() {
    return buildSlide({ kind: 'other', e: { m: today().getMonth(), d: today().getDate(), y: 0, topic: 'ours', own: true,
      text: 'Add your school’s history to the On This Day tab of your sheet.' } }, 1)
  }

  function fitTitle(built) {
    var u = Math.min(window.innerWidth / 100, window.innerHeight / 56.25)
    var layout = built.text.parentNode
    var cs = getComputedStyle(layout)
    var foot = layout.querySelector('.foot')
    var limit = layout.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - foot.offsetHeight - u * 2
    var t = built.title
    var max = u * 5.2, min = u * 2.8
    var fits = function (px) { t.style.fontSize = px + 'px'; return built.text.scrollHeight <= limit && t.scrollWidth <= t.clientWidth + 1 }
    if (fits(max)) return
    var lo = min, hi = max
    for (var k = 0; k < 12; k++) { var mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid }
    fits(lo)
  }

  // ---------- rotation: one entry per showing ----------
  var stage = document.getElementById('stage')
  var items = [], index = 0, current = null, currentBuilt = null, timer = null
  var POS = function () { return 'on-this-day:pos:' + dayNumber() }
  window.addEventListener('resize', function () { if (currentBuilt) fitTitle(currentBuilt) })

  function show(i) {
    var built
    if (!items.length) built = emptySlide()
    else {
      index = ((i % items.length) + items.length) % items.length
      built = buildSlide(items[index], dayNumber() * 131 + index)
      try { localStorage.setItem(POS(), String(index + 1)) } catch (e) {}
    }
    stage.appendChild(built.slide)
    fitTitle(built)
    setTimeout(function () { built.slide.classList.add('is-on') }, 40)
    var old = current
    current = built.slide
    currentBuilt = built
    if (old) {
      old.classList.remove('is-on')
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old) }, 700)
    }
  }

  function start() {
    items = sequence()
    var resume = 0
    try { resume = parseInt(localStorage.getItem(POS()), 10) || 0 } catch (e) {}
    show(resume) // next time round in the playlist, carry on with the next one
    clearInterval(timer)
    timer = setInterval(function () { show(index + 1) }, DURATION * 2 * 1000) // only if never switched away
    var n = new Date()
    setTimeout(start, new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 1) - n) // a new day
  }

  function go() {
    var begin = function () {
      if (get('sheet') && !SHEET) {
        var started = false
        var once = function () { if (!started) { started = true; start() } }
        setTimeout(once, 6000)
        loadSheet(once)
      } else {
        start()
        loadSheet(function () { items = sequence() })
      }
      setInterval(function () { loadSheet(function () { items = sequence() }) }, 60 * 60 * 1000)
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(begin, begin); else begin()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go)
  else go()
})()
