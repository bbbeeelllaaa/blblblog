#!/bin/bash
# ============================================
# blblblog Backend Deploy Script
# Usage: bash deploy-backend.sh
#
# Uses BIND MOUNT (not Docker volume) for uploads
# so files persist in /root/blblblog/uploads/
# and will never be lost on container rebuild.
# ============================================
set -e

PROJECT_DIR="/root/blblblog"
UPLOADS_DIR="$PROJECT_DIR/uploads"

echo ">>> Step 1: Ensure uploads directory exists on host"
mkdir -p "$UPLOADS_DIR"

echo ">>> Step 2: Load new Docker image"
LOADED_IMAGE=$(docker load -i "$PROJECT_DIR/backend.tar" 2>&1 | grep 'Loaded image:' | sed 's/Loaded image: //')
echo "    Loaded: $LOADED_IMAGE"
if [ -n "$LOADED_IMAGE" ] && [ "$LOADED_IMAGE" != "blblblog-backend:latest" ]; then
  echo "    Tagging as blblblog-backend:latest"
  docker tag "$LOADED_IMAGE" blblblog-backend:latest
fi

echo ">>> Step 3: Stop & remove old container"
docker stop blblblog-backend 2>/dev/null || true
docker rm blblblog-backend 2>/dev/null || true

echo ">>> Step 4: Start new container"
docker run -d \
  --name blblblog-backend \
  --network=blblblog_default \
  --network-alias=backend \
  --restart=unless-stopped \
  -v "$UPLOADS_DIR:/app/uploads" \
  -e JWT_SECRET_KEY='44630e2fa0e3e1611e82d7cb18f5b65c47bc69aad01cabbf5479ae772357a8b2' \
  -e DATABASE_URL='postgresql+asyncpg://blog_user:blog_password@postgres:5432/blog_db' \
  -e REDIS_URL='redis://redis:6379/0' \
  -e AI_API_KEY='sk-40c4e8e7c27644c2acdf011d2d8df22c' \
  -e AI_API_BASE='https://api.deepseek.com/v1' \
  -e AI_MODEL='deepseek-v4-pro' \
  -e SITE_URL='http://47.99.50.109' \
  -e SMTP_HOST='smtp.qq.com' \
  -e SMTP_PORT='465' \
  -e SMTP_USER='3186099788@qq.com' \
  -e SMTP_PASSWORD='wwtoggtllunldfdc' \
  -e SMTP_FROM='3186099788@qq.com' \
  blblblog-backend:latest

echo ">>> Step 5: Verify"
sleep 3
curl -s http://localhost/api/health && echo "" && echo ">>> Deploy OK!"
