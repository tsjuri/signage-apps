#!/usr/bin/env bash
# Point an Anthias player's app catalog (Add -> Apps) at this repo's apps.
#
#   curl -fsSL https://tsjuri.github.io/signage-apps/apply-catalog.sh | bash
#
# Safe to run more than once. Re-run it after every Anthias upgrade, because
# the upgrade regenerates docker-compose.yml.
set -euo pipefail

INDEX_URL="${INDEX_URL:-https://tsjuri.github.io/signage-apps/manifest.json}"
HOSTS="${HOSTS:-tsjuri.github.io,.srly.io,.signage-apps.com}"
DIR="${ANTHIAS_DIR:-$HOME/anthias}"

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
  echo "✓ patched $f"
}

patch "$DIR/docker-compose.yml"
# Deliberately NOT touching docker-compose.yml.tmpl: it is tracked in Anthias'
# git checkout, and a local edit there could get in the way of an upgrade.

cd "$DIR"
FILES=(-f docker-compose.yml)
[[ -f docker-compose.ssl.override.yml ]] && FILES+=(-f docker-compose.ssl.override.yml)
sudo -E docker compose "${FILES[@]}" up -d anthias-server

echo
echo "Done. In the dashboard, Add -> Apps now lists the apps from:"
echo "  $INDEX_URL"
