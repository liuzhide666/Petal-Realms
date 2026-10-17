#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
TARGET_SITE='2b2abcc1-06c1-4098-b0aa-373d2de3caf3'
if ! command -v netlify >/dev/null 2>&1; then
  printf '%s\n' 'Netlify CLI is not installed. Install it in your own authenticated environment; no tokens are embedded in this package.' >&2
  exit 1
fi
if [ "${1:-}" = '--prod' ]; then
  printf '%s\n' "WARNING: This will replace production at https://stellular-khapse-5c19f8.netlify.app"
  printf '%s\n' "Target site ID: $TARGET_SITE"
  netlify deploy --prod --dir=site --site="$TARGET_SITE" --message='Petal Realms V5.3 cloud-recovery'
else
  printf '%s\n' "Creating draft preview, not changing production: $TARGET_SITE"
  netlify deploy --dir=site --site="$TARGET_SITE" --message='Petal Realms V5.3 cloud-recovery preview'
fi
