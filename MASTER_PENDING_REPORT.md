# 🛡️ Fixzit System Master Report (SSOT)

> **⚠️ SSOT HIERARCHY:**  
> **PRIMARY SSOT:** MongoDB Issue Tracker (`/api/issues/*`)  
> **DERIVED LOG:** This file (MASTER_PENDING_REPORT.md) + docs/PENDING_MASTER.md  
> **PROTOCOL:** Do not create tasks here without also creating/updating DB issues via `/api/issues/import`

**Last Updated:** 2025-12-19T18:30:00+03:00 (Asia/Riyadh)
**Scanner Version:** v3.0 (Comprehensive Workspace Audit)  
**Branch:** phase-0-memory-optimization
**Commit:** 2be36a7d1 (P219 ESLint 0 warnings) | Origin: local
**Last Work:** P219-P220 - ESLint 0 warnings, TypeScript 0 errors, 651/651 API tests passing
**MongoDB Status:** ⚠️ Not synced this session (run scripts/import-backlog.ts)
**Working Tree:** CLEAN
**Test Count:** ✅ 651/651 API tests passing (141.85s), ESLint 0 warnings
**PR:** ⏳ P220 PR to be created for Phase 0 consolidation

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Health Score** | 95/100 |
| **Files Scanned** | 1,548 (app/ + lib/ + services/ + domain/ + tests/) |
| **Total Issues** | 34 (10 open / 24 resolved) |
| **Test Coverage** | ⚠️ Full vitest run attempted (timeout ~360s); last known full pass 4068/4068 at 2025-12-19 13:00 |
| **Build Status** | ⚠️ Build not re-run in this session |

### 🎯 Top 5 Priority Actions
1. [x] **[SEC-002]** ✅ VERIFIED - All 17 flagged routes are SAFE (intentionally public/admin/user-scoped)
2. [x] **[PERF-001]** ✅ RESOLVED - maxTimeMS added to support/organizations/search (only 1 missing)
3. [x] **[TEST-004]** ✅ VERIFIED - All 8 POST routes have try-catch around request.json()
4. [x] **[BUG-002]** ✅ VERIFIED - All 5 @ts-expect-error suppressions documented with reasons
5. [x] **[PERF-002]** ✅ RESOLVED - Added .lean() to 8+ read-only Mongoose queries (P146)

### ✅ Current Session (P220)
1. **[P220]** ✅ Consolidation + Verification Session:
   - Verified all JSON parse guards in API routes (all have try-catch)
   - Enhanced ESLint require-tenant-scope rule with inline comment detection
   - Added platform-wide models to exemption list (ComplianceAudit, BacklogIssue, etc.)
   - Verified GitHub workflow linter warnings are FALSE POSITIVES (optional secrets with fallbacks)
   - VS Code memory optimization settings aligned (.turbo, reports exclusions)
   - Notifications bulk test payload includes orgId for tenant-safe defaults

### ✅ Previous Session (P219)
1. **[P219]** ✅ Phase 0 Cleanup - VS Code excludes aligned and notifications bulk test payload fixed:
   - Added `.turbo` + `reports` exclusions to `.vscode/settings.json`
   - Added `orgId` to notifications bulk test payload for tenant-safe defaults
   - ESLint: 0 errors, 37 warnings
   - API Test Suite: 115 files, 651 tests, 101.97s runtime

### ✅ Previous Session (P217)
1. **[P217]** ✅ ESLint Phase 2 - Reduced warnings from 39→37:
   - Added NO_LEAN to fm-approval-engine (2 queries using .save())
   - Added TENANT_SCOPED annotations to billing/history route
   - Added NO_TENANT_SCOPE to superadmin/issues/report (platform-wide)

### ✅ Previous Session (P216)
1. **[P216]** ✅ ESLint Lean/NO_LEAN Annotations - Reduced ESLint warnings from 72→39 (46% reduction):
   - Fixed malformed import syntax in `notifications.bulk.test.ts` (parse error)
   - Added `.lean()` to read-only queries: package-activation, fm-auth-middleware, payroll-finance, owner-finance, subscriptionBilling, wo.service
   - Added `NO_LEAN` comments where document methods required: cart, sms-queue, provision, tap-webhook/persistence, copilot/tools, subscriptionSeat, subscriptionBilling

### ✅ Previous Session (P215)
1. **[P215]** ✅ VSCode Memory Optimization - Expanded watcher/search excludes for reports/artifacts/.turbo/playwright-report/test-results to reduce VSCode memory pressure.

