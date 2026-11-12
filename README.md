# signage-apps

Logo-free signage apps for [Anthias](https://anthias.screenly.io), served from GitHub Pages
as a private app catalog. Staff add them in the Anthias dashboard under **Add → Apps**, exactly
like the stock ones.

The apps are adapted from [Screenly-Labs](https://github.com/Screenly-Labs)' open-source signage
apps and its shared [signage-kit](https://github.com/Screenly-Labs/signage-kit), all licensed
**AGPL-3.0**. This repository is the corresponding source of the modified versions. It is not
affiliated with or endorsed by Screenly.

## What was changed

- The "Powered by Screenly" badge is removed (`kit/src/branding.ts`, `kit/styles/brand.css`,
  and stripped from the built HTML).
- Google Analytics, Sentry and player telemetry are removed (`kit/src/analytics.ts`, and
  stripped from the built HTML). The apps send nothing to Screenly or Google.
- Paths are rewritten so every app can live in a sub-folder of one Pages site.
- `clock` and `moon` were Cloudflare Workers; they are rendered to static HTML at build time
  (see `SSR` in `build.mjs`). Clock uses US / America/New_York. Moon defaults to Kingston, NY;
  its per-screen Location setting still works, read from the URL in the browser.
- Each app's manifest points at this site instead of `*.srly.io`.

## Apps

**Our own:** observances (heritage/awareness months, school weeks and days, one animated
slide each, shown automatically when current; edit `apps/observances/data.js` to add or change
one), lunch-menu (five rolling school days from a Google Calendar, banner images
picked from `media/`; see `apps/lunch-menu/apps-script/` for a private calendar).

**Adapted from Screenly-Labs:** birthday, capitals, clock, menu-board, missing-children, moon, on-this-day, opening-hours,
quotes, team-milestone, timer, word, world-clock.

Not included (they need a server, an API key or a scheduled scraper): air quality, weather,
RSS, Product Hunt, Silver Alert.

## Publishing

Push to `main`. The workflow in `.github/workflows/pages.yml` builds everything with Bun and
publishes to GitHub Pages. One-time setting: **Settings → Pages → Source: GitHub Actions**.

The catalog index is then at `https://tsjuri.github.io/signage-apps/manifest.json`.

Build locally (needs [Bun](https://bun.sh)): `bun build.mjs` → `site/`.
Note: the clock's build minifies its sources in place, so build in a throwaway copy.

## Pointing a player at the catalog

On the player, over SSH:

```
curl -fsSL https://tsjuri.github.io/signage-apps/apply-catalog.sh | bash
```

This adds `APP_STORE_INDEX_URL` and `APP_STORE_ALLOWED_HOST_SUFFIXES` to the `anthias-server`
service, switches the viewer's browser to software rendering
(`QTWEBENGINE_CHROMIUM_FLAGS=--disable-gpu --disable-gpu-compositing`), and restarts both.
Software rendering is there for Intel Atom "Cherry Trail" players such as the Compute Stick
STK1AW32SC: with GPU rendering, any animated page hard-froze the machine in the i915 driver.
Skip it on players with a solid GPU stack: `SOFTWARE_RENDERING=0`. **Re-run it after every Anthias upgrade**, which regenerates
`docker-compose.yml`. Source: `stick/apply-catalog.sh`.

Assets already added keep working either way: an installed app is stored as its full URL.

## Banner images (`media/`)

Upload photos to `media/` (github.com → Add file → Upload files) and push. They are published
at `<site>/media/` and appear in the Lunch Menu's image dropdowns after the next build.
Square photos work best; they are shown as round plates.

## Adding or changing an app

Edit it under `apps/<id>/` (a fork of the Screenly-Labs source) and push. To add another of
their apps, copy its repo into `apps/<id>/` and point its `@screenly-labs/signage-kit`
dependency at `file:../../kit`.
