#!/bin/bash

echo "🔴 CRITICAL: Git Repository Cleanup (20GB)"
echo "============================================"
echo ""
echo "⚠️  WARNING: This will modify git history!"
echo "⚠️  Make sure you have backups before proceeding!"
echo ""

# Check git status
echo "📊 Git Repository Analysis:"
echo "Current .git size: $(du -sh .git | cut -f1)"
echo ""

echo "🔍 Finding largest objects in git history..."
echo "(This may take several minutes for large repos)"

# Find largest objects
git rev-list --objects --all | \
git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
awk '/^blob/ {print substr($0,1,6) $2 " " $3 " " substr($0, 1+length($1 $2 $3 " "), length($0))}' | \
sort -k3 -n -r | head -20 > large-git-objects.txt 2>/dev/null || echo "Failed to analyze git objects"

if [ -f "large-git-objects.txt" ]; then
    echo "Top 20 largest objects in git:"
    cat large-git-objects.txt
    echo ""
fi

echo "💡 RECOMMENDED GIT CLEANUP ACTIONS:"
echo ""
echo "1. IMMEDIATE (SAFE):"
echo "   git gc --aggressive --prune=now"
echo "   git repack -ad"
echo ""
echo "2. REMOVE LARGE FILES FROM HISTORY (DESTRUCTIVE):"
echo "   # Find and remove specific large files"
echo "   git filter-branch --tree-filter 'rm -f path/to/large/file' HEAD"
echo "   git push --force-with-lease origin main"
echo ""
echo "3. NUCLEAR OPTION (START FRESH):"
echo "   # Keep current state, remove all history"
echo "   rm -rf .git"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit (cleaned history)'"
echo ""
echo "4. USE GIT LFS FOR FUTURE LARGE FILES:"
echo "   git lfs install"
echo "   git lfs track '*.zip' '*.pdf' '*.mp4' '*.jpg' '*.png'"
echo ""

echo "⚠️  Choose your approach based on your team's needs!"
echo "⚠️  Coordinate with team before modifying shared repository!"