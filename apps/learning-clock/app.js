/* Learning Clock — an analog clock that teaches kids to read it.
 *
 * URL settings:
 *   seconds=1   show a second hand (off by default: calmer, lighter on small players)
 *   words       past (default: "quarter past ten") | plain ("ten fifteen")
 *   time        HH:MM — show a fixed time (testing)
 */
;(function () {
  'use strict'
  var params = new URLSearchParams(window.location.search)
  var get = function (k) { return (params.get(k) || '').trim() }
  var SECONDS = /^(1|true|yes)$/i.test(get('seconds'))
  var PLAIN = get('words') === 'plain'
  var FIXED = /^(\d{1,2}):(\d{2})$/.exec(get('time'))

  var NS = 'http://www.w3.org/2000/svg'
  var svg = document.getElementById('face')
  var C = 100, R = 80
  function add(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag)
    for (var k in attrs) n.setAttribute(k, attrs[k])
    ;(parent || svg).appendChild(n)
    return n
  }
  var pt = function (r, deg) { var a = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)] }

  // ---------- the face, drawn once ----------
  add('circle', { class: 'face', cx: C, cy: C, r: R })
  add('path', { class: 'half--past', d: 'M100 ' + (C - R) + ' A' + R + ' ' + R + ' 0 0 1 100 ' + (C + R) + 'Z' })
  add('path', { class: 'half--to', d: 'M100 ' + (C + R) + ' A' + R + ' ' + R + ' 0 0 1 100 ' + (C - R) + 'Z' })
  var lp = pt(40, 140), lt = pt(40, 220)
  add('text', { class: 'halflabel', x: lp[0], y: lp[1] }).textContent = 'past'
  add('text', { class: 'halflabel', x: lt[0], y: lt[1] }).textContent = 'to'
  add('circle', { class: 'rim', cx: C, cy: C, r: R })
  var ticks = [], hnums = [], hbgs = [], mnums = [], mbgs = []
  for (var i = 0; i < 60; i++) {
    var five = i % 5 === 0
    var a = pt(five ? 70 : 74, i * 6), b = pt(78, i * 6)
    ticks.push(add('line', { class: 'tick' + (five ? ' tick--five' : ''), x1: a[0], y1: a[1], x2: b[0], y2: b[1] }))
  }
  for (var h = 1; h <= 12; h++) {
    var p = pt(58, h * 30)
    hbgs[h] = add('circle', { class: 'hbg', cx: p[0], cy: p[1], r: 10.5 })
    var t = add('text', { class: 'hnum', x: p[0], y: p[1] + 0.5 }); t.textContent = h; hnums[h] = t
  }
  for (var m = 0; m < 60; m += 5) {
    var q = pt(91, m * 6)
    mbgs[m] = add('circle', { class: 'mbg', cx: q[0], cy: q[1], r: 6.2 })
    var u = add('text', { class: 'mnum', x: q[0], y: q[1] + 0.3 }); u.textContent = m; mnums[m] = u
  }
  var hourHand = add('line', { class: 'hand hand--hour', x1: C, y1: C, x2: C, y2: C - 40 })
  var minHand = add('line', { class: 'hand hand--min', x1: C, y1: C, x2: C, y2: C - 64 })
  function tag(cls, label) {
    var g = add('g', { class: 'tag ' + cls })
    var w = label.length * 4.4 + 7
    add('rect', { x: -w / 2, y: -5.2, width: w, height: 10.4 }, g)
    add('text', { x: 0, y: 0.4 }, g).textContent = label
    return g
  }
  var hourTag = tag('tag--hour', 'HOUR')
  var minTag = tag('tag--min', 'MINUTES')
  var secHand = SECONDS ? add('line', { class: 'hand hand--sec', x1: C, y1: C + 12, x2: C, y2: C - 72 }) : null
  add('circle', { class: 'pin', cx: C, cy: C, r: 3.6 })

  // ---------- words ----------
  var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty']
  var num = function (n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') }
  function inWords(h12, m) {
    var next = h12 % 12 + 1
    if (m === 0) return num(h12) + ' o’clock'
    if (PLAIN) return num(h12) + ' ' + (m < 10 ? 'oh ' + num(m) : num(m))
    if (m === 15) return 'quarter past ' + num(h12)
    if (m === 30) return 'half past ' + num(h12)
    if (m === 45) return 'quarter to ' + num(next)
    var mins = function (n) { return num(n) + (n % 5 ? (n === 1 ? ' minute' : ' minutes') : '') }
    return m < 30 ? mins(m) + ' past ' + num(h12) : mins(60 - m) + ' to ' + num(next)
  }
  var H = function (s) { return '<b class="h">' + s + '</b>' }
  var M = function (s) { return '<b class="m">' + s + '</b>' }
  function explainHour(h12, m) {
    var next = h12 % 12 + 1
    if (m === 0) return 'The ' + H('short hand') + ' points to the ' + H(h12) + '.'
    if (m >= 45) return 'The ' + H('short hand') + ' is almost at the ' + H(next) + ', but it’s still ' + H(h12) + '.'
    if (m >= 15) return 'The ' + H('short hand') + ' is between the ' + H(h12) + ' and the ' + H(next) + ', so the hour is still ' + H(h12) + '.'
    return 'The ' + H('short hand') + ' is just past the ' + H(h12) + ', so the hour is ' + H(h12) + '.'
  }
  function explainMin(m) {
    var at = Math.floor(m / 5), extra = m % 5
    var mark = at === 0 ? 12 : at
    if (m === 0) return 'The ' + M('long hand') + ' points to the ' + M('12') + ': exactly on the hour.'
    if (!extra) return 'The ' + M('long hand') + ' points to the ' + M(mark) + '. That means ' + M(m + ' minutes') + '.'
    var little = extra === 1 ? 'one little mark' : num(extra) + ' little marks'
    if (at === 0) return 'The ' + M('long hand') + ' is ' + little + ' past the ' + M('12') + ': ' + M(m + (m === 1 ? ' minute' : ' minutes')) + '.'
    return 'The ' + M('long hand') + ' is ' + little + ' past the ' + M(mark) + ': ' + (at * 5) + ' + ' + extra + ' = ' + M(m + ' minutes') + '.'
  }

  // ---------- drawing the time ----------
  var setHand = function (el, deg) { el.setAttribute('transform', 'rotate(' + deg + ' ' + C + ' ' + C + ')') }
  var placeTag = function (g, r, deg) { var p = pt(r, deg); g.setAttribute('transform', 'translate(' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ')') }
  var on = function (el, yes) { el.classList[yes ? 'add' : 'remove']('on') }
  var last = ''
  function draw() {
    var now = new Date()
    var hh = FIXED ? +FIXED[1] : now.getHours(), mm = FIXED ? +FIXED[2] : now.getMinutes(), ss = FIXED ? 0 : now.getSeconds()
    var h12 = hh % 12 || 12
    if (secHand) setHand(secHand, ss * 6)
    var key = hh + ':' + mm
    if (key === last) return
    last = key
    var hDeg = (h12 % 12 + mm / 60) * 30, mDeg = mm * 6
    setHand(hourHand, hDeg)
    setHand(minHand, mDeg)
    placeTag(hourTag, 24, hDeg)
    placeTag(minTag, 47, mDeg)
    for (var h = 1; h <= 12; h++) { on(hbgs[h], h === h12); on(hnums[h], h === h12) }
    var five = Math.floor(mm / 5) * 5
    for (var m = 0; m < 60; m += 5) { on(mbgs[m], m === five); on(mnums[m], m === five) }
    ticks.forEach(function (t, i) { on(t, i === mm && mm % 5 !== 0) })
    document.getElementById('digital').textContent = h12 + ':' + (mm < 10 ? '0' : '') + mm
    document.getElementById('ampm').textContent = hh < 12 ? 'AM' : 'PM'
    var w = inWords(h12, mm)
    document.getElementById('words').textContent = w[0].toUpperCase() + w.slice(1)
    document.getElementById('how-hour').innerHTML = explainHour(h12, mm)
    document.getElementById('how-min').innerHTML = explainMin(mm)
    document.documentElement.dataset.state = 'ready'
  }
  function tick() {
    draw()
    var n = new Date()
    setTimeout(tick, SECONDS ? 1000 - n.getMilliseconds() : (60 - n.getSeconds()) * 1000 - n.getMilliseconds() + 20)
  }
  tick()
})()
