// School Birthdays — a small Google Apps Script that lets the signage Birthday
// app show today's and upcoming birthdays from a PRIVATE CSV on Google Drive.
//
// The CSV stays private in Drive. The script hands a screen only what it shows:
// a first name (optionally with the last initial) and the month and day,
// never the year, the age, the full name or the student number. And only with
// the secret KEY below.
//
// The CSV (the student system's export) needs a header line with at least a
// first name and a birthdate column; these are recognised:
//   First Name / First / Given Name    Last Name / Last / Surname
//   Birthdate / Birth Date / Birthday / DOB / Date of Birth
//   optional: Exclude / Opt Out / Hide (any value = left out), Show (FALSE = left out)
// Dates like 3/14/2015, 2015-03-14, 14-Mar-2015 or March 14, 2015 all work.
//
// Folders: ONE "Birthdays" folder. Put the CSV in it; the NEWEST CSV is used, so
// next year just drop the new export in (and delete the old one). For several
// schools, make a subfolder per school with its own CSV and name it in the
// app's "Folder" setting (empty = the CSV directly in the Birthdays folder).
//
// Setup (once): same as the Gallery script.
//   1. Make the "Birthdays" folder in Drive (preferably the "signage" account),
//      shared with nobody. Paste its ID below (the last part of its address).
//   2. Make up a KEY below: letters and numbers only.
//   3. script.google.com → New project "School Birthdays" → paste this file → Save.
//   4. Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone.
//      Copy the URL (ends in /exec).
//   5. Anthias: the Birthday app → "Birthday feed URL" and "Secret key".
//
// Test:  <URL>?key=<KEY>&days=30
// After changing this code: Deploy → Manage deployments → pencil → New version.

const PARENT_FOLDER_ID = 'PASTE-THE-BIRTHDAYS-FOLDER-ID-HERE'
const KEY = 'CHANGE-ME-TO-A-LONG-RANDOM-WORD'
const MAX_DAYS = 120

function doGet(e) {
  const p = (e && e.parameter) || {}
  if (!KEY || KEY.indexOf('CHANGE-ME') === 0 || p.key !== KEY) return json({ error: 'not allowed' })
  const folderId = findFolder(p.folder)
  if (!folderId) return json({ error: 'no folder named "' + (p.folder || '') + '"' })
  const csv = newestCsv(folderId)
  if (!csv) return json({ error: 'no CSV in the folder' })

  const tz = Session.getScriptTimeZone()
  const start = /^\d{4}-\d{2}-\d{2}$/.test(p.from || '') ? ymdDate(p.from) : ymdDate(Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'))
  const days = Math.max(0, Math.min(MAX_DAYS, parseInt(p.days, 10) || 0))
  const initial = p.names === 'initial'

  const people = readCsv(csv)
  const out = []
  for (let i = 0; i <= days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const m = d.getMonth() + 1
    const day = d.getDate()
    // Feb 29 birthdays are celebrated on Feb 28 in other years
    const leapless = m === 2 && day === 28 && new Date(d.getFullYear(), 1, 29).getMonth() !== 1
    people.forEach(function (s) {
      if (s.m === m && (s.d === day || (leapless && s.d === 29))) {
        out.push({ date: Utilities.formatDate(d, tz, 'yyyy-MM-dd'), name: s.first + (initial && s.last ? ' ' + s.last.charAt(0).toUpperCase() + '.' : '') })
      }
    })
  }
  return json({ birthdays: out })
}

function findFolder(name) {
  name = String(name || '').trim().toLowerCase()
  if (!name) return PARENT_FOLDER_ID
  const it = DriveApp.getFolderById(PARENT_FOLDER_ID).getFolders()
  while (it.hasNext()) {
    const f = it.next()
    if (f.getName().trim().toLowerCase() === name) return f.getId()
  }
  return ''
}

function newestCsv(folderId) {
  let best = null
  const it = DriveApp.getFolderById(folderId).getFiles()
  while (it.hasNext()) {
    const f = it.next()
    const isCsv = /\.csv$/i.test(f.getName()) || /csv/.test(f.getMimeType())
    if (isCsv && (!best || f.getLastUpdated() > best.getLastUpdated())) best = f
  }
  return best
}

// [{ first, last, m, d }] from the CSV, leaving out excluded rows and rows
// without a usable date.
function readCsv(file) {
  const rows = Utilities.parseCsv(file.getBlob().getDataAsString().replace(/^﻿/, ''))
  if (!rows.length) return []
  const head = rows[0].map(function (h) { return String(h).toLowerCase().replace(/[^a-z]/g, '') })
  const col = function (names) { for (let i = 0; i < names.length; i++) { const k = head.indexOf(names[i]); if (k >= 0) return k } return -1 }
  const cFirst = col(['firstname', 'first', 'givenname', 'preferredname'])
  const cLast = col(['lastname', 'last', 'surname', 'familyname'])
  const cDate = col(['birthdate', 'birthday', 'dob', 'dateofbirth', 'birthdt'])
  const cExclude = col(['exclude', 'optout', 'hide', 'directoryoptout'])
  const cShow = col(['show'])
  if (cFirst < 0 || cDate < 0) throw new Error('The CSV needs a first name and a birthdate column.')
  const out = []
  rows.slice(1).forEach(function (r) {
    const cell = function (c) { return c >= 0 && r[c] != null ? String(r[c]).trim() : '' }
    if (cExclude >= 0 && cell(cExclude) && !/^(no|n|false|0)$/i.test(cell(cExclude))) return
    if (cShow >= 0 && /^(no|n|false|0)$/i.test(cell(cShow))) return
    const md = monthDay(cell(cDate))
    const first = cell(cFirst)
    if (!md || !first) return
    out.push({ first: first, last: cell(cLast), m: md[0], d: md[1] })
  })
  return out
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
// [month, day] from the usual export formats; null when it can't tell.
function monthDay(s) {
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (m) return ok(+m[2], +m[3])
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(s) // US: month first
  if (m) return ok(+m[1], +m[2])
  m = /^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-,]+(\d{2,4})/.exec(s) // 14-Mar-2015
  if (m && MONTHS.indexOf(m[2].toLowerCase()) >= 0) return ok(MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1])
  m = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})/.exec(s) // March 14, 2015
  if (m && MONTHS.indexOf(m[1].toLowerCase()) >= 0) return ok(MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2])
  return null
}
function ok(mo, d) { return mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? [mo, d] : null }
function ymdDate(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]) }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON) }
