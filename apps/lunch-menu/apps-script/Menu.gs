// School Menu — one Google Apps Script that does two jobs for the signage Menu app:
//
//  1. The menu feed for the screens. It reads the (private) menu calendar and
//     hands out only dates, titles and descriptions for the days asked for.
//  2. An upload page for whoever keeps the menu. They pick food service's
//     monthly breakfast and lunch menus (.docx), check what was read, and click
//     Import. The days go into the calendar as "Breakfast: …" and "Lunch: …".
//     Importing a month again replaces that month's entries for that meal.
//
// The calendar stays private: the script runs as you, its owner.
//
// ---------------------------------------------------------------------------
// Setup (once)
//   1. Google Calendar → Settings → Add calendar → Create new calendar, e.g.
//      "School Menu". Under "Settings for my calendars" → that calendar →
//      "Integrate calendar", copy the Calendar ID and paste it below.
//   2. https://script.google.com → New project, name it "School Menu".
//      Replace the code with this whole file. Save.
//   3. Deploy → New deployment → ⚙ Select type: Web app
//        Description:    Screens
//        Execute as:     Me
//        Who has access: Anyone
//      Deploy, authorize when asked, copy the Web app URL (ends in /exec).
//      → This is the "Calendar feed URL" for the Menu app in Anthias.
//   4. Deploy → New deployment again → Web app
//        Description:    Upload
//        Execute as:     Me
//        Who has access: Anyone within <your district>
//      Copy this second URL. → This is the upload page. Bookmark it, or send
//      it to whoever keeps the menu. Only signed-in district accounts get in
//      (and only the people in UPLOADERS, if you fill that in below).
//
// After changing this code: Deploy → Manage deployments → edit (pencil) each
// deployment → Version: New version → Deploy. The URLs stay the same.
//
// Test the feed in a browser:  <Screens URL>?from=2026-11-02&to=2026-11-06
// ---------------------------------------------------------------------------

const CALENDAR_ID = 'PASTE-THE-MENU-CALENDAR-ID-HERE@group.calendar.google.com'

// Who may use the upload page: anyone signed in with an account in this domain…
const UPLOAD_DOMAIN = 'onteora.k12.ny.us'
// …or, if you list addresses here, only those people, e.g. ['jsmith@onteoraschools.org'].
const UPLOADERS = []

const MAX_DAYS = 31 // the feed refuses larger ranges


// ===========================================================================
// Routing

function doGet(e) {
  const p = (e && e.parameter) || {}
  if (p.photos) return photos()
  if (p.from || p.to) return feed(p)
  return uploadPage()
}

// ===========================================================================
// 1. The feed for the screens

function feed(p) {
  const tz = Session.getScriptTimeZone()
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd')
  const from = valid(p.from) || today
  const to = valid(p.to) || from
  const start = parseYmd(from)
  const end = parseYmd(to)
  end.setDate(end.getDate() + 1) // inclusive "to"
  if ((end - start) / 864e5 > MAX_DAYS) return json({ error: 'range too large' })

  const cal = CalendarApp.getCalendarById(CALENDAR_ID)
  if (!cal) return json({ error: 'calendar not found' })

  const events = []
  cal.getEvents(start, end).forEach(function (ev) {
    const title = ev.getTitle()
    const description = ev.getDescription()
    if (ev.isAllDayEvent()) {
      const d = new Date(ev.getAllDayStartDate())
      const stop = ev.getAllDayEndDate() // exclusive
      for (; d < stop; d.setDate(d.getDate() + 1)) {
        const day = Utilities.formatDate(d, tz, 'yyyy-MM-dd')
        if (day >= from && day <= to) events.push({ date: day, title: title, description: description })
      }
    } else {
      events.push({ date: Utilities.formatDate(ev.getStartTime(), tz, 'yyyy-MM-dd'), title: title, description: description })
    }
  })
  return json({ events: events })
}

// The Menu app also asks for banner photos (?photos=1). This script keeps out of
// Google Drive on purpose, so it needs no access to anyone's files: no photos,
// and the screens use the banner images picked in the app's settings.
function photos() {
  return json({ photos: [] })
}

// ===========================================================================
// 2. The upload page

function allowed() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase()
  if (!email) return ''
  if (UPLOADERS.length) return UPLOADERS.map(function (x) { return x.toLowerCase() }).indexOf(email) >= 0 ? email : ''
  return email.split('@')[1] === UPLOAD_DOMAIN.toLowerCase() ? email : ''
}

function uploadPage() {
  const who = allowed()
  const seen = Session.getActiveUser().getEmail() || 'no account (not signed in, or opened through the screens link)'
  const html = who ? UPLOAD_HTML.replace('__WHO__', who) : NO_ACCESS_HTML.replace('__SEEN__', seen.replace(/[<>&]/g, ''))
  return HtmlService.createHtmlOutput(html)
    .setTitle('School Menu upload')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
}

