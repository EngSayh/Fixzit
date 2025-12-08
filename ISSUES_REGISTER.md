# Issues Register - Fixzit Index Management System

**Last Updated**: 2025-12-08  
**Version**: 1.5  
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
**Status**: ✅ RESOLVED (2025-12-06)

**Resolution**: Property.ts already has `autoIndex: false` set (line 239) and schema-level indexes have been removed. Comment in file indicates "All Property indexes live in lib/db/collections.ts (createIndexes()) to keep a single source of truth."

**Description**:  
~~`server/models/Property.ts` defines 5 indexes via Mongoose schema (lines 246-260) that are ALSO defined manually in `lib/db/collections.ts` (lines 221-242). Same conflict pattern as ISSUE-001 and ISSUE-002.~~

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
- **2025-03-xx (local)**: Dry-run + execution completed on local fallback DB, processed=0/updated=0 (no legacy rows here). Still required in staging/prod with real data.

---

## 🟨 MINOR - Operational Monitoring (Canary)

### ISSUE-006: Ledger Sign-Validation Canary Warnings

**Severity**: 🟨 MINOR  
**Category**: Operations, Observability, Finance  
**Status**: OPEN (Canary)  

**Description**:  
Temporary warnings added in `services/souq/settlements/balance-service.ts` to log and reject mis-signed ledger transactions (debited types must be negative; releases/credits positive). Purpose is to surface any legacy callers during a canary window.

**Impact**:  
None to correctness (guards already enforce). Potential log noise if legacy callers exist.

**Recommended Actions**:  
1) Monitor logs for `[SellerBalance] Rejected transaction due to non-negative debit amount` and reserve_release warnings during canary.  
2) If no mis-signed callers by **2025-03-31**, remove/downgrade these warnings (TODOs embedded in code).  
3) If warnings appear, fix offending callers/jobs to send correctly signed amounts, then re-run canary.

**Files**:  
- `services/souq/settlements/balance-service.ts` (recordTransaction sign validation)

**Notes**:  
- Warnings are tagged with sellerId/orgId and optional correlationId (requestId/payoutId) for triage.  
- No further code changes needed once callers are clean; remove warnings after target date.

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

**Resolution**: Imported `PAYOUT_CONFIG` from settlement-config.ts into balance-service.ts. Replaced hardcoded `WITHDRAWAL_HOLD_DAYS = 7` and `minimumWithdrawal = 500` with centralized config values.

**UPDATE (2025-12-06)**: Extended fix to `settlement-calculator.ts` which had a separate `FEE_CONFIG.holdPeriodDays = 14` that conflicted with `PAYOUT_CONFIG.holdPeriodDays = 7`. Now uses getter to reference centralized config.

**Description**:  
`balance-service.ts` and `settlement-calculator.ts` had hardcoded hold period values, while `settlement-config.ts` defined these in `PAYOUT_CONFIG`. If values were changed in one place, the others would drift, causing inconsistent validation between withdrawal requests, settlement eligibility, and payout processing.

**Files**:  
- `services/souq/settlements/balance-service.ts`: Line 20 (WITHDRAWAL_HOLD_DAYS)
- `services/souq/settlements/settlement-calculator.ts`: Line 26 (FEE_CONFIG.holdPeriodDays) - **now uses getter**
- `services/souq/settlements/settlement-config.ts`: Lines 10-11 (PAYOUT_CONFIG.holdPeriodDays, minimumAmount)

**Root Cause**:  
Initial implementation duplicated constants without cross-referencing the centralized config.

**Impact**:
- Risk of validation drift (e.g., settlement uses 14 days but payout uses 7 days)
- Maintenance burden when changing thresholds
- Potential for orders to be "eligible" for settlement but not for payout

**Fix Applied**:
```typescript
// settlement-calculator.ts - now uses getter to reference centralized config
import { PAYOUT_CONFIG } from "./settlement-config";

const FEE_CONFIG = {
  // ...other config...
  get holdPeriodDays() {
    return PAYOUT_CONFIG.holdPeriodDays;
  },
  minimumPayoutThreshold: PAYOUT_CONFIG.minimumAmount,
} as const;
```

---

### ISSUE-008: Missing Souq Collection Constants and Indexes

**Severity**: 🟧 MAJOR  
**Category**: Correctness, Data Integrity, Security  
**Status**: ✅ RESOLVED (2025-01-21)

**Resolution**: Added 10 missing Souq collection constants to `lib/db/collections.ts` and created comprehensive org-scoped indexes for all. Also fixed a TypeScript error in payout-processor.ts.

