#!/bin/bash
# Create Pull Request Helper Script

echo "=========================================="
echo "Create Pull Request"
echo "=========================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo ""
    echo "To create PR manually:"
    echo "1. Go to: https://github.com/EngSayh/Fixzit/compare/main...fix/security-and-rbac-consolidation"
    echo "2. Click 'Create pull request'"
    echo "3. Copy content from PR_DESCRIPTION.md"
    echo ""
    exit 1
fi

# Get current branch
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"
echo ""

# Check if branch is pushed
if ! git ls-remote --exit-code --heads origin "$BRANCH" &> /dev/null; then
    echo "❌ Branch not pushed to remote"
    echo "Run: git push origin $BRANCH"
    exit 1
fi

echo "✅ Branch is pushed to remote"
echo ""

# Create PR
echo "Creating pull request..."
echo ""

gh pr create \
  --base main \
  --head "$BRANCH" \
  --title "Fix Tools, Analyze Imports, and Resolve Command Failures" \
  --body-file PR_DESCRIPTION.md \
  --label "enhancement,tooling,documentation"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pull request created successfully!"
    echo ""
    echo "View PR: gh pr view --web"
else
    echo ""
    echo "❌ Failed to create PR"
    echo ""
    echo "Create manually at:"
    echo "https://github.com/EngSayh/Fixzit/compare/main...fix/security-and-rbac-consolidation"
fi
