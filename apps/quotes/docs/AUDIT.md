# Quote verification audit

The shipped dataset (`assets/static/data/quotes.json`) is not the raw output of
`scripts/curate-quotes.ts`. Every quote was **adversarially fact-checked** —
assume each is wrong until a reputable source proves both the wording and the
attribution — and only verified quotes were kept.

## Why

Open quote datasets (Quotable included) are riddled with misquotes and
misattributions that propagate from quote-aggregator sites. For unattended
signage, putting a fabricated or wrongly-credited quote on screen is a real
brand risk. So we verified rather than trusted.

## Method

Each quote was checked by an independent web-research pass that had to find an
authoritative source for the exact wording **and** the true author:

- **Sufficient evidence:** primary sources (the actual book/speech/essay),
  Wikiquote's *Sourced* section only, reputable books, encyclopedias, major
  news/academic references, Quote Investigator.
- **Not sufficient on its own:** BrainyQuote, Goodreads, AZQuotes, QuoteFancy,
  and Wikiquote's *Misattributed/Unsourced* sections.

Verdicts:

| Verdict | Meaning |
| --- | --- |
| **keep / verified** | wording accurate AND correct author, per a reputable source |
| remove / **misattributed** | credited to the wrong person (real author recorded) |
| remove / **misquoted** | wording materially altered, fabricated, or a loose paraphrase sold as verbatim |
| remove / **unverifiable** | no reputable source — apocryphal, anonymous, or aggregator-only |

The bar was deliberately strict: no low-confidence "keep"; when in doubt, remove.
The first 500-quote pass also got a second skeptical re-verification of survivors.

## Results

A total of **1,430 quotes were audited** (the original 500 curated set + 930
backfill candidates). **487 passed** and ship; **943 were removed.**

| Pool | Audited | Verified | Removed (unverifiable / misattributed / misquoted) |
| --- | --- | --- | --- |
| Original curated set | 500 | 163 | 337 (200 / 54 / 83) |
| Backfill candidates | 930 | 324 | 606 (384 / 92 / 130) |
| **Total** | **1,430** | **487** | **943 (584 / 146 / 213)** |

That is a **~34% pass rate** — a direct measure of how unreliable the raw source
data was, and why the audit was worth doing.

## A sample of corrected misattributions

Quotes that were confidently credited to the wrong person (removed; the dataset
does not silently "fix" attributions):

| Quote (excerpt) | Was credited to | Actually |
| --- | --- | --- |
| "Do one thing every day that scares you." | Eleanor Roosevelt | Mary Schmich |
| "It is never too late to be what you might have been." | George Eliot | Adelaide Anne Procter (probable) |
| "The world is a book, and those who do not travel…" | Augustine of Hippo | Richard Lassels |
| "Honesty is the best policy." | Benjamin Franklin | Sir Edwin Sandys (traditional proverb) |
| "Love doesn't make the world go round; love is what makes the ride worthwhile." | Elizabeth Barrett Browning | Franklin P. Jones |
| "The grand essentials of happiness are: something to do, something to love, something to hope for." | Alexander Chalmers | George Washington Burnap |
| "Gratitude is riches. Complaint is poverty." | Doris Day | Vivian Burnett |
| "We've got to have a dream if we are going to make a dream come true." | Walt Disney | Denis Waitley |

(54 corrected misattributions were found in the original set alone; 92 more in
the backfill.)

## Reproducing / extending

`scripts/curate-quotes.ts` regenerates the raw candidate set from Quotable. The
verification itself was run as a multi-agent web-research pass over that set; the
audit is not part of `bun run build`. To grow the dataset, curate fresh
candidates and run them through the same assume-wrong verification before adding.