**Description**:  
Multiple Souq collections were used throughout the codebase via hardcoded strings (e.g., `db.collection("souq_sellers")`) but were NOT defined in the `COLLECTIONS` constant in `lib/db/collections.ts`. This meant:

1. No TypeScript type safety for collection names
2. No indexes created by `createIndexes()` for these collections
3. Missing org-scoping indexes = potential tenant isolation gaps
4. Risk of typos in collection names going unnoticed

**Missing Collections Found**:
| Collection | Usage Count | Impact |
|------------|-------------|--------|
| `souq_sellers` | 20+ | Critical - seller profiles |
| `souq_products` | 15+ | Critical - product catalog |
| `souq_transactions` | 6+ | Critical - ledger |
| `souq_ad_bids` | 10+ | Campaign bidding |
| `souq_ad_events` | 5+ | Ad tracking |
| `souq_ad_stats` | 5+ | Performance stats |
| `souq_ad_daily_spend` | 2+ | Daily spend tracking |
| `souq_payout_batches` | 2+ | Batch processing |
| `souq_settlement_statements` | 2+ | Statement tracking |
| `souq_withdrawals` | 2+ | Withdrawal requests |

**Files**:
- `lib/db/collections.ts`: Lines 68-95 (COLLECTIONS constant)
- `lib/db/collections.ts`: Lines 955-1095 (createIndexes function)
- `services/souq/settlements/payout-processor.ts`: Line 199 (TypeScript fix)

**Root Cause**:  
Incremental feature development added new collections without updating the central registry.

**Fix Applied**:
```typescript
// Added to COLLECTIONS constant:
SOUQ_SELLERS: "souq_sellers",
SOUQ_PRODUCTS: "souq_products",
SOUQ_TRANSACTIONS: "souq_transactions",
SOUQ_SETTLEMENT_STATEMENTS: "souq_settlement_statements",
SOUQ_WITHDRAWALS: "souq_withdrawals",
SOUQ_PAYOUT_BATCHES: "souq_payout_batches",
SOUQ_AD_BIDS: "souq_ad_bids",
SOUQ_AD_EVENTS: "souq_ad_events",
SOUQ_AD_STATS: "souq_ad_stats",
SOUQ_AD_DAILY_SPEND: "souq_ad_daily_spend",

// Added org-scoped indexes for each with:
// - Unique ID indexes with partialFilterExpression
// - Query optimization indexes (orgId + sellerId, status, etc.)
// - TTL index on souq_ad_events (90 days)
```

**Additional Fix**:
```typescript
// payout-processor.ts line 199 - extract orgIdStr from normalizeOrgId
const { orgIdStr, orgCandidates } = normalizeOrgId(orgId);
// Previously only extracted orgCandidates but used orgIdStr on line 267
```

---

## 🟧 MAJOR - Architectural Issues

### ISSUE-004: User Model Indexes Without Explicit Names

**Severity**: 🟧 MAJOR  
**Category**: Architecture, Maintainability  
**Status**: ✅ RESOLVED (2025-12-07)

**Resolution**:
- Added explicit names to all 11 User schema indexes following convention (`users_orgId_email_unique`, `users_orgId_role`, etc.)
- Added `autoIndex: false` to User schema options
- Created comprehensive documentation: `docs/architecture/DATABASE_INDEX_ARCHITECTURE.md`

**Description**:  
`server/models/User.ts` defines 11 indexes via Mongoose schema - now all with explicit names following project conventions.

**Files**:
- `server/models/User.ts`: Lines 238-261 (11 schema indexes with explicit names ✅)
- `lib/db/collections.ts`: No User indexes (schema-driven approach for this model)
- `lib/db/index.ts`: User not needed in modelIndexTargets - managed by schema

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
**Status**: ✅ RESOLVED (2025-12-07)

**Resolution**:
- Created comprehensive architecture documentation: `docs/architecture/DATABASE_INDEX_ARCHITECTURE.md`
- Document explains:
  - When to use Manual Native Driver vs Mongoose Schema approach
  - Index naming conventions
  - Multi-tenancy requirements (STRICT v4.1)
  - Prevention of IndexOptionsConflict errors
  - Migration path from dual-defined to single-source
  - Adding new indexes to the appropriate location

**Description**:  
The codebase uses TWO approaches for index management - now **fully documented** in the architecture documentation.

---

### ISSUE-006: Missing `autoIndex: false` in Schema Options

**Severity**: 🟧 MAJOR  
**Category**: Correctness, Performance  
**Status**: ✅ RESOLVED (2025-12-07)

