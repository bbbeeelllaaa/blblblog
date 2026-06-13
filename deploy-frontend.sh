#!/bin/bash
# ============================================
# blblblog Frontend Deploy Script
# Usage: bash deploy-frontend.sh
# ============================================
set -e

PROJECT_DIR="/root/blblblog"

echo ">>> Step 1: Load new Docker image"
LOADED_IMAGE=$(docker load -i "$PROJECT_DIR/frontend.tar" 2>&1 | grep 'Loaded image:' | sed 's/Loaded image: //')
echo "    Loaded: $LOADED_IMAGE"
if [ -n "$LOADED_IMAGE" ] && [ "$LOADED_IMAGE" != "blblblog-frontend:latest" ]; then
  echo "    Tagging as blblblog-frontend:latest"
  docker tag "$LOADED_IMAGE" blblblog-frontend:latest
fi

echo ">>> Step 2: Stop & remove old container"
docker stop blblblog-frontend 2>/dev/null || true
docker rm blblblog-frontend 2>/dev/null || true

echo ">>> Step 3: Start new container"
docker run -d \
  --name blblblog-frontend \
  --network=blblblog_default \
  --network-alias=frontend \
  --restart=unless-stopped \
  blblblog-frontend:latest

echo ">>> Step 4: Verify"
sleep 2
curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost/ && echo " -> Frontend OK"
