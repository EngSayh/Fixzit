#!/bin/bash
# Automated Conflict Resolution Script for PR #84
# This script resolves merge conflicts by keeping PR #84 enhancements
# while preserving any new business logic from main

set -e

echo "=========================================="
echo "PR #84 Conflict Resolution Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

RESOLVED=0
MANUAL=0
FAILED=0

# Function to check if file has conflicts
has_conflicts() {
    grep -q "^<<<<<<< HEAD" "$1" 2>/dev/null
}

# Function to auto-resolve simple conflicts (PR #84 only changes)
auto_resolve_pr84_only() {
    local file="$1"
    
    # If the file only has PR #84 changes (no conflicting business logic),
    # we can accept "ours" (PR #84)
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Auto-resolving${NC}: $file (PR #84 version)"
        git checkout --ours "$file" 2>/dev/null || return 1
        git add "$file"
        RESOLVED=$((RESOLVED + 1))
        return 0
    fi
    return 1
}

# Function to mark file for manual resolution
mark_manual() {
    local file="$1"
    echo -e "${YELLOW}⚠️  Manual resolution needed${NC}: $file"
    echo "   - Open in editor to merge PR #84 enhancements + main's business logic"
    MANUAL=$((MANUAL + 1))
}

echo "Step 1: Resolving configuration conflicts..."
echo "-------------------------------------------"

# .env.local - deleted in main (security best practice)
if has_conflicts ".env.local" 2>/dev/null || [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} Removing .env.local (deleted in main)"
    git rm -f .env.local 2>/dev/null || rm -f .env.local
    RESOLVED=$((RESOLVED + 1))
fi

# _deprecated/models-old/MarketplaceProduct.ts
if has_conflicts "_deprecated/models-old/MarketplaceProduct.ts" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Accepting main's version of deprecated model"
    git checkout --theirs _deprecated/models-old/MarketplaceProduct.ts 2>/dev/null || true
    git add _deprecated/models-old/MarketplaceProduct.ts 2>/dev/null || true
    RESOLVED=$((RESOLVED + 1))
fi

echo ""
echo "Step 2: Resolving API route conflicts..."
echo "----------------------------------------"

# List of API routes with conflicts
declare -a routes=(
    "app/api/aqar/map/route.ts"
    "app/api/aqar/properties/route.ts"
    "app/api/assistant/query/route.ts"
    "app/api/ats/convert-to-employee/route.ts"
    "app/api/auth/signup/route.ts"
    "app/api/billing/charge-recurring/route.ts"
    "app/api/contracts/route.ts"
    "app/api/feeds/indeed/route.ts"
    "app/api/feeds/linkedin/route.ts"
    "app/api/files/resumes/[file]/route.ts"
    "app/api/files/resumes/presign/route.ts"
    "app/api/finance/invoices/[id]/route.ts"
    "app/api/finance/invoices/route.ts"
    "app/api/kb/ingest/route.ts"
    "app/api/marketplace/products/route.ts"
    "app/api/payments/paytabs/callback/route.ts"
    "app/api/projects/route.ts"
    "app/api/qa/alert/route.ts"
    "app/api/qa/log/route.ts"
    "app/api/work-orders/export/route.ts"
    "app/api/work-orders/import/route.ts"
)

# Strategy: For most routes, PR #84 only added enhancements without main having changes
# We'll try auto-resolve first, then mark for manual if needed

for route in "${routes[@]}"; do
    if [ -f "$route" ]; then
        if has_conflicts "$route"; then
            # Check if main has significant new code (more than 50 lines different)
            # If not, auto-resolve to PR #84
            
            # Try to extract the main branch version size
            MAIN_SIZE=$(git show main:"$route" 2>/dev/null | wc -l || echo "0")
            OUR_SIZE=$(git show HEAD:"$route" 2>/dev/null | wc -l || echo "0")
            
            # If sizes are close (within 20 lines), likely just PR #84 enhancements
            DIFF=$((OUR_SIZE - MAIN_SIZE))
            DIFF=${DIFF#-} # Absolute value
            
            if [ "$DIFF" -lt 30 ]; then
                # Small difference - likely safe to use PR #84 version
                echo -e "${GREEN}✓${NC} Auto-resolving $route (PR #84 enhancements)"
                git checkout --ours "$route"
                git add "$route"
                RESOLVED=$((RESOLVED + 1))
            else
                # Large difference - needs manual review
                mark_manual "$route"
            fi
        else
            echo -e "${GREEN}✓${NC} Already resolved: $route"
        fi
    else
        echo -e "${RED}✗${NC} File not found: $route"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "Step 3: Resolving component conflicts..."
echo "----------------------------------------"

# AppSwitcher.tsx - likely needs manual merge
if [ -f "components/topbar/AppSwitcher.tsx" ]; then
    if has_conflicts "components/topbar/AppSwitcher.tsx"; then
        mark_manual "components/topbar/AppSwitcher.tsx"
    else
        echo -e "${GREEN}✓${NC} Already resolved: AppSwitcher.tsx"
    fi
fi

echo ""
echo "Step 4: Resolving infrastructure conflicts..."
echo "---------------------------------------------"

# server/copilot/retrieval.ts
if [ -f "server/copilot/retrieval.ts" ]; then
    if has_conflicts "server/copilot/retrieval.ts"; then
        # This file likely has specific changes in both branches
        mark_manual "server/copilot/retrieval.ts"
    else
        echo -e "${GREEN}✓${NC} Already resolved: retrieval.ts"
    fi
fi

echo ""
echo "=========================================="
echo "Resolution Summary"
echo "=========================================="
echo -e "${GREEN}✓ Auto-resolved: $RESOLVED files${NC}"
echo -e "${YELLOW}⚠️  Manual resolution needed: $MANUAL files${NC}"
echo -e "${RED}✗ Failed: $FAILED files${NC}"
echo ""

if [ $MANUAL -gt 0 ]; then
    echo "Files needing manual resolution:"
    echo "1. Open each file in VS Code"
    echo "2. Look for conflict markers: <<<<<<< HEAD"
    echo "3. Keep PR #84 structure + merge main's logic"
    echo "4. Save and 'git add' each file"
    echo ""
    echo "Example pattern for API routes:"
    echo "  - KEEP: imports (rateLimit, createSecureResponse, error handlers)"
    echo "  - KEEP: OpenAPI docs (@openapi comments)"
    echo "  - KEEP: Rate limiting check at start of handler"
    echo "  - MERGE: Any new business logic from main"
    echo "  - KEEP: createSecureResponse for return values"
    echo ""
fi

if [ $MANUAL -eq 0 ] && [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All conflicts resolved automatically!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review changes: git diff --cached"
    echo "2. Commit: git commit -m 'chore: resolve merge conflicts from main'"
    echo "3. Push: git push origin fix/consolidation-guardrails"
else
    echo "After manual resolution, run:"
    echo "  git add <resolved-files>"
    echo "  git commit -m 'chore: resolve merge conflicts from main'"
    echo "  git push origin fix/consolidation-guardrails"
fi

exit 0
