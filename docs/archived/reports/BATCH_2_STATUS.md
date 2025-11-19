# Batch 2 Status: app/api/ + Cascade Fixes

**Date**: 2025-11-15  
**Current Errors**: 97 (baseline 88 + 9 cascade from Batch 1)  
**Source**: `/tmp/tsc_batch_1_final.log`

## Error Distribution

```
app/api/           35 errors (17 files)
tests/             15 errors (finance e2e)
other/             47 errors (cascade + modules)
─────────────────────────────
TOTAL:             97 errors
```

## Root Cause Analysis

### WorkOrder Schema Mismatch (High Impact)

**Problem**: API routes and services use **legacy flat schema** but WorkOrder model now uses **nested schema**:

**Legacy (used in code)**:
```typescript
wo.assigneeUserId
wo.assigneeVendorId  
wo.code
wo.dueAt
wo.statusHistory.push(...)
```

**Current (actual schema)**:
```typescript
wo.assignment.assignedTo.userId
wo.assignment.assignedTo.vendorId
wo.workOrderNumber  // not 'code'
wo.sla.resolutionDeadline  // not 'dueAt'
wo.statusHistory  // array structure may differ
```

**Affected Files** (11 files, ~30 errors):
- `app/api/work-orders/[id]/assign/route.ts` (3 errors)
- `app/api/work-orders/[id]/status/route.ts` (4 errors)
- `app/api/work-orders/[id]/comments/route.ts` (2 errors)
- `app/api/work-orders/sla-check/route.ts` (2 errors)
- `server/copilot/tools.ts` (12 errors) - **HIGHEST IMPACT**
- `server/work-orders/wo.service.ts` (3 errors)
- `app/api/pm/generate-wos/route.ts` (1 error)
- `app/api/owner/units/[unitId]/history/route.ts` (1 error)
- `app/api/assistant/query/route.ts` (1 error)
- `app/finance/fm-finance-hooks.ts` (1 error)

### Other app/api/ Type Issues

**app/api/rfqs/[id]/bids/route.ts** (10 errors):
- Dynamic imports returning unknown types
- Property access on untyped objects
- Needs `as any` casts

**app/api/souq/*** (8 errors across 3 files):
- Similar dynamic import issues
- Product type mismatches

**app/api/admin/logo/upload/route.ts** (1 error)
**app/api/organization/settings/route.ts** (1 error)
**app/api/referrals/my-code/route.ts** (2 errors)
**app/api/support/tickets/[id]/reply/route.ts** (2 errors)
**app/api/user/preferences/route.ts** (1 error)

### Non-API Cascade Errors

**modules/users/service.ts** (5 errors)
**services/souq/buybox-service.ts** (3 errors)
**services/notifications/fm-notification-engine.ts** (2 errors)
**server/services/owner/financeIntegration.ts** (3 errors)
**server/rbac/workOrdersPolicy.ts** (1 error)
**server/middleware/withAuthRbac.ts** (1 error)
**models/*** (6 errors across 2 files)
**scripts/*** (6 errors across 2 files)
**contexts/FormStateContext.tsx** (1 error)
**lib/audit.ts** (1 error)
**lib/fm-auth-middleware.ts** (1 error)
**app/cms/[slug]/page.tsx** (1 error)

## Recommended Approach

### Option A: Quick Fix (1-2 hours)
Add `as any` casts to unblock TypeScript compilation:
```typescript
// Before
wo.assigneeUserId = body.assigneeUserId;

// After  
(wo as any).assigneeUserId = body.assigneeUserId;
```

**Pros**: Fast, reaches zero errors quickly
**Cons**: Hides runtime bugs, creates technical debt

### Option B: Proper Refactor (6-8 hours)
Update all code to use correct WorkOrder schema:
```typescript
// Update API routes
wo.assignment = wo.assignment || { assignedTo: {} };
wo.assignment.assignedTo.userId = body.assigneeUserId;

// Update queries
const filter = {
  'assignment.assignedTo.userId': userId
};
```

**Pros**: Correct implementation, no technical debt
**Cons**: Time-consuming, requires testing

### Option C: Hybrid (3-4 hours)
1. Fix high-impact files properly (copilot/tools.ts, wo.service.ts)
2. Add casts to low-impact files
3. File technical debt issues for cleanup

**Recommended**: **Option C** - balances speed and quality

## Next Steps

### Immediate (Batch 2 continuation):
1. Fix `server/copilot/tools.ts` properly (12 errors) - highest impact
2. Add casts to `app/api/work-orders/*` files (9 errors)
3. Fix `app/api/rfqs/[id]/bids/route.ts` with casts (10 errors)
4. Fix remaining app/api/ files with targeted casts (~15 errors)

**Estimated**: 2-3 hours to complete Batch 2

### Then Batch 3 (tests):
- `tests/finance/e2e/finance-pack.test.ts` (12 errors) - fixture updates

### Then Batch 4 (other):
- modules/users/service.ts (5 errors)
- services/souq/buybox-service.ts (3 errors)
- Scattered fixes (~39 errors)

## Technical Debt Created

If using Option A (casts), create issues for:
1. **WorkOrder API Migration**: Update all API routes to use nested schema
2. **WorkOrder Service Migration**: Update wo.service.ts, financeIntegration.ts
3. **WorkOrder Copilot Migration**: Refactor copilot/tools.ts completely
4. **Add Integration Tests**: Verify WorkOrder CRUD operations work end-to-end

**Estimated Cleanup**: 8-12 hours

---

**Status**: Paused after Batch 1 complete (server/models/ ✅)  
**Next Action**: Choose approach (A/B/C) and continue Batch 2
