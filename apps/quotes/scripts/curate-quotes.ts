#!/usr/bin/env bun
// One-off data builder (not part of `bun run build`). Fetches the open,
// MIT-licensed Quotable dataset and curates a work-friendly candidate set.
// Re-run to regenerate:
//   bun run scripts/curate-quotes.ts
//
// Curation rules: drop sensitive themes (politics/war/religion/etc.), keep
// short punchy lines that read well on a screen, dedupe, and cap per author so
// no single voice dominates. Output is a plain {text, author}[] sorted for a
// stable, review-friendly diff.
//
// IMPORTANT: this produces *candidates*, not the shipped data. The committed
// assets/static/data/quotes.json has additionally been adversarially
// fact-checked (wording + attribution) and only verified quotes were kept —
// see docs/AUDIT.md. Newly curated quotes must be verified the same way before
// being added to the shipped file.

export {} // top-level await needs this file treated as a module

const SOURCE =
  'https://raw.githubusercontent.com/quotable-io/data/master/data/quotes.json'
const DEST = 'assets/static/data/quotes.json'
const TARGET = 500
const MIN_LEN = 25
const MAX_LEN = 150
const MAX_PER_AUTHOR = 6

// Themes we keep out of a work-friendly signage rotation.
const BLOCKED_TAGS = new Set([
  'Politics',
  'Conservative',
  'War',
  'Religion',
  'Spirituality',
  'Faith',
  'Social Justice',
  'Power Quotes',
  'Sadness',
  'Pain'
])

// Whole-word matches that don't belong on an office wall.
const BLOCKED_WORDS =
  /\b(god|religion|war|kill(?:ed|ing)?|death|dead|die|dying|hell|damn|sex|drunk|drugs?|suicide)\b/i

type SourceQuote = { content: string; author: string; tags?: string[] }
type Quote = { text: string; author: string }

const res = await fetch(SOURCE)
if (!res.ok) {
  console.error(`✗ Failed to fetch source: ${res.status} ${res.statusText}`)
  process.exit(1)
}
const source = (await res.json()) as SourceQuote[]

const seen = new Set<string>()
const perAuthor = new Map<string, number>()
const pool: Quote[] = []

const candidates = source
  .map((q) => ({ text: q.content?.trim() ?? '', author: q.author?.trim() ?? '', tags: q.tags ?? [] }))
  .filter((q) => q.text.length >= MIN_LEN && q.text.length <= MAX_LEN)
  .filter((q) => q.author.length > 0)
  .filter((q) => !q.tags.some((t) => BLOCKED_TAGS.has(t)))
  .filter((q) => !BLOCKED_WORDS.test(q.text))
  // Sort by length so the per-author cap keeps each voice's tightest lines and
  // so the even sample below spans the whole short→long range.
  .sort((a, b) => a.text.length - b.text.length || a.text.localeCompare(b.text))

for (const q of candidates) {
  const key = q.text.toLowerCase()
  if (seen.has(key)) continue
  const count = perAuthor.get(q.author) ?? 0
  if (count >= MAX_PER_AUTHOR) continue
  seen.add(key)
  perAuthor.set(q.author, count + 1)
  pool.push({ text: q.text, author: q.author })
}

// Take an evenly spaced sample across the length-sorted pool so the final set
// spans concise one-liners through fuller ~150-char quotes, not just the shortest.
const curated: Quote[] = []
if (pool.length <= TARGET) {
  curated.push(...pool)
} else {
  const stride = pool.length / TARGET
  for (let i = 0; i < TARGET; i++) curated.push(pool[Math.floor(i * stride)])
}

// Stable alphabetical order by author then text for a clean, reviewable diff.
curated.sort((a, b) => a.author.localeCompare(b.author) || a.text.localeCompare(b.text))

await Bun.write(DEST, `${JSON.stringify(curated, null, 2)}\n`)
console.log(
  `✓ Wrote ${curated.length} quotes to ${DEST} (from ${source.length} source quotes, ${perAuthor.size} authors).`
)
