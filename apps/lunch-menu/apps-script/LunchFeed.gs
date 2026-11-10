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
 *
 * Banner photos (optional): make a Drive folder, e.g. "Lunch banner", set
 * PHOTO_FOLDER_ID below, and deploy a new version (Deploy → Manage deployments →
 * edit → Version: New). After that, whoever can add files to the folder controls
 * the banner: up to five photos are shown, in name order; with more than five
 * the screens rotate through them, a different five each day.
 * Test:  <web app URL>?photos=1
 */

const CALENDAR_ID = 'PASTE-THE-LUNCH-CALENDAR-ID-HERE@group.calendar.google.com'
const MAX_DAYS = 31 // refuse oversized ranges

// Optional: a Drive folder of banner photos. Open the folder in Drive; the ID is
// the last part of its URL (drive.google.com/drive/folders/<THIS PART>).
// Leave empty to keep using the images picked in the app's settings.
const PHOTO_FOLDER_ID = ''
const PHOTO_WIDTH = 700 // px; plenty for a round plate on a 1080p screen

function doGet(e) {
  if (e && e.parameter.photos) return photos()
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

// All photos in the folder, sorted by name, as small JPEG data URLs. Drive's own
// thumbnailer does the resizing, so a 6 MB phone photo goes out as ~60 KB.
// The screens fetch this a few times a day, so it is cached for an hour.
function photos() {
  if (!PHOTO_FOLDER_ID) return json({ photos: [] })
  const cache = CacheService.getScriptCache()
  const list = []
  const it = DriveApp.getFolderById(PHOTO_FOLDER_ID).getFiles()
  while (it.hasNext()) {
    const f = it.next()
    if (/^image\//.test(f.getMimeType())) list.push(f)
  }
  list.sort(function (a, b) { return a.getName().localeCompare(b.getName()) })

  const token = ScriptApp.getOAuthToken()
  const out = []
  list.slice(0, 30).forEach(function (f) {
    const key = 'p:' + f.getId() + ':' + f.getLastUpdated().getTime()
    let data = cache.get(key)
    if (!data) {
      const blob = resized(f, token)
      if (!blob) return
      data = 'data:' + (blob.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(blob.getBytes())
      if (data.length < 95000) cache.put(key, data, 3600) // cache entries max ~100 KB
    }
    out.push({ name: f.getName(), src: data })
  })
  return json({ photos: out })
}

// A screen-sized copy of a Drive image: Drive's thumbnail link (resizable via its
// =sNNN suffix), or the original file when it is already small.
function resized(f, token) {
  const auth = { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true }
  const meta = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + f.getId() + '?fields=thumbnailLink&supportsAllDrives=true', auth)
  if (meta.getResponseCode() === 200) {
    const link = JSON.parse(meta.getContentText()).thumbnailLink
    if (link) {
      const res = UrlFetchApp.fetch(link.replace(/=s\d+$/, '') + '=s' + PHOTO_WIDTH, auth)
      if (res.getResponseCode() === 200) return res.getBlob()
    }
  }
  return f.getSize() < 400000 ? f.getBlob() : null
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
