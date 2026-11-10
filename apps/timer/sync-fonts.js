#!/usr/bin/env bun
// Vendor this app's webfonts into ./assets/static/fonts. The files, versions,
// and copy logic all live in @screenly-labs/signage-kit; this just names the
// families the "Countdown" design uses (Bricolage Grotesque display + Hanken
// Grotesk for the labels and target line).

import { syncFonts } from '@screenly-labs/signage-kit/sync-fonts'

export const run = () => syncFonts(['bricolage-grotesque', 'hanken-grotesk'])

if (import.meta.main) {
  await run()
}
