#!/usr/bin/env bash
set -euo pipefail

TITLE="${1:-chore(agent): automated changes}"
BRANCH="agent/$(date +%Y%m%d-%H%M%S)"
BASE="${BASE_BRANCH:-main}"

echo "🤖 Creating PR from current changes..."

# Ensure we're not on main
CURRENT=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT" == "main" || "$CURRENT" == "master" ]]; then
  echo "📝 On $CURRENT, creating new branch: $BRANCH"
  git fetch origin
  git checkout -b "$BRANCH" "origin/$BASE" 2>/dev/null || git checkout -b "$BRANCH" "$BASE"
fi

# Commit if there are changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "$TITLE" || echo "⚠️  No changes to commit"
fi

# Push branch
CURRENT=$(git rev-parse --abbrev-ref HEAD)
git push -u origin "$CURRENT"

# Create or view PR
if gh pr view "$CURRENT" >/dev/null 2>&1; then
  echo "✅ PR already exists"
  gh pr view --web
else
  echo "✅ Creating new PR"
  gh pr create --title "$TITLE" --body "Automated PR from agent workflow." --draft
fi
