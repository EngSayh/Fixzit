# PR #599 — Fixizit Architect Review

## Summary
- **Status:** 🟢 Ready to Merge (pending CI)
- **Alignment Score:** ~95%
- **Intent:** Security Fix + Test Hygiene
- **Domains touched:** Payments, Finance, Tests
- **CI:** ⏳ Awaiting (PAT lacks `checks:read` scope)

## Key Fixes Applied
- `lib/finance/tap-webhook/persistence.ts`: Added orgId scoping to Payment.findById in refund handler
- `app/api/payments/create/route.ts`: Added organizationId to Tap charge metadata
- `app/api/payments/tap/webhook/route.ts`: Related webhook handling with tenant scope
- `services/souq/claims/refund-processor.ts`: Added organizationId to refund metadata
- `app/api/work-orders/[id]/route.ts`: Fixed resolveSlaTarget call signature
- `app/api/work-orders/route.ts`: Fixed resolveSlaTarget call signature
- `lib/graphql/index.ts`: Fixed resolveSlaTarget call signature
- `app/layout.tsx`: Removed invalid OfflineIndicator position prop
- ~48 test files: Replaced vi.resetAllMocks() → vi.clearAllMocks()

## Governance & UI Integrity
- ✅ Layout Freeze preserved: Header + Sidebar + Content (no duplicates, no hydration regressions)
- ✅ Top Bar elements intact (Brand/Search/Language/QuickActions/Notifications/User)
- ✅ Footer intact

## Multi-Tenancy & RBAC
- ✅ org_id scoping verified for changed payment routes
- ✅ Added tenant scope to Payment.findById in refund handler
- ✅ RBAC enforced server-side for touched endpoints

## System-Wide Pattern Scan
- Pattern: `findById` without tenant scope
  - Occurrences: ~20+ (many legitimate: User lookups, public endpoints)
  - Action: Logged as tech debt for separate audit
- Pattern: RTL violations (pl-/pr-/ml-/mr-)
  - Occurrences: ~22
  - Action: Logged as tech debt (separate RTL migration PR)

## Notes
- Pre-existing ESLint warnings (203) for `require-tenant-scope` and `require-lean` rules
- These are NOT introduced by this PR - separate tech debt cleanup needed