**Resolution**:
All major models now have `autoIndex: false` set:
- `server/models/WorkOrder.ts`: ✅ Has `autoIndex: false`
- `server/models/marketplace/Product.ts`: ✅ Has `autoIndex: false`
- `server/models/Property.ts`: ✅ Has `autoIndex: false`
- `server/models/User.ts`: ✅ Added `autoIndex: false` (2025-12-07)

**Description**:  
All models with schema-defined indexes now properly configured with `autoIndex: false`.
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

### ISSUE-SOUQ-010: $or Key Collision Bypasses Tenant Isolation in updateOrderStatus

**Severity**: 🟥 CRITICAL (Security)
**Category**: Security, Correctness
**Status**: ✅ RESOLVED (2025-01-20)

**Description**:
In `refund-processor.ts`, the `updateOrderStatus` method was spreading `buildOrgFilter(orgId)` 
(which returns `{ $or: [...] }`) and then adding another `$or` key for order ID matching. 
Due to JavaScript object spread behavior, the second `$or` key was **overwriting** the first one,
completely bypassing tenant isolation.

**Files**:
- `services/souq/claims/refund-processor.ts`: Line 879

**Evidence**:
```typescript
// BROKEN - Second $or overwrites first one, no tenant filter!
await db.collection('souq_orders').updateOne(
  { ...buildOrgFilter(orgId), $or: orderIdFilters },  // ← buildOrgFilter.$or gets overwritten
  { $set: { status, ... } }
);

// Actually produces this filter (NO tenant isolation):
{ $or: [{ orderId: "ORD-1" }] }  // orgId filter is GONE!
```

**Root Cause**:
When you spread an object containing `$or` and then add another `$or` property, the second 
`$or` overwrites the first one. This is standard JavaScript object behavior but creates a 
critical security vulnerability when the org filter is silently discarded.

**Impact**:
- **CRITICAL SECURITY**: Refund order status updates could affect ANY organization's orders
- Tenant data could be modified across organization boundaries
- Complete bypass of STRICT v4.1 tenant isolation

**Resolution**:
```typescript
// FIXED - Use $and to combine both $or clauses
const orgFilter = buildOrgFilter(orgId);
await db.collection('souq_orders').updateOne(
  { $and: [orgFilter, { $or: orderIdFilters }] },
  { $set: { status, ... } }
);
```

**Related Test Update**:
- `tests/services/claims-refund-processor.test.ts`: Updated expectations to match new $and structure

---

## Next Steps

1. ✅ Complete discovery and issue registration (THIS DOCUMENT)
2. ✅ External benchmarking research (Mongoose best practices)
3. ✅ Create detailed action plan with fix scripts
4. ✅ Execute fixes in priority order
5. ✅ Run verification: typecheck, lint, test, ensure-indexes
6. ⏳ Create feature branch and PR
7. ⏳ Document in daily progress report

---

## Issues Fixed (2025-12-07 Audit)

### ISSUE-011: z.any() Type Safety Bypass in Zod Schemas

**Severity**: 🟧 MAJOR  
**Category**: Type Safety, Security  
**Status**: ✅ RESOLVED (2025-12-07)

**Resolution**: Replaced `z.any()` with properly typed Zod schemas in 5 API routes.

**Files Fixed**:
- `app/api/billing/subscribe/route.ts` - items array now matches QuoteItem interface
- `app/api/contracts/route.ts` - SLA schema properly typed as string to match model
- `app/api/finance/expenses/[id]/route.ts` - lineItems with proper expense structure + refinement
- `app/api/rfqs/route.ts` - specifications nested object properly typed
- `app/api/marketplace/products/route.ts` - specs record with union value types

**Impact**: Eliminates type safety bypass, improves validation, better IDE support.

---

### ISSUE-012: Deprecated FM Notification Engine (Dead Code)

**Severity**: 🟩 MINOR  
**Category**: Code Quality, Maintenance  
**Status**: ✅ RESOLVED (2025-12-07)

**Resolution**: Removed 1189 lines of deprecated dead code.

**Files Removed**:
- `services/notifications/fm-notification-engine.ts`
- Updated `services/README.md` to remove references

**Notes**: File was marked deprecated since 2025-12-01 with TODO to remove. Verified no imports via grep. The canonical system is `lib/fm-notifications.ts`.

---

## 🟧 MAJOR - Hardcoded Values System-Wide Audit

### ISSUE-013: Hardcoded Hex Colors (125+ instances)

