# CLAUDE.md

Guidance for working in this repo.

## What this is

A **static** full-screen countdown / count-up timer for digital signage, hosted
on **GitHub Pages**. It ticks days/hours/minutes/seconds to a target instant and
counts up the elapsed time once it passes. Sibling to the `quotes` app (also
static, also Pages) and to `opening-hours` / `birthday` / `team-milestone` (also
settings apps). There is **no server**; the clock ticks entirely in the browser.

Like Opening Hours, this is a **settings** app: the target isn't baked in, it
arrives in the launch URL's query string (`?title=…&target=…&tz=…&message=…`).
**Direction is automatic**: a future target counts down, a past one counts up;
there is no mode setting. Single self-ticking page (a `setTimeout` loop aligned
to the wall-clock second); the player reloads on its own schedule.

## Stack & conventions

- **Bun** for everything (package manager, bundler, test runner). Use `bun` /
  `bunx`, never npm/npx.
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
bun test            # bun:test for date math + manifest validation
bun run typecheck   # tsc --noEmit
bun run lint        # biome lint --error-on-warnings
```

## Layout & build

Web root is served from the site root (custom domain), so assets are referenced
absolutely as `/static/...`.

- `index.html`: the page shell. Ships a worked example inline (New Year) so the
  screen is never blank pre-JS or in the store preview. Asset URLs carry
  `?v=__ASSET_VERSION__`, replaced at build.
- `assets/static/js/timer.ts`: **pure, exported, unit-tested** helpers and types
  (`parseTarget`, `tzOffsetMs`, `computeState`, `splitDuration`, `pad2`). This is
  where the date/time-zone math lives; keep it framework-free and side-effect-free.
- `assets/static/js/main.ts`: the browser **entry**. Reads the query string,
  resolves the target once, and ticks the four units + direction + target line +
  message on a second-aligned loop. Keep it **export-free** and free of top-level
  `await`.
- `.well-known/signage-app.json`: the app-store manifest (settings schema +
  launch template). `test/manifest.test.ts` validates it.

`build.js` builds into `dist/` **without mutating sources**: vendor fonts → copy
`index.html` + static assets + `.well-known` → compile+minify Tailwind → bundle+
minify the TS → stamp a sha256 content hash into `?v=` URLs → write `CNAME`
(`timer.srly.io`). `dist/` is gitignored and is the Pages artifact.

## Time-zone handling

`parseTarget(raw, tz)` resolves a target string to an epoch-ms instant:

- A string with an explicit offset (`…Z`, `…+02:00`) is absolute; `tz` is ignored.
- A zoneless string is read as wall-clock time in `tz` (or UTC if blank), using a
  two-pass `tzOffsetMs` (via `Intl` tz data) that stays correct across DST.

`tzOffsetMs` uses `Intl.DateTimeFormat` with an explicit `timeZone`, so results
don't depend on the host's local zone; the unit tests assert exact UTC instants.

## Design: "Countdown"

Big tabular Bricolage Grotesque numerals over a graphite ground with one mint
accent; four labelled units on a row (wrapping to 2×2 when narrow), the title
above and the target date below. Tabular figures keep the width from jittering as
the seconds tick. When counting up, the numerals turn mint. One fluid root
font-size (`clamp(vw + vh)`) drives the whole scale, orientation-neutral; children
size in `rem`, so it works from the 800×480 Pi display to 4K, portrait and
landscape, with no breakpoints. The only motion is the tick, so nothing needs
reduced-motion gating beyond the one-off entrance.

## Quality bars

- **Accessibility:** semantic `h1` (title), `role="timer"` with `aria-live="off"`
  so the per-second updates aren't announced, AA contrast, `lang`, named links,
  zoomable viewport.
- **Resolutions:** must look correct at every entry in the README table, both
  orientations.
- Run `typecheck`, `lint`, and `test` before pushing (CI enforces them).

## Deploy

Deploys are **tag-driven**: pushing a CalVer tag (`YYYY.M.PATCH`, e.g.
`2026.8.0`) runs `.github/workflows/deploy-pages.yml`, which builds and publishes
to Pages; it also accepts `workflow_dispatch`. Pushing to `master` on its own
does **not** deploy. PRs run `ci.yml` (typecheck + lint + test + build). Action
versions are SHA-pinned.
