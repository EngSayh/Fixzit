# Issues Register - Fixzit Index Management System

**Last Updated**: 2025-12-06  
**Version**: 1.2  
**Scope**: Database index management across all models

---

## Executive Summary

This register documents all issues discovered in the Fixzit index management system. ~~The primary blocker is **IndexOptionsConflict** errors caused by duplicate index definitions between `lib/db/collections.ts` (manual native driver) and Mongoose schema definitions in various model files.~~

**UPDATE (2025-12-04)**: ISSUE-001 and ISSUE-002 have been **RESOLVED**. Schema indexes have been removed from WorkOrder.ts and Product.ts models, and `autoIndex: false` has been added to prevent Mongoose auto-index creation. Property.ts also has `autoIndex: false`. All indexes are now centrally managed in `lib/db/collections.ts`.

**Impact**: ~~Deployment failures, potential cross-tenant data leaks, wasted database resources.~~ RESOLVED - no deployment failures expected.

**Root Cause**: Dual-source index architecture without clear delineation of responsibilities. **FIXED** by establishing `lib/db/collections.ts` as single source of truth.

---

## 🟥 CRITICAL - Blockers (Deployment Failures)

### ISSUE-001: IndexOptionsConflict in WorkOrder Model

**Severity**: 🟥 CRITICAL  
**Category**: Correctness, Deployment  
**Status**: ✅ RESOLVED (2025-12-04)

**Resolution**: Removed 6 duplicate schema indexes from `server/models/WorkOrder.ts`.
All indexes now managed centrally in `lib/db/collections.ts`. Added `autoIndex: false` to schema options. See commit `abee80560`.

**Description**:  
`server/models/WorkOrder.ts` defines 15+ indexes via Mongoose schema (lines 496-623) that are ALSO defined manually in `lib/db/collections.ts` (lines 138-167). When `ensureCoreIndexes()` runs during deployment, it calls BOTH `createIndexes()` from collections.ts AND `WorkOrder.createIndexes()` via Mongoose, causing IndexOptionsConflict errors because the same index is defined twice with potentially different options (e.g., index names, background flags).

**Files**:
- `server/models/WorkOrder.ts`: Lines 496-623 (schema indexes)
- `lib/db/collections.ts`: Lines 138-167 (manual indexes)
- `lib/db/index.ts`: Line 62 (orchestrator - removed WorkOrder from model list but indexes still in schema)

**Evidence**:
```typescript
// In WorkOrder.ts (lines 496-502)
WorkOrderSchema.index(
  { orgId: 1, workOrderNumber: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);
WorkOrderSchema.index({ orgId: 1, status: 1 });
WorkOrderSchema.index({ orgId: 1, priority: 1 });
// ... 12+ more indexes

// In collections.ts (lines 138-150)
await db.collection(COLLECTIONS.WORK_ORDERS).createIndex(
  { orgId: 1, workOrderNumber: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } }, name: "workorders_orgId_workOrderNumber_unique" }
);
await db.collection(COLLECTIONS.WORK_ORDERS).createIndex(
  { orgId: 1, status: 1 },
  { background: true, name: "workorders_orgId_status" }
);
// ... matching indexes
```

**Root Cause**:  
WorkOrder was removed from the `model.createIndexes()` list in `lib/db/index.ts` (line 62 commented as "already covered by createIndexes()"), BUT the schema still defines indexes. Mongoose automatically creates indexes on model initialization, so these schema indexes are ALWAYS created, conflicting with the manual definitions.

**Impact**:
- Deployment script fails with IndexOptionsConflict
- Potential for inconsistent index state across environments
- Wasted database resources (duplicate index attempts)

**Recommended Fix**:  
Remove ALL index definitions from `server/models/WorkOrder.ts` (lines 496-623). Keep only the manual definitions in `lib/db/collections.ts` with explicit names. Set `autoIndex: false` in schema options to prevent Mongoose from auto-creating indexes.

---

### ISSUE-002: IndexOptionsConflict in Product Model

**Severity**: 🟥 CRITICAL  
**Category**: Correctness, Deployment  
**Status**: ✅ RESOLVED (2025-12-04)

**Resolution**: Removed 5 duplicate schema indexes from `server/models/marketplace/Product.ts`.
All indexes now managed centrally in `lib/db/collections.ts`. See commit `abee80560`.

**Description**:  
`server/models/marketplace/Product.ts` defines 5 indexes via Mongoose schema (lines 129-166) that are ALSO defined manually in `lib/db/collections.ts` (lines 187-218). Same conflict as ISSUE-001.

**Files**:
- `server/models/marketplace/Product.ts`: Lines 129-166 (schema indexes)
- `lib/db/collections.ts`: Lines 187-218 (manual indexes)
- `lib/db/index.ts`: Line 62 (Product removed from model list)

