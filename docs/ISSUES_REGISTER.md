# Issues Register - Fixzit Project

**Last Updated**: January 13, 2025  
**Status**: All Critical Issues Resolved

---

## Table of Contents

1. [Active Issues](#active-issues)
2. [Resolved Issues](#resolved-issues)
3. [Monitoring Items](#monitoring-items)
4. [Technical Debt](#technical-debt)

---

## Active Issues

_No active critical issues_

---

## Resolved Issues

### TENANT-001: Missing `required: true` on org_id in FM Schemas

**Category**: Security / Multi-Tenancy  
**Severity**: 🔴 BLOCKER  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: [#373](https://github.com/EngSayh/Fixzit/pull/373)

**Description**:
10 FM Mongoose schemas had `org_id` field without `required: true`, allowing documents to be created without tenant isolation.

**Affected Schemas**:
- UserSchema, PropertySchema, WorkOrderSchema, AttachmentSchema
- QuotationSchema, ApprovalSchema, FinancialTxnSchema, PMPlanSchema
- InspectionSchema, DocumentSchema

**Impact**:
- Cross-tenant data leakage risk
- Orphaned records bypassing tenant filters
- Compliance violation for STRICT v4.1 multi-tenancy

**Fix Applied**:
Added `required: true` to all `org_id` fields in `domain/fm/fm.behavior.ts`

---

### RBAC-DRIFT-005: SUPPORT_TICKETS Plan Gate Mismatch

**Category**: RBAC / Authorization  
**Severity**: 🟠 MAJOR  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: [#373](https://github.com/EngSayh/Fixzit/pull/373)

**Description**:
`SUPPORT_TICKETS` plan gate had different values between RBAC sources:
- `fm.behavior.ts`: `SUPPORT_TICKETS: false` for STARTER
- `fm.types.ts`: `SUPPORT_TICKETS: true` for STARTER

**Impact**:
- Users on STARTER plan see support features in UI
- Server-side code using `fm.behavior.ts` would deny access → 403
- Inconsistent user experience

**Fix Applied**:
Aligned `fm.behavior.ts` PLAN_GATES to match canonical `fm.types.ts`

---

### ABAC-001: Client `can()` Missing Property Manager Scope Validation

**Category**: Security / ABAC  
**Severity**: 🟠 MAJOR  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: [#373](https://github.com/EngSayh/Fixzit/pull/373)

**Description**:
Client-side `can()` function didn't validate `assignedProperties[]` for PROPERTY_MANAGER role.

**Impact**:
- UI may show "allowed" actions for properties user doesn't manage
- Client-server RBAC parity broken

**Fix Applied**:
Added `assignedProperties` validation in `can()` function in `domain/fm/fm.types.ts`

---

### ABAC-002: Client `can()` Missing Tenant Unit Scope Validation

**Category**: Security / ABAC  
**Severity**: 🟠 MAJOR  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: [#373](https://github.com/EngSayh/Fixzit/pull/373)

**Description**:
Client-side `can()` function didn't validate `units[]` for TENANT role.

**Impact**:
- UI may show actions for units tenant doesn't have access to
- Client-server ABAC parity broken

**Fix Applied**:
Added `units` validation in `can()` function in `domain/fm/fm.types.ts`

---

### RBAC-DRIFT-006: computeAllowedModules Override Instead of Union

**Category**: RBAC / Authorization  
**Severity**: 🟠 MAJOR  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: [#373](https://github.com/EngSayh/Fixzit/pull/373)

**Description**:
`fm.types.ts` `computeAllowedModules()` used early `return` statements for sub-roles, overriding base TEAM_MEMBER modules instead of unioning them.

**Impact**:
- FINANCE_OFFICER loses base TEAM_MEMBER modules (DASHBOARD, WO, CRM, etc.)
- Client-side module visibility different from server-side
- Sub-role users denied actions they should have

**Files Fixed**:
- `domain/fm/fm.types.ts`: Changed to union pattern `[...new Set([...allowed, ...subRoleModules])]`

---

### RBAC-DRIFT-007: Tenant Requester Fallback Missing

**Category**: RBAC / Authorization  
**Severity**: 🟠 MAJOR  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: [#373](https://github.com/EngSayh/Fixzit/pull/373)

**Description**:
Client `can()` in `fm.types.ts` used `ctx.requesterUserId === ctx.userId` without fallback to `userId` when `requesterUserId` is undefined.

**Impact**:
- Tenant actions fail when `requesterUserId` not explicitly set
- Server-side `fm.behavior.ts` uses fallback: `const requesterId = ctx.requesterUserId ?? ctx.userId`
- Parity broken for tenant workflows

**Fix Applied**:
Added `const requesterId = ctx.requesterUserId ?? ctx.userId` in `fm.types.ts` `can()` function.

---

### RBAC-DRIFT-008: hasModuleAccess Incomplete Sub-Role Handling

**Category**: RBAC / Authorization  
**Severity**: 🟠 MAJOR  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: [#373](https://github.com/EngSayh/Fixzit/pull/373)

**Description**:
`hasModuleAccess()` in `app/api/fm/permissions.ts` only handled Finance/HR sub-roles explicitly, missing SUPPORT_AGENT and OPERATIONS_MANAGER.

**Impact**:
- SUPPORT_AGENT accessing SUPPORT module gets 403
- OPERATIONS_MANAGER accessing WORK_ORDERS/PROPERTIES gets 403
- Only Finance/HR sub-roles worked correctly

**Fix Applied**:
Refactored to use `computeAllowedModules(role, subRole)` for complete sub-role handling.

---

### RBAC-DRIFT-009: fm-lite ROLE_MODULES Drift

**Category**: RBAC / Authorization  
**Severity**: 🟨 MINOR  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: [#373](https://github.com/EngSayh/Fixzit/pull/373)

**Description**:
`fm-lite.ts` `ROLE_MODULES` had outdated entries:
- PROPERTY_MANAGER missing SUPPORT module
- VENDOR missing WORK_ORDERS and REPORTS modules

**Impact**:
- Client façade `computeAllowedModules` returns different modules than server
- UI visibility drift for Property Managers and Vendors

**Fix Applied**:
Added missing modules to `ROLE_MODULES` in `fm-lite.ts` to match `ROLE_MODULE_ACCESS` in behavior/types.

---

### ISSUE-001: Missing SessionProvider

**Category**: Runtime Error  
**Severity**: 🔴 CRITICAL  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-09  
**Date Resolved**: 2025-01-09

**Description**:

```
Error: [next-auth]: useSession must be wrapped in a <SessionProvider />
```

**Root Cause**:

- `ClientLayout` component uses `useSession()` hook on all routes
- `PublicProviders` didn't include `SessionProvider`
- Public routes crashed immediately on load

**Impact**:

- Application completely broken for unauthenticated users
- Login page inaccessible
- All public pages (/, /about, /terms, etc.) crashed

**Fix Applied**:

```typescript
// File: /providers/PublicProviders.tsx
import { SessionProvider } from 'next-auth/react';

export default function PublicProviders({ children }: Props) {
  return (
    <ErrorBoundary>
      <SessionProvider>  {/* ADDED */}
        <I18nProvider>
          {children}
```

**Verification**:

- ✅ Server running on port 3000
- ✅ HTTP 200 OK response
- ✅ No console errors
- ✅ Public routes accessible

**Prevention**:

- Document provider requirements for global components
- Add provider validation tests
- Review global component dependencies

---

### ISSUE-002: Missing FormStateProvider

**Category**: Runtime Error  
**Severity**: 🔴 CRITICAL  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-09  
**Date Resolved**: 2025-01-09

**Description**:

```
Error: useFormState must be used within a FormStateProvider
```

**Root Cause**:

- `TopBar` component uses `useFormState()` hook
- TopBar renders on ALL routes (public + protected)
- `FormStateProvider` only in `AuthenticatedProviders`
- Public routes couldn't access the provider

**Impact**:

- TopBar crashed on public routes
- Navigation broken
- Form state tracking unavailable

**Fix Applied**:

```typescript
// File: /providers/PublicProviders.tsx
import { FormStateProvider } from "@/contexts/FormStateContext";

<CurrencyProvider>(<FormStateProvider>{
  /* ADDED */
});
{
  children;
}
```

**Verification**:

- ✅ TopBar renders correctly on all routes
- ✅ Form state tracking working
- ✅ No console errors

**Prevention**:

- Map all global component hooks to required providers
- Ensure PublicProviders includes ALL providers for global UI

---

### ISSUE-003: Missing CurrencyProvider

**Category**: Runtime Warning  
**Severity**: 🟡 HIGH  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-09  
**Date Resolved**: 2025-01-09

**Description**:

```
Warning: useCurrency called outside CurrencyProvider. Using fallback values.
```

**Root Cause**:

- `CurrencySelector` in TopBar needs `useCurrency()` hook
- TopBar renders globally
- `CurrencyProvider` missing from `PublicProviders`

**Impact**:

- Currency selector displayed fallback values
- User preference not respected
- Console warnings on every page load

**Fix Applied**:

```typescript
// File: /providers/PublicProviders.tsx
import { CurrencyProvider } from "@/contexts/CurrencyContext";

<ResponsiveProvider>(<CurrencyProvider>{
  /* ADDED */
}<FormStateProvider>);
```

**Verification**:

- ✅ Currency selector working
- ✅ SAR/USD toggle functional
- ✅ No console warnings

---

### ISSUE-004: Missing ResponsiveProvider

**Category**: Silent Bug  
**Severity**: 🟡 HIGH  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-09  
**Date Resolved**: 2025-01-09

**Description**:
Silent failure - TopBar uses `useResponsive()` but provider missing

**Root Cause**:

- `TopBar` component uses `useResponsive()` hook
- Provider missing from `PublicProviders`
- No error thrown, just fallback values used

**Impact**:

- Responsive layout not working correctly
- Mobile/desktop detection broken
- UI not adapting to screen size

**Fix Applied**:

```typescript
// File: /providers/PublicProviders.tsx
import { ResponsiveProvider } from "@/contexts/ResponsiveContext";

<ThemeProvider>(<ResponsiveProvider>{
  /* ADDED */
}<CurrencyProvider>);
```

**Verification**:

- ✅ Responsive layout working
- ✅ Mobile/desktop detection accurate
- ✅ UI adapts correctly

---

### ISSUE-005: Workspace Disorganization

**Category**: Project Management  
**Severity**: 🟡 MEDIUM  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-09  
**Date Resolved**: 2025-01-09

**Description**:
520+ markdown files scattered in root directory causing navigation issues

**Root Cause**:

- Historical documentation accumulated in root
- No directory structure for reports/docs
- Files not categorized by type

**Impact**:

- Difficult to find documentation
- Root directory cluttered
- Git diffs polluted with doc changes

**Fix Applied**:
Created organized structure:

```
/docs/
├── summaries/        # 5 summary documents
├── reports/          # 150+ status reports
├── prs/              # PR documentation
└── issues/           # Issue tracking

docs/archived/DAILY_PROGRESS_REPORTS/  # Daily reports
```

Moved files:

- 150+ status reports → `/docs/archived/reports/`
- 5 summary docs → `/docs/summaries/`
- 200+ PR docs → `/docs/archived/prs/`
- 165+ issue docs → `/docs/archived/issues/`

**Verification**:

- ✅ Root directory clean (0 loose docs)
- ✅ All docs categorized
- ✅ Easy navigation

**Storage Impact**:

- Freed: 1.2 GB (cleared .next cache + duplicates)
- Before: 11.0 GB / 32 GB (37%)
- After: 9.8 GB / 32 GB (33%)

---

### ISSUE-006: Next.js Cache Bloat

**Category**: Performance  
**Severity**: 🟡 MEDIUM  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-09  
**Date Resolved**: 2025-01-09

**Description**:
`.next` directory consuming 1.1 GB with stale build artifacts

**Root Cause**:

- Development builds accumulating
- No automatic cache cleanup
- Turbopack cache not cleared

**Impact**:

- Slow build times
- Storage waste
- Potential stale module issues

**Fix Applied**:

```bash
rm -rf /workspaces/Fixzit/.next
# Freed: 1.1 GB
```

**Verification**:

- ✅ Clean rebuild successful
- ✅ Build time improved
- ✅ Storage freed

**Prevention**:

- Add `pnpm clean` script to package.json
- Document cache clearing procedures
- Consider automated cleanup in CI/CD

---

### ISSUE-SEC-003: DEFAULT_PLAN Security (Least Privilege Violation)

**Category**: Security - RBAC  
**Severity**: 🔴 CRITICAL  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: #369

**Description**:
FM permission checks used `Plan.STANDARD` as the default fallback when user's subscription plan couldn't be determined, violating the principle of least privilege.

**Root Cause**:
- `app/api/fm/permissions.ts` had `const DEFAULT_PLAN = Plan.STANDARD`
- `app/api/fm/work-orders/[id]/transition/route.ts` used `FMPlan.STANDARD` as fallback
- This granted users access to features they may not have paid for

**Impact**:
- Users with no valid subscription plan could access STANDARD tier features
- Preventive Maintenance, Leases, Inspections available without proper subscription
- Potential revenue leakage from unpaid feature access

**Fix Applied**:
```typescript
// File: app/api/fm/permissions.ts (line 50)
// SEC-003 FIX: Use STARTER as default (least privilege principle)
const DEFAULT_PLAN = Plan.STARTER;

// File: app/api/fm/work-orders/[id]/transition/route.ts (lines 425-429)
// SEC-003 FIX: Use STARTER as default
function resolvePlan(plan?: string | null): FMPlan {
  if (!plan) return FMPlan.STARTER;
  const normalized = plan.toUpperCase();
  return PLAN_ALIASES[normalized] ?? FMPlan.STARTER;
}
```

**Verification**:
- ✅ TypeScript clean
- ✅ ESLint clean
- ✅ useFMPermissions tests pass
- ✅ PR #369 merged

**Prevention**:
- Documented pattern: DEFAULT_PLAN should always be STARTER
- Added code comment explaining least privilege requirement
- Consider adding security test to verify default plan is STARTER

---

### ISSUE-SEC-001: Sub-Role Ignored in FM Permission Checks

**Category**: Security - RBAC  
**Severity**: 🟠 HIGH  
**Status**: ✅ RESOLVED  
**Date Reported**: 2025-01-13  
**Date Resolved**: 2025-01-13  
**PR**: #369

**Description**:
`app/api/fm/permissions.ts` computed `fmSubRole` but didn't pass it to `hasModuleAccess()`, allowing TEAM_MEMBER roles to access Finance/HR modules without required sub-roles.

**Root Cause**:
- STRICT v4.1 requires FINANCE_OFFICER sub-role for Finance module access
- STRICT v4.1 requires HR_OFFICER sub-role for HR module access
- `hasModuleAccess()` function signature didn't accept `subRole` parameter

**Impact**:
- TEAM_MEMBER users could potentially access Finance without FINANCE_OFFICER sub-role
- TEAM_MEMBER users could potentially access HR without HR_OFFICER sub-role
- Violates STRICT v4.1 RBAC specification

**Fix Applied**:
```typescript
// File: app/api/fm/permissions.ts (lines 85-97)
const hasModuleAccess = (role: Role, module?: ModuleKey, subRole?: SubRole): boolean => {
  if (!module) return true;
  
  // SEC-001 FIX: TEAM_MEMBER requires sub-role for Finance/HR modules
  if (role === Role.TEAM_MEMBER) {
    if (module === ModuleKey.FINANCE && subRole !== SubRole.FINANCE_OFFICER) {
      return false;
    }
    if (module === ModuleKey.HR && subRole !== SubRole.HR_OFFICER) {
      return false;
    }
  }
  
  return Boolean(ROLE_MODULE_ACCESS[role]?.[module]);
};

// Call site updated (line 162)
if (!hasModuleAccess(fmRole, options.module, fmSubRole)) {
```

**Verification**:
- ✅ TypeScript clean
- ✅ ESLint clean
- ✅ PR #369 merged

**Prevention**:
- Sub-role enforcement documented in code comments
- Consider adding explicit test cases for TEAM_MEMBER + Finance/HR without sub-role

---

### ISSUE-SEC-002: Org Membership Not Verified (Previously Reported)

**Category**: Security - RBAC  
**Severity**: 🟠 HIGH  
**Status**: ✅ ALREADY FIXED  
**Date Reported**: 2025-01-13  
**Note**: Issue was already fixed in previous PR #363

**Description**:
Originally flagged as needing org membership validation in `app/api/fm/permissions.ts`.

**Root Cause Analysis**:
Upon deep review, found that:
1. `lib/fm-auth-middleware.ts` already properly validates org membership (lines 157-170)
2. `app/api/fm/permissions.ts` now also has `resolveOrgContext()` function that verifies membership
3. The fix was applied in PR #363 (Security Audit Remediation)

**Verification**:
- ✅ `lib/fm-auth-middleware.ts` checks `org.members` array
- ✅ `app/api/fm/permissions.ts` has `resolveOrgContext()` with membership check
- ✅ Returns 403 Forbidden if user is not an org member

---

## Monitoring Items

### MONITOR-001: ESLint Warnings

**Category**: Code Quality  
**Severity**: 🟢 LOW  
**Status**: 📊 MONITORING

**Current State**:

- 13 warnings (within 50 limit)
- All warnings are `@typescript-eslint/no-explicit-any`

**Files Affected**:

1. `server/models/owner/Delegation.ts` - 5 warnings
2. `app/api/owner/statements/route.ts` - 4 warnings
3. `app/api/owner/units/[unitId]/history/route.ts` - 3 warnings
4. `server/services/owner/financeIntegration.ts` - 1 warning

**Action Plan**:

- Phase 1: Document all `any` types with reasons
- Phase 2: Gradually replace with proper types
- Phase 3: Reduce warning limit to 25

**Timeline**: Q1 2025

---

### MONITOR-002: E2E Test Infrastructure

**Category**: Testing  
**Severity**: 🟢 LOW  
**Status**: 📊 MONITORING

**Current State**:

- Model tests: 87/87 passing ✅
- E2E tests: Require separate environment

**Required**:

- Test database with seeded data
- Authentication state files
- Separate test server (`NODE_ENV=test`)

**Action Plan**:

- Create test data seeding script
- Document E2E test setup
- Add to CI/CD pipeline

**Timeline**: Q1 2025

---

## Technical Debt

### DEBT-001: TypeScript `any` Types

**Category**: Type Safety  
**Priority**: 🟡 MEDIUM  
**Estimated Effort**: 8 hours

**Description**:
13 instances of `any` type usage in models and API routes

**Impact**:

- Reduced type safety
- Potential runtime errors
- IDE autocomplete limitations

**Remediation Plan**:

1. Audit each `any` usage
2. Create proper interfaces/types
3. Replace `any` with specific types
4. Update tests to cover new types

**Timeline**: Q1 2025

---

### DEBT-002: Provider Documentation

**Category**: Documentation  
**Priority**: 🟢 LOW  
**Estimated Effort**: 2 hours

**Description**:
Provider architecture not documented in main README

**Impact**:

- New developers may repeat provider mistakes
- Architecture decisions not recorded
- Testing guidance missing

**Remediation Plan**:

1. Add Provider Architecture section to README
2. Document global component requirements
3. Add provider validation tests
4. Create troubleshooting guide

**Timeline**: Q1 2025

---

### DEBT-003: E2E Test Coverage

**Category**: Testing  
**Priority**: 🟡 MEDIUM  
**Estimated Effort**: 16 hours

**Description**:
464 E2E tests exist but require separate test environment

**Impact**:

- Manual testing required for UI changes
- Regression risk
- No automated UI testing in CI/CD

**Remediation Plan**:

1. Create test database setup script
2. Seed test data for all user roles
3. Generate authentication state files
4. Integrate with CI/CD pipeline
5. Document test running procedures

**Timeline**: Q1 2025

---

## Summary Statistics

### Issues by Severity

- 🔴 Critical: 0 active, 2 resolved
- 🟡 High: 0 active, 3 resolved
- 🟢 Low: 0 active, 0 resolved

### Issues by Category

- Runtime Errors: 0 active, 4 resolved
- Performance: 0 active, 1 resolved
- Project Management: 0 active, 1 resolved

### Resolution Timeline

- All critical issues resolved: 2025-01-09
- Average resolution time: <4 hours
- Total issues resolved: 6

### Code Quality Metrics

- TypeScript Errors: 0
- ESLint Warnings: 13 (within 50 limit)
- Test Pass Rate: 100% (model tests)
- Server Uptime: 100%

---

## Issue Reporting Process

### For New Issues

1. Create entry in this register
2. Assign severity (🔴 Critical / 🟡 High / 🟢 Low)
3. Document root cause and impact
4. Create action plan
5. Track resolution progress

### Severity Definitions

- 🔴 **CRITICAL**: Breaks core functionality, immediate fix required
- 🟡 **HIGH**: Impacts user experience, fix within 24 hours
- 🟢 **LOW**: Minor issue, can be scheduled

### Resolution Checklist

- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Verification tests passed
- [ ] Documentation updated
- [ ] Prevention measures in place
- [ ] Register updated with resolution

---

**Document Owner**: Engineering Team  
**Review Frequency**: Weekly  
**Next Review**: 2025-01-16
