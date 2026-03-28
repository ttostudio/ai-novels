#!/usr/bin/env bash
# post-generate-hook.sh — 章生成後に自動実行
# generate-chapter.ts の末尾から呼び出される
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "[post-generate] Committing new content..."
git add frontend/data/ 2>/dev/null || true
git add -A 2>/dev/null || true

if git diff --cached --quiet 2>/dev/null; then
  echo "[post-generate] No changes to commit"
  exit 0
fi

git commit -m "feat(content): 新章自動生成 $(date '+%Y-%m-%d %H:%M')

Co-Authored-By: AI Novelist <noreply@anthropic.com>" 2>/dev/null || true

git push 2>/dev/null || echo "[post-generate] Push failed (will retry later)"

# Trigger DB seed to sync new content
echo "[post-generate] Syncing DB..."
docker compose run --rm migrate 2>&1 | tail -3

echo "[post-generate] Done"
