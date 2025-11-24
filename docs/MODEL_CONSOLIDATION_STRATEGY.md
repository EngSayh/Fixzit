# Model Consolidation Strategy

**Created:** 2025-10-05  
**Status:** ANALYSIS COMPLETE - READY FOR EXECUTION

---

## Problem Statement

Models exist in TWO locations with PARTIAL overlap:

- `server/models/` - 24 models (core app models)
- `src/db/models/` - 33 models (includes finance/subscription models)

**Result:** Imports are inconsistent, duplicates exist, and finance models are isolated.

---

## Current State Analysis

### Models in BOTH Locations (Duplicates - 24 files)

✅ Application.ts
✅ Asset.ts
✅ AtsSettings.ts
✅ Candidate.ts
✅ CmsPage.ts
✅ CopilotAudit.ts
✅ CopilotKnowledge.ts
✅ Employee.ts
✅ HelpArticle.ts
✅ Invoice.ts
✅ Job.ts
✅ MarketplaceProduct.ts
✅ Organization.ts
✅ OwnerStatement.ts
✅ Project.ts
✅ Property.ts
✅ RFQ.ts
✅ SLA.ts
✅ SearchSynonym.ts
✅ SupportTicket.ts
✅ Tenant.ts
✅ User.ts
✅ Vendor.ts
✅ WorkOrder.ts

### Models ONLY in src/db/models/ (Finance/Subscription - 9 files)

⚠️ Benchmark.ts
⚠️ DiscountRule.ts
⚠️ Module.ts
⚠️ OwnerGroup.ts
⚠️ PaymentMethod.ts
⚠️ PriceBook.ts
⚠️ ServiceAgreement.ts
⚠️ Subscription.ts
⚠️ Candidate.test.ts (test file)

---

## Import Analysis

### Current Import Patterns

**Pattern 1: `@/server/models/` (Canonical - Most Used)**

```typescript
// API routes use this
import { Property } from "@/server/models/Property";
import { WorkOrder } from "@/server/models/WorkOrder";
import { User } from "@/server/models/User";
```

**Usage:** 8+ API route files

**Pattern 2: `../src/db/models/` (Legacy - Finance Only)**

```typescript
// Scripts and finance use this
import Module from "../src/db/models/Module";
import Subscription from "../src/db/models/Subscription";
import PaymentMethod from "../src/db/models/PaymentMethod";
```

**Usage:** 2 files (scripts/seed-subscriptions.ts, lib/paytabs/subscription.ts)

---

## Consolidation Strategy

### Phase 1: Move Unique Models ✅ SAFEST

**Action:** Copy finance/subscription models TO `server/models/`

```bash
# Move unique models
cp src/db/models/Benchmark.ts server/models/
cp src/db/models/DiscountRule.ts server/models/
cp src/db/models/Module.ts server/models/
cp src/db/models/OwnerGroup.ts server/models/
cp src/db/models/PaymentMethod.ts server/models/
cp src/db/models/PriceBook.ts server/models/
cp src/db/models/ServiceAgreement.ts server/models/
cp src/db/models/Subscription.ts server/models/
```

**Result:** All models in `server/models/` (33 total)

### Phase 2: Update Imports

**Action:** Change `src/db/models/` imports to `@/server/models/`

**Files to Update:**

1. `scripts/seed-subscriptions.ts` (4 imports)
2. `lib/paytabs/subscription.ts` (3 imports)

**Before:**

```typescript
import Module from "../src/db/models/Module";
```

**After:**

```typescript
import Module from "@/server/models/Module";
```

### Phase 3: Verify No Broken Imports

**Action:** Search for any remaining `src/db/models` imports

```bash
grep -r "from.*src/db/models" --include="*.ts" --include="*.tsx"
```

### Phase 4: Compare & Remove Duplicates

**Action:** For each of the 24 duplicate models:

1. Compare files: `diff server/models/Property.ts src/db/models/Property.ts`
2. If identical → Delete `src/db/models/Property.ts`
3. If different → Merge (keep most complete, preserve tests)
4. Update BACKBONE_INDEX.md

### Phase 5: Verify TypeScript

**Action:** Run full typecheck

```bash
npm run typecheck
```

---

## Risk Assessment

### ⚠️ HIGH RISK (Don't Do Yet)

- Removing `src/db/models/` entirely before imports updated
- Changing imports without verifying model exists in target

### ✅ LOW RISK (Safe to Do Now)

