#!/usr/bin/env bash
# Runs the Stock Audit pure-logic tests (node:test) by bundling them with esbuild.
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="$(mktemp -d)"
for t in components/stockAudit/data/*.test.js; do
  npx --yes esbuild@0.24.2 "$t" --bundle --platform=node --format=esm --log-level=error \
    --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
    --outfile="$OUT/$(basename "$t" .js).mjs"
done
node --test "$OUT"/*.mjs
