/* Trivia & Fun Facts — alternates a quick quiz (question, then the answer
 * slides in) with a fun fact. A new order every day.
 *
 * URL settings:
 *   mode      both (default) | trivia | facts
 *   seconds   seconds per slide (default 14); a quiz reveals its answer at ~60%
 *   motion    gentle (default) | full | none
 *   sheet     optional published Google Sheet (CSV) with the school's own items
 *   ours=1    show only the sheet's items, not the built-in set
 *   only=trivia|fact&n=<index>   preview one item
 */
;(function () {
  'use strict'

  var params = new URLSearchParams(window.location.search)
  var get = function (k) { return (params.get(k) || '').trim() }
  var on = function (k) { return /^(1|true|yes)$/i.test(get(k)) }

  var MODE = ({ trivia: 1, facts: 1 })[get('mode')] ? get('mode') : 'both'
  var MOTION = ({ full: 1, none: 1 })[get('motion')] ? get('motion') : 'gentle'
  document.documentElement.className += ' motion-' + MOTION
  var SECONDS = Math.min(Math.max(parseFloat(get('seconds')) || 14, 6), 120)
  var REVEAL_AT = 0.6

  // ---------- items ----------
  var TOPICS = window.TOPICS
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim() }
  function topicKey(name) {
    var n = norm(name)
    if (TOPICS[n]) return n
    for (var k in TOPICS) if (norm(TOPICS[k].label) === n) return k
    return 'local'
  }
  var builtIn = function () {
    return {
      facts: window.FACTS.map(function (f) { return { kind: 'fact', topic: f[0], text: f[1] } }),
      trivia: window.TRIVIA.map(function (t) { return { kind: 'trivia', topic: t[0], text: t[1], answer: t[2] } })
    }
  }

  // ---------- the school's sheet (optional) ----------
  // Columns: Show, Type (Fact / Trivia), Text, Answer, Topic.
  var SHEET = null
  var SHEET_KEY = 'trivia-facts:sheet:' + get('sheet')
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
  function readSheet(text) {
    var rows = parseCsv(text).filter(function (r) { return r.some(function (c) { return c.trim() }) })
    if (!rows.length) return null
    var head = rows[0].map(norm)
    var col = function (n) { return head.indexOf(n) }
    var cShow = col('show'), cType = col('type'), cText = col('text'), cAns = col('answer'), cTopic = col('topic')
    if (cText < 0) return null
    var out = { facts: [], trivia: [] }
    rows.slice(1).forEach(function (r) {
      var cell = function (c) { return c >= 0 && r[c] ? r[c].trim() : '' }
      if (cShow >= 0 && !/^(true|yes|y|x|1|✓|✔)$/i.test(cell(cShow))) return
      var text = cell(cText)
      if (!text) return
      var answer = cell(cAns)
      var isTrivia = /trivia|quiz|question/i.test(cell(cType)) || (!cell(cType) && answer)
      var item = { kind: isTrivia ? 'trivia' : 'fact', topic: topicKey(cell(cTopic)), text: text, answer: answer }
      if (isTrivia && !answer) return
      ;(isTrivia ? out.trivia : out.facts).push(item)
    })
    return out
  }
  function loadSheet(done) {
    var url = csvUrl(get('sheet'))
    if (!url) return done && done()
    fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('sheet ' + r.status); return r.text() })
      .then(function (text) {
        var parsed = readSheet(text)
        if (parsed) { SHEET = parsed; try { localStorage.setItem(SHEET_KEY, text) } catch (e) {} }
      })
      .catch(function () {})
      .then(function () { done && done() })
  }
  try { var cached = localStorage.getItem(SHEET_KEY); if (cached && get('sheet')) SHEET = readSheet(cached) } catch (e) {}

  // ---------- today's order ----------
  var dayNumber = function () { var n = new Date(); return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5) }
  function rng(seed) {
    var h = 2166136261 ^ seed
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }
  }
  function shuffle(list, seed) {
    var a = list.slice(), r = rng(seed)
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t }
    return a
  }
  function sequence() {
    var base = builtIn()
    var facts = [], trivia = []
    if (!(on('ours') && SHEET)) { facts = base.facts; trivia = base.trivia }
    if (SHEET) { facts = SHEET.facts.concat(facts); trivia = SHEET.trivia.concat(trivia) }
    if (MODE === 'trivia') facts = []
    if (MODE === 'facts') trivia = []
    var d = dayNumber()
    // the school's own items first each day, then the built-in ones shuffled
    var own = function (x) { return SHEET && (SHEET.facts.indexOf(x) >= 0 || SHEET.trivia.indexOf(x) >= 0) }
    var order = function (list, salt) {
      var mine = list.filter(own)
      return shuffle(mine, d + salt).concat(shuffle(list.filter(function (x) { return !own(x) }), d + salt + 7))
    }
    trivia = order(trivia, 1)
    facts = order(facts, 2)
    var out = []
    for (var i = 0; i < Math.max(trivia.length, facts.length); i++) {
      if (trivia[i]) out.push(trivia[i])
      if (facts[i]) out.push(facts[i])
    }
    return out
  }

  // ---------- drawing ----------
  var el = function (tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }
  function buildSlide(item, seed) {
    var topic = TOPICS[item.topic] || TOPICS.local
    var p = window.PALETTES[topic.palette] || window.PALETTES.navy
    var slide = el('section', 'slide slide--' + item.kind)
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

    var layout = el('div', 'layout')
    var text = el('div', 'text')
    text.appendChild(el('p', 'eyebrow', item.kind === 'trivia' ? 'Quick quiz' : 'Did you know?'))
    var title = el('h1', 'title' + (item.kind === 'fact' ? ' title--fact' : ''), item.text)
    text.appendChild(title)
    text.appendChild(el('div', 'bar'))
    var answer = null
    if (item.kind === 'trivia') {
      // the waiting line and the answer share one spot: one fades out as the other comes in
      var reveal = el('div', 'reveal')
      reveal.appendChild(el('p', 'answer__wait', 'Think you know? The answer is coming up…'))
      answer = el('div', 'answer')
      answer.appendChild(el('span', 'answer__label', 'Answer'))
      answer.appendChild(el('span', 'answer__text', item.answer))
      reveal.appendChild(answer)
      text.appendChild(reveal)
    }
    layout.appendChild(text)

    var emblem = el('div', 'emblem')
    emblem.appendChild(el('div', 'emblem__disc'))
    emblem.appendChild(el('div', 'emblem__ring'))
    var icon = el('div', 'emblem__icon')
    icon.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">' + (window.ICONS[topic.icon] || window.ICONS.star) + '</svg>'
    emblem.appendChild(icon)
    layout.appendChild(emblem)

    var foot = el('div', 'foot')
    var badge = el('div', 'badge badge--mark')
    badge.appendChild(el('span', null, item.kind === 'trivia' ? '?' : '!'))
    foot.appendChild(badge)
    foot.appendChild(el('span', 'foot__when', topic.label))
    foot.appendChild(el('span', 'foot__kind', item.kind === 'trivia' ? 'Quick quiz' : 'Fun fact'))
    layout.appendChild(foot)

    slide.appendChild(layout)
    return { slide: slide, title: title, text: text, answer: answer }
  }

  function fitTitle(built) {
    var u = Math.min(window.innerWidth / 100, window.innerHeight / 56.25)
    var layout = built.text.parentNode
    var cs = getComputedStyle(layout)
    var foot = layout.querySelector('.foot')
    var limit = layout.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - foot.offsetHeight - u * 2
    var t = built.title
    var max = u * (t.classList.contains('title--fact') ? 5.2 : 6.2)
    var min = u * 2.8
    var fits = function (px) { t.style.fontSize = px + 'px'; return built.text.scrollHeight <= limit && t.scrollWidth <= t.clientWidth + 1 }
    if (fits(max)) return
    var lo = min, hi = max
    for (var k = 0; k < 12; k++) { var mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid }
    fits(lo)
  }

  // ---------- rotation ----------
  var stage = document.getElementById('stage')
  var items = []
  var index = 0
  var current = null
  var currentBuilt = null
  var timer = null
  var revealTimer = null
  var POS = function () { return 'trivia-facts:pos:' + dayNumber() + ':' + MODE }
  window.addEventListener('resize', function () { if (currentBuilt) fitTitle(currentBuilt) })

  function show(i) {
    if (!items.length) return
    index = ((i % items.length) + items.length) % items.length
    var built = buildSlide(items[index], dayNumber() * 131 + index)
    stage.appendChild(built.slide)
    fitTitle(built)
    setTimeout(function () { built.slide.classList.add('is-on') }, 40)
    clearTimeout(revealTimer)
    if (built.answer) revealTimer = setTimeout(function () { built.slide.classList.add('is-revealed') }, SECONDS * 1000 * REVEAL_AT)
    var old = current
    current = built.slide
    currentBuilt = built
    if (old) {
      old.classList.remove('is-on')
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old) }, 700)
    }
    try { localStorage.setItem(POS(), String(index + 1)) } catch (e) {}
  }

  function preview() {
    var base = builtIn()
    var list = get('only') === 'fact' ? base.facts : base.trivia
    items = [list[(parseInt(get('n'), 10) || 0) % list.length]]
    show(0)
    if (on('revealed')) currentBuilt.slide.classList.add('is-revealed')
  }

  function start() {
    if (get('only')) return preview()
    items = sequence()
    var resume = 0
    try { resume = parseInt(localStorage.getItem(POS()), 10) || 0 } catch (e) {}
    show(resume) // next time round in the playlist, carry on with the next one
    clearInterval(timer)
    timer = setInterval(function () { show(index + 1) }, SECONDS * 1000)
    var n = new Date()
    setTimeout(start, new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 1) - n) // new order each day
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