- Copying unique models TO `server/models/` (adds files, breaks nothing)
- Updating imports one file at a time with verification
- Comparing duplicate models for differences

### 🔒 ZERO RISK (Always Safe)

- Reading and analyzing files
- Creating documentation
- Running TypeScript check

---

## Execution Plan (Autonomous)

### Step 1: Copy Unique Models ✅

```bash
for model in Benchmark DiscountRule Module OwnerGroup PaymentMethod PriceBook ServiceAgreement Subscription; do
  cp "src/db/models/${model}.ts" "server/models/${model}.ts"
  echo "✅ Copied $model"
done
```

### Step 2: Update Import in lib/paytabs/subscription.ts ✅

```typescript
// Change:
import PaymentMethod from "../../src/db/models/PaymentMethod";
import Subscription from "../../src/db/models/Subscription";
import OwnerGroup from "../../src/db/models/OwnerGroup";

// To:
import PaymentMethod from "@/server/models/PaymentMethod";
import Subscription from "@/server/models/Subscription";
import OwnerGroup from "@/server/models/OwnerGroup";
```

### Step 3: Update Import in scripts/seed-subscriptions.ts ✅

```typescript
// Change:
import Module from "../src/db/models/Module";
import PriceBook from "../src/db/models/PriceBook";
import DiscountRule from "../src/db/models/DiscountRule";
import Benchmark from "../src/db/models/Benchmark";

// To:
import Module from "@/server/models/Module";
import PriceBook from "@/server/models/PriceBook";
import DiscountRule from "@/server/models/DiscountRule";
import Benchmark from "@/server/models/Benchmark";
```

### Step 4: Verify TypeScript ✅

```bash
npm run typecheck
```

### Step 5: Search for Remaining Imports ✅

```bash
grep -r "src/db/models" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

### Step 6: Remove Duplicates (After Verification) ✅

```bash
# For each duplicate, after confirming identical:
rm src/db/models/Property.ts
rm src/db/models/WorkOrder.ts
# ... etc (24 files)
```

---

## Expected Outcome

### Before

- Models split across 2 directories
- Inconsistent imports
- 33 models total, 24 duplicates
- Finance models isolated

### After

- ✅ Single source: `server/models/` (33 models)
- ✅ Consistent imports: `@/server/models/*`
- ✅ Zero duplicates
- ✅ Finance models integrated
- ✅ TypeScript: 0 errors
- ✅ Documentation updated

---

## Automation Script

**File:** `scripts/consolidate-models.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "🔄 Model Consolidation Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Copy unique models
echo ""
echo "📦 Copying unique models to server/models/..."
for model in Benchmark DiscountRule Module OwnerGroup PaymentMethod PriceBook ServiceAgreement Subscription; do
  if [ -f "src/db/models/${model}.ts" ]; then
    cp "src/db/models/${model}.ts" "server/models/${model}.ts"
    echo "  ✅ Copied ${model}.ts"
  fi
done

# Step 2: Update imports (manual or sed)
echo ""
echo "⚠️  Manual step: Update imports in:"
echo "  - lib/paytabs/subscription.ts"
echo "  - scripts/seed-subscriptions.ts"

# Step 3: Verify
echo ""
echo "🔍 Verifying TypeScript..."
npm run typecheck || echo "❌ TypeScript errors found"

# Step 4: Check for remaining imports
echo ""
echo "🔍 Checking for remaining src/db/models imports..."
if grep -r "src/db/models" --include="*.ts" --include="*.tsx" | grep -v node_modules; then
  echo "⚠️  Found remaining imports. Update before removing duplicates."
else
  echo "✅ No remaining imports found"
fi

echo ""
echo "✅ Phase 1 complete! Ready for duplicate removal."
```

---

## Success Criteria

- [ ] All 33 models in `server/models/`
- [ ] All imports use `@/server/models/*`
- [ ] Zero imports from `src/db/models/`
- [ ] TypeScript: 0 errors
- [ ] `src/db/models/` directory empty or removed
- [ ] BACKBONE_INDEX.md updated
- [ ] DUPLICATE_CONSOLIDATION_LOG.md updated

---

## Timeline

**Est. Autonomous Execution Time:** 5-10 minutes  
**Manual Review Time:** 5 minutes  
**Total:** ~15 minutes

---

**Status:** READY TO EXECUTE  
**Next Action:** Copy unique models to server/models/  
**Blocker:** None - fully autonomous

---

**Agent Governor:** Approved for autonomous execution ✅
