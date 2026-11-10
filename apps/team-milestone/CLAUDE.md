# CLAUDE.md

Guidance for working in this repo.

## What this is

A **static** full-screen team-milestone celebration for digital signage, hosted
on **GitHub Pages**. It puts a named team's milestone value front and centre
(*5 Years*, *1,000,000 Users*, *Project Shipped*) with an optional caption,
message, and date, under a confetti shower. Sibling to the `quotes` app (also
static, also Pages) and to `opening-hours` / `birthday` (also settings apps).
There is **no server**; all logic is client-side.

Like Opening Hours, this is a **settings** app: the milestone isn't baked in, it
arrives in the launch URL's query string (`?team=…&value=…&label=…&message=…&date=…`).
One deployment celebrates any team. **One milestone per screen**, single-shot
page — no rotation loop; the player reloads on its own schedule.

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
bun test            # bun:test — helpers + manifest validation
bun run typecheck   # tsc --noEmit
bun run lint        # biome lint --error-on-warnings
```

## Layout & build

Web root is served from the site root (custom domain), so assets are referenced
absolutely as `/static/...`.

- `index.html` — the page shell. Ships a worked example inline (Team Phoenix / 5
  Years) so the screen is never blank pre-JS or in the store preview. Asset URLs
  carry `?v=__ASSET_VERSION__`, replaced at build.
- `assets/static/js/milestone.ts` — **pure, exported, unit-tested** helpers and
  types (`MilestoneConfig`, `parseConfig`, `buildConfetti`).
- `assets/static/js/main.ts` — the browser **entry**. Reads the query string,
  renders team/value/label/message/date (hiding absent optional lines), and
  scatters the confetti from `buildConfetti`. Keep it **export-free** and free of
  top-level `await`.
- `.well-known/signage-app.json` — the app-store manifest (settings schema +
  launch template). `test/manifest.test.ts` validates it.

`build.js` builds into `dist/` **without mutating sources**: vendor fonts → copy
`index.html` + static assets + `.well-known` → compile+minify Tailwind → bundle+
minify the TS → stamp a sha256 content hash into `?v=` URLs → write `CNAME`
(`team-milestone.srly.io`). `dist/` is gitignored and is the Pages artifact.

## Design — "Ovation"

Bricolage Grotesque display face over a deep midnight-navy ground lit by a warm
gold burst; the milestone value is the hero, the team name a small gilt eyebrow
above it, and confetti falls quietly behind. One fluid root font-size
(`clamp(vw + vh)`) drives the whole scale and is orientation-neutral; children
size in `rem`, so it works from the 800×480 Pi display to 4K, portrait and
landscape, with no breakpoints. The confetti fall and the entrance are gated
behind `prefers-reduced-motion`; when reduced, the confetti holds still as a
full-frame scatter (kept, not hidden — it's the signature) and the entrance is
disabled. The confetti is a restrained gold-and-white ticker-tape (distinct from
the Birthday app's multicolour party confetti). Its palette lives in a plain
`:root{}` block, **not** `@theme`: Tailwind v4 tree-shakes theme vars it can't see
referenced in the CSS, and the colours are only referenced from JS-set inline
styles, so in `@theme` all but the fallback would be dropped and the shower would
render one colour.

## Quality bars

- **Accessibility:** semantic `h1` (the milestone value), decorative confetti
  marked `aria-hidden`, AA contrast, `lang`, named links, zoomable viewport,
  reduced-motion respected.
- **Resolutions:** must look correct at every entry in the README table, both
  orientations.
- Run `typecheck`, `lint`, and `test` before pushing (CI enforces them).

## Deploy

Push to **`master`** → `.github/workflows/deploy-pages.yml` builds and publishes
to Pages. PRs run `ci.yml` (typecheck + lint + test + build). Action versions are
SHA-pinned.
