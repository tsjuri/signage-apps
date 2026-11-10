# Screenly Birthday App

A full-screen birthday celebration for digital signage. It shows a big,
personalised **"Happy Birthday, {name}!"** in a warm Fraunces serif over a deep
grape ground, under a slow shower of confetti — with an optional message and a
signature line.

![Screenly Birthday App](docs/preview-landscape.png)

Live: **https://birthday.srly.io**

Part of the Screenly signage family alongside the [quotes](../quotes),
[opening-hours](../opening-hours) and [team-milestone](../team-milestone) apps.
Like Quotes, this is a fully **static** site hosted on **GitHub Pages** — there's
no server. Like Opening Hours it takes **settings**: the celebration arrives
entirely in the launch URL's query string, so one deployment celebrates anyone.

## How it's configured

Everything is passed as query parameters — one celebration per screen:

```
https://birthday.srly.io/?name=Alex&message=Have+an+amazing+day!&from=The+Screenly+Team
```

| Param | Meaning |
| --- | --- |
| `name` | Whose birthday it is, shown as *Happy Birthday, {name}!*. Omit it and the greeting stays a plain *Happy Birthday!* |
| `message` | Optional line under the greeting. Omitted, it falls back to a friendly default wish. |
| `from` | Optional signature, rendered as *— {from}*. |

Opened with no parameters (e.g. the store preview), it shows a worked example so
the screen is never blank. There's no rotation and no data to refresh — it's a
single celebratory page the player reloads on its own schedule.

## Resolutions

Designed to look correct full-screen at common signage resolutions, both
orientations. One fluid root font-size (`clamp(vw + vh)`) drives the whole scale,
so there are no breakpoints.

| Resolution | Orientation |
| --- | --- |
| 1920×1080 | Landscape |
| 1080×1920 | Portrait |
| 3840×2160 | Landscape (4K) |
| 800×480 | Landscape (Raspberry Pi touch display) |

The confetti falls only when the viewer hasn't asked to reduce motion; with
`prefers-reduced-motion: reduce` it stills and the greeting stands on its own.

## Development

Requires [Bun](https://bun.sh). Never npm/npx.

```sh
bun install     # deps; vendored fonts come from @fontsource via sync-fonts
bun run dev     # build + serve dist/ locally
bun run build   # assemble dist/ for GitHub Pages
bun test        # bun:test — helpers + manifest validation
bun run typecheck
bun run lint
```

## How it's built

`build.js` assembles `dist/` without mutating sources: vendor fonts → copy
`index.html` + static assets + `.well-known` → compile & minify Tailwind → bundle
& minify the TypeScript → stamp a sha256 content hash into `?v=` asset URLs →
write `CNAME` (`birthday.srly.io`). `dist/` is gitignored and is the artifact
GitHub Pages publishes.

Push to **`master`** and `.github/workflows/deploy-pages.yml` builds and deploys
to Pages. Pull requests run `ci.yml` (typecheck + lint + test + build). Action
versions are SHA-pinned.

## Licence

[AGPL-3.0-only](LICENSE).
