// Pure, framework-free helpers for the quotes app. Kept separate from main.ts
// so they can be unit-tested with `bun:test`; main.ts is the (untestable,
// no-exports) browser entry that wires these into the DOM.

export type Quote = { text: string; author: string }

// Returns an integer in [0, length). `rng` is injectable so tests are
// deterministic. Guards against empty/invalid input and an rng that returns 1.
export const pickRandomIndex = (length: number, rng: () => number = Math.random): number => {
  if (!Number.isFinite(length) || length <= 0) return 0
  return Math.min(length - 1, Math.floor(rng() * length))
}

// Runtime type guard — the fetched JSON is untrusted `unknown` until validated.
export const isQuote = (value: unknown): value is Quote => {
  if (typeof value !== 'object' || value === null) return false
  const quote = value as Record<string, unknown>
  return (
    typeof quote.text === 'string' &&
    quote.text.length > 0 &&
    typeof quote.author === 'string' &&
    quote.author.length > 0
  )
}

// ---------- the school's own quotes, from a Google Sheet ----------
// Columns: Show, Quote, Author. Author may be empty.

// Accepts a "Publish to web" link (CSV or web page) or a normal sheet link
// shared "anyone with the link", and returns a CSV URL.
export const csvUrl = (u: string): string => {
  if (!u) return ''
  if (/\/pubhtml/.test(u)) u = u.replace(/\/pubhtml(\?[^#]*)?(#.*)?$/, '/pub$1')
  if (/\/pub(\?|$)/.test(u)) return /[?&]output=csv/.test(u) ? u : `${u}${u.includes('?') ? '&' : '?'}output=csv`
  const m = /\/spreadsheets\/d\/([\w-]{20,})/.exec(u)
  if (m) {
    const gid = /[#&?]gid=(\d+)/.exec(u)
    return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid[1]}` : ''}`
  }
  return u
}

export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else q = false
      } else cell += c
    } else if (c === '"') q = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

const norm = (s: string): string =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Returns the ticked quotes, or null when the CSV isn't a quotes tab at all.
export const readSheet = (text: string): Quote[] | null => {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()))
  if (!rows.length) return null
  const head = rows[0].map(norm)
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h))
  const cShow = col('show')
  const cText = col('quote', 'text')
  const cAuthor = col('author', 'by', 'who')
  if (cText < 0) return null
  const out: Quote[] = []
  for (const r of rows.slice(1)) {
    const cell = (c: number) => (c >= 0 && r[c] ? r[c].trim() : '')
    if (cShow >= 0 && !/^(true|yes|y|x|1|✓|✔)$/i.test(cell(cShow))) continue
    const text = cell(cText)
    if (text) out.push({ text, author: cell(cAuthor) })
  }
  return out
}