**Severity**: 🟧 MAJOR  
**Category**: UX, Maintainability, Theme  
**Status**: 🔄 IDENTIFIED

**Description**:  
System-wide scan found 125+ instances of hardcoded hex color values in production code. These should use Tailwind theme tokens or CSS variables for consistency and theme switching capability.

**Key Locations**:
- `middleware.ts:294` - `#0061A8` (Business.sa primary in CSP HTML)
- `app/api/organization/settings/route.ts:57-81` - `#B46B2F`, `#D68B4A` (legacy brown theme defaults)
- `app/api/settings/logo/route.ts:34-49` - `#3b82f6` (blue default)
- `app/api/auth/verify/send/route.ts` - Email template colors (`#0070f3`, `#00c4cc`, `#333`, `#666`, `#999`, `#f9f9f9`)
- `app/api/auth/signup/route.ts` - Email template colors (same pattern)
- `app/api/auth/forgot-password/route.ts` - Email template colors (`#dc2626`, `#f97316`)
- `app/api/jobs/process/route.ts` - Invite email template colors
- `app/global-error.tsx` - Inline styles (`#f8f9fa`, `#1a1a1a`, `#dc2626`, `#0061A8`) - **ACCEPTABLE** (fallback for CSS failures)
- `server/models/PlatformSettings.ts:51` - `#3b82f6` default value
- `server/services/ats/offer-pdf.ts:26` - `#0061A8` (PDF header)
- `components/seller/analytics/TrafficAnalytics.tsx:59` - Chart color array

**Impact**: 
- Cannot switch themes without code changes
- Inconsistent brand colors across system
- Legacy brown theme colors still present after Business.sa rebrand

**Recommended Fix**:
1. Create `lib/config/brand-colors.ts` with centralized color constants
2. Update email templates to use configurable colors
3. Remove legacy brown theme defaults (`#B46B2F`, `#D68B4A`)
4. Update PDF generation to use brand constants

---

### ISSUE-014: Hardcoded Domain/Email References (100+ instances)

**Severity**: 🟧 MAJOR  
**Category**: Maintainability, Configuration  
**Status**: 🔄 IDENTIFIED

**Description**:  
System contains 100+ hardcoded references to `fixzit.co`, `fixzit.com`, `fixzit.sa`, `fixzit.app` domains and email addresses. These should be environment-driven for multi-tenant/white-label capability.

**Key Locations**:
- `app/api/auth/otp/send/route.ts:47-64` - 18 demo user emails (`superadmin@fixzit.co`, `admin@fixzit.co`, etc.)
- `app/api/feeds/indeed/route.ts:31-107` - `https://fixzit.co` fallback URLs
- `app/api/support/welcome-email/route.ts:100-101` - `support@fixzit.com`, `https://fixzit.com/help`
- `app/api/billing/upgrade/route.ts:310` - `sales@fixzit.app`
- `app/global-error.tsx:194` - `support@fixzit.co`
- `auth.config.ts:538-542` - Demo user email list
- `config/sendgrid.config.ts:54` - `noreply@fixzit.co`
- `server/services/escalation.service.ts:51,92` - `support@fixzit.sa`, `support@fixzit.co`
- `lib/config/constants.ts:272-273` - `noreply@fixzit.sa`, `support@fixzit.sa`
- `lib/security/cors-allowlist.ts:6-11` - 6 fixzit.co domains
- `lib/integrations/notifications.ts:333,376,397` - `https://fixzit.co` links

**Multiple Domain Inconsistency**:
- `.co` - Used in most places
- `.com` - Used in support/help contexts
- `.sa` - Used in email/notifications
- `.app` - Used in billing/legal

**Impact**:
- Domain inconsistency confuses users
- Cannot white-label the platform
- Configuration changes require code changes

**Recommended Fix**:
1. Create `lib/config/domains.ts` with centralized domain configuration
2. All domains should derive from `process.env.NEXT_PUBLIC_BASE_URL`
3. Email domains should derive from `process.env.EMAIL_DOMAIN`
4. Consolidate to single primary domain (Business.sa rebrand)

---

### ISSUE-015: Hardcoded Phone Numbers (50+ instances)

**Severity**: 🟨 MODERATE  
**Category**: Maintainability, Configuration  
**Status**: 🔄 PARTIALLY RESOLVED (2025-12-07)

**Partial Resolution**: Fixed the critical issue - wrong country code in privacy page (+971 UAE → +966 Saudi). Other hardcoded phones remain for future cleanup.

**Description**:  
System contains 50+ hardcoded Saudi phone numbers (`+966XXXXXXXXX`). Some are placeholders, some are demo data, some are in production API defaults.

