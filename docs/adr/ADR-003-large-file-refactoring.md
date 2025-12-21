# Large File Refactoring Analysis

**Date:** 2025-12-20  
**Context:** Production Readiness - Non-blocking, incremental improvements

## Executive Summary

Analysis of Fixzit codebase identified **15 files exceeding 1000 lines** that could benefit from incremental refactoring. These are categorized by priority based on:
- Frequency of changes (hot files)
- Cognitive load for developers
- Bundle size impact

## Files Requiring Attention

### Priority 1: High Impact (>1500 lines, frequently modified)

| File | Lines | Issue | Refactoring Strategy |
|------|-------|-------|---------------------|
| [domain/fm/fm.behavior.ts](../domain/fm/fm.behavior.ts) | 2,074 | Monolithic domain logic | Split into: work-order.behavior.ts, vendor.behavior.ts, maintenance.behavior.ts |
| [app/(fm)/dashboard/hr/recruitment/page.tsx](../app/(fm)/dashboard/hr/recruitment/page.tsx) | 1,615 | Large React component | Extract: RecruitmentTable, CandidateFilters, InterviewScheduler components |
| [services/souq/returns-service.ts](../services/souq/returns-service.ts) | 1,576 | Multiple responsibilities | Split into: rma-service.ts, refund-service.ts, inspection-service.ts |

### Priority 2: Medium Impact (1200-1500 lines)

| File | Lines | Issue | Refactoring Strategy |
|------|-------|-------|---------------------|
| [app/(fm)/admin/route-metrics/page.tsx](../app/(fm)/admin/route-metrics/page.tsx) | 1,471 | Complex dashboard | Extract chart components, use custom hooks |
| [services/souq/settlements/balance-service.ts](../services/souq/settlements/balance-service.ts) | 1,423 | Dense business logic | Extract validators, create BalanceCalculator class |
| [lib/db/collections.ts](../lib/db/collections.ts) | 1,413 | Too many collection defs | Group by domain: fm-collections, souq-collections, etc. |
| [lib/graphql/index.ts](../lib/graphql/index.ts) | 1,375 | Single schema file | Split by domain: fm.graphql, souq.graphql |
| [components/fm/WorkOrdersView.tsx](../components/fm/WorkOrdersView.tsx) | 1,339 | Complex list view | Extract: WorkOrderRow, WorkOrderFilters, WorkOrderActions |
| [app/(fm)/fm/finance/expenses/new/page.tsx](../app/(fm)/fm/finance/expenses/new/page.tsx) | 1,295 | Large form | Extract: ExpenseForm, AttachmentUploader, ApprovalWorkflow |
| [app/(fm)/administration/page.tsx](../app/(fm)/administration/page.tsx) | 1,284 | Admin dashboard | Extract tab components |
| [services/souq/claims/refund-processor.ts](../services/souq/claims/refund-processor.ts) | 1,260 | Processing pipeline | Use strategy pattern for refund methods |
| [app/superadmin/issues/page.tsx](../app/superadmin/issues/page.tsx) | 1,222 | Issue management | Extract: IssueTable, IssueFilters, BulkActions |
| [app/(fm)/fm/finance/payments/new/page.tsx](../app/(fm)/fm/finance/payments/new/page.tsx) | 1,192 | Payment form | Extract: PaymentMethodSelector, VendorSearch |

### Priority 3: Monitor (1000-1200 lines)

| File | Lines | Issue | Refactoring Strategy |
|------|-------|-------|---------------------|
| [domain/fm/fm.types.ts](../domain/fm/fm.types.ts) | 1,159 | Type definitions | Consider splitting by entity |
| [app/(app)/login/page.tsx](../app/(app)/login/page.tsx) | 1,159 | Auth page | Extract: LoginForm, SocialLogins, OTPVerification |
| [app/(fm)/finance/invoices/new/page.tsx](../app/(fm)/finance/invoices/new/page.tsx) | 1,152 | Invoice form | Extract: LineItemEditor, TaxCalculator, Preview |
| [components/TopBar.tsx](../components/TopBar.tsx) | 1,110 | Navigation | Extract: UserMenu, NotificationBell, LanguageSwitcher |
| [app/api/auth/otp/send/route.ts](../app/api/auth/otp/send/route.ts) | 1,098 | OTP handling | Extract: rate limiting, SMS provider abstraction |

## Refactoring Guidelines

### For React Components (>500 lines)
```typescript
// BEFORE: Monolithic component
export function WorkOrdersView() {
  // 1300+ lines of mixed concerns
}

// AFTER: Composable components
export function WorkOrdersView() {
  return (
    <WorkOrdersProvider>
      <WorkOrderFilters />
      <WorkOrderTable>
        {workOrders.map(wo => <WorkOrderRow key={wo.id} workOrder={wo} />)}
      </WorkOrderTable>
      <WorkOrderPagination />
    </WorkOrdersProvider>
  );
}
```

### For Service Files (>500 lines)
```typescript
// BEFORE: Single service with multiple concerns
export class ReturnsService {
  initiateReturn() { ... }
  processInspection() { ... }
  calculateRefund() { ... }
  notifySeller() { ... }
}

// AFTER: Single responsibility services
export class RMAService { initiateReturn() { ... } }
export class InspectionService { processInspection() { ... } }
export class RefundCalculator { calculateRefund() { ... } }
```

### For Type Files (>300 lines)
```typescript
// BEFORE: All types in one file
// domain/fm/fm.types.ts (1159 lines)

// AFTER: Types per entity
// domain/fm/types/work-order.types.ts
// domain/fm/types/vendor.types.ts
// domain/fm/types/maintenance.types.ts
// domain/fm/types/index.ts (re-exports)
```

## Implementation Strategy

### Incremental Approach (Recommended)
1. **Never refactor in the same PR as a feature**
2. **One file per PR** - easier to review
3. **Maintain backward compatibility** - re-export from old paths
4. **Test coverage first** - ensure tests pass before and after
5. **Extract smallest piece first** - build momentum

### Migration Pattern
```typescript
// Step 1: Create new file with extracted logic
// components/fm/WorkOrderRow.tsx

// Step 2: Import in original file
// components/fm/WorkOrdersView.tsx
export { WorkOrderRow } from './WorkOrderRow';

// Step 3: Update imports across codebase (in later PR)
// Step 4: Remove re-export when all consumers updated
```

## Bundle Impact Analysis

| File | Current Impact | After Refactoring |
|------|----------------|-------------------|
| WorkOrdersView.tsx | 45KB parsed | ~15KB (code split) |
| login/page.tsx | 38KB parsed | ~12KB (lazy load social) |
| TopBar.tsx | 32KB parsed | ~10KB (code split menus) |

**Estimated Total Savings:** 60-80KB from initial bundle

## Timeline Recommendation

| Month | Focus | Files |
|-------|-------|-------|
| Jan 2026 | Domain logic | fm.behavior.ts, returns-service.ts |
| Feb 2026 | UI components | WorkOrdersView.tsx, TopBar.tsx |
| Mar 2026 | Forms | expense/new, payments/new, invoices/new |
| Ongoing | As touched | Any file modified gets incremental improvement |

## Metrics to Track

1. **Average file length** - Target: <500 lines
2. **Largest file** - Target: <1000 lines
3. **Bundle size** - Track with `@next/bundle-analyzer`
4. **Test coverage per file** - Ensure no regression

## Non-Goals

- ❌ Rewrite from scratch
- ❌ Change public APIs without deprecation
- ❌ Refactor files not actively being modified
- ❌ Add complexity for theoretical "clean code"