**Evidence**:
```typescript
// In Product.ts (lines 129-148)
ProductSchema.index(
  { orgId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } }, name: "products_orgId_sku_unique" }
);
ProductSchema.index(
  { orgId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } }, name: "products_orgId_slug_unique" }
);
// ... 3 more indexes + text search index

// In collections.ts (lines 187-218)
await db.collection(COLLECTIONS.PRODUCTS).createIndex(
  { orgId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } }, name: "products_orgId_sku_unique" }
);
// ... exact duplicates
```

**Root Cause**:  
Same as ISSUE-001. Product removed from model.createIndexes() list but schema still defines indexes.

**Impact**: Same as ISSUE-001

**Recommended Fix**:  
Remove ALL index definitions from `server/models/marketplace/Product.ts` (lines 129-166). Keep manual definitions in collections.ts. Set `autoIndex: false` in schema options.

**Special Note**:  
The Product text search index (lines 155-166 in Product.ts, lines 209-218 in collections.ts) has a comment "⚡ CRITICAL FIX: Tenant-scoped text index (prevents cross-tenant data leaks)". Ensure this critical security feature is preserved in the manual definition.

---

### ISSUE-003: IndexOptionsConflict in Property Model

**Severity**: 🟥 CRITICAL  
**Category**: Correctness, Deployment, Security  
**Status**: OPEN

**Description**:  
`server/models/Property.ts` defines 5 indexes via Mongoose schema (lines 246-260) that are ALSO defined manually in `lib/db/collections.ts` (lines 221-242). Same conflict pattern as ISSUE-001 and ISSUE-002.

**Files**:
- `server/models/Property.ts`: Lines 246-260 (schema indexes)
- `lib/db/collections.ts`: Lines 221-242 (manual indexes)
- `lib/db/index.ts`: Line 62 (Property removed from model list)

**Evidence**:
```typescript
// In Property.ts (lines 246-260)
PropertySchema.index({ orgId: 1, type: 1 });
PropertySchema.index({ orgId: 1, "address.city": 1 });
PropertySchema.index({ orgId: 1, "units.status": 1 });
PropertySchema.index({ "address.coordinates": "2dsphere" }); // Geospatial
PropertySchema.index(
  { orgId: 1, code: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } }
);

// In collections.ts (lines 221-242)
await db.collection(COLLECTIONS.PROPERTIES).createIndex(
  { orgId: 1, code: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } }, name: "properties_orgId_code_unique" }
);
// ... exact duplicates with explicit names
```

**Root Cause**: Same as ISSUE-001

**Impact**: Same as ISSUE-001, PLUS risk of geo-query failures if 2dsphere index is not consistently created

**Recommended Fix**:  
Remove ALL index definitions from `server/models/Property.ts` (lines 246-260). Keep manual definitions in collections.ts including the 2dsphere geospatial index. Set `autoIndex: false`.

---

## 🟧 MAJOR - Data Consistency / Tenant Isolation

### ISSUE-005: Mixed orgId Storage in Souq Payouts/Withdrawals

**Severity**: 🟧 MAJOR  
**Category**: Data integrity, Performance, Tenant isolation  
**Status**: OPEN  

**Description**:  
`souq_payouts` historically stored `orgId` as ObjectId while `souq_settlements` and current code paths write `orgId` as string. This mixed storage forces `$in` queries with dual types, reduces index selectivity, and can duplicate tenant rows. Withdrawals reference payouts by `orgId`, so drift causes lookup misses and uneven performance.

**Files / Scripts**:  
- `services/souq/settlements/payout-processor.ts` (uses `$in` for mixed types; canonical writes now string)  
- `services/souq/settlements/balance-service.ts` (withdrawal lookups with `$in`)  
- Migration added: `scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts`

**Impact**:  
- Index scans and poor selectivity on `orgId` in payouts/withdrawals.  
- Potential duplicate tenant rows and inconsistent payout batching when orgId types differ.  
- Operational drift if not backfilled; `$in` guards remain a performance workaround.

**Recommended Fix**:  
1) Run the normalization migration in all environments:  
   - Dry run: `npx tsx scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts --dry-run`  
   - Execute: `npx tsx scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts`  
2) Ensure indexes exist: `souq_payouts` `{ orgId: 1, payoutId: 1 }`, `souq_withdrawal_requests` `{ orgId: 1, requestId: 1 }`.  
3) After data is clean, simplify queries to string-only orgId and add schema-level validation to reject ObjectId orgIds going forward.  
4) Wire migration into deploy/CI runbooks to prevent drift.

