#!/usr/bin/env bash
# Builds the standalone Stock Audit & SAPL PREVIEW (sample data only) into $1.
# Needs esbuild (npx esbuild works). Not part of the Next.js build or deploy.
set -euo pipefail
OUT="${1:-preview-dist}"
cd "$(dirname "$0")/../.."
mkdir -p "$OUT/assets"
npx --yes esbuild@0.24.2 preview/stock-audit/entry.jsx --bundle --minify --loader:.js=jsx \
  --define:process.env.NODE_ENV=\"production\" --target=es2018 --outfile="$OUT/app.js"
cp preview/stock-audit/index.html "$OUT/index.html"
cp public/assets/dnds-logo.png "$OUT/assets/dnds-logo.png"
echo "Preview built in $OUT"
