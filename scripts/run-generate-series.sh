#!/usr/bin/env bash
# run-generate-series.sh — launchd から呼び出すラッパースクリプト
set -euo pipefail

export PATH="/Users/tto/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export MAX_NOVELS_PER_RUN=${MAX_NOVELS_PER_RUN:-5}
cd /Users/tto/.ttoClaw/workspace/products/ai-novels

echo "[$(date '+%Y-%m-%d %H:%M:%S')] generate-series 開始"
npm run generate:series
echo "[$(date '+%Y-%m-%d %H:%M:%S')] generate-series 完了"
