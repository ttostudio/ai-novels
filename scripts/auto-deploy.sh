#!/usr/bin/env bash
# auto-deploy.sh — 章生成後の自動デプロイ
# Usage: ./scripts/auto-deploy.sh [--rebuild]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== AI Novels Auto Deploy ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"

# 1. Git pull (if remote has changes)
echo "[1/4] Git pull..."
git pull --rebase 2>/dev/null || echo "No remote changes"

# 2. Run DB migration + seed
echo "[2/4] DB migration + seed..."
docker compose run --rm migrate 2>&1 | tail -5

# 3. Rebuild frontend if --rebuild flag or if frontend files changed
REBUILD=false
if [[ "${1:-}" == "--rebuild" ]]; then
  REBUILD=true
fi

# Check if frontend files changed since last build
LAST_BUILD=$(docker inspect ai-novels-frontend-1 --format '{{.Created}}' 2>/dev/null || echo "1970-01-01")
LATEST_CHANGE=$(git log -1 --format=%ci -- frontend/ 2>/dev/null || echo "2099-01-01")
if [[ "$LATEST_CHANGE" > "$LAST_BUILD" ]]; then
  REBUILD=true
fi

if $REBUILD; then
  echo "[3/4] Rebuilding frontend..."
  docker compose up -d --build frontend 2>&1 | tail -3
else
  echo "[3/4] Frontend up-to-date, skipping rebuild"
  docker compose up -d frontend 2>&1 | tail -3
fi

# 4. Health check
echo "[4/4] Health check..."
sleep 5
for svc in postgres api frontend; do
  STATUS=$(docker inspect "ai-novels-${svc}-1" --format '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
  echo "  ${svc}: ${STATUS}"
done

echo "=== Deploy complete ==="
