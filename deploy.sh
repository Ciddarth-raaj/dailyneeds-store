#!/bin/bash

SERVER="dnds-fe"
APP_DIR="~/dnds-build"
PM2_NAME="fe"
PORT="3000"

# Optional: absolute path to pm2 on the server if the script still cannot find it:
#   ssh dnds-fe 'command -v pm2'
# Then: PM2_BIN=/home/you/.nvm/versions/node/v22.0.0/bin/pm2 ./deploy.sh
PM2_BIN="${PM2_BIN:-}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building Next.js..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm run build || exit 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Ensuring directories exist..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER "mkdir -p $APP_DIR/.next/static"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploying standalone build..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

rsync -az --delete --progress \
-e ssh \
.next/standalone/ \
$SERVER:$APP_DIR/

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploying static files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

rsync -az --progress \
-e ssh \
.next/static/ \
$SERVER:$APP_DIR/.next/static/

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploying public folder..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

rsync -az --progress \
-e ssh \
public/ \
$SERVER:$APP_DIR/public/

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Reloading PM2..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Non-interactive ssh does not load nvm: many ~/.bashrc files start with
# `case $- in *i*) ;; *) return;; esac` so `bash -lc` never sources nvm.
# We source nvm.sh explicitly, widen PATH, and optionally use PM2_BIN.
REMOTE_PM2_PATH="${PM2_BIN}"
ssh "$SERVER" bash -s <<EOF
export PATH="\$HOME/.local/bin:\$HOME/.npm-global/bin:/usr/local/bin:\$PATH"
export NVM_DIR="\${NVM_DIR:-\$HOME/.nvm}"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
[ -s "\$HOME/.config/nvm/nvm.sh" ] && export NVM_DIR="\$HOME/.config/nvm" && . "\$NVM_DIR/nvm.sh"
cd $APP_DIR || { echo "deploy: cd to $APP_DIR failed" >&2; exit 1; }
if [ -n "$REMOTE_PM2_PATH" ]; then
  PM2_EXE="$REMOTE_PM2_PATH"
elif command -v pm2 >/dev/null 2>&1; then
  PM2_EXE=pm2
else
  echo "deploy: pm2 not found after loading nvm. On the server run: command -v pm2" >&2
  echo "deploy: then re-run with: PM2_BIN=/full/path/to/pm2 ./deploy.sh" >&2
  exit 1
fi
"\$PM2_EXE" reload $PM2_NAME || PORT=$PORT "\$PM2_EXE" start server.js --name $PM2_NAME
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deployment complete."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"