**Key Locations**:
- `app/settings/page.tsx:130` - `+966 50 123 4567` (form default)
- `app/privacy/page.tsx:36` - ~~`+971 XX XXX XXXX` (wrong country code!)~~ ✅ FIXED → `+966 XX XXX XXXX`
- `app/fm/page.tsx:77,89,101` - Mock contact numbers
- `app/fm/finance/invoices/page.tsx:706` - `+966 11 123 4567`
- `app/api/payments/create/route.ts:133` - `+966500000000` fallback
- `app/api/support/welcome-email/route.ts:102` - `+966 50 123 4567`
- `scripts/seed-demo-users.ts:14-20` - `+966552233456` (demo user phone)
- `lib/config/constants.ts:301` - `+966 XX XXX XXXX` placeholder

**Impact**:
- Placeholder phones may accidentally be used in production
- Inconsistent phone formatting across UI
- ~~Wrong country code in privacy page (+971 UAE instead of +966 Saudi)~~ ✅ FIXED

**Recommended Fix**:
1. Replace placeholders with configurable values from environment
2. ~~Fix privacy page country code (UAE → Saudi)~~ ✅ DONE
3. Create `lib/config/contact.ts` for company contact info
4. All demo phones should be in scripts/ only, not in UI components

---

### ISSUE-016: Demo Passwords Exposed in Components (SECURITY)

**Severity**: 🟥 CRITICAL (Security)  
**Category**: Security  
**Status**: ✅ RESOLVED (2025-12-07)

**Resolution**: Added environment-based gating to `DemoCredentialsSection.tsx`:
- Added `SHOW_DEMO_CREDS` constant checking `NODE_ENV === 'development'` OR `NEXT_PUBLIC_SHOW_DEMO_CREDS === 'true'`
- Component returns null if demo creds are disabled
- Credential arrays are conditionally defined to enable tree-shaking in production builds

**Description**:  
Production components contain hardcoded demo passwords that are visible to all users. While demo credentials may be intentional, exposing them in production components is a security risk.

**Key Location**:
- `components/auth/DemoCredentialsSection.tsx` - Contains 7 demo users with passwords (`admin123`, `password123`)

**Evidence**:
```typescript
// components/auth/DemoCredentialsSection.tsx:20-54
{ email: "superadmin@fixzit.co", password: "admin123" }
{ email: "admin@fixzit.co", password: "password123" }
{ email: "manager@fixzit.co", password: "password123" }
// ... 4 more
```

**Impact**:
- Demo passwords visible in production bundle
- Easy target for automated credential scanning
- Creates security audit findings

**Recommended Fix**:
1. Gate `DemoCredentialsSection` behind `process.env.NODE_ENV === 'development'`
2. Or use environment variable: `process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS === 'true'`
3. Never include passwords in production builds
4. Demo users should use OTP login only in production

---

### ISSUE-017: Legacy Brown Theme Colors Still Present

**Severity**: 🟧 MAJOR  
**Category**: UX, Theme  
**Status**: ✅ RESOLVED (2025-12-07)

**Resolution**: Updated all organization settings defaults from legacy brown (`#B46B2F`, `#D68B4A`) to Business.sa blue (`#0061A8`, `#1a365d`). Created centralized brand colors in `lib/config/brand-colors.ts`.

**Description**:  
Despite Business.sa rebrand to blue theme (`#0061A8`), legacy brown/amber theme colors (`#B46B2F`, `#D68B4A`) still exist in organization settings defaults.

**Key Location**:
- `app/api/organization/settings/route.ts:57-81`

**Evidence**:
```typescript
// Lines 57-81 contain legacy brown colors as defaults
primaryColor: "#B46B2F",
accentColor: "#D68B4A",
```

**Impact**:
- New organizations may get wrong default theme
- Inconsistent with Business.sa branding
- Confuses brand identity

**Recommended Fix**:
1. Update defaults to Business.sa blue: `#0061A8`
2. Create migration to update existing orgs (optional)
3. Document approved brand colors in `lib/config/brand-colors.ts`

---

### ISSUE-018: Hardcoded Currency "SAR" in UI Components

**Severity**: 🟨 MODERATE  
**Category**: i18n, Localization  
**Status**: 🔄 IDENTIFIED

**Description**:  
System has hardcoded "SAR" currency in 40+ UI components. While SAR is the primary currency, this prevents proper multi-currency support.

