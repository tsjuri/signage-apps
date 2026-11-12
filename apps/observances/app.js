/* Observances — shows the heritage months, awareness months, weeks and days
 * that are current today, one animated slide each, rotating.
 *
 * URL settings (Anthias builds them from the app's settings form):
 *   hideHeritage, hideAwareness, hideSchool, hideDays, hideHolidays   =1 to hide that kind
 *   skip=<name>     (repeatable) hide one observance; part of its name is enough
 *   msg=<name>|<text> (repeatable) replace the message on one observance's slide
 *   seconds         seconds per slide (default 12)
 *   date            YYYY-MM-DD: show as if it were that day (for testing)
 *   all=1           cycle through every slide (for previewing); only=<id> one slide
 */
;(function () {
  'use strict'

  var params = new URLSearchParams(window.location.search)
  var get = function (k) { return (params.get(k) || '').trim() }
  var on = function (k) { var v = get(k).toLowerCase(); return v === '1' || v === 'true' || v === 'yes' }

  var SECONDS = Math.min(Math.max(parseFloat(get('seconds')) || 12, 4), 120)
  var LEAD_DAYS = 3 // single days and weeks appear this many days early

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  var SHORT = MONTHS.map(function (m) { return m.slice(0, 3) })
  var KIND = { heritage: 'Heritage', awareness: 'Awareness', safety: 'Safety', school: 'Our school', day: 'Observance', holiday: 'Holiday' }

  // ---------- dates ----------
  var D = function (y, m, d) { return new Date(y, m - 1, d, 12) } // noon: safe from DST edges
  var addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x }
  var sameDay = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
  var lastOfMonth = function (y, m) { return new Date(y, m, 0, 12) }

  function nthWeekday(y, m, n, wd) {
    if (n > 0) {
      var first = D(y, m, 1)
      return addDays(first, ((wd - first.getDay() + 7) % 7) + (n - 1) * 7)
    }
    var last = lastOfMonth(y, m)
    return addDays(last, -((last.getDay() - wd + 7) % 7))
  }

  // Lunar New Year moves with the lunar calendar.
  var LUNAR = { 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8] }

  // The observance's dates in year y, as { start, end, mode } (mode: month|range|day|week).
  function windowFor(when, y) {
    if (when.month) return { start: D(y, when.month, 1), end: lastOfMonth(y, when.month), mode: 'month' }
    if (when.range) {
      var r = when.range
      var start = D(y, r[0], r[1])
      var end = D(r[2] < r[0] ? y + 1 : y, r[2], r[3])
      return { start: start, end: end, mode: 'range' }
    }
    if (when.day) { var d = D(y, when.day[0], when.day[1]); return { start: d, end: d, mode: 'day' } }
    if (when.nth) { var n = nthWeekday(y, when.nth[0], when.nth[1], when.nth[2]); return { start: n, end: n, mode: 'day' } }
    if (when.weekOf) {
      var a = D(y, when.weekOf[0], when.weekOf[1])
      var sun = addDays(a, -a.getDay())
      return { start: sun, end: addDays(sun, 6), mode: 'week' }
    }
    if (when.fullWeek) {
      var mon = nthWeekday(y, when.fullWeek[0], 1, 1) // first Monday: Mon–Fri all inside the month
      return { start: mon, end: addDays(mon, 4), mode: 'week' }
    }
    switch (when.special) {
      case 'american-education-week': {
        var t = nthWeekday(y, 11, 4, 4) // Thanksgiving
        return { start: addDays(t, -10), end: addDays(t, -6), mode: 'week' } // Mon–Fri of the week before
      }
      case 'admin-professionals': {
        var lastSat = nthWeekday(y, 4, -1, 6) // last full Sun–Sat week of April ends here
        var wed = addDays(lastSat, -3)
        return { start: wed, end: wed, mode: 'day' }
      }
      case 'school-nurse': {
        var w = D(y, 5, 6) // the Wednesday of Nurses Week, May 6–12
        w = addDays(w, (3 - w.getDay() + 7) % 7)
        return { start: w, end: w, mode: 'day' }
      }
      case 'lunar-new-year': {
        if (!LUNAR[y]) return null
        var l = D(y, LUNAR[y][0], LUNAR[y][1])
        return { start: l, end: l, mode: 'day' }
      }
    }
    return null
  }

  // The window that covers `today` (with the lead time), if any.
  function activeWindow(o, today) {
    for (var y = today.getFullYear() - 1; y <= today.getFullYear() + 1; y++) {
      var w = windowFor(o.when, y)
      if (!w) continue
      var from = w.mode === 'day' || w.mode === 'week' ? addDays(w.start, -LEAD_DAYS) : w.start
      if (today >= from && today <= w.end) return w // all dates sit at noon, so plain comparisons are exact
    }
    return null
  }

  // ---------- settings ----------
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim() }
  function matches(o, token) {
    var t = norm(token)
    if (t.length < 3) return false
    return norm(o.title).indexOf(t) >= 0 || norm(o.id).indexOf(t) >= 0 || norm(o.short).indexOf(t) >= 0
  }
  var HIDE = {
    heritage: on('hideHeritage'),
    awareness: on('hideAwareness'),
    safety: on('hideAwareness'),
    school: on('hideSchool'),
    day: on('hideDays'),
    holiday: on('hideHolidays')
  }
  var SKIP = params.getAll('skip').filter(Boolean)
  var MSG = params.getAll('msg').map(function (t) {
    var i = t.indexOf('|')
    return i < 0 ? null : { name: t.slice(0, i), text: t.slice(i + 1).trim() }
  }).filter(function (m) { return m && m.text })

  function chosen(o) {
    if (HIDE[o.type]) return false
    return !SKIP.some(function (t) { return matches(o, t) })
  }
  function messageFor(o) {
    for (var i = MSG.length - 1; i >= 0; i--) if (matches(o, MSG[i].name)) return MSG[i].text
    return o.message
  }

  function today() {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(get('date'))
    if (p) return D(+p[1], +p[2], +p[3])
    var n = new Date()
    return D(n.getFullYear(), n.getMonth() + 1, n.getDate())
  }

  // Current slides: dated ones (days, weeks) first, then the months.
  function currentSlides() {
    var t = today()
    var list = window.OBSERVANCES
    if (on('all')) return list.map(function (o) { return { o: o, w: windowFor(o.when, t.getFullYear()) || { start: t, end: t, mode: 'day' } } })
    if (get('only')) {
      return list.filter(function (o) { return o.id === get('only') }).map(function (o) {
        return { o: o, w: activeWindow(o, t) || windowFor(o.when, t.getFullYear()) || { start: t, end: t, mode: 'day' } }
      })
    }
    var out = []
    list.forEach(function (o) {
      if (!chosen(o)) return
      var w = activeWindow(o, t)
      if (w) out.push({ o: o, w: w })
    })
    var rank = { day: 0, week: 1, range: 2, month: 3 }
    return out.sort(function (a, b) { return rank[a.w.mode] - rank[b.w.mode] || a.w.start - b.w.start })
  }

  // ---------- wording ----------
  var fmtDay = function (d) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }
  var fmtShort = function (d) { return SHORT[d.getMonth()] + ' ' + d.getDate() }
  function wording(w) {
    var t = today()
    if (w.mode === 'month') return { eyebrow: MONTHS[w.start.getMonth()] + ' is', when: 'All of ' + MONTHS[w.start.getMonth()] }
    if (w.mode === 'range') return { eyebrow: 'Now through ' + fmtShort(w.end), when: fmtShort(w.start) + ' – ' + fmtShort(w.end) }
    if (w.mode === 'week') {
      var span = fmtShort(w.start) + ' – ' + (w.start.getMonth() === w.end.getMonth() ? w.end.getDate() : fmtShort(w.end))
      return { eyebrow: t < w.start ? 'Coming up' : 'This week', when: span }
    }
    if (sameDay(w.start, t)) return { eyebrow: 'Today is', when: fmtDay(w.start) }
    return { eyebrow: 'Coming up', when: fmtDay(w.start) }
  }

  // ---------- drawing ----------
  var el = function (tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }
  // Deterministic "random" per observance, so each slide keeps its own layout.
  function rng(seed) {
    var h = 2166136261
    for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000 }
  }

  function buildSlide(item) {
    var o = item.o
    var w = item.w
    var p = window.PALETTES[o.palette] || window.PALETTES.navy
    var words = wording(w)
    var slide = el('section', 'slide')
    slide.style.setProperty('--bg1', p[0])
    slide.style.setProperty('--bg2', p[1])
    slide.style.setProperty('--accent', p[2])
    slide.style.setProperty('--ink', p[3])

    var r = rng(o.id)
    for (var i = 0; i < 7; i++) {
      var sh = el('div', 'shape' + (i % 3 === 0 ? ' shape--accent' : i % 3 === 1 ? '' : ' shape--ring'))
      var size = 8 + r() * 26
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

    var layout = el('div', 'layout')
    var text = el('div', 'text')
    text.appendChild(el('p', 'eyebrow', words.eyebrow))
    var title = el('h1', 'title', o.title)
    text.appendChild(title)
    text.appendChild(el('div', 'bar'))
    text.appendChild(el('p', 'message', messageFor(o)))
    layout.appendChild(text)

    var emblem = el('div', 'emblem')
    emblem.appendChild(el('div', 'emblem__disc'))
    emblem.appendChild(el('div', 'emblem__ring'))
    var icon = el('div', 'emblem__icon')
    icon.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">' + (window.ICONS[o.icon] || window.ICONS.star) + '</svg>'
    emblem.appendChild(icon)
    layout.appendChild(emblem)

    var foot = el('div', 'foot')
    var badge = el('div', 'badge')
    badge.appendChild(el('b', null, SHORT[w.start.getMonth()].toUpperCase()))
    if (w.mode === 'month') badge.classList.add('badge--month')
    else badge.appendChild(el('span', null, String(w.start.getDate())))
    foot.appendChild(badge)
    foot.appendChild(el('span', 'foot__when', words.when))
    foot.appendChild(el('span', 'foot__kind', KIND[o.type] || ''))
    layout.appendChild(foot)

    slide.appendChild(layout)
    return { slide: slide, title: title, text: text }
  }

  // Largest title size at which the text block fits its column.
  function fitTitle(built) {
    var u = Math.min(window.innerWidth / 100, window.innerHeight / 56.25)
    var max = u * 6.6
    var min = u * 3.4
    var layout = built.text.parentNode
    var cs = getComputedStyle(layout)
    var foot = layout.querySelector('.foot')
    var limit = layout.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - foot.offsetHeight - u * 2
    var t = built.title
    var fits = function (px) { t.style.fontSize = px + 'px'; return built.text.scrollHeight <= limit && t.scrollWidth <= t.clientWidth + 1 }
    if (fits(max)) return
    var lo = min, hi = max
    for (var k = 0; k < 12; k++) { var mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid }
    fits(lo)
  }

  // ---------- rotation ----------
  var stage = document.getElementById('stage')
  var dots = document.getElementById('dots')
  var slides = []
  var index = 0
  var current = null
  var currentBuilt = null
  var timer = null
  window.addEventListener('resize', function () { if (currentBuilt) fitTitle(currentBuilt) })
  var STORE = 'observances:next'

  function fallback() {
    var t = today()
    return [{ o: { id: 'hello', title: 'Have a great day!', type: 'school', icon: 'sun', palette: 'teal',
      message: 'Thanks for being part of our school community.' }, w: { start: t, end: t, mode: 'day' } }]
  }

  function show(i) {
    if (!slides.length) return
    index = (i + slides.length) % slides.length
    var built = buildSlide(slides[index])
    stage.appendChild(built.slide)
    fitTitle(built)
    // two frames so the browser paints the hidden state before fading in
    requestAnimationFrame(function () { requestAnimationFrame(function () { built.slide.classList.add('is-on') }) })
    var old = current
    current = built.slide
    currentBuilt = built
    if (old) {
      old.classList.remove('is-on')
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old) }, 1200)
    }
    Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('is-on', k === index) })
    dots.style.setProperty('--dot', (window.PALETTES[slides[index].o.palette] || window.PALETTES.navy)[3])
    try { localStorage.setItem(STORE, String(index + 1)) } catch (e) {}
  }

  function load() {
    slides = currentSlides()
    if (!slides.length) slides = fallback()
    dots.textContent = ''
    if (slides.length > 1 && slides.length <= 16) slides.forEach(function () { dots.appendChild(document.createElement('li')) })
  }

  function start() {
    load()
    var resume = 0
    try { resume = parseInt(localStorage.getItem(STORE), 10) || 0 } catch (e) {}
    show(resume) // each time the asset comes back round, carry on with the next slide
    clearInterval(timer)
    timer = setInterval(function () { show(index + 1) }, SECONDS * 1000)
    // the list changes at midnight
    var n = new Date()
    setTimeout(function () { start() }, new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 1) - n)
  }

  function go() { if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start); else start() }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go)
  else go()
})()
