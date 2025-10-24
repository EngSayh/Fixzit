#!/bin/bash
# Disk Space Cleanup Script for Codespaces
# Run this when disk space is low

set -e

echo "🧹 Starting Disk Space Cleanup..."
echo ""

# Check current usage
echo "📊 Current Disk Usage:"
df -h /workspaces
echo ""

# Clean npm/pnpm caches
echo "🗑️  Cleaning package manager caches..."
npm cache clean --force 2>/dev/null || true
pnpm store prune 2>/dev/null || true
echo "✅ Package caches cleaned"
echo ""

# Clean user caches
echo "🗑️  Cleaning user cache directories..."
rm -rf ~/.cache/* 2>/dev/null || true
rm -rf ~/.npm/_cacache 2>/dev/null || true
echo "✅ User caches cleaned"
echo ""

# Clean build artifacts
echo "🗑️  Cleaning build artifacts..."
find /workspaces/Fixzit -name "*.tsbuildinfo" -delete 2>/dev/null || true
find /workspaces/Fixzit -name "*.log" -delete 2>/dev/null || true
find /workspaces/Fixzit -name ".DS_Store" -delete 2>/dev/null || true
echo "✅ Build artifacts cleaned"
echo ""

# Remove .next build directory if exists
if [ -d "/workspaces/Fixzit/.next" ]; then
    echo "🗑️  Removing .next build directory..."
    rm -rf /workspaces/Fixzit/.next
    echo "✅ .next directory removed"
    echo ""
fi

# Clean docker (if needed)
if command -v docker &> /dev/null; then
    echo "🗑️  Cleaning Docker system..."
    docker system prune -af --volumes 2>/dev/null || true
    echo "✅ Docker cleaned"
    echo ""
fi

# Final status
echo "✅ Cleanup Complete!"
echo ""
echo "📊 Final Disk Usage:"
df -h /workspaces
echo ""

# Calculate space freed
AVAIL=$(df -h /workspaces | tail -1 | awk '{print $4}')
USED=$(df -h /workspaces | tail -1 | awk '{print $5}')
echo "💾 Available Space: $AVAIL ($USED used)"
echo ""
echo "💡 Tip: Run 'pnpm build' to regenerate the .next directory if needed"