**Key Locations**:
- `app/fm/work-orders/history/page.tsx:23,34,45,189` - `"SAR 150"`, `"SAR 300"`, etc.
- `app/fm/work-orders/approvals/page.tsx:22-69` - Multiple `"SAR X,XXX"` strings
- `app/fm/invoices/new/page.tsx:215` - `"Amount (SAR)"`
- `app/fm/projects/page.tsx:458,527` - Currency defaults
- `app/fm/marketplace/` - Multiple files with hardcoded SAR

**Impact**:
- Cannot easily support multi-currency
- Currency context (CurrencyContext.tsx) exists but not used everywhere
- Hard to expand to other GCC markets

**Recommended Fix**:
1. Use `CurrencyContext` throughout for formatting
2. Replace hardcoded strings with `formatCurrency(amount, currency)` calls
3. Mock data should use currency from context
4. Forms should allow currency selection

---

### ISSUE-019: Missing Webhook Signature Verification (Carrier Tracking)

**Severity**: 🟥 CRITICAL  
**Category**: Security  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The carrier tracking webhook endpoint (`app/api/webhooks/carrier/tracking/route.ts`) had commented-out signature verification code, allowing anyone to send fake tracking updates.

**Resolution**:
- Implemented HMAC-SHA256 signature verification with timing-safe comparison
- Added Zod validation schema for request body
- Added carrier-specific webhook secrets configuration
- Required orgId field for tenant isolation

**Files**:
- `app/api/webhooks/carrier/tracking/route.ts`: Complete security overhaul

---

### ISSUE-020: Missing Rate Limiting on Vendor Application Endpoint

**Severity**: 🟧 MAJOR  
**Category**: Security  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The vendor application endpoint (`app/api/vendor/apply/route.ts`) had no rate limiting, allowing unlimited form spam and potential DoS attacks. Also logged full PII in production.

**Resolution**:
- Added rate limiting: 5 requests per minute per IP
- Added comprehensive Zod validation schema
- Sanitized PII logging (only partial name, email domain)
- Proper phone number format validation

**Files**:
- `app/api/vendor/apply/route.ts`: Added rate limiting and validation

---

### ISSUE-021: Missing Rate Limiting on i18n Locale Endpoint

**Severity**: 🟨 MODERATE  
**Category**: Security  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The i18n locale preference endpoint (`app/api/i18n/route.ts`) had no rate limiting, allowing cookie manipulation at scale.

**Resolution**:
- Added rate limiting: 30 requests per minute per IP
- Updated OpenAPI documentation to include 429 response

**Files**:
- `app/api/i18n/route.ts`: Added rate limiting

---

### ISSUE-022: Missing Tenant Isolation in Withdrawal Balance Check

**Severity**: 🟧 MAJOR  
**Category**: Security, Tenant Isolation  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `checkSellerBalance` method in `WithdrawalService` queried `souq_settlement_statements` without an `orgId` filter. A seller in one org could potentially check/exploit balance data from another org if `sellerId` values overlapped.

**Resolution**:
- Added `orgId` to `WithdrawalRequest` interface
- Added `orgId` to `Withdrawal` interface  
- Updated `checkSellerBalance` to require and use `orgId` in query
- Updated `createWithdrawalRecord` to include `orgId`
- Added orgId to audit logs

**Files**:
- `services/souq/settlements/withdrawal-service.ts`: Complete tenant isolation fix

---

### ISSUE-023: Floating Point Arithmetic for Financial Calculations

**Severity**: 🟧 MAJOR  
**Category**: Data Integrity, Financial Security  
**Status**: 🔄 IDENTIFIED

**Description**:  
Fee calculations in multiple services use JavaScript native floating-point arithmetic followed by `toFixed()`. This can accumulate rounding errors in high-volume scenarios. Example: `100.03 * 0.1` could result in values like `10.000000001`.

**Key Locations**:
- `services/souq/marketplace-fee-service.ts`: Lines 304-335
- `services/souq/seller-balance-service.ts`: Lines 263, 350, 548-551, 721, 740

**Impact**:
- Cumulative floating-point errors in high-transaction scenarios
- Balance discrepancies between calculated and actual amounts
- Potential financial auditing issues

**Recommended Fix**:
1. Use `Decimal128` MongoDB type with `decimal.js` for calculations
2. Store all monetary values in minor units (cents/halalas) as integers
3. Follow pattern already used in `lib/payments/currencyUtils.ts`

---

### ISSUE-024: Debug Console.log in Claims/Refund Services

**Severity**: 🟨 MODERATE  
**Category**: Logging Security  
**Status**: ⚠️ ACCEPTABLE RISK

