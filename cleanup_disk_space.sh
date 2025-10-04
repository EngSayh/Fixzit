#!/bin/bash
# Disk Space Cleanup Script for Fixzit Codespace
# Purpose: Free up disk space when running low (<5%)
# Usage: bash cleanup_disk_space.sh

set -e

echo "🧹 Starting Disk Space Cleanup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Show current disk usage
echo "�� Current Disk Usage:"
df -h / | tail -n 1
echo ""

# 1. Clean npm cache
echo "1️⃣  Cleaning npm cache..."
npm cache clean --force 2>/dev/null || echo "   ⏭️  npm cache already clean"
echo ""

# 2. Clean pip cache
echo "2️⃣  Cleaning pip cache..."
pip cache purge 2>/dev/null || echo "   ⏭️  pip cache already clean"
echo ""

# 3. Clean yarn cache
echo "3️⃣  Cleaning yarn cache..."
yarn cache clean 2>/dev/null || echo "   ⏭️  yarn not found or cache already clean"
echo ""

# 4. Clean Docker (if Docker is available)
echo "4️⃣  Cleaning Docker..."
if command -v docker &> /dev/null; then
    docker system prune -af 2>/dev/null || echo "   ⏭️  Docker cleanup skipped"
else
    echo "   ⏭️  Docker not available"
fi
echo ""

# 5. Clean Git unnecessary files
echo "5️⃣  Cleaning Git..."
git gc --aggressive --prune=now 2>/dev/null || echo "   ⏭️  Git cleanup skipped"
echo ""

# 6. Clean VS Code workspace storage
echo "6️⃣  Cleaning VS Code workspace storage..."
rm -rf ~/.config/Code/User/workspaceStorage/* 2>/dev/null || echo "   ⏭️  VS Code storage already clean"
echo ""

# 7. Clean temporary files
echo "7️⃣  Cleaning temporary files..."
rm -rf /tmp/* 2>/dev/null || echo "   ⏭️  Temp files already clean"
echo ""

# 8. Clean node_modules in nested directories (careful!)
echo "8️⃣  Finding large node_modules directories (top 5)..."
find . -name "node_modules" -type d -prune -exec du -sh {} \; 2>/dev/null | sort -hr | head -5 || echo "   ℹ️  No node_modules found"
echo "   💡 To remove specific node_modules: rm -rf ./path/to/node_modules"
echo ""

# 9. Clean build artifacts
echo "9️⃣  Cleaning build artifacts..."
find . -type d \( -name "dist" -o -name "build" -o -name ".next" -o -name "out" \) -not -path "*/node_modules/*" -not -path "*/aws/*" -exec rm -rf {} + 2>/dev/null || echo "   ⏭️  No build artifacts found"
echo ""

# 10. Show disk usage after cleanup
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Cleanup Complete!"
echo "📊 Updated Disk Usage:"
df -h / | tail -n 1
echo ""

# Calculate freed space
echo "💡 Tip: Run 'du -sh * | sort -h' to find largest directories"
echo "💡 Tip: Run 'npm install' or 'yarn install' if needed after cleanup"
