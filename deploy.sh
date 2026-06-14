#!/usr/bin/env bash
set -euo pipefail

SERVER="dnds-be"
APP_DIR="~/dnds-store-build"
PM2_NAME="fe"
PORT="3000"
HOSTNAME="0.0.0.0"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

NEXT_VERSION="$(node -p "require('next/package.json').version")"
REACT_VERSION="$(node -p "require('react/package.json').version")"
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"

# Next 11 + webpack 5 fails on Node 17+ without the legacy OpenSSL provider.
if [[ "${NODE_OPTIONS:-}" != *"openssl-legacy-provider"* ]] && (( NODE_MAJOR >= 17 )); then
  export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--openssl-legacy-provider"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building Next.js..."
echo "Next ${NEXT_VERSION} | React ${REACT_VERSION} | Node $(node -v)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -f .env.production ]]; then
  echo "Using .env.production for build-time variables"
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

npm run build

if [[ ! -d .next/server ]]; then
  echo ""
  echo "ERROR: .next/server was not created. Build output looks incomplete."
  exit 1
fi

USE_STANDALONE=false
if [[ -f .next/standalone/server.js ]]; then
  USE_STANDALONE=true
  echo ""
  echo "Detected standalone build output (Next 12.2+)."
else
  echo ""
  echo "Using classic Next.js deploy (Next 11: .next + npm start)."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Ensuring directories exist on server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$USE_STANDALONE" == true ]]; then
  ssh "$SERVER" "mkdir -p ${APP_DIR}/.next/static ${APP_DIR}/public"
else
  ssh "$SERVER" "mkdir -p ${APP_DIR}/.next ${APP_DIR}/public"
fi

if [[ "$USE_STANDALONE" == true ]]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Deploying standalone build..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

  rsync -az --delete --progress \
    -e ssh \
    .next/standalone/ \
    "${SERVER}:${APP_DIR}/"
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Deploying build artifacts..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

  rsync -az --delete --progress \
    -e ssh \
    .next/ \
    "${SERVER}:${APP_DIR}/.next/"

  rsync -az --progress \
    -e ssh \
    package.json package-lock.json next.config.js \
    "${SERVER}:${APP_DIR}/"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploying static files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

rsync -az --delete --progress \
  -e ssh \
  .next/static/ \
  "${SERVER}:${APP_DIR}/.next/static/"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploying public folder..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -d public ]]; then
  rsync -az --delete --progress \
    -e ssh \
    public/ \
    "${SERVER}:${APP_DIR}/public/"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Reloading PM2..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$USE_STANDALONE" == true ]]; then
  ssh "$SERVER" bash -s <<EOF
set -euo pipefail
cd ${APP_DIR}
export PORT=${PORT}
export HOSTNAME=${HOSTNAME}
export NODE_ENV=production

if pm2 describe ${PM2_NAME} >/dev/null 2>&1; then
  pm2 reload ${PM2_NAME} --update-env
else
  pm2 start server.js --name ${PM2_NAME} --cwd ${APP_DIR}
  pm2 save
fi
EOF
else
  ssh "$SERVER" bash -s <<EOF
set -euo pipefail
cd ${APP_DIR}
export PORT=${PORT}
export HOSTNAME=${HOSTNAME}
export NODE_ENV=production

npm ci --omit=dev

if pm2 describe ${PM2_NAME} >/dev/null 2>&1; then
  pm2 reload ${PM2_NAME} --update-env
else
  pm2 start npm --name ${PM2_NAME} --cwd ${APP_DIR} -- start -- -p ${PORT} -H ${HOSTNAME}
  pm2 save
fi
EOF
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deployment complete."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
