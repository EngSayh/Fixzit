# PR #321 - COMPLETE ISSUE LIST
**Generated**: 2025-11-24T13:15:00+03:00  
**Branch**: feat/misc-improvements  
**Status**: IN PROGRESS

---

## CATEGORY: BUGS / LOGIC ERRORS

### BUG-1: Missing Org Guards in 15 FM Pages
**Source**: CI failure - Route Quality workflow  
**Severity**: HIGH (Security & Data Isolation)  
**Location**: Multiple FM pages  
**Files**:
- app/fm/assets/page.tsx
- app/fm/dashboard/page.tsx
- app/fm/finance/invoices/new/page.tsx
- app/fm/finance/invoices/page.tsx
- app/fm/finance/reports/page.tsx
- app/fm/page.tsx
- app/fm/projects/page.tsx
- app/fm/properties/[id]/page.tsx
- app/fm/reports/new/page.tsx
- app/fm/rfqs/page.tsx
- app/fm/support/escalations/new/page.tsx
- app/fm/support/tickets/page.tsx
- app/fm/tenants/page.tsx
- app/fm/vendors/[id]/page.tsx
- app/fm/vendors/page.tsx

**Problem**: Pages lack tenant/org boundary enforcement - users could access data from wrong organizations  
**Fix Required**: Add `useSupportOrg()` or `useFmOrgGuard()` hook to each page component

---

## CATEGORY: SECURITY / VALIDATION ISSUES

### SEC-1: trustHost Too Permissive for Staging
**Source**: CodeRabbit review (auth.config.ts:172-175)  
**Severity**: HIGH (CSRF vulnerability)  
**Location**: auth.config.ts line 175  
**Problem**: `trustHost = true` for any environment where `NODE_ENV !== 'production'`. If staging runs with `NODE_ENV !== 'production'`, accepts requests from any host origin, enabling CSRF attacks  
**Fix Required**: Remove `process.env.NODE_ENV !== 'production'` condition, require explicit env var opt-in

### SEC-2: Runtime Mutation of process.env.NEXTAUTH_URL
**Source**: CodeRabbit review (auth.config.ts:34-52)  
**Severity**: MEDIUM (Race condition)  
**Location**: auth.config.ts lines 47-52  
**Problem**: Mutates `process.env.NEXTAUTH_URL` at runtime - NextAuth may initialize before this assignment, causing inconsistent behavior  
**Fix Required**: Remove mutation, use local `resolvedNextAuthUrl` constant throughout