**Evidence**:  
- Current code writes string orgId; legacy rows remain. Queries use `$in` with `[string, ObjectId]`, indicating mixed storage and degraded index usage.

---

### ISSUE-006: souq_sellers orgId Type Mismatch in Queries

**Severity**: 🟧 MAJOR  
**Category**: Data integrity, Tenant isolation, Correctness  
**Status**: ✅ RESOLVED (2025-12-06)

**Resolution**: Added dual string/ObjectId handling (`$in: [string, ObjectId]`) across all souq_sellers queries. Files fixed:
- `services/souq/settlements/payout-processor.ts` (lines 999-1011) - payout notification seller lookup
- `services/notifications/seller-notification-service.ts` (lines 149-162) - getSeller function
- `services/souq/claims/investigation-service.ts` (lines 230-250) - getSellerHistory and getBuyerHistory
- `services/souq/search-indexer-service.ts` (fetchActiveSellers, fetchSellerById, transformListingsToDocuments)

**Description**:  
`souq_sellers.orgId` is defined as `ObjectId` in Mongoose schema (`server/models/souq/Seller.ts` line 79), but callers (payout processor, notification service, investigation service) pass string orgId. Queries with `orgId: stringValue` always returned no results, silently breaking:
- Payout WhatsApp notifications (sellers never notified of payouts)
- Seller notification lookups
- Investigation service seller/buyer history
- Search indexer seller fetches

**Files**:  
- `server/models/souq/Seller.ts`: Line 79 - `orgId: mongoose.Types.ObjectId`
- `services/souq/settlements/payout-processor.ts`: Lines 1003-1007 (before fix)
- `services/notifications/seller-notification-service.ts`: Lines 155-158 (before fix)
- `services/souq/claims/investigation-service.ts`: Lines 239-240 (before fix)
- `services/souq/search-indexer-service.ts`: Lines 489-492, 518-522, 561-563 (before fix)

**Evidence (Before Fix)**:
```typescript
// payout-processor.ts - would always miss when payout.orgId is string
const sellerFilter: Filter<Document> = sellerIdObj
  ? { _id: sellerIdObj, orgId: payout.orgId }  // ❌ String vs ObjectId mismatch
  : { sellerId: payout.sellerId, orgId: payout.orgId };
```

**Root Cause**:  
`souq_sellers` model uses ObjectId for orgId (defined in Mongoose schema), but service layer code passes string orgId from session/request context. MongoDB strict type matching returns no results.

**Impact**:
- Payout notifications silently failed (sellers never received WhatsApp alerts)
- Seller lookup for claims investigation returned no seller data
- Search indexer could not fetch seller details for documents
- Tenant isolation appeared to work but was actually broken (no data returned)

**Fix Applied**:
```typescript
// After fix - dual-type handling
const orgCandidates = ObjectId.isValid(orgIdStr)
  ? [orgIdStr, new ObjectId(orgIdStr)]
  : [orgIdStr];
const sellerFilter: Filter<Document> = sellerIdObj
  ? { _id: sellerIdObj, orgId: { $in: orgCandidates } }  // ✅ Matches both types
  : { sellerId: payout.sellerId, orgId: { $in: orgCandidates } };
```

---

### ISSUE-007: Withdrawal Thresholds Duplicated Between Services

**Severity**: 🟨 MINOR  
**Category**: Code quality, Maintainability  
**Status**: ✅ RESOLVED (2025-12-06)

**Resolution**: Imported `PAYOUT_CONFIG` from payout-processor.ts into balance-service.ts. Replaced hardcoded `WITHDRAWAL_HOLD_DAYS = 7` and `minimumWithdrawal = 500` with centralized config values.

**Description**:  
`balance-service.ts` hardcoded `WITHDRAWAL_HOLD_DAYS = 7` and `minimumWithdrawal = 500` SAR, while `payout-processor.ts` defined these in `PAYOUT_CONFIG`. If values were changed in one place, the other would drift, causing inconsistent validation between withdrawal requests and payout processing.

**Files**:  
- `services/souq/settlements/balance-service.ts`: Line 20 (WITHDRAWAL_HOLD_DAYS) and Line 803 (minimumWithdrawal = 500)
- `services/souq/settlements/payout-processor.ts`: Lines 110-112 (PAYOUT_CONFIG.holdPeriodDays, minimumAmount)

**Root Cause**:  
Initial implementation duplicated constants without cross-referencing the centralized config.

**Impact**:
- Risk of validation drift (e.g., withdrawal allows 500 but payout requires 600)
- Maintenance burden when changing thresholds
- Potential for customer confusion if withdrawal succeeds but payout fails

