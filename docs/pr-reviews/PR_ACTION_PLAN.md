# PR #321 - ACTION PLAN
**Generated**: 2025-11-24T13:20:00+03:00  
**Status**: EXECUTION IN PROGRESS

---

## EXECUTION ORDER (Dependency-Based)

### PHASE 1: CRITICAL TYPE & LINTING FIXES (Blocks CI)
**Duration**: ~15 minutes  
**Dependencies**: None  
**Verification**: TypeScript + ESLint passes

#### STEP 1.1: Fix Unused Parameter (STYLE-1)
- **File**: `server/middleware/requireVerifiedDocs.ts` line 13
- **Change**: Rename `path` to `_path` or remove if unused
- **Verification**: `pnpm lint`

#### STEP 1.2: Fix Module Assignment (STYLE-2)
- **File**: `server/services/onboardingEntities.ts` line 57
- **Change**: Rename `module` variable to `ticketModule`
- **Verification**: `pnpm lint`

#### STEP 1.3: Fix Type Mismatch (API-1)
- **File**: `app/api/onboarding/documents/[id]/review/route.ts` line 47
- **Change**: Convert string `rejection_reason` to i18n object `{ en: string }`
- **Verification**: `pnpm typecheck`

---

### PHASE 2: SECURITY FIXES (High Priority)
**Duration**: ~30 minutes  
**Dependencies**: Phase 1 complete  
**Verification**: Manual code review + auth tests

#### STEP 2.1: Fix trustHost Staging Vulnerability (SEC-1)
- **File**: `auth.config.ts` lines 172-175
- **Change**: Remove `process.env.NODE_ENV !== 'production'` from trustHost calculation
- **Add**: Documentation about explicit env var requirement for dev
- **Verification**: Review auth configuration

#### STEP 2.2: Remove NEXTAUTH_URL Runtime Mutation (SEC-2)
- **File**: `auth.config.ts` lines 47-52
- **Change**: Remove `process.env.NEXTAUTH_URL = derivedNextAuthUrl` mutation
- **Change**: Use `resolvedNextAuthUrl` constant throughout
- **Verification**: Auth flow tests

#### STEP 2.3: Add Org Boundary to Refund API (SEC-3)
- **File**: `app/api/souq/returns/refund/route.ts` lines 14-21
- **Add**: Org scoping validation after role check
- **Add**: SUPER_ADMIN bypass logic
- **Add**: Validate RMA belongs to admin's org
- **Verification**: API tests with cross-org scenarios

---

### PHASE 3: ADD MISSING ORG GUARDS (Critical Security Issue)
**Duration**: ~45 minutes  
**Dependencies**: Phase 2 complete  
**Verification**: Route Quality CI passes

#### STEP 3.1: Add Org Guards to 15 FM Pages (BUG-1)
For each file, add `useSupportOrg()` or `useFmOrgGuard()` at component start:

**Files to Update** (15 total):
1. `app/fm/assets/page.tsx`
2. `app/fm/dashboard/page.tsx`
3. `app/fm/finance/invoices/new/page.tsx`
4. `app/fm/finance/invoices/page.tsx`
5. `app/fm/finance/reports/page.tsx`
6. `app/fm/page.tsx`
7. `app/fm/projects/page.tsx`
8. `app/fm/properties/[id]/page.tsx`
9. `app/fm/reports/new/page.tsx`
10. `app/fm/rfqs/page.tsx`
11. `app/fm/support/escalations/new/page.tsx`
12. `app/fm/support/tickets/page.tsx`
13. `app/fm/tenants/page.tsx`
14. `app/fm/vendors/[id]/page.tsx`
15. `app/fm/vendors/page.tsx`

**Pattern**:
```typescript
import { useSupportOrg } from '@/hooks/useSupportOrg'; // or useFmOrgGuard

export default function PageName() {
  const orgId = useSupportOrg(); // Add this line at component start
  
  // ... existing code
}
```

**Verification**: `pnpm run guard:static` (should pass)

---

### PHASE 4: I18N FIXES (Zero-Tolerance Gate)
**Duration**: ~2-3 hours (manual translation work)  
**Dependencies**: Phase 3 complete  
**Verification**: Translation audit passes

