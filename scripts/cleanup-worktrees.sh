#!/bin/bash
# ============================================================================
# Cleanup Git Worktrees - Prevents Exit Code 5 (OOM) crashes in VS Code
# ============================================================================
# Root Cause: Multiple worktrees = multiple TS servers = memory exhaustion
# Each worktree loads: TypeScript server, ESLint, Git extension, file watchers
# Solution: Remove stale/unused worktrees to reduce memory footprint
# Run: bash scripts/cleanup-worktrees.sh
# ============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "🔍 Checking git worktrees..."
echo ""

# List current worktrees
echo "📂 Current worktrees:"
git worktree list
echo ""

# Count worktrees
WORKTREE_COUNT=$(git worktree list | wc -l | tr -d ' ')
echo "📊 Total worktrees: $WORKTREE_COUNT"
echo ""

if [ "$WORKTREE_COUNT" -gt 3 ]; then
  echo "⚠️  WARNING: You have $WORKTREE_COUNT worktrees!"
  echo "   Each worktree loads separate TS/ESLint servers, causing memory pressure."
  echo "   This is likely the cause of VS Code Exit Code 5 crashes."
  echo ""
fi

# Show worktrees that could be removed (not main, not current branch)
MAIN_WORKTREE=$(git worktree list | head -1 | awk '{print $1}')
echo "🧹 Worktrees that can be removed (not main repo):"
git worktree list | tail -n +2 | while read -r line; do
  WORKTREE_PATH=$(echo "$line" | awk '{print $1}')
  WORKTREE_BRANCH=$(echo "$line" | awk '{print $3}' | tr -d '[]')
  
  # Check if worktree has uncommitted changes
  if [ -d "$WORKTREE_PATH" ]; then
    cd "$WORKTREE_PATH"
    CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$CHANGES" -gt 0 ]; then
      echo "   ⚠️  $WORKTREE_PATH ($WORKTREE_BRANCH) - $CHANGES uncommitted changes"
    else
      echo "   ✓  $WORKTREE_PATH ($WORKTREE_BRANCH) - clean, safe to remove"
    fi
    cd "$REPO_ROOT"
  fi
done

echo ""
echo "💡 To remove a worktree:"
echo "   git worktree remove <path> --force"
echo ""
echo "💡 To remove ALL non-main worktrees (destructive!):"
echo "   git worktree list | tail -n +2 | awk '{print \$1}' | xargs -I{} git worktree remove {} --force"
echo ""

# Interactive cleanup option
if [ "$1" = "--auto" ]; then
  echo "🤖 Auto-cleanup mode: Removing clean worktrees..."
  git worktree list | tail -n +2 | while read -r line; do
    WORKTREE_PATH=$(echo "$line" | awk '{print $1}')
    if [ -d "$WORKTREE_PATH" ]; then
      cd "$WORKTREE_PATH"
      CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
      if [ "$CHANGES" -eq 0 ]; then
        cd "$REPO_ROOT"
        echo "   Removing $WORKTREE_PATH..."
        git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
      else
        cd "$REPO_ROOT"
        echo "   Skipping $WORKTREE_PATH (has uncommitted changes)"
      fi
    fi
  done
  echo ""
  echo "✅ Cleanup complete!"
  git worktree list
fi