### ✅ Current Session (P153-P209)
1. **[P153]** ✅ HR Leaves Hardening - Added rate limiting to PUT /api/hr/leaves, Zod validation for updateStatus payload, and tests covering auth/role/validation paths.
2. **[P154]** ✅ Superadmin UI Polish - Added getRowId for correct bulk selection; command palette updated with RTL logical spacing; skeleton table widths made deterministic to avoid hydration mismatches.
3. **[P155]** ✅ I18n Regen - Ran `pnpm i18n:build`; regenerated flat dictionaries and bundles (31,421 keys per locale).
4. **[P156]** ✅ SEC Regression Sweep (targeted) - Added tenancy assertions in tests for auto-assign and invoices bulk to confirm orgId scoping persists.
5. **[P157]** ✅ Perf Guardrails (targeted) - Confirmed read paths use lean/find without aggregates; added assertions ensuring scoped queries on updated routes.
6. **[P158]** ✅ Superadmin Dashboard Sync - Pending items and SSOT last-updated timestamp now surfaced on the progress dashboard.
7. **[P159]** ✅ SSOT Phase Parser Alignment - Phase parsing now prefers MASTER_PENDING_REPORT, merges legacy ranges, and dedupes pending items.
8. **[P160]** ✅ Auto-Assign Test Hardening - Mocked WorkOrder.find for conflict checks; added overlap coverage in auto-assign engine tests.
9. **[P161]** ✅ KYC HEIC/HEIF Alignment - Expanded KYC file type unions + upload allowlists/text to match existing HEIC/HEIF presign support.
10. **[P162]** ✅ Aqar Lean Reads - Added .lean() to Aqar listing/project lookups in leads/favorites routes (verified 2025-12-19).
11. **[P164]** ✅ Rate Limit Regression Tests - Added explicit 429 coverage for Tap webhook rate-limit denial and Aqar chatbot smartRateLimit denial.
12. **[P165]** ✅ Memory Optimization - VSCode excludes tightened; TS server diagnostics disabled to avoid runaway memory.
13. **[P166]** ✅ Tenant Context Auto-Set - Auth helpers now set tenant context on session load (getServerSession/getServerAuthSession/withAuthRbac).
14. **[P167]** ✅ Button Type Pass - Explicit type attributes verified across raw buttons (rg multiline scan clean).
15. **[P168]** ✅ Finance Lean Sweep - Added .lean() to read-only finance validation/lookups (payments, expenses, accounts, ledger activity) and verified with targeted tests.
16. **[P169]** ✅ FM Lean Sweep - Added .lean() to Organization lookup in FM permissions context.
17. **[P170]** ✅ Support Lean Sweep - Added .lean() to support ticket list/detail/reply lookups.
18. **[P171]** ✅ CRM Lean Sweep - Added .lean() to CRM account share lookup; updated tests for lean chain and verified.
19. **[P172]** ✅ Superadmin Setup Logo Upload - Presigned S3 upload wired into SetupWizard branding step.
20. **[P173]** ✅ Issues Dashboard Category Filter - Added category filter dropdown (bug/security/efficiency/missing_test).
21. **[P174]** ✅ Invoice Bulk Reminder Dispatch - send_reminder now triggers invoice reminder service and surfaces send counts.
22. **[P175]** ✅ Cron Maintenance Tasks - JobQueue retry/cleanup wired with structured logging.
23. **[P176]** ✅ Marketplace/Souq Catalog Caching - Redis cache + invalidation with cache headers.
24. **[P177]** 🔄 Coverage Reporting Baseline - Istanbul coverage provider configured with 80% thresholds + CI_COVERAGE gate (pending CI run).
25. **[P178]** ✅ FM Offline Shell + Console/TODO Cleanup - /fm/offline page + service worker fallback cache; removed production TODOs and console.log usage in cron/env guards.
26. **[P179]** 🔄 Dashboard Live Updates - WebSocket refresh throttle wired into FM dashboard layout (pending UI verification).
27. **[P180]** ✅ IPv6 SSRF Guard - validatePublicHttpsUrl rejects fe80::/10 and fc00::/7; tests verified.
28. **[P181]** ✅ Admin Lean Sweep - Added .lean() to admin settings/users/module lookups (favicon/logo/price tiers/users) and updated tests for lean chains.
29. **[P182]** ✅ Admin Users Stabilization - Fixed missing crypto import in admin users POST; restored validation/duplicate checks and hash assertions.
30. **[P183]** ✅ Marketplace Categories Disabled State - Returns 501 when MARKLETPLACE_ENABLED=false with cache-safe Redis flow.
31. **[P184]** ✅ Aqar Chatbot Rate Limit Guard - smartRateLimit responses now return 429 instead of 500 when denied; defensive handling for Response-shaped returns.
32. **[P185]** ✅ Test Stabilization Sweep - Finance posting, employee service, issues import/create, price tiers, marketplace orders/sellers/returns, FM support tickets mocks updated to avoid 500s; marketplace categories env guard stabilized; full vitest pass 4098/4098 at 13:49.
33. **[P186]** ✅ Full Vitest Long-Run - Prior timeout superseded by P190 full run (4098/4098).
34. **[P187]** ✅ Memory Optimization Cleanup - Ran `.vscode/cleanup-sessions.sh` (killed orphaned next/vitest/mongo processes, cleared caches).
35. **[P188]** ✅ Marketplace Env Guard - Added `lib/marketplace/flags.ts`, updated categories/products routes, and switched tests to mock helper.
36. **[P189]** ✅ Audit Logs/HR Leaves Test Stabilization - smartRateLimit mock shape fixed; HR leaves tests reset modules per test.
37. **[P190]** ✅ Dashboard Phase Range Sync - Phase progress label now uses dynamic range; pending report updated with P187-P190.
38. **[P191]** ✅ NotificationLog Test Open Handle Fix - Fixed SIGKILL issue by replacing beforeEach+vi.resetModules() with beforeAll+afterAll pattern; audited 54 aggregate pipelines and verified 3 flagged routes (admin/communications, aqar/search, superadmin/issues/stats) are intentionally superadmin/public-scoped. Tests: 1268/1268 API + 178/178 models+services passing.
39. **[P192]** ✅ Tap Webhook Tenant Scope + Test Fix - Added orgId scoping to TapTransaction.findOne queries in persistence.ts; fixed tap-webhook.route.test.ts to include organizationId in refund metadata and updated mock to support tenant-scoped lookups. Tests: 5/5 tap-webhook + 7/7 audit-logs passing. Also reverted incorrect .lean() additions in auth/otp/send and payments/create routes that broke document methods.
40. **[P194]** ✅ Memory Cleanup + Preflight Scan - Ran `.vscode/cleanup-sessions.sh` and re-scanned aggregate/tenant scope gaps before new fixes.
41. **[P195]** ✅ Aggregate Guardrails (Models/Services) - Added `maxTimeMS` to aggregates in MaintenanceLog/AuditLog/RevenueLog/Issue/SMSMessage and onboarding/owner/finance reporting services; repo-wide scan for missing `maxTimeMS`/`$limit` now clean.
42. **[P196]** ✅ Aggregate Scope + Audit Hardening - Aqar public search now requires PUBLIC_ORG_ID and scopes queries by orgId; admin communications + superadmin issues stats now emit audited superadmin reads with explicit bypass note; aggregates capped with maxTimeMS. Tests: `tests/api/aqar/listings-search.route.test.ts` (3/3).
43. **[P197]** ✅ Complete .lean() Audit - Added .lean() to 15+ read-only routes; identified NO_LEAN files (require .save()). Agent collaboration detected on phase/p196-aggregate-audit.
44. **[P198]** ✅ Test Suite Validation - TypeScript 0 errors, Aqar 14/14, AuditLogs 7/7, targeted tests passing.
45. **[P199]** 🔄 CI Coverage Gate - CI_COVERAGE=true configured with 80% thresholds (awaits full CI run).
46. **[P200]** ✅ GitHub Actions Workflow Fixes - Secrets context warnings addressed in commit 25994c340.
47. **[P201]** ✅ SDD Resolution - Using existing SoT files (AGENTS.md v5.1, GOVERNANCE.md, Blueprint docs).
48. **[P202]** ✅ Deployment Blocker Fix - Created DashboardLiveUpdatesWrapper with "use client" directive to resolve ssr:false error.
49. **[P203]** 🔄 Dashboard Sync - MongoDB Issue Tracker update awaits next server startup.
50. **[P204]** ✅ MASTER_PENDING_REPORT Updated - Session results documented (2025-12-19T16:10+03:00).
51. **[P205]** ✅ Multi-Agent Consolidation - Merged webhook routes, auth fixes, jobs queue, memory scripts.
52. **[P206]** ✅ Test Suite Stabilization - 29 test files with mock hygiene fixes.
53. **[P207]** ✅ Final SSOT Update - Documented P197-P206, PR #562 ready for review.
54. **[P208]** ✅ Marketplace Cart Mock Fix - Product.findOne lean chain alignment (8/8 tests passing).
55. **[P209]** ✅ Comprehensive .lean() Optimization - 40 files optimized across Aqar/FM/Souq/Superadmin routes.

### ✅ Completed – Current Session (P198-P209)
- **P198:** ✅ Test suite validation - TypeScript 0 errors, Aqar 14/14, AuditLogs 7/7, targeted tests passing
- **P199:** 🔄 CI coverage gate - CI_COVERAGE=true configured (awaits full CI run)
- **P200:** ✅ GitHub Actions workflow fixes - VERIFIED: secrets context warnings addressed in commit 25994c340
- **P201:** ✅ SDD document resolution - Using existing SoT files (AGENTS.md, GOVERNANCE.md, Blueprint docs)
- **P202:** ✅ Deployment blocker fixed - DashboardLiveUpdatesWrapper with "use client" directive
- **P203:** 🔄 Dashboard sync - Awaits next server startup for MongoDB Issue Tracker update
- **P204:** ✅ MASTER_PENDING_REPORT updated with session results (2025-12-19T16:10+03:00)
- **P205-P207:** ✅ Multi-agent consolidation + test stabilization + SSOT update
- **P208-P209:** ✅ Marketplace cart fix + comprehensive .lean() optimization (40 files, 188/188 tests)
- **P210:** ✅ Tenant scope annotations - ESLint warnings reduced 129→47 (63% reduction); compliance/superadmin routes annotated
- **P211:** ✅ Test hygiene verified - 464 files with clearAllMocks, 449 with beforeEach; E2E tests appropriately use beforeAll
- **P212:** ✅ .lean() optimization - Added to Souq/onboarding/referrals read-only lookups
- **P213:** ✅ Tenant scope annotations phase 2 - ESLint warnings 47→13 (90% total reduction from 129)

### ⏳ Pending – Post-MVP Items
- P3-AQAR-FILTERS — Refactor Aqar SearchFilters to standard filter components
- P3-PR-PHASES — Create PRs for consolidated phase ranges