**Fix Applied**:
```typescript
// balance-service.ts - now imports centralized config
import { PAYOUT_CONFIG } from "@/services/souq/settlements/payout-processor";
const WITHDRAWAL_HOLD_DAYS = PAYOUT_CONFIG.holdPeriodDays;
const MINIMUM_WITHDRAWAL_AMOUNT = PAYOUT_CONFIG.minimumAmount;
```

---

## 🟧 MAJOR - Architectural Issues

### ISSUE-004: User Model Indexes Without Explicit Names

**Severity**: 🟧 MAJOR  
**Category**: Architecture, Maintainability  
**Status**: OPEN

**Description**:  
`server/models/User.ts` defines 11 indexes via Mongoose schema (lines 238-257), but these indexes are NOT defined in `lib/db/collections.ts`. While this avoids IndexOptionsConflict, it creates inconsistency:

1. Schema indexes (User.ts) don't have explicit names - Mongoose auto-generates them
2. Manual indexes (collections.ts) have explicit names for tracking and management
3. User model is NOT in either location (collections.ts OR ensureCoreIndexes model list)

This makes it unclear which indexes exist and how to manage them.

**Files**:
- `server/models/User.ts`: Lines 238-257 (11 schema indexes without explicit names)
- `lib/db/collections.ts`: No User indexes (unlike other major models)
- `lib/db/index.ts`: Line 62 (User removed from model list)

**Evidence**:
```typescript
// In User.ts - indexes defined but no explicit names
UserSchema.index(
  { orgId: 1, email: 1 },
  { unique: true, partialFilterExpression: UNIQUE_TENANT_FILTER }
  // ❌ No explicit name - Mongoose will auto-generate
);
UserSchema.index({ orgId: 1, "professional.role": 1 }); // ❌ No name
UserSchema.index({ orgId: 1, "professional.subRole": 1 }); // ❌ No name
// ... 8 more without names
```

**Root Cause**:  
Inconsistent architecture - User model indexes defined only in schema, without the explicit naming convention used for other models in collections.ts.

**Impact**:
- Index names are unpredictable (Mongoose auto-generated)
- Harder to track and drop indexes during maintenance
- Inconsistent with project's explicit-naming convention
- Potential for duplicate indexes if someone adds User to collections.ts later

**Recommended Fix - Option A (Preferred)**:  
Add explicit `name` property to all User schema indexes to match the naming convention (e.g., `users_orgId_email_unique`, `users_orgId_role`). This maintains the schema-based approach while adding explicit names.

**Recommended Fix - Option B**:  
Move all User indexes to `lib/db/collections.ts` (like WorkOrder, Product, Property) and remove from schema. This achieves full consistency but requires more refactoring.

**Decision Rationale**:  
Option A is preferred because User indexes are complex (11 indexes) and closely tied to the schema definition. Adding explicit names is less disruptive than moving to collections.ts.

---

### ISSUE-005: Dual-Source Index Architecture Lacks Documentation

**Severity**: 🟧 MAJOR  
**Category**: Architecture, Documentation  
**Status**: OPEN

**Description**:  
The codebase uses TWO approaches for index management:

1. **Manual Native Driver** (`lib/db/collections.ts`): WorkOrder, Product, Property, Invoice, Order, SupportTicket, etc.
2. **Mongoose Schema** (`model.createIndexes()`): Vendor, Tenant, Organization, WorkOrderComment, WorkOrderAttachment, WorkOrderTimeline, QaLog, QaAlert

There is NO clear documentation explaining:
- When to use which approach
- Why some models are in collections.ts and others use model.createIndexes()
- How to prevent future IndexOptionsConflict issues
- What the responsibilities of each approach are

**Files**:
- `lib/db/index.ts`: Lines 1-95 (orchestrator with minimal comments)
- `lib/db/collections.ts`: Lines 1-580 (no architecture explanation)
- No ADR (Architecture Decision Record) for this pattern

**Root Cause**:  
Organic evolution of codebase without architectural documentation. Likely started with Mongoose schema indexes, then added manual indexes for control, but didn't fully migrate or document the dual approach.

**Impact**:
- Future developers will repeat the same mistakes (IndexOptionsConflict)
- Onboarding time increased
- Risk of re-introducing bugs during maintenance
- Inconsistent patterns across the codebase

**Recommended Fix**:
1. Add comprehensive JSDoc comments to `ensureCoreIndexes()` explaining the dual-source architecture
2. Create an ADR document (`docs/adr/002-index-management-dual-source.md`) explaining:
   - Why we use manual indexes (collections.ts) for major models
   - Why we use model.createIndexes() for smaller/auxiliary models
   - Rules for when to add indexes to which source
   - How autoIndex: false prevents conflicts
