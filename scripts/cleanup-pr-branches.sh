#!/bin/bash
# Cleanup old Copilot PR branches
# This script deletes all copilot/sub-pr-* branches from remote and local

set -e

echo "🧹 Cleaning up old Copilot PR branches..."
echo ""

# Fetch latest remote refs
echo "📡 Fetching remote refs..."
git fetch origin --prune

# Get list of all copilot/sub-pr-* branches
echo ""
echo "🔍 Finding copilot/sub-pr-* branches..."
REMOTE_BRANCHES=$(git branch -r | grep "origin/copilot/sub-pr-" | sed 's|origin/||' || true)
LOCAL_BRANCHES=$(git branch | grep "pr-30[0-9]" | sed 's/^[* ]*//' || true)

if [ -z "$REMOTE_BRANCHES" ] && [ -z "$LOCAL_BRANCHES" ]; then
    echo "✅ No PR branches found to clean up"
    exit 0
fi

# Count branches
REMOTE_COUNT=$(echo "$REMOTE_BRANCHES" | grep -c '.' || echo "0")
LOCAL_COUNT=$(echo "$LOCAL_BRANCHES" | grep -c '.' || echo "0")

echo ""
echo "📊 Found:"
echo "   - $REMOTE_COUNT remote copilot/sub-pr-* branches"
echo "   - $LOCAL_COUNT local pr-30x branches"
echo ""

# Ask for confirmation
read -p "⚠️  Delete all these branches? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "🗑️  Deleting branches..."
echo ""

# Delete remote branches
if [ ! -z "$REMOTE_BRANCHES" ]; then
    echo "Deleting remote branches:"
    while IFS= read -r branch; do
        if [ ! -z "$branch" ]; then
            echo "   🗑️  origin/$branch"
            git push origin --delete "$branch" 2>/dev/null || echo "      ⚠️  Already deleted or no permission"
        fi
    done <<< "$REMOTE_BRANCHES"
fi

# Delete local branches
if [ ! -z "$LOCAL_BRANCHES" ]; then
    echo ""
    echo "Deleting local branches:"
    while IFS= read -r branch; do
        if [ ! -z "$branch" ] && [ "$branch" != "$(git branch --show-current)" ]; then
            echo "   🗑️  $branch"
            git branch -D "$branch" 2>/dev/null || echo "      ⚠️  Already deleted"
        fi
    done <<< "$LOCAL_BRANCHES"
fi

# Clean up remote tracking branches
echo ""
echo "🧹 Pruning remote tracking branches..."
git remote prune origin

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Remaining branches:"
git branch -a | grep -E "(pr-|copilot)" || echo "   None found ✅"
