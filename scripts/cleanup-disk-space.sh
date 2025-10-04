#!/usr/bin/env bash
# Codespace Disk Cleanup Script - Saves ~1.4GB

set -euo pipefail

echo "🧹 Starting disk cleanup..."
echo ""
df -h / | head -2
echo ""

# Clean Next.js build
if [ -d .next ]; then
  SIZE=$(du -sm .next | awk '{print $1}')
  rm -rf .next
  echo "✓ Removed .next build cache (${SIZE}MB)"
fi

# Clean npm cache
npm cache clean --force 2>/dev/null
echo "✓ Cleaned npm cache"

# Remove AWS dist
if [ -d aws/dist ]; then
  SIZE=$(du -sm aws/dist | awk '{print $1}')
  rm -rf aws/dist
  echo "✓ Removed aws/dist (${SIZE}MB)"
fi

# Remove duplicate venvs
[ -d .venv ] && rm -rf .venv && echo "✓ Removed .venv"
[ -d venv ] && rm -rf venv && echo "✓ Removed venv"

# Clean Python cache
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
echo "✓ Cleaned Python cache files"

# Clean user cache
rm -rf ~/.cache/* 2>/dev/null
echo "✓ Cleaned user cache"

# Git GC
git gc --aggressive --prune=now 2>/dev/null || true
echo "✓ Git garbage collection complete"

echo ""
echo "✅ Cleanup complete!"
df -h / | head -2
