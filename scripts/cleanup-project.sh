#!/bin/bash

echo "🚀 FIXZIT SOUQ Project Cleanup Script"
echo "====================================="
echo ""

# Calculate initial size
INITIAL_SIZE=$(du -sh . | cut -f1)
echo "📊 Initial Project Size: $INITIAL_SIZE"
echo ""

echo "🧹 Step 1: Removing build caches (SAFE)..."
echo "Removing .cache folder (1.4GB)..."
rm -rf .cache

echo "Removing temporary node_modules (will need to reinstall)..."
rm -rf node_modules

echo "🧹 Step 2: Cleaning artifacts backups..."
if [ -d "artifacts/backups" ]; then
    echo "Removing artifacts/backups folder..."
    rm -rf artifacts/backups
fi

echo "🧹 Step 3: Removing temporary files..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.log" -size +10M -delete 2>/dev/null || true
find . -name "*~" -delete 2>/dev/null || true

echo "🧹 Step 4: Clean build outputs..."
# Remove ONLY project build directories, NOT node_modules dist folders
find . -maxdepth 2 -type d \( -name build -o -name .next -o -name out -o -name coverage -o -name .turbo -o -name .vercel -o -name .netlify \) -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
# Remove project-level dist, but keep node_modules intact  
rm -rf ./dist 2>/dev/null || true

# Calculate new size
NEW_SIZE=$(du -sh . | cut -f1)
echo ""
echo "✅ Cleanup Complete!"
echo "📊 New Project Size: $NEW_SIZE (was $INITIAL_SIZE)"
echo ""
echo "🔧 Next Steps:"
echo "1. Use the packager tool to reinstall dependencies"
echo "2. Address the 20GB .git issue (see git-cleanup.sh)"
echo ""