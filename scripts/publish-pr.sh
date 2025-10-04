#!/usr/bin/env bash
# Automated PR creation script for agent changes
# Usage: bash scripts/publish-pr.sh "Your PR title"

set -euo pipefail

TITLE="${1:-Automated Fixzit agent change}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BRANCH="agent/${TIMESTAMP}"

echo "📦 Creating PR for agent changes..."

# Ensure we're not on a protected branch
current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" =~ ^(main|master)$ ]]; then
  echo "⚠️  Currently on protected branch '$current_branch', creating new branch..."
  git switch -c "$BRANCH"
else
  BRANCH="$current_branch"
  echo "✓ Using existing branch: $BRANCH"
fi

# Stage and commit changes
if git diff --quiet && git diff --cached --quiet; then
  echo "⚠️  No changes to commit."
else
  git add -A
  git commit -m "agent: ${TITLE}" || echo "✓ Changes already committed"
fi

# Push to remote
echo "📤 Pushing to origin/$BRANCH..."
git push -u origin HEAD

# Create PR using GitHub CLI
echo "🔄 Creating Pull Request..."
if command -v gh &> /dev/null; then
  # Check if PR already exists
  if gh pr view "$BRANCH" --json number &> /dev/null; then
    echo "✓ PR already exists for branch '$BRANCH'"
    gh pr view "$BRANCH" --web
  else
    gh pr create \
      --fill \
      --draft \
      --title "[agent] ${TITLE}" \
      --body "**Automated PR created by Fixzit Agent**

This PR contains automated changes from the agent workflow.

**Branch:** \`$BRANCH\`
**Timestamp:** \`$TIMESTAMP\`

---
Please review changes and run verification checks before merging." \
      --label "agent,automated"
    
    echo "✅ Pull Request created successfully!"
  fi
else
  echo "⚠️  GitHub CLI (gh) not found. Please install it or create PR manually."
  echo "   Branch: $BRANCH"
  echo "   Remote: $(git remote get-url origin)"
fi
