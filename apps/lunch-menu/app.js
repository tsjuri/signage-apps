/* Lunch Menu — five rolling school days read from a Google Calendar.
 *
 * Settings arrive in the URL (Anthias builds it from the app's settings form):
 *   source     Apps Script web-app URL (for a district-only calendar)   — or —
 *   calendarId + apiKey   a public Google Calendar via the Calendar API
 *   meal                  lunch (default) | breakfast: which events to show
 *   eyebrow, heading      banner text ("Calendar" / "Lunch Menu"; empty heading = by meal)
 *   img1..img5            file names from the shared media/ folder ("standard" = by meal)
 *   days                  how many school days to show (default 5)
 *
 * One calendar entry per day per meal: the title is the main dish, prefixed
 * "Breakfast:" or "Lunch:" when one calendar holds both (no prefix = lunch);
 * the description (optional) adds the sides, one per line. Several entries on
 * one day are shown one under the other.
 */
;(function () {
  'use strict'

  var params = new URLSearchParams(window.location.search)
  var get = function (k) { return (params.get(k) || '').trim() }

  var MEAL = get('meal') === 'breakfast' ? 'breakfast' : 'lunch'
  // Season for the banner motifs: Sep–Nov fall, Dec–Feb winter, Mar–May spring,
  // Jun–Aug summer. ?season=… overrides it (for previewing).
  function setLook() {
    var m = new Date().getMonth()
    var season = ({ fall: 1, winter: 1, spring: 1, summer: 1 })[get('season')] ? get('season')
      : m >= 8 && m <= 10 ? 'fall' : m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : 'summer'
    var b = document.querySelector('.board')
    b.className = 'board meal-' + MEAL + ' season-' + season
  }
  setLook()
  setInterval(setLook, 60 * 60 * 1000)
  var DAYS = Math.min(Math.max(parseInt(get('days'), 10) || 5, 1), 7)
  var REFRESH_MS = 15 * 60 * 1000
  var CACHE_KEY = 'lunch-menu:' + MEAL + ':' + (get('source') || get('calendarId') || 'demo')

  // ---------- dates ----------
  var pad = function (n) { return (n < 10 ? '0' : '') + n }
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
  var isWeekend = function (d) { return d.getDay() === 0 || d.getDay() === 6 }

  // Today (or Monday, on a weekend) and the following school days.
  function schoolDays(n) {
    var d = new Date()
    d.setHours(12, 0, 0, 0)
    var out = []
    while (out.length < n) {
      if (!isWeekend(d)) out.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return out
  }

  // ---------- text cleanup ----------
  // Calendar descriptions come back as light HTML (<br>, <b>, links). Keep the line
  // breaks, drop the markup, decode entities.
  var scratch = document.createElement('textarea')
  function plain(html) {
    if (!html) return ''
    var s = String(html)
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*(p|div|li)\s*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
    scratch.innerHTML = s
    return scratch.value
      .split('\n')
      .map(function (l) { return l.trim() })
      .filter(Boolean)
      .join('\n')
  }

  // ---------- data sources ----------
  // Every source resolves to { 'YYYY-MM-DD': [{ title, description }] }.
  function group(events) {
    var byDay = {}
    events.forEach(function (e) {
      if (!e || !e.date) return
      var title = plain(e.title)
      var m = /^\s*(breakfast|lunch)\s*[:\-–—]\s*/i.exec(title)
      if ((m ? m[1].toLowerCase() : 'lunch') !== MEAL) return
      if (m) title = title.slice(m[0].length)
      ;(byDay[e.date] = byDay[e.date] || []).push({ title: title, description: plain(e.description) })
    })
    return byDay
  }

  function fromAppsScript(from, to) {
    var url = get('source')
    url += (url.indexOf('?') < 0 ? '?' : '&') + 'from=' + from + '&to=' + to
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('feed ' + r.status); return r.json() })
      .then(function (j) { return group(j.events || []) })
  }

  function fromCalendarApi(fromDate, toDate) {
    var max = new Date(toDate)
    max.setDate(max.getDate() + 1)
    var q = new URLSearchParams({
      key: get('apiKey'),
      timeMin: new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).toISOString(),
      timeMax: new Date(max.getFullYear(), max.getMonth(), max.getDate()).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100'
    })
    var url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(get('calendarId')) + '/events?' + q
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('calendar ' + r.status); return r.json() })
      .then(function (j) {
        var events = []
        ;(j.items || []).forEach(function (it) {
          if (it.status === 'cancelled') return
          var title = it.summary || ''
          var description = it.description || ''
          if (it.start && it.start.date) {
            // All-day: may span several days (end date is exclusive).
            var d = new Date(it.start.date + 'T12:00:00')
            var end = new Date((it.end && it.end.date ? it.end.date : it.start.date) + 'T12:00:00')
            if (end <= d) end = new Date(d.getTime() + 864e5)
            for (; d < end; d.setDate(d.getDate() + 1)) events.push({ date: ymd(d), title: title, description: description })
          } else if (it.start && it.start.dateTime) {
            events.push({ date: ymd(new Date(it.start.dateTime)), title: title, description: description })
          }
        })
        return group(events)
      })
  }

  var SAMPLE = [
    ['Chicken Tenders', 'Mashed Potatoes\nSteamed Broccoli\nand Assorted Fruit'],
    ['Deep Dish Pizza', 'Salad of Mixed Greens\nand Assorted Fruit'],
    ['Beef or *Refried Bean* Tacos', 'with Cheddar Cheese, Brown Rice,\nShredded Lettuce, Chunky Salsa,\nCorn and Assorted Fruit'],
    ['School Closed', ''],
    ['Boneless Chicken Wings or\n*Southwest Veggie Bowl*', 'with Roasted Green Beans,\nBaked Potato Wedges\nand Assorted Fruit']
  ]
  var SAMPLE_BREAKFAST = [
    ['Pancakes', 'Fruit\nJuice and/or Milk'],
    ['Breakfast Scramble', 'Fruit\nJuice and/or Milk'],
    ['Bagel and Cream Cheese', 'Fruit\nJuice and/or Milk'],
    ['School Closed', ''],
    ['Waffles', 'Fruit\nJuice and/or Milk']
  ]
  function sample(days) {
    var out = {}
    var list = MEAL === 'breakfast' ? SAMPLE_BREAKFAST : SAMPLE
    days.forEach(function (d, i) {
      var s = list[i % list.length]
      out[ymd(d)] = [{ title: s[0], description: s[1] }]
    })
    return Promise.resolve(out)
  }

  function load(days) {
    var from = days[0]
    var to = days[days.length - 1]
    if (get('source')) return fromAppsScript(ymd(from), ymd(to))
    if (get('calendarId') && get('apiKey')) return fromCalendarApi(from, to)
    return sample(days).then(function (d) { d.__sample = true; return d })
  }

  // ---------- cache (per screen; survives a network blip or a reboot) ----------
  function saveCache(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch (e) {} }
  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') } catch (e) { return null } }

  // ---------- render ----------
  var $ = function (id) { return document.getElementById(id) }
  var el = function (tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }

  function renderBanner() {
    if (get('eyebrow') || params.has('eyebrow')) $('eyebrow').textContent = get('eyebrow')
    var heading = get('heading') || (MEAL === 'breakfast' ? 'Breakfast|Menu' : 'Lunch|Menu')
    {
      var h = $('heading')
      h.textContent = ''
      heading.split(/\s*\|\s*|\n/).forEach(function (line, i) {
        if (i) h.appendChild(document.createElement('br'))
        h.appendChild(document.createTextNode(line))
      })
    }
    for (var i = 1; i <= 5; i++) {
      var name = params.has('img' + i) ? get('img' + i) : 'standard'
      if (name === 'standard') name = (MEAL === 'breakfast' ? BREAKFAST_IMAGES : DEFAULT_IMAGES)[i - 1]
      var img = $('img' + i)
      if (name && name !== 'none') img.src = '../media/' + encodeURIComponent(name)
      else img.removeAttribute('src')
    }
  }
  var DEFAULT_IMAGES = ['fruit.svg', 'tacos.svg', 'burger.svg', 'salad.svg', 'pizza.svg']
  var BREAKFAST_IMAGES = ['fruit.svg', 'pancakes.svg', 'eggs.svg', 'cereal.svg', 'waffle.svg']

  // ---------- banner photos from the feed's Drive folder ----------
  // When the Apps Script feed has a photo folder, its photos replace the images
  // picked in the settings. Up to five are shown; with more, a different five
  // each day (the window moves along the name-sorted list).
  var PHOTO_KEY = 'lunch-menu:photos:' + get('source')
  function showPhotos(list) {
    if (!list || !list.length) return false
    var n = list.length
    var start = n > 5 ? (Math.floor(Date.now() / 864e5) * 5) % n : 0
    for (var i = 0; i < 5; i++) {
      var img = $('img' + (i + 1))
      if (i < n) img.src = list[(start + i) % n].src
      else img.removeAttribute('src')
    }
    return true
  }
  function loadPhotos() {
    if (!get('source')) return
    try { showPhotos(JSON.parse(localStorage.getItem(PHOTO_KEY) || 'null')) } catch (e) {}
    var url = get('source')
    url += (url.indexOf('?') < 0 ? '?' : '&') + 'photos=1'
    fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('photos ' + r.status); return r.json() })
      .then(function (j) {
        var list = (j.photos || []).filter(function (p) { return p && /^data:image\//.test(p.src) })
        if (showPhotos(list)) {
          try { localStorage.setItem(PHOTO_KEY, JSON.stringify(list)) } catch (e) {}
        } else {
          try { localStorage.removeItem(PHOTO_KEY) } catch (e) {}
          renderBanner() // folder emptied or not set: back to the picked images
        }
      })
      .catch(function () {}) // keep whatever is showing
  }

  function render(days, data) {
    var box = $('days')
    box.style.setProperty('--cols', days.length)
    box.textContent = ''
    var today = ymd(new Date())
    var bodies = []
    days.forEach(function (d) {
      var head = el('div', 'day__head' + (ymd(d) === today ? ' day--today' : ''))
      head.appendChild(el('span', 'day__name', d.toLocaleDateString(undefined, { weekday: 'long' })))
      head.appendChild(el('span', 'day__num', String(d.getDate())))
      box.appendChild(head)
    })
    days.forEach(function (d) {
      var body = el('div', 'day__body')
      var items = (data && data[ymd(d)]) || []
      if (!items.length) body.appendChild(el('p', 'day__empty', '—'))
      items.forEach(function (it) {
        var p = el('p', 'day__item', it.title)
        if (it.description) {
          p.appendChild(document.createTextNode('\n'))
          p.appendChild(document.createTextNode(it.description))
        }
        body.appendChild(p)
      })
      box.appendChild(body)
      bodies.push(body)
    })
    fit(bodies)
  }

  // One shared text size, the largest at which every column fits.
  function fit(bodies) {
    var u = Math.min(window.innerWidth / 100, window.innerHeight / 56.25)
    var lo = u * 1.2
    var hi = u * 2.7
    var fits = function (px) {
      bodies.forEach(function (b) { b.style.fontSize = px + 'px' })
      return bodies.every(function (b) { return b.scrollHeight <= b.clientHeight + 1 })
    }
    if (fits(hi)) return
    for (var k = 0; k < 14; k++) {
      var mid = (lo + hi) / 2
      if (fits(mid)) lo = mid
      else hi = mid
    }
    fits(lo)
  }

  function status(msg) {
    var s = $('status')
    s.textContent = msg || ''
    s.hidden = !msg
  }

  // ---------- loop ----------
  var lastData = readCache()
  var currentDays = []

  function refresh() {
    currentDays = schoolDays(DAYS)
    if (lastData) render(currentDays, lastData)
    return load(currentDays)
      .then(function (data) {
        lastData = data
        if (!data.__sample) saveCache(data)
        render(currentDays, data)
        status(data.__sample ? 'Sample menu — set a calendar in this app’s settings' : '')
      })
      .catch(function () {
        if (lastData) {
          render(currentDays, lastData)
          status('Calendar unreachable — showing the last menu received')
        } else {
          render(currentDays, {})
          status('Calendar unreachable')
        }
      })
  }

  function scheduleMidnight() {
    var now = new Date()
    var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 30)
    setTimeout(function () { refresh(); loadPhotos(); scheduleMidnight() }, next - now)
  }

  function start() {
    renderBanner()
    var go = function () {
      refresh()
      loadPhotos()
      setInterval(refresh, REFRESH_MS)
      setInterval(loadPhotos, 3 * 60 * 60 * 1000)
      scheduleMidnight()
      window.addEventListener('resize', function () { if (lastData) render(currentDays, lastData) })
    }
    // Wait for the web font so the first fit measures the real glyphs.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go)
    else go()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
