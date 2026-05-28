#!/bin/bash

SERVER="root@31.97.205.26"
APP_DIR="/home/hyperlocal-frontend"
SSH_KEY="~/.ssh/id_ed25519_rsa"

echo "======================================="
echo "Building Hyperlocal Frontend..."
echo "======================================="

npm run build

echo "======================================="
echo "Uploading standalone build..."
echo "======================================="

rsync -avz --delete \
-e "ssh -i $SSH_KEY" \
.next/standalone/ \
$SERVER:$APP_DIR/

echo "======================================="
echo "Uploading static files..."
echo "======================================="

rsync -avz --delete \
-e "ssh -i $SSH_KEY" \
.next/static/ \
$SERVER:$APP_DIR/.next/static/

echo "======================================="
echo "Uploading public folder..."
echo "======================================="

rsync -avz --delete \
-e "ssh -i $SSH_KEY" \
public/ \
$SERVER:$APP_DIR/public/

echo "======================================="
echo "Restarting PM2..."
echo "======================================="

ssh -i $SSH_KEY $SERVER "
cd $APP_DIR

pm2 delete hyperlocal-frontend || true

PORT=3012 pm2 start server.js --name hyperlocal-frontend

pm2 save
"

echo "======================================="
echo "Deployment complete!"
echo "======================================="