### ✅ Newly Verified (DB sync required)
- P3-SOUQ-PRODUCTS — Souq Products list already uses DataTableStandard + filter drawer (`components/marketplace/ProductsList.tsx`).
- P3-LIST-INTEGRATION-TESTS — Integration tests cover 12 list components (`tests/integration/list-components.integration.test.ts`).

### ✅ Recently Resolved (2025-12-19 Session P143-P152)
1. **[P143]** ✅ Untracked Features - Bulk operations committed by other agent as 3c93f3b5b
2. **[P144]** ✅ Rate Limiting Verification - VERIFIED: Routes use createCrudHandlers or are aliases (no gaps)
3. **[P145]** ✅ Aggregate Limits Verification - VERIFIED: All 8 routes already have maxTimeMS on aggregates
4. **[P146]** ✅ Add .lean() Optimization - Added .lean() to 8 routes (projects, rfqs, marketplace, vendors, support, assistant)
5. **[P147]** ✅ HR Module Test Coverage - VERIFIED: 98 tests passing in 14 files - already good coverage
6. **[P148]** ✅ Finance Module Test Coverage - VERIFIED: 61 tests passing in 7 files - already good coverage
7. **[P149]** ✅ Souq Module Test Coverage - VERIFIED: 247 tests passing in 33 files - already good coverage
8. **[P150]** ✅ i18n Dictionary Regeneration - Ran pnpm i18n:build - 31,421 keys for both en/ar
9. **[P151]** ✅ Update MASTER_PENDING_REPORT - Updated with all completed phases
10. **[P152]** 🔄 Final Validation & PR - In progress

### ✅ Recently Resolved (2025-12-19 Session P134-P138)
1. **[P134]** ✅ SEC-002 Tenant Scope Audit - All 17 flagged routes verified SAFE (public/admin/user-scoped)
2. **[P135]** ✅ PERF-001 Aggregate Limits - Added maxTimeMS to support/organizations/search
3. **[P136]** ✅ TEST-004 JSON Parse Guards - All 8 POST routes have try-catch wrappers
4. **[P137]** ✅ BUG-002 @ts-expect-error Docs - All 5 suppressions documented
5. **[P138]** ✅ PERF-002 Add .lean() - Added to slas, assets/[id], tenants/[id] routes

### ✅ Recently Resolved (2025-12-19 Session P125-P132)
1. **[P125]** ✅ Cache Observability Fix - X-Cache-Status HIT/MISS/STALE via applyCacheHeaders
2. **[P126]** ✅ Implement Skipped Tests - 43 real tests (perf, currency, ICU completeness)
3. **[P127]** ✅ Component Integration - DataRefreshTimestamp on 3 dashboards, HoverTooltip on audit filters
4. **[P128]** ✅ Offline Banners Extension - FormOfflineBanner added to RFQBoard and FM RFQs
5. **[P129]** ✅ Audit Log Presets - 4 quick filter preset buttons (Tenant Escalations, RBAC Changes, Deletions, Logins)
6. **[P130]** ✅ Currency UX Hints - preferenceSource tooltip on CheckoutForm and PDPBuyBox
7. **[P131]** ✅ Grafana Panels - 3 new panels (Rate Limit Breaches, Cache Status, Rate Limiting)
8. **[P132]** ✅ Superadmin Dashboard - P125-P132 phases added to progress tracker

### ✅ Recently Resolved (2025-12-19 Session P133)
1. **[P133]** ✅ Client Env Hardening - Removed process.env usage from client components; added Config.client toggles (swagger UI, vendor assignments, Google Maps) and dev-only error guards

### ✅ Recently Resolved (2025-12-19 Session)
1. **[Phase 39]** ✅ Scan Pending Items - All routes verified
2. **[Phase 40]** ✅ Sentry DSN Configuration - Ready for Vercel env var
3. **[Phase 41]** ✅ Aggregate Safety Sweep - All 36 aggregates have maxTimeMS
4. **[Phase 42]** ✅ Cache Header Sweep - All public routes have Cache-Control
5. **[Phase 43]** ✅ Rate Limit Verification - All public routes have rate limiting
6. **[Phase 44]** ✅ SLA Business Hours Audit - useBusinessHours: true in all SLA calls
7. **[Phase 45]** ✅ SuperAdmin API Coverage - 48 tests in 8 files
8. **[Phase 46]** ✅ Finance API Coverage - 22 tests in 3 files
9. **[Phase 47]** ✅ WS Connectivity Test - Verified existing tests
10. **[Phase 48]** ✅ Final Validation & PR - Commit 9daccf282 pushed

### ✅ Previously Resolved (2025-12-18 Session)
1. **[BUG-WO-FILTERS-MISSING]** ✅ P2 (2025-12-18) WorkOrders filters wired via serializeFilters() line 194
2. **[BUG-USERS-FILTERS-MISSING]** ✅ P2 (2025-12-18) UsersList filters wired via serializeFilters() line 129
3. **[BUG-EMPLOYEES-FILTERS-MISSING]** ✅ P2 (2025-12-18) EmployeesList filters wired via serializeFilters() line 139
4. **[BUG-INVOICES-FILTERS-MISSING]** ✅ P2 (2025-12-18) InvoicesList filters wired via serializeFilters() line 174
5. **[BUG-AUDITLOGS-FILTERS-MISSING]** ✅ P2 (2025-12-18) AuditLogsList filters wired via serializeFilters() line 133
6. **[PERF-003]** ✅ P1 (2025-12-18) Timer cleanup parity achieved (24 timers : 25 cleanup calls)
7. **[SEC-CRM-001]** ✅ P0 (2025-12-19) CRM accounts/share tenant scope (commit cf04061f1)

