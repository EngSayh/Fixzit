#!/bin/bash

echo "============================================"
echo "GIT CLEANUP SCRIPT - Reduce 20GB .git folder"
echo "============================================"
echo ""

# Create backup first
echo "Step 1: Creating backup of .git (this may take a while)..."
tar czf git_backup_$(date +%Y%m%d_%H%M%S).tar.gz .git
echo "✓ Backup created"

# Clean up git
echo ""
echo "Step 2: Cleaning git references..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive
echo "✓ Git cleaned"

# Show large files in history
echo ""
echo "Step 3: Finding large files in git history..."
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  sed -n 's/^blob //p' | \
  sort --numeric-sort --key=2 | \
  tail -20 > large_files_in_git.txt

echo "✓ Large files listed in large_files_in_git.txt"

# Show new size
echo ""
echo "Step 4: New .git size:"
du -sh .git

echo ""
echo "============================================"
echo "If size is still large, run this to remove large files from history:"
echo ""
echo "wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar"
echo "java -jar bfg-1.14.0.jar --strip-blobs-bigger-than 50M"
echo "git reflog expire --expire=now --all"
echo "git gc --prune=now --aggressive"
echo "============================================"