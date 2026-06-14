#!/bin/bash
# ============================================
# blblblog Backend Deploy Script
# Usage: bash deploy-backend.sh
#
# Secrets are loaded from $PROJECT_DIR/.env
# (same file used by docker-compose.prod.yml).
# Copy .env.example to .env on the server and fill in real values.
#
# Uses BIND MOUNT (not Docker volume) for uploads
# so files persist in /root/blblblog/uploads/
# and will never be lost on container rebuild.
# ============================================
set -e

PROJECT_DIR="/root/blblblog"
UPLOADS_DIR="$PROJECT_DIR/uploads"

# Load secrets from .env (same file docker-compose uses)
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
else
  echo "ERROR: $PROJECT_DIR/.env not found."
  echo "Copy .env.example to .env and fill in real values."
  exit 1
fi

# Construct DATABASE_URL from components (same as docker-compose.prod.yml)
DATABASE_URL="postgresql+asyncpg://${DB_USER:?DB_USER required}:${DB_PASSWORD:?DB_PASSWORD required}@postgres:5432/${DB_NAME:?DB_NAME required}"
REDIS_URL="${REDIS_URL:-redis://redis:6379/0}"

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
  -e DATABASE_URL="$DATABASE_URL" \
  -e JWT_SECRET_KEY="${JWT_SECRET_KEY:?JWT_SECRET_KEY is required}" \
  -e JWT_ALGORITHM="${JWT_ALGORITHM:-HS256}" \
  -e JWT_EXPIRE_MINUTES="${JWT_EXPIRE_MINUTES:-60}" \
  -e REDIS_URL="$REDIS_URL" \
  -e UPLOAD_DIR="/app/uploads" \
  -e AI_API_KEY="${AI_API_KEY:-}" \
  -e AI_API_BASE="${AI_API_BASE:-https://api.openai.com/v1}" \
  -e AI_MODEL="${AI_MODEL:-gpt-4o-mini}" \
  -e SITE_URL="${SITE_URL:-http://localhost:3000}" \
  -e SMTP_HOST="${SMTP_HOST:-}" \
  -e SMTP_PORT="${SMTP_PORT:-465}" \
  -e SMTP_USER="${SMTP_USER:-}" \
  -e SMTP_PASSWORD="${SMTP_PASSWORD:-}" \
  -e SMTP_FROM="${SMTP_FROM:-}" \
  blblblog-backend:latest

echo ">>> Step 5: Verify"
sleep 3
curl -s http://localhost/api/health && echo "" && echo ">>> Deploy OK!" || echo ">>> WARNING: Health check failed, check logs with: docker logs blblblog-backend"