// Called from the page: read one .docx and return what was found.
function previewMenu(meal, base64) {
  if (!allowed()) throw new Error('Not allowed.')
  return readMenu(meal, base64)
}

// Called from the page: read the file(s) again and put them in the calendar.
function importMenus(files) {
  if (!allowed()) throw new Error('Not allowed.')
  const cal = CalendarApp.getCalendarById(CALENDAR_ID)
  if (!cal) throw new Error('The menu calendar was not found. Check CALENDAR_ID in the script.')
  const report = []
  files.forEach(function (f) {
    const menu = readMenu(f.meal, f.base64)
    if (!menu.days.length) return
    const first = new Date(menu.year, menu.month - 1, 1)
    const next = new Date(menu.year, menu.month, 1)
    const prefix = menu.meal + ':'
    let removed = 0
    cal.getEvents(first, next).forEach(function (ev) {
      if (ev.isAllDayEvent() && ev.getTitle().indexOf(prefix) === 0) { ev.deleteEvent(); removed++ }
    })
    menu.days.forEach(function (d) {
      cal.createAllDayEvent(prefix + ' ' + d.title, parseYmd(d.date), { description: d.sides.join('\n') })
    })
    report.push({ meal: menu.meal, month: menu.monthName + ' ' + menu.year, added: menu.days.length, removed: removed })
  })
  return report
}

// ===========================================================================
// Reading food service's menu (.docx, a calendar grid in a Word table)

const W = XmlService.getNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

function readMenu(meal, base64) {
  meal = /^b/i.test(meal) ? 'Breakfast' : 'Lunch'
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), 'application/zip', 'menu.docx')
  let xml = null
  Utilities.unzip(blob).forEach(function (b) { if (b.getName() === 'word/document.xml') xml = b.getDataAsString('UTF-8') })
  if (!xml) throw new Error('This does not look like a Word (.docx) file.')
  const body = XmlService.parse(xml).getRootElement().getChild('body', W)
  const tables = []
  findTables(body, tables)

  const all = tables.map(function (t) { return t.getChildren('tr', W).map(function (tr) { return rowCells(tr).map(function (c) { return c.text }).join(' ') }).join(' ') }).join(' ')
  const m = new RegExp('(' + MONTHS.join('|') + ')\\s+(\\d{4})', 'i').exec(all)
  if (!m) throw new Error('Could not find the month and year (like "November 2026") in this file.')
  const month = MONTHS.indexOf(m[1].toLowerCase()) + 1
  const year = Number(m[2])

  const found = {}
  tables.forEach(function (t) {
    const rows = t.getChildren('tr', W)
    rows.forEach(function (tr, i) {
      const head = rowCells(tr)
      const starts = head.filter(function (c) { return hasWeekday(c.text) }).map(function (c) { return c.col })
      if (!starts.length || i + 1 >= rows.length) return
      // Each weekday name opens that day's columns; its date number sits in them.
      const spans = starts.map(function (a, k) { return [a, k + 1 < starts.length ? starts[k + 1] - 1 : 1e6] })
      const numbers = {}
      head.forEach(function (c) {
        const t2 = c.text.trim()
        if (!/^\d{1,2}$/.test(t2)) return
        spans.forEach(function (s, k) { if (s[0] <= c.col && c.col <= s[1]) numbers[k] = Number(t2) })
      })
      rowCells(rows[i + 1]).forEach(function (c) {
        if (!c.lines.length) return // only a picture: holiday, conference day or decoration
        spans.forEach(function (s, k) {
          if (k in numbers && s[0] <= c.col && c.col <= s[1]) {
            const key = ymd(year, month, numbers[k])
            found[key] = (found[key] || []).concat(c.lines)
          }
        })
      })
    })
  })
  const days = Object.keys(found).sort().map(function (date) {
    const meal2 = splitMeal(found[date])
    return { date: date, title: meal2.title, sides: meal2.sides }
  })
  return { meal: meal, year: year, month: month, monthName: MONTHS[month - 1].replace(/^./, function (x) { return x.toUpperCase() }), days: days }
}

function findTables(el, out) {
  el.getChildren().forEach(function (c) {
    if (c.getName() === 'tbl' && c.getNamespace().getURI() === W.getURI()) out.push(c)
    else if (c.getName() !== 'tc') findTables(c, out) // top-level tables only, like the Python version
  })
}

