# CLAUDE.md

Guidance for working in this repo.

## What this is

A **static** full-screen quotes display for digital signage, hosted on **GitHub
Pages**. It shows one random work-friendly quote per page load. Sibling to the
`weather-app` and `clock-app`, but those are Cloudflare Workers (Hono SSR) — this
one has **no server**. There is no Worker, no `wrangler`, no edge runtime: just
HTML/CSS/JS served as files. Random selection is client-side.

## Stack & conventions

- **Bun** for everything (package manager, bundler, test runner). Use `bun` /
  `bunx` — never npm/npx.
- **TypeScript**, strict. All browser JS is authored as `.ts` and bundled by Bun.
- **Tailwind CSS v4**, CSS-first: tokens live in `@theme` in
  `assets/static/styles/tailwind.css`; compiled by `@tailwindcss/cli` at build.
- **Biome** for lint/format: single quotes, no semicolons, 2-space, 100 cols.
  CSS is intentionally excluded from Biome (it doesn't parse Tailwind at-rules).

## Commands

```sh
bun install         # deps; vendored fonts come from @fontsource via sync-fonts
bun run dev         # build + serve dist/ locally
bun run build       # assemble dist/ (see below)
bun test            # bun:test — helpers + dataset validation
bun run typecheck   # tsc --noEmit
bun run lint        # biome lint --error-on-warnings
bun run curate-quotes  # regenerate assets/static/data/quotes.json (one-off)
```

## Layout & build

Web root is served from the site root (custom domain), so assets are referenced
absolutely as `/static/...`.

- `index.html` — the page shell. Ships a fallback quote inline so the screen is
  never blank pre-JS. Asset URLs carry `?v=__ASSET_VERSION__`, replaced at build.
- `assets/static/js/quotes.ts` — **pure, exported, unit-tested** helpers
  (`pickRandomIndex`, `isQuote`, the `Quote` type).
- `assets/static/js/main.ts` — the browser **entry**. Fetches `quotes.json`,
  picks one, writes it to the DOM, with a graceful fallback. Keep it
  **export-free** and free of top-level `await` so Bun bundles it to a
  self-contained classic script (loads from a plain `<script>`).
- `assets/static/data/quotes.json` — 487 `{text, author}`, **adversarially
  fact-checked** for wording + attribution (see `docs/AUDIT.md`).
  `scripts/curate-quotes.ts` generates raw *candidates* from the MIT-licensed
  Quotable dataset; the shipped file is the verified subset. New quotes must be
  verified the same way before being added.
- `.well-known/signage-app.json` — the app-store manifest (spec: see
  `docs/app-manifest.md` in the sibling `Screenly-Labs/app-store` repo):
  the app's own machine-readable description that the store and players read.
  Quotes is a no-settings, single-shot app, so it has no `settings`, no `launch.template`,
  and no `playback` block. Served from the site root at `/.well-known/signage-app.json`
  (GitHub Pages sends `application/json` + `Access-Control-Allow-Origin: *`).
  `test/manifest.test.ts` guards it against the store's schema.

`build.js` builds into `dist/` **without mutating sources**: vendor fonts → copy
`index.html` + static assets (incl. `.well-known/`) → compile+minify Tailwind →
bundle+minify the TS → stamp a sha256 content hash into `?v=` URLs → write `CNAME`.
`dist/` is gitignored and is the artifact GitHub Pages publishes.

## Design — "Reading room"

Fraunces serif quote over warm ink (`--color-ink`), paper text, an oversized
quotation-glyph watermark behind the quote, and a gilt hairline + letterspaced
Hanken Grotesk byline. One fluid root font-size (`clamp(vw+vh)`) drives the whole
scale and is orientation-neutral; children size in `rem`, so it works from the
800×480 Pi display to 4K, portrait and landscape, with no breakpoints. The
single load animation is gated behind `prefers-reduced-motion`.

## Quality bars

- **Accessibility:** target a 100 Lighthouse/PageSpeed accessibility score —
  semantic `figure`/`blockquote`/`cite`, AA contrast, `lang`, named links,
  zoomable viewport, reduced-motion respected.
- **Resolutions:** must look correct at every entry in the README table, both
  orientations.
- Run `typecheck`, `lint`, and `test` before pushing (CI enforces them).

## Deploy

Push to **`master`** → `.github/workflows/deploy-pages.yml` builds and publishes
to Pages. PRs run `ci.yml` (typecheck + lint + test + build). Action versions are
SHA-pinned.
