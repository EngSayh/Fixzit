# PR #584 — Fixzit Architect Review (Draft)

## Summary
- **Status:** Needs evidence
- **Alignment Score:** TBD
- **Intent:** Bugfix + Test Stability (reported)
- **Domains touched:** Security (SSRF), FM Work Orders (Offline/Auto-assign), Copilot Tools (reported)
- **CI:** Not run in this report (evidence required)

## Reported Changes (Unverified)
- [ ] server/copilot/tools/guard.ts: remove unnecessary async, improve error message
- [ ] tests/unit/services/fm/auto-assignment-engine.test.ts: add afterEach to restore process.env
- [ ] hooks/fm/useOfflineWorkOrders.tsx: fix callback stability using ref pattern to prevent re-syncs
- [ ] services/fm/auto-assignment-engine.ts: replace magic number 999 with DEFAULT_VENDOR_MAX_WORKLOAD constant
- [ ] server/models/User.ts: standardize Mongoose schema notation for lastAssignedAt and availability fields

## Governance & UI Integrity (Needs Verification)
- [ ] Layout Freeze preserved: Header + Sidebar + Content (no duplicates, no hydration regressions)
- [ ] Top Bar elements intact (Brand/Search/Language/QuickActions/Notifications/User)
- [ ] Footer intact

## Multi-Tenancy & RBAC (Needs Verification)
- [ ] org_id scoping verified for changed queries/routes
- [ ] RBAC enforced server-side for auto-assign endpoint

## System-Wide Pattern Scan (Reported)
- Pattern: async function without await
  - Occurrences: 1 (reported)
  - Action: Verify and capture evidence
- Pattern: Magic numbers in workload config
  - Occurrences: 1 (reported)
  - Action: Verify and capture evidence

## Notes
- Local checks not verified in this report.
- Evidence pack not attached.

## Verification
- [ ] TypeScript: 0 errors (evidence required)
- [ ] ESLint: 0 warnings (evidence required)
- [ ] Unit tests: All passing (evidence required)
- [ ] Pre-commit/pre-push hooks: Pass (evidence required)
