#!/usr/bin/env bash
# Clean accidentally committed build artifacts from Git history
# This will reduce .git from 467MB to ~50-100MB

set -euo pipefail

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🧹 GIT HISTORY CLEANUP - Remove Build Artifacts 🧹      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Show current size
echo "📊 BEFORE CLEANUP:"
du -sh .git
echo ""

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
    echo "⚠️  git-filter-repo not installed. Installing..."
    pip3 install --user git-filter-repo
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "⚠️  WARNING: This will rewrite Git history!"
echo "   • All commit SHAs will change"
echo "   • Collaborators must re-clone the repo"
echo "   • You'll need to force push"
echo ""
echo "Files to remove from history:"
echo "  • .next/ (Next.js build cache)"
echo "  • aws/dist/ (AWS CLI bundled files)"
echo "  • node_modules/ (npm dependencies)"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "🗑️  Removing .next/ from Git history..."
git filter-repo --path .next --invert-paths --force

echo "🗑️  Removing aws/dist/ from Git history..."
git filter-repo --path aws/dist --invert-paths --force

echo "🗑️  Removing node_modules/ from Git history..."
git filter-repo --path node_modules --invert-paths --force

echo ""
echo "🧹 Running garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ CLEANUP COMPLETE!"
echo ""
echo "📊 AFTER CLEANUP:"
du -sh .git
echo ""
echo "📋 NEXT STEPS:"
echo "1. Verify your repo still works: git log --oneline | head"
echo "2. Force push to GitHub: git push --force --all"
echo "3. Force push tags: git push --force --tags"
echo "4. Tell collaborators to re-clone"
echo ""
echo "⚠️  Note: Your origin remote may have been removed."
echo "   Add it back: git remote add origin https://github.com/EngSayh/Fixzit.git"