// [{ col, text, lines }] for each cell, col = its first grid column.
function rowCells(tr) {
  let col = 0
  const trPr = tr.getChild('trPr', W)
  const gb = trPr && trPr.getChild('gridBefore', W)
  if (gb) col = Number(gb.getAttribute('val', W).getValue()) || 0
  return tr.getChildren('tc', W).map(function (tc) {
    const pr = tc.getChild('tcPr', W)
    const gs = pr && pr.getChild('gridSpan', W)
    const span = gs ? Number(gs.getAttribute('val', W).getValue()) || 1 : 1
    const paras = tc.getChildren('p', W).map(paraText)
    const lines = []
    paras.forEach(function (p) {
      p.split('\n').forEach(function (t) {
        t = t.replace(/([A-Za-z])\*(?=[A-Za-z])/g, '$1 *')   // or*Veggie -> or *Veggie
          .replace(/(\*[^*]+\*)(?=[A-Za-z])/g, '$1 ')         // *Nuggets*Oven -> *Nuggets* Oven
          .replace(/\s+/g, ' ').trim()
        if (t) lines.push(t)
      })
    })
    const cell = { col: col, text: paras.join('\n'), lines: lines }
    col += span
    return cell
  })
}

// The text of a paragraph: w:t runs, w:br as a line break, w:tab as a space.
// Pictures (and any text boxes inside them) are skipped.
function paraText(p) {
  let s = ''
  ;(function walk(el) {
    el.getChildren().forEach(function (c) {
      const n = c.getName()
      if (n === 'drawing' || n === 'pict' || n === 'AlternateContent' || n === 'object') return
      if (n === 't' && c.getNamespace().getURI() === W.getURI()) s += c.getText()
      else if (n === 'br' || n === 'cr') s += '\n'
      else if (n === 'tab') s += ' '
      else walk(c)
    })
  })(p)
  return s
}

// Title = the main dish, sides = the rest. The dish ends at the last "with";
// without one, after the vegetarian choice the menu marks with *asterisks*;
// otherwise the first line is the dish.
function splitMeal(lines) {
  const text = lines.join(' ').replace(/\s+/g, ' ').trim()
  let title, rest
  const withs = []
  const re = /\s(with|With|WITH)\s/g
  let mm
  while ((mm = re.exec(text))) withs.push(mm)
  if (withs.length) {
    const last = withs[withs.length - 1]
    title = text.slice(0, last.index)
    rest = text.slice(last.index + last[0].length)
  } else {
    const stars = text.match(/\*[^*]+\*/g)
    if (stars) {
      const end = text.lastIndexOf(stars[stars.length - 1]) + stars[stars.length - 1].length
      title = text.slice(0, end)
      rest = text.slice(end)
    } else {
      title = lines[0]
      rest = lines.slice(1).join(' ')
    }
  }
  title = title.replace(/\*/g, '').replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '')
  rest = rest.replace(/\*/g, '').replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '')
  let sides = rest.split(',').map(function (x) { return x.trim() }).filter(Boolean)
  if (sides.length && /\sand\s/.test(sides[sides.length - 1]) && sides[sides.length - 1].indexOf('/') < 0) {
    const lastSide = sides.pop()
    const at = lastSide.search(/\s+and\s+/)
    sides.push(lastSide.slice(0, at).trim(), lastSide.slice(at).replace(/^\s+and\s+/, '').trim())
  }
  sides = sides.map(function (x) { return x.replace(/^and\s+/, '') }).filter(Boolean)
  return { title: title, sides: sides }
}

function hasWeekday(s) {
  s = s.toLowerCase()
  return WEEKDAYS.some(function (w) { return s.indexOf(w) >= 0 })
}

// ===========================================================================
// Helpers

function valid(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : '' }
function parseYmd(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]) }
function ymd(y, m, d) { return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON) }

// ===========================================================================
// The pages

const NO_ACCESS_HTML = '<!doctype html><html><body style="font:16px/1.5 system-ui,sans-serif;max-width:34rem;margin:3rem auto;padding:0 1rem;color:#1d2558">' +
  '<h1 style="font-size:1.4rem">School Menu</h1><p>This page is for the people who keep the school menu. ' +
  'Open it while signed in with your district Google account, using the upload link you were given.</p>' +
  '<p style="color:#666;font-size:.9rem">This page sees: __SEEN__</p></body></html>'

