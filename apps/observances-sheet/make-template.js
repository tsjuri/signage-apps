#!/usr/bin/env node
// Writes observances-template.csv: the starting Google Sheet for a school.
// Run: node make-template.js   (then File → Import in Google Sheets, or upload)
const fs = require('fs')
const vm = require('vm')
const ctx = { window: {} }
vm.runInNewContext(fs.readFileSync(__dirname + '/../observances/data.js', 'utf8'), ctx)
const { OBSERVANCES } = ctx.window

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SH = MONTHS.map((m) => m.slice(0, 3))
const ORD = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', '-1': 'Last' }
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SPECIAL = {
  'american-education-week': 'Week before Thanksgiving week',
  'admin-professionals': 'Wednesday of the last full week of April',
  'school-nurse': 'Wednesday between May 6 and 12',
  'lunar-new-year': 'Lunar New Year (late Jan or Feb)'
}
const KIND = { heritage: 'Heritage', awareness: 'Awareness', safety: 'Safety', school: 'School', day: 'Day', holiday: 'Holiday' }

function when(w) {
  if (w.month) return `All of ${MONTHS[w.month - 1]}`
  if (w.range) return `${SH[w.range[0] - 1]} ${w.range[1]} – ${SH[w.range[2] - 1]} ${w.range[3]}`
  if (w.day) return `Every ${SH[w.day[0] - 1]} ${w.day[1]}`
  if (w.nth) return `${ORD[w.nth[1]]} ${DAY[w.nth[2]]} of ${MONTHS[w.nth[0] - 1]}`
  if (w.weekOf) return `Week of ${SH[w.weekOf[0] - 1]} ${w.weekOf[1]}`
  if (w.fullWeek) return `First full week of ${MONTHS[w.fullWeek[0] - 1]}`
  return SPECIAL[w.special] || ''
}
const q = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
const lines = [['Show', 'Observance', 'When', 'Message', 'Kind', 'ID']]
for (const o of OBSERVANCES) lines.push([true, o.title, when(o.when), o.message, KIND[o.type], o.id])
// examples of the school's own events (left unticked)
lines.push([false, 'Spirit Week', '3/15/2027 - 3/19/2027', 'Show your school spirit all week long!', 'School', ''])
lines.push([false, 'Picture Day', '10/7/2026', 'Smile! Picture Day is coming up.', 'School', ''])
fs.writeFileSync(__dirname + '/observances-template.csv', lines.map((l) => l.map((c) => q(c === true ? 'TRUE' : c === false ? 'FALSE' : c)).join(',')).join('\n') + '\n')
console.log(`wrote ${lines.length - 1} rows`)