3. Add inline comments in collections.ts listing which models are covered
4. Update CONTRIBUTING.md with index management guidelines

---

### ISSUE-006: Missing `autoIndex: false` in Schema Options

**Severity**: 🟧 MAJOR  
**Category**: Correctness, Performance  
**Status**: OPEN

**Description**:  
Models with indexes defined in `lib/db/collections.ts` should have `autoIndex: false` in their schema options to prevent Mongoose from automatically creating indexes on model compilation. This is the ROOT CAUSE enabler for ISSUE-001, ISSUE-002, ISSUE-003.

Currently, WorkOrder, Product, and Property schemas don't explicitly set `autoIndex: false`, meaning Mongoose WILL attempt to create indexes defined in the schema, even if we don't call `model.createIndexes()` explicitly.

**Files**:
- `server/models/WorkOrder.ts`: Schema options (around line 30-35)
- `server/models/marketplace/Product.ts`: Schema options (around line 58)
- `server/models/Property.ts`: Schema options (around line 18-25)

**Evidence**:
```typescript
// Current - no autoIndex setting
const WorkOrderSchema = new Schema(
  {
    // ... fields
  },
  {
    timestamps: true,
    // ❌ Missing: autoIndex: false
  }
);
```

**Root Cause**:  
Mongoose's default behavior is `autoIndex: true` in development, `false` in production (based on NODE_ENV). This creates environment-specific behavior and doesn't fully prevent index conflicts if schema indexes are defined.

**Impact**:
- Indexes may be created twice in development
- Inconsistent behavior across environments
- Root cause for IndexOptionsConflict errors

**Recommended Fix**:  
Add `autoIndex: false` to schema options for WorkOrder, Product, Property, and any other model with manual index definitions in collections.ts:

```typescript
const WorkOrderSchema = new Schema(
  {
    // ... fields
  },
  {
    timestamps: true,
    autoIndex: false, // ✅ Manual indexes managed in lib/db/collections.ts
  }
);
```

**Note**: After adding `autoIndex: false`, schema index definitions become NO-OP in terms of actual index creation, but they still serve as documentation. For full clarity, schema indexes should be removed entirely (per ISSUE-001/002/003 fixes).

---

## 🟨 MODERATE - Optimization Opportunities

### ISSUE-007: Redundant Index Definitions in Schema (Documentation Smell)

**Severity**: 🟨 MODERATE  
**Category**: Code Quality, Maintainability  
**Status**: OPEN

**Description**:  
After fixing ISSUE-001/002/003 by setting `autoIndex: false`, the schema index definitions (e.g., `WorkOrderSchema.index(...)`) become NO-OP - they don't create indexes. Some may argue they serve as "documentation", but this creates confusion:

1. Developers may not understand that these indexes are NOT created by the schema
2. Changes to schema indexes won't take effect (because manual indexes control)
3. Divergence risk: schema index definition changes but manual index doesn't

**Files**: Same as ISSUE-001/002/003

**Root Cause**: Preference for keeping schema indexes as "documentation" rather than single source of truth

**Impact**:
- Potential for misleading documentation
- Risk of divergence between schema and actual indexes
- Confusion for new developers

**Recommended Fix**:  
Remove all schema index definitions from WorkOrder, Product, Property models after setting `autoIndex: false`. Let `lib/db/collections.ts` be the SINGLE source of truth. Add comments in the schema:

```typescript
// Indexes are managed manually in lib/db/collections.ts
// See: createIndexes() for workorders_orgId_workOrderNumber_unique, etc.
const WorkOrderSchema = new Schema(
  { /* ... fields ... */ },
  {
    timestamps: true,
    autoIndex: false, // Manual indexes only
  }
);
```

---

### ISSUE-008: No Index Coverage Verification Test

**Severity**: 🟨 MODERATE  
**Category**: Testing, Reliability  
**Status**: OPEN

**Description**:  
There is no automated test that verifies:
1. All required indexes are created successfully
2. No IndexOptionsConflict errors occur
3. Index names match expected conventions
4. Org-scoped indexes have proper partialFilterExpression

The `scripts/ensure-indexes.ts --verify` flag provides manual verification, but this is not run in CI/CD.

**Files**:
- `scripts/ensure-indexes.ts`: Verification logic exists but not tested
- No test file for index coverage

**Root Cause**:  
Index management is typically deployment-time concern, not test-time. However, for a multi-tenant system with STRICT v4.1 requirements, index correctness is critical to security.

**Impact**:
- Index conflicts may only be discovered in production/staging
- Regression risk when adding new models or indexes
- No enforcement of org-scoping requirements