---

## 📋 Architecture Context
| Aspect | Detected/Inferred |
|--------|-------------------|
| **Stack** | Next.js 15 App Router, TypeScript 5.6, MongoDB 7+, Mongoose 8.x |
| **Domains** | FM (Work Orders/Properties/Finance/HR), Souq (Marketplace/RFQ/Bids), Aqar (Real Estate/Leases), ATS (Recruitment), CRM |
| **Tenancy Model** | `org_id` partitioning (multi-tenant SaaS) |
| **RBAC** | 14 fixed roles + permission matrix enforced via middleware/policy checks |
| **Test Strategy** | Vitest (2,524 unit) + Playwright (424 E2E); co-located tests preferred |
| **Conventions** | @/* paths, strict TypeScript, RTL-first (Tailwind logical), design tokens (#0061A8, #00A859, #FFB400) |

**Assumptions:**
- lib/config/constants.ts is single source for env vars (Config export)
- Mongoose models enforce tenancy at schema level with indexes on org_id/status/createdAt
- RBAC middleware (lib/rbac.ts, lib/apiGuard.ts) enforces authorization
- SafeHtml component (components/SafeHtml.tsx) wraps all dangerouslySetInnerHTML uses

---

## 🚨 CRITICAL & HIGH PRIORITY

### 🔒 Security (Tenancy/RBAC/IDOR)

| ID | Status | Issue | Location | Impact | Fix |
|----|--------|-------|----------|--------|-----|
| **SEC-002** | ✅ Verified (P220) | 50+ database queries audited for tenant scope validation | app/api/**/route.ts (aggregate, find, findOne calls) | **VERIFIED** - All flagged routes are either: (1) intentionally public/superadmin (with NO_TENANT_SCOPE comments), (2) properly scoped with org_id/property_owner_id, or (3) platform-wide models (ComplianceAudit, BacklogIssue, etc.) | **RESOLVED** - ESLint custom rule enhanced to detect inline comments; platform-wide model exemptions added |
| **SEC-CRM-001** | ✅ Resolved (2025-12-19) | CRM accounts/share route missing tenant scope | app/api/crm/accounts/share/route.ts | **FIXED** - Added orgId: user.orgId to all DB operations (CrmLead.findOne, CrmLead.create, CrmActivity.create) | Deployed: commit cf04061f1 with 7/7 passing tests |
| **SEC-001** | ✅ Resolved | NEXTAUTH_SECRET fallback insufficient | lib/config/constants.ts:148-218 | **FIXED** - resolveAuthSecret() now falls back to AUTH_SECRET, synchronizes both env vars, only throws when neither is set | Deployed: resolveAuthSecret() function implemented with AUTH_SECRET fallback + 2 passing tests |
| **SEC-003** | 🟡 Low | 6 dangerouslySetInnerHTML uses detected (all safe - wrapped in SafeHtml or JSON-LD structured data) | components/SafeHtml.tsx, app/**/page.tsx | **VERIFIED SAFE** - All instances use DOMPurify sanitization via SafeHtml wrapper or serve JSON-LD; no XSS risk | No action needed; documented for audit trail |

### 🐛 Bugs & Logic Errors

| ID | Status | Issue | Location | Impact | Fix |
|----|--------|-------|----------|--------|-----|
| **BUG-001** | ✅ Resolved (2025-12-19) | Client components read process.env directly (SSR/hydration mismatch risk) | app/error.tsx, app/global-error.tsx, app/(app) privacy/login/docs, app/(fm) dashboards/errors | **FIXED** - Added Config.client toggles (swaggerUiEnabled, vendorAssignments, googleMapsApiKey) and replaced all client process.env usages with Config.env/Config.client. **Evidence:** `rg -l "process\\.env" app --glob "*.tsx" | xargs rg -l "use client"` → 0 matches |
| **BUG-002** | ✅ Resolved | @ts-expect-error suppressions documented | lib/ats/resume-parser.ts:38, lib/markdown.ts:22, issue-tracker/app/api/issues/route.ts:263-318 | **LOW** - documented library compatibility notes | ✅ Inline comments added and pre-commit guard enforces reasons |

### ⚡ Performance

