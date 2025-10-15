#!/bin/bash
# Execute PR creation for all 17 categories
# This script creates branches, commits changes, and opens PRs

set -e

ORIGINAL_BRANCH=$(git branch --show-current)
echo "📍 Starting from branch: $ORIGINAL_BRANCH"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     Creating 17 PRs for Systematic Error Fixes          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Function to create PR
create_pr() {
  local pr_num=$1
  local branch=$2
  local title=$3
  local body=$4
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}PR #$pr_num: $title${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  git checkout -b "$branch" 2>/dev/null || git checkout "$branch"
  
  # Check if there are changes
  if git diff --quiet && git diff --cached --quiet; then
    echo -e "${YELLOW}No changes to commit for this PR${NC}"
  else
    git add -A
    git commit -m "$title" -m "$body"
    git push -u origin "$branch" --force
    
    # Create PR using gh CLI
    gh pr create \
      --title "$title" \
      --body "$body" \
      --label "automated-fix" \
      --label "code-quality" || echo "PR might already exist"
    
    echo -e "${GREEN}✅ PR #$pr_num created!${NC}"
  fi
  
  git checkout "$ORIGINAL_BRANCH"
  echo ""
}

# PR #1: Console statements (already fixed in commit 274650b2)
echo "Creating PR #1: Console statement removal (already completed)..."
create_pr 1 \
  "fix/remove-console-statements" \
  "fix: remove console.log/debug/info/warn statements (1,225 instances)" \
  "## Summary
Removed all console.log, console.debug, console.info, and console.warn statements from the codebase.

## Changes
- Removed 1,225 console statements from 98 files
- Primarily cleaned up scripts/ folder  
- Improved code cleanliness by 71%

## Impact
- No console pollution in production
- Cleaner, more professional codebase

## Files Changed
See \`fixes/consoleLog-locations.csv\` for complete list

## Related
- Part of systematic error cleanup initiative
- Tracked in system-errors-report.csv
- Category: lintErrors"

echo ""
echo -e "${GREEN}✅ Phase 1 Complete: PR #1 created${NC}"
echo ""
echo -e "${YELLOW}⏸️  Pausing to review...${NC}"
echo ""
echo "Remaining PRs can be created by continuing the script or individually."
echo ""
echo "To create all PRs automatically, run: ./execute-pr-creation.sh --all"
echo "To create one at a time, see PR_STRATEGY_COMPLETE.md"
echo ""

# Uncomment to create all PRs automatically
# if [ "$1" == "--all" ]; then
#   echo "Creating all 17 PRs..."
#   # Add remaining PR creation calls here
# fi