const UPLOAD_HTML = `<!doctype html>
<html><head><base target="_top">
<style>
  :root { --navy:#1d2558; --line:#e3e5ee; --soft:#f6f7fb; --ok:#146c43; --warn:#9b1c2c; }
  * { box-sizing:border-box; }
  body { margin:0; font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#1d1a1f; background:#fff; }
  main { max-width:56rem; margin:0 auto; padding:2rem 1.25rem 4rem; }
  h1 { color:var(--navy); font-size:1.6rem; margin:0 0 .25rem; }
  .who { color:#666; font-size:.9rem; margin:0 0 1.5rem; }
  .pick { display:grid; grid-template-columns:repeat(auto-fit,minmax(15rem,1fr)); gap:1rem; margin-bottom:1rem; }
  .card { border:1px solid var(--line); border-radius:12px; padding:1rem; background:var(--soft); }
  .card h2 { margin:0 0 .5rem; font-size:1.05rem; color:var(--navy); }
  .card input { width:100%; }
  .card .status { font-size:.9rem; margin-top:.5rem; color:#555; min-height:1.4em; }
  button { font:inherit; font-weight:600; border:0; border-radius:10px; padding:.7rem 1.3rem; background:var(--navy); color:#fff; cursor:pointer; }
  button:disabled { opacity:.4; cursor:default; }
  table { width:100%; border-collapse:collapse; margin:.5rem 0 1.5rem; font-size:.92rem; }
  th, td { text-align:left; padding:.45rem .6rem; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--navy); font-size:.8rem; text-transform:uppercase; letter-spacing:.06em; }
  td.date { white-space:nowrap; color:#555; }
  td.sides { color:#555; }
  .msg { padding:.8rem 1rem; border-radius:10px; margin:1rem 0; }
  .msg.ok { background:#d5f2e3; color:var(--ok); } .msg.err { background:#ffd6d9; color:var(--warn); }
  .note { color:#666; font-size:.9rem; }
</style></head>
<body><main>
  <h1>School Menu</h1>
  <p class="who">Signed in as __WHO__</p>
  <p>Pick the monthly menus from food service (Word files). Check what was read, then click <b>Import</b>.
     Importing a month again replaces that month’s breakfast or lunch.</p>
  <div class="pick">
    <div class="card"><h2>Breakfast menu</h2><input type="file" id="f-Breakfast" accept=".docx"><div class="status" id="s-Breakfast"></div></div>
    <div class="card"><h2>Lunch menu</h2><input type="file" id="f-Lunch" accept=".docx"><div class="status" id="s-Lunch"></div></div>
  </div>
  <div id="preview"></div>
  <button id="go" disabled>Import</button>
  <div id="result"></div>
  <p class="note">Days that only have a picture on the menu (holidays, conference days) are left out.</p>
<script>
  var files = {}, menus = {}
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
  function nice(d) { var p = d.split('-'); return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) }
  function render() {
    var html = ''
    ;['Breakfast', 'Lunch'].forEach(function (meal) {
      var m = menus[meal]; if (!m) return
      html += '<h2 style="color:#1d2558;font-size:1.1rem;margin:1.5rem 0 0">' + meal + ', ' + esc(m.monthName) + ' ' + m.year + ': ' + m.days.length + ' days</h2>'
      html += '<table><tr><th>Day</th><th>' + meal + '</th><th>With</th></tr>'
      m.days.forEach(function (d) { html += '<tr><td class="date">' + nice(d.date) + '</td><td>' + esc(d.title) + '</td><td class="sides">' + esc(d.sides.join(', ')) + '</td></tr>' })
      html += '</table>'
    })
    document.getElementById('preview').innerHTML = html
    document.getElementById('go').disabled = !Object.keys(menus).length
  }
  ;['Breakfast', 'Lunch'].forEach(function (meal) {
    document.getElementById('f-' + meal).addEventListener('change', function (e) {
      var file = e.target.files[0], status = document.getElementById('s-' + meal)
      delete files[meal]; delete menus[meal]; render()
      if (!file) { status.textContent = ''; return }
      status.textContent = 'Reading…'
      var r = new FileReader()
      r.onload = function () {
        var b64 = r.result.split(',')[1]
        google.script.run
          .withSuccessHandler(function (m) {
            files[meal] = b64; menus[meal] = m
            status.textContent = m.days.length ? m.days.length + ' days found for ' + m.monthName + ' ' + m.year : 'No days found. Is this the right file?'
            if (!m.days.length) { delete files[meal]; delete menus[meal] }
            render()
          })
          .withFailureHandler(function (err) { status.innerHTML = '<span style="color:#9b1c2c">' + esc(err.message) + '</span>' })
          .previewMenu(meal, b64)
      }
      r.readAsDataURL(file)
    })
  })
  document.getElementById('go').addEventListener('click', function () {
    var btn = this, out = document.getElementById('result')
    btn.disabled = true; out.innerHTML = '<p>Importing…</p>'
    var list = Object.keys(files).map(function (meal) { return { meal: meal, base64: files[meal] } })
    google.script.run
      .withSuccessHandler(function (rep) {
        out.innerHTML = '<div class="msg ok">' + rep.map(function (r) {
          return '✓ ' + r.meal + ', ' + esc(r.month) + ': ' + r.added + ' days imported' + (r.removed ? ' (replaced ' + r.removed + ' earlier entries)' : '')
        }).join('<br>') + '</div>'
        btn.disabled = false
      })
      .withFailureHandler(function (err) { out.innerHTML = '<div class="msg err">' + esc(err.message) + '</div>'; btn.disabled = false })
      .importMenus(list)
  })
</script>
</main></body></html>`