### SEC-3: Missing Tenant Boundary in Refund API
**Source**: CodeRabbit review (app/api/souq/returns/refund/route.ts:14-21)  
**Severity**: HIGH (Cross-org data access)  
**Location**: app/api/souq/returns/refund/route.ts  
**Problem**: Admin role check but no org scoping - admins can process refunds for RMAs in any organization  
**Fix Required**: Add org boundary validation (SUPER_ADMIN bypass, validate RMA belongs to admin's org)

### SEC-4: Non-Standard Error Responses Without i18n
**Source**: CodeRabbit review (app/api/souq/returns/refund/route.ts:11-66)  
**Severity**: MEDIUM (Inconsistent errors, i18n violations)  
**Location**: app/api/souq/returns/refund/route.ts  
**Problem**: Error responses lack correlationId, structured error codes, userMessage/devMessage. All strings hardcoded English  
**Fix Required**: Create standardized error helper, add EN/AR i18n keys

### SEC-5: Missing Transaction Safety in processRefund
**Source**: CodeRabbit review (app/api/souq/returns/refund/route.ts:47-52)  
**Severity**: MEDIUM (Data consistency)  
**Location**: services/souq/returns-service.ts line 581  
**Problem**: No MongoDB transaction wrapping, no idempotency safeguards - vulnerable to race conditions and double refunds  
**Fix Required**: Wrap refund processing in transaction with duplicate detection

---

## CATEGORY: DATA MODEL / DATABASE / CONNECTION

### DB-1: MongoDB Connection Warnings in Tests
**Source**: CI failure - Next.js CI Build  
**Severity**: LOW (Non-blocking warnings)  
**Location**: Test suite (5 test files)  
**Problem**: Vitest caught 5 unhandled errors - MongoDB connection warnings during test cleanup  
**Fix Required**: Improve test cleanup to gracefully handle offline scenarios

---

## CATEGORY: I18N / TRANSLATIONS / LOCALIZATION

### I18N-1: 2147 Missing Translation Keys
**Source**: Fixzit Quality Gates workflow (scripts/audit-translations.mjs)  
**Severity**: CRITICAL (Zero-tolerance gate violation)  
**Location**: i18n catalogs (en.json, ar.json)  
**Problem**: 2147 translation keys used in code but missing in catalogs - Arabic users see untranslated strings  
**Fix Required**: Add all missing keys to EN/AR catalogs

### I18N-2: Missing i18n for API Error Messages
**Source**: CodeRabbit review  
**Severity**: MEDIUM  
**Location**: app/api/souq/returns/refund/route.ts, app/api/help/escalate/route.ts  
**Problem**: Error messages hardcoded in English, no localization support  
**Fix Required**: Extract to `locales/en/api-errors.json` and `locales/ar/api-errors.json`

### I18N-3: Onboarding Ticket Messages Not Localized
**Source**: CodeRabbit review (server/services/onboardingEntities.ts:56, 71-73)  
**Severity**: MEDIUM  
**Location**: server/services/onboardingEntities.ts  
**Problem**: Support ticket subject and messages hardcoded English, visible to staff  
**Fix Required**: Add locale keys for onboarding ticket messages in EN/AR

---

## CATEGORY: CODE STYLE / LINTING / FORMATTING

### STYLE-1: Unused Parameter 'path'
**Source**: GitHub Actions Agent Governor CI  
**Severity**: LOW (Linting error)  
**Location**: server/middleware/requireVerifiedDocs.ts line 13  
**Problem**: Parameter 'path' is defined but never used - must match /^_/u pattern for allowed unused args  
**Fix Required**: Rename to `_path` or remove if not needed

### STYLE-2: Module Assignment Violation
**Source**: GitHub Check verify  
**Severity**: LOW (Next.js convention violation)  
**Location**: server/services/onboardingEntities.ts line 57  
**Problem**: Do not assign to the variable `module` (Next.js message: no-assign-module-variable)  
**Fix Required**: Rename variable to avoid conflict

---

## CATEGORY: TESTS MISSING / FAILING

### TEST-1: Missing Test Coverage for Healthcheck Endpoint
**Source**: CodeRabbit review (app/api/healthcheck/route.ts:10-24)  
**Severity**: MEDIUM  
**Location**: tests/api/healthcheck.test.ts (missing)  
**Problem**: No tests for healthcheck endpoint - should verify response shape, timestamps, cache headers  
**Fix Required**: Create test file with 3+ test cases

### TEST-2: Missing Test Coverage for Escalate Endpoint
**Source**: CodeRabbit review (app/api/help/escalate/route.ts)  
**Severity**: MEDIUM  
**Location**: tests/api/help/escalate.test.ts (missing)  
**Problem**: No tests for escalate endpoint - should verify auth, rate limiting, error handling  
**Fix Required**: Create test file with comprehensive coverage

### TEST-3: Missing Test Coverage for Document Review Route
**Source**: CodeRabbit review (app/api/onboarding/documents/[id]/review/route.ts)  
**Severity**: MEDIUM  
**Location**: tests/api/onboarding/documents/review.test.ts (missing)  
**Problem**: No tests for document review API - should verify authorization, validation, auto-approval logic  
**Fix Required**: Create test file with positive/negative paths

### TEST-4: Missing Test Coverage for Onboarding Entities Service
**Source**: CodeRabbit review (server/services/onboardingEntities.ts:17-105)  
**Severity**: MEDIUM  
**Location**: tests/unit/server/services/onboardingEntities.test.ts (missing)  
**Problem**: No tests for entity creation logic - has multiple branches, tenant context manipulation  
**Fix Required**: Create unit tests for all code paths

---

## CATEGORY: API / ENDPOINT BEHAVIOR OR SCHEMA

### API-1: Type Mismatch in Document Review
**Source**: GitHub Actions Agent Governor CI + GitHub Check verify  
**Severity**: MEDIUM (Type safety)  
**Location**: app/api/onboarding/documents/[id]/review/route.ts line 47  
**Problem**: Type 'string | undefined' is not assignable to type '{ en?: string | undefined; ar?: string | undefined; } | undefined'  
**Fix Required**: Convert rejection_reason string to i18n object format

### API-2: Missing OpenAPI Documentation
**Source**: CodeRabbit review  
**Severity**: MEDIUM (Developer experience)  
**Location**: Multiple API routes  
**Problem**: New API endpoints lack OpenAPI 3.0 specification  
**Fix Required**: Add specs to openapi.yaml for: refund, escalate, document review, onboarding routes

---

## CATEGORY: PERFORMANCE / COMPLEXITY ISSUES

### PERF-1: MongoDB Test Warnings Noise
**Source**: CI failure - Next.js CI Build  
**Severity**: LOW (Non-blocking)  
**Location**: Test suite cleanup phase  
**Problem**: Tests pass but warnings create noise from connection cleanup  
**Fix Required**: Improve test cleanup with graceful offline handling

---

## CATEGORY: DUPLICATION / INCONSISTENCY

### DUP-1: Duplicate Logout Translations
**Source**: CodeRabbit review (i18n/ar.json:125-132, 783-791)  
**Severity**: LOW (False positive)  
**Location**: i18n/ar.json  
**Problem**: Review incorrectly identified as duplicate - sections have deliberately different contextual translations  
**Fix Required**: NONE (close as invalid)

---

## CATEGORY: WORKFLOW / ARCHITECTURE / DESIGN / OPTIMIZATION

### ARCH-1: Inconsistent Error Response Format
**Source**: CodeRabbit review  
**Severity**: MEDIUM (API consistency)  
**Location**: Multiple API routes  
**Problem**: Different routes return different error structures - some have correlationId, some don't  
**Fix Required**: Standardize error response format across all API routes

### ARCH-2: In-Process Rate Limiting Not Distributed
**Source**: CodeRabbit review (middleware.ts:193-209)  
**Severity**: LOW (Known limitation)  
**Location**: middleware.ts  
**Problem**: Rate limiting uses in-memory Map - not shared across instances in multi-instance deployments  
**Fix Required**: Document as best-effort defense-in-depth OR implement distributed rate limiting (MongoDB/Upstash)

---

## CATEGORY: DOCUMENTATION / COMMENTS / NAMING

### DOC-1: Missing Migration Guide for Refund Method Change
**Source**: CodeRabbit review  
**Severity**: MEDIUM (API consumer impact)  
**Location**: docs/migrations/ (missing)  
**Problem**: Breaking change `store_credit` → `wallet` lacks migration guide  
**Fix Required**: Create `docs/migrations/REFUND_METHOD_V2.md`

### DOC-2: Markdown Formatting Violations
**Source**: markdownlint-cli2  
**Severity**: LOW (Code quality)  
**Location**: Multiple .md files (CI_FIX_COMPREHENSIVE_REPORT.md, HEALTH_CHECK_README.md, SYSTEM_100_PERCENT_PERFECT.md, etc.)  
**Problem**: Missing blank lines around headings (MD022), code blocks (MD031), bare URLs (MD034)  
**Fix Required**: Apply markdown formatting fixes

---

## SUMMARY STATISTICS

**Total Issues**: 28  
**By Severity**:
- CRITICAL: 1 (I18N-1)
- HIGH: 3 (BUG-1, SEC-1, SEC-3)
- MEDIUM: 16
- LOW: 8

**By Category**:
- Bugs / Logic Errors: 1
- Security / Validation: 5
- Data Model / Database: 1
- I18n / Translations: 3
- Code Style / Linting: 2
- Tests Missing: 4
- API / Endpoint: 2
- Performance / Complexity: 1
- Duplication / Inconsistency: 1 (invalid)
- Workflow / Architecture: 2
- Documentation / Comments: 2
- Unresolved (ESLint failure): 1 (needs investigation)

**Must-Fix Before Merge**:
1. BUG-1: 15 missing org guards (security risk)
2. SEC-1: trustHost staging vulnerability
3. SEC-2: NEXTAUTH_URL runtime mutation
4. SEC-3: Missing tenant boundary in refund API
5. I18N-1: 2147 missing translation keys
6. API-1: Type mismatch (blocks CI)
7. STYLE-1: Unused parameter (blocks CI)
8. STYLE-2: Module assignment (blocks CI)

**Nice-to-Have (Post-Merge)**:
- TEST-1 through TEST-4 (add test coverage)
- DOC-1, DOC-2 (documentation improvements)
- PERF-1 (test cleanup warnings)
- ARCH-1, ARCH-2 (architectural improvements)
- SEC-4, SEC-5, I18N-2, I18N-3 (enhancement requests)

---

**Next Step**: Create action plan addressing all must-fix issues in logical dependency order.
