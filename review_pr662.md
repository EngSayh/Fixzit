# PR #662 — Fixizit Architect Review

## Summary
- **Status:** 🟡 Pending CI Verification
- **Alignment Score:** ~95%
- **Intent:** Feature (Enable in-house ATS by default)
- **Domains touched:** ATS, Config, Tests
- **CI:** 🔄 Running (fixes pushed)

## Key Fixes Applied
- `tests/unit/server/services/onboardingEntities.test.ts` - Added `vi.mock('mongoose')` with mock session object to prevent 600s test timeouts
- `tests/api/hr/payroll-calculate.route.test.ts` - Refactored to use module-scoped mutable state pattern for PayrollService mock (survives `vi.resetModules()`)

## Root Cause Analysis

### onboardingEntities.test.ts
The test called `createEntitiesFromCase()` which uses `mongoose.startSession()` for transactions. Without mocking mongoose, vitest tried connecting to real MongoDB, causing 10-minute timeout per test (6 tests = 60 minutes total timeout).

### payroll-calculate.route.test.ts
The test used `vi.mocked(PayrollService.getById).mockResolvedValue()` after `vi.resetModules()`, but resetModules clears the module cache. The mock reference was lost, causing `PayrollService.getById` to return `undefined` instead of the mocked value.

**Fix:** Used module-scoped mutable state (`let mockPayrollRun = null;`) that survives module resets, matching the pattern already used for `mockSession` and `mockHasAllowedRole`.

## Governance & UI Integrity
- Layout Freeze preserved: No UI changes in this PR
- N/A for this feature PR

## Multi‑Tenancy & RBAC
- No tenant-scoped queries affected
- ATS configuration is tenant-aware

## Verification
- [x] Local `pnpm vitest run` - Tests pass
- [x] Local `pnpm typecheck` - 0 errors
- [x] Local `pnpm lint` - 0 errors
- [x] Pre-push hooks pass

## Notes
- CI should now pass with the test fixes
- Waiting for CI verification before merge
