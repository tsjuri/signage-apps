/**
 * Lunch Menu feed — a tiny Google Apps Script web app that reads the lunch
 * calendar and returns the entries as JSON for the signage Lunch Menu app.
 *
 * Use it when the lunch calendar is NOT public: the calendar stays private,
 * the script runs as you, and it hands out only dates, titles and descriptions
 * from this one calendar (no guests, locations or other calendars).
 *
 * Setup (once):
 *   1. https://script.google.com  →  New project, name it "Lunch Menu feed".
 *   2. Replace the code with this file and set CALENDAR_ID below
 *      (Calendar → the lunch calendar → Settings and sharing → Integrate calendar).
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as:     Me
 *        Who has access: Anyone
 *      Authorize when asked, then copy the Web app URL (ends in /exec).
 *   4. In Anthias, paste that URL into the Lunch Menu app's "Calendar feed URL".
 *
 * Test it in a browser:  <web app URL>?from=2026-11-10&to=2026-11-17
 */

const CALENDAR_ID = 'PASTE-THE-LUNCH-CALENDAR-ID-HERE@group.calendar.google.com'
const MAX_DAYS = 31 // refuse oversized ranges

function doGet(e) {
  const tz = Session.getScriptTimeZone()
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd')
  const from = valid(e && e.parameter.from) || today
  const to = valid(e && e.parameter.to) || from

  const start = parse(from)
  const end = parse(to)
  end.setDate(end.getDate() + 1) // inclusive "to"
  if ((end - start) / 864e5 > MAX_DAYS) return json({ error: 'range too large' })

  const cal = CalendarApp.getCalendarById(CALENDAR_ID)
  if (!cal) return json({ error: 'calendar not found' })

  const events = []
  cal.getEvents(start, end).forEach(function (ev) {
    const title = ev.getTitle()
    const description = ev.getDescription()
    if (ev.isAllDayEvent()) {
      // An all-day event can span several days; list it on each.
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

function valid(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : ''
}

function parse(s) {
  const p = s.split('-').map(Number)
  return new Date(p[0], p[1] - 1, p[2])
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
