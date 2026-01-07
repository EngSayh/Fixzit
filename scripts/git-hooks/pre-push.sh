#!/bin/bash
# ============================================================================
# Fixzit Pre-Push Hook
# ============================================================================
# 1. Block direct pushes to protected branches (main, master, production)
# 2. Run lint and typecheck validations
# ============================================================================
# Per AGENTS.md Section 5.4: "Never work directly on main"
# All changes MUST go through a PR on a feature branch
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the current branch
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

# Protected branches
protected_branches=("main" "master" "production")

# ============================================================================
# STEP 1: Block direct pushes to protected branches
# ============================================================================

for branch in "${protected_branches[@]}"; do
    if [ "$current_branch" = "$branch" ]; then
        echo ""
        echo -e "${RED}┌─────────────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${RED}│ ❌ BLOCKED: Direct push to '$branch' is FORBIDDEN                       │${NC}"
        echo -e "${RED}├─────────────────────────────────────────────────────────────────────────┤${NC}"
        echo -e "${RED}│                                                                         │${NC}"
        echo -e "${RED}│ Per AGENTS.md Section 5.4:                                              │${NC}"
        echo -e "${RED}│   • Never work directly on main                                         │${NC}"
        echo -e "${RED}│   • All changes MUST go through a Pull Request                          │${NC}"
        echo -e "${RED}│                                                                         │${NC}"
        echo -e "${RED}│ Required workflow:                                                      │${NC}"
        echo -e "${RED}│   1. Create branch: Fixzit-vX.X.X-YYYYMMDD-HHMM-<slug>                  │${NC}"
        echo -e "${RED}│   2. Push branch: git push origin <branch-name>                         │${NC}"
        echo -e "${RED}│   3. Create PR: gh pr create                                            │${NC}"
        echo -e "${RED}│   4. Get review + CI green                                              │${NC}"
        echo -e "${RED}│   5. Merge via GitHub UI                                                │${NC}"
        echo -e "${RED}│                                                                         │${NC}"
        echo -e "${RED}└─────────────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        echo -e "${YELLOW}To move your commits to a new branch:${NC}"
        echo ""
        echo "  # Option 1: Create branch from current state"
        echo "  git checkout -b Fixzit-v2.0.27-\$(date +%Y%m%d)-\$(date +%H%M)-your-feature"
        echo "  git push origin HEAD"
        echo "  gh pr create"
        echo ""
        echo "  # Option 2: Reset main and cherry-pick"
        echo "  git checkout -b temp-branch"
        echo "  git checkout main"
        echo "  git reset --hard origin/main"
        echo "  git checkout temp-branch"
        echo "  git push origin HEAD"
        echo "  gh pr create"
        echo ""
        exit 1
    fi
done

# Also check the remote ref being pushed to (in case of force push attempts)
while read local_ref local_sha remote_ref remote_sha; do
    for branch in "${protected_branches[@]}"; do
        if [[ "$remote_ref" == "refs/heads/$branch" ]]; then
            echo ""
            echo -e "${RED}❌ BLOCKED: Cannot push to remote '$branch' directly${NC}"
            echo -e "${RED}   All changes to '$branch' must go through a Pull Request.${NC}"
            echo ""
            exit 1
        fi
    done
done

echo -e "${GREEN}✓ Branch check passed (not pushing to protected branch)${NC}"

# ============================================================================
# STEP 2: Run lint and typecheck validations
# ============================================================================

echo ""
echo -e "${YELLOW}Running pre-push validations...${NC}"
echo ""

# Run mongo-unwrap lint
echo "→ Running lint:mongo-unwrap..."
pnpm lint:mongo-unwrap || {
    echo -e "${RED}❌ lint:mongo-unwrap failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ lint:mongo-unwrap passed${NC}"

# Run typecheck
echo "→ Running typecheck..."
pnpm typecheck || {
    echo -e "${RED}❌ typecheck failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ typecheck passed${NC}"

echo ""
echo -e "${GREEN}✓ All pre-push checks passed${NC}"
echo ""

exit 0