#### STEP 4.1: Investigate Missing Translations (I18N-1)
- **Run**: `node scripts/audit-translations.mjs`
- **Review**: `docs/translations/translation-audit.json` and `.csv`
- **Identify**: Which keys are genuinely missing vs. false positives

#### STEP 4.2: Add Missing API Error Translations (I18N-2)
- **File**: Create/update `locales/en/api-errors.json` and `locales/ar/api-errors.json`
- **Add keys**:
  - `api.auth.unauthorized`
  - `api.auth.forbidden`
  - `api.souq.refund.missing_fields`
  - `api.souq.refund.invalid_method`
  - `api.souq.refund.invalid_amount`
  - `api.souq.refund.success`
  - `api.souq.refund.failed`
- **Verification**: Keys accessible via `getTranslations('api-errors')`

#### STEP 4.3: Add Onboarding Ticket Translations (I18N-3)
- **File**: Update `locales/en.json` and `locales/ar.json`
- **Add keys**:
  - `onboarding.ticketSubject`
  - `onboarding.ticketMessage`
- **Verification**: Keys accessible in server-side code

#### STEP 4.4: Add Remaining Missing Keys
- **Process**: Iterate through audit report, add each missing key to EN/AR catalogs
- **Tools**: Use `scripts/audit-translations.mjs --fix` if applicable
- **Goal**: Reduce missing translations from 2147 to 0
- **Verification**: `node scripts/audit-translations.mjs` returns 0 missing

---

### PHASE 5: ADDITIONAL ENHANCEMENTS (Non-Blocking)
**Duration**: ~1-2 hours  
**Dependencies**: Phase 4 complete  
**Verification**: Optional - can be done post-merge

#### STEP 5.1: Add Standardized Error Responses (SEC-4)
- **File**: Create `lib/api-error.ts`
- **Implement**: `createErrorResponse()` helper with correlationId, i18n support
- **Update**: Refund API route to use standard errors
- **Verification**: API returns consistent error structure

#### STEP 5.2: Add Transaction Safety to Refund Processing (SEC-5)
- **File**: `services/souq/returns-service.ts`
- **Add**: MongoDB transaction wrapping for refund operations
- **Add**: Idempotency checks (duplicate detection)
- **Verification**: Concurrent refund tests

#### STEP 5.3: Improve MongoDB Test Cleanup (DB-1, PERF-1)
- **File**: `vitest.setup.ts` or individual test files
- **Add**: Graceful connection cleanup
- **Add**: Suppress expected offline warnings
- **Verification**: Tests pass without unhandled error warnings

#### STEP 5.4: Add Missing Test Coverage (TEST-1 through TEST-4)
- **Files to create**:
  - `tests/api/healthcheck.test.ts`
  - `tests/api/help/escalate.test.ts`
  - `tests/api/onboarding/documents/review.test.ts`
  - `tests/unit/server/services/onboardingEntities.test.ts`
- **Coverage**: Auth, validation, error handling, edge cases
- **Verification**: `pnpm test` passes with increased coverage

#### STEP 5.5: Add OpenAPI Documentation (API-2)
- **File**: `openapi.yaml` or `docs/fixzit-souq-openapi.yaml`
- **Add specs for**:
  - POST `/api/souq/returns/refund`
  - POST `/api/help/escalate`
  - PATCH `/api/onboarding/documents/{id}/review`
- **Verification**: OpenAPI validator passes

#### STEP 5.6: Create Refund Method Migration Guide (DOC-1)
- **File**: Create `docs/migrations/REFUND_METHOD_V2.md`
- **Content**:
  - Breaking change summary (`store_credit` → `wallet`)
  - Before/after code examples
  - Migration steps for API consumers
  - Testing checklist
- **Verification**: Documentation complete

#### STEP 5.7: Fix Markdown Formatting (DOC-2)
- **Files**: All .md files flagged by markdownlint
- **Fix**: Add blank lines around headings (MD022), code blocks (MD031)
- **Fix**: Wrap bare URLs (MD034)
- **Verification**: `markdownlint-cli2` passes

---

## COMMIT STRATEGY

### Commit 1: Critical Type & Linting Fixes
```bash
git add server/middleware/requireVerifiedDocs.ts
git add server/services/onboardingEntities.ts
git add app/api/onboarding/documents/\[id\]/review/route.ts
git commit -m "fix: resolve TypeScript type errors and ESLint violations

- Rename unused 'path' parameter to '_path' in requireVerifiedDocs middleware
- Rename 'module' variable to 'ticketModule' to avoid Next.js module conflict
- Fix rejection_reason type mismatch (string → i18n object) in document review API

Fixes: STYLE-1, STYLE-2, API-1
Resolves: Agent Governor CI failures"
```