**Description**:  
Debug console.log statements exist in:
- `services/souq/claims/claim-service.ts`: Lines 337, 371
- `services/souq/claims/refund-processor.ts`: Line 921

These are guarded by specific test environment variables (`DEBUG_CLAIM_TEST`, `DEBUG_REFUND_TEST`) and have eslint-disable comments.

**Assessment**:
- Risk is LOW because env vars are never set in production
- Useful for debugging during development
- Already has eslint-disable comments indicating intentional usage

**Action**: No changes needed. Documented for awareness.

---

### ISSUE-025: Missing Rate Limiting on Aqar Chatbot Endpoint

**Severity**: 🟧 MAJOR  
**Category**: API Security, DoS Prevention  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/aqar/support/chatbot` endpoint was a public POST endpoint without rate limiting, making it vulnerable to DoS attacks. It also lacked proper input validation.

**Files**:
- `app/api/aqar/support/chatbot/route.ts`

**Fix Applied**:
- Added `smartRateLimit` with 30 requests/minute per IP
- Added Zod schema for input validation with max length (2000 chars)

**Commit**: cb615d96a

---

### ISSUE-026: Missing Rate Limiting on Aqar Listings Search

**Severity**: 🟧 MAJOR  
**Category**: API Security, DoS Prevention  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/aqar/listings/search` endpoint was a public GET endpoint without rate limiting, vulnerable to DoS via expensive Atlas Search queries.

**Files**:
- `app/api/aqar/listings/search/route.ts`

**Fix Applied**:
- Added `smartRateLimit` with 60 requests/minute per IP

**Commit**: cb615d96a

---

### ISSUE-027: Mass Assignment in Admin Benchmark Route

**Severity**: 🟨 MODERATE  
**Category**: API Security  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/admin/billing/benchmark/[id]` PATCH endpoint passed request body directly to `findByIdAndUpdate`, allowing modification of any field including protected ones like `_id`, `createdAt`.

**Files**:
- `app/api/admin/billing/benchmark/[id]/route.ts`

**Fix Applied**:
- Added field whitelisting for allowed fields
- Only `name`, `description`, `category`, `value`, `unit`, `metadata`, `isActive` can be updated

**Commit**: 527e3b597

---

### ISSUE-028: Mass Assignment in Admin PriceBook Route

**Severity**: 🟨 MODERATE  
**Category**: API Security  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/admin/billing/pricebooks/[id]` PATCH endpoint passed request body directly to `findByIdAndUpdate`, allowing modification of any field.

**Files**:
- `app/api/admin/billing/pricebooks/[id]/route.ts`

**Fix Applied**:
- Added field whitelisting for allowed fields
- Only `name`, `description`, `prices`, `currency`, `effectiveDate`, `expiryDate`, `isActive`, `metadata` can be updated

**Commit**: 527e3b597

---

### ISSUE-029: IBAN Exposed in Withdrawal Service Logs

**Severity**: 🟧 MAJOR  
**Category**: Logging Security, PII Protection  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The withdrawal service was logging full IBAN values when checksum validation failed, exposing sensitive financial data in logs.

**Files**:
- `services/souq/settlements/withdrawal-service.ts`

**Fix Applied**:
- Redact IBAN in logs (show first 4 + last 4 characters only)

**Commit**: 59ac92547

---

### ISSUE-030: Phone Number Exposed in OTP Logs

**Severity**: 🟧 MAJOR  
**Category**: Logging Security, PII Protection  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The OTP send route was logging full phone numbers when validation failed, exposing PII in logs.

**Files**:
- `app/api/auth/otp/send/route.ts`

**Fix Applied**:
- Redact phone number in logs (show last 4 digits only)

**Commit**: 59ac92547

---

### ISSUE-031: Cross-Tenant Header Spoofing in Marketplace Context

**Severity**: 🟥 CRITICAL  
**Category**: Security, Tenant Isolation  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `resolveMarketplaceContext()` function in `lib/marketplace/context.ts` accepted `x-org-id` and `x-tenant-id` HTTP headers even for authenticated users, allowing attackers to spoof their organization and access data from other tenants. An attacker could send `x-org-id: victim-org-id` header to access checkout, orders, RFQs from any organization.

**Files**:
- `lib/marketplace/context.ts`