**Recommended Fix**:  
Create `tests/integration/index-management.test.ts`:
1. Connect to test database
2. Run `ensureCoreIndexes()`
3. Verify expected indexes exist with correct names
4. Verify NO global unique indexes (all must be org-scoped)
5. Verify TTL indexes for QA collections
6. Fail if any IndexOptionsConflict error occurs

Add to CI pipeline: `pnpm test:integration:indexes`

---

## 🟩 MINOR - Nice-to-Have Improvements

### ISSUE-009: Vendor and Tenant Index Approach Not Verified

**Severity**: 🟩 MINOR  
**Category**: Documentation, Verification  
**Status**: OPEN

**Description**:  
Vendor and Tenant models use `model.createIndexes()` approach (called from `lib/db/index.ts` line 62) and are NOT in `collections.ts`. This appears correct (no duplication), but it's not explicitly documented WHY these models use a different approach than WorkOrder/Product/Property.

**Files**:
- `server/models/Vendor.ts`: Lines 249-260 (5 schema indexes with explicit names ✅)
- `server/models/Tenant.ts`: Lines 213-223 (4 schema indexes with explicit names ✅)
- `lib/db/index.ts`: Line 62 (Vendor.createIndexes() called)

**Evidence**:
```typescript
// Vendor.ts - indexes WITH explicit names ✅
VendorSchema.index(
  { orgId: 1, code: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } }
  // ❌ But still no explicit name property
);
```

**Root Cause**:  
Inconsistent migration: Some models moved to collections.ts, others stayed in schema, but naming convention not consistently applied.

**Impact**:  
Minor - Vendor/Tenant indexes work correctly, but approach differs from User (no explicit names) and WorkOrder/Product/Property (manual in collections.ts).

**Recommended Fix**:  
Document in `lib/db/index.ts` that Vendor/Tenant use model.createIndexes() because:
- They have fewer indexes (5 and 4 respectively)
- They were added after collections.ts pattern was established for major models
- Explicit names should still be added to schema indexes for consistency

OR: Migrate Vendor/Tenant to collections.ts for full consistency with WorkOrder/Product/Property.

---

## Summary Statistics

| Severity | Count | Status |
|----------|-------|--------|
| 🟥 CRITICAL | 3 | OPEN |
| 🟧 MAJOR | 3 | OPEN |
| 🟨 MODERATE | 2 | OPEN |
| 🟩 MINOR | 1 | OPEN |
| **TOTAL** | **9** | **9 OPEN** |

---

## Priority Fix Order

Based on severity and dependencies:

1. **ISSUE-006** (autoIndex: false) - Enabler for other fixes
2. **ISSUE-001** (WorkOrder conflicts) - Blocker
3. **ISSUE-002** (Product conflicts) - Blocker
4. **ISSUE-003** (Property conflicts) - Blocker
5. **ISSUE-004** (User index names) - Major architectural
6. **ISSUE-005** (Documentation) - Major architectural
7. **ISSUE-007** (Remove redundant schema indexes) - Moderate cleanup
8. **ISSUE-008** (Test coverage) - Moderate reliability
9. **ISSUE-009** (Vendor/Tenant verification) - Minor documentation

---

## Souq Security Issues (2025-01-20)

### ISSUE-SOUQ-001: budget-manager.ts Cross-Tenant Data Leakage

**Severity**: 🟥 BLOCKER  
**Category**: Security, Tenant Isolation  
**Status**: ✅ RESOLVED (2025-01-20)

**Description**: Ad spend caps, threshold alerts, and auto-pause logic in `services/souq/ads/budget-manager.ts` were not tenant-isolated. All methods lacked `orgId` parameter, allowing campaigns from different organizations to potentially interact.

**Resolution**: Added `orgId` parameter to all public and private methods. Redis keys now include orgId. All DB queries filter by orgId. See `docs/archived/DAILY_PROGRESS_REPORTS/2025-01-20-SECURITY-FIXES.md` for details.

---

### ISSUE-SOUQ-002: balance-service.ts Pending Orders Query Lacks orgId

**Severity**: 🟧 MAJOR  
**Category**: Security, Tenant Isolation  
**Status**: ✅ RESOLVED (2025-01-20)

**Description**: `getBalance()` and `calculateBalance()` in `services/souq/settlements/balance-service.ts` had optional orgId parameter, allowing potential cross-tenant data leakage. The pending orders query used conditional filtering `...(orgId ? { orgId } : {})`.

**Resolution**: Made orgId required (not optional). Removed conditional filtering. All queries now require orgId. See daily progress report for details.

---

### ISSUE-SOUQ-003: request-payout API Accepts Arbitrary Amounts

**Severity**: 🟧 MAJOR  
**Category**: Security, Data Integrity  
**Status**: ✅ RESOLVED (2025-01-20)

