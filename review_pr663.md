# PR #663 — Fixizit Architect Review

## Summary
- **Status:** � Blocked (Pre-existing lint:collections failure)
- **Alignment Score:** ~85% (blocked by baseline issue)
- **Intent:** Bugfix (Normalize S3 error to 503 for STG-REM-001)
- **Domains touched:** Storage, UI (Select component), Tests
- **CI:** ❌ Failing (`gates/lint:collections`)

## Key Fixes Applied
- `components/ui/select.tsx` - Added `wrapperClassName` prop to match test expectations
- `tests/api/hr/payroll-calculate.route.test.ts` - Refactored to use module-scoped mutable state pattern

## Blocker: Pre-existing lint:collections Failure

The `Fixzit Quality Gates/gates` workflow is failing on `lint:collections` due to **55 hardcoded collection literals** across the codebase. This is a **pre-existing baseline issue** that is NOT caused by this PR's changes.

### Affected Files (partial list):
- `lib/auth/passwordPolicy.ts` - 8 violations (account_lockouts, login_attempts)
- `lib/auth/mfaService.ts` - 1 violation (mfa_pending)
- `scripts/migrations/*.ts` - ~46 violations (various souq collections)

### Missing Collection Constants:
The following constants need to be added to `lib/db/collection-names.ts`:
- `ACCOUNT_LOCKOUTS: "account_lockouts"`
- `LOGIN_ATTEMPTS: "login_attempts"`
- `MFA_PENDING: "mfa_pending"`

### Remediation Required (tracked as tech debt):
1. Add missing constants to `lib/db/collection-names.ts`
2. Refactor `lib/auth/passwordPolicy.ts` to use COLLECTIONS
3. Refactor `lib/auth/mfaService.ts` to use COLLECTIONS
4. Refactor migration scripts to use COLLECTIONS
5. Consider adding `@lint-collections-ignore` comments for migration scripts (one-time scripts)

**Estimated effort:** 2-4 hours

## Root Cause Analysis

### select.test.tsx failure (FIXED ✅)
Added `wrapperClassName` prop to Select component.

### payroll-calculate.route.test.ts (FIXED ✅)
Module-scoped mutable state pattern fix for PayrollService mock.

## Governance & UI Integrity
- Layout Freeze preserved: Select component enhancement only
- No duplicate headers/wrappers introduced
- RTL compatibility maintained

## Multi‑Tenancy & RBAC
- S3 error normalization is tenant-agnostic

## Verification
- [x] Local tests pass
- [x] Local typecheck - 0 errors
- [x] Local lint - 0 errors
- [ ] CI lint:collections - BLOCKED (pre-existing issue)

## Notes
This PR is **blocked by pre-existing baseline CI failure**, not by any issue introduced in this PR. The `lint:collections` check was likely added after these violations existed, causing all PRs to fail.

**Recommended action:** Either:
1. Fix the baseline violations in a separate PR first
2. Or temporarily disable the `lint:collections` check in the gates workflow
3. Or add exceptions for the legacy files
