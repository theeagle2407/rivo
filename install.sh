#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-$HOME/Desktop/rivo}"
SOURCE="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$TARGET/package.json" ]] || { echo "Rivo project not found at: $TARGET" >&2; exit 1; }
BACKUP="$(dirname "$TARGET")/rivo-backup-build15.$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP"
for item in src public scripts .env.example README.md; do [[ -e "$TARGET/$item" ]] && cp -R "$TARGET/$item" "$BACKUP/"; done
echo "Previous files backed up to: $BACKUP"
mkdir -p "$TARGET/src/app" "$TARGET/src/components" "$TARGET/public" "$TARGET/scripts"
cp -R "$SOURCE/src/." "$TARGET/src/"; cp -R "$SOURCE/public/." "$TARGET/public/"; cp -R "$SOURCE/scripts/." "$TARGET/scripts/"
rm -f "$TARGET/src/app/api/resolve-account/route.ts" "$TARGET/scripts/setup-paystack.cjs"
cp "$SOURCE/.env.example" "$TARGET/.env.example"; cp "$SOURCE/README.md" "$TARGET/README.md"
cd "$TARGET"; npm install; npm run lint; npm run build
echo; echo "Rivo build 15 installed and verified."
if [[ ! -f "$TARGET/.env.local" ]]; then echo "Next: node scripts/setup-key.cjs \"$TARGET\""; else echo "Your existing .env.local was preserved."; fi
echo "Configure settlement: node scripts/setup-settlement.cjs \"$TARGET\""