**Description**: `app/api/souq/settlements/request-payout/route.ts` accepted user-provided `amount` without validating it matched the statement's `netPayout`. This could allow malicious amount manipulation.

**Resolution**: Added validation that amount matches `statement.summary.netPayout`. Fetch statement with orgId filter. Added RBAC checks for payout requests. See daily progress report for details.

---

## Souq Security Issues (2025-12-06)

### ISSUE-SOUQ-004: balance-service.ts Writes orgId as ObjectId Instead of String

**Severity**: 🟥 BLOCKER  
**Category**: Data Integrity, Schema Consistency  
**Status**: ✅ RESOLVED (2025-12-06)

**Description**: `requestWithdrawal()` in `services/souq/settlements/balance-service.ts` (lines 896-905) was forcing `orgId` to ObjectId and throwing for non-ObjectId values, then inserting as ObjectId. This conflicted with the schema migration (`scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts`) that standardizes `orgId` to string. This caused:
- Withdrawals to fail for tenants using string org keys
- Downstream updates using string filters to miss inserted records
- Payout linkage failures and desync

**Files**:
- `services/souq/settlements/balance-service.ts`: Lines 896-905

**Resolution**: Changed to write `orgId` as string (`String(orgId)`) instead of ObjectId. Removed the ObjectId validation that was throwing errors. Kept `orgCandidates` dual-filter pattern for reads.

```typescript
// BEFORE (buggy):
const orgObjectId = ObjectId.isValid(orgId) ? new ObjectId(orgId) : null;
if (!orgObjectId) {
  throw new Error("Invalid orgId format for withdrawal; expected ObjectId");
}
await withdrawalsCollection.insertOne({ ...request, orgId: orgObjectId }, { session });

// AFTER (fixed):
const orgIdStr = String(orgId);
await withdrawalsCollection.insertOne({ ...request, orgId: orgIdStr }, { session });
```

---

### ISSUE-SOUQ-005: budget-manager.ts Redis Fails Open in Production

**Severity**: 🟧 MAJOR  
**Category**: Reliability, Budget Integrity  
**Status**: ✅ RESOLVED (2025-12-06)

**Description**: `createRedisClient()` in `services/souq/ads/budget-manager.ts` (lines 38-69) silently fell back to in-memory budget tracking when Redis was not configured. In multi-instance production deployments, this meant:
- Budget limits not shared across instances
- Auto-pause and threshold alerts not triggered reliably
- Risk of budget overspend without detection

**Files**:
- `services/souq/ads/budget-manager.ts`: Lines 38-69

**Resolution**: Now throws an error in production if Redis is not configured. Added `BUDGET_ALLOW_MEMORY_FALLBACK=true` environment variable to explicitly allow degraded mode. Test environments continue to use in-memory fallback silently.

```typescript
// BEFORE (fail-open):
if (!redisUrl && !redisHost) {
  logger.warn("[BudgetManager] Redis not configured. Falling back to in-memory...");
  return null;
}

// AFTER (fail-closed in production):
if (!redisUrl && !redisHost) {
  if (isProduction && !allowFallback) {
    throw new Error("[BudgetManager] Redis is REQUIRED for ad budget enforcement in production.");
  }
  return null;
}
```

---

### ISSUE-SOUQ-006: budget-manager.ts N+1 Query in getCampaignsBudgetSummary

**Severity**: 🟨 MINOR  
**Category**: Performance  
**Status**: ✅ RESOLVED (2025-12-06)

**Description**: `getCampaignsBudgetSummary()` in `services/souq/ads/budget-manager.ts` (lines 650-680) performed N+1 Redis calls by calling `getBudgetStatus()` for each campaign in a loop. For sellers with many campaigns, this added significant latency and Redis load.

**Files**:
- `services/souq/ads/budget-manager.ts`: Lines 650-680

**Resolution**: Replaced per-campaign `getBudgetStatus()` calls with batch Redis `mget()` for all partition keys at once. Falls back to individual calls if batch fails.

```typescript
// BEFORE (N+1):
for (const campaign of campaigns) {
  const status = await this.getBudgetStatus(campaign.campaignId, orgKey);
  budgetStatuses.push(status);
}

// AFTER (batched):
const partitionKeys = campaigns.map(c => `${this.REDIS_PREFIX}${orgKey}:${c.campaignId}:${dateKey}`);
const spentValues = await redis.mget(...partitionKeys);
for (let i = 0; i < campaigns.length; i++) {
  const spentToday = parseFloat(spentValues[i]!) || 0;
  // ... calculate status from batched value
}
```

---

### ISSUE-SOUQ-007: request-payout API Uses Plain orgId in Update Filters