### Commit 2: Security Configuration Fixes
```bash
git add auth.config.ts
git commit -m "fix(auth): remove trustHost staging vulnerability and NEXTAUTH_URL mutation

- Remove NODE_ENV check from trustHost (require explicit env var)
- Remove runtime mutation of process.env.NEXTAUTH_URL
- Use resolved constant for all auth URL references

Fixes: SEC-1, SEC-2
Security: Prevents CSRF attacks in staging, eliminates race conditions"
```

### Commit 3: API Org Boundary Enforcement
```bash
git add app/api/souq/returns/refund/route.ts
git commit -m "fix(api): add org boundary validation to refund endpoint

- Add org scoping check for admin refund processing
- Implement SUPER_ADMIN bypass logic
- Validate RMA belongs to admin's organization

Fixes: SEC-3
Security: Prevents cross-org refund access"
```

### Commit 4: Add FM Page Org Guards
```bash
git add app/fm/**/page.tsx
git commit -m "fix(fm): add org guards to 15 FM pages

Add useSupportOrg() or useFmOrgGuard() to enforce tenant boundaries:
- assets, dashboard, finance (invoices, reports)
- projects, properties, reports, rfqs
- support (escalations, tickets)
- tenants, vendors

Fixes: BUG-1
Security: Prevents unauthorized cross-org data access
CI: Resolves Route Quality workflow failure"
```

### Commit 5: I18n Translations
```bash
git add locales/**/*.json i18n/**/*.json
git commit -m "fix(i18n): add missing translation keys for EN/AR support

- Add API error message translations (refund, help, escalate)
- Add onboarding ticket message translations
- Add [remaining count] missing keys from audit

Fixes: I18N-1, I18N-2, I18N-3
CI: Resolves translation audit gate failure (2147 → 0 missing keys)"
```

---

## VERIFICATION CHECKLIST

### Phase 1: Type & Lint
- [ ] `pnpm typecheck` passes (0 errors)
- [ ] `pnpm lint` passes (0 errors, ≤50 warnings)
- [ ] Agent Governor CI passes
- [ ] GitHub Check: verify passes

### Phase 2: Security
- [ ] `auth.config.ts` reviewed (no runtime mutations, trustHost secure)
- [ ] Auth flow tests pass
- [ ] Refund API tests pass with org boundary checks

### Phase 3: Org Guards
- [ ] `pnpm run guard:static` passes
- [ ] Route Quality CI passes
- [ ] Manual smoke test: FM pages enforce org boundaries

### Phase 4: I18n
- [ ] `node scripts/audit-translations.mjs` shows 0 missing keys
- [ ] Fixzit Quality Gates CI passes
- [ ] Arabic UI displays properly (no untranslated strings)

### Phase 5: CI Green
- [ ] All 13+ workflows passing
- [ ] No ESLint Quality failures
- [ ] No Next.js Build failures
- [ ] No Route Quality failures
- [ ] E2E tests passing
- [ ] CodeQL passing
- [ ] Agent Governor CI passing

### Final PR Status
- [ ] All CodeRabbit comments addressed or marked invalid
- [ ] No failing CI checks
- [ ] No security vulnerabilities
- [ ] No blocking bugs
- [ ] Ready to merge

---

## TIMELINE ESTIMATE

- **Phase 1** (Type/Lint): 15 minutes
- **Phase 2** (Security): 30 minutes
- **Phase 3** (Org Guards): 45 minutes
- **Phase 4** (I18n): 2-3 hours (depends on audit findings)
- **Phase 5** (Enhancements): 1-2 hours (optional, can be split to follow-up PRs)

**Total Critical Path**: ~3.5-4.5 hours
**Total with Enhancements**: ~5-7 hours

**Current Time**: 2025-11-24T13:20:00+03:00  
**Estimated Completion (Critical Only)**: 2025-11-24T17:00:00+03:00  
**Estimated Completion (Full)**: 2025-11-24T20:00:00+03:00

---

**Status**: READY TO EXECUTE - Starting Phase 1