**Impact**:
- Cross-tenant data access
- Potential financial fraud (accessing other org's orders/payments)
- Complete tenant isolation bypass for all marketplace routes

**Fix Applied**:
- Authenticated users MUST use orgId from their JWT token
- Headers only accepted for unauthenticated public browsing
- Token claims take priority over headers

---

### ISSUE-032: Spoofable x-user Header in Projects Route

**Severity**: 🟥 CRITICAL  
**Category**: Security, Authentication Bypass  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/projects` route parsed `x-user` header for authentication, which can be trivially spoofed. Attackers could set `x-user: {"id":"attacker","orgId":"target"}` to create/read projects in any organization.

**Files**:
- `app/api/projects/route.ts`

**Fix Applied**:
- `x-user` header only parsed in NODE_ENV=test (for Playwright)
- Production uses `getSessionUser()` for proper authentication
- Backwards compatible with existing tests

---

### ISSUE-033: Copilot Webhook Secret Optional (Fail-Open)

**Severity**: 🟧 MAJOR  
**Category**: Security, Authentication  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/copilot/knowledge` POST endpoint checked `COPILOT_WEBHOOK_SECRET` but if the env var was not set, the check was bypassed entirely. This is "fail-open" security - attackers could inject arbitrary knowledge documents if the secret wasn't configured.

**Files**:
- `app/api/copilot/knowledge/route.ts`

**Fix Applied**:
- Webhook secret is now REQUIRED
- Returns 503 "Webhook not configured" if secret is missing
- "Fail-closed" security pattern

---

### ISSUE-034: Organization Settings Returns First Org Without Auth

**Severity**: 🟧 MAJOR  
**Category**: Security, Information Disclosure  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/organization/settings` endpoint returned the FIRST organization's branding (name, logo, colors) without any authentication or tenant context. This leaked org branding from org A to org B.

**Files**:
- `app/api/organization/settings/route.ts`

**Fix Applied**:
- Uses `getSessionUser()` to get authenticated user's orgId
- Returns user's org branding, not arbitrary first org
- Unauthenticated requests get default branding only

---

### ISSUE-035: Trial Request Route Missing Rate Limiting

**Severity**: 🟨 MODERATE  
**Category**: Security, DoS Prevention  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/trial-request` public POST endpoint had no rate limiting, vulnerable to spam and DoS attacks.

**Files**:
- `app/api/trial-request/route.ts`

**Fix Applied**:
- Added rate limiting: 3 requests/minute per IP

---

### ISSUE-036: Trial Request Route Logs PII

**Severity**: 🟧 MAJOR  
**Category**: Logging Security, PII Protection  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The trial request route was logging user PII (name, email, phone, message) which is a compliance violation.

**Files**:
- `app/api/trial-request/route.ts`

**Fix Applied**:
- Removed PII from logs (only company and plan logged now)

---

### ISSUE-037: Souq Search Route Missing Rate Limiting

**Severity**: 🟨 MODERATE  
**Category**: Security, DoS Prevention  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/souq/search` public search endpoint had no rate limiting, vulnerable to DoS via expensive Meilisearch queries.

**Files**:
- `app/api/souq/search/route.ts`

**Fix Applied**:
- Added rate limiting: 120 requests/minute per IP

---

### ISSUE-038: Public Footer Route Missing Rate Limiting

**Severity**: 🟩 MINOR  
**Category**: Security, DoS Prevention  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/public/footer/[page]` endpoint had no rate limiting. While low risk due to simple DB queries, rate limiting prevents abuse.

**Files**:
- `app/api/public/footer/[page]/route.ts`

**Fix Applied**:
- Added rate limiting: 60 requests/minute per IP

---

### ISSUE-039: Support Welcome Email Route Missing Authentication

**Severity**: 🟥 CRITICAL  
**Category**: Security, Authentication Bypass  
**Status**: ✅ RESOLVED (2025-12-08)

**Description**:  
The `/api/support/welcome-email` endpoint had NO authentication. Any attacker could call this endpoint with any email address to send welcome emails, potentially:
1. Using the system as an email spamming tool
2. Draining email service credits (SendGrid/Resend)
3. Reputation damage (emails marked as spam)
4. Social engineering by sending official-looking emails

**Files**:
- `app/api/support/welcome-email/route.ts`

**Root Cause**:  
Route was designed as an internal service endpoint but lacked any authentication mechanism.

**Fix Applied**:
- Added `INTERNAL_API_SECRET` header check
- Requests without valid secret return 401 Unauthorized
- Internal services must include `x-internal-secret` header

**Code Change**:
```typescript
export async function POST(request: NextRequest) {
  // Require internal API secret for security
  const internalSecret = request.headers.get("x-internal-secret");
  if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of handler
}
```

---

**Document Owner**: Engineering Team  
**Review Cycle**: After each fix, update status and verify resolution