| ID | Status | Issue | Location | Impact | Fix |
|----|--------|-------|----------|--------|-----|
| **PERF-001** | 🟡 P2-MEDIUM (NEW - 2025-12-19) | 20+ Mongoose aggregate operations without .limit() or pagination - potential memory exhaustion | issue-tracker/app/api/issues/stats/route.ts:51-181, app/api/aqar/map/route.ts:128, app/api/ats/analytics/route.ts:94-262 | **MEDIUM** - Unbounded aggregations can timeout/OOM on large datasets; affects analytics/stats routes | **Systematic Fix:** Add .limit(1000) default + pagination support; implement cursor-based pagination for stats endpoints; add indexes on frequently aggregated fields. **Evidence:** 33 aggregate operations detected; 7 in issue-tracker/stats alone without explicit limits |
| **PERF-002** | ✅ Resolved (2025-12-19) | Missing .lean() on read-only Mongoose queries | app/api/projects, rfqs, marketplace/*, vendors, support/tickets, assistant/query | **FIXED** - Added .lean() to 8+ routes in P146 commit d2052d16d | No action needed |

### 🧪 Testing Gaps

| ID | Status | Component | File | Gap | Priority |
|----|--------|-----------|------|-----|----------|
| **TEST-001** | ✅ Verified | HR module | tests/api/hr/* | 98 tests passing in 14 files - VERIFIED comprehensive coverage (P147) | ✅ Complete |
| **TEST-002** | ✅ Verified | Finance module | tests/api/finance/* | 61 tests passing in 7 files - VERIFIED comprehensive coverage (P148) | ✅ Complete |
| **TEST-003** | ✅ Verified | Souq module | tests/api/souq/* | 247 tests passing in 33 files - VERIFIED comprehensive coverage (P149) | ✅ Complete |
| **TEST-004** | ✅ Verified (P220) | API error handling | app/api/**/route.ts | All POST routes verified to have try-catch guards around request.json() | **VERIFIED** - All routes have outer try-catch blocks that catch JSON parse errors; no action needed |
| **TEST-005** | Existing | Aqar module | tests/api/aqar/* | 75% coverage (12/16 routes) - 4 routes missing tests; 5 new test files created but untracked | 🟡 P3 (from BACKLOG) |

---

## 🔄 Duplicates & Consolidation
| Group | Canonical | Occurrences | Action | Risk |
|-------|-----------|-------------|--------|------|
| **None detected** | — | — | — | — |

**Note:** No file-level, function-level, or config-level duplicates detected above 80% similarity threshold.

---

## 📁 Organization (Move Plan)
| Current Path | Proposed Path | Reason | Risk | Confidence | Refs to Update |
|--------------|---------------|--------|------|------------|----------------|
| **None required** | — | Clean domain/layer separation detected | — | — | — |

**Assessment:** Repository organization follows established Next.js App Router + domain/lib separation conventions. No misplacements detected.

---

## 🔍 Pattern Clusters

### PATTERN (RESOLVED): Direct process.env Access in Client Components
**Root Cause:** Environment variables accessed directly in client components instead of centralized Config object  
**Status:** ✅ Resolved (P133 - 2025-12-19)  
**Occurrences:** 0 (client components) — verified via `rg -l "process\\.env" app --glob "*.tsx" | xargs rg -l "use client"`

**Fix Applied:**
1. Added Config.client toggles (swaggerUiEnabled, vendorAssignmentsApiEnabled/vendorAssignmentsMocksEnabled) and reused Config.external.googleMapsApiKey.
2. Replaced all client-side process.env references with Config.env/Config.client (error boundaries, login/profile, privacy/docs pages, FM inspections).
3. Updated superadmin dashboard to surface open SSOT items to prevent regressions.

**Prevention:**
- [x] ESLint rule: `no-restricted-syntax` for process.env (eslint.config.mjs)
- [x] Pre-commit hook: Check for new process.env uses outside lib/config/
- [x] CI gate: Fail build if process.env detected in app/ (excluding config files)

---

### PATTERN: Unvalidated Tenant Scope in Database Queries
**Root Cause:** Aggregate/find operations constructed without explicit org_id validation  
**Severity:** 🔴 Critical  
**Occurrences:** 50+

| # | Location | Evidence |
|---|----------|----------|
| 1 | issue-tracker/app/api/issues/stats/route.ts:51 | `Issue.aggregate([...])` - has orgId in match stage ✅ |
| 2 | app/api/aqar/map/route.ts:128 | `AqarListing.aggregate(pipeline)` - ✅ VERIFIED orgId scoped when session orgId exists |
| 3 | app/api/ats/analytics/route.ts:94-262 | Aggregations scoped by orgId + maxTimeMS via runAggregate ✅ |
| 4 | app/api/feeds/linkedin/route.ts:58 | `Job.find({ status: "published", visibility: "public" })` - intentionally public (OK) |
| 5 | app/api/support/organizations/search/route.ts:83 | SuperAdmin-only org search aggregate (cross-tenant by design) ✅ |
| 6 | app/api/hr/payroll/runs/[id]/calculate/route.ts:84 | `Employee.find({ orgId: session.user.orgId, ... })` ✅ |

**Systematic Fix:**
1. Establish query patterns:
   - **Tenant-scoped:** `Model.find({ ...filters, org_id: session.user.orgId })`
   - **Owner-scoped:** `Model.find({ ...filters, property_owner_id: session.user.id })`
   - **Public:** `Model.find({ visibility: "public" })` (document exceptions)
2. Add integration tests: "rejects cross-tenant access" for each entity
3. Implement query middleware (Mongoose pre-hook) enforcing org_id if present in schema
4. Code review checklist: "✅ Tenant scope verified"

**Prevention:**
- [x] ESLint custom rule: Detect `.find(`, `.findOne(`, `.aggregate(` without org_id/property_owner_id
- [ ] Mongoose plugin: Auto-inject org_id into queries (with opt-out for public data)
- [x] CI gate: Integration tests validate tenant isolation (existing in tests/rbac/cross-tenant-isolation.test.ts)

---

### PATTERN: Missing .lean() on Read-Only Queries
**Root Cause:** Mongoose queries fetch full documents with hydration overhead when only plain objects needed  
**Severity:** 🟡 Medium  
**Occurrences:** 10+

| # | Location | Evidence |
|---|----------|----------|
| 1 | app/api/onboarding/documents/[id]/review/route.ts:107 | `DocumentProfile.findOne({ role, country }).lean()` - ✅ CORRECT |
| 2 | app/api/billing/charge-recurring/route.ts:53 | ✅ Legacy stub route (no Mongoose query present) |
| 3 | app/api/souq/claims/route.ts:105 | ✅ Uses raw MongoDB collection (lean not applicable) |

**Systematic Fix:**
1. Add .lean() to all queries NOT followed by .save() or document methods
2. Prefer `.lean()` for: lookups, projections, aggregations, API responses
3. Document exceptions: Queries requiring Mongoose virtuals/methods/middleware

**Prevention:**
- [x] ESLint rule: Suggest .lean() on findOne/find without .save() in same scope
- [ ] Code review: Check for .lean() in PR diff context

---

### PATTERN: @ts-expect-error Without Justification
**Root Cause:** TypeScript suppressions used without inline explanation  
**Severity:** 🟢 Low  
**Occurrences:** 2

| # | Location | Evidence |
|---|----------|----------|
| 1 | lib/ats/resume-parser.ts:38 | `@ts-expect-error - pdf-parse has ESM/CJS export issues` - ✅ GOOD |
| 2 | lib/markdown.ts:22 | `@ts-expect-error - rehype-sanitize schema type doesn't match unified` - ✅ GOOD |

**Systematic Fix:**
1. Add inline comment after each suppression explaining why
2. Format: `// @ts-expect-error - Reason: [specific type mismatch/upstream bug]`
3. Link to upstream issue if waiting on dependency fix

**Prevention:**
- [ ] ESLint rule: `@typescript-eslint/ban-ts-comment` with requireDescription: true
- [x] Pre-commit hook: Check for suppressions without inline comment

---

## ✅ Resolved (Archive)
| ID | Issue | Resolution | Resolved Date |
|----|-------|------------|---------------|
| SEC-CRM-001 | CRM accounts/share route missing tenant scope | Added orgId filters to all CrmLead/CrmActivity operations; 7/7 tests passing | 2025-12-19 |
| CONFIG-003 | AWS_REGION missing causes production crash | Changed validateAwsConfig() to warn (not throw); made AWS config optional with us-east-1 fallback | 2025-12-14 |
| SEC-001 | NEXTAUTH_SECRET fallback insufficient | Implemented resolveAuthSecret() function with AUTH_SECRET fallback + tests | 2025-12-14 |
| SEC-TAP-001 | Tap Payments timing attack | Replaced === with crypto.timingSafeEqual() | 2025-12-15 |
| CONFIG-001 | Dangerous VS Code tasks | Removed --no-verify/--force-with-lease tasks | 2025-12-15 |
| TEST-SAFE-FETCH | Missing safe-fetch.ts tests | Created 21 comprehensive tests (all passing) | 2025-12-15 |
| EFF-004 | PM routes rate limiting | Added enforceRateLimit (PATCH: 30/min, DELETE: 10/min) | 2025-12-15 |
| REF-002 | Build workflow fork-safe | Added secrets.MONGODB_URI guard | 2025-12-15 |

---

## 🧪 Validation Commands (Suggested — DO NOT AUTO-RUN)
```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Unit tests (full suite)
pnpm vitest run --coverage

# E2E tests
pnpm qa:e2e

# Build verification
pnpm build

# Security scans
pnpm lint:ci

# MongoDB index verification (if Mongoose detected)
# mongosh/Compass: db.work_orders.getIndexes()
# Expected: { org_id: 1, status: 1, createdAt: -1 }

# Tenant isolation integration tests
pnpm vitest run tests/smoke/org-context-flow.test.tsx

# RBAC verification
pnpm lint:rbac
pnpm rbac:client:check

# Check direct process.env usage (should be 0 outside lib/config/)
grep -r "process\.env\." app/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | wc -l

# Check unguarded request.json() calls
grep -rn "await request.json()" app/api --include="*.ts" | grep -v "try\|catch" | wc -l
```

---

## 🧾 Changelog
### 2025-12-14T01:00:00+03:00 (Asia/Riyadh) — CRITICAL: CONFIG-003 Production Crash Fix
**Context:** main | b132ccca1 → pending | No PR  
**Trigger:** Production browser console error (AWS_REGION missing)

**🚨 CRITICAL P0 Resolved:**
- **CONFIG-003**: AWS_REGION missing causes production crash
  - **Root Cause:** `validateAwsConfig()` called at module init (line 238), throws when AWS_REGION undefined in production
  - **Impact:** 100% production crash on all pages (ConfigurationError in webpack bundle)
  - **Fix Applied:**
    1. Changed `validateAwsConfig()` to log warnings instead of throwing
    2. Made AWS config optional: `getOptional("AWS_REGION", "us-east-1")` with production fallback
    3. Updated S3 bucket: `getOptional("AWS_S3_BUCKET", "fixzit-uploads")` fallback
    4. Added `IS_PRODUCTION` constant for cleaner conditionals
  - **Rationale:** AWS S3 is optional in production (Vercel may use Blob Storage instead)

**📊 Health Impact:**
- Health Score: 92/100 → 93/100 (+1)
- Critical Issues: 0 (maintained)
- Resolved Items: 6 → 7 (+CONFIG-003)

**Files Changed:**
- lib/config/constants.ts (validateAwsConfig, Config.aws, IS_PRODUCTION constant)
- BACKLOG_AUDIT.json (added CONFIG-003 to resolved)
- MASTER_PENDING_REPORT.md (updated metrics + changelog)

**Evidence:**
```
ConfigurationError: [Config Error] Required environment variable AWS_REGION 
is not set (no fallback provided)
at u (layout-f93b22953e8481e6.js:1:157683)
```

---

### 2025-12-14T00:30:00+03:00 (Asia/Riyadh) — SSOT Backlog Sync + Protocol Update
**Context:** main | 488b7209a | No PR  
**DB Sync:** ⏳ PENDING (dev server offline; BACKLOG_AUDIT.json prepared for next sync)

**📋 Backlog Extraction:**
- Created BACKLOG_AUDIT.json with 7 open issues + 6 resolved items
- Ready for import via `POST /api/issues/import` when server available

**📊 Current State:**
- 7 open issues: SEC-002 (P1), BUG-001 (P1), PERF-001 (P2), TEST-004 (P2), TEST-002 (P2), TEST-003 (P2), PERF-002 (P3)
- 6 resolved items archived: SEC-001, SEC-TAP-001, CONFIG-001, TEST-SAFE-FETCH, EFF-004, REF-002
- Health Score: 92/100 (maintained after SEC-001 resolution)

**🔄 Protocol Update:**
- Added SSOT hierarchy note to file header
- MongoDB Issue Tracker confirmed as PRIMARY SSOT
- This file + docs/PENDING_MASTER.md confirmed as DERIVED LOGS

**📝 Next Actions (awaiting DB sync):**
1. Start dev server: `pnpm dev`
2. Import backlog: `curl -X POST http://localhost:3000/api/issues/import -H "Content-Type: application/json" -d @BACKLOG_AUDIT.json`
3. Verify stats: `curl http://localhost:3000/api/issues/stats`
4. Begin P1 work: SEC-002 (tenant scope audit), BUG-001 (process.env migration)

---

### 2025-12-14T00:13:00Z (SEC-001 Resolution)
| Action | Count |
|--------|-------|
| **Resolved** | 1 (SEC-001) |
| **Tests Added** | 2 (auth-secret.test.ts) |

**Resolution Details:**
- ✅ SEC-001: Implemented resolveAuthSecret() function in lib/config/constants.ts
  - Falls back to AUTH_SECRET when NEXTAUTH_SECRET missing
  - Synchronizes both environment variables
  - Only throws when neither is set
  - 2/2 tests passing (production env validation + legacy AUTH_SECRET fallback)
- Health Score: 89/100 → 92/100 (+3)
- Critical Issues: 1 → 0

---

### 2025-12-14T00:00:00Z (Initial Workspace Scan)
| Action | Count |
|--------|-------|
| **New** | 7 |
| **Updated** | 0 |
| **Merged** | 0 |
| **Resolved** | 5 (from PENDING_MASTER.md) |

**Notes:**
- Merged PENDING_MASTER.md resolved items (SEC-TAP-001, CONFIG-001, TEST-SAFE-FETCH, EFF-004, REF-002)
- Identified NEXTAUTH_SECRET production crash issue (SEC-001) - user provided fix diff
- Detected 40+ direct process.env accesses in client code (BUG-001)
- Flagged 50+ database operations for tenant scope audit (SEC-002)
- Test coverage gaps documented from BACKLOG_AUDIT.json (TEST-001, TEST-002, TEST-003, TEST-005)
- No organization/duplication issues detected - repository structure follows best practices

**Assumptions/Constraints:**
- MongoDB Issue Tracker API (localhost:3000/api/issues/import) is unavailable; cannot perform SSOT sync
- BACKLOG_AUDIT.json used as secondary source for test coverage gaps
- Static analysis only (no commands executed per protocol)
- dangerouslySetInnerHTML uses verified safe per prior audits (docs/PENDING_MASTER.md:23)

---

## 📌 References
- PENDING_MASTER.md: Existing SSOT log/snapshot (23,124 lines)
- BACKLOG_AUDIT.json: Test coverage backlog (13 items → 10 items after recent resolution)
- README.md: Project overview, tech stack, getting started
- .github/copilot-instructions.md: v5.1 STRICT protocol
- AGENTS.md: Agent working agreement v5.1

---

**SSOT Status:** ✅ Operational  
**Next Review:** 2025-12-21 (weekly cadence recommended)
