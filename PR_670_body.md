## Summary

Fix lint:collections baseline by adding missing auth collection constants and refactoring hardcoded literals.

**Agent Token:** `[AGENT-0009]`

## Changes

### lib/db/collection-names.ts
- Added `ACCOUNT_LOCKOUTS: "account_lockouts"`
- Added `LOGIN_ATTEMPTS: "login_attempts"`
- Added `MFA_PENDING: "mfa_pending"`

### lib/auth/passwordPolicy.ts
- Added import: `import { COLLECTIONS } from "@/lib/db/collection-names";`
- Replaced 8 hardcoded collection literals with COLLECTIONS.* constants:
  - Line 427: `"account_lockouts"` → `COLLECTIONS.ACCOUNT_LOCKOUTS`
  - Line 471: `"account_lockouts"` → `COLLECTIONS.ACCOUNT_LOCKOUTS`
  - Line 505: `"account_lockouts"` → `COLLECTIONS.ACCOUNT_LOCKOUTS`
  - Line 534: `"login_attempts"` → `COLLECTIONS.LOGIN_ATTEMPTS`
  - Line 559: `"login_attempts"` → `COLLECTIONS.LOGIN_ATTEMPTS`
  - Line 562: `"account_lockouts"` → `COLLECTIONS.ACCOUNT_LOCKOUTS`
  - Line 574: `"login_attempts"` → `COLLECTIONS.LOGIN_ATTEMPTS`
  - Line 597: `"login_attempts"` → `COLLECTIONS.LOGIN_ATTEMPTS`

### lib/auth/mfaService.ts
- Added import: `import { COLLECTIONS } from "@/lib/db/collection-names";`
- Replaced 3 hardcoded collection literals with COLLECTIONS.* constants:
  - Line 272: `"mfa_pending"` → `COLLECTIONS.MFA_PENDING`
  - Line 326: `"mfa_pending"` → `COLLECTIONS.MFA_PENDING`
  - Line 363: `"mfa_pending"` → `COLLECTIONS.MFA_PENDING`

## Local CI Verification ✅

| Check | Result |
|-------|--------|
| `pnpm typecheck` | ✅ 0 errors |
| `pnpm lint` | ✅ 0 errors |
| `pnpm run lint:collections` | ✅ No hardcoded collection literals found |
| `pnpm vitest run` | ✅ 98 tests pass |

## Impact

This PR fixes the `lint:collections` CI check that was blocking PRs #661, #662, #663.

## Files Changed (3)
- `lib/db/collection-names.ts` - Added 3 new constants
- `lib/auth/passwordPolicy.ts` - Refactored 8 hardcoded literals
- `lib/auth/mfaService.ts` - Refactored 3 hardcoded literals