**Severity**: 🟨 MINOR  
**Category**: Data Integrity, Consistency  
**Status**: ✅ RESOLVED (2025-12-06)

**Description**: `app/api/souq/settlements/request-payout/route.ts` (lines 188-189, 213-214) used plain `{ orgId }` in `updateOne()` filters instead of `{ orgId: { $in: orgCandidates } }`. This could cause updates to miss records if there was type drift between string and ObjectId.

**Files**:
- `app/api/souq/settlements/request-payout/route.ts`: Lines 188-189, 213-214

**Resolution**: Changed both update filters to use `{ orgId: { $in: orgCandidates } }` pattern for consistency with the rest of the codebase.

---

### ISSUE-SOUQ-008: getSellerProductIds Queries createdBy with String Instead of ObjectId

**Severity**: 🟥 BLOCKER  
**Category**: Correctness, Data Integrity  
**Status**: ✅ RESOLVED (2025-12-06)

**Description**: `getSellerProductIds()` in `services/souq/reviews/review-service.ts` (line 699) queried `createdBy: sellerId` using a **string** value, but the `SouqProduct` schema defines `createdBy` as `Schema.Types.ObjectId` (line 159 in `server/models/souq/Product.ts`). This caused:
- All seller product lookups to return **zero** products
- Seller review dashboards showing "no reviews" for all sellers
- Seller review stats returning empty results
- Seller response flows completely broken

**Files**:
- `services/souq/reviews/review-service.ts`: Line 699
- `server/models/souq/Product.ts`: Lines 158-163 (createdBy defined as ObjectId)

**Evidence (Before Fix)**:
```typescript
// BROKEN - sellerId is string, createdBy expects ObjectId
const products = await SouqProduct.find({
  createdBy: sellerId,  // ❌ String vs ObjectId mismatch - never matches!
  $or: [{ orgId: orgFilter }, { org_id: orgFilter }],
}).select("_id").lean();
```

**Resolution**: 
```typescript
// FIXED - Convert sellerId to ObjectId before querying
const sellerObjectId = new Types.ObjectId(sellerId);
const products = await SouqProduct.find({
  createdBy: sellerObjectId,  // ✅ ObjectId matches schema
  $or: [{ orgId: orgFilter }, { org_id: orgFilter }],
}).select("_id").lean();
```

---

### ISSUE-SOUQ-009: getSellerReviewStats Loads Unbounded Reviews Into Memory

**Severity**: 🟧 MAJOR  
**Category**: Performance, Scalability  
**Status**: ✅ RESOLVED (2025-12-06)

**Description**: `getSellerReviewStats()` in `services/souq/reviews/review-service.ts` (lines 649-669) loaded ALL published reviews into memory, sorted them in JavaScript, and computed stats in JavaScript. For high-volume sellers this could:
- Exhaust Node.js memory
- Cause endpoint timeouts
- Create poor performance for all users during stats calculation

**Files**:
- `services/souq/reviews/review-service.ts`: Lines 649-669

**Evidence (Before Fix)**:
```typescript
// INEFFICIENT - loads ALL reviews into memory
const reviews = await SouqReview.find({
  status: "published",
  productId: { $in: sellerProductIds },
  $or: [{ orgId: orgFilter }, { org_id: orgFilter }],
});  // ❌ No limit, no lean()

const totalReviews = reviews.length;
const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;  // ❌ JS calculation
const pendingResponses = reviews.filter((r) => !r.sellerResponse).length;  // ❌ JS filter
const recentReviews = reviews.sort((a, b) => ...).slice(0, 5);  // ❌ JS sort + slice
```

**Resolution**: 
```typescript
// OPTIMIZED - Use MongoDB aggregation for stats
const [stats] = await SouqReview.aggregate([
  { $match: matchStage },
  {
    $group: {
      _id: null,
      totalReviews: { $sum: 1 },
      avgRating: { $avg: "$rating" },
      pendingResponses: {
        $sum: { $cond: [{ $not: ["$sellerResponse"] }, 1, 0] },
      },
    },
  },
]);

// Use DB sort/limit for recent reviews instead of loading all
const recentReviews = await SouqReview.find(matchStage)
  .sort({ createdAt: -1 })
  .limit(5)
  .lean();
```

---

## Next Steps

1. ✅ Complete discovery and issue registration (THIS DOCUMENT)
2. ⏳ External benchmarking research (Mongoose best practices)
3. ⏳ Create detailed action plan with fix scripts
4. ⏳ Execute fixes in priority order
5. ⏳ Run verification: typecheck, lint, test, ensure-indexes
6. ⏳ Create feature branch and PR
7. ⏳ Document in daily progress report

---

**Document Owner**: Engineering Team  
**Review Cycle**: After each fix, update status and verify resolution
