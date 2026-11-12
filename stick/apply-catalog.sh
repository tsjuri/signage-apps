#!/usr/bin/env bash
# Point an Anthias player's app catalog (Add -> Apps) at this repo's apps, and
# (by default) switch the viewer's browser to software rendering.
#
# Software rendering: on Intel Atom "Cherry Trail" players (e.g. Intel Compute
# Stick STK1AW32SC) any animated page hard-froze the machine through the i915
# graphics driver. With the browser drawing on the CPU it runs fine. Turn it off
# for players with a solid GPU stack:  SOFTWARE_RENDERING=0 bash apply-catalog.sh
#
#   curl -fsSL https://tsjuri.github.io/signage-apps/apply-catalog.sh | bash
#
# Safe to run more than once. Re-run it after every Anthias upgrade, because
# the upgrade regenerates docker-compose.yml.
set -euo pipefail

INDEX_URL="${INDEX_URL:-https://tsjuri.github.io/signage-apps/manifest.json}"
HOSTS="${HOSTS:-tsjuri.github.io,.srly.io,.signage-apps.com}"
DIR="${ANTHIAS_DIR:-$HOME/anthias}"
SOFTWARE_RENDERING="${SOFTWARE_RENDERING:-1}"
GPU_FLAGS='--disable-gpu --disable-gpu-compositing'

patch() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  # Drop any earlier copy of our lines, then add them under anthias-server's LISTEN line.
  sed -i '/APP_STORE_INDEX_URL=/d; /APP_STORE_ALLOWED_HOST_SUFFIXES=/d' "$f"
  if ! grep -q -- '- LISTEN=0.0.0.0' "$f"; then
    echo "!! $f: could not find anthias-server's environment block; not changed." >&2
    return 1
  fi
  sed -i "0,/      - LISTEN=0.0.0.0/s##      - LISTEN=0.0.0.0\n      - APP_STORE_INDEX_URL=${INDEX_URL}\n      - APP_STORE_ALLOWED_HOST_SUFFIXES=${HOSTS}#" "$f"
  echo "✓ catalog set in $f"

  # The viewer's browser flags, under anthias-viewer's NOREFRESH line.
  sed -i '/QTWEBENGINE_CHROMIUM_FLAGS=/d' "$f"
  if [[ "$SOFTWARE_RENDERING" == "1" ]]; then
    if grep -q -- '- NOREFRESH=1' "$f"; then
      sed -i "0,/      - NOREFRESH=1/s##      - NOREFRESH=1\n      - QTWEBENGINE_CHROMIUM_FLAGS=${GPU_FLAGS}#" "$f"
      echo "✓ software rendering on in $f"
    else
      echo "!! $f: could not find anthias-viewer's environment block; software rendering not set." >&2
    fi
  fi
}

patch "$DIR/docker-compose.yml"
# Deliberately NOT touching docker-compose.yml.tmpl: it is tracked in Anthias'
# git checkout, and a local edit there could get in the way of an upgrade.

cd "$DIR"
FILES=(-f docker-compose.yml)
[[ -f docker-compose.ssl.override.yml ]] && FILES+=(-f docker-compose.ssl.override.yml)
sudo -E docker compose "${FILES[@]}" up -d anthias-server anthias-viewer

echo
echo "Done. In the dashboard, Add -> Apps now lists the apps from:"
echo "  $INDEX_URL"
