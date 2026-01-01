# Backlog Audit (v2.5)
- Extracted: 2026-01-01 08:18 (Asia/Riyadh)
- Extracted By: [AGENT-003-B]
- Source: docs/PENDING_MASTER.md
- Total Issues: 1847
- Quick Wins (XS/S): 43
- Anomalies: 0

## Category Breakdown
| Category | Count |
| --- | --- |
| Next Steps | 1305 |
| Missing Tests | 290 |
| Logic Errors | 42 |
| Efficiency | 84 |
| Bugs | 126 |

## Priority Breakdown
| Priority | Count |
| --- | --- |
| P2 | 1576 |
| P1 | 107 |
| P0 | 113 |
| P3 | 51 |

## File Heat Map (Top 10)
| File | Count |
| --- | --- |
| lib/graphql/index.ts | 14 |
| services/souq/seller-kyc-service.ts | 9 |
| app/api/fm/finance/budgets/route.ts | 9 |
| /route.ts | 4 |
| docs/PENDING_MASTER.md | 4 |
| app/api/souq/seller-central/kyc/submit/route.ts | 4 |
| app/api/souq/reviews/route.ts | 4 |
| app/api/fm/utils/tenant.ts | 3 |
| lib/config/tenant.ts | 3 |
| lib/config/tenant.server.ts | 3 |

## Sprint Buckets
| Bucket | Count |
| --- | --- |
| P0 (Now) | 113 |
| P1 (Next) | 107 |
| P2 (Soon) | 1576 |
| P3 (Later) | 51 |

## Next Steps
| Key | Priority | Effort | Impact | Status | Location | Title | SourceRef |
| --- | --- | --- | --- | --- | --- | --- | --- |
| security-clean-no-vulnerabilities-found-next-steps-doc-only | P0 | ? | 10 | unknown | Doc-only | **Security:** ✅ Clean - no vulnerabilities found | 🎯 Codebase Status |
| tests-unit-security-multi-tenant-isolation-test-ts-next-steps-tests-unit-securit | P0 | ? | 10 | unknown | tests/unit/security/multi-tenant-isolation.test.ts | `tests/unit/security/multi-tenant-isolation.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| logged-next-steps-tests-unit-security-encryption-test-ts | P0 | ? | 10 | pending | tests/unit/security/encryption.test.ts | 🔶 Logged | 🔍 Deep-Dive Analysis of Similar Issues |
| lib-security-cors-allowlist-ts-intentional-cors-whitelist-next-steps-lib-securit | P0 | ? | 10 | unknown | lib/security/cors-allowlist.ts | `lib/security/cors-allowlist.ts` - INTENTIONAL CORS whitelist | Pattern: Hardcoded localhost URLs |
| broaden-regression-tests-cross-tenant-unitid-for-budgets-kyc-rbac-vendor-negativ | P0 | ? | 10 | unknown | Doc-only | Broaden regression tests: cross-tenant/unitId for budgets; KYC RBAC/vendor negatives; FM expenses response payload and org/unit assertions. | 🔜 Planned Next Steps |
| tests-unit-api-fm-finance-budgets-test-ts-add-unitid-required-post-path-and-cros | P0 | ? | 10 | unknown | tests/unit/api/fm/finance/budgets.test.ts | `tests/unit/api/fm/finance/budgets.test.ts` — Add unitId-required POST path and cross-tenant rejection. | 🛠️ Enhancements Needed for Production Readiness |
| app-api-fm-utils-tenant-ts-35-52-cannot-emit-unit-scope-cross-unit-leakage-next- | P0 | ? | 10 | unknown | app/api/fm/utils/tenant.ts:35-52 | `app/api/fm/utils/tenant.ts:35-52` — cannot emit unit scope; cross-unit leakage. | 🔎 Deep-Dive Analysis (Similar/Repeated Issues) |
| rbac-tenant-guard-gap-kyc-submit-route-lacks-seller-vendor-rbac-service-lookup-i | P0 | ? | 10 | pending | Doc-only | **RBAC/tenant guard gap** — KYC submit route lacks seller/vendor RBAC; service lookup is org-only, enabling cross-seller submission. | 🔎 Deep-Dive Analysis (Similar Issues) |
| super-admin-cross-tenant-mode-post-budgets-should-continue-to-reject-cross-tenan | P0 | ? | 10 | unknown | Doc-only | Super Admin cross-tenant mode: POST budgets should continue to reject cross-tenant marker; confirm helper emits explicit error for write paths. | 🛠️ Enhancements Needed for Production Readiness |
| gate-super-admin-cross-tenant-fm-budgets-listing-currently-empty-filter-when-ten | P0 | ? | 10 | unknown | Doc-only | Gate super-admin cross-tenant FM budgets listing (currently empty filter when tenantId is cross marker). | 📍 Current Progress & Planned Next Steps |
| app-api-fm-finance-budgets-route-ts-191-205-when-super-admin-resolves-to-cross-t | P0 | ? | 10 | unknown | app/api/fm/finance/budgets/route.ts:191-205 | `app/api/fm/finance/budgets/route.ts:191-205` — When Super Admin resolves to cross-tenant marker, `buildTenantFilter` returns `{}` and unit scope allows empty set; GET can enumerate all budgets without explicit tenant selection. Add explicit 400 unless tenantId + unitId provided. | 🛠️ Enhancements Needed for Production Readiness |
| super-admin-cross-tenant-gap-for-fm-budgets-cross-tenant-marker-yields-query-wit | P0 | ? | 10 | pending | Doc-only | **Super Admin cross-tenant gap**: For FM budgets, cross-tenant marker yields `{}` query; without explicit tenant+unit selection, a Super Admin could list all budgets. Requires explicit gating or tenant selection. | 🔎 Deep-Dive Analysis (Similar Issues) |
| copilot-strict-failures-remain-layout-overlay-tenant-isolation-personal-intent-s | P0 | ? | 10 | unknown | Doc-only | Copilot STRICT failures remain (layout overlay + tenant isolation + PERSONAL intent): surfaced during `pnpm test`; requires targeted fixes in copilot UI/RBAC before CI can pass. | 🛠️ Enhancements Needed (Production Readiness) |
| add-deterministic-success-paths-and-coverage-for-rate-limit-cross-tenant-rejecti | P0 | ? | 10 | unknown | Doc-only | Add deterministic success paths and coverage for rate-limit, cross-tenant rejection, and vendor scoping in related tests. | 📍 Current Progress & Planned Next Steps |
| lib-security-monitoring-ts-224-next-steps-lib-security-monitoring-ts-224 | P0 | ? | 10 | unknown | lib/security/monitoring.ts:224 | `lib/security/monitoring.ts:224` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| security-next-steps-assistant-query-route-ts-259 | P0 | ? | 10 | pending | assistant/query/route.ts:259 | Security | 🔴 P0 — Critical (Security/Data Integrity) |
| security-next-steps-pm-plans-route-ts-42 | P0 | ? | 10 | pending | pm/plans/route.ts:42 | Security | 🔴 P0 — Critical (Security/Data Integrity) |
| security-next-steps-vendors-route-ts-214 | P0 | ? | 10 | pending | vendors/route.ts:214 | Security | 🔴 P0 — Critical (Security/Data Integrity) |
| p0-next-steps-tenant-server-ts | P0 | ? | 10 | pending | tenant.server.ts | **P0** | 📋 Planned Next Steps |
| 98-next-steps-doc-only | P0 | ? | 10 | pending | Doc-only | 98% | 📈 Production Readiness Scorecard (v61.0) |
| explicit-orgid-filter-in-query-prevents-cross-tenant-access-next-steps-doc-only | P0 | ? | 10 | unknown | Doc-only | Explicit `orgId` filter in query prevents cross-tenant access | Fix 3: GraphQL TODO Stubs Implementation |
| 95-next-steps-doc-only | P0 | ? | 10 | pending | Doc-only | 95% | 📊 Production Readiness Score |
| impact-security-verification-next-steps-doc-only | P0 | ? | 10 | unknown | Doc-only | Impact: Security verification | 2. Careers Page XSS Review |
| app-api-webhooks-taqnyat-route-ts-next-steps-app-api-webhooks-taqnyat-route-ts | P0 | ? | 10 | unknown | app/api/webhooks/taqnyat/route.ts | `app/api/webhooks/taqnyat/route.ts` | 🔍 Deep-Dive: Similar Issues Found Elsewhere |
| merge-pr-fix-graphql-resolver-todos-next-steps-doc-only | P0 | ? | 10 | pending | Doc-only | Merge PR `fix/graphql-resolver-todos` | 🎯 Planned Next Steps |
| identified-rate-limiting-gaps-next-steps-doc-only | P0 | ? | 10 | pending | Doc-only | Identified rate limiting gaps | Completed This Session |
| tests-security-org-enforcement-test-ts-new-8-tests-next-steps-tests-security-org | P0 | ? | 10 | unknown | tests/security/org-enforcement.test.ts | `tests/security/org-enforcement.test.ts` - NEW: 8 tests | 📋 Session Files Changed |
| tests-security-error-boundary-test-ts-new-3-tests-next-steps-tests-security-erro | P0 | ? | 10 | unknown | tests/security/error-boundary.test.ts | `tests/security/error-boundary.test.ts` - NEW: 3 tests | 📋 Session Files Changed |
| tests-security-zod-validation-test-ts-new-5-tests-next-steps-tests-security-zod- | P0 | ? | 10 | unknown | tests/security/zod-validation.test.ts | `tests/security/zod-validation.test.ts` - NEW: 5 tests | 📋 Session Files Changed |
| server-security-ratelimit-smartratelimit-mockfn-next-steps-doc-only | P0 | ? | 10 | unknown | Doc-only | `@/server/security/rateLimit` → `{ smartRateLimit: mockFn }` | Pattern: Rate Limiting Mock Requirements |
| server-security-headers-getclientip-vi-fn-next-steps-doc-only | P0 | ? | 10 | unknown | Doc-only | `@/server/security/headers` → `{ getClientIP: vi.fn() }` | Pattern: Rate Limiting Mock Requirements |
| graphql-workorder-query-lacks-org-filter-next-steps-lib-graphql-index-ts-769-801 | P0 | ? | 10 | pending | lib/graphql/index.ts:769-801 | GraphQL `workOrder` query lacks org filter | 🔧 Enhancements & Production Readiness |
| graphql-createworkorder-writes-with-userid-fallback-next-steps-lib-graphql-index | P0 | ? | 10 | pending | lib/graphql/index.ts:936-1052 | GraphQL `createWorkOrder` writes with userId fallback | 🔧 Enhancements & Production Readiness |
| user-id-as-orgid-fallbacks-recur-across-graphql-createworkorder-souq-review-post | P0 | ? | 10 | unknown | Doc-only | User-id-as-orgId fallbacks recur across GraphQL createWorkOrder, Souq review POST, and Aqar listings/packages/favorites, risking cross-tenant writes and orgId type drift. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| user-id-as-orgid-fallbacks-repeat-across-graphql-createworkorder-souq-review-pos | P0 | ? | 10 | unknown | Doc-only | User-id-as-orgId fallbacks repeat across GraphQL createWorkOrder, Souq review POST, Aqar listings/packages/favorites, causing cross-tenant writes and orgId type drift. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| wrap-json-parse-in-safe-utility-next-steps-doc-only | P0 | ? | 10 | pending | Doc-only | Wrap JSON.parse in safe utility | 🎯 Planned Next Steps (Priority Order) |
| lib-security-monitoring-ts-security-events-next-steps-lib-security-monitoring-ts | P0 | ? | 10 | unknown | lib/security/monitoring.ts | ✅ `lib/security/monitoring.ts` — Security events | 3. Sentry Observability Gaps |
| impact-tenants-scoped-to-userid-instead-of-org-id-unit-id-risks-cross-tenant-rea | P0 | ? | 10 | unknown | Doc-only | **Impact:** Tenants scoped to userId instead of `{ org_id, unit_id }`; risks cross-tenant reads. | 🔴 Multi-Tenancy & Data Scoping |
| lib-security-ip-reputation-ts-next-steps-lib-security-ip-reputation-ts | P0 | ? | 10 | unknown | lib/security/ip-reputation.ts | `lib/security/ip-reputation.ts` | Pattern 3: Test Coverage Gaps |
| x-security-no-hardcoded-secrets-next-steps-doc-only | P0 | ? | 10 | unknown | Doc-only | [x] Security: No hardcoded secrets | 7) PRODUCTION READINESS CHECKLIST |
| security-scan-all-clear-next-steps-doc-only | P0 | ? | 10 | unknown | Doc-only | ✅ Security scan: All clear | 8) SESSION SUMMARY |
| dangerouslysetinnerhtml-security-review-next-steps-doc-only | P0 | ? | 10 | unknown | Doc-only | ✅ dangerouslySetInnerHTML security review | 1) CURRENT PROGRESS |
| resolve-github-actions-quota-billing-next-steps-doc-only | P0 | ? | 10 | pending | Doc-only | Resolve GitHub Actions quota (billing) | 2) PLANNED NEXT STEPS |
| next-extend-safe-parser-to-remaining-finance-hr-routes-regenerate-lock-via-pnpm- | P0 | ? | 10 | unknown | Doc-only | Next: extend safe parser to remaining finance/HR routes, regenerate lock via `pnpm install`, then run `pnpm typecheck && pnpm lint && pnpm test`; add payroll RBAC tests and finance negative cases (expenses, payments actions). | 📈 Progress & Planned Next Steps |
| safe-parser-applied-to-finance-hr-routes-accounts-root-id-expenses-payments-root | P0 | ? | 10 | unknown | Doc-only | Safe parser applied to finance/HR routes (accounts root/id, expenses, payments root/actions, HR leaves, payroll runs); tenancy/RBAC fixes from earlier session retained. | 📈 Progress & Planned Next Steps |
| missing-tests-add-negative-json-tests-for-expenses-payments-root-actions-hr-leav | P0 | ? | 10 | pending | Doc-only | **Missing Tests:** Add negative JSON tests for expenses, payments (root/actions), HR leaves PUT; add payroll RBAC tests; add lockfile guard to fail on SQL/Prisma/knex/pg/mysql reintroduction. | 🧩 Enhancements (Prod Readiness) |
| copilot-strict-layout-tenant-isolation-still-red-must-fix-overlay-positioning-an | P0 | ? | 10 | unknown | Doc-only | Copilot STRICT layout/tenant isolation still red; must fix overlay positioning and RBAC guards before CI green. | 🛠️ Enhancements Needed (Production Readiness) |
| rate-limiting-payments-4-routes-next-steps-doc-only | P1 | ? | 10 | pending | Doc-only | Rate limiting: Payments (4 routes) | 🔲 Planned Next Steps |
| p0-fix-rate-limit-test-assertions-check-if-routes-actually-implement-rate-limiti | P0 | ? | 9 | unknown | Doc-only | **P0**: Fix rate limit test assertions (check if routes actually implement rate limiting) | 2025-12-23 12:00 (Asia/Riyadh) — File Migration Verification & TypeScript Fixes |
| priority-from-text-patterns-p0-critical-p1-high-etc-next-steps-doc-only | P0 | ? | 9 | unknown | Doc-only | Priority from text patterns (P0/critical, P1/high, etc.) | 🛠️ CLI Enhancements (v65.19) |
| priority-breakdown-cards-p0-p3-counts-next-steps-doc-only | P0 | ? | 9 | unknown | Doc-only | ✅ Priority breakdown cards (P0-P3 counts) | List Page (`app/admin/issues/page.tsx`) |
| x-rbac-enforced-via-auth-flags-next-steps-doc-only | P0 | ? | 9 | unknown | Doc-only | [x] RBAC: Enforced via auth flags | 📋 Files Modified |
| enforced-vendor-context-in-kyc-tests-and-ensured-parsebodysafe-compatibility-kyc | P0 | ? | 9 | unknown | tests/unit/api/souq/seller-central/kyc-submit.test.ts | Enforced vendor context in KYC tests and ensured parseBodySafe compatibility; KYC submit tests now pass strictly (tests/unit/api/souq/seller-central/kyc-submit.test.ts). | 🛠️ Enhancements Needed for Production Readiness |
| apply-vendor-rbac-guard-and-vendorid-scoping-directly-in-kyc-submit-route-servic | P0 | ? | 9 | unknown | Doc-only | Apply vendor RBAC guard and vendorId scoping directly in KYC submit route/service to mirror test expectations end-to-end. | 🔜 Planned Next Steps |
| tightened-kyc-submit-happy-path-expectations-to-require-200-nextstep-tests-unit- | P0 | ? | 9 | unknown | tests/unit/api/souq/seller-central/kyc-submit.test.ts:145-238 | Tightened KYC submit happy-path expectations to require 200 + `nextStep` (tests/unit/api/souq/seller-central/kyc-submit.test.ts:145-238); run validated. | 🛠️ Enhancements Needed for Production Readiness |
| reconfirmed-route-gaps-missing-seller-rbac-vendor-guard-in-kyc-submit-app-api-so | P0 | ? | 9 | pending | app/api/souq/seller-central/kyc/submit/route.ts:15-78 | Reconfirmed route gaps: missing seller RBAC/vendor guard in KYC submit (app/api/souq/seller-central/kyc/submit/route.ts:15-78); org-only FM budget filters (app/api/fm/finance/budgets/route.ts:119-129,200-207). | 🔎 Deep-Dive Analysis (Similar Issues) |
| add-seller-vendor-rbac-guard-and-vendor-id-scoping-to-kyc-submit-sellerkycservic | P0 | ? | 9 | unknown | Doc-only | Add seller/vendor RBAC guard and vendor_id scoping to KYC submit + sellerKYCService. | 📍 Current Progress & Planned Next Steps |
| test-coverage-add-unit-tests-for-json-parse-rejection-fm-cross-unit-kyc-rbac-nex | P0 | ? | 9 | unknown | Doc-only | **Test Coverage:** Add unit tests for JSON-PARSE rejection, FM cross-unit, KYC RBAC | 🎯 Recommended Next Steps |
| apply-rbac-vendor-ownership-guard-to-souq-kyc-submit-route-align-sellerkycservic | P0 | ? | 9 | unknown | Doc-only | Apply RBAC/vendor ownership guard to Souq KYC submit route; align sellerKYCService with vendor_id scoping and staged approvals. | 📍 Current Progress & Planned Next Steps |
| souq-kyc-rbac-tests-fm-budgets-unit-scope-typecheck-lint-triage-started-next-ste | P0 | ? | 9 | in_progress | Doc-only | Souq KYC RBAC+tests; FM budgets unit scope; typecheck/lint triage started | 📍 Progress & Planned Next Steps |
| souq-kyc-submit-seller-only-rbac-guard-company-info-no-longer-auto-approves-vend | P0 | ? | 9 | unknown | Doc-only | Souq KYC submit: seller-only RBAC guard; company_info no longer auto-approves; vendorId passed into service; unit tests tightened and passing. | 📍 Progress & Planned Next Steps |
| rbac-gaps-on-sensitive-routes-souq-kyc-submit-lacked-seller-role-guard-similar-t | P0 | ? | 9 | pending | Doc-only | **RBAC gaps on sensitive routes**: Souq KYC submit lacked seller-role guard similar to past marketplace payout/reviews routes. Pattern: routes relying solely on `auth()` without `hasAnyRole`/RBAC context allow unauthorized mutations. | 🔎 Deep-Dive Analysis (Similar/Identical Issue Patterns) |
| standardized-hr-module-rbac-with-hasallowedrole-helper-7-routes-next-steps-doc-o | P0 | ? | 9 | unknown | Doc-only | Standardized HR module RBAC with hasAllowedRole() helper (7 routes) | 📍 Summary |
| confirmed-souq-kyc-route-uses-rbac-vendor-only-and-service-enforces-vendor-owner | P0 | ? | 9 | unknown | Doc-only | Confirmed Souq KYC route uses RBAC (vendor-only) and service enforces vendor ownership + `in_review` status progression. | 📍 Current Progress & Planned Next Steps |
| test-coverage-gaps-current-unit-tests-allow-200-500-in-souq-kyc-and-lack-unit-sc | P0 | ? | 9 | pending | Doc-only | **Test coverage gaps**: Current unit tests allow `[200,500]` in Souq KYC and lack unit-scope assertions in FM budgets, masking regressions in scoping and RBAC. | 🔎 Deep-Dive Analysis (Similar Issues) |
| add-seller-vendor-rbac-guard-and-vendor-id-scoping-to-souq-kyc-submission-route- | P0 | ? | 9 | unknown | Doc-only | Add seller/vendor RBAC guard and vendor_id scoping to Souq KYC submission route + service; align with marketplace role matrix. | 📍 Current Progress & Planned Next Steps |
| app-api-souq-seller-central-kyc-submit-route-ts-24-67-no-server-side-role-rbac-g | P0 | ? | 9 | unknown | app/api/souq/seller-central/kyc/submit/route.ts:24-67 | `app/api/souq/seller-central/kyc/submit/route.ts:24-67` — No server-side role/RBAC guard; any authenticated user with orgId can submit seller KYC. Action: wrap with seller/vendor role guard and reject non-seller roles at the route. | 🔎 Deep-Dive Analysis (Similar/Repeated Issues) |
| lib-ats-rbac-ts-106-next-steps-lib-ats-rbac-ts-106 | P0 | ? | 9 | unknown | lib/ats/rbac.ts:106 | `lib/ats/rbac.ts:106` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| p0-review-graphql-todo-stubs-decide-if-full-implementation-needed-or-remove-next | P0 | ? | 9 | pending | Doc-only | **P0**: Review GraphQL TODO stubs - Decide if full implementation needed or remove | 📋 Next Steps (Priority Order) |
| close-stale-draft-prs-539-544-next-steps-doc-only | P0 | ? | 9 | pending | Doc-only | Close stale draft PRs (539-544) | 🔲 Planned Next Steps |
| commit-push-p1-rate-limiting-next-steps-doc-only | P0 | ? | 9 | pending | Doc-only | Commit & push P1 rate limiting | 🔲 Planned Next Steps |
| close-stale-draft-prs-540-544-next-steps-doc-only | P0 | ? | 9 | pending | Doc-only | Close stale draft PRs (540-544) | 🔲 Planned Next Steps |
| run-pnpm-typecheck-pnpm-lint-pnpm-test-next-steps-doc-only | P0 | ? | 9 | pending | Doc-only | Run `pnpm typecheck && pnpm lint && pnpm test` | 📋 PLANNED NEXT STEPS |
| commit-staged-changes-next-steps-doc-only | P0 | ? | 9 | pending | Doc-only | Commit staged changes | 📋 PLANNED NEXT STEPS |
| push-local-commit-70fab2816-next-steps-doc-only | P0 | ? | 9 | pending | Doc-only | Push local commit `70fab2816` | 🎯 Planned Next Steps |
| progress-master-report-updated-tenancy-rbac-fixes-and-safe-json-parsing-rolled-o | P0 | ? | 9 | unknown | Doc-only | Progress: Master report updated; tenancy/RBAC fixes and safe JSON parsing rolled out to key finance/HR routes; SQL/Prisma instrumentation pruned from lock; no commands run (per no-exec policy). | 📈 Progress & Planned Next Steps |
| next-steps-run-full-pnpm-typecheck-pnpm-lint-pnpm-vitest-run-to-reconfirm-gates- | P0 | ? | 9 | unknown | Doc-only | Next steps: Run full `pnpm typecheck && pnpm lint && pnpm vitest run` to reconfirm gates after KYC/budget changes; audit finance budget routes for org scoping + RBAC and align mocks across seller-central tests; expand KYC integration coverage if upstream routes change. | 📍 Current Progress & Planned Next Steps |
| issue-tracker-model-virtuals-age-isstale-typings-missing-effort-priority-enums-m | P0 | L | 9 | pending | Doc-only | issue-tracker model virtuals: `age`/`isStale` typings missing, effort/priority enums mismatched in model methods (P0/L not allowed by types). | 🛠️ Enhancements Needed for Production Readiness |
| p0-next-steps-doc-only | P0 | S | 9 | in_progress | Doc-only | 🔴 P0 | 📋 Planned Next Steps |
| rate-limiting-auth-12-routes-next-steps-doc-only | P1 | ? | 9 | pending | Doc-only | Rate limiting: Auth (12 routes) | 🔲 Planned Next Steps |
| p1-add-priority-module-tests-souq-settlements-ads-seller-central-admin-notificat | P1 | ? | 8 | unknown | Doc-only | P1: Add priority module tests (Souq settlements/ads/seller-central, Admin notifications/billing, FM work-orders) | 📍 Current Progress & Planned Next Steps |
| graphql-todo-stubs-next-steps-doc-only | P1 | ? | 8 | pending | Doc-only | GraphQL TODO Stubs | ✅ Completed (P1) |
| p1-add-rate-limiting-to-payments-routes-4-routes-critical-for-billing-next-steps | P1 | ? | 8 | unknown | Doc-only | **P1**: Add rate limiting to payments routes (4 routes) - Critical for billing | 📋 Next Steps (Priority Order) |
| p1-add-rate-limiting-to-finance-routes-10-routes-protect-sensitive-data-next-ste | P1 | ? | 8 | unknown | Doc-only | **P1**: Add rate limiting to finance routes (10 routes) - Protect sensitive data | 📋 Next Steps (Priority Order) |
| ongoing-playwright-smoke-rerun-required-previous-runs-timed-out-copilot-strict-s | P2 | ? | 8 | unknown | Doc-only | Ongoing: Playwright smoke rerun required (previous runs timed out); copilot STRICT specs still failing in full test run (layout preservation, tenant isolation, intent routing). | 📍 Current Progress & Planned Next Steps |
| add-unit-level-tenant-scoping-org-id-unit-id-across-fm-helpers-and-budgets-queri | P2 | ? | 8 | unknown | Doc-only | Add unit-level tenant scoping (org_id + unit_id) across FM helpers and budgets queries; backfill data to persist `unitId`. | 📍 Current Progress & Planned Next Steps |
| progress-located-master-pending-report-reviewed-upload-scan-status-verify-metada | P2 | ? | 8 | pending | Doc-only | Progress: Located Master Pending Report; reviewed upload scan/status/verify-metadata flows and safe-session adoption for tenant isolation; no code changes yet (documentation-only). | 📍 Current Progress & Planned Next Steps |
| graphql-reads-workorder-dashboardstats-properties-invoice-run-without-tenant-aud | P2 | ? | 8 | unknown | Doc-only | GraphQL reads (workOrder, dashboardStats, properties, invoice) run without tenant/audit context and permit orgless execution; mirror mutation tenantIsolation by requiring orgId and setting contexts before DB access. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| graphql-reads-workorder-dashboardstats-properties-invoice-run-without-tenant-aud | P2 | ? | 8 | unknown | Doc-only | GraphQL reads (workOrder, dashboardStats, properties, invoice) run without tenant/audit context and allow orgless execution; align reads with mutation tenantIsolation by requiring orgId and setting contexts before DB access. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| graphql-reads-workorder-dashboardstats-properties-invoice-run-without-tenant-aud | P2 | ? | 8 | unknown | Doc-only | GraphQL reads (workOrder, dashboardStats, properties, invoice) run without tenant/audit context and allow orgless execution; mirror mutation pattern by requiring orgId and setting contexts before DB access. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| ongoing-smoke-suite-reruns-timing-out-copilot-strict-specs-layout-preservation-t | P2 | ? | 8 | unknown | Doc-only | Ongoing: Smoke suite reruns timing out; copilot STRICT specs (layout preservation, tenant isolation, PERSONAL intent) still failing in full test run. | 📍 Current Progress & Planned Next Steps |
| rtl-compliance-clean-all-physical-classes-converted-to-logical-next-steps-doc-on | P1 | ? | 7 | unknown | Doc-only | **RTL Compliance:** ✅ Clean - all physical classes converted to logical | 🎯 Codebase Status |
| p1-fix-react-import-in-client-component-tests-next-steps-doc-only | P1 | ? | 7 | unknown | Doc-only | **P1**: Fix React import in client component tests | 2025-12-23 12:00 (Asia/Riyadh) — File Migration Verification & TypeScript Fixes |
| deploy-and-verify-console-is-clean-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Deploy and verify console is clean | 🎯 Recommended Next Steps |
| bc5f60662-test-p1-add-critical-module-tests-claims-users-budgets-next-steps-doc- | P1 | ? | 7 | unknown | Doc-only | `bc5f60662` - test(P1): add critical module tests - claims, users, budgets | 📍 Current Progress & Planned Next Steps |
| reliability-next-steps-vendor-apply-route-ts | P1 | ? | 7 | pending | vendor/apply/route.ts | Reliability | 🟠 P1 — High Priority (Reliability) |
| reliability-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Reliability | 🟠 P1 — High Priority (Reliability) |
| p1-add-rate-limiting-to-auth-routes-12-routes-prevent-brute-force-next-steps-doc | P1 | ? | 7 | unknown | Doc-only | **P1**: Add rate limiting to auth routes (12 routes) - Prevent brute force | 📋 Next Steps (Priority Order) |
| rate-limiting-aqar-15-routes-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Rate limiting: Aqar (15 routes) | 🔲 Planned Next Steps |
| rate-limiting-souq-module-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Rate limiting: Souq module | 🔲 Planned Next Steps |
| rate-limiting-fm-module-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Rate limiting: FM module | 🔲 Planned Next Steps |
| rate-limiting-admin-module-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Rate limiting: Admin module | 🔲 Planned Next Steps |
| fix-graphql-orgid-isolation-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Fix GraphQL orgId isolation | 📋 PLANNED NEXT STEPS |
| expand-rate-limiting-to-hr-crm-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Expand rate limiting to HR/CRM | 🔲 Planned Next Steps |
| add-rate-limiting-to-6-auth-routes-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Add rate limiting to 6 auth routes | 🎯 Planned Next Steps |
| add-try-catch-to-4-json-parse-usages-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Add try-catch to 4 JSON.parse usages | 🎯 Planned Next Steps |
| add-dompurify-to-8-dangerouslysetinnerhtml-2-are-json-stringify-safe-next-steps- | P1 | ? | 7 | pending | Doc-only | Add DOMPurify to 8 dangerouslySetInnerHTML (2 are JSON.stringify - safe) | 🎯 Planned Next Steps |
| add-dompurify-to-8-dangerouslysetinnerhtml-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Add DOMPurify to 8 dangerouslySetInnerHTML | 🎯 Planned Next Steps |
| add-rate-limiting-to-auth-routes-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Add rate limiting to auth routes | 🎯 Planned Next Steps |
| wrap-json-parse-in-webhook-routes-with-try-catch-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Wrap JSON.parse in webhook routes with try-catch | 🎯 Planned Next Steps |
| pending-p1-add-unit-tests-for-11-services-without-coverage-keep-lint-typecheck-t | P1 | ? | 7 | pending | Doc-only | Pending P1: Add unit tests for 11 services without coverage; keep lint/typecheck/test gates green. | ✅ Current Progress & Next Steps |
| configure-tap-paytabs-production-keys-next-steps-doc-only | P1 | ? | 7 | pending | Doc-only | Configure TAP/PayTabs production keys | 2) PLANNED NEXT STEPS |
| souq-tests-56-next-steps-doc-only | P1 | M | 7 | pending | Doc-only | Souq tests (+56) | 📋 Updated Action Plan |
| aqar-tests-13-next-steps-doc-only | P1 | S | 7 | pending | Doc-only | Aqar tests (+13) | 📋 Updated Action Plan |
| fix-test-add-missing-connecttodatabase-mock-to-claims-refund-processor-test-next | P2 | ? | 7 | pending | Doc-only | fix(test): Add missing connectToDatabase mock to claims-refund-processor test | 📁 COMMITS THIS SESSION (6 commits) |
| scripts-check-tenant-role-drift-ts-allowed-roles-synced-with-canonical-roles-nex | P2 | ? | 7 | unknown | scripts/check-tenant-role-drift.ts | `scripts/check-tenant-role-drift.ts` — ALLOWED_ROLES synced with CANONICAL_ROLES | 📁 Files Modified (8 files) |
| scripts-seed-demo-users-ts-default-org-id-env-var-replaced-6-hardcoded-ids-next- | P2 | ? | 7 | unknown | scripts/seed-demo-users.ts | `scripts/seed-demo-users.ts` — DEFAULT_ORG_ID env var, replaced 6 hardcoded IDs | 📁 Files Modified (8 files) |
| scripts-create-demo-users-ts-default-org-id-with-validation-next-steps-scripts-c | P2 | ? | 7 | unknown | scripts/create-demo-users.ts | `scripts/create-demo-users.ts` — DEFAULT_ORG_ID with validation | 📁 Files Modified (8 files) |
| scripts-seed-test-users-ts-test-org-id-default-org-id-pattern-next-steps-scripts | P2 | ? | 7 | unknown | scripts/seed-test-users.ts | `scripts/seed-test-users.ts` — TEST_ORG_ID \|\| DEFAULT_ORG_ID pattern | 📁 Files Modified (8 files) |
| scripts-count-null-employeeid-ts-test-org-id-with-validation-next-steps-scripts- | P2 | ? | 7 | unknown | scripts/count-null-employeeid.ts | `scripts/count-null-employeeid.ts` — TEST_ORG_ID with validation | 📁 Files Modified (8 files) |
| x-xss-all-innerhtml-sanitized-next-steps-doc-only | P2 | ? | 7 | unknown | Doc-only | [x] XSS: All innerHTML sanitized | 📊 Commit History (Session) |
| extend-fm-tenant-helpers-and-expenses-budgets-apis-to-enforce-unitid-consistentl | P2 | ? | 7 | unknown | Doc-only | Extend FM tenant helpers and expenses/budgets APIs to enforce unitId consistently; add compound index `{ orgId, unitId, department, updatedAt }`. | 🔜 Planned Next Steps |
| app-api-fm-utils-tenant-ts-48-67-buildtenantfilter-supports-unitids-but-callers- | P2 | ? | 7 | unknown | app/api/fm/utils/tenant.ts:48-67 | `app/api/fm/utils/tenant.ts:48-67` — buildTenantFilter supports unitIds, but callers (expenses, other FM routes) need consistent unitId plumbing. | 🛠️ Enhancements Needed for Production Readiness |
| extend-fm-tenant-helpers-to-emit-unitid-and-backfill-index-orgid-unitid-departme | P2 | ? | 7 | unknown | Doc-only | Extend FM tenant helpers to emit unitId and backfill index `{ orgId, unitId, department, updatedAt }`. | 📍 Current Progress & Planned Next Steps |
| app-api-fm-finance-budgets-route-ts-119-129-org-only-buildtenantfilter-missing-u | P2 | ? | 7 | pending | app/api/fm/finance/budgets/route.ts:119-129 | `app/api/fm/finance/budgets/route.ts:119-129` — org-only `buildTenantFilter`; missing `unitId`. | 🛠️ Enhancements Needed for Production Readiness |
| fm-unit-scoping-extend-buildtenantfilter-to-include-unitid-next-steps-doc-only | P2 | ? | 7 | unknown | Doc-only | **FM Unit Scoping:** Extend `buildTenantFilter` to include `unitId` | 🎯 Recommended Next Steps |
| fm-budgets-route-unitid-scoping-enforced-via-resolveunitscope-and-buildtenantfil | P2 | ? | 7 | unknown | Doc-only | FM budgets route: unitId scoping enforced via `resolveUnitScope` and `buildTenantFilter` unit support; tests passing. | 📍 Progress & Planned Next Steps |
| tightened-kyc-unit-tests-deterministic-200-expectations-non-seller-negative-case | P2 | ? | 7 | unknown | Doc-only | Tightened KYC unit tests: deterministic 200 expectations, non-seller negative case, service call assertions now match vendorId injection. | 📍 Progress & Planned Next Steps |
| re-ran-budgets-unit-tests-suite-green-with-existing-tenant-unit-aware-mocks-next | P2 | ? | 7 | unknown | Doc-only | Re-ran budgets unit tests; suite green with existing tenant/unit-aware mocks. | 📍 Progress & Planned Next Steps |
| backfill-fm-budgets-route-with-unitid-scoping-once-shared-tenant-helper-supports | P2 | ? | 7 | unknown | Doc-only | Backfill FM budgets route with unitId scoping once shared tenant helper supports unit arrays; add compound index `{ orgId, unitId, department, updatedAt }`. | 📍 Progress & Planned Next Steps |
| fm-budgets-filtering-still-org-only-in-helper-unitid-not-enforced-for-get-post-q | P2 | ? | 7 | unknown | app/api/fm/utils/tenant.ts | FM budgets filtering still org-only in helper; unitId not enforced for GET/POST queries (app/api/fm/utils/tenant.ts, app/api/fm/finance/budgets/route.ts) — cross-unit leakage risk. | 🛠️ Enhancements Needed for Production Readiness |
| tenant-dimension-omissions-fm-budgets-continues-to-inherit-org-only-buildtenantf | P2 | ? | 7 | unknown | Doc-only | **Tenant dimension omissions**: FM budgets continues to inherit org-only `buildTenantFilter`, mirroring earlier cross-unit leaks in FM utilities. Without unitId filters, unit-level isolation is not enforced in listings or creates. | 🔎 Deep-Dive Analysis (Similar/Identical Issue Patterns) |
| confirmed-fm-budgets-get-post-enforce-orgid-unitid-via-resolveunitscope-and-buil | P2 | ? | 7 | unknown | Doc-only | Confirmed FM budgets GET/POST enforce orgId + unitId via `resolveUnitScope` and `buildTenantFilter` (unit-aware). | 📍 Current Progress & Planned Next Steps |
| add-targeted-playwright-spec-or-unit-tests-for-copilot-tenant-isolation-and-over | P2 | ? | 7 | unknown | Doc-only | Add targeted Playwright spec or unit tests for copilot tenant isolation and overlay layout to catch STRICT regressions early. | 🛠️ Enhancements Needed (Production Readiness) |
| next-re-run-smoke-after-server-cooldown-address-copilot-strict-layout-tenant-iso | P2 | ? | 7 | unknown | Doc-only | Next: Re-run smoke after server cooldown; address Copilot STRICT layout/tenant isolation failures; keep PLAYWRIGHT flags set in pipeline; ensure marketplace cart flow stays green after stubs. | 📍 Current Progress & Planned Next Steps |
| lib-config-tenant-ts-95-next-steps-lib-config-tenant-ts-95 | P2 | ? | 7 | unknown | lib/config/tenant.ts:95 | `lib/config/tenant.ts:95` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| lib-config-tenant-server-ts-113-next-steps-lib-config-tenant-server-ts-113 | P2 | ? | 7 | unknown | lib/config/tenant.server.ts:113 | `lib/config/tenant.server.ts:113` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| create-lib-auth-tenant-utils-ts-next-steps-lib-auth-tenant-utils-ts | P2 | ? | 7 | unknown | lib/auth/tenant-utils.ts | Create `lib/auth/tenant-utils.ts`: | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| next-steps-add-tenant-bound-s3-key-validation-shared-helper-for-upload-routes-na | P2 | ? | 7 | unknown | Doc-only | Next steps: Add tenant-bound S3 key validation + shared helper for upload routes, namespace scan tokens per org, backfill regression tests, then run `pnpm typecheck && pnpm lint && pnpm test`. | 📍 Current Progress & Planned Next Steps |
| progress-located-master-pending-report-and-refreshed-orgid-audit-notes-mapped-us | P2 | ? | 7 | pending | Doc-only | Progress: Located Master Pending Report and refreshed orgId audit notes; mapped user-id fallbacks and missing tenant/audit context across GraphQL queries/mutations and Souq/Aqar write routes. | 📍 Current Progress & Planned Next Steps |
| next-steps-enforce-required-orgid-tenant-audit-context-on-graphql-reads-writes-r | P2 | ? | 7 | unknown | Doc-only | Next steps: Enforce required orgId + tenant/audit context on GraphQL reads/writes, remove user-id fallbacks in Souq/Aqar writes, add regression tests, then run `pnpm typecheck && pnpm lint && pnpm test`. | 📍 Current Progress & Planned Next Steps |
| add-integration-coverage-for-resume-download-storage-failures-and-emit-av-scanne | P2 | ? | 7 | unknown | Doc-only | Add integration coverage for resume download storage failures and emit AV scanner health metrics/dashboards; wire alerts for auth infra failures (metric `auth_infra_failure`) and AV outages. | 🚧 Planned Next Steps |
| silent-auth-session-fallbacks-remain-in-dirty-routes-upload-variants-help-contex | P2 | ? | 7 | unknown | Doc-only | **Silent auth/session fallbacks** remain in dirty routes (upload variants, help context/list, onboarding document routes, settings logo) still using `getSessionUser(...).catch(() => null)`, masking infra outages as 401. Rolling `getSessionOrError` will normalize 503 vs 401 behavior. | 🔍 Deep-Dive Analysis |
| observability-gaps-av-scan-availability-is-not-reported-to-dashboards-auth-infra | P2 | ? | 7 | pending | Doc-only | **Observability gaps**: AV scan availability is not reported to dashboards; auth infra failures counted only in logs. Add metrics (`auth_infra_failure`, `av_scan_unavailable`) and alerts to catch outages early. | 🔍 Deep-Dive Analysis |
| auth-failures-vs-infra-failures-not-yet-separated-in-onboarding-upload-settings- | P2 | ? | 7 | unknown | Doc-only | Auth failures vs infra failures not yet separated in onboarding/upload/settings routes; outages still appear as 401. Recommendation: adopt `getSessionOrError` wrapper and log 503 with metric. | 🛠️ Enhancements for Production Readiness |
| tenant-config-callers-still-need-to-handle-thrown-errors-ensure-upstream-apis-ma | P2 | ? | 7 | pending | Doc-only | Tenant-config callers still need to handle thrown errors; ensure upstream APIs map to 503 or explicit tenant-missing. | 🛠️ Enhancements for Production Readiness |
| trial-request-resilience-db-outage-now-503-dlq-webhook-similar-pattern-could-be- | P2 | ? | 7 | unknown | Doc-only | **Trial-request resilience**: DB outage now 503 + DLQ webhook; similar pattern could be applied to other public submission endpoints (e.g., vendor apply) to avoid silent drops. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| tenant-config-failures-now-logged-with-metric-ensure-dashboard-alerting-consumes | P2 | ? | 7 | unknown | Doc-only | **Tenant-config failures** now logged with metric; ensure dashboard/alerting consumes `tenant_config_load_failure` to avoid silent tenant degradation. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| per-tenant-feature-flag-to-disable-test-only-endpoints-e-g-api-auth-test-session | P2 | ? | 7 | unknown | Doc-only | Per-tenant feature flag to disable test-only endpoints (e.g., `/api/auth/test/session`) in shared/stage environments. | 🧭 Optional Enhancements |
| promote-trial-request-dlq-to-a-durable-queue-writer-instead-of-webhook-to-avoid- | P2 | ? | 7 | unknown | Doc-only | Promote trial-request DLQ to a durable queue writer (instead of webhook) to avoid drops during DB outages. | 🧭 Optional Enhancements |
| add-admin-dashboard-cards-for-tenant-config-load-status-and-last-successful-refr | P2 | ? | 7 | unknown | Doc-only | Add admin dashboard cards for tenant-config load status and last successful refresh. | 🧭 Optional Enhancements |
| trial-request-dlq-durability-intact-webhook-file-tenant-config-load-continues-lo | P2 | ? | 7 | unknown | Doc-only | Trial-request DLQ durability intact (webhook + file); tenant-config load continues logging `tenant_config_load_failure`. | 📍 Current Progress |
| targeted-suites-passing-pnpm-vitest-tests-unit-api-auth-test-session-route-test- | P2 | ? | 7 | unknown | tests/unit/api/auth-test-session.route.test.ts | Targeted suites passing: `pnpm vitest tests/unit/api/auth-test-session.route.test.ts tests/unit/api/trial-request/route.test.ts tests/unit/lib/config/tenant.server.test.ts tests/api/souq/claims-get-error.route.test.ts tests/unit/api/upload/presigned-url.error.test.ts`. | 📍 Current Progress |
| tenant-config-callers-should-add-health-hinted-responses-when-surfacing-503s-to- | P2 | ? | 7 | unknown | Doc-only | Tenant-config callers should add health-hinted responses when surfacing 503s to aid ops. | 🛠️ Enhancements for Production Readiness |
| add-health-hint-assertions-on-av-scan-config-failure-paths-and-tenant-config-cal | P2 | ? | 7 | unknown | Doc-only | Add health-hint assertions on AV scan/config failure paths and tenant-config caller responses once implemented. | 🛠️ Enhancements for Production Readiness |
| health-hints-coverage-gap-only-auth-test-session-trial-request-and-upload-scan-c | P2 | ? | 7 | pending | Doc-only | **Health hints coverage gap**: Only auth test session, trial-request, and upload scan config/policy failures emit health-hinted 503s. Apply helper to other infra-dependent paths (tenant-config consumers, AV scan downstream errors, FM report scan paths). | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| alerting-gap-metrics-exist-tenant-config-load-failure-trial-request-persist-fail | P2 | ? | 7 | pending | Doc-only | **Alerting gap**: Metrics exist (`tenant_config_load_failure`, `trial_request_persist_failure`, DLQ failures, `auth_infra_failure`) but dashboards/alerts are missing; risk of silent degradation. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| dlq-resilience-trial-request-uses-webhook-file-consider-durable-dlq-for-other-pu | P2 | ? | 7 | unknown | Doc-only | **DLQ resilience**: Trial-request uses webhook + file; consider durable DLQ for other public submission endpoints (e.g., vendor apply) to avoid silent drops during DB outages. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| auth-infra-vs-auth-failure-separation-incomplete-onboarding-settings-upload-remn | P2 | ? | 7 | unknown | Doc-only | Auth infra vs auth failure separation incomplete (onboarding/settings/upload remnants). Risk: outages look like 401. Recommendation: roll out `getSessionOrError`. | 🛠️ Enhancements for Production Readiness |
| auth-infra-masking-routes-still-using-getsessionuser-catch-null-onboarding-setti | P2 | ? | 7 | unknown | Doc-only | **Auth infra masking**: routes still using `getSessionUser(...).catch(() => null)` (onboarding, settings logo, remaining upload/subscription checks) will misclassify infra outages as 401. Roll out `getSessionOrError`. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| dlq-resilience-trial-request-now-writes-webhook-file-vendor-apply-and-other-publ | P2 | ? | 7 | unknown | Doc-only | **DLQ resilience**: trial-request now writes webhook + file; vendor-apply and other public submission endpoints should mirror durable DLQ to avoid silent drops during DB outages. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| health-hints-currently-on-auth-test-session-and-trial-request-extend-to-av-scan- | P2 | ? | 7 | unknown | Doc-only | **Health hints**: currently on auth test session and trial-request; extend to AV scan/config 503s (upload scan, FM reports), tenant-config callers, and other infra-dependent routes for consistent triage. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| add-observability-and-guardrails-for-av-scanning-surface-scanner-outages-short-c | P2 | ? | 7 | unknown | Doc-only | Add observability and guardrails for AV scanning: surface scanner outages, short-circuit processing, and add a health metric/test in FM reports worker. | 🚧 Planned Next Steps |
| AVSCAN-001 | P2 | ? | 7 | unknown | app/api/fm/reports/process/route.ts | SILENT-FM-AVSCAN-001 — `app/api/fm/reports/process/route.ts`: AV scan fallback `catch(() => false)` causes wasted reruns and hides scanner outages. Add structured telemetry, fail-fast when scanner is unavailable, and gate processing on health. | 🧩 Production-Readiness Enhancements |
| centralized-souq-fraud-return-rule-windows-with-tenant-overrides-returns-claims- | P2 | ? | 7 | unknown | Doc-only | Centralized Souq fraud/return rule windows with tenant overrides; returns + claims investigation now consume the shared config. | 📍 Current Progress & Planned Next Steps |
| souq-fraud-return-rule-windows-centralized-with-tenant-overrides-returns-and-cla | P2 | ? | 7 | unknown | Doc-only | Souq fraud/return rule windows centralized with tenant overrides; returns and claims flows are wired to the shared config. | 📍 Current Progress & Planned Next Steps |
| tests-unit-lib-config-tenant-server-test-ts-tenant-load-failure-next-steps-tests | P2 | ? | 7 | unknown | tests/unit/lib/config/tenant.server.test.ts | `tests/unit/lib/config/tenant.server.test.ts` (tenant load failure) | 📍 Current Progress |
| add-tenant-config-cache-warm-up-metric-emission-to-cut-latency-and-detect-org-sp | P2 | ? | 7 | unknown | Doc-only | Add tenant-config cache warm-up/metric emission to cut latency and detect org-specific degradation. | 🛠️ Enhancements for Production Readiness |
| auth-helper-fallback-getsessionuser-catch-null-masks-infra-failures-in-onboardin | P2 | ? | 7 | unknown | Doc-only | Auth helper fallback (`getSessionUser(...).catch(() => null)`) masks infra failures in onboarding/help/upload routes; can misreport outages as 401. Introduce infra-aware handling (503) with logging. | 🛠️ Enhancements for Production Readiness |
| defaulting-to-default-tenant-config-on-load-failure-previously-masked-tenant-iss | P2 | ? | 7 | pending | Doc-only | Defaulting to `DEFAULT_TENANT_CONFIG` on load failure previously masked tenant issues; now throws, but callers must handle and surface appropriate 503/tenant-missing responses. | 🛠️ Enhancements for Production Readiness |
| add-tenant-config-caller-tests-to-ensure-503-or-explicit-tenant-missing-is-retur | P2 | ? | 7 | pending | Doc-only | Add tenant-config caller tests to ensure 503 or explicit tenant-missing is returned (no silent defaults). | 🛠️ Enhancements for Production Readiness |
| auth-infra-masking-getsessionuser-catch-null-used-across-onboarding-help-upload- | P2 | ? | 7 | unknown | Doc-only | **Auth infra masking**: `getSessionUser(...).catch(() => null)` used across onboarding/help/upload/settings; outages become 401/empty responses. Need infra-aware helper and telemetry. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| centralized-souq-fraud-return-windows-in-shared-config-with-tenant-overrides-ser | P2 | ? | 7 | unknown | Doc-only | Centralized Souq fraud/return windows in shared config with tenant overrides + services wired to the shared getter. | 📍 Current Progress & Next Steps |
| both-use-settenantcontext-cleartenantcontext-for-proper-isolation-next-steps-doc | P2 | ? | 7 | unknown | Doc-only | Both use `setTenantContext()` / `clearTenantContext()` for proper isolation | Fix 3: GraphQL TODO Stubs Implementation |
| identified-graphql-query-resolver-gaps-orgid-fallback-to-userid-missing-tenant-a | P2 | ? | 7 | pending | Doc-only | Identified GraphQL Query resolver gaps: orgId fallback to userId, missing tenant/audit context on reads, sequential DB calls in workOrders. | 📍 Current Progress & Planned Next Steps |
| lib-config-tenant-ts-exported-constants-next-steps-lib-config-tenant-ts | P2 | ? | 7 | unknown | lib/config/tenant.ts | `lib/config/tenant.ts` - Exported constants | Pattern C: Multi-tenant Placeholder (1 occurrence) |
| impact-properties-and-invoice-queries-return-no-data-next-steps-doc-only | P2 | ? | 7 | unknown | Doc-only | **Impact**: Properties and Invoice queries return no data | Pattern 3: GraphQL Resolver Stubs |
| workorder-query-has-settenantcontext-org-filter-cleartenantcontext-in-finally-ne | P2 | ? | 7 | unknown | Doc-only | `workOrder` query: Has `setTenantContext()`, org filter, `clearTenantContext()` in finally | P1: GraphQL Security (Already Complete) |
| progress-master-pending-report-updated-with-latest-orgid-audit-cataloged-user-id | P2 | ? | 7 | pending | Doc-only | Progress: Master Pending Report updated with latest orgId audit; cataloged user-id fallbacks and missing tenant context across GraphQL, Souq, and Aqar flows. | 📍 Current Progress & Planned Next Steps |
| next-steps-enforce-orgid-tenant-audit-context-on-graphql-reads-writes-remove-use | P2 | ? | 7 | unknown | Doc-only | Next steps: Enforce orgId + tenant/audit context on GraphQL reads/writes, remove user-id fallbacks in Souq/Aqar writes, add regression tests, then run `pnpm typecheck && pnpm lint && pnpm test`. | 📍 Current Progress & Planned Next Steps |
| graphql-org-enforcement-tenant-audit-context-next-steps-doc-only | P2 | ? | 7 | pending | Doc-only | GraphQL org enforcement + tenant/audit context | 🔧 Enhancements & Production Readiness |
| souq-review-post-org-requirement-next-steps-doc-only | P2 | ? | 7 | pending | Doc-only | Souq review POST org requirement | 🔧 Enhancements & Production Readiness |
| aqar-listing-package-favorites-org-enforcement-next-steps-doc-only | P2 | ? | 7 | pending | Doc-only | Aqar listing/package/favorites org enforcement | 🔧 Enhancements & Production Readiness |
| progress-master-pending-report-refreshed-with-latest-orgid-audit-cataloged-cross | P2 | ? | 7 | pending | Doc-only | Progress: Master Pending Report refreshed with latest orgId audit; cataloged cross-module user-id fallbacks and missing tenant context on GraphQL reads/writes. | 📍 Current Progress & Planned Next Steps |
| next-steps-enforce-orgid-tenant-audit-context-on-graphql-resolvers-remove-user-i | P2 | ? | 7 | unknown | Doc-only | Next steps: Enforce orgId + tenant/audit context on GraphQL resolvers, remove user-id fallbacks in Souq/Aqar writes, add regression tests, then run `pnpm typecheck && pnpm lint && pnpm test`. | 📍 Current Progress & Planned Next Steps |
| kept-markdown-rendering-and-safehtml-rendering-under-dompurify-sanitized-json-ld | P2 | ? | 7 | unknown | Doc-only | Kept markdown rendering and SafeHtml rendering under DOMPurify; sanitized JSON-LD injection on about page to remove remaining direct `dangerouslySetInnerHTML` risks. | 🔧 Changes (code) |
| next-steps-enforce-required-orgid-tenant-audit-context-on-graphql-reads-writes-r | P2 | ? | 7 | unknown | Doc-only | Next steps: Enforce required orgId + tenant/audit context on GraphQL reads/writes, remove user-id fallbacks in Souq/Aqar routes, add regression tests, then run `pnpm typecheck && pnpm lint && pnpm test`. | 📍 Current Progress & Planned Next Steps |
| normalize-org-once-per-graphql-request-and-reuse-next-steps-doc-only | P2 | ? | 7 | pending | Doc-only | Normalize org once per GraphQL request and reuse | 🔧 Enhancements & Production Readiness |
| aqar-favorites-uses-user-id-fallback-for-tenant-scope-next-steps-app-api-aqar-fa | P2 | ? | 7 | pending | app/api/aqar/favorites/route.ts:61-138 | Aqar favorites uses user-id fallback for tenant scope | 🔧 Enhancements & Production Readiness |
| souq-review-creation-org-requirement-next-steps-doc-only | P2 | ? | 7 | pending | Doc-only | Souq review creation org requirement | 🔧 Enhancements & Production Readiness |
| auth-infra-vs-auth-failure-responses-are-inconsistent-routes-not-using-safe-sess | P2 | ? | 7 | unknown | Doc-only | Auth infra vs auth failure responses are inconsistent; routes not using `safe-session` may mask outages as 401, reducing reliability. | 🛠️ Enhancements Needed (Production Readiness) |
| next-regenerate-lockfile-without-sql-prisma-knex-pg-mysql-instrumentations-fix-t | P2 | ? | 7 | unknown | Doc-only | Next: regenerate lockfile without SQL/Prisma/knex/pg/mysql instrumentations; fix tenant scope to `{ org_id, unit_id }`; gate payroll to HR-only; add safe JSON parser across finance/HR routes; rerun `pnpm typecheck && pnpm lint && pnpm test` after fixes. | 📈 Progress & Planned Next Steps |
| fix-tenant-scope-for-role-tenant-to-require-org-id-unit-id-no-tenant-id-user-id- | P2 | ? | 7 | unknown | domain/fm/fm.behavior.ts | Fix tenant scope for `Role.TENANT` to require `{ org_id, unit_id }` (no `tenant_id === user.id`) in `domain/fm/fm.behavior.ts`. | 📈 Progress & Planned Next Steps |
| new-tenant-scope-uses-tenant-id-userid-no-org-unit-enforcement-next-steps-doc-on | P2 | ? | 7 | pending | Doc-only | [ ] **🔴 New Tenant scope uses tenant_id=userId (no org/unit enforcement)** | 🔴 Multi-Tenancy & Data Scoping |
| evidence-domain-fm-fm-behavior-ts-1355-1361-sets-filter-tenant-id-ctx-userid-wit | P2 | ? | 7 | unknown | domain/fm/fm.behavior.ts:1355-1361 | **Evidence:** `domain/fm/fm.behavior.ts:1355-1361` sets `filter.tenant_id = ctx.userId` with optional units. | 🔴 Multi-Tenancy & Data Scoping |
| pattern-signature-tenant-filter-uses-userid-next-steps-doc-only | P2 | ? | 7 | unknown | Doc-only | **Pattern Signature:** Tenant filter uses userId. | 🔴 Multi-Tenancy & Data Scoping |
| fix-direction-require-filter-org-id-ctx-orgid-and-filter-unit-id-in-ctx-units-re | P2 | ? | 7 | unknown | Doc-only | **Fix Direction:** Require `filter.org_id = ctx.orgId` and `filter.unit_id = { $in: ctx.units }`; remove `tenant_id === user.id`. | 🔴 Multi-Tenancy & Data Scoping |
| planned-next-steps-reuse-rest-zod-schemas-for-graphql-inputs-add-integration-tes | P2 | ? | 7 | unknown | Doc-only | Planned next steps: Reuse REST Zod schemas for GraphQL inputs, add integration tests (pagination/auth/error payloads) under the feature flag, and extract shared mapping helpers (ID/tenant/address/status) to prevent drift. | 📍 Current Progress & Planned Next Steps |
| shared-mapper-util-module-id-tenant-address-enum-mapping-next-steps-doc-only | P2 | ? | 7 | pending | Doc-only | Shared mapper/util module (ID, tenant, address, enum mapping) | 🔧 Enhancements & Production Readiness |
| soft-delete-tenant-guards-previously-missing-in-graphql-now-applied-any-new-reso | P2 | ? | 7 | pending | Doc-only | **Soft-delete/tenant guards**: Previously missing in GraphQL; now applied. Any new resolvers should inherit the guard helper to match REST isolation (FM/finance models especially). | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| finished-wiring-all-graphql-resolver-todos-auth-context-extraction-session-beare | P2 | ? | 7 | pending | Doc-only | Finished wiring all GraphQL resolver TODOs: auth context extraction (session/bearer), `me` user lookup, work order list/detail pagination, dashboard stats via shared query helpers, and creation with SLA/audit/tenant context. | Progress & Planned Next Steps |
| tenant-config-now-loads-from-organizations-tenants-collections-with-cache-defaul | P2 | ? | 7 | unknown | Doc-only | Tenant config now loads from `organizations`/`tenants` collections with cache + default fallback; still serves defaults if DB unreachable. | Progress & Planned Next Steps |
| planned-next-steps-rerun-playwright-with-higher-timeout-add-unit-integration-tes | P2 | ? | 7 | unknown | Doc-only | Planned next steps: rerun Playwright with higher timeout; add unit/integration tests for GraphQL resolvers (context, pagination, creation validation) and tenant config DB path; add negative tests for Souq ad click signature/timestamp; align GraphQL creation validation with REST schema; document tenant offline fallback behavior. | Progress & Planned Next Steps |
| efficiency-improvements-batch-optimize-any-sequential-loops-in-graphql-work-orde | P2 | ? | 7 | unknown | Doc-only | Efficiency improvements: batch/optimize any sequential loops in GraphQL work order creation and dashboard aggregation; cache tenant config lookups (already present) and add metrics to observe cache hit rate; consider reusing REST validation/filters to avoid duplicate computation. | Enhancements Needed for Production Readiness |
| missing-tests-add-graphql-resolver-tests-me-workorders-workorder-dashboardstats- | P2 | ? | 7 | pending | Doc-only | Missing tests: add GraphQL resolver tests (me/workOrders/workOrder/dashboardStats/createWorkOrder), tenant config DB-fetch/caching tests, Souq ad click negative cases, and rerun/complete Playwright suite. | Enhancements Needed for Production Readiness |
| org-tenant-scoping-graphql-uses-soft-delete-guard-orgid-audit-remaining-graphql- | P2 | ? | 7 | unknown | Doc-only | Org/tenant scoping: GraphQL uses soft-delete guard + `orgId`; audit remaining GraphQL/REST handlers to ensure consistent `orgId` filtering and avoid legacy `tenant_id=userId` patterns. | Deep-Dive Analysis of Similar Issues |
| logic-errors-ensure-payroll-stays-hr-only-no-finance-bleed-and-tenant-scoping-us | P2 | ? | 7 | unknown | Doc-only | **Logic Errors:** Ensure payroll stays HR-only (no Finance bleed) and tenant scoping uses `{ org_id, unit_id }` consistently. | 🧩 Enhancements (Prod Readiness) |
| add-targeted-playwright-tests-for-copilot-strict-scenarios-layout-overlay-stays- | P2 | ? | 7 | unknown | Doc-only | Add targeted Playwright tests for copilot STRICT scenarios (layout overlay stays non-destructive; tenant isolation enforced) to catch regressions early. | 🛠️ Enhancements Needed (Production Readiness) |
| pnpm-lint-warnings-local-require-tenant-scope-in-superadmin-routes-next-steps-do | P2 | ? | 7 | unknown | Doc-only | pnpm lint (warnings: local/require-tenant-scope in superadmin routes) | 2025-12-29 14:35 (Asia/Riyadh) � Verification Addendum [AGENT-003-A] |
| GQL-001 | P2 | XS | 7 | pending | Doc-only | Tenant Isolation | Medium Priority (P2) |
| pending-user-configuration-next-steps-doc-only | P2 | ? | 6 | pending | Doc-only | ⏳ Pending user configuration | ✅ PAYMENT PROVIDER UPDATE |
| zatca-api-key-next-steps-doc-only | P2 | ? | 6 | blocked | Doc-only | ZATCA_API_KEY | ✅ SECRETS STATUS (GitHub Actions) |
| pending-user-action-next-steps-doc-only | P2 | ? | 6 | blocked | Doc-only | ⏳ Pending (user action) | ✅ SECRETS STATUS (GitHub Actions) |
| tap-payments-kept-strict-payment-infrastructure-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | ✅ **Tap Payments** - Kept strict (payment infrastructure) | 📊 User Instructions Addressed |
| billing-history-missing-org-returns-401-blocker-mongodb-ssot-sync-unavailable-fa | P2 | ? | 6 | blocked | tests/api/billing/history.route.test.ts:57-65 | billing-history-missing-org-returns-401 — blocker: MongoDB SSOT sync unavailable; failing suite expects 400, got 401 (`tests/api/billing/history.route.test.ts:57-65`). | 2025-12-14 22:25 (Asia/Riyadh) — Code Review Update |
| none-db-sync-blocked-create-billing-history-missing-org-returns-401-when-mongo-a | P2 | ? | 6 | blocked | Doc-only | None (DB sync blocked; create `billing-history-missing-org-returns-401` when Mongo available). | 2025-12-14 22:25 (Asia/Riyadh) — Code Review Update |
| billing-history-missing-org-returns-401-align-route-to-return-400-without-org-an | P2 | ? | 6 | pending | Doc-only | billing-history-missing-org-returns-401 — align route to return 400 without org and rerun full vitest. | 2025-12-14 22:25 (Asia/Riyadh) — Code Review Update |
| baseline-99-8-next-steps-doc-only | P2 | ? | 6 | blocked | Doc-only | Baseline 99.8% | 📍 Current Progress Summary |
| review-webhook-open-routes-app-api-payments-callback-route-ts-app-api-healthchec | P2 | ? | 6 | pending | app/api/payments/callback/route.ts | Review webhook/open routes (`app/api/payments/callback/route.ts`, `app/api/healthcheck/route.ts`) for explicit allowlist rationale and document exceptions. | 2. API Routes Missing Error Handling (20+ routes) |
| api-billing-history-returns-401-instead-of-400-when-org-context-is-missing-tests | P2 | ? | 6 | pending | tests/api/billing/history.route.test.ts | `/api/billing/history` returns 401 instead of 400 when org context is missing (`tests/api/billing/history.route.test.ts`, `pnpm vitest run --bail 1 --reporter=dot`). | 🔧 Enhancements Needed for Production Readiness |
| metadata-module-mention-count-first-last-seen-legacy-id-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | ✅ Metadata (module, mention count, first/last seen, legacy ID) | Detail Page (`app/admin/issues/[id]/page.tsx`) |
| app-api-payments-tap-checkout-route-ts-needs-fix-next-steps-app-api-payments-tap | P2 | ? | 6 | pending | app/api/payments/tap/checkout/route.ts | `app/api/payments/tap/checkout/route.ts` - NEEDS FIX | 📁 Files Modified This Session |
| one-instance-in-payments-needs-next-public-base-url-to-be-required-next-steps-do | P2 | ? | 6 | pending | Doc-only | One instance in payments needs NEXT_PUBLIC_BASE_URL to be required | Pattern: Env Var Fallbacks |
| bank-verification-gating-auto-approval-now-requires-bankdetailscomplete-route-st | P2 | ? | 6 | unknown | Doc-only | **Bank verification gating** — Auto-approval now requires bankDetailsComplete; route still permits progression without verifying bank details explicitly. Align route validation with service expectations to avoid premature activation. | 🔎 Deep-Dive Analysis (Similar Issues) |
| workflow-premature-approvals-kyc-company-info-auto-approved-sellers-same-regress | P2 | ? | 6 | unknown | Doc-only | **Workflow premature approvals**: KYC company_info auto-approved sellers; same regression pattern seen in prior approval flows (e.g., auto-approve after partial data). Guard approvals to verification steps only. | 🔎 Deep-Dive Analysis (Similar/Identical Issue Patterns) |
| keep-pdp-in-playwright-mode-fully-static-to-prevent-upstream-timeouts-add-memoiz | P2 | ? | 6 | unknown | /page.ts | Keep PDP in Playwright mode fully static to prevent upstream timeouts; add memoized stub data to reduce re-renders (app/marketplace/product/[slug]/page.tsx:92-138). | 🔐 Security Audit |
| marketplace-stubs-homepage-playwright-branch-now-links-to-pdp-stub-but-search-li | P2 | ? | 6 | unknown | Doc-only | Marketplace stubs: homepage Playwright branch now links to PDP stub, but search/listings routes still rely on live data; consider adding flag-gated stub data to app/marketplace/search and listings to prevent future timeouts. | 🔎 Deep-Dive Analysis (Similar/Repeated Issues) |
| early-approval-state-services-souq-seller-kyc-service-ts-262-282-status-flips-to | P2 | ? | 6 | unknown | services/souq/seller-kyc-service.ts:262-282 | **Early approval state** (`services/souq/seller-kyc-service.ts:262-282`): status flips to approved after company_info; this mirrors earlier audit findings on premature approvals and can propagate to downstream workflows (notifications, activation) without document/bank checks. | 🔎 Deep-Dive Analysis (Similar/Repeated Issues) |
| billing-charge-recurring-route-ts-103-error-text-extraction-next-steps-billing-c | P2 | ? | 6 | unknown | billing/charge-recurring/route.ts:103 | billing/charge-recurring/route.ts:103 - error text extraction | 🔒 CATEGORY 2: RBAC/Security |
| data-operations-replace-with-proper-error-handling-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | Data operations: 🔴 Replace with proper error handling | 🔒 CATEGORY 2: RBAC/Security |
| scripts-seed-production-data-ts-39-next-steps-scripts-seed-production-data-ts-39 | P2 | ? | 6 | unknown | scripts/seed-production-data.ts:39 | `scripts/seed-production-data.ts:39` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| billing-charge-recurring-route-ts-1-error-text-acceptable-next-steps-billing-cha | P2 | ? | 6 | unknown | billing/charge-recurring/route.ts | `billing/charge-recurring/route.ts` (1) — error text, acceptable | PATTERN 2: SILENT-CATCH (Error Masking) |
| payments-tap-webhook-815-lines-extracted-to-lib-finance-tap-webhook-handlers-ts- | P2 | ? | 6 | unknown | lib/finance/tap-webhook/handlers.ts | `payments/tap/webhook` (815 lines) → extracted to `lib/finance/tap-webhook/handlers.ts` + `persistence.ts` | 📍 Current Progress & Planned Next Steps |
| p2-split-large-route-files-auth-otp-send-1091-lines-payments-tap-webhook-815-lin | P2 | ? | 6 | unknown | Doc-only | P2: Split large route files (auth/otp/send 1091 lines, payments/tap/webhook 815 lines) | 📍 Current Progress & Planned Next Steps |
| gates-remain-green-after-invoice-typing-lint-fixes-pnpm-typecheck-pnpm-lint-pnpm | P2 | ? | 6 | unknown | Doc-only | Gates remain green after invoice typing/lint fixes: `pnpm typecheck`, `pnpm lint`, `pnpm run test:models`. | 📍 Current Progress |
| extend-parsebodysafe-parsebody-to-remaining-upload-variants-scan-scan-status-ver | P2 | ? | 6 | unknown | Doc-only | Extend `parseBodySafe`/`parseBody` to remaining upload variants (`scan`, `scan-status`, `verify-metadata`, presign siblings) and keep `lint:json-fallbacks` clean. | 🚧 Planned Next Steps |
| extend-safe-parser-adoption-to-remaining-upload-scan-verify-metadata-routes-and- | P2 | ? | 6 | unknown | Doc-only | Extend safe parser adoption to remaining upload/scan/verify-metadata routes and ensure CI `lint:json-fallbacks` stays clean. | 🚧 Planned Next Steps |
| add-parser-negative-path-tests-for-updated-routes-and-upcoming-migrations-next-s | P2 | ? | 6 | unknown | Doc-only | Add parser negative-path tests for updated routes and upcoming migrations. | 🛠️ Enhancements for Production Readiness |
| health-hints-helper-standardizes-503-responses-and-triage-metadata-next-steps-do | P2 | ? | 6 | unknown | Doc-only | Health-hints helper standardizes 503 responses and triage metadata. | 🛠️ Enhancements for Production Readiness |
| extended-shared-json-parser-auth-infra-aware-helper-to-upload-flows-presigned-ur | P2 | ? | 6 | unknown | Doc-only | Extended shared JSON parser + auth infra-aware helper to upload flows (`presigned-url`, `verify-metadata`, `scan`, `scan-status`) and help articles/comments; subscription middleware now surfaces auth-store failures as 503. | 📍 Current Progress |
| api-trial-request-db-connect-insert-failures-now-503-no-silent-lead-loss-next-st | P2 | ? | 6 | unknown | Doc-only | `/api/trial-request`: DB connect/insert failures now 503 (no silent lead loss). | 📍 Current Progress |
| legacy-inline-catch-null-still-present-e-g-app-api-help-escalate-route-ts-app-ap | P2 | ? | 6 | unknown | app/api/help/escalate/route.ts | Legacy inline `.catch(() => ({}\|null))` still present (e.g., `app/api/help/escalate/route.ts`, `app/api/billing/quote/route.ts`, `app/api/fm/work-orders/[id]/transition/route.ts`, `app/api/admin/billing/annual-discount/route.ts`): malformed JSON can proceed with defaults. Fix by adopting shared parser + zod validation. | 📁 Files Modified This Session |
| add-parse-failure-tests-for-routes-using-inline-json-fallbacks-billing-quote-fm- | P2 | ? | 6 | unknown | Doc-only | Add parse-failure tests for routes using inline JSON fallbacks (billing quote, FM transitions, help escalate, admin billing discount). | 🛠️ Enhancements for Production Readiness |
| lib-otp-store-redis-ts-updated-otpdata-interface-next-steps-lib-otp-store-redis- | P2 | ? | 6 | unknown | lib/otp-store-redis.ts | `lib/otp-store-redis.ts` — Updated OTPData interface | Pattern 1: Server-Only Libraries in Client-Side Code |
| tests-api-finance-invoices-route-test-ts-next-steps-tests-api-finance-invoices-r | P2 | ? | 6 | unknown | tests/api/finance/invoices.route.test.ts | `tests/api/finance/invoices.route.test.ts` | Pattern 2: Test Mock Incomplete Setup |
| invoice-resolver-was-todo-at-line-987-next-steps-doc-only | P2 | ? | 6 | pending | Doc-only | **`invoice` resolver** (was TODO at line ~987): | Fix 3: GraphQL TODO Stubs Implementation |
| invoice-resolver-validates-objectid-before-querying-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | Invoice resolver validates ObjectId before querying | Fix 3: GraphQL TODO Stubs Implementation |
| GQL-002 | P2 | ? | 6 | pending | lib/graphql/index.ts | Incomplete | Category 3: GraphQL Tenant Isolation Gaps |
| invoice-has-org-guard-but-todo-stub-next-steps-doc-only | P2 | ? | 6 | pending | Doc-only | `invoice` - 🟡 Has org guard but TODO stub | Category 3: GraphQL Tenant Isolation Gaps |
| rate-limit-helper-missing-next-steps-app-api-billing-upgrade-route-ts | P2 | ? | 6 | pending | app/api/billing/upgrade/route.ts | Rate limit helper missing | Full List of Routes Needing Rate Limiting (185 total) |
| impact-prevents-runtime-crashes-on-malformed-data-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | Impact: Prevents runtime crashes on malformed data | 1. JSON.parse Safety (6 high-priority files) |
| app-api-finance-invoices-route-ts-next-steps-app-api-finance-invoices-route-ts | P2 | ? | 6 | unknown | app/api/finance/invoices/route.ts | `app/api/finance/invoices/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-finance-payments-id-complete-route-ts-next-steps-complete-route-ts | P2 | ? | 6 | unknown | /complete/route.ts | `app/api/finance/payments/[id]/complete/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-health-database-route-ts-next-steps-app-api-health-database-route-ts | P2 | ? | 6 | unknown | app/api/health/database/route.ts | `app/api/health/database/route.ts` | 📁 Files Modified This Session |
| app-api-admin-billing-benchmark-route-ts-next-steps-app-api-admin-billing-benchm | P2 | ? | 6 | unknown | app/api/admin/billing/benchmark/route.ts | `app/api/admin/billing/benchmark/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-admin-billing-pricebooks-route-ts-next-steps-app-api-admin-billing-price | P2 | ? | 6 | unknown | app/api/admin/billing/pricebooks/route.ts | `app/api/admin/billing/pricebooks/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-billing-charge-recurring-route-ts-next-steps-app-api-billing-charge-recu | P2 | ? | 6 | unknown | app/api/billing/charge-recurring/route.ts | `app/api/billing/charge-recurring/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-billing-history-route-ts-next-steps-app-api-billing-history-route-ts | P2 | ? | 6 | unknown | app/api/billing/history/route.ts | `app/api/billing/history/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-billing-quote-route-ts-next-steps-app-api-billing-quote-route-ts | P2 | ? | 6 | unknown | app/api/billing/quote/route.ts | `app/api/billing/quote/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-billing-subscribe-route-ts-next-steps-app-api-billing-subscribe-route-ts | P2 | ? | 6 | unknown | app/api/billing/subscribe/route.ts | `app/api/billing/subscribe/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| issue-2-todos-in-resolvers-returning-empty-data-next-steps-doc-only | P2 | ? | 6 | pending | Doc-only | **Issue**: 2 TODOs in resolvers returning empty data | Pattern 3: GraphQL Resolver Stubs |
| rate-limiting-finance-11-routes-next-steps-doc-only | P2 | ? | 6 | pending | Doc-only | Rate limiting: Finance (11 routes) | 🔲 Planned Next Steps |
| analytics-subscriptionbillingservice-payroll-escalation-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | analytics, subscriptionBillingService, payroll, escalation | 🧪 Test Coverage Summary |
| app-fm-vendors-app-fm-invoices-fm-operations-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | `app/fm/vendors/`, `app/fm/invoices/` - FM operations | Pattern 3: Error Boundary Gaps |
| short-circuit-graphql-reads-when-orgid-missing-next-steps-doc-only | P2 | ? | 6 | pending | Doc-only | Short-circuit GraphQL reads when orgId missing | 🔧 Enhancements & Production Readiness |
| fm-work-orders-id-attachments-file-metadata-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | `fm/work-orders/[id]/attachments` — file metadata | 1. Routes Needing Zod Validation (52 routes) |
| aqar-package-payment-creation-uses-user-id-fallback-next-steps-app-api-aqar-pack | P2 | ? | 6 | pending | app/api/aqar/packages/route.ts:102-124 | Aqar package/payment creation uses user-id fallback | 🔧 Enhancements & Production Readiness |
| add-focused-tests-around-invalid-metadata-comment-payloads-and-validation-error- | P2 | ? | 6 | unknown | Doc-only | Add focused tests around invalid metadata/comment payloads and validation error shaping before shipping. | 📍 Current Progress & Planned Next Steps |
| efficiency-currency-feature-flag-type-single-sources-maintained-formatter-curren | P2 | ? | 6 | unknown | Doc-only | Efficiency: Currency/feature-flag/type single sources maintained (formatter + currencies map + feature-flags shim + FM/Invoice types). | Enhancements (Production Readiness) |
| missing-tests-new-coverage-for-checkout-happy-quote-error-tap-client-still-needs | P2 | ? | 6 | pending | Doc-only | Missing Tests: New coverage for checkout happy/quote/error; TAP client still needs additional negative/refund/webhook parsing cases; full Playwright still pending completion. | Enhancements (Production Readiness) |
| tap-coverage-add-tests-for-refund-failures-api-error-codes-and-webhook-signature | P2 | ? | 6 | unknown | Doc-only | TAP coverage: Add tests for refund failures, API error codes, and webhook signature mismatch to mirror checkout coverage and ensure regression safety. | Deep-Dive Similar Issues |
| tap-payments-unit-coverage-exists-for-charge-helpers-add-scenarios-for-error-cod | P2 | ? | 6 | unknown | Doc-only | TAP payments: Unit coverage exists for charge helpers; add scenarios for error codes/refunds/webhook parsing to align with checkout coverage. | Deep-Dive Similar Issues |
| app-api-payments-create-route-ts-app-api-payments-create-route-ts-l116-next-step | P2 | ? | 6 | unknown | app/api/payments/create/route.ts | [app/api/payments/create/route.ts](app/api/payments/create/route.ts#L116) | 🔍 Deep-Dive: Similar/Identical Issues |
| impact-finance-roles-can-read-create-payroll-runs-pii-salary-data-without-hr-app | P2 | ? | 6 | unknown | Doc-only | **Impact:** Finance roles can read/create payroll runs (PII/salary data) without HR approval. | 🔴 Security & RBAC |
| id-normalization-duplication-objectid-checks-appear-in-rest-and-graphql-properti | P2 | ? | 6 | unknown | Doc-only | **ID normalization duplication**: ObjectId checks appear in REST and GraphQL (properties, invoices, work orders). A shared helper will prevent scoping/404 inconsistencies. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| validation-gaps-graphql-currently-accepts-broad-inputs-while-rest-uses-zod-reusi | P2 | ? | 6 | pending | Doc-only | **Validation gaps**: GraphQL currently accepts broad inputs while REST uses Zod; reusing schemas closes bypass paths and aligns error payloads—applies to future GraphQL mutations (properties/invoices) too. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| new-test-coverage-for-finance-invoices-fm-work-orders-souq-settlements-hr-employ | P2 | ? | 6 | unknown | Doc-only | New test coverage for: finance/invoices, fm/work-orders, souq/settlements, hr/employees | 📈 Current Progress |
| finance-invoices-tests-auth-session-mock-not-properly-configured-next-steps-doc- | P2 | ? | 6 | unknown | Doc-only | Finance invoices tests: Auth session mock not properly configured | 🔍 Test Failure Analysis |
| billing-finance-routes-reviewed-for-parsing-auth-gaps-payment-create-auth-orderi | P2 | ? | 6 | pending | Doc-only | Billing/finance routes reviewed for parsing/auth gaps; payment create/auth ordering issue identified. | 📌 Progress & Planned Next Steps |
| recurring-billing-migrated-to-tap-createcharge-with-saved-cards-next-steps-doc-o | P2 | ? | 6 | unknown | Doc-only | ✅ **Recurring billing** migrated to TAP `createCharge()` with saved cards | 1) SESSION SUMMARY |
| refund-processing-migrated-to-tap-createrefund-and-new-getrefund-method-next-ste | P2 | ? | 6 | unknown | Doc-only | ✅ **Refund processing** migrated to TAP `createRefund()` and new `getRefund()` method | 1) SESSION SUMMARY |
| app-api-billing-callback-paytabs-route-ts-next-steps-app-api-billing-callback-pa | P2 | ? | 6 | unknown | app/api/billing/callback/paytabs/route.ts | `app/api/billing/callback/paytabs/route.ts` | Deleted Files (32 total): |
| app-api-payments-paytabs-callback-route-ts-next-steps-app-api-payments-paytabs-c | P2 | ? | 6 | unknown | app/api/payments/paytabs/callback/route.ts | `app/api/payments/paytabs/callback/route.ts` | Deleted Files (32 total): |
| app-api-payments-paytabs-route-ts-next-steps-app-api-payments-paytabs-route-ts | P2 | ? | 6 | unknown | app/api/payments/paytabs/route.ts | `app/api/payments/paytabs/route.ts` | Deleted Files (32 total): |
| lib-payments-paytabs-callback-contract-ts-next-steps-lib-payments-paytabs-callba | P2 | ? | 6 | unknown | lib/payments/paytabs-callback.contract.ts | `lib/payments/paytabs-callback.contract.ts` | Files Removed (PayTabs cleanup) |
| tests-lib-payments-paytabs-callback-contract-test-ts-next-steps-tests-lib-paymen | P2 | ? | 6 | unknown | tests/lib/payments/paytabs-callback.contract.test.ts | `tests/lib/payments/paytabs-callback.contract.test.ts` | Deleted Files (32 total): |
| tests-unit-api-api-payments-paytabs-callback-tenancy-test-ts-next-steps-tests-un | P2 | ? | 6 | unknown | tests/unit/api/api-payments-paytabs-callback-tenancy.test.ts | `tests/unit/api/api-payments-paytabs-callback-tenancy.test.ts` | Deleted Files (32 total): |
| migrate-payments-create-route-ts-to-tap-next-steps-payments-create-route-ts | P2 | ? | 6 | unknown | payments/create/route.ts | Migrate payments/create/route.ts to TAP | 4) COMMIT COMMAND |
| add-getrefund-method-to-tappaymentsclient-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | Add getRefund() method to TapPaymentsClient | 4) COMMIT COMMAND |
| app-api-hr-hr-payroll-sensitive-data-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | `app/api/hr/*` — HR/Payroll (sensitive data) | B) Test Coverage Analysis |
| this-session-paytabs-tap-migration-reverted-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | **This Session**: PayTabs→TAP migration (reverted) | Pattern A: Incomplete Migrations |
| prevention-create-migration-checklist-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | **Prevention**: Create migration checklist: | Pattern A: Incomplete Migrations |
| database-migration-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | Database migration | Pattern A: Incomplete Migrations |
| x-broken-migrations-reverted-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | [x] Broken migrations: Reverted | 7) PRODUCTION READINESS CHECKLIST |
| detected-incomplete-tap-migration-by-other-ai-agent-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | ✅ Detected incomplete TAP migration by other AI agent | 8) SESSION SUMMARY |
| app-api-payments-paytabs-api-routes-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | `app/api/payments/paytabs/*` - API routes | Files Removed (PayTabs cleanup) |
| lib-env-validation-ts-has-validatepaymentconfig-that-validates-at-startup-next-s | P2 | ? | 6 | unknown | lib/env-validation.ts | `lib/env-validation.ts` - Has `validatePaymentConfig()` that validates at startup | 2) HIGH-002 PayTabs Investigation — RESOLVED |
| tests-api-billing-callback-route-test-ts-4-files-next-steps-route-test-ts | P2 | ? | 6 | unknown | .route.test.ts | `tests/api/billing/callback-*.route.test.ts` (4 files) | 3) TEST-SPEC FIX |
| created-tests-api-payments-create-route-test-ts-10-tests-next-steps-tests-api-pa | P2 | ? | 6 | unknown | tests/api/payments/create.route.test.ts | ✅ Created `tests/api/payments/create.route.test.ts` (10 tests) | Test Coverage (Priority: HIGH) |
| create-test-scaffolding-for-payment-routes-next-steps-doc-only | P2 | ? | 6 | unknown | Doc-only | Create test scaffolding for payment routes | 7) PLANNED NEXT STEPS |
| HIGH-002 | P2 | ? | 6 | blocked | Doc-only | **User Actions**: 2 (Payment keys HIGH-002, GitHub quota QUOTA-001) | 5) SESSION SUMMARY |
| supports-org-scoped-branding-features-when-data-exists-defaults-remain-for-offli | P2 | ? | 6 | unknown | Doc-only | Supports org-scoped branding/features when data exists; defaults remain for offline builds | Pattern C: Multi-tenant Placeholder (1 occurrence) |
| 8-critical-test-coverage-gaps-billing-finance-routes-innerhtml-sanitization-in-p | P2 | ? | 6 | pending | Doc-only | **8 Critical**: Test coverage gaps (billing/finance routes), innerHTML sanitization in public/*.js | Code Quality Backlog |
| core-pending-github-actions-quota-billing-payment-keys-user-config-next-steps-do | P2 | ? | 6 | pending | Doc-only | Core pending: GitHub Actions quota (billing), payment keys (user config) | 8) SESSION SUMMARY |
| app-app-billing-history-page-tsx-20-fetch-without-error-handler-next-steps-billi | P2 | ? | 6 | unknown | /billing/history/page.ts | `app/(app)/billing/history/page.tsx:20` - Fetch without error handler | Pattern A: Promise Chains Without Error Handling (52 occurrences) |
| app-fm-dashboard-page-tsx-116-dashboard-data-fetch-next-steps-app-fm-dashboard-p | P2 | ? | 6 | unknown | app/fm/dashboard/page.ts | `app/fm/dashboard/page.tsx:116` - Dashboard data fetch | Pattern A: Promise Chains Without Error Handling (52 occurrences) |
| applied-safe-json-parsing-across-finance-hr-routes-accounts-root-id-expenses-pay | P2 | ? | 6 | unknown | Doc-only | Applied safe JSON parsing across finance/HR routes (accounts root/id, expenses, payments root, payment actions, HR leaves/payroll) with 400 fallback for malformed bodies. | 📈 Progress & Planned Next Steps |
| efficiency-batch-payment-allocations-remove-sequential-awaits-and-recheck-auto-r | P2 | ? | 6 | unknown | Doc-only | **Efficiency:** Batch payment allocations (remove sequential awaits) and recheck auto-repricer N+1 pattern. | 🧩 Enhancements (Prod Readiness) |
| reduce-playwright-smoke-network-churn-by-adding-env-gated-stubs-to-marketplace-s | P2 | ? | 6 | unknown | Doc-only | Reduce Playwright smoke network churn by adding env-gated stubs to marketplace search/listings similar to PDP/homepage (app/marketplace/*); cache static stub data to avoid repeated renders. | 🛠️ Enhancements Needed (Production Readiness) |
| marketplace-data-reliance-homepage-pdp-stubbed-but-search-listings-remain-api-de | P2 | ? | 6 | unknown | Doc-only | Marketplace data reliance: homepage/PDP stubbed, but search/listings remain API-dependent. Prior flakiness suggests aligning those routes with flag-gated stub data to keep smoke predictable. | 🔎 Deep-Dive Analysis (Similar/Repeated Issues) |
| silent-auth-session-failures-getsessionuser-catch-null-recurs-in-upload-flows-ap | P3 | ? | 6 | unknown | app/api/upload/presigned-url/route.ts | **Silent auth/session failures** — `getSessionUser(...).catch(() => null)` recurs in upload flows (`app/api/upload/presigned-url/route.ts`, `app/api/upload/scan/route.ts`, `app/api/upload/scan-status/route.ts`, `app/api/upload/verify-metadata/route.ts`), help (`app/api/help/escalate/route.ts`, `app/api/help/articles/route.ts`, `app/api/help/ask/route.ts`, `app/api/help/context/route.ts`), onboarding docs (`app/api/onboarding/*`), settings logo (`app/api/settings/logo/route.ts`), subscription middleware (`server/middleware/subscriptionCheck.ts`), resume downloads (`app/api/files/resumes/[file]/route.ts`), and souq search gating (`app/api/souq/search/route.ts`). Infra outages look like 401s with no telemetry; fix by centralizing an observability-aware session helper and adding regression tests. | 🔍 Deep-Dive Analysis of Similar Patterns |
| commit-pending-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Commit: (pending) | Developer Task Breakdown (4.2.14) |
| all-validation-gaps-addressed-null-checks-input-validation-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | All validation gaps addressed (null checks, input validation) | PM Gate Analysis (4.2.1) |
| AGENT-001 | P2 | ? | 5 | pending | Doc-only | [ ] Commit changes with `[AGENT-001-A]` token | 📝 Review Comments Addressed (2025-12-24 06:20) |
| create-pr-for-review-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Create PR for review | 🎯 NEXT STEPS |
| after-codex-approval-deploy-to-production-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] After Codex approval, deploy to production | 🎯 NEXT STEPS |
| verify-production-login-flow-works-after-rate-limit-resets-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Verify production login flow works (after rate limit resets) | 🎯 NEXT STEPS |
| tests-2918-passing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Tests:** ✅ 2918+ passing | 🎯 Codebase Status |
| typescript-0-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **TypeScript:** ✅ 0 errors | 🚀 Production Readiness Assessment |
| eslint-0-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **ESLint:** ✅ 0 errors | P0: Verification Gates |
| monitor-auto-assignment-engine-for-any-runtime-errors-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Monitor auto-assignment-engine for any runtime errors | 🎯 Next Steps |
| verify-system-automated-work-orders-create-correctly-with-null-assignedby-next-s | P2 | ? | 5 | pending | Doc-only | [ ] Verify system-automated work orders create correctly with null assignedBy | 🎯 Next Steps |
| await-codex-review-gate-agents-md-section-14-next-steps-agents-md | P2 | ? | 5 | pending | AGENTS.md | [ ] Await Codex review gate (AGENTS.md Section 14) | 2025-12-29 14:34 (Asia/Riyadh) � Code Review Update [AGENT-003-A] |
| x-fix-vendor-products-route-test-ts-mock-isolation-next-steps-vendor-products-ro | P2 | ? | 5 | unknown | vendor-products.route.test.ts | [x] Fix vendor-products.route.test.ts mock isolation ✅ | 🎯 Next Steps |
| x-fix-7-mongoose-mock-test-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Fix 7 mongoose mock test files ✅ | 🎯 Next Steps |
| x-push-fixes-e7c3c5d9c-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Push fixes (e7c3c5d9c) ✅ | 🎯 Next Steps |
| wait-for-ci-to-complete-and-verify-tests-server-4-4-passes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Wait for CI to complete and verify Tests (Server) 4/4 passes | 🎯 Next Steps |
| address-remaining-pr-601-review-comments-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Address remaining PR #601 review comments | 🎯 Next Steps |
| merge-pr-601-after-all-ci-checks-pass-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Merge PR #601 after all CI checks pass | 🎯 Next Steps |
| x-run-full-test-suite-to-verify-timer-isolation-fix-works-314s-all-pass-next-ste | P2 | ? | 5 | unknown | Doc-only | [x] Run full test suite to verify timer isolation fix works ✅ (314s, all pass) | 🎯 Next Steps |
| address-remaining-pr-review-comments-design-tokens-css-question-next-steps-desig | P2 | ? | 5 | pending | design-tokens.css | [ ] Address remaining PR review comments (design-tokens.css question) | 🎯 Next Steps |
| merge-pr-601-after-ci-passes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Merge PR #601 after CI passes | 🎯 Next Steps |
| tests-unit-services-work-order-status-race-test-ts-next-steps-tests-unit-service | P2 | ? | 5 | unknown | tests/unit/services/work-order-status-race.test.ts | `tests/unit/services/work-order-status-race.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| tests-unit-server-services-onboardingentities-test-ts-next-steps-tests-unit-serv | P2 | ? | 5 | unknown | tests/unit/server/services/onboardingEntities.test.ts | `tests/unit/server/services/onboardingEntities.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| tests-unit-api-issues-issues-route-test-ts-next-steps-tests-unit-api-issues-issu | P2 | ? | 5 | unknown | tests/unit/api/issues/issues.route.test.ts | `tests/unit/api/issues/issues.route.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| tests-unit-api-admin-users-route-test-ts-next-steps-tests-unit-api-admin-users-r | P2 | ? | 5 | unknown | tests/unit/api/admin/users.route.test.ts | `tests/unit/api/admin/users.route.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| tests-unit-api-admin-users-users-route-test-ts-next-steps-tests-unit-api-admin-u | P2 | ? | 5 | unknown | tests/unit/api/admin/users/users.route.test.ts | `tests/unit/api/admin/users/users.route.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| tests-server-services-owner-financeintegration-test-ts-next-steps-tests-server-s | P2 | ? | 5 | unknown | tests/server/services/owner/financeIntegration.test.ts | `tests/server/services/owner/financeIntegration.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| tests-models-aqarbooking-test-ts-next-steps-tests-models-aqarbooking-test-ts | P2 | ? | 5 | unknown | tests/models/aqarBooking.test.ts | `tests/models/aqarBooking.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| tests-api-superadmin-organizations-route-test-ts-next-steps-tests-api-superadmin | P2 | ? | 5 | unknown | tests/api/superadmin/organizations.route.test.ts | `tests/api/superadmin/organizations.route.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| tests-api-admin-users-route-test-ts-next-steps-tests-api-admin-users-route-test- | P2 | ? | 5 | unknown | tests/api/admin/users.route.test.ts | `tests/api/admin/users.route.test.ts` | 📋 REMAINING MONGOOSE MOCK ISSUES (P2 - Tracked) |
| ci-sharded-typecheck-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | CI-Sharded typecheck | 📊 CI STATUS ANALYSIS (Post-Push) |
| announce-completion-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Announce completion | 📋 AGENTS.md Compliance (Section 4.3 Post-Task Checklist) |
| notify-eng-sultan-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | NOTIFY Eng. Sultan | 📋 AGENTS.md Compliance (Section 4.3 Post-Task Checklist) |
| wait-for-codex-approved-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Wait for Codex APPROVED | 📋 AGENTS.md Compliance (Section 4.3 Post-Task Checklist) |
| awaiting-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | AWAITING | 📊 CI STATUS (Post-Fixes) |
| tests-i18n-scan-mjs-error-boundary-exclusions-next-steps-tests-i18n-scan-mjs | P2 | ? | 5 | unknown | tests/i18n-scan.mjs | `tests/i18n-scan.mjs` — Error boundary exclusions | 📁 Files Modified This Session (12 files) |
| github-workflows-route-quality-yml-rtl-smoke-auth-secrets-next-steps-github-work | P2 | ? | 5 | unknown | .github/workflows/route-quality.yml | `.github/workflows/route-quality.yml` — RTL smoke auth secrets | 📁 Files Modified This Session (12 files) |
| github-workflows-qa-yml-heap-memory-increase-next-steps-github-workflows-qa-yml | P2 | ? | 5 | unknown | .github/workflows/qa.yml | `.github/workflows/qa.yml` — Heap memory increase | 📁 Files Modified This Session (12 files) |
| scripts-ci-check-critical-env-ts-redis-removed-tap-vercel-aware-next-steps-scrip | P2 | ? | 5 | unknown | scripts/ci/check-critical-env.ts | `scripts/ci/check-critical-env.ts` — Redis removed, Tap Vercel-aware | 📁 Files Modified (12 files) |
| scripts-check-nav-routes-ts-route-group-mappings-next-steps-scripts-check-nav-ro | P2 | ? | 5 | unknown | scripts/check-nav-routes.ts | `scripts/check-nav-routes.ts` — Route group mappings | 📁 Files Modified This Session (12 files) |
| lib-db-collections-ts-index-sparse-partial-fix-next-steps-lib-db-collections-ts | P2 | ? | 5 | unknown | lib/db/collections.ts | `lib/db/collections.ts` — Index sparse+partial fix | 📁 Files Modified This Session (12 files) |
| lib-ai-embeddings-embeddings-ts-renamed-from-ai-next-steps-lib-ai-embeddings-emb | P2 | ? | 5 | unknown | lib/ai-embeddings/embeddings.ts | `lib/ai-embeddings/embeddings.ts` — Renamed from ai/ | 📁 Files Modified (12 files) |
| lib-mongo-ts-top-level-await-fix-next-steps-lib-mongo-ts | P2 | ? | 5 | unknown | lib/mongo.ts | `lib/mongo.ts` — Top-level await fix | 📁 Files Modified This Session (12 files) |
| announce-complete-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Announce complete | 📋 AGENTS.md Compliance (Section 4.3 Post-Task Checklist) |
| redis-removed-entirely-from-check-critical-env-ts-not-just-skipped-next-steps-ch | P2 | ? | 5 | unknown | check-critical-env.ts | ✅ **Redis** - Removed entirely from check-critical-env.ts (not just skipped) | 📊 User Instructions Addressed |
| ai-folder-conflict-renamed-to-lib-ai-embeddings-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **AI folder conflict** - Renamed to lib/ai-embeddings | 📊 User Instructions Addressed |
| github-workflows-e2e-tests-yml-quoted-github-output-next-steps-github-workflows- | P2 | ? | 5 | unknown | .github/workflows/e2e-tests.yml | `.github/workflows/e2e-tests.yml` — Quoted $GITHUB_OUTPUT | ⛔ Blocking Items Requiring Immediate Action |
| kb-ingest-ts-updated-import-path-next-steps-kb-ingest-ts | P2 | ? | 5 | unknown | kb/ingest.ts | `kb/ingest.ts` — Updated import path | 📁 Files Modified (12 files) |
| scripts-kb-change-stream-ts-updated-import-path-next-steps-scripts-kb-change-str | P2 | ? | 5 | unknown | scripts/kb-change-stream.ts | `scripts/kb-change-stream.ts` — Updated import path | 📁 Files Modified (12 files) |
| app-api-help-ask-route-ts-updated-import-path-next-steps-app-api-help-ask-route- | P2 | ? | 5 | unknown | app/api/help/ask/route.ts | `app/api/help/ask/route.ts` — Updated import path | 📁 Files Modified This Session |
| qa-workflow-should-pass-after-redis-removal-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | QA workflow - should pass after Redis removal | ⏳ Pending Verification |
| route-quality-should-pass-after-nav-path-fix-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Route Quality - should pass after nav path fix | ⏳ Pending Verification |
| test-runner-should-pass-after-index-fix-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Test Runner - should pass after index fix | ⏳ Pending Verification |
| changed-flag-local-ai-folder-conflicts-with-ai-npm-package-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | `--changed` flag + local `ai/` folder conflicts with `ai` npm package | 📊 CI Failure Analysis |
| depends-on-above-fixes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Depends on above fixes | 📊 CI Failure Analysis |
| mongodb-safe-pattern-scripts-assert-nonprod-mongo-ts-next-steps-scripts-assert-n | P2 | ? | 5 | unknown | scripts/assert-nonprod-mongo.ts | **MongoDB Safe Pattern** (`scripts/assert-nonprod-mongo.ts`) | 📝 CI Investigation (2025-12-24 02:20) |
| removed-fixzit-from-production-patterns-ci-legitimately-uses-this-db-next-steps- | P2 | ? | 5 | unknown | Doc-only | Removed `/fixzit$/` from `PRODUCTION_PATTERNS` (CI legitimately uses this DB) | ✅ Fixes Applied |
| rtl-lint-components-i18n-currencychangeconfirmdialog-tsx-50-next-steps-component | P2 | ? | 5 | unknown | components/i18n/CurrencyChangeConfirmDialog.ts | **RTL Lint** (`components/i18n/CurrencyChangeConfirmDialog.tsx:50`) | 📁 Files Modified (4 files) |
| changed-text-right-text-left-text-end-text-start-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Changed `text-right/text-left` → `text-end/text-start` | ✅ Fixes Applied |
| lines-64-72-grouped-echo-github-step-summary-into-github-step-summary-next-steps | P2 | ? | 5 | unknown | Doc-only | Lines 64-72: Grouped `echo >> $GITHUB_STEP_SUMMARY` into `{ } >> "$GITHUB_STEP_SUMMARY"` | ✅ Fixes Applied |
| lines-258-263-grouped-echo-github-env-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Lines 258-263: Grouped `echo >> $GITHUB_ENV` | ✅ Fixes Applied |
| lines-514-521-grouped-summary-output-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Lines 514-521: Grouped summary output | ✅ Fixes Applied |
| scripts-seed-e2e-test-users-ts-same-pattern-next-steps-scripts-seed-e2e-test-use | P2 | ? | 5 | unknown | scripts/seed-e2e-test-users.ts | `scripts/seed-e2e-test-users.ts` — Same pattern | 📁 Files Modified (8 files) |
| lib-config-demo-users-ts-corporate-roles-canonical-displayrole-next-steps-lib-co | P2 | ? | 5 | unknown | lib/config/demo-users.ts | `lib/config/demo-users.ts` — CORPORATE roles → canonical + displayRole | 📁 Files Modified (8 files) |
| before-drift-check-failing-with-6-violations-non-canonical-roles-hardcoded-org-i | P2 | ? | 5 | unknown | Doc-only | **Before:** Drift check failing with 6 violations (non-canonical roles + hardcoded org ID) | 🎯 Impact |
| after-drift-check-passes-all-seed-scripts-use-env-vars-roles-match-canonical-rol | P2 | ? | 5 | unknown | Doc-only | **After:** Drift check passes, all seed scripts use env vars, roles match CANONICAL_ROLES | 🎯 Impact |
| fail-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ❌ FAIL | 📊 CI Status (Post-Fix) |
| 218-translation-keys-missing-in-en-json-ar-json-next-steps-en-json-ar-js | P2 | ? | 5 | pending | en.json/ar.js | 218 translation keys missing in en.json/ar.json | 🔴 Pre-Existing Issues on main (Not Introduced by This PR) |
| missing-redis-url-redis-key-in-ci-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Missing REDIS_URL/REDIS_KEY in CI | 🔴 Pre-Existing Issues on main (Not Introduced by This PR) |
| rtl-styles-animations-css-l17-35-defines-css-vars-l86-109-defines-rtl-aware-keyf | P2 | ? | 5 | unknown | styles/animations.css | RTL: `styles/animations.css` L17-35 defines CSS vars; L86-109 defines RTL-aware keyframes; L682-693 defines utility classes | 📁 Files Modified/Created |
| animation-presets-lib-theme-useanimation-ts-l19-21-adds-types-l453-464-adds-pres | P2 | ? | 5 | unknown | lib/theme/useAnimation.ts | Animation Presets: `lib/theme/useAnimation.ts` L19-21 adds types; L453-464 adds presets | 📁 Files Modified/Created |
| client-test-2-2-failure-export-worker-process-test-ts-requires-redis-config-redi | P2 | ? | 5 | unknown | export-worker.process.test.ts | **Client Test (2/2) Failure**: `export-worker.process.test.ts` requires Redis config (REDIS_URL/REDIS_KEY) | 📝 CI Investigation (2025-12-24 02:20) |
| test-runner-failure-drift-guard-detects-non-canonical-roles-in-seed-scripts-next | P2 | ? | 5 | unknown | Doc-only | **Test Runner Failure**: Drift Guard detects non-canonical roles in seed scripts | 📝 CI Investigation (2025-12-24 02:20) |
| artifact-naming-colons-in-artifact-names-rejected-by-github-actions-next-steps-d | P2 | ? | 5 | unknown | Doc-only | **Artifact Naming**: Colons in artifact names rejected by GitHub Actions | 📝 CI Investigation (2025-12-24 02:20) |
| gemini-promise-resolve-comment-false-positive-next-js-15-uses-async-params-tests | P2 | ? | 5 | unknown | Next.js | Gemini `Promise.resolve()` comment: **FALSE POSITIVE** (Next.js 15 uses async params, tests pass) | Root Cause Analysis |
| coderabbit-jsonc-formatting-nitpick-non-blocking-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | CodeRabbit JSONC formatting: **Nitpick** (non-blocking) | 📝 CI Investigation (2025-12-24 02:20) |
| tests-api-filters-presets-route-test-ts-static-imports-fix-next-steps-tests-api- | P2 | ? | 5 | unknown | tests/api/filters/presets.route.test.ts | `tests/api/filters/presets.route.test.ts` - Static imports fix | 📁 Files Modified/Created |
| deleted-420-stub-test-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Deleted 420 stub test files | 📁 Files Modified/Created |
| deleted-20-empty-bracket-folders-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Deleted 20 empty bracket folders | 📁 Files Modified/Created |
| styles-tokens-css-ssot-design-tokens-next-steps-styles-tokens-css | P2 | ? | 5 | unknown | styles/tokens.css | `styles/tokens.css` - SSOT design tokens | 📁 Files Modified/Created |
| lib-theme-index-ts-exports-next-steps-lib-theme-index-ts | P2 | ? | 5 | unknown | lib/theme/index.ts | `lib/theme/index.ts` - Exports | 📁 Files Modified/Created |
| components-ui-icon-tsx-token-classes-next-steps-components-ui-icon-ts | P2 | ? | 5 | unknown | components/ui/Icon.ts | `components/ui/Icon.tsx` - Token classes | 📊 Files Created |
| styles-globals-css-imports-next-steps-styles-globals-css | P2 | ? | 5 | unknown | styles/globals.css | `styles/globals.css` - Imports | 📁 Files Modified/Created |
| components-ui-icons-ts-central-barrel-file-next-steps-components-ui-icons-ts | P2 | ? | 5 | unknown | components/ui/icons.ts | **`components/ui/icons.ts`** - Central barrel file | 📊 Files Created |
| re-exports-all-icons-from-lucide-react-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Re-exports all icons from lucide-react | 📊 Files Created |
| exports-icon-iconbutton-iconsizemap-iconcolormap-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Exports Icon, IconButton, iconSizeMap, iconColorMap | 📊 Files Created |
| exports-types-iconprops-iconbuttonprops-iconsize-iconcolor-lucideicon-lucideprop | P2 | ? | 5 | unknown | Doc-only | Exports types: IconProps, IconButtonProps, IconSize, IconColor, LucideIcon, LucideProps | 📊 Files Created |
| default-1-5px-stroke-weight-dga-standard-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Default 1.5px stroke weight (DGA standard) | 📊 Files Created |
| size-variants-xs-12-sm-16-md-20-lg-24-xl-32-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Size variants: xs(12), sm(16), md(20), lg(24), xl(32) | 📊 Files Created |
| color-variants-default-primary-0061a8-success-00a859-warning-ffb400-error-muted- | P2 | ? | 5 | unknown | Doc-only | Color variants: default, primary(#0061A8), success(#00A859), warning(#FFB400), error, muted | 📊 Files Created |
| iconbutton-with-44px-minimum-touch-target-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | IconButton with 44px minimum touch target | 📊 Files Created |
| all-6-066-source-files-confirmed-present-app-754-lib-243-server-220-components-2 | P2 | ? | 5 | unknown | Doc-only | All 6,066+ source files confirmed present (app: 754, lib: 243, server: 220, components: 272) | 2025-12-23 12:00 (Asia/Riyadh) — File Migration Verification & TypeScript Fixes |
| vs-code-problems-panel-showed-stale-errors-actual-typecheck-passes-next-steps-do | P2 | ? | 5 | unknown | Doc-only | VS Code Problems panel showed stale errors - actual typecheck passes | 2025-12-23 12:00 (Asia/Riyadh) — File Migration Verification & TypeScript Fixes |
| TYPES-002 | P2 | ? | 5 | unknown | types/xmlbuilder2.d.ts | FIX-TYPES-002: Created `types/xmlbuilder2.d.ts` type declarations | 2025-12-23 12:00 (Asia/Riyadh) — File Migration Verification & TypeScript Fixes |
| created-types-xmlbuilder2-d-ts-type-declarations-for-xml-builder-next-steps-type | P2 | ? | 5 | unknown | types/xmlbuilder2.d.ts | Created `types/xmlbuilder2.d.ts` - type declarations for XML builder | 2025-12-23 12:00 (Asia/Riyadh) — File Migration Verification & TypeScript Fixes |
| p2-address-eslint-no-unused-vars-across-copied-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **P2**: Address ESLint no-unused-vars across copied files | 2025-12-23 12:00 (Asia/Riyadh) — File Migration Verification & TypeScript Fixes |
| as-any-occurrences-15-found-across-issues-superadmin-routes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `as any` occurrences: 15+ found across issues, superadmin routes | 2025-12-22 01:30 (Asia/Riyadh) — Batch 7 Type Safety Improvements |
| ts-expect-error-2-found-justified-3rd-party-libs-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `@ts-expect-error`: 2 found (justified - 3rd party libs) | 2025-12-22 01:30 (Asia/Riyadh) — Batch 7 Type Safety Improvements |
| console-log-in-prod-1-found-jsdoc-example-not-actual-code-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `console.log` in prod: 1 found (JSDoc example, not actual code) | 2025-12-22 01:30 (Asia/Riyadh) — Batch 7 Type Safety Improvements |
| TYPES-001 | P2 | ? | 5 | unknown | Doc-only | FIX-TYPES-001: Removed 15 `as any` casts with proper type assertions | 2025-12-22 01:30 (Asia/Riyadh) — Batch 7 Type Safety Improvements |
| app-api-issues-import-route-ts-use-request-json-directly-add-issueleandoc-type-n | P2 | ? | 5 | unknown | app/api/issues/import/route.ts | app/api/issues/import/route.ts: Use request.json() directly, add IssueLeanDoc type | 2025-12-22 01:30 (Asia/Riyadh) — Batch 7 Type Safety Improvements |
| app-api-issues-route-ts-import-iissue-cast-duplicates-properly-next-steps-app-ap | P2 | ? | 5 | unknown | app/api/issues/route.ts | app/api/issues/route.ts: Import IIssue, cast duplicates properly | 📍 Progress & Planned Next Steps |
| app-api-superadmin-login-route-ts-use-request-json-directly-next-steps-app-api-s | P2 | ? | 5 | unknown | app/api/superadmin/login/route.ts | app/api/superadmin/login/route.ts: Use request.json() directly | 🔍 Deep-Dive Analysis of Similar Issues |
| app-api-superadmin-branding-route-ts-add-platformsettingswithaudit-type-for-audi | P2 | ? | 5 | unknown | app/api/superadmin/branding/route.ts | app/api/superadmin/branding/route.ts: Add PlatformSettingsWithAudit type for audit plugin fields | 2025-12-22 01:30 (Asia/Riyadh) — Batch 7 Type Safety Improvements |
| eslint-0-errors-1-warning-expected-vitest-comment-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ESLint: 0 errors, 1 warning (expected vitest comment) | 2025-12-22 01:30 (Asia/Riyadh) — Batch 7 Type Safety Improvements |
| add-rate-limiting-to-superadmin-routes-pending-limiter-hardening-next-steps-doc- | P2 | ? | 5 | pending | Doc-only | add-rate-limiting-to-superadmin-routes — pending limiter hardening. | 2025-12-14 22:25 (Asia/Riyadh) — Code Review Update |
| add-rate-limiting-to-issues-api-routes-pending-limiter-hardening-next-steps-doc- | P2 | ? | 5 | pending | Doc-only | add-rate-limiting-to-issues-api-routes — pending limiter hardening. | 2025-12-14 22:25 (Asia/Riyadh) — Code Review Update |
| add-rate-limiting-to-superadmin-routes-add-enforceratelimit-middleware-regressio | P2 | ? | 5 | unknown | Doc-only | add-rate-limiting-to-superadmin-routes — add `enforceRateLimit` middleware + regression tests. | 2025-12-14 22:25 (Asia/Riyadh) — Code Review Update |
| add-rate-limiting-to-issues-api-routes-apply-enforceratelimit-across-issues-rout | P2 | ? | 5 | unknown | Doc-only | add-rate-limiting-to-issues-api-routes — apply `enforceRateLimit` across Issues routes + tests. | 2025-12-14 22:25 (Asia/Riyadh) — Code Review Update |
| efficiency-improvements-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Efficiency improvements** | 🛠️ Enhancements Needed (Production Readiness) |
| standardize-cache-path-outputs-across-workflows-using-the-pnpm-store-pattern-git | P2 | ? | 5 | unknown | .github/workflows/agent-governor.yml:41-52 | Standardize cache path outputs across workflows using the `pnpm-store` pattern (`.github/workflows/agent-governor.yml:41-52`). | 🔧 Enhancements Needed for Production Readiness |
| guard-db-dependent-steps-behind-secret-presence-to-avoid-fork-failures-agent-gov | P2 | ? | 5 | unknown | agent-governor.yml:76-82 | Guard DB-dependent steps behind secret presence to avoid fork failures (`agent-governor.yml:76-82`; mirror in `build-sourcemaps.yml:53-56`). | 🔧 Enhancements Needed for Production Readiness |
| identified-bugs-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Identified bugs** | 🛠️ Enhancements Needed (Production Readiness) |
| logic-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Logic errors** | 🛠️ Enhancements Needed (Production Readiness) |
| none-observed-in-this-session-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | None observed in this session. | 🔧 Enhancements Needed for Production Readiness |
| missing-tests-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | **Missing tests** | 🛠️ Enhancements Needed (Production Readiness) |
| no-automated-checks-enforce-fork-safety-secret-guards-add-actionlint-or-a-reusab | P2 | ? | 5 | unknown | Doc-only | No automated checks enforce fork-safety/secret guards; add actionlint or a reusable composite check for workflows touching secrets. | 🔧 Enhancements Needed for Production Readiness |
| build-sourcemaps-yml-53-56-still-attempts-mongo-index-creation-with-a-localhost- | P2 | ? | 5 | pending | build-sourcemaps.yml:53-56 | `build-sourcemaps.yml:53-56` still attempts Mongo index creation with a localhost fallback; on forks, this can fail due to missing Mongo. Recommend adding `if: ${{ env.MONGODB_URI != '' }}` and removing the localhost fallback. | 🔍 Deep-Dive Analysis of Similar Issues |
| multiple-workflows-e-g-test-runner-yml-e2e-tests-yml-intentionally-use-secret-fa | P2 | ? | 5 | unknown | test-runner.yml | Multiple workflows (e.g., `test-runner.yml`, `e2e-tests.yml`) intentionally use secret fallbacks; standardize guardrails or document exceptions to prevent future lint noise and accidental secret reliance. | 🔍 Deep-Dive Analysis of Similar Issues |
| no-additional-store-path-nextauth-url-style-warnings-remain-after-current-workfl | P2 | ? | 5 | unknown | Doc-only | No additional `STORE_PATH`/`NEXTAUTH_URL` style warnings remain after current workflow edits. | 🔍 Deep-Dive Analysis of Similar Issues |
| not-re-run-last-recorded-0-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Not re-run (last recorded 0) | 📍 Current Progress Summary |
| none-detected-in-current-sweep-no-behavior-regressions-surfaced-by-tests-next-st | P2 | ? | 5 | unknown | Doc-only | None detected in current sweep; no behavior regressions surfaced by tests. | 🔧 Enhancements Needed for Production Readiness |
| crm-module-4-routes-lacks-coverage-add-crud-tests-for-app-api-crm-next-steps-doc | P2 | ? | 5 | unknown | Doc-only | CRM module (4 routes) lacks coverage; add CRUD tests for `app/api/crm/*`. | 🔧 Enhancements Needed for Production Readiness |
| superadmin-routes-3-routes-lack-tests-add-auth-session-regression-cases-next-ste | P2 | ? | 5 | unknown | Doc-only | Superadmin routes (3 routes) lack tests; add auth/session/regression cases. | 🔧 Enhancements Needed for Production Readiness |
| souq-coverage-gaps-remain-on-44-routes-75-total-prioritize-checkout-repricer-ful | P2 | ? | 5 | pending | Doc-only | Souq coverage gaps remain on 44 routes (75 total); prioritize checkout, repricer, fulfillment edges. | 🔧 Enhancements Needed for Production Readiness |
| support-admin-gaps-5-and-19-routes-respectively-add-impersonation-and-admin-acti | P2 | ? | 5 | pending | Doc-only | Support/Admin gaps (5 and 19 routes respectively); add impersonation and admin action flows to raise confidence. | 🔧 Enhancements Needed for Production Readiness |
| react-act-warnings-in-rtl-i18n-flows-tests-integration-dashboard-hr-integration- | P2 | ? | 5 | unknown | tests/integration/dashboard-hr.integration.test.ts | **React act() warnings in RTL/i18n flows**: `tests/integration/dashboard-hr.integration.test.tsx` triggers double `act()` warnings tied to `i18n/I18nProvider.tsx:27` when state updates fire during mount. The pattern suggests similar integrations using `I18nProvider` may warn; wrapping provider initialization in `act` (or awaiting state-settling utilities) will reduce test noise and keep CI signal clean. | 🔍 Deep-Dive Analysis of Similar Issues |
| 16-gaps-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 🔶 16 gaps | ✅ v65.20 Session Progress — Deep-Dive Audit |
| system-next-steps-app-api-healthcheck-route-ts | P2 | ? | 5 | pending | app/api/healthcheck/route.ts | System | 1. Routes Without Rate Limiting (16 found) |
| auth-next-steps-app-api-superadmin-logout-route-ts | P2 | ? | 5 | pending | app/api/superadmin/logout/route.ts | Auth | 1. Routes Without Rate Limiting (16 found) |
| x-tests-100-passing-3309-3309-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Tests: 100% passing (3309/3309) | 🔒 XSS Protection Verification |
| x-build-0-ts-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Build: 0 TS errors | 📊 Commit History (Today) |
| x-eslint-0-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] ESLint: 0 errors | 7) PRODUCTION READINESS CHECKLIST |
| x-console-log-0-in-api-all-using-logger-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Console.log: 0 in API (all using logger) | 🔒 XSS Protection Verification |
| x-empty-catches-0-in-api-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Empty catches: 0 in API | 🔒 XSS Protection Verification |
| username-superadmin-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Username: `superadmin` | 🔐 Superadmin Auth Configuration |
| password-admin123-change-in-production-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Password: `admin123` (change in production!) | 🔐 Superadmin Auth Configuration |
| category-from-id-prefix-bug-sec-logic-etc-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Category from ID prefix (BUG, SEC, LOGIC, etc.) | 🛠️ CLI Enhancements (v65.19) |
| status-from-checkbox-x-vs-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Status from checkbox `[x]` vs `[ ]` | 🛠️ CLI Enhancements (v65.19) |
| filters-status-priority-category-search-view-mode-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Filters: status, priority, category, search, view mode | List Page (`app/admin/issues/page.tsx`) |
| view-modes-all-quick-wins-stale-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ View modes: All, Quick Wins, Stale | List Page (`app/admin/issues/page.tsx`) |
| issues-table-with-sorting-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Issues table with sorting | List Page (`app/admin/issues/page.tsx`) |
| pagination-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Pagination | List Page (`app/admin/issues/page.tsx`) |
| export-to-json-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Export to JSON | List Page (`app/admin/issues/page.tsx`) |
| import-dialog-json-text-dry-run-support-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Import dialog (JSON/text, dry-run support) | List Page (`app/admin/issues/page.tsx`) |
| sync-from-pending-master-button-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Sync from PENDING_MASTER button | List Page (`app/admin/issues/page.tsx`) |
| issue-details-editing-title-description-root-cause-proposed-fix-next-steps-doc-o | P2 | ? | 5 | unknown | Doc-only | ✅ Issue details editing (title, description, root cause, proposed fix) | Detail Page (`app/admin/issues/[id]/page.tsx`) |
| properties-panel-status-priority-effort-category-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Properties panel (status, priority, effort, category) | Detail Page (`app/admin/issues/[id]/page.tsx`) |
| location-display-file-path-line-numbers-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Location display (file path, line numbers) | Detail Page (`app/admin/issues/[id]/page.tsx`) |
| labels-and-risk-tags-display-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Labels and risk tags display | Detail Page (`app/admin/issues/[id]/page.tsx`) |
| activity-tab-with-audit-history-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Activity tab with audit history | Detail Page (`app/admin/issues/[id]/page.tsx`) |
| comments-tab-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Comments tab | Detail Page (`app/admin/issues/[id]/page.tsx`) |
| delete-confirmation-dialog-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Delete confirmation dialog | Detail Page (`app/admin/issues/[id]/page.tsx`) |
| save-button-with-api-patch-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Save button with API PATCH | Detail Page (`app/admin/issues/[id]/page.tsx`) |
| objectid-validation-try-new-objectid-id-catch-return-id-intentional-next-steps-d | P2 | ? | 5 | unknown | Doc-only | ObjectId validation: `try { new ObjectId(id) } catch { return id }` - intentional | 2. Empty Catch Analysis (50 instances) |
| json-parse-catch-return-graceful-degradation-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | JSON parse: `catch { return {} }` - graceful degradation | 2. Empty Catch Analysis (50 instances) |
| optional-features-catch-silently-continue-feature-flags-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Optional features: `catch { /* silently continue */ }` - feature flags | 2. Empty Catch Analysis (50 instances) |
| x-tests-100-passing-3286-3286-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Tests: 100% passing (3286/3286) | 📋 Files Modified |
| x-no-console-runtime-issues-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] No console/runtime issues | 📊 Commit History (Today) |
| x-tenancy-filters-all-enforced-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Tenancy filters: All enforced | 📊 Commit History (Session) |
| get-api-help-articles-401-unauthorized-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `GET /api/help/articles` → 401 (Unauthorized) | 🔴 Issue Reported |
| get-api-notifications-401-unauthorized-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `GET /api/notifications` → 401 (Unauthorized) | 🔴 Issue Reported |
| get-api-qa-health-401-unauthorized-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `GET /api/qa/health` → 401 (Unauthorized) | 🔴 Issue Reported |
| post-api-qa-reconnect-401-unauthorized-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `POST /api/qa/reconnect` → 401 (Unauthorized) | 🔴 Issue Reported |
| post-api-qa-alert-403-forbidden-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `POST /api/qa/alert` → 403 (Forbidden) | 🔴 Issue Reported |
| post-api-auth-otp-send-500-config-issue-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `POST /api/auth/otp/send` → 500 (Config issue) | 🔴 Issue Reported |
| nextauth-bypass-otp-is-enabled-but-nextauth-bypass-otp-code-is-not-set-next-step | P2 | ? | 5 | unknown | Doc-only | `NEXTAUTH_BYPASS_OTP` is enabled but `NEXTAUTH_BYPASS_OTP_CODE` is not set | 🔧 OTP 500 Resolution |
| x-no-runtime-hydration-issues-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] No runtime/hydration issues | 📋 Files Modified |
| x-tenancy-filters-n-a-client-side-fix-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Tenancy filters: N/A (client-side fix) | 📋 Files Modified |
| located-master-pending-report-this-file-and-avoided-duplicates-next-steps-doc-on | P2 | ? | 5 | pending | Doc-only | Located Master Pending Report (this file) and avoided duplicates. | Progress |
| implemented-super-admin-gating-for-autofix-auto-monitoring-to-stop-unauthenticat | P2 | ? | 5 | unknown | lib/AutoFixManager.ts | Implemented super-admin gating for AutoFix auto-monitoring to stop unauthenticated 401/403 storms to `/api/help/articles`, `/api/notifications`, `/api/qa/*` (lib/AutoFixManager.ts; components/AutoFixInitializer.tsx; components/SystemVerifier.tsx). | Deep-Dive on Similar Issues |
| stopped-default-constructor-auto-start-monitoring-now-opt-in-and-client-only-nex | P2 | ? | 5 | unknown | Doc-only | Stopped default constructor auto-start; monitoring now opt-in and client-only. | Progress |
| ongoing-otp-send-endpoint-returning-500-needs-reproduction-details-awaiting-resp | P2 | ? | 5 | pending | Doc-only | Ongoing: OTP send endpoint returning 500 needs reproduction details; awaiting response payload/logs to isolate root cause. | Progress |
| verify-in-browser-logged-out-logged-in-non-super-admin-that-no-auto-monitor-netw | P2 | ? | 5 | unknown | Doc-only | Verify in-browser (logged out + logged in non-super-admin) that no auto-monitor network chatter occurs; confirm only SUPER_ADMIN can start monitoring/SystemVerifier actions. | Next Steps |
| capture-otp-send-failure-evidence-response-json-server-logs-and-triage-root-caus | P2 | ? | 5 | unknown | Doc-only | Capture OTP send failure evidence (response JSON + server logs) and triage root cause; add regression test once repro is known. | Next Steps |
| run-lint-targeted-vitest-for-qa-routes-after-ui-confirmation-to-ensure-no-regres | P2 | ? | 5 | unknown | Doc-only | Run lint + targeted vitest for QA routes after UI confirmation to ensure no regressions. | Next Steps |
| efficiency-add-backoff-debounce-to-autofix-health-checks-when-consecutive-failur | P2 | ? | 5 | unknown | Doc-only | Efficiency: add backoff/debounce to AutoFix health checks when consecutive failures occur to reduce network noise; centralize interval management to a single mount point. | Enhancements Needed for Production |
| bugs-block-systemverifier-actions-when-unauthenticated-non-super-admin-now-gated | P2 | ? | 5 | unknown | Doc-only | Bugs: block SystemVerifier actions when unauthenticated/non-super-admin (now gated, but add UI disable states + toast); ensure AutoFix alert POST honors auth headers/cookies before sending. | Enhancements Needed for Production |
| logic-errors-avoid-retrying-qa-reconnect-while-unauthenticated-add-early-return- | P2 | ? | 5 | pending | Doc-only | Logic errors: avoid retrying QA reconnect while unauthenticated; add early return guard in AutoFix checks for missing session to prevent false degraded statuses. | Enhancements Needed for Production |
| missing-tests-add-client-side-test-covering-autofixinitializer-behavior-for-gues | P2 | ? | 5 | pending | Doc-only | Missing tests: add client-side test covering AutoFixInitializer behavior for guest vs SUPER_ADMIN; add integration test ensuring no network calls fire when not authenticated. | Enhancements Needed for Production |
| clientlayout-injects-autofixinitializer-for-both-marketing-and-protected-shells- | P2 | ? | 5 | unknown | components/ClientLayout.ts | ClientLayout injects AutoFixInitializer for both marketing and protected shells (components/ClientLayout.tsx). With the new guard, marketing/guest views no longer trigger QA endpoints; this pattern should be mirrored in any future layout-level utilities to avoid unauthenticated API noise. | Deep-Dive on Similar Issues |
| qa-endpoints-app-api-qa-health-app-api-qa-reconnect-app-api-qa-alert-enforce-sup | P2 | ? | 5 | unknown | Doc-only | QA endpoints (`app/api/qa/health`, `app/api/qa/reconnect`, `app/api/qa/alert`) enforce SUPER_ADMIN; any future health/alert clients must check session/role first to prevent the same 401/403 spam pattern. | Deep-Dive on Similar Issues |
| x-tests-100-passing-3285-3285-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Tests: 100% passing (3285/3285) | 📊 Commit History (Session) |
| x-tenancy-filters-enforced-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Tenancy filters enforced | 📊 Commit History (Today) |
| x-tests-99-8-passing-6-test-route-sync-issues-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Tests: 99.8% passing (6 test-route sync issues) | 📊 Commit History (Today) |
| mdx-markdown-content-with-rehype-sanitize-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | MDX/Markdown content with rehype-sanitize | 4. Security: dangerouslySetInnerHTML (6 uses) |
| server-rendered-static-content-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Server-rendered static content | 4. Security: dangerouslySetInnerHTML (6 uses) |
| no-user-input-directly-in-innerhtml-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | No user input directly in innerHTML | 4. Security: dangerouslySetInnerHTML (6 uses) |
| lib-config-constants-ts-5-occurrences-intentional-for-dev-next-steps-lib-config- | P2 | ? | 5 | unknown | lib/config/constants.ts | `lib/config/constants.ts` (5 occurrences) - INTENTIONAL for dev | 3) DEEP-DIVE: SIMILAR PATTERNS & SINGLE SOURCE UPDATE |
| lib-config-domains-ts-intentional-cors-whitelist-next-steps-lib-config-domains-t | P2 | ? | 5 | unknown | lib/config/domains.ts | `lib/config/domains.ts` - INTENTIONAL CORS whitelist | Pattern: Hardcoded localhost URLs |
| most-are-intentional-defaults-for-development-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Most are intentional defaults for development | Pattern: Env Var Fallbacks |
| tbd-next-steps-doc-only | P2 | ? | 5 | in_progress | Doc-only | TBD | 📍 Current Progress Summary |
| tests-api-souq-categories-route-test-ts-tests-api-souq-categories-route-test-ts- | P2 | ? | 5 | unknown | tests/api/souq/categories.route.test.ts | [tests/api/souq/categories.route.test.ts](tests/api/souq/categories.route.test.ts) | Souq Rate Limit Mock Issue (CONFIRMED FIXED) |
| tests-api-souq-inventory-route-test-ts-tests-api-souq-inventory-route-test-ts-ne | P2 | ? | 5 | unknown | tests/api/souq/inventory.route.test.ts | [tests/api/souq/inventory.route.test.ts](tests/api/souq/inventory.route.test.ts) | Souq Rate Limit Mock Issue (CONFIRMED FIXED) |
| tests-api-souq-sellers-route-test-ts-tests-api-souq-sellers-route-test-ts-next-s | P2 | ? | 5 | unknown | tests/api/souq/sellers.route.test.ts | [tests/api/souq/sellers.route.test.ts](tests/api/souq/sellers.route.test.ts) | Souq Rate Limit Mock Issue (CONFIRMED FIXED) |
| tests-api-souq-brands-route-test-ts-tests-api-souq-brands-route-test-ts-next-ste | P2 | ? | 5 | unknown | tests/api/souq/brands.route.test.ts | [tests/api/souq/brands.route.test.ts](tests/api/souq/brands.route.test.ts) | Souq Rate Limit Mock Issue (CONFIRMED FIXED) |
| tests-api-souq-deals-route-test-ts-tests-api-souq-deals-route-test-ts-next-steps | P2 | ? | 5 | unknown | tests/api/souq/deals.route.test.ts | [tests/api/souq/deals.route.test.ts](tests/api/souq/deals.route.test.ts) | Souq Rate Limit Mock Issue (CONFIRMED FIXED) |
| gated-kyc-auto-approval-on-bank-detail-completion-services-souq-seller-kyc-servi | P2 | ? | 5 | unknown | services/souq/seller-kyc-service.ts:606-612 | Gated KYC auto-approval on bank detail completion (services/souq/seller-kyc-service.ts:606-612). | ✅ Completed / Ongoing |
| tightened-fm-expenses-tests-to-require-200-201-responses-and-assert-success-payl | P2 | ? | 5 | unknown | tests/unit/api/fm/finance/expenses.test.ts | Tightened FM expenses tests to require 200/201 responses and assert success payload + orgId insertion (tests/unit/api/fm/finance/expenses.test.ts). | 🛠️ Enhancements Needed for Production Readiness |
| copilot-instructions-updated-with-execution-discipline-and-multi-agent-coordinat | P2 | ? | 5 | unknown | Doc-only | Copilot instructions updated with “Execution Discipline” and “Multi-Agent Coordination” sections to avoid deferral/drift. | ✅ Completed / Ongoing |
| rerun-wider-vitest-set-budgets-fm-suites-and-update-pending-master-with-outcomes | P2 | ? | 5 | pending | Doc-only | Rerun wider vitest set (budgets + FM suites) and update PENDING_MASTER with outcomes. | 🔜 Planned Next Steps |
| app-api-fm-finance-budgets-route-ts-199-225-add-projection-compound-index-orgid- | P2 | ? | 5 | unknown | app/api/fm/finance/budgets/route.ts:199-225 | `app/api/fm/finance/budgets/route.ts:199-225` — Add projection + compound index `{ orgId: 1, unitId: 1, department: 1, updatedAt: -1 }` to reduce scan cost on paginated search. | 🛠️ Enhancements Needed for Production Readiness |
| services-souq-seller-kyc-service-ts-194-225-use-lean-projection-to-avoid-duplica | P2 | ? | 5 | unknown | services/souq/seller-kyc-service.ts:194-225 | `services/souq/seller-kyc-service.ts:194-225` — Use `lean()` + projection to avoid duplicate seller reads per step. | 🛠️ Enhancements Needed for Production Readiness |
| app-api-souq-seller-central-kyc-submit-route-ts-17-100-route-still-sets-vendorid | P2 | ? | 5 | pending | app/api/souq/seller-central/kyc/submit/route.ts:17-100 | `app/api/souq/seller-central/kyc/submit/route.ts:17-100` — Route still sets vendorId to user.id; needs explicit vendor guard + vendorId propagation from session. | 🛠️ Enhancements Needed for Production Readiness |
| services-souq-seller-kyc-service-ts-193-237-vendor-filter-present-but-route-does | P2 | ? | 5 | unknown | services/souq/seller-kyc-service.ts:193-237 | `services/souq/seller-kyc-service.ts:193-237` — Vendor filter present but route does not supply vendorId; risk of cross-seller tampering. | 🛠️ Enhancements Needed for Production Readiness |
| app-api-fm-finance-budgets-route-ts-191-225-292-306-unit-scoping-present-but-ind | P2 | ? | 5 | pending | app/api/fm/finance/budgets/route.ts:191-225 | `app/api/fm/finance/budgets/route.ts:191-225,292-306` — Unit scoping present but index missing; risk of slow queries; ensure unitId required on POST responses. | 🛠️ Enhancements Needed for Production Readiness |
| app-api-souq-seller-central-kyc-submit-route-ts-53-79-parsebodysafe-errors-retur | P2 | ? | 5 | unknown | app/api/souq/seller-central/kyc/submit/route.ts:53-79 | `app/api/souq/seller-central/kyc/submit/route.ts:53-79` — parseBodySafe errors return “Invalid JSON payload”, not field-specific; tests adjusted—consider keeping user-friendly messages. | 🛠️ Enhancements Needed for Production Readiness |
| lenient-status-tolerances-fm-expenses-tests-previously-allowed-200-500-and-condi | P2 | ? | 5 | unknown | Doc-only | **Lenient status tolerances** — FM expenses tests previously allowed `[200,500]` and conditional assertions; pattern matched prior KYC leniency. Both suites now enforce strict 200/201 and body checks to surface regressions. | 🔎 Deep-Dive Analysis (Similar Issues) |
| vendor-scoping-gap-route-sets-vendorid-session-user-id-but-does-not-enforce-vend | P2 | ? | 5 | pending | Doc-only | **Vendor scoping gap** — Route sets `vendorId: session.user.id` but does not enforce vendor membership; service vendor filter depends on provided vendorId. Aligning route+service is needed to prevent cross-seller submissions. | 🔎 Deep-Dive Analysis (Similar Issues) |
| flagged-fm-expenses-happy-path-assertions-tolerating-400-500-status-and-conditio | P2 | ? | 5 | unknown | tests/unit/api/fm/finance/expenses.test.ts:195-201 | Flagged FM expenses happy-path assertions tolerating 400/500 status and conditional bodies (tests/unit/api/fm/finance/expenses.test.ts:195-201,305-351). | 🔎 Deep-Dive Analysis (Similar Issues) |
| normalize-fm-expenses-tests-to-strict-success-expectations-and-assert-orgid-unit | P2 | ? | 5 | unknown | Doc-only | Normalize FM expenses tests to strict success expectations and assert orgId/unitId on inserts. | 📍 Current Progress & Planned Next Steps |
| app-api-fm-finance-budgets-route-ts-135-143-add-projection-and-compound-index-or | P2 | ? | 5 | unknown | app/api/fm/finance/budgets/route.ts:135-143 | `app/api/fm/finance/budgets/route.ts:135-143` — Add projection and compound index `{ orgId: 1, unitId: 1, department: 1, updatedAt: -1 }` for paginated search. | 🛠️ Enhancements Needed for Production Readiness |
| app-api-fm-finance-budgets-route-ts-200-207-create-payload-omits-unitid-next-ste | P2 | ? | 5 | unknown | app/api/fm/finance/budgets/route.ts:200-207 | `app/api/fm/finance/budgets/route.ts:200-207` — create payload omits `unitId`. | 🛠️ Enhancements Needed for Production Readiness |
| services-souq-seller-kyc-service-ts-533-557-approval-should-wait-for-documents-b | P2 | ? | 5 | unknown | services/souq/seller-kyc-service.ts:533-557 | `services/souq/seller-kyc-service.ts:533-557` — approval should wait for documents + bank verification. | 🛠️ Enhancements Needed for Production Readiness |
| lenient-status-tolerances-expenses-tests-lines-above-mirror-kyc-leniency-both-al | P2 | ? | 5 | unknown | Doc-only | **Lenient status tolerances** — Expenses tests (lines above) mirror KYC leniency; both allow 400/500 to pass, masking regressions. | 🔎 Deep-Dive Analysis (Similar Issues) |
| souq-22-ads-campaigns-ads-campaigns-id-ads-impressions-ads-clicks-settlements-se | P2 | ? | 5 | unknown | Doc-only | **Souq (22):** ads/campaigns, ads/campaigns/[id], ads/impressions, ads/clicks, settlements, settlements/request-payout, catalog/products, fulfillment/rates, fulfillment/assign-fast-badge, fulfillment/generate-label, seller-central/kyc/submit, seller-central/kyc/verify-document, seller-central/kyc/approve, seller-central/health/violation, repricer/settings, inventory/adjust, inventory/return, inventory/release, inventory/reserve, inventory/convert, returns/validation, claims/admin/bulk | 🔍 Remaining JSON-PARSE Routes: 44 |
| admin-8-footer-sms-sms-settings-testing-users-testing-users-id-2-handlers-route- | P2 | ? | 5 | unknown | Doc-only | **Admin (8):** footer, sms, sms/settings, testing-users, testing-users/[id] (2 handlers), route-aliases/workflow, users/[id], export, notifications/test | 🔍 Remaining JSON-PARSE Routes: 44 |
| aqar-4-insights-pricing-leads-listings-id-support-chatbot-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Aqar (4):** insights/pricing, leads, listings/[id], support/chatbot | 🔍 Remaining JSON-PARSE Routes: 44 |
| marketplace-3-cart-rfq-vendor-products-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Marketplace (3):** cart, rfq, vendor/products | 🔍 Remaining JSON-PARSE Routes: 44 |
| fm-1-inspections-vendor-assignments-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **FM (1):** inspections/vendor-assignments | 🔍 Remaining JSON-PARSE Routes: 44 |
| pm-2-plans-plans-id-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **PM (2):** plans, plans/[id] | 🔍 Remaining JSON-PARSE Routes: 44 |
| user-1-preferences-has-try-catch-but-not-parsebodysafe-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **User (1):** preferences (has try/catch but not parseBodySafe) | 🔍 Remaining JSON-PARSE Routes: 44 |
| webhooks-1-carrier-tracking-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Webhooks (1):** carrier/tracking | 🔍 Remaining JSON-PARSE Routes: 44 |
| sprint-1-continuation-apply-parsebodysafe-to-remaining-44-routes-batch-by-module | P2 | ? | 5 | unknown | Doc-only | **Sprint 1 Continuation:** Apply `parseBodySafe` to remaining 44 routes (batch by module) | 🎯 Recommended Next Steps |
| kyc-workflow-fix-premature-approval-pattern-in-seller-kyc-service-next-steps-doc | P2 | ? | 5 | unknown | Doc-only | **KYC Workflow:** Fix premature approval pattern in seller-kyc-service | 🎯 Recommended Next Steps |
| hardened-souq-kyc-submit-unit-tests-to-fail-on-500-responses-and-always-assert-n | P2 | ? | 5 | unknown | Doc-only | Hardened Souq KYC submit unit tests to fail on 500 responses and always assert `nextStep` guidance. | 📍 Summary |
| flagged-parallel-lenient-status-assertions-in-fm-expenses-tests-to-close-false-n | P2 | ? | 5 | pending | Doc-only | Flagged parallel lenient status assertions in FM expenses tests to close false-negative gaps. | 📍 Summary |
| souq-kyc-submit-tests-fm-finance-expenses-tests-next-steps-doc-only | P2 | ? | 5 | in_progress | Doc-only | Souq KYC submit tests; FM finance expenses tests | 📍 Current Progress & Planned Next Steps |
| normalize-fm-expenses-tests-to-require-deterministic-200-201-responses-and-asser | P2 | ? | 5 | unknown | Doc-only | Normalize FM expenses tests to require deterministic 200/201 responses and assert response bodies; enforce orgId/unitId expectations on inserts. | 📍 Current Progress & Planned Next Steps |
| souq-ads-deals-fulfillment-inventory-repricer-settlements-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Souq: ads/*, deals, fulfillment/*, inventory/*, repricer/*, settlements/* | 🔍 Remaining JSON-PARSE Routes: 47 |
| admin-footer-sms-testing-users-export-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Admin: footer, sms, testing-users, export | 🔍 Remaining JSON-PARSE Routes: 47 |
| aqar-leads-listings-id-insights-pricing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Aqar: leads, listings/[id], insights/pricing | 🔍 Remaining JSON-PARSE Routes: 47 |
| marketplace-cart-rfq-vendor-products-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Marketplace: cart, rfq, vendor/products | 🔍 Remaining JSON-PARSE Routes: 47 |
| fm-inspections-vendor-assignments-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | FM: inspections/vendor-assignments | 🔍 Remaining JSON-PARSE Routes: 47 |
| pm-plans-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | PM: plans | 🔍 Remaining JSON-PARSE Routes: 47 |
| pnpm-typecheck-50-ts-errors-pnpm-lint-135-errors-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | `pnpm typecheck` ❌ (50+ TS errors); `pnpm lint` ❌ (135 errors) | 📍 Progress & Planned Next Steps |
| typecheck-lint-triage-identified-failing-files-aqar-listings-issues-api-marketpl | P2 | ? | 5 | unknown | Doc-only | Typecheck/lint triage: identified failing files (aqar listings, issues API, marketplace ads/cart/rfq/vendor products, issue-tracker app/models/scripts). | 📍 Progress & Planned Next Steps |
| typecheck-pass-1-issue-tracker-issues-api-fix-imports-types-null-guards-getserve | P2 | ? | 5 | pending | Doc-only | Typecheck Pass 1 (issue-tracker & issues API): fix imports/types, null guards, getServerSession wiring, virtual typings, missing deps; re-run `pnpm typecheck`. | 📍 Progress & Planned Next Steps |
| typecheck-pass-2-aqar-marketplace-fix-enum-nullable-handling-in-aqar-listing-rou | P2 | ? | 5 | unknown | Doc-only | Typecheck Pass 2 (aqar/marketplace): fix enum/nullable handling in aqar listing route; correct Zod error handling/unknown casting in marketplace cart/rfq/vendor products and souq ads campaigns; re-run `pnpm typecheck` until clean. | 📍 Progress & Planned Next Steps |
| follow-ups-add-kyc-integration-tests-for-document-bank-verification-and-super-ad | P2 | ? | 5 | unknown | Doc-only | Follow-ups: add KYC integration tests for document/bank verification and super-admin override; add FM budgets compound index `{ orgId, unitId, department, updatedAt: -1 }` and unitId persistence/rejection tests. | 📍 Progress & Planned Next Steps |
| marketplace-ads-campaigns-reuse-parsed-payloads-and-avoid-multiple-date-casts-no | P2 | ? | 5 | unknown | Doc-only | Marketplace ads/campaigns: reuse parsed payloads and avoid multiple Date casts; normalize Zod error handling to reduce duplicate parsing. | 🛠️ Enhancements Needed for Production Readiness |
| fm-budgets-add-compound-index-orgid-unitid-department-updatedat-1-to-prevent-sca | P2 | ? | 5 | unknown | Doc-only | FM budgets: add compound index `{ orgId, unitId, department, updatedAt: -1 }` to prevent scans on filtered listings. | 🛠️ Enhancements Needed for Production Readiness |
| aqar-listings-id-furnishing-listing-status-casts-accept-null-causing-ts-errors-a | P2 | ? | 5 | unknown | Doc-only | aqar listings `[id]`: furnishing/listing status casts accept `{}`/null, causing TS errors and potential runtime mismatches. | 🛠️ Enhancements Needed for Production Readiness |
| issue-tracker-routes-missing-modules-models-issue-lib-db-lib-auth-and-outdated-g | P2 | ? | 5 | pending | Doc-only | issue-tracker routes: missing modules (`@/models/issue`, `@/lib/db`, `@/lib/auth`) and outdated `getServerSession` import; causes typecheck failures and potential runtime crashes. | 🛠️ Enhancements Needed for Production Readiness |
| marketplace-cart-rfq-vendor-products-constructing-zoderror-from-arrays-incorrect | P2 | ? | 5 | unknown | Doc-only | marketplace cart/rfq/vendor products: constructing ZodError from arrays; incorrect types passed to validation helpers. | 🛠️ Enhancements Needed for Production Readiness |
| souq-ads-campaigns-unknown-values-assigned-to-enums-type-errors-potential-runtim | P2 | ? | 5 | pending | Doc-only | souq ads campaigns: unknown values assigned to enums (type errors), potential runtime validation gaps. | 🛠️ Enhancements Needed for Production Readiness |
| issue-tracker-scripts-implicit-any-parameters-and-missing-commander-import-break | P2 | ? | 5 | pending | Doc-only | issue-tracker scripts: implicit any parameters and missing commander import break CLI typing and may fail at runtime. | 🛠️ Enhancements Needed for Production Readiness |
| souq-kyc-integration-tests-for-document-bank-verification-flows-and-super-admin- | P2 | ? | 5 | unknown | Doc-only | Souq KYC: integration tests for document/bank verification flows and super-admin override/vendor ownership assertion. | 🛠️ Enhancements Needed for Production Readiness |
| fm-budgets-tests-for-unitid-persistence-on-insert-and-rejection-when-unit-not-as | P2 | ? | 5 | unknown | Doc-only | FM budgets: tests for unitId persistence on insert and rejection when unit not assigned; coverage for new compound index behavior (query projections). | 🛠️ Enhancements Needed for Production Readiness |
| auth-import-drift-in-issue-tracker-multiple-routes-import-non-existent-models-is | P2 | ? | 5 | unknown | Doc-only | **Auth/import drift in issue-tracker**: multiple routes import non-existent `@/models/issue`/`@/lib/db`/`@/lib/auth` causing consistent TS failures; indicates a stale copy of Next auth/db wiring in subapp. | 🔎 Deep-Dive Analysis (Similar/Identical Issue Patterns) |
| validation-typing-gaps-marketplace-routes-construct-zod-errors-from-plain-arrays | P2 | ? | 5 | pending | Doc-only | **Validation typing gaps**: marketplace routes construct Zod errors from plain arrays; similar pattern across cart/rfq/vendor products/souq ads campaigns leads to TS errors and weak validation. | 🔎 Deep-Dive Analysis (Similar/Identical Issue Patterns) |
| enum-nullable-misuse-aqar-listings-and-souq-ads-campaigns-assign-unknown-to-enum | P2 | ? | 5 | unknown | Doc-only | **Enum/nullable misuse**: aqar listings and souq ads campaigns assign `{}`/unknown to enums, mirroring earlier finance/souq cases where loose casting caused typecheck breaks and runtime risk. | 🔎 Deep-Dive Analysis (Similar/Identical Issue Patterns) |
| not-run-this-session-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Not run this session | 📍 Current Progress & Planned Next Steps |
| run-pnpm-typecheck-pnpm-lint-to-complete-gates-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Run `pnpm typecheck && pnpm lint` to complete gates. | 📍 Progress & Planned Next Steps |
| audit-souq-kyc-service-for-vendor-ownership-scoping-across-all-steps-and-align-r | P2 | ? | 5 | unknown | Doc-only | Audit Souq KYC service for vendor ownership scoping across all steps and align route to pass vendorId explicitly if required. | 📍 Progress & Planned Next Steps |
| extend-integration-tests-to-cover-kyc-document-bank-verification-paths-and-super | P2 | ? | 5 | unknown | Doc-only | Extend integration tests to cover KYC document/bank verification paths and super-admin header override behavior. | 📍 Progress & Planned Next Steps |
| souq-kyc-submit-status-reuse-a-single-seller-fetch-with-projection-lean-before-b | P2 | ? | 5 | unknown | services/souq/seller-kyc-service.ts | Souq KYC submit/status: reuse a single seller fetch with projection/`lean()` before branching steps to cut duplicate queries (services/souq/seller-kyc-service.ts). | 🛠️ Enhancements Needed for Production Readiness |
| fm-budgets-listing-add-projection-and-compound-index-orgid-unitid-department-upd | P2 | ? | 5 | unknown | app/api/fm/finance/budgets/route.ts | FM budgets listing: add projection and compound index `{ orgId, unitId, department, updatedAt: -1 }` to avoid scans under search (app/api/fm/finance/budgets/route.ts). | 🛠️ Enhancements Needed for Production Readiness |
| kyc-company-info-step-previously-set-status-to-approved-corrected-to-pending-doc | P2 | ? | 5 | pending | Doc-only | KYC company_info step previously set status to approved; corrected to pending/documents. Ensure approval only happens in verifyDocument/approveKYC paths. | 🛠️ Enhancements Needed for Production Readiness |
| add-kyc-integration-tests-for-document-bank-verification-sequences-and-vendor-ow | P2 | ? | 5 | unknown | Doc-only | Add KYC integration tests for document/bank verification sequences and vendor ownership assertions. | 🛠️ Enhancements Needed for Production Readiness |
| add-fm-budgets-tests-for-unitid-persistence-on-insert-and-rejection-when-unitid- | P2 | ? | 5 | unknown | Doc-only | Add FM budgets tests for unitId persistence on insert and rejection when unitId not in actor units (negative path). | 🛠️ Enhancements Needed for Production Readiness |
| socialize-the-updated-instructions-with-all-agents-ensure-new-guidance-is-honore | P2 | ? | 5 | unknown | Doc-only | Socialize the updated instructions with all agents; ensure new guidance is honored in upcoming changes. | 📍 Current Progress & Planned Next Steps |
| if-any-ambiguity-arises-during-concurrent-edits-record-assumptions-and-coordinat | P2 | ? | 5 | unknown | Doc-only | If any ambiguity arises during concurrent edits, record assumptions and coordination notes directly in this report before proceeding. | 📍 Current Progress & Planned Next Steps |
| run-targeted-suites-vitest-for-fm-budgets-and-souq-kyc-on-next-code-change-touch | P2 | ? | 5 | unknown | Doc-only | Run targeted suites (`vitest` for FM budgets and Souq KYC) on next code change touching those areas. | 📍 Current Progress & Planned Next Steps |
| none-new-identified-in-this-pass-doc-only-keep-prior-performance-items-active-ne | P2 | ? | 5 | unknown | Doc-only | None new identified in this pass (doc-only). Keep prior performance items active. | 🛠️ Enhancements Needed for Production Readiness |
| none-new-identified-in-this-pass-doc-only-keep-prior-fm-budgets-and-souq-kyc-fin | P2 | ? | 5 | unknown | Doc-only | None new identified in this pass (doc-only). Keep prior FM budgets and Souq KYC findings active. | 🛠️ Enhancements Needed for Production Readiness |
| none-new-identified-in-this-pass-doc-only-maintain-earlier-kyc-approval-flow-cor | P2 | ? | 5 | unknown | Doc-only | None new identified in this pass (doc-only). Maintain earlier KYC approval-flow corrections already logged. | 🛠️ Enhancements Needed for Production Readiness |
| none-new-identified-in-this-pass-on-next-code-edits-rerun-extend-fm-budgets-and- | P2 | ? | 5 | unknown | Doc-only | None new identified in this pass. On next code edits, rerun/extend FM budgets and Souq KYC unit coverage as previously planned. | 🛠️ Enhancements Needed for Production Readiness |
| parallel-agent-contention-recent-overlapping-edits-highlight-risk-of-clobbering- | P2 | ? | 5 | unknown | Doc-only | **Parallel agent contention**: Recent overlapping edits highlight risk of clobbering changes without coordination. The new Section 14 mitigates by requiring git-status checks, surgical diffs, and assumption logging in this report when ambiguity exists. | 🔎 Deep-Dive Analysis (Similar Issue Clusters) |
| documented-legitimate-orgid-fallback-patterns-3-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Documented legitimate orgId fallback patterns (3 files) | 📍 Summary |
| add-deterministic-tests-for-fm-budgets-unit-scoping-including-multi-unit-selecti | P2 | ? | 5 | unknown | Doc-only | Add deterministic tests for FM budgets unit scoping (including multi-unit selection) and Souq KYC vendor guard. | 📍 Current Progress & Planned Next Steps |
| add-compound-index-orgid-1-unitid-1-department-1-updatedat-1-to-budgets-collecti | P2 | ? | 5 | unknown | Doc-only | Add compound index `{ orgId: 1, unitId: 1, department: 1, updatedAt: -1 }` to budgets collection to avoid scans. | 📍 Current Progress & Planned Next Steps |
| app-api-fm-finance-budgets-route-ts-215-225-add-projection-and-compound-index-or | P2 | ? | 5 | unknown | app/api/fm/finance/budgets/route.ts:215-225 | `app/api/fm/finance/budgets/route.ts:215-225` — Add projection and compound index `{ orgId: 1, unitId: 1, department: 1, updatedAt: -1 }` on `fm_budgets` to keep search/pagination off collection scans. | 🛠️ Enhancements Needed for Production Readiness |
| services-souq-seller-kyc-service-ts-224-233-use-lean-projection-for-seller-looku | P2 | ? | 5 | unknown | services/souq/seller-kyc-service.ts:224-233 | `services/souq/seller-kyc-service.ts:224-233` — Use `lean()` + projection for seller lookup before step routing to reduce repeated document hydration. | 🛠️ Enhancements Needed for Production Readiness |
| none-new-in-this-pass-company-info-keeps-kyc-status-in-review-vendor-scoping-enf | P2 | ? | 5 | unknown | Doc-only | None new in this pass (company_info keeps KYC status in_review; vendor scoping enforced). | 🛠️ Enhancements Needed for Production Readiness |
| next-re-run-pnpm-test-e2e-project-smoke-reporter-line-after-cooldown-triage-test | P2 | ? | 5 | unknown | tests/copilot/copilot.spec.ts | Next: Re-run `pnpm test:e2e -- --project smoke --reporter=line` after cooldown; triage `tests/copilot/copilot.spec.ts` failures; consider extending Playwright-safe guard to other org guard hooks; align smoke selectors with new stubs. | 📍 Current Progress & Planned Next Steps |
| smoke-suite-timing-out-playwright-server-left-running-until-manual-kill-need-sta | P2 | ? | 5 | unknown | Doc-only | Smoke suite timing out: Playwright server left running until manual kill; need stable run with sufficient timeout and lighter scope. | 🛠️ Enhancements Needed (Production Readiness) |
| org-context-guards-other-than-supportorg-may-still-throw-outside-providers-in-pl | P2 | ? | 5 | unknown | Doc-only | Org-context guards other than SupportOrg may still throw outside providers in Playwright renders; pattern match against hooks/useOrgGuard to add similar env-aware stub or wrapper. | 🛠️ Enhancements Needed (Production Readiness) |
| system-dashboard-english-h1-remains-visible-in-non-playwright-mode-only-ensure-t | P2 | ? | 5 | unknown | Doc-only | System dashboard English H1 remains visible in non-Playwright mode only; ensure tests that expect Arabic run solely under flag to avoid dual-heading confusion. | 🛠️ Enhancements Needed (Production Readiness) |
| add-smoke-assertions-for-playwright-header-dashboard-link-and-pdp-stub-link-href | P2 | ? | 5 | unknown | Doc-only | Add smoke assertions for Playwright header Dashboard link and PDP stub link href; add unit/regression tests ensuring SupportOrg Playwright stub returns safe defaults. | 🛠️ Enhancements Needed (Production Readiness) |
| guard-stub-pattern-usesupportorg-now-playwright-safe-contexts-supportorgcontext- | P2 | ? | 5 | unknown | contexts/SupportOrgContext.ts | Guard stub pattern: useSupportOrg now Playwright-safe (contexts/SupportOrgContext.tsx:36-214), but other guards (useOrgGuard/useFmOrgGuard) lack env-aware stubs; similar boundary errors could surface in other modules during smoke. Recommendation: audit hooks folder for provider assumptions and add Playwright-safe fallbacks guarded by env flags only in test mode. | 🔎 Deep-Dive Analysis (Similar/Repeated Issues) |
| playwright-ui-branches-finance-hr-system-now-have-arabic-headings-under-flag-but | P2 | ? | 5 | unknown | app/dashboard/system/page.ts | Playwright UI branches: finance/HR/system now have Arabic headings under flag, but other dashboard pages remain unguarded; RTL smoke may fail if headings stay English. Extend the Playwright conditional heading pattern from app/dashboard/system/page.tsx:55-113 to remaining dashboard routes. | 🔎 Deep-Dive Analysis (Similar/Repeated Issues) |
| services-souq-seller-kyc-service-ts-204-221-reuse-a-single-seller-lookup-with-pr | P2 | ? | 5 | unknown | services/souq/seller-kyc-service.ts:204-221 | `services/souq/seller-kyc-service.ts:204-221` — Reuse a single seller lookup with projection and `lean()` before branching by step to avoid redundant fetches. | 🛠️ Enhancements Needed for Production Readiness |
| in-progress-smoke-suite-rerun-pnpm-test-e2e-project-smoke-attempts-timed-out-cop | P2 | ? | 5 | in_progress | Doc-only | In Progress: Smoke suite rerun (pnpm test:e2e -- --project smoke) — attempts timed out; Copilot STRICT specs still failing in full `pnpm test` run (see console for copilot.spec failures). | 📍 Current Progress & Planned Next Steps |
| missing-tests-add-regression-smoke-to-assert-playwright-header-has-dashboard-lin | P2 | ? | 5 | pending | Doc-only | Missing tests: add regression smoke to assert Playwright header has Dashboard link and SupportOrg fallback yields no boundary errors; unit test for Playwright PDP stub to ensure button renders without API fetch; extend smoke to assert product-card link href points to PDP stub. | 🛠️ Enhancements Needed (Production Readiness) |
| playwright-only-branches-still-sparse-across-dashboard-modules-system-page-neede | P2 | ? | 5 | pending | Doc-only | Playwright-only branches still sparse across dashboard modules; system page needed Arabic H1, finance/HR already covered — audit remaining `/dashboard/**` pages for PLAYWRIGHT_TESTS hooks to prevent future RTL smoke gaps. | 🔎 Deep-Dive: Similar Issue Clusters |
| marketplace-stubs-ensure-any-future-playwright-facing-components-search-listings | P2 | ? | 5 | unknown | Doc-only | Marketplace stubs: ensure any future Playwright-facing components (search listings, pricing/fulfillment previews) surface link targets and CTA buttons to satisfy smoke selectors without hitting real APIs. | 🔎 Deep-Dive: Similar Issue Clusters |
| scanned-entire-codebase-for-23-priority-action-categories-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **Scanned entire codebase** for 23 priority action categories | 📍 Current Progress & Planned Next Steps |
| identified-19-remaining-issues-requiring-attention-5-8-6-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **Identified 19 remaining issues** requiring attention (5 🔴, 8 🟠, 6 🟡) | 📍 Current Progress & Planned Next Steps |
| deep-dive-analysis-on-similar-patterns-across-codebase-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **Deep-dive analysis** on similar patterns across codebase | 📍 Current Progress & Planned Next Steps |
| requireorgid-session-string-throws-if-missing-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | requireOrgId(session): string - throws if missing | 🚨 CATEGORY 1: Multi-Tenancy (org_id Scoping) |
| validateorgid-value-boolean-validates-format-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | validateOrgId(value): boolean - validates format | 🚨 CATEGORY 1: Multi-Tenancy (org_id Scoping) |
| channel-handlers-ts-120-164-199-248-278-5x-fire-and-forget-notifications-next-st | P2 | ? | 5 | unknown | channel-handlers.ts:120 | channel-handlers.ts:120,164,199,248,278 (5x) - fire-and-forget notifications | 🔒 CATEGORY 2: RBAC/Security |
| work-orders-presign-route-ts-85-optional-presign-validation-next-steps-work-orde | P2 | ? | 5 | unknown | work-orders/presign/route.ts:85 | work-orders/presign/route.ts:85 - optional presign validation | 🔒 CATEGORY 2: RBAC/Security |
| fire-and-forget-notifications-acceptable-add-logging-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Fire-and-forget (notifications): ✅ Acceptable, add logging | 🔒 CATEGORY 2: RBAC/Security |
| app-error-tsx-20-files-same-template-with-mr-2-next-steps-error-ts | P2 | ? | 5 | unknown | /error.ts | app/*/error.tsx (20 files) - same template with mr-2 | 🎨 CATEGORY 4: RTL/UI Compliance |
| various-components-with-left-right-positioning-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Various components with left/right positioning | 🎨 CATEGORY 4: RTL/UI Compliance |
| create-shared-errorboundary-component-with-rtl-safe-classes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Create shared ErrorBoundary component with RTL-safe classes | 🎨 CATEGORY 4: RTL/UI Compliance |
| add-eslint-rule-no-physical-direction-classes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Add ESLint rule: no-physical-direction-classes | 🎨 CATEGORY 4: RTL/UI Compliance |
| needs-db-review-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ⏳ Needs DB review | 📊 CATEGORY 7-23: Additional Audit Categories |
| needs-review-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ⏳ Needs review | 📊 CATEGORY 7-23: Additional Audit Categories |
| needs-build-analysis-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ⏳ Needs build analysis | 📊 CATEGORY 7-23: Additional Audit Categories |
| needs-audit-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ⏳ Needs audit | 📊 CATEGORY 7-23: Additional Audit Categories |
| services-souq-rules-config-ts-44-next-steps-services-souq-rules-config-ts-44 | P2 | ? | 5 | unknown | services/souq/rules-config.ts:44 | `services/souq/rules-config.ts:44` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| services-souq-settlements-settlement-calculator-ts-262-next-steps-services-souq- | P2 | ? | 5 | unknown | services/souq/settlements/settlement-calculator.ts:262 | `services/souq/settlements/settlement-calculator.ts:262` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| lib-jobs-sms-sla-monitor-ts-64-next-steps-lib-jobs-sms-sla-monitor-ts-64 | P2 | ? | 5 | unknown | lib/jobs/sms-sla-monitor.ts:64 | `lib/jobs/sms-sla-monitor.ts:64` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| lib-apiguard-ts-33-next-steps-lib-apiguard-ts-33 | P2 | ? | 5 | unknown | lib/apiGuard.ts:33 | `lib/apiGuard.ts:33` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| lib-audit-middleware-ts-203-205-next-steps-lib-audit-middleware-ts-203 | P2 | ? | 5 | unknown | lib/audit/middleware.ts:203 | `lib/audit/middleware.ts:203,205` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| lib-marketplace-context-ts-174-next-steps-lib-marketplace-context-ts-174 | P2 | ? | 5 | unknown | lib/marketplace/context.ts:174 | `lib/marketplace/context.ts:174` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| lib-fm-auth-middleware-ts-74-313-365-next-steps-lib-fm-auth-middleware-ts-74 | P2 | ? | 5 | unknown | lib/fm-auth-middleware.ts:74 | `lib/fm-auth-middleware.ts:74,313,365` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| lib-feature-flags-ts-405-next-steps-lib-feature-flags-ts-405 | P2 | ? | 5 | unknown | lib/feature-flags.ts:405 | `lib/feature-flags.ts:405` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| lib-middleware-orgid-validation-ts-25-next-steps-lib-middleware-orgid-validation | P2 | ? | 5 | unknown | lib/middleware/orgId-validation.ts:25 | `lib/middleware/orgId-validation.ts:25` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| jobs-onboarding-queue-ts-59-next-steps-jobs-onboarding-queue-ts-59 | P2 | ? | 5 | unknown | jobs/onboarding-queue.ts:59 | `jobs/onboarding-queue.ts:59` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| jobs-onboarding-expiry-worker-ts-131-next-steps-jobs-onboarding-expiry-worker-ts | P2 | ? | 5 | unknown | jobs/onboarding-expiry-worker.ts:131 | `jobs/onboarding-expiry-worker.ts:131` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| replace-all-orgid-value-with-requireorgid-session-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Replace all `orgId \|\| "value"` with `requireOrgId(session)` | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| add-eslint-rule-to-prevent-fallback-patterns-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Add ESLint rule to prevent fallback patterns | PATTERN 1: ORGID-FALLBACK (Cross-Tenant Risk) |
| channel-handlers-ts-5-occurrences-fire-and-forget-acceptable-with-logging-next-s | P2 | ? | 5 | unknown | channel-handlers.ts | `channel-handlers.ts` (5 occurrences) — fire-and-forget, acceptable with logging | PATTERN 2: SILENT-CATCH (Error Masking) |
| work-orders-presign-route-ts-1-needs-fix-next-steps-work-orders-presign-route-ts | P2 | ? | 5 | pending | work-orders/presign/route.ts | `work-orders/presign/route.ts` (1) — needs fix | PATTERN 2: SILENT-CATCH (Error Masking) |
| auth-test-credentials-debug-route-ts-1-test-route-acceptable-next-steps-auth-tes | P2 | ? | 5 | unknown | auth/test/credentials-debug/route.ts | `auth/test/credentials-debug/route.ts` (1) — test route, acceptable | PATTERN 2: SILENT-CATCH (Error Masking) |
| admin-notifications-test-route-ts-1-needs-logging-next-steps-admin-notifications | P2 | ? | 5 | pending | admin/notifications/test/route.ts | `admin/notifications/test/route.ts` (1) — needs logging | PATTERN 2: SILENT-CATCH (Error Masking) |
| create-shared-components-errors-errorpage-tsx-with-rtl-safe-classes-next-steps-c | P2 | ? | 5 | unknown | components/errors/ErrorPage.ts | Create shared `components/errors/ErrorPage.tsx` with RTL-safe classes | PATTERN 3: RTL-PHYSICAL-CLASSES |
| replace-all-mr-2-with-me-2-margin-end-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Replace all `mr-2` with `me-2` (margin-end) | PATTERN 3: RTL-PHYSICAL-CLASSES |
| add-eslint-rule-no-restricted-syntax-for-physical-direction-classes-next-steps-d | P2 | ? | 5 | unknown | Doc-only | Add ESLint rule: `no-restricted-syntax` for physical direction classes | PATTERN 3: RTL-PHYSICAL-CLASSES |
| returns-503-on-optional-module-import-failure-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Returns 503 on optional module import failure | 📍 Current Progress & Planned Next Steps |
| returns-503-on-organization-lookup-db-failure-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Returns 503 on organization lookup DB failure | 📍 Current Progress & Planned Next Steps |
| search-route-ts-extracted-to-lib-permissions-ts-scoping-ts-entity-builders-ts-ne | P2 | ? | 5 | unknown | search/route.ts | `search/route.ts` → extracted to `_lib/permissions.ts`, `scoping.ts`, `entity-builders.ts` | 📍 Current Progress & Planned Next Steps |
| admin-notifications-send-route-ts-extracted-to-lib-channel-handlers-ts-recipient | P2 | ? | 5 | unknown | admin/notifications/send/route.ts | `admin/notifications/send/route.ts` → extracted to `_lib/channel-handlers.ts`, `recipient-resolver.ts` | 📍 Current Progress & Planned Next Steps |
| souq-orders-route-ts-extracted-to-lib-order-lifecycle-ts-order-validation-ts-nex | P2 | ? | 5 | unknown | souq/orders/route.ts | `souq/orders/route.ts` → extracted to `_lib/order-lifecycle.ts`, `order-validation.ts` | 📍 Current Progress & Planned Next Steps |
| fm-work-orders-id-transition-route-ts-extracted-to-lib-fsm-transitions-ts-transi | P2 | ? | 5 | unknown | /transition/route.ts | `fm/work-orders/[id]/transition/route.ts` → extracted to `_lib/fsm-transitions.ts`, `transition-context.ts` | 📍 Current Progress & Planned Next Steps |
| safe-session-test-ts-11-auth-infra-failure-scenarios-next-steps-safe-session-tes | P2 | ? | 5 | unknown | safe-session.test.ts | `safe-session.test.ts` (11) - Auth infra failure scenarios | 📍 Current Progress & Planned Next Steps |
| campaigns-route-test-ts-17-souq-ads-campaigns-next-steps-campaigns-route-test-ts | P2 | ? | 5 | unknown | campaigns.route.test.ts | `campaigns.route.test.ts` (17) - Souq ads campaigns | 📍 Current Progress & Planned Next Steps |
| settings-route-test-ts-17-souq-repricer-settings-next-steps-settings-route-test- | P2 | ? | 5 | unknown | settings.route.test.ts | `settings.route.test.ts` (17) - Souq repricer settings | 📍 Current Progress & Planned Next Steps |
| vendors-route-test-ts-18-fm-marketplace-vendors-next-steps-vendors-route-test-ts | P2 | ? | 5 | unknown | vendors.route.test.ts | `vendors.route.test.ts` (18) - FM marketplace vendors | 📍 Current Progress & Planned Next Steps |
| route-refactoring-p2-extracted-helpers-from-2-large-route-files-next-steps-doc-o | P2 | ? | 5 | unknown | Doc-only | ✅ **Route Refactoring (P2)**: Extracted helpers from 2 large route files | 📍 Current Progress & Planned Next Steps |
| auth-otp-send-1091-lines-extracted-to-lib-auth-otp-test-users-ts-lib-auth-otp-he | P2 | ? | 5 | unknown | lib/auth/otp/test-users.ts | `auth/otp/send` (1091 lines) → extracted to `lib/auth/otp/test-users.ts` + `lib/auth/otp/helpers.ts` | 📍 Current Progress & Planned Next Steps |
| souq-kyc-submit-test-ts-17-claims-route-test-ts-22-next-steps-kyc-submit-test-ts | P2 | ? | 5 | unknown | kyc-submit.test.ts | Souq: `kyc-submit.test.ts` (17), `claims.route.test.ts` (22) | 📍 Current Progress & Planned Next Steps |
| admin-benchmark-test-ts-10-users-route-test-ts-18-next-steps-benchmark-test-ts | P2 | ? | 5 | unknown | benchmark.test.ts | Admin: `benchmark.test.ts` (10), `users.route.test.ts` (18) | 📍 Current Progress & Planned Next Steps |
| fm-expenses-test-ts-12-budgets-test-ts-18-next-steps-expenses-test-ts | P2 | ? | 5 | unknown | expenses.test.ts | FM: `expenses.test.ts` (12), `budgets.test.ts` (18) | 📍 Current Progress & Planned Next Steps |
| a29893220-refactor-p2-extract-helpers-from-large-routes-p1-module-tests-next-ste | P2 | ? | 5 | unknown | Doc-only | `a29893220` - refactor(P2): extract helpers from large routes + P1 module tests | 📍 Current Progress & Planned Next Steps |
| test-coverage-gap-analysis-route-size-audit-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Test coverage gap analysis + route size audit | 📍 Current Progress & Planned Next Steps |
| created-lib-auth-safe-session-ts-with-getsessionorerror-getsessionornull-helpers | P2 | ? | 5 | unknown | lib/auth/safe-session.ts | ✅ Created `lib/auth/safe-session.ts` with `getSessionOrError`/`getSessionOrNull` helpers | 🛠️ Enhancements Needed (Production Readiness) |
| applied-auth-infra-aware-helper-to-29-occurrences-across-25-routes-next-steps-do | P2 | ? | 5 | unknown | Doc-only | ✅ Applied auth-infra-aware helper to 29 occurrences across 25 routes | 📍 Current Progress & Planned Next Steps |
| analyzed-test-coverage-gaps-souq-51-75-missing-admin-26-28-missing-fm-19-25-miss | P2 | ? | 5 | pending | Doc-only | ✅ Analyzed test coverage gaps: Souq 51/75 missing, Admin 26/28 missing, FM 19/25 missing | 📍 Current Progress & Planned Next Steps |
| p2-add-negative-path-tests-for-auth-infra-failure-scenarios-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | P2: Add negative-path tests for auth infra failure scenarios | 📍 Current Progress & Planned Next Steps |
| next-steps-stage-and-commit-remaining-uncommitted-files-from-previous-sessions-u | P2 | ? | 5 | pending | Doc-only | Next steps: Stage and commit remaining uncommitted files from previous sessions; update PENDING_MASTER with route fix summary; consider adding negative-path tests for auth infra failure scenarios. | 📍 Current Progress & Planned Next Steps |
| typecheck-lint-test-models-test-e2e-timed-out-scripts-run-playwright-sh-next-ste | P2 | ? | 5 | pending | Doc-only | typecheck ✅; lint ✅; test:models ✅; test:e2e ⏳ Timed out (scripts/run-playwright.sh) | 📍 Current Progress & Planned Next Steps |
| e2e-stability-rerun-pnpm-playwright-test-tests-e2e-smoke-reporter-list-workers-1 | P2 | ? | 5 | unknown | Doc-only | E2E stability: rerun `pnpm playwright test tests/e2e/smoke --reporter=list --workers=1 --timeout=120000` (or enable `DEBUG=pw:api`) to surface hang; review `scripts/run-playwright.sh` for blocking setup. | ⏭️ Planned Next Steps |
| tests-backfill-the-11-service-unit-gaps-keep-lint-typecheck-test-gates-green-aft | P2 | ? | 5 | pending | Doc-only | Tests: backfill the 11 service/unit gaps; keep lint/typecheck/test gates green after changes. | ⏭️ Planned Next Steps |
| logging-replace-remaining-console-usages-with-logger-for-observability-and-pii-s | P2 | ? | 5 | unknown | Doc-only | Logging: replace remaining console usages with `logger` for observability and PII safety. | ⏭️ Planned Next Steps |
| release-gate-environments-missing-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Release-gate environments missing | 📋 Enhancements for Production Readiness |
| playwright-smoke-timeout-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Playwright smoke timeout | 📋 Enhancements for Production Readiness |
| alias-correctness-aqar-chat-alias-fix-highlights-risk-of-broken-re-exports-audit | P2 | ? | 5 | unknown | Doc-only | Alias correctness: Aqar chat alias fix highlights risk of broken re-exports; audit other alias routes to ensure handler + `runtime` are forwarded correctly. | 🔎 Deep-Dive: Similar/Identical Issue Patterns |
| mongoose-hook-typing-as-any-usage-clusters-in-encryption-hooks-a-shared-typed-ho | P2 | ? | 5 | unknown | Doc-only | Mongoose hook typing: `as any` usage clusters in encryption hooks; a shared typed hook helper would remove all 13 occurrences and cut casting risks. | 🔎 Deep-Dive: Similar/Identical Issue Patterns |
| logging-consistency-console-usage-persists-in-a-few-entry-points-standardizing-o | P2 | ? | 5 | unknown | Doc-only | Logging consistency: Console usage persists in a few entry points; standardizing on `logger` keeps observability structured and PII-safe. | 🔎 Deep-Dive: Similar/Identical Issue Patterns |
| e2e-setup-drift-playwright-hangs-without-output-suggest-blocking-setup-fixtures- | P2 | ? | 5 | unknown | Doc-only | E2E setup drift: Playwright hangs without output suggest blocking setup/fixtures; review `scripts/run-playwright.sh` and smoke suite hooks for long waits, and apply the same checks across other E2E suites to avoid future gate stalls. | 🔎 Deep-Dive: Similar/Identical Issue Patterns |
| footer-theme-status-ux-additions-remain-stable-no-regressions-detected-during-fi | P2 | ? | 5 | unknown | Doc-only | Footer/theme/status UX additions remain stable; no regressions detected during finance updates. | 📍 Current Progress |
| workflow-diagnostics-confirmed-as-environment-setup-gaps-staging-production-appr | P2 | ? | 5 | pending | Doc-only | Workflow diagnostics confirmed as environment setup gaps (staging / production-approval / production) rather than code defects. | 📍 Current Progress |
| align-and-merge-local-changes-on-dirty-upload-help-onboarding-settings-files-the | P2 | ? | 5 | unknown | Doc-only | Align and merge local changes on dirty upload/help/onboarding/settings files, then apply `getSessionOrError` to remove `getSessionUser(...).catch(() => null)` fallbacks. | 🚧 Planned Next Steps |
| efficiency-improvements-gate-av-scan-processing-on-scanner-health-and-avoid-repr | P2 | ? | 5 | unknown | Doc-only | **Efficiency improvements**: Gate AV scan processing on scanner health and avoid reprocessing loops; ensure rate-limit/parse helpers are reused across upload routes to cut duplicate logic. | 🧩 Production-Readiness Enhancements |
| identified-bugs-remaining-silent-auth-fallbacks-in-upload-help-onboarding-settin | P2 | ? | 5 | unknown | Doc-only | **Identified bugs**: Remaining silent auth fallbacks in upload/help/onboarding/settings cause 401s on infra failure; AV scan health not surfaced to monitoring; resume download still maps storage failures to 404 in some paths. | 🧩 Production-Readiness Enhancements |
| logic-errors-json-parsing-defaults-still-exist-in-some-upload-variants-and-onboa | P2 | ? | 5 | unknown | Doc-only | **Logic errors**: JSON parsing defaults still exist in some upload variants and onboarding flows, allowing malformed bodies to proceed; auth vs infra conflation persists where safe-session helper isn’t applied. | 🧩 Production-Readiness Enhancements |
| missing-tests-need-integration-tests-for-resume-download-storage-failure-403-503 | P2 | ? | 5 | pending | Doc-only | **Missing tests**: Need integration tests for resume download storage failure/403/503 paths; negative-path tests for auth infra failures on upload/help/onboarding/settings; parser failure tests on remaining upload variants. | 🧩 Production-Readiness Enhancements |
| roll-the-telemetry-aware-session-helper-to-remaining-upload-help-onboarding-sett | P2 | ? | 5 | unknown | Doc-only | Roll the telemetry-aware session helper to remaining upload/help/onboarding/settings routes still showing silent auth fallbacks in git status. | 🚧 Planned Next Steps |
| add-coverage-for-resume-download-storage-failures-in-integration-tests-and-surfa | P2 | ? | 5 | unknown | Doc-only | Add coverage for resume download storage failures in integration tests and surface AV scan health in monitoring/dashboards. | 🚧 Planned Next Steps |
| shared-json-parser-removes-per-route-parsing-boilerplate-and-standardizes-respon | P2 | ? | 5 | unknown | Doc-only | Shared JSON parser removes per-route parsing boilerplate and standardizes responses/telemetry. | 🛠️ Enhancements for Production Readiness |
| lint-json-fallbacks-provides-automated-detection-of-silent-parse-fallbacks-enfor | P2 | ? | 5 | unknown | Doc-only | `lint:json-fallbacks` provides automated detection of silent parse fallbacks; enforced in CI. | 🛠️ Enhancements for Production Readiness |
| trial-request-now-dlqs-to-webhook-on-db-failure-ensure-webhook-is-set-in-prod-or | P2 | ? | 5 | unknown | Doc-only | Trial-request now DLQs to webhook on DB failure; ensure webhook is set in prod or replace with durable queue. | 🛠️ Enhancements for Production Readiness |
| add-auth-infra-failure-tests-for-routes-adopting-getsessionorerror-next-steps-do | P2 | ? | 5 | unknown | Doc-only | Add auth-infra failure tests for routes adopting `getSessionOrError`. | 🛠️ Enhancements for Production Readiness |
| add-dlq-webhook-success-failure-tests-for-trial-request-when-env-is-set-next-ste | P2 | ? | 5 | unknown | Doc-only | Add DLQ webhook success/failure tests for trial-request when env is set. | 🛠️ Enhancements for Production Readiness |
| json-parse-fallbacks-remain-across-help-listings-context-aqar-fm-budgets-project | P2 | ? | 5 | unknown | Doc-only | **JSON parse fallbacks** remain across help listings/context, Aqar, FM budgets, projects test API, and upload flows; migrate to shared parser to avoid silent defaults. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| auth-infra-masking-persists-where-getsessionuser-catch-null-is-still-used-onboar | P2 | ? | 5 | unknown | Doc-only | **Auth infra masking** persists where `getSessionUser(...).catch(() => null)` is still used (onboarding/upload/settings/subscription-adjacent). Apply new helper to surface 503 on infra failure. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| add-health-hints-json-in-503-responses-code-retryable-traceid-to-speed-triage-ne | P2 | ? | 5 | unknown | Doc-only | Add health-hints JSON in 503 responses (`code`, `retryable`, `traceId`) to speed triage. | 🧭 Optional Enhancements |
| restored-shared-json-parser-module-lib-api-parse-json-ts-and-refactored-remainin | P2 | ? | 5 | unknown | lib/api/parse-json.ts | Restored shared JSON parser module (`lib/api/parse-json.ts`) and refactored remaining inline fallback cases (auth test session, FM work-order attachment presign). Re-scan shows no `req.json().catch(() => ({}\|null))` in `app/api`; Aqar listings/packages, projects test API, FM budgets, and help list/context already use parseBody/Zod. | 🛠️ Enhancements Needed (Production Readiness) |
| auth-infra-aware-helper-is-applied-across-upload-flows-help-articles-comments-su | P2 | ? | 5 | unknown | Doc-only | Auth infra-aware helper is applied across upload flows, help articles/comments, subscription middleware, settings logo, auth test session, and FM attachment presign; no residual `getSessionUser(...).catch(() => null)` in `app/api`. | 📍 Current Progress |
| health-hinted-503s-used-by-auth-test-session-trial-request-and-upload-scan-confi | P2 | ? | 5 | pending | Doc-only | Health-hinted 503s used by auth test session, trial-request, and upload scan config/policy failures; helper tolerates missing `nextUrl`. | 📍 Current Progress |
| shared-parser-lint-guard-in-place-continue-using-for-new-remaining-routes-next-s | P2 | ? | 5 | unknown | Doc-only | Shared parser + lint guard in place; continue using for new/remaining routes. | 🛠️ Enhancements for Production Readiness |
| none-new-primary-gap-is-missing-health-hints-alerts-on-other-503-surfaces-and-ab | P2 | ? | 5 | pending | Doc-only | None new; primary gap is missing health-hints/alerts on other 503 surfaces and absent dashboards for emitted metrics. | 🛠️ Enhancements for Production Readiness |
| trial-request-dlq-is-best-effort-webhook-file-without-durable-queue-leads-can-st | P2 | ? | 5 | unknown | Doc-only | Trial-request DLQ is best-effort (webhook + file); without durable queue, leads can still drop if both fail. | 🛠️ Enhancements for Production Readiness |
| api-auth-test-session-now-enforce-allowed-orgs-via-test-session-allowed-orgs-ret | P2 | ? | 5 | unknown | Doc-only | `/api/auth/test/session`: now enforce allowed orgs via `TEST_SESSION_ALLOWED_ORGS`; returns 404 if org not allowed; 503s now include health hints. | 📍 Current Progress |
| api-trial-request-db-failures-now-log-metric-attempt-webhook-dlq-and-append-to-d | P2 | ? | 5 | unknown | _artifacts/trial-request-dlq.js | `/api/trial-request`: DB failures now log metric, attempt webhook DLQ, and append to durable file DLQ (`TRIAL_REQUEST_DLQ_FILE`, default `_artifacts/trial-request-dlq.jsonl`), then return health-hinted 503. | 📍 Current Progress |
| ci-lint-ci-now-runs-lint-json-fallbacks-strict-to-block-new-inline-parsers-next- | P2 | ? | 5 | unknown | Doc-only | CI: `lint:ci` now runs `lint:json-fallbacks --strict` to block new inline parsers. | 📍 Current Progress |
| tests-after-this-batch-not-yet-rerun-prior-targeted-suite-still-passing-next-ste | P2 | ? | 5 | unknown | Doc-only | Tests after this batch not yet rerun; prior targeted suite still passing. | 📍 Current Progress |
| shared-parser-reduces-per-route-boilerplate-lint-guard-prevents-regressions-next | P2 | ? | 5 | unknown | Doc-only | Shared parser reduces per-route boilerplate; lint guard prevents regressions. | 🛠️ Enhancements for Production Readiness |
| health-hint-helper-standardizes-503-responses-for-faster-triage-next-steps-doc-o | P2 | ? | 5 | unknown | Doc-only | Health-hint helper standardizes 503 responses for faster triage. | 🛠️ Enhancements for Production Readiness |
| trial-request-dlq-webhook-file-is-best-effort-without-durable-queue-leads-can-st | P2 | ? | 5 | unknown | Doc-only | Trial-request DLQ webhook/file is best-effort; without durable queue, leads can still drop if both fail. Recommendation: add queue-backed DLQ. | 🛠️ Enhancements for Production Readiness |
| test-session-endpoint-gated-by-org-ensure-staging-shared-envs-set-test-session-a | P2 | ? | 5 | unknown | Doc-only | Test-session endpoint gated by org; ensure staging/shared envs set `TEST_SESSION_ALLOWED_ORGS` to avoid accidental exposure. | 🛠️ Enhancements for Production Readiness |
| add-negative-path-tests-for-new-parser-auth-health-hint-behaviors-malformed-json | P2 | ? | 5 | unknown | Doc-only | Add negative-path tests for new parser/auth/health-hint behaviors (malformed JSON, auth-store failure, DLQ webhook/file failure). | 🛠️ Enhancements for Production Readiness |
| add-tests-for-allowed-org-gating-on-api-auth-test-session-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Add tests for allowed-org gating on `/api/auth/test/session`. | 🛠️ Enhancements for Production Readiness |
| add-tests-for-health-hint-payload-presence-on-503-responses-in-routes-using-the- | P2 | ? | 5 | unknown | Doc-only | Add tests for health-hint payload presence on 503 responses in routes using the helper. | 🛠️ Enhancements for Production Readiness |
| json-parse-fallbacks-still-present-in-help-list-context-aqar-listings-packages-f | P2 | ? | 5 | unknown | Doc-only | **JSON parse fallbacks**: still present in help list/context, Aqar listings/packages, FM budgets, projects test API, and onboarding/upload flows. Apply shared parser + lint guard to eliminate silent defaults. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| replace-inline-getsessionuser-catch-null-usage-in-upload-help-onboarding-setting | P2 | ? | 5 | unknown | Doc-only | Replace inline `getSessionUser(...).catch(() => null)` usage in upload/help/onboarding/settings/subscription/resume routes with a shared helper that logs infra failures and returns 503, preserving 401 for real auth denials. | 🚧 Planned Next Steps |
| APPLY-001 | P2 | ? | 5 | unknown | app/api/vendor/apply/route.ts | SILENT-VENDOR-APPLY-001 — `app/api/vendor/apply/route.ts`: Swallows DB connect failures and still returns `{ ok: true }`, dropping submissions silently. Require DB success, persist payload, return 503 on failure, and log context. | 🧩 Production-Readiness Enhancements |
| add-negative-path-tests-for-vendor-apply-db-unavailable-persistence-error-otp-or | P2 | ? | 5 | unknown | Doc-only | Add negative-path tests for: vendor apply DB unavailable/persistence error; OTP org lookup DB failure; upload/auth helper infra failure returning 503; malformed JSON in help escalation, Aqar listings/packages, FM budgets PATCH, projects test API, upload presign; AV scanner offline path in FM reports worker; resume download auth store and storage failures. | 🧩 Production-Readiness Enhancements |
| next-rerun-playwright-e2e-when-runtime-allows-extend-banned-literal-list-if-new- | P2 | ? | 5 | unknown | Doc-only | Next: rerun Playwright e2e when runtime allows; extend banned-literal list if new sensitive tokens appear; ensure pipelines set AWS envs and SuperAdmin secrets before rotation. | 📍 Current Progress & Planned Next Steps |
| identified-additional-silent-failure-points-vendor-apply-submissions-upload-auth | P2 | ? | 5 | unknown | Doc-only | Identified additional silent-failure points (vendor apply submissions, upload/auth/session cluster, OTP org resolution, resume download, FM report AV scan) not covered in the last audit. | 📍 Current Progress & Next Steps |
| no-commands-executed-documentation-only-update-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | No commands executed (documentation-only update). | 📍 Current Progress & Next Steps |
| superadmin-rotation-script-is-now-env-only-username-password-required-credential | P2 | ? | 5 | unknown | Doc-only | SuperAdmin rotation script is now env-only (username/password required), credential echo removed, and banned-literal guard test in place; rotation ready once secrets are set. | 📍 Current Progress & Planned Next Steps |
| next-rerun-playwright-smoke-to-validate-auth-checkout-returns-extend-banned-lite | P2 | ? | 5 | unknown | Doc-only | Next: rerun Playwright smoke to validate auth/checkout/returns, extend banned-literal list if new tokens appear, and ensure deployment pipelines inject AWS + SuperAdmin secrets before rotation. | 📍 Current Progress & Planned Next Steps |
| api-auth-test-session-db-user-lookup-failures-now-503-user-must-exist-404-otherw | P2 | ? | 5 | unknown | Doc-only | `/api/auth/test/session`: DB/user lookup failures now 503; user must exist (404 otherwise). | 📍 Current Progress |
| api-souq-claims-id-db-failures-now-500-instead-of-false-404s-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `/api/souq/claims/[id]`: DB failures now 500 instead of false 404s. | 📍 Current Progress |
| tests-api-souq-claims-get-error-route-test-ts-order-lookup-failure-returns-500-n | P2 | ? | 5 | unknown | tests/api/souq/claims-get-error.route.test.ts | `tests/api/souq/claims-get-error.route.test.ts` (order lookup failure returns 500) | 📍 Current Progress |
| replace-per-route-inline-json-parsing-with-shared-helper-to-reduce-duplicate-cod | P2 | ? | 5 | unknown | Doc-only | Replace per-route inline JSON parsing with shared helper to reduce duplicate code and improve observability. | 🛠️ Enhancements for Production Readiness |
| add-auth-infra-failure-tests-for-routes-using-getsessionuser-catch-null-onboardi | P2 | ? | 5 | unknown | Doc-only | Add auth-infra failure tests for routes using `getSessionUser(...).catch(() => null)` (onboarding, upload presign/scan, help context/articles, settings logo). | 🛠️ Enhancements for Production Readiness |
| test-session-misuse-previously-minted-tokens-on-infra-failure-verify-other-test- | P2 | ? | 5 | unknown | Doc-only | **Test-session misuse**: Previously minted tokens on infra failure; verify other test-only endpoints do not bypass failure checks and ensure E2E harness treats 503 as blocking. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| 37bd93d69-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | `37bd93d69` | 📍 Current Progress Summary |
| app-all-api-routes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `app/**` — All API routes ✅ | 🔍 Deep Dive: System-Wide orgId Audit |
| services-all-service-layers-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `services/**` — All service layers ✅ | 🔍 Deep Dive: System-Wide orgId Audit |
| lib-all-library-code-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `lib/**` — All library code ✅ | 🔍 Deep Dive: System-Wide orgId Audit |
| 2961-tests-pass-0-failures-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ 2961 tests pass (0 failures) | 🐛 Test Fixes Applied (v60.0) |
| 305-test-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ 305 test files | 🐛 Test Fixes Applied (v60.0) |
| no-code-changes-or-verification-commands-run-documentation-only-update-fixes-and | P2 | ? | 5 | unknown | Doc-only | No code changes or verification commands run (documentation-only update); fixes and regression tests still needed. | 📍 Current Progress & Plan |
| all-marketplace-related-modules-have-35-coverage-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | All marketplace-related modules have <35% coverage | Pattern 1: Test Coverage Distribution |
| admin-routes-have-minimal-test-coverage-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Admin routes have minimal test coverage | Pattern 1: Test Coverage Distribution |
| webhook-handlers-are-largely-untested-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Webhook handlers are largely untested | Pattern 1: Test Coverage Distribution |
| components-auth-otpverification-tsx-clearinterval-next-steps-components-auth-otp | P2 | ? | 5 | unknown | components/auth/OTPVerification.ts | `components/auth/OTPVerification.tsx` - clearInterval ✅ | Pattern 3: Memory Management |
| x-pnpm-typecheck-0-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] `pnpm typecheck` - 0 errors | ✅ Verification Gates (v57.0) |
| x-pnpm-lint-0-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] `pnpm lint` - 0 errors | ✅ Verification Gates (v57.0) |
| x-pnpm-vitest-run-2927-tests-passing-294-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] `pnpm vitest run` - 2927 tests passing (294 files) | ✅ Verification Gates (v58.0) |
| x-error-boundaries-38-files-comprehensive-coverage-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Error Boundaries: 38 files comprehensive coverage | ✅ Verification Gates (v58.0) |
| x-rate-limiting-352-352-routes-100-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Rate Limiting: 352/352 routes (100%) | ✅ Verification Gates (v57.0) |
| 4cc4726f3-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | `4cc4726f3` | 📍 Current Progress Summary |
| extensive-missingstring-invalidnumbers-validpricing-validgeo-next-steps-aqar-lis | P2 | ? | 5 | pending | aqar/listings/route.ts | Extensive: missingString, invalidNumbers, validPricing, validGeo | ✅ P1/P2 Verification Complete - ALL FALSE POSITIVES |
| pm-generate-wos-cron-secret-header-validation-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | PM generate-wos: CRON_SECRET header validation | ✅ P1/P2 Verification Complete - ALL FALSE POSITIVES |
| metrics-metrics-token-authentication-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Metrics: METRICS_TOKEN authentication | ✅ P1/P2 Verification Complete - ALL FALSE POSITIVES |
| sla-check-super-admin-role-requirement-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | SLA check: SUPER_ADMIN role requirement | ✅ P1/P2 Verification Complete - ALL FALSE POSITIVES |
| x-pnpm-vitest-run-2927-tests-passing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] `pnpm vitest run` - 2927 tests passing | ✅ Verification Gates (v57.0) |
| verification-pnpm-typecheck-pnpm-lint-pnpm-test-ci-all-passing-full-vitest-suite | P2 | ? | 5 | unknown | Doc-only | Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test:ci` all passing (full vitest suite). Playwright e2e not rerun this pass (previous attempts hit timeout). | 📍 Current Progress & Next Steps |
| next-evaluate-existing-dirty-app-api-changes-user-owned-before-merging-optionall | P2 | ? | 5 | unknown | Doc-only | Next: evaluate existing dirty app/api changes (user-owned) before merging; optionally rerun Playwright once environment stabilizes. | 📍 Current Progress & Next Steps |
| next-parameterize-residual-hardcoded-credentials-config-centralize-souq-rule-win | P2 | ? | 5 | unknown | Doc-only | Next: parameterize residual hardcoded credentials/config, centralize Souq rule windows, enforce env-driven storage config, then run `pnpm typecheck && pnpm lint && pnpm test`. | 📍 Current Progress & Next Steps |
| professional-html-email-template-with-branding-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Professional HTML email template with branding | 1.1 OTP Email Delivery Option (NEW) |
| per-email-rate-limiting-prevents-email-bombing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Per-email rate limiting (prevents email bombing) | 1.1 OTP Email Delivery Option (NEW) |
| fallback-to-sms-if-no-email-registered-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Fallback to SMS if no email registered | 1.1 OTP Email Delivery Option (NEW) |
| email-masking-in-responses-u-example-com-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Email masking in responses (`u***@example.com`) | 1.1 OTP Email Delivery Option (NEW) |
| communication-logging-includes-delivery-method-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Communication logging includes delivery method | 1.1 OTP Email Delivery Option (NEW) |
| commit-pending-test-files-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Commit pending test files | Immediate (This Session) |
| push-changes-to-remote-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Push changes to remote | 7) CURRENT PROGRESS & NEXT STEPS |
| close-6-stale-draft-prs-539-544-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Close 6 stale draft PRs (#539-544) | P2 — Low Priority (Next Week) |
| add-zod-validation-to-remaining-routes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Add Zod validation to remaining routes | P2 — Low Priority (Next Week) |
| merge-feat-marketplace-api-tests-to-main-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Merge `feat/marketplace-api-tests` to main | P2 — Low Priority (Next Week) |
| add-audit-logging-for-sensitive-operations-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Add audit logging for sensitive operations | P3 — Nice to Have |
| x-add-rate-limiting-to-marketplace-15-routes-already-complete-next-steps-doc-onl | P2 | ? | 5 | unknown | Doc-only | [x] ~~**Add rate limiting to Marketplace** (15 routes)~~ - ✅ Already Complete | P0 — Critical (Next 24 hours) |
| x-add-zod-validation-to-top-20-write-endpoints-already-complete-next-steps-doc-o | P2 | ? | 5 | unknown | Doc-only | [x] ~~**Add Zod validation to top 20 write endpoints**~~ - ✅ Already Complete | P0 — Critical (Next 24 hours) |
| x-add-rate-limiting-to-finance-10-remaining-routes-already-complete-19-19-routes | P2 | ? | 5 | unknown | Doc-only | [x] ~~**Add rate limiting to Finance** (10 remaining routes)~~ - ✅ Already Complete (19/19 routes) | P1 — High Priority (Next 3 days) |
| x-add-rate-limiting-to-hr-2-remaining-routes-already-complete-7-7-routes-next-st | P2 | ? | 5 | unknown | Doc-only | [x] ~~**Add rate limiting to HR** (2 remaining routes)~~ - ✅ Already Complete (7/7 routes) | P1 — High Priority (Next 3 days) |
| x-add-rate-limiting-to-crm-4-remaining-routes-already-complete-4-4-routes-next-s | P2 | ? | 5 | unknown | Doc-only | [x] ~~**Add rate limiting to CRM** (4 remaining routes)~~ - ✅ Already Complete (4/4 routes) | P1 — High Priority (Next 3 days) |
| x-add-zod-validation-to-marketplace-routes-15-routes-already-complete-9-9-routes | P2 | ? | 5 | unknown | Doc-only | [x] ~~**Add Zod validation to Marketplace routes** (15 routes)~~ - ✅ Already Complete (9/9 routes) | P1 — High Priority (Next 3 days) |
| app-api-marketplace-products-route-ts-post-next-steps-app-api-marketplace-produc | P2 | ? | 5 | unknown | app/api/marketplace/products/route.ts | `app/api/marketplace/products/route.ts` POST | 📁 Files Modified This Session |
| app-api-marketplace-cart-route-ts-post-next-steps-app-api-marketplace-cart-route | P2 | ? | 5 | unknown | app/api/marketplace/cart/route.ts | `app/api/marketplace/cart/route.ts` POST | Pattern 2: Missing Rate Limiting in Write Operations |
| app-api-marketplace-checkout-route-ts-post-next-steps-app-api-marketplace-checko | P2 | ? | 5 | unknown | app/api/marketplace/checkout/route.ts | `app/api/marketplace/checkout/route.ts` POST | Pattern 2: Missing Rate Limiting in Write Operations |
| app-api-hr-employees-route-ts-post-next-steps-app-api-hr-employees-route-ts | P2 | ? | 5 | unknown | app/api/hr/employees/route.ts | `app/api/hr/employees/route.ts` POST | Pattern 2: Missing Rate Limiting in Write Operations |
| app-api-finance-accounts-route-ts-post-next-steps-app-api-finance-accounts-route | P2 | ? | 5 | unknown | app/api/finance/accounts/route.ts | `app/api/finance/accounts/route.ts` POST | Pattern 2: Missing Rate Limiting in Write Operations |
| lib-15-todos-mostly-optimization-notes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | **lib/**: 15 TODOs (mostly optimization notes) | Category 9: TODO/FIXME Comments (P3 - 29 Instances) |
| app-10-todos-feature-enhancements-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | **app/**: 10 TODOs (feature enhancements) | Category 9: TODO/FIXME Comments (P3 - 29 Instances) |
| services-4-todos-integration-improvements-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | **services/**: 4 TODOs (integration improvements) | Category 9: TODO/FIXME Comments (P3 - 29 Instances) |
| and-6-others-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | And 6 others | Pattern 2: Test Mock Incomplete Setup |
| 2-stubs-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 2 stubs | 📍 Current Progress Summary |
| uses-lib-sanitize-html-which-imports-dompurify-from-isomorphic-dompurify-next-st | P2 | ? | 5 | unknown | Doc-only | Uses `@/lib/sanitize-html` which imports `DOMPurify` from `isomorphic-dompurify` | Fix 2: XSS Safety Verification (Careers Page) |
| applies-sanitize-strict-config-with-allowlist-of-safe-tags-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Applies `SANITIZE_STRICT_CONFIG` with allowlist of safe tags | Fix 2: XSS Safety Verification (Careers Page) |
| allowed-tags-p-strong-em-u-a-ul-ol-li-br-span-div-h1-h6-pre-code-blockquote-tabl | P2 | ? | 5 | unknown | Doc-only | **Allowed tags**: p, strong, em, u, a, ul, ol, li, br, span, div, h1-h6, pre, code, blockquote, table elements, img, hr | Fix 2: XSS Safety Verification (Careers Page) |
| allowed-attributes-href-target-rel-style-class-src-alt-title-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Allowed attributes**: href, target, rel, style, class, src, alt, title | Fix 2: XSS Safety Verification (Careers Page) |
| blocked-all-javascript-event-handlers-onclick-onerror-etc-script-tags-iframe-etc | P2 | ? | 5 | blocked | Doc-only | **Blocked**: All JavaScript event handlers (onclick, onerror, etc.), script tags, iframe, etc. | Fix 2: XSS Safety Verification (Careers Page) |
| properties-resolver-was-todo-at-line-943-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | **`properties` resolver** (was TODO at line ~943): | Fix 3: GraphQL TODO Stubs Implementation |
| both-resolvers-require-ctx-orgid-returns-empty-null-if-missing-next-steps-doc-on | P2 | ? | 5 | pending | Doc-only | Both resolvers require `ctx.orgId` (returns empty/null if missing) | Fix 3: GraphQL TODO Stubs Implementation |
| app-aqar-error-tsx-imports-logger-next-steps-app-aqar-error-ts | P2 | ? | 5 | unknown | app/aqar/error.ts | `app/aqar/error.tsx` - imports logger | 🗓️ 2025-12-12T23:43+03:00 — Webpack Build Fix v43.0 |
| app-about-error-tsx-imports-logger-next-steps-app-about-error-ts | P2 | ? | 5 | unknown | app/about/error.ts | `app/about/error.tsx` - imports logger | Previous Session (v36.0) |
| 20-other-client-components-using-logger-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ~20+ other client components using logger | 🗓️ 2025-12-12T23:43+03:00 — Webpack Build Fix v43.0 |
| used-variable-for-module-name-to-prevent-compile-time-resolution-next-steps-doc- | P2 | ? | 5 | unknown | Doc-only | Used variable for module name to prevent compile-time resolution | 🗓️ 2025-12-12T23:43+03:00 — Webpack Build Fix v43.0 |
| result-0-other-client-components-have-dynamic-imports-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Result**: 0 other client components have dynamic imports | Pattern 3: Other Dynamic Imports in Client Code |
| status-no-additional-risks-identified-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Status**: ✅ No additional risks identified | Pattern 3: Other Dynamic Imports in Client Code |
| 116-352-33-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ~116/352 (33%) | 📍 Current Progress Summary |
| properties-has-org-guard-but-todo-stub-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | `properties` - 🟡 Has org guard but TODO stub | Category 3: GraphQL Tenant Isolation Gaps |
| organization-uses-org-fallback-pattern-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `organization` - ⚠️ Uses org fallback pattern | Category 3: GraphQL Tenant Isolation Gaps |
| branch-fix-graphql-resolver-todos-planning-only-this-session-no-new-code-committ | P2 | ? | 5 | pending | Doc-only | Branch `fix/graphql-resolver-todos`; planning only this session (no new code committed). | 📍 Current Progress & Planned Next Steps |
| verification-pending-rerun-pnpm-typecheck-pnpm-lint-pnpm-test-after-implementing | P2 | ? | 5 | pending | Doc-only | Verification pending: rerun `pnpm typecheck && pnpm lint && pnpm test` after implementing changes. | 📍 Current Progress & Planned Next Steps |
| confirmed-auto-monitor-health-checks-running-while-logged-out-spamming-api-help- | P2 | ? | 5 | unknown | Doc-only | Confirmed auto-monitor/health checks running while logged out, spamming `/api/help/articles`, `/api/notifications`, `/api/qa/health`, `/api/qa/reconnect`, `/api/qa/alert` with 401/403 responses. | 📍 Current Progress & Planned Next Steps |
| otp-send-and-forgot-password-flows-returning-500-password-reset-also-logs-a-stub | P2 | ? | 5 | unknown | Doc-only | OTP send and forgot-password flows returning 500; password reset also logs a “stub” warning in the console. | 📍 Current Progress & Planned Next Steps |
| plan-gate-auto-monitor-startup-on-authenticated-session-and-ssr-feature-flag-dis | P2 | ? | 5 | unknown | Doc-only | Plan: gate auto-monitor startup on authenticated session (and SSR/feature flag), disable the constructor auto-start, add exponential backoff and dedupe, and only post QA alerts when auth/session present. Fix OTP and forgot-password handlers and add regression tests. | 📍 Current Progress & Planned Next Steps |
| observed-repeated-401-403-spam-from-auto-monitor-health-checks-hitting-api-help- | P2 | ? | 5 | unknown | Doc-only | Observed repeated 401/403 spam from auto-monitor/health checks hitting `/api/help/articles`, `/api/notifications`, `/api/qa/health`, `/api/qa/reconnect`, `/api/qa/alert` while unauthenticated (client-side monitoring running while logged out). | 📍 Current Progress & Planned Next Steps |
| post-api-auth-otp-send-returning-500-post-api-auth-forgot-password-returning-500 | P2 | ? | 5 | unknown | Doc-only | `POST /api/auth/otp/send` returning 500; `POST /api/auth/forgot-password` returning 500 (password reset stub warning). | 📍 Current Progress & Planned Next Steps |
| plan-gate-auto-monitoring-health-checks-on-authenticated-session-ssr-make-monito | P2 | ? | 5 | unknown | Doc-only | Plan: gate auto-monitoring/health checks on authenticated session/SSR; make monitor init a no-op when logged out; fix OTP/forgot-password handlers and add tests. | 📍 Current Progress & Planned Next Steps |
| missing-model-helper-types-employeemutable-employeedoclike-usermutable-hydratedd | P2 | ? | 5 | pending | types/mongoose-encrypted.d.ts | Missing model helper types (`EmployeeMutable`, `EmployeeDocLike`, `UserMutable`, `HydratedDocument`) | 🚀 Enhancements & Gaps (Production Readiness) |
| no-coverage-for-admin-notification-config-test-routes-or-support-impersonation-a | P2 | ? | 5 | pending | Doc-only | No coverage for admin notification config/test routes or support impersonation auth path | 🚀 Enhancements & Gaps (Production Readiness) |
| lib-sanitize-html-ts-manually-imported-jsdom-node-js-only-library-next-steps-lib | P2 | ? | 5 | unknown | lib/sanitize-html.ts | `lib/sanitize-html.ts` manually imported `jsdom` (Node.js-only library) | Root Cause Analysis |
| import-chain-safehtml-tsx-sanitize-html-ts-jsdom-next-steps-safehtml-ts | P2 | ? | 5 | unknown | SafeHtml.ts | Import chain: `SafeHtml.tsx` → `sanitize-html.ts` → `jsdom` | Root Cause Analysis |
| webpack-tried-to-bundle-child-process-for-client-side-impossible-next-steps-doc- | P2 | ? | 5 | unknown | Doc-only | Webpack tried to bundle `child_process` for client-side (impossible) | Root Cause Analysis |
| when-minification-encountered-this-error-it-tried-to-create-a-webpackerror-next- | P2 | ? | 5 | unknown | Doc-only | When minification encountered this error, it tried to create a `WebpackError` | Root Cause Analysis |
| the-real-error-was-masked-by-the-webpackerror-constructor-failure-next-steps-doc | P2 | ? | 5 | unknown | Doc-only | The real error was masked by the `WebpackError` constructor failure | Root Cause Analysis |
| lib-aws-secrets-ts-only-imported-in-api-routes-next-steps-lib-aws-secrets-ts | P2 | ? | 5 | unknown | lib/aws-secrets.ts | `lib/aws-secrets.ts` - Only imported in API routes | Pattern 1: Server-Only Libraries in Client-Side Code |
| lib-redis-ts-only-imported-in-api-routes-next-steps-lib-redis-ts | P2 | ? | 5 | unknown | lib/redis.ts | `lib/redis.ts` - Only imported in API routes | Pattern 1: Server-Only Libraries in Client-Side Code |
| lib-redis-client-ts-only-imported-in-api-routes-next-steps-lib-redis-client-ts | P2 | ? | 5 | unknown | lib/redis-client.ts | `lib/redis-client.ts` - Only imported in API routes | Pattern 1: Server-Only Libraries in Client-Side Code |
| app-aqar-filters-page-tsx-121-filter-state-parsing-next-steps-app-aqar-filters-p | P2 | ? | 5 | unknown | app/aqar/filters/page.ts | `app/aqar/filters/page.tsx:121` - Filter state parsing | 2. Unsafe JSON.parse Patterns |
| app-shell-clientsidebar-tsx-129-websocket-event-next-steps-app-shell-clientsideb | P2 | ? | 5 | unknown | app/_shell/ClientSidebar.ts | `app/_shell/ClientSidebar.tsx:129` - WebSocket event | Pattern 3: JSON.parse Without Try-Catch (38 instances) |
| app-marketplace-vendor-products-upload-page-tsx-151-form-specs-next-steps-app-ma | P2 | ? | 5 | unknown | app/marketplace/vendor/products/upload/page.ts | `app/marketplace/vendor/products/upload/page.tsx:151` - Form specs | Pattern 3: JSON.parse Without Try-Catch (38 instances) |
| app-api-webhooks-sendgrid-route-ts-86-webhook-payload-next-steps-app-api-webhook | P2 | ? | 5 | unknown | app/api/webhooks/sendgrid/route.ts:86 | `app/api/webhooks/sendgrid/route.ts:86` - Webhook payload | Pattern 3: JSON.parse Without Try-Catch (38 instances) |
| app-api-webhooks-taqnyat-route-ts-152-sms-webhook-next-steps-app-api-webhooks-ta | P2 | ? | 5 | unknown | app/api/webhooks/taqnyat/route.ts:152 | `app/api/webhooks/taqnyat/route.ts:152` - SMS webhook | Pattern 3: JSON.parse Without Try-Catch (38 instances) |
| effort-30-minutes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Effort: 30 minutes | 1. JSON.parse Safety (6 high-priority files) |
| effort-15-minutes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Effort: 15 minutes | 2. Careers Page XSS Review |
| app-api-finance-journals-id-post-route-ts-next-steps-post-route-ts | P2 | ? | 5 | unknown | /post/route.ts | `app/api/finance/journals/[id]/post/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-finance-journals-id-void-route-ts-next-steps-void-route-ts | P2 | ? | 5 | unknown | /void/route.ts | `app/api/finance/journals/[id]/void/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-finance-reports-owner-statement-route-ts-next-steps-app-api-finance-repo | P2 | ? | 5 | unknown | app/api/finance/reports/owner-statement/route.ts | `app/api/finance/reports/owner-statement/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-health-auth-route-ts-next-steps-app-api-health-auth-route-ts | P2 | ? | 5 | unknown | app/api/health/auth/route.ts | `app/api/health/auth/route.ts` | 📁 Files Modified This Session |
| app-api-health-db-diag-route-ts-next-steps-app-api-health-db-diag-route-ts | P2 | ? | 5 | unknown | app/api/health/db-diag/route.ts | `app/api/health/db-diag/route.ts` | 📁 Files Modified This Session |
| app-api-health-debug-route-ts-next-steps-app-api-health-debug-route-ts | P2 | ? | 5 | unknown | app/api/health/debug/route.ts | `app/api/health/debug/route.ts` | 📁 Files Modified This Session |
| app-api-health-live-route-ts-next-steps-app-api-health-live-route-ts | P2 | ? | 5 | unknown | app/api/health/live/route.ts | `app/api/health/live/route.ts` | 📁 Files Modified This Session |
| app-api-health-ready-route-ts-next-steps-app-api-health-ready-route-ts | P2 | ? | 5 | unknown | app/api/health/ready/route.ts | `app/api/health/ready/route.ts` | 📁 Files Modified This Session |
| app-api-health-route-ts-next-steps-app-api-health-route-ts | P2 | ? | 5 | unknown | app/api/health/route.ts | `app/api/health/route.ts` | 📁 Files Modified This Session |
| app-api-health-sms-route-ts-next-steps-app-api-health-sms-route-ts | P2 | ? | 5 | unknown | app/api/health/sms/route.ts | `app/api/health/sms/route.ts` | 📁 Files Modified This Session |
| app-api-help-articles-id-comments-route-ts-next-steps-comments-route-ts | P2 | ? | 5 | unknown | /comments/route.ts | `app/api/help/articles/[id]/comments/route.ts` | Pattern 2: API Route Error Handling |
| app-api-help-context-route-ts-next-steps-app-api-help-context-route-ts | P2 | ? | 5 | unknown | app/api/help/context/route.ts | `app/api/help/context/route.ts` | 📁 Files Modified This Session |
| app-api-marketplace-categories-route-ts-next-steps-app-api-marketplace-categorie | P2 | ? | 5 | unknown | app/api/marketplace/categories/route.ts | `app/api/marketplace/categories/route.ts` | 📁 Files Modified This Session |
| app-api-marketplace-orders-route-ts-next-steps-app-api-marketplace-orders-route- | P2 | ? | 5 | unknown | app/api/marketplace/orders/route.ts | `app/api/marketplace/orders/route.ts` | 📁 Files Modified This Session |
| app-api-marketplace-search-route-ts-next-steps-app-api-marketplace-search-route- | P2 | ? | 5 | unknown | app/api/marketplace/search/route.ts | `app/api/marketplace/search/route.ts` | 📁 Files Modified This Session |
| app-api-onboarding-caseid-complete-tutorial-route-ts-next-steps-complete-tutoria | P2 | ? | 5 | unknown | /complete-tutorial/route.ts | `app/api/onboarding/[caseId]/complete-tutorial/route.ts` | 📁 Files Modified This Session |
| app-api-onboarding-caseid-documents-confirm-upload-route-ts-next-steps-documents | P2 | ? | 5 | unknown | /documents/confirm-upload/route.ts | `app/api/onboarding/[caseId]/documents/confirm-upload/route.ts` | 📁 Files Modified This Session |
| app-api-onboarding-caseid-documents-request-upload-route-ts-next-steps-documents | P2 | ? | 5 | unknown | /documents/request-upload/route.ts | `app/api/onboarding/[caseId]/documents/request-upload/route.ts` | 📁 Files Modified This Session |
| app-api-onboarding-documents-id-review-route-ts-next-steps-review-route-ts | P2 | ? | 5 | unknown | /review/route.ts | `app/api/onboarding/documents/[id]/review/route.ts` | 📁 Files Modified This Session |
| app-api-onboarding-initiate-route-ts-next-steps-app-api-onboarding-initiate-rout | P2 | ? | 5 | unknown | app/api/onboarding/initiate/route.ts | `app/api/onboarding/initiate/route.ts` | 📁 Files Modified This Session |
| app-api-onboarding-route-ts-next-steps-app-api-onboarding-route-ts | P2 | ? | 5 | unknown | app/api/onboarding/route.ts | `app/api/onboarding/route.ts` | 📁 Files Modified This Session |
| app-api-webhooks-carrier-tracking-route-ts-next-steps-app-api-webhooks-carrier-t | P2 | ? | 5 | unknown | app/api/webhooks/carrier/tracking/route.ts | `app/api/webhooks/carrier/tracking/route.ts` | 📁 Files Modified This Session |
| app-api-webhooks-sendgrid-route-ts-next-steps-app-api-webhooks-sendgrid-route-ts | P2 | ? | 5 | unknown | app/api/webhooks/sendgrid/route.ts | `app/api/webhooks/sendgrid/route.ts` | D) JSON.parse Safety Audit |
| 147-352-42-next-steps-doc-only | P2 | ? | 5 | in_progress | Doc-only | 147/352 (42%) | 📍 Current Progress Summary |
| git-status-only-pnpm-lock-yaml-modified-next-steps-pnpm-lock-yaml | P2 | ? | 5 | unknown | pnpm-lock.yaml | Git status: Only `pnpm-lock.yaml` modified | 📈 Progress & Planned Next Steps |
| aqar-rate-limiting-100-complete-16-16-routes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Aqar Rate Limiting: 100% complete (16/16 routes) | Previous Session Accomplishments (v37.0) |
| production-readiness-91-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Production Readiness: 91% | Previous Session Accomplishments (v37.0) |
| total-unprotected-routes-205-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Total Unprotected Routes**: 205 | Summary |
| health-test-demo-endpoints-acceptable-16-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Health/Test/Demo Endpoints** (Acceptable): 16 | Summary |
| webhook-endpoints-need-separate-handling-4-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Webhook Endpoints** (Need separate handling): 4 | Summary |
| routes-needing-protection-185-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Routes Needing Protection**: 185 | Summary |
| app-api-admin-audit-logs-route-ts-next-steps-app-api-admin-audit-logs-route-ts | P2 | ? | 5 | unknown | app/api/admin/audit-logs/route.ts | `app/api/admin/audit-logs/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-admin-discounts-route-ts-next-steps-app-api-admin-discounts-route-ts | P2 | ? | 5 | unknown | app/api/admin/discounts/route.ts | `app/api/admin/discounts/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-admin-notifications-config-route-ts-next-steps-app-api-admin-notificatio | P2 | ? | 5 | unknown | app/api/admin/notifications/config/route.ts | `app/api/admin/notifications/config/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-admin-notifications-history-route-ts-next-steps-app-api-admin-notificati | P2 | ? | 5 | unknown | app/api/admin/notifications/history/route.ts | `app/api/admin/notifications/history/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-admin-notifications-send-route-ts-next-steps-app-api-admin-notifications | P2 | ? | 5 | unknown | app/api/admin/notifications/send/route.ts | `app/api/admin/notifications/send/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-admin-notifications-test-route-ts-next-steps-app-api-admin-notifications | P2 | ? | 5 | unknown | app/api/admin/notifications/test/route.ts | `app/api/admin/notifications/test/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-admin-price-tiers-route-ts-next-steps-app-api-admin-price-tiers-route-ts | P2 | ? | 5 | unknown | app/api/admin/price-tiers/route.ts | `app/api/admin/price-tiers/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-admin-sms-route-ts-next-steps-app-api-admin-sms-route-ts | P2 | ? | 5 | unknown | app/api/admin/sms/route.ts | `app/api/admin/sms/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-admin-users-route-ts-next-steps-app-api-admin-users-route-ts | P2 | ? | 5 | unknown | app/api/admin/users/route.ts | `app/api/admin/users/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-aqar-chat-route-ts-next-steps-app-api-aqar-chat-route-ts | P2 | ? | 5 | unknown | app/api/aqar/chat/route.ts | `app/api/aqar/chat/route.ts` | 2. API Routes Missing Error Handling (20+ routes) |
| app-api-aqar-listings-search-route-ts-next-steps-app-api-aqar-listings-search-ro | P2 | ? | 5 | unknown | app/api/aqar/listings/search/route.ts | `app/api/aqar/listings/search/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-aqar-map-route-ts-next-steps-app-api-aqar-map-route-ts | P2 | ? | 5 | unknown | app/api/aqar/map/route.ts | `app/api/aqar/map/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-aqar-pricing-route-ts-next-steps-app-api-aqar-pricing-route-ts | P2 | ? | 5 | unknown | app/api/aqar/pricing/route.ts | `app/api/aqar/pricing/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-aqar-properties-route-ts-next-steps-app-api-aqar-properties-route-ts | P2 | ? | 5 | unknown | app/api/aqar/properties/route.ts | `app/api/aqar/properties/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-aqar-recommendations-route-ts-next-steps-app-api-aqar-recommendations-ro | P2 | ? | 5 | unknown | app/api/aqar/recommendations/route.ts | `app/api/aqar/recommendations/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-aqar-support-chatbot-route-ts-next-steps-app-api-aqar-support-chatbot-ro | P2 | ? | 5 | unknown | app/api/aqar/support/chatbot/route.ts | `app/api/aqar/support/chatbot/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-force-logout-route-ts-next-steps-app-api-auth-force-logout-route-ts | P2 | ? | 5 | unknown | app/api/auth/force-logout/route.ts | `app/api/auth/force-logout/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-forgot-password-route-ts-next-steps-app-api-auth-forgot-password-ro | P2 | ? | 5 | unknown | app/api/auth/forgot-password/route.ts | `app/api/auth/forgot-password/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-me-route-ts-next-steps-app-api-auth-me-route-ts | P2 | ? | 5 | unknown | app/api/auth/me/route.ts | `app/api/auth/me/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-post-login-route-ts-next-steps-app-api-auth-post-login-route-ts | P2 | ? | 5 | unknown | app/api/auth/post-login/route.ts | `app/api/auth/post-login/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-refresh-route-ts-next-steps-app-api-auth-refresh-route-ts | P2 | ? | 5 | unknown | app/api/auth/refresh/route.ts | `app/api/auth/refresh/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-reset-password-route-ts-next-steps-app-api-auth-reset-password-rout | P2 | ? | 5 | unknown | app/api/auth/reset-password/route.ts | `app/api/auth/reset-password/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-signup-route-ts-next-steps-app-api-auth-signup-route-ts | P2 | ? | 5 | unknown | app/api/auth/signup/route.ts | `app/api/auth/signup/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-test-credentials-debug-route-ts-next-steps-app-api-auth-test-creden | P2 | ? | 5 | unknown | app/api/auth/test/credentials-debug/route.ts | `app/api/auth/test/credentials-debug/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-test-session-route-ts-next-steps-app-api-auth-test-session-route-ts | P2 | ? | 5 | unknown | app/api/auth/test/session/route.ts | `app/api/auth/test/session/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-auth-verify-route-ts-next-steps-app-api-auth-verify-route-ts | P2 | ? | 5 | unknown | app/api/auth/verify/route.ts | `app/api/auth/verify/route.ts` | 2. API Routes Missing Error Handling (20+ routes) |
| app-api-auth-verify-send-route-ts-next-steps-app-api-auth-verify-send-route-ts | P2 | ? | 5 | unknown | app/api/auth/verify/send/route.ts | `app/api/auth/verify/send/route.ts` | 2. API Routes Missing Error Handling (20+ routes) |
| app-api-ats-analytics-route-ts-next-steps-app-api-ats-analytics-route-ts | P2 | ? | 5 | unknown | app/api/ats/analytics/route.ts | `app/api/ats/analytics/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-applications-route-ts-next-steps-app-api-ats-applications-route-ts | P2 | ? | 5 | unknown | app/api/ats/applications/route.ts | `app/api/ats/applications/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-convert-to-employee-route-ts-next-steps-app-api-ats-convert-to-emplo | P2 | ? | 5 | unknown | app/api/ats/convert-to-employee/route.ts | `app/api/ats/convert-to-employee/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-interviews-route-ts-next-steps-app-api-ats-interviews-route-ts | P2 | ? | 5 | unknown | app/api/ats/interviews/route.ts | `app/api/ats/interviews/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-jobs-id-apply-route-ts-next-steps-apply-route-ts | P2 | ? | 5 | unknown | /apply/route.ts | `app/api/ats/jobs/[id]/apply/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-jobs-id-publish-route-ts-next-steps-publish-route-ts | P2 | ? | 5 | unknown | /publish/route.ts | `app/api/ats/jobs/[id]/publish/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-jobs-public-route-ts-next-steps-app-api-ats-jobs-public-route-ts | P2 | ? | 5 | unknown | app/api/ats/jobs/public/route.ts | `app/api/ats/jobs/public/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-jobs-route-ts-next-steps-app-api-ats-jobs-route-ts | P2 | ? | 5 | unknown | app/api/ats/jobs/route.ts | `app/api/ats/jobs/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-moderation-route-ts-next-steps-app-api-ats-moderation-route-ts | P2 | ? | 5 | unknown | app/api/ats/moderation/route.ts | `app/api/ats/moderation/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-public-post-route-ts-next-steps-app-api-ats-public-post-route-ts | P2 | ? | 5 | unknown | app/api/ats/public-post/route.ts | `app/api/ats/public-post/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| app-api-ats-settings-route-ts-next-steps-app-api-ats-settings-route-ts | P2 | ? | 5 | unknown | app/api/ats/settings/route.ts | `app/api/ats/settings/route.ts` | Full List of Routes Needing Rate Limiting (185 total) |
| p2-add-safejson-utility-for-json-parse-calls-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **P2**: Add safeJSON utility for JSON.parse calls | 📋 Next Steps (Priority Order) |
| p2-verify-test-imports-in-2-potentially-stale-test-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **P2**: Verify test imports in 2 potentially stale test files | 📋 Next Steps (Priority Order) |
| issue-185-routes-lack-enforceratelimit-call-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Issue**: 185 routes lack `enforceRateLimit` call | Pattern 1: Routes Without Rate Limiting |
| solution-add-to-all-api-routes-with-appropriate-limits-per-http-method-next-step | P2 | ? | 5 | unknown | Doc-only | **Solution**: Add to all API routes with appropriate limits per HTTP method | Pattern 1: Routes Without Rate Limiting |
| issue-8-instances-of-unprotected-json-parse-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Issue**: 8 instances of unprotected JSON.parse | Pattern 2: JSON.parse Without Error Handling |
| similar-all-in-different-modules-aqar-shell-api-routes-marketplace-help-next-ste | P2 | ? | 5 | unknown | Doc-only | **Similar**: All in different modules (aqar, shell, api routes, marketplace, help) | Pattern 2: JSON.parse Without Error Handling |
| solution-create-lib-utils-safejson-ts-utility-and-replace-all-instances-next-ste | P2 | ? | 5 | unknown | lib/utils/safeJSON.ts | **Solution**: Create `lib/utils/safeJSON.ts` utility and replace all instances | Pattern 2: JSON.parse Without Error Handling |
| solution-implement-actual-queries-or-document-as-not-implemented-next-steps-doc- | P2 | ? | 5 | unknown | Doc-only | **Solution**: Implement actual queries or document as "not implemented" | Pattern 3: GraphQL Resolver Stubs |
| all-validations-pass-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | All validations pass | P0: Verification Gates |
| status-complete-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Status**: ✅ COMPLETE | Previous Session (v36.0) |
| coverage-100-16-16-routes-protected-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Coverage: 100% (16/16 routes protected) | P1: Aqar Rate Limiting (16 routes) |
| aqar-insights-pricing-60-req-min-reads-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `aqar/insights/pricing` - 60 req/min (reads) | P1: Aqar Rate Limiting (16 routes) |
| aqar-favorites-get-60-min-post-30-min-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `aqar/favorites` - GET 60/min, POST 30/min | P1: Aqar Rate Limiting (16 routes) |
| aqar-favorites-id-delete-20-min-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `aqar/favorites/[id]` - DELETE 20/min | P1: Aqar Rate Limiting (16 routes) |
| aqar-listings-post-30-min-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `aqar/listings` - POST 30/min | P1: Aqar Rate Limiting (16 routes) |
| aqar-listings-id-get-60-min-patch-30-min-delete-20-min-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `aqar/listings/[id]` - GET 60/min, PATCH 30/min, DELETE 20/min | P1: Aqar Rate Limiting (16 routes) |
| aqar-listings-recommendations-get-60-min-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `aqar/listings/recommendations` - GET 60/min | P1: Aqar Rate Limiting (16 routes) |
| aqar-packages-get-60-min-post-20-min-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `aqar/packages` - GET 60/min, POST 20/min | P1: Aqar Rate Limiting (16 routes) |
| aqar-offline-get-30-min-expensive-operation-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `aqar/offline` - GET 30/min (expensive operation) | P1: Aqar Rate Limiting (16 routes) |
| pattern-enforceratelimit-with-keyprefix-per-endpoint-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Pattern: `enforceRateLimit` with keyPrefix per endpoint | P1: Aqar Rate Limiting (16 routes) |
| dashboardstats-query-has-org-enforcement-returns-empty-if-no-orgid-next-steps-do | P2 | ? | 5 | unknown | Doc-only | `dashboardStats` query: Has org enforcement, returns empty if no orgId | P1: GraphQL Security (Already Complete) |
| createworkorder-mutation-has-org-enforcement-rejects-if-no-orgid-next-steps-doc- | P2 | ? | 5 | unknown | Doc-only | `createWorkOrder` mutation: Has org enforcement, rejects if no orgId | P1: GraphQL Security (Already Complete) |
| app-administration-error-tsx-next-steps-app-administration-error-ts | P2 | ? | 5 | unknown | app/administration/error.ts | `app/administration/error.tsx` | Previous Session (v36.0) |
| app-careers-error-tsx-next-steps-app-careers-error-ts | P2 | ? | 5 | unknown | app/careers/error.ts | `app/careers/error.tsx` | Previous Session (v36.0) |
| app-cms-error-tsx-next-steps-app-cms-error-ts | P2 | ? | 5 | unknown | app/cms/error.ts | `app/cms/error.tsx` | Previous Session (v36.0) |
| app-forgot-password-error-tsx-next-steps-app-forgot-password-error-ts | P2 | ? | 5 | unknown | app/forgot-password/error.ts | `app/forgot-password/error.tsx` | Previous Session (v36.0) |
| app-help-error-tsx-next-steps-app-help-error-ts | P2 | ? | 5 | unknown | app/help/error.ts | `app/help/error.tsx` | Previous Session (v36.0) |
| app-login-error-tsx-next-steps-app-login-error-ts | P2 | ? | 5 | unknown | app/login/error.ts | `app/login/error.tsx` | Previous Session (v36.0) |
| app-notifications-error-tsx-next-steps-app-notifications-error-ts | P2 | ? | 5 | unknown | app/notifications/error.ts | `app/notifications/error.tsx` | Previous Session (v36.0) |
| app-pricing-error-tsx-next-steps-app-pricing-error-ts | P2 | ? | 5 | unknown | app/pricing/error.ts | `app/pricing/error.tsx` | Previous Session (v36.0) |
| app-product-error-tsx-next-steps-app-product-error-ts | P2 | ? | 5 | unknown | app/product/error.ts | `app/product/error.tsx` | Previous Session (v36.0) |
| app-profile-error-tsx-next-steps-app-profile-error-ts | P2 | ? | 5 | unknown | app/profile/error.ts | `app/profile/error.tsx` | Previous Session (v36.0) |
| app-reports-error-tsx-next-steps-app-reports-error-ts | P2 | ? | 5 | unknown | app/reports/error.ts | `app/reports/error.tsx` | Previous Session (v36.0) |
| app-support-error-tsx-next-steps-app-support-error-ts | P2 | ? | 5 | unknown | app/support/error.ts | `app/support/error.tsx` | Previous Session (v36.0) |
| app-system-error-tsx-next-steps-app-system-error-ts | P2 | ? | 5 | unknown | app/system/error.ts | `app/system/error.tsx` | Previous Session (v36.0) |
| app-vendor-error-tsx-next-steps-app-vendor-error-ts | P2 | ? | 5 | unknown | app/vendor/error.ts | `app/vendor/error.tsx` | Previous Session (v36.0) |
| 139-352-39-next-steps-doc-only | P2 | ? | 5 | in_progress | Doc-only | 139/352 (39%) | 📍 Current Progress Summary |
| 213-352-61-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 213/352 (61%) | 📍 Current Progress Summary |
| 29-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 29 | 🟢 LOW PRIORITY — Code Quality |
| 117-next-steps-copilot-chat-route-ts | P2 | ? | 5 | pending | copilot/chat/route.ts | 117 | ⚠️ JSON.parse Safety Audit |
| 72-next-steps-projects-route-ts | P2 | ? | 5 | pending | projects/route.ts | 72 | ⚠️ JSON.parse Safety Audit |
| app-help-slug-helparticleclient-tsx-help-articles-sanitized-next-steps-helpartic | P2 | ? | 5 | unknown | /HelpArticleClient.ts | `app/help/[slug]/HelpArticleClient.tsx` — Help articles (sanitized) | 🔐 Security Audit |
| components-safehtml-tsx-sanitization-wrapper-itself-next-steps-components-safeht | P2 | ? | 5 | unknown | components/SafeHtml.ts | `components/SafeHtml.tsx` — Sanitization wrapper itself | 🔐 Security Audit |
| add-try-catch-to-json-parse-4-files-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Add try-catch to JSON.parse (4 files) | 🔲 Planned Next Steps |
| api-tests-aqar-module-16-routes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | API tests: Aqar module (16 routes) | 🔲 Planned Next Steps |
| api-tests-hr-module-7-routes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | API tests: HR module (7 routes) | 🔲 Planned Next Steps |
| total-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Total | 🔴 HIGH PRIORITY — Rate Limiting Gaps (86 routes remaining) |
| attendance-hr-notification-payroll-finance-ics-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | attendance, hr-notification, payroll-finance, ics | 🧪 Test Coverage Summary |
| zod-validation-expansion-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Zod validation expansion | 🔲 Planned Next Steps |
| total-tests-2814-passing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Total Tests**: 2814 passing | Current State |
| test-files-282-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Test Files**: 282 | Current State |
| coverage-all-core-functionality-tested-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Coverage**: All core functionality tested | Current State |
| mostly-missing-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Mostly missing | Pattern 1: Rate Limiting Implementation |
| app-api-fm-vendors-route-ts-find-without-limit-next-steps-app-api-fm-vendors-rou | P2 | ? | 5 | unknown | app/api/fm/vendors/route.ts | `app/api/fm/vendors/route.ts` - find without limit | Pattern 2: Unbounded Database Queries |
| various-aggregation-pipelines-missing-limit-stage-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Various aggregation pipelines missing $limit stage | Pattern 2: Unbounded Database Queries |
| app-root-main-app-shell-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `app/(root)/` - Main app shell | Pattern 3: Error Boundary Gaps |
| app-aqar-filters-app-aqar-map-property-features-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `app/aqar/filters/`, `app/aqar/map/` - Property features | Pattern 3: Error Boundary Gaps |
| app-work-orders-board-app-work-orders-new-core-wo-features-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `app/work-orders/board/`, `app/work-orders/new/` - Core WO features | Pattern 3: Error Boundary Gaps |
| 30-core-25-missing-subpages-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 30 core + 25 missing subpages | Completed This Session |
| 5-services-need-tests-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 5 services need tests | Completed This Session |
| add-missing-service-tests-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Add missing service tests | 🔲 Planned Next Steps |
| test-coverage-8-pattern-detection-tests-in-org-enforcement-test-ts-next-steps-or | P2 | ? | 5 | unknown | org-enforcement.test.ts | **Test Coverage:** 8 pattern detection tests in `org-enforcement.test.ts` | Pattern: userId-as-orgId Fallback |
| pattern-using-errors-instead-of-issues-on-zoderror-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Pattern:** Using `.errors` instead of `.issues` on ZodError | Pattern: Incorrect Zod Error Access |
| fix-changed-to-error-issues-in-all-affected-routes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Fix:** Changed to `error.issues` in all affected routes | Pattern: Incorrect Zod Error Access |
| test-coverage-zod-validation-test-ts-checks-for-this-pattern-next-steps-zod-vali | P2 | ? | 5 | unknown | zod-validation.test.ts | **Test Coverage:** `zod-validation.test.ts` checks for this pattern | Pattern: Incorrect Zod Error Access |
| app-api-souq-reviews-route-ts-sec-fix-orgid-required-next-steps-app-api-souq-rev | P2 | ? | 5 | unknown | app/api/souq/reviews/route.ts | `app/api/souq/reviews/route.ts` - SEC-FIX: orgId required | 📋 Session Files Changed |
| app-api-aqar-listings-route-ts-sec-fix-orgid-required-next-steps-app-api-aqar-li | P2 | ? | 5 | unknown | app/api/aqar/listings/route.ts | `app/api/aqar/listings/route.ts` - SEC-FIX: orgId required | 📋 Session Files Changed |
| app-api-aqar-packages-route-ts-sec-fix-orgid-required-next-steps-app-api-aqar-pa | P2 | ? | 5 | unknown | app/api/aqar/packages/route.ts | `app/api/aqar/packages/route.ts` - SEC-FIX: orgId required | 📋 Session Files Changed |
| app-api-aqar-favorites-route-ts-sec-fix-orgid-required-next-steps-app-api-aqar-f | P2 | ? | 5 | unknown | app/api/aqar/favorites/route.ts | `app/api/aqar/favorites/route.ts` - SEC-FIX: orgId required | 📋 Session Files Changed |
| app-api-souq-search-route-ts-fix-zod-error-access-next-steps-app-api-souq-search | P2 | ? | 5 | unknown | app/api/souq/search/route.ts | `app/api/souq/search/route.ts` - Fix: Zod error access | 📋 Session Files Changed |
| app-properties-error-tsx-new-error-boundary-next-steps-app-properties-error-ts | P2 | ? | 5 | unknown | app/properties/error.ts | `app/properties/error.tsx` - NEW: Error boundary | 📋 Session Files Changed |
| app-vendors-error-tsx-new-error-boundary-next-steps-app-vendors-error-ts | P2 | ? | 5 | unknown | app/vendors/error.ts | `app/vendors/error.tsx` - NEW: Error boundary | 📋 Session Files Changed |
| add-zod-to-52-remaining-routes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Add Zod to 52 remaining routes | 📋 PLANNED NEXT STEPS |
| add-try-catch-to-8-routes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Add try-catch to 8 routes | 📋 PLANNED NEXT STEPS |
| mock-must-return-allowed-true-not-success-true-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Mock must return `{ allowed: true }` not `{ success: true }` | Pattern: Rate Limiting Mock Requirements |
| any-route-test-under-tests-api-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Any route test under `tests/api/` | Pattern: Rate Limiting Mock Requirements |
| must-be-applied-in-beforeeach-to-reset-between-tests-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Must be applied in `beforeEach` to reset between tests | Pattern: Rate Limiting Mock Requirements |
| missing-required-field-invalid-input-expected-x-received-undefined-next-steps-do | P2 | ? | 5 | pending | Doc-only | Missing required field: `"Invalid input: expected X, received undefined"` | Pattern: Zod Validation Error Messages |
| invalid-format-schema-specific-message-e-g-invalid-email-format-next-steps-doc-o | P2 | ? | 5 | unknown | Doc-only | Invalid format: Schema-specific message (e.g., `"Invalid email format"`) | Pattern: Zod Validation Error Messages |
| tests-should-use-tocontain-for-robustness-against-message-changes-next-steps-doc | P2 | ? | 5 | unknown | Doc-only | Tests should use `toContain()` for robustness against message changes | Pattern: Zod Validation Error Messages |
| normalize-org-once-per-graphql-request-and-reuse-across-resolvers-next-steps-doc | P2 | ? | 5 | pending | Doc-only | Normalize org once per GraphQL request and reuse across resolvers | 🔧 Enhancements & Production Readiness |
| souq-review-post-falls-back-to-user-id-next-steps-app-api-souq-reviews-route-ts- | P2 | ? | 5 | pending | app/api/souq/reviews/route.ts:61-108 | Souq review POST falls back to user id | 🔧 Enhancements & Production Readiness |
| aqar-listings-packages-favorites-use-user-id-fallback-next-steps-app-api-aqar-li | P2 | ? | 5 | pending | app/api/aqar/listings/route.ts:99-138 | Aqar listings/packages/favorites use user-id fallback | 🔧 Enhancements & Production Readiness |
| souq-reviews-enforce-org-on-get-but-not-post-aqar-routes-show-the-same-user-as-o | P2 | ? | 5 | unknown | Doc-only | Souq reviews enforce org on GET but not POST; Aqar routes show the same “user-as-org” shortcut. Cleaning this pattern across modules keeps tenancy consistent. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| 10-files-staged-unstaged-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ~10 files (staged + unstaged) | 📍 Current Progress & Session Summary |
| fm-work-orders-id-assign-assigneeid-assigneetype-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `fm/work-orders/[id]/assign` — assigneeId, assigneeType | 1. Routes Needing Zod Validation (52 routes) |
| fm-work-orders-id-patch-status-priority-description-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `fm/work-orders/[id]` PATCH — status, priority, description | 1. Routes Needing Zod Validation (52 routes) |
| fm-properties-post-property-fields-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `fm/properties` POST — property fields | 1. Routes Needing Zod Validation (52 routes) |
| fm-finance-expenses-amount-category-vendor-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `fm/finance/expenses` — amount, category, vendor | 1. Routes Needing Zod Validation (52 routes) |
| fm-finance-budgets-budget-fields-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `fm/finance/budgets` — budget fields | 1. Routes Needing Zod Validation (52 routes) |
| kb-ingest-kb-search-document-content-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `kb/ingest`, `kb/search` — document content | 1. Routes Needing Zod Validation (52 routes) |
| fm-marketplace-vendor-listings-orders-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `fm/marketplace/*` — vendor, listings, orders | 1. Routes Needing Zod Validation (52 routes) |
| fm-system-roles-user-invites-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `fm/system/*` — roles, user invites | 1. Routes Needing Zod Validation (52 routes) |
| fm-support-tickets-escalations-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `fm/support/*` — tickets, escalations | 1. Routes Needing Zod Validation (52 routes) |
| add-zod-validation-to-52-routes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Add Zod validation to 52 routes | 📋 PLANNED NEXT STEPS |
| add-try-catch-to-5-routes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Add try-catch to 5 routes | 📋 PLANNED NEXT STEPS |
| not-run-pending-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Not run (pending) | 🗓️ 2025-12-12T20:01+03:00 — Security Backlog v28.0 |
| locked-api-sms-test-behind-a-production-404-while-retaining-super-admin-rate-lim | P2 | ? | 5 | unknown | Doc-only | Locked `/api/sms/test` behind a production 404 while retaining super-admin + rate-limit checks for lower environments. | 🔧 Changes (code) |
| not-run-in-this-session-please-execute-pnpm-typecheck-pnpm-lint-pnpm-test-before | P2 | ? | 5 | unknown | Doc-only | Not run in this session. Please execute `pnpm typecheck && pnpm lint && pnpm test` before release. | 🔎 Testing |
| progress-master-pending-report-located-and-updated-with-orgid-audit-expanded-rev | P2 | ? | 5 | pending | Doc-only | Progress: Master Pending Report located and updated with orgId audit; expanded review across GraphQL queries/mutations and Souq/Aqar routes that fall back to user ids. | 📍 Current Progress & Planned Next Steps |
| souq-reviews-enforce-org-on-get-but-not-on-post-mirroring-the-broader-user-as-or | P2 | ? | 5 | unknown | Doc-only | Souq reviews enforce org on GET but not on POST, mirroring the broader “user-as-org” shortcut seen in Aqar routes; clean up the pattern across modules to keep tenancy consistent. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| progress-master-pending-report-updated-with-latest-orgid-audit-risks-cataloged-a | P2 | ? | 5 | pending | Doc-only | Progress: Master Pending Report updated with latest orgId audit; risks cataloged across GraphQL read/write paths and Souq/Aqar routes using user-id fallbacks. | 📍 Current Progress & Planned Next Steps |
| souq-reviews-enforce-org-on-get-but-not-post-aqar-routes-show-the-same-user-as-o | P2 | ? | 5 | unknown | Doc-only | Souq reviews enforce org on GET but not POST; Aqar routes show the same “user-as-org” shortcut—clean up across modules to keep tenancy consistent. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| 117-352-33-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 117/352 (33%) | 📍 Current Progress & Session Summary |
| verify-next-steps-properties-route-ts | P2 | ? | 5 | pending | properties/route.ts | 🔲 VERIFY | C. Routes Without Try-Catch (8 Total) |
| use-health503-lib-api-health-ts-for-consistent-503-responses-instead-of-ad-hoc-j | P2 | ? | 5 | unknown | lib/api/health.ts | Use `health503` (`lib/api/health.ts`) for consistent 503 responses instead of ad-hoc JSON bodies in infra-sensitive paths (middleware and API routes). | 🛠️ Enhancements Needed (Production Readiness) |
| zod-parse-failures-surface-as-500-where-parse-is-used-directly-switch-to-safepar | P2 | ? | 5 | unknown | Doc-only | Zod parse failures surface as 500 where `parse` is used directly; switch to `safeParse` and return structured validation errors (same files above). | 🛠️ Enhancements Needed (Production Readiness) |
| payloads-that-partially-validate-can-proceed-to-db-writes-in-the-above-routes-en | P2 | ? | 5 | unknown | Doc-only | Payloads that partially validate can proceed to DB writes in the above routes; enforce schema validation first and short-circuit before side effects. | 🛠️ Enhancements Needed (Production Readiness) |
| add-negative-tests-for-malformed-json-and-invalid-payloads-for-checkout-quote-ch | P2 | ? | 5 | unknown | Doc-only | Add negative tests for malformed JSON and invalid payloads for `checkout/quote`, `checkout/session`, `properties/[id]` PATCH, `upload/scan-callback`, ensuring 400/422 (not 500). | 🛠️ Enhancements Needed (Production Readiness) |
| add-unit-tests-for-parsejsonbody-success-error-branches-and-safe-session-503-vs- | P2 | ? | 5 | unknown | Doc-only | Add unit tests for `parseJsonBody` success/error branches and `safe-session` (503 vs 401) to lock behavior. | 🛠️ Enhancements Needed (Production Readiness) |
| auth-infra-separation-new-safe-session-helper-provides-503-vs-401-discrimination | P2 | ? | 5 | unknown | Doc-only | **Auth/infra separation**: new `safe-session` helper provides 503 vs 401 discrimination; several routes still call `getSessionUser` directly and return generic 500 on infra errors, diverging from the newer pattern. Align for consistent resilience signaling. | 🔍 Deep-Dive: Similar or Identical Issues Elsewhere |
| next-fix-zod-record-signature-in-transition-route-widen-error-path-typing-in-wor | P2 | ? | 5 | unknown | Doc-only | Next: fix Zod record signature in transition route, widen error path typing in work-order creation, then rerun `pnpm typecheck && pnpm lint && pnpm test`. | 📍 Current Progress & Planned Next Steps |
| expand-rate-limit-coverage-to-50-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Expand rate limit coverage to 50%+ | 🚀 Production Readiness Assessment |
| add-rate-limiting-to-auth-routes-1-hour-effort-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Add rate limiting to auth routes (1 hour effort) | 🚀 Production Readiness Assessment |
| wrap-json-parse-in-webhooks-with-try-catch-30-min-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Wrap JSON.parse in webhooks with try-catch (30 min) | 🚀 Production Readiness Assessment |
| add-dompurify-sanitization-low-risk-content-is-mostly-trusted-next-steps-doc-onl | P2 | ? | 5 | unknown | Doc-only | Add DOMPurify sanitization (low risk, content is mostly trusted) | 🚀 Production Readiness Assessment |
| 121-352-34-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 121/352 (34%) | 📍 Current Progress & Status |
| add-tests-for-9-services-without-coverage-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Add tests for 9 services without coverage | 🎯 Planned Next Steps |
| audit-unprotected-async-void-operations-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Audit unprotected async void operations | 🎯 Planned Next Steps |
| create-pr-for-fix-graphql-resolver-todos-branch-with-all-fixes-next-steps-doc-on | P2 | ? | 5 | pending | Doc-only | **Create PR** for `fix/graphql-resolver-todos` branch with all fixes | 🎯 Planned Next Steps |
| merge-comprehensive-type-safety-and-test-coverage-improvements-next-steps-doc-on | P2 | ? | 5 | unknown | Doc-only | **Merge** comprehensive type safety and test coverage improvements | 🎯 Planned Next Steps |
| deploy-to-staging-for-e2e-validation-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Deploy** to staging for E2E validation | 🎯 Planned Next Steps |
| all-2650-tests-passing-100-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | All 2650 tests passing (100%) | 🚀 Production Readiness Assessment |
| eslint-0-warnings-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ESLint: 0 warnings | 🚀 Production Readiness Assessment |
| no-as-any-type-bypasses-in-production-code-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | No `as any` type bypasses in production code | 🚀 Production Readiness Assessment |
| all-api-routes-have-error-handling-direct-or-via-factory-re-export-next-steps-do | P2 | ? | 5 | unknown | Doc-only | All API routes have error handling (direct or via factory/re-export) | 🚀 Production Readiness Assessment |
| re-ran-pnpm-test-e2e-with-extended-timeout-suite-still-timed-out-copilot-isolati | P2 | ? | 5 | unknown | Doc-only | Re-ran `pnpm test:e2e` with extended timeout; suite still timed out (Copilot isolation flow still running). Typecheck/lint remain clean; models tests already green. | Progress & Planned Next Steps |
| sms-readiness-otp-flows-should-continue-to-gate-on-sms-config-and-log-delivery-e | P2 | ? | 5 | unknown | Doc-only | SMS readiness: OTP flows should continue to gate on SMS config and log delivery errors; validate Taqnyat credentials in deployed envs. | Deep-Dive Similar Issues |
| verification-pnpm-typecheck-pnpm-lint-pnpm-test-models-pnpm-test-e2e-timed-out-1 | P2 | ? | 5 | unknown | Doc-only | Verification: `pnpm typecheck` ✅, `pnpm lint` ✅, `pnpm test:models` ✅, `pnpm test:e2e` ⚠️ timed out (~10m, Copilot suite still running). | Progress & Planned Next Steps |
| efficiency-currency-currencies-feature-flag-single-sources-already-consolidated- | P2 | ? | 5 | unknown | Doc-only | Efficiency: Currency + CURRENCIES + feature-flag single sources already consolidated; reuse shared formatter/map across client/server (no divergent configs). | Enhancements (Production Readiness) |
| bugs-logic-taqnyat-webhook-now-size-capped-and-json-safe-before-processing-souq- | P2 | ? | 5 | unknown | Doc-only | Bugs/Logic: Taqnyat webhook now size-capped and JSON-safe before processing; Souq ad clicks return 400 on bad JSON instead of crashing; OTP send returns 503 when SMS disabled to avoid silent failures. | Enhancements (Production Readiness) |
| sms-readiness-otp-flows-should-gate-on-issmsoperational-to-prevent-blackholes-ve | P2 | ? | 5 | unknown | Doc-only | SMS readiness: OTP flows should gate on `isSmsOperational` to prevent blackholes; verify Taqnyat creds in prod and monitor `sendOTP` outcomes. | Deep-Dive Similar Issues |
| pending-p2-replace-remaining-12-console-usages-with-logger-calls-next-steps-doc- | P2 | ? | 5 | pending | Doc-only | Pending P2: Replace remaining 12 console usages with `logger` calls. | ✅ Current Progress & Next Steps |
| planned-actions-re-run-pnpm-lint-pnpm-test-after-upcoming-changes-keep-staging-r | P2 | ? | 5 | unknown | Doc-only | Planned actions: Re-run `pnpm lint && pnpm test` after upcoming changes; keep staging release-gate ready. | ✅ Current Progress & Next Steps |
| gh-envs-for-release-gate-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | GH envs for release-gate | 📋 Enhancements & Production-Readiness Items (Open) |
| route-alias-correctness-aqar-chat-alias-required-correct-relative-path-and-runti | P2 | ? | 5 | unknown | Doc-only | Route alias correctness: Aqar chat alias required correct relative path and runtime export; audit any other alias/re-export routes to ensure they forward handlers (and `runtime` when needed) without broken paths. | 🔎 Deep-Dive: Similar Issue Patterns |
| type-safety-in-mongoose-hooks-repeated-as-any-usage-stems-from-missing-hook-gene | P2 | ? | 5 | pending | Doc-only | Type safety in Mongoose hooks: Repeated `as any` usage stems from missing hook generics; centralizing hook type helpers will eliminate all 13 instances and reduce runtime casting risks. | 🔎 Deep-Dive: Similar Issue Patterns |
| logging-consistency-console-usage-outside-logger-remains-in-a-few-client-server- | P2 | ? | 5 | unknown | Doc-only | Logging consistency: Console usage outside logger remains in a few client/server entry points; standardize on `logger` to keep observability structured and PII-safe. | 🔎 Deep-Dive: Similar Issue Patterns |
| add-try-catch-to-critical-api-routes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Add try-catch to critical API routes | 🎯 Planned Next Steps (Priority Order) |
| add-tests-for-ip-reputation-ts-next-steps-ip-reputation-ts | P2 | ? | 5 | pending | ip-reputation.ts | Add tests for ip-reputation.ts | 🎯 Planned Next Steps (Priority Order) |
| app-api-work-orders-id-assign-route-ts-work-order-operations-next-steps-assign-r | P2 | ? | 5 | unknown | /assign/route.ts | `app/api/work-orders/[id]/assign/route.ts` — Work order operations | Pattern 2: API Route Error Handling |
| lib-logger-ts-error-capturing-next-steps-lib-logger-ts | P2 | ? | 5 | unknown | lib/logger.ts | ✅ `lib/logger.ts` — Error capturing | 3. Sentry Observability Gaps |
| lib-audit-ts-audit-trail-next-steps-lib-audit-ts | P2 | ? | 5 | unknown | lib/audit.ts | ✅ `lib/audit.ts` — Audit trail | 3. Sentry Observability Gaps |
| fm-module-no-context-tagging-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ❌ FM module — No context tagging | 3. Sentry Observability Gaps |
| souq-module-no-context-tagging-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ❌ Souq module — No context tagging | 3. Sentry Observability Gaps |
| app-api-vendors-route-ts-app-api-vendors-route-ts-l140-next-steps-app-api-vendor | P2 | ? | 5 | unknown | app/api/vendors/route.ts | [app/api/vendors/route.ts](app/api/vendors/route.ts#L140) | 🔴 Pattern Issue #1: Direct `req.json()` Without Error Handling |
| app-api-work-orders-id-status-route-ts-app-api-work-orders-id-status-route-ts-l7 | P2 | ? | 5 | unknown | /status/route.ts | [app/api/work-orders/[id]/status/route.ts](app/api/work-orders/[id]/status/route.ts#L77) | 🔴 Pattern Issue #1: Direct `req.json()` Without Error Handling |
| lib-logger-ts-250-logger-utility-needs-generic-error-handling-next-steps-lib-log | P2 | ? | 5 | pending | lib/logger.ts:250 | `lib/logger.ts:250` — Logger utility needs generic error handling | 🟡 Pattern Issue #2: TypeScript `any` Usage (28 instances) |
| server-plugins-fieldencryption-ts-mongoose-plugin-requires-dynamic-types-next-st | P2 | ? | 5 | unknown | server/plugins/fieldEncryption.ts | `server/plugins/fieldEncryption.ts` — Mongoose plugin requires dynamic types | 🟡 Pattern Issue #2: TypeScript `any` Usage (28 instances) |
| server-models-hr-models-ts-pii-encryption-hooks-next-steps-server-models-hr-mode | P2 | ? | 5 | unknown | server/models/hr.models.ts | `server/models/hr.models.ts` — PII encryption hooks | 🟡 Pattern Issue #2: TypeScript `any` Usage (28 instances) |
| server-models-aqar-booking-ts-could-use-generics-instead-of-any-next-steps-serve | P2 | ? | 5 | unknown | server/models/aqar/Booking.ts | `server/models/aqar/Booking.ts` — Could use generics instead of `any` | 🟡 Pattern Issue #2: TypeScript `any` Usage (28 instances) |
| restrict-hr-payroll-routes-to-hr-roles-optionally-corporate-admin-per-sot-and-re | P2 | ? | 5 | unknown | Doc-only | Restrict HR payroll routes to HR roles (optionally Corporate Admin per SoT) and remove Finance role access. | 2) Planned Next Steps (Severity-Ordered) |
| new-hr-payroll-role-bleed-to-finance-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] **🔴 New HR payroll role bleed to Finance** | 🔴 Security & RBAC |
| evidence-app-api-hr-payroll-runs-route-ts-38-102-payroll-allowed-roles-includes- | P2 | ? | 5 | unknown | app/api/hr/payroll/runs/route.ts:38-102 | **Evidence:** `app/api/hr/payroll/runs/route.ts:38-102` (PAYROLL_ALLOWED_ROLES includes `FINANCE`, `FINANCE_OFFICER`). | 🔴 Security & RBAC |
| status-new-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Status:** 🔴 New | 🔴 Stack/Architecture Violations |
| pattern-signature-payroll-endpoints-allowing-finance-roles-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Pattern Signature:** Payroll endpoints allowing Finance roles. | 🔴 Security & RBAC |
| fix-direction-limit-to-hr-hr-officer-corporate-admin-if-sot-audit-existing-runs- | P2 | ? | 5 | unknown | Doc-only | **Fix Direction:** Limit to HR/HR_OFFICER (+ Corporate Admin if SoT), audit existing runs. | 🔴 Security & RBAC |
| evidence-e-g-app-api-finance-accounts-route-ts-255-app-api-finance-expenses-rout | P2 | ? | 5 | unknown | app/api/finance/accounts/route.ts:255 | **Evidence:** e.g., `app/api/finance/accounts/route.ts:255`, `app/api/finance/expenses/route.ts:145`, `app/api/hr/payroll/runs/route.ts:106` (18 total finance/HR routes). | 🔴 Security & RBAC |
| status-persisting-re-validated-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Status:** 🟠 Persisting (Re-validated) | 🔴 Security & RBAC |
| impact-malformed-json-triggers-500s-dos-in-critical-finance-hr-apis-inconsistent | P2 | ? | 5 | unknown | Doc-only | **Impact:** Malformed JSON triggers 500s/DoS in critical finance/HR APIs; inconsistent error contracts. | 🔴 Security & RBAC |
| fix-direction-add-shared-safe-parser-with-400-response-schema-validation-next-st | P2 | ? | 5 | unknown | Doc-only | **Fix Direction:** Add shared safe parser with 400 response + schema validation. | 🔴 Security & RBAC |
| new-sql-prisma-instrumentation-present-in-lockfile-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] **🔴 New SQL/Prisma instrumentation present in lockfile** | 🔴 Stack/Architecture Violations |
| evidence-pnpm-lock-yaml-11992-12006-bundles-opentelemetry-instrumentation-knex-m | P2 | ? | 5 | pending | pnpm-lock.yaml:11992-12006 | **Evidence:** `pnpm-lock.yaml:11992-12006` bundles `@opentelemetry/instrumentation-knex/mysql/pg` and `@prisma/instrumentation` via `@sentry/opentelemetry`. | 🔴 Stack/Architecture Violations |
| pattern-signature-sql-prisma-instrumentation-packages-in-lock-next-steps-doc-onl | P2 | ? | 5 | unknown | Doc-only | **Pattern Signature:** SQL/Prisma instrumentation packages in lock. | 🔴 Stack/Architecture Violations |
| fix-direction-remove-instrumentation-bundle-or-exclude-sql-drivers-regenerate-lo | P2 | ? | 5 | unknown | Doc-only | **Fix Direction:** Remove instrumentation bundle or exclude SQL drivers; regenerate lock sans SQL/Prisma. | 🔴 Stack/Architecture Violations |
| validation-parity-gap-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Validation parity gap | 🔧 Enhancements & Production Readiness |
| integration-feature-flagged-handler-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Integration (feature-flagged handler) | 🔧 Enhancements & Production Readiness |
| negative-mutation-cases-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Negative mutation cases | 🔧 Enhancements & Production Readiness |
| status-priority-drift-historic-divergence-between-graphql-enums-and-rest-state-m | P2 | ? | 5 | unknown | Doc-only | **Status/priority drift**: Historic divergence between GraphQL enums and REST state machine; normalized now—future GraphQL types must reuse the mapping to keep dashboards/statistics consistent. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| verification-this-session-pnpm-typecheck-pnpm-lint-pnpm-test-models-pnpm-test-e2 | P2 | ? | 5 | unknown | Doc-only | Verification this session: `pnpm typecheck` ✅, `pnpm lint` ✅, `pnpm test:models` ✅, `pnpm test:e2e` ⚠️ timed out (~10m). Next: rerun Playwright with higher timeout/CI gate to confirm full pass. | Progress & Planned Next Steps |
| souq-ad-click-handler-hardened-timestamp-parsed-once-to-number-before-signature- | P2 | ? | 5 | unknown | Doc-only | Souq ad click handler hardened: timestamp parsed once to number before signature verification to satisfy type guard and avoid silent coercion issues. | Progress & Planned Next Steps |
| logic-errors-graphql-creation-currently-allows-minimal-payload-add-org-scoped-ex | P2 | ? | 5 | unknown | Doc-only | Logic errors: GraphQL creation currently allows minimal payload—add org-scoped existence checks for property/assignee to mirror REST; ensure dashboard stats handle null orgId by returning 0s (already guarded). | Enhancements Needed for Production Readiness |
| validation-parity-rest-work-orders-enforce-schema-and-org-existence-checks-graph | P2 | ? | 5 | unknown | Doc-only | Validation parity: REST work orders enforce schema and org existence checks; GraphQL creation path should reuse or share validation utilities to prevent divergence when the feature flag is enabled. | Deep-Dive Analysis of Similar Issues |
| all-verification-gates-passing-typecheck-lint-build-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | All verification gates passing (typecheck, lint, build) | 📈 Current Progress |
| test-files-expanded-from-225-230-5-new-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Test files expanded from 225 → 230 (+5 new) | 📈 Current Progress |
| work-order-api-routes-enhanced-with-error-handling-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Work order API routes enhanced with error handling | 📈 Current Progress |
| pnpm-typecheck-0-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `pnpm typecheck` ✅ **0 errors** | 📈 Current Progress |
| pnpm-lint-passing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `pnpm lint` ✅ **PASSING** | 📈 Current Progress |
| pnpm-build-passing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `pnpm build` ✅ **PASSING** | 📈 Current Progress |
| test-files-230-total-up-from-225-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Test files: **230 total** (up from 225) | 📈 Current Progress |
| api-routes-352-total-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | API routes: **352 total** | Pattern 3: Test Coverage Gaps |
| directory-created-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | (directory created) | 📋 New Test Files Added |
| fm-work-orders-tests-missing-requirefmability-mock-configuration-next-steps-doc- | P2 | ? | 5 | pending | Doc-only | FM work-orders tests: Missing `requireFmAbility` mock configuration | 🔍 Test Failure Analysis |
| tests-api-fm-work-orders-test-ts-fm-ability-mocking-next-steps-test-ts | P2 | ? | 5 | unknown | .test.ts | `tests/api/fm/work-orders/*.test.ts` - FM ability mocking | Pattern 1: Test Mock Configuration |
| app-api-work-orders-id-attachments-presign-route-ts-next-steps-attachments-presi | P2 | ? | 5 | unknown | /attachments/presign/route.ts | `app/api/work-orders/[id]/attachments/presign/route.ts` | Pattern 2: API Route Error Handling |
| app-api-work-orders-id-checklists-route-ts-next-steps-checklists-route-ts | P2 | ? | 5 | unknown | /checklists/route.ts | `app/api/work-orders/[id]/checklists/route.ts` | Pattern 2: API Route Error Handling |
| app-api-work-orders-id-checklists-toggle-route-ts-next-steps-checklists-toggle-r | P2 | ? | 5 | unknown | /checklists/toggle/route.ts | `app/api/work-orders/[id]/checklists/toggle/route.ts` | Pattern 2: API Route Error Handling |
| app-api-work-orders-id-materials-route-ts-next-steps-materials-route-ts | P2 | ? | 5 | unknown | /materials/route.ts | `app/api/work-orders/[id]/materials/route.ts` | Pattern 2: API Route Error Handling |
| app-api-work-orders-export-route-ts-next-steps-app-api-work-orders-export-route- | P2 | ? | 5 | unknown | app/api/work-orders/export/route.ts | `app/api/work-orders/export/route.ts` | Pattern 2: API Route Error Handling |
| test-files-230-total-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Test Files: 230 total | Pattern 3: Test Coverage Gaps |
| coverage-ratio-65-needs-verification-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Coverage Ratio: ~65% (needs verification) | Pattern 3: Test Coverage Gaps |
| lib-sms-providers-taqnyat-ts-next-steps-lib-sms-providers-taqnyat-ts | P2 | ? | 5 | unknown | lib/sms-providers/taqnyat.ts | `lib/sms-providers/taqnyat.ts` | Pattern 3: Test Coverage Gaps |
| services-souq-pricing-auto-repricer-service-ts-next-steps-services-souq-pricing- | P2 | ? | 5 | unknown | services/souq/pricing/auto-repricer-service.ts | `services/souq/pricing/auto-repricer-service.ts` | Pattern 3: Test Coverage Gaps |
| 36-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | **36** | 📊 Issue Count Summary |
| pnpm-run-test-models-91-tests-passing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `pnpm run test:models` ✅ **91 tests passing** | ✅ All UI/UX Items Verified & Closed |
| test-files-225-total-api-unit-e2e-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Test files: **225 total** (API, unit, E2E) | 📈 Current Progress |
| api-routes-352-total-64-coverage-gap-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | API routes: **352 total** (64% coverage gap) | 📈 Current Progress |
| all-verification-gates-passing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | All verification gates passing | 📈 Current Progress |
| test-coverage-expanded-225-test-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Test coverage expanded (225 test files) | 📈 Current Progress |
| fix-create-parsebodyornull-utility-apply-to-all-routes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Fix**: Create `parseBodyOrNull()` utility, apply to all routes | Pattern 1: Uncaught JSON.parse — 66 occurrences |
| effort-4-hours-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Effort**: 4 hours | Pattern 1: Uncaught JSON.parse — 66 occurrences |
| file-server-audit-log-ts-lines-140-175-next-steps-server-audit-log-ts | P2 | ? | 5 | unknown | server/audit-log.ts | **File**: server/audit-log.ts (lines 140-175) | Pattern 3: Non-null Assertions — 9 occurrences |
| fix-add-null-guard-at-function-entry-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Fix**: Add null guard at function entry | Pattern 3: Non-null Assertions — 9 occurrences |
| app-fm-app-hr-app-crm-app-settings-app-profile-app-reports-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | app/fm/, app/hr/, app/crm/, app/settings/, app/profile/, app/reports/ | Pattern 4: Missing Error Boundaries — 6 modules |
| master-pending-report-located-and-updated-as-the-single-source-of-truth-no-dupli | P2 | ? | 5 | pending | Doc-only | Master Pending Report located and updated as the single source of truth (no duplicate files created). | 📌 Progress & Planned Next Steps |
| next-steps-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Next steps: | 1) CURRENT PROGRESS & NEXT STEPS |
| progress-scoped-review-of-otp-webhook-pm-plan-apis-to-capture-production-readine | P2 | ? | 5 | pending | Doc-only | Progress: Scoped review of OTP/webhook + PM plan APIs to capture production-readiness gaps; no code changes or commands executed in this session. | 📈 Progress & Planned Next Steps |
| bugs-logic-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Bugs/Logic: | 🚀 Enhancements / Issues (Production Readiness) |
| app-api-pm-plans-route-ts-const-body-await-request-json-post-lacks-safe-parse-sc | P2 | ? | 5 | unknown | app/api/pm/plans/route.ts | `app/api/pm/plans/route.ts::const body = await request.json();` — POST lacks safe parse + schema validation; invalid payloads surface as 500 from Mongoose. | 🚀 Enhancements / Issues (Production Readiness) |
| efficiency-services-souq-ads-auction-engine-ts-const-campaignbids-await-this-fet | P2 | ? | 5 | unknown | services/souq/ads/auction-engine.ts | Efficiency: `services/souq/ads/auction-engine.ts::const campaignBids = await this.fetchCampaignBids(` — bid fetch + quality scoring executed sequentially per campaign/bid; batch fetch bids and use capped concurrency to reduce auction latency. | 🚀 Enhancements / Issues (Production Readiness) |
| pm-plan-routes-no-coverage-found-rg-pm-plans-tests-no-matches-add-create-patch-h | P2 | ? | 5 | unknown | Doc-only | PM plan routes: no coverage found (`rg "pm/plans" tests` → no matches); add create/patch happy-path + malformed-body + auth tests. | 🚀 Enhancements / Issues (Production Readiness) |
| webhook-auth-tests-unit-lib-sms-providers-taqnyat-test-ts-covers-provider-client | P2 | ? | 5 | unknown | tests/unit/lib/sms-providers/taqnyat.test.ts | Webhook auth: `tests/unit/lib/sms-providers/taqnyat.test.ts` covers provider client only; no route-level tests for `app/api/webhooks/taqnyat/route.ts` (search `rg "webhooks/taqnyat" tests` → none). | 🚀 Enhancements / Issues (Production Readiness) |
| progress-config-resolveauthsecret-now-aliases-auth-secret-nextauth-secret-before | P2 | ? | 5 | unknown | Doc-only | Progress: Config `resolveAuthSecret()` now aliases `AUTH_SECRET → NEXTAUTH_SECRET` before validation; no additional crash paths found in auth routes/health checks/tests/scripts (all already use `NEXTAUTH_SECRET \|\| AUTH_SECRET` or throw with guidance). | Progress & Planned Next Steps |
| progress-master-report-updated-single-source-of-truth-no-duplicate-files-created | P2 | ? | 5 | unknown | Doc-only | Progress: Master report updated (single source of truth) — no duplicate files created. | Progress & Planned Next Steps |
| comments-and-documentation-references-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Comments and documentation references | 🎯 NEXT STEPS — PayTabs Cleanup Phase 2 |
| environment-variable-documentation-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Environment variable documentation | 🎯 NEXT STEPS — PayTabs Cleanup Phase 2 |
| test-file-references-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Test file references | 🎯 NEXT STEPS — PayTabs Cleanup Phase 2 |
| schema-type-definitions-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Schema/type definitions | 🎯 NEXT STEPS — PayTabs Cleanup Phase 2 |
| 32-paytabs-files-deleted-all-routes-lib-config-tests-removed-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **32 PayTabs files deleted** (all routes, lib, config, tests removed) | 1) SESSION SUMMARY |
| withdrawal-service-simplified-to-manual-bank-transfer-tap-doesn-t-support-payout | P2 | ? | 5 | unknown | Doc-only | ✅ **Withdrawal service** simplified to manual bank transfer (TAP doesn't support payouts) | 1) SESSION SUMMARY |
| subscription-model-updated-with-tap-schema-fields-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **Subscription model** updated with `tap` schema fields | 1) SESSION SUMMARY |
| all-verification-gates-pass-2-538-tests-0-typescript-errors-0-eslint-errors-next | P2 | ? | 5 | unknown | Doc-only | ✅ **All verification gates pass**: 2,538 tests, 0 TypeScript errors, 0 ESLint errors | 1) SESSION SUMMARY |
| app-api-paytabs-callback-route-ts-next-steps-app-api-paytabs-callback-route-ts | P2 | ? | 5 | unknown | app/api/paytabs/callback/route.ts | `app/api/paytabs/callback/route.ts` | Deleted Files (32 total): |
| app-api-paytabs-return-route-ts-next-steps-app-api-paytabs-return-route-ts | P2 | ? | 5 | unknown | app/api/paytabs/return/route.ts | `app/api/paytabs/return/route.ts` | Deleted Files (32 total): |
| config-paytabs-config-ts-next-steps-config-paytabs-config-ts | P2 | ? | 5 | unknown | config/paytabs.config.ts | `config/paytabs.config.ts` | 2) HIGH-002 PayTabs Investigation — RESOLVED |
| lib-finance-paytabs-subscription-ts-next-steps-lib-finance-paytabs-subscription- | P2 | ? | 5 | unknown | lib/finance/paytabs-subscription.ts | `lib/finance/paytabs-subscription.ts` | Files Removed (PayTabs cleanup) |
| lib-paytabs-ts-next-steps-lib-paytabs-ts | P2 | ? | 5 | unknown | lib/paytabs.ts | `lib/paytabs.ts` | 2) HIGH-002 PayTabs Investigation — RESOLVED |
| qa-tests-readme-paytabs-unit-tests-md-next-steps-qa-tests-readme-paytabs-unit-te | P2 | ? | 5 | unknown | qa/tests/README-paytabs-unit-tests.md | `qa/tests/README-paytabs-unit-tests.md` | Deleted Files (32 total): |
| qa-tests-lib-paytabs-spec-ts-4-files-next-steps-spec-ts | P2 | ? | 5 | unknown | .spec.ts | `qa/tests/lib-paytabs.*.spec.ts` (4 files) | Deleted Files (32 total): |
| scripts-sign-paytabs-payload-ts-next-steps-scripts-sign-paytabs-payload-ts | P2 | ? | 5 | unknown | scripts/sign-paytabs-payload.ts | `scripts/sign-paytabs-payload.ts` | Files Removed (PayTabs cleanup) |
| tests-api-lib-paytabs-test-ts-next-steps-tests-api-lib-paytabs-test-ts | P2 | ? | 5 | unknown | tests/api/lib-paytabs.test.ts | `tests/api/lib-paytabs.test.ts` | Deleted Files (32 total): |
| tests-api-paytabs-callback-test-ts-next-steps-tests-api-paytabs-callback-test-ts | P2 | ? | 5 | unknown | tests/api/paytabs-callback.test.ts | `tests/api/paytabs-callback.test.ts` | Deleted Files (32 total): |
| tests-paytabs-test-ts-next-steps-tests-paytabs-test-ts | P2 | ? | 5 | unknown | tests/paytabs.test.ts | `tests/paytabs.test.ts` | Deleted Files (32 total): |
| tests-unit-api-api-paytabs-callback-test-ts-next-steps-tests-unit-api-api-paytab | P2 | ? | 5 | unknown | tests/unit/api/api-paytabs-callback.test.ts | `tests/unit/api/api-paytabs-callback.test.ts` | Deleted Files (32 total): |
| tests-unit-api-api-paytabs-test-ts-next-steps-tests-unit-api-api-paytabs-test-ts | P2 | ? | 5 | unknown | tests/unit/api/api-paytabs.test.ts | `tests/unit/api/api-paytabs.test.ts` | Deleted Files (32 total): |
| tests-unit-lib-paytabs-payout-test-ts-next-steps-tests-unit-lib-paytabs-payout-t | P2 | ? | 5 | unknown | tests/unit/lib/paytabs-payout.test.ts | `tests/unit/lib/paytabs-payout.test.ts` | Deleted Files (32 total): |
| migrate-recurring-charge-ts-to-tap-createcharge-api-next-steps-recurring-charge- | P2 | ? | 5 | unknown | recurring-charge.ts | Migrate recurring-charge.ts to TAP createCharge() API | 4) COMMIT COMMAND |
| update-subscription-model-with-tap-schema-fields-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Update Subscription model with tap schema fields | 4) COMMIT COMMAND |
| simplify-withdrawal-service-ts-manual-only-tap-no-payouts-next-steps-withdrawal- | P2 | ? | 5 | unknown | withdrawal-service.ts | Simplify withdrawal-service.ts (manual only, TAP no payouts) | 4) COMMIT COMMAND |
| all-2-538-tests-pass-0-typescript-eslint-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | All 2,538 tests pass, 0 TypeScript/ESLint errors | 4) COMMIT COMMAND |
| commit-and-push-all-changes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Commit and push all changes | 5) PLANNED NEXT STEPS |
| deploy-to-production-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Deploy to production | 7) CURRENT PROGRESS & NEXT STEPS |
| verify-no-configurationerror-in-console-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Verify no ConfigurationError in console | 5) PLANNED NEXT STEPS |
| configure-paytabs-production-keys-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Configure PayTabs production keys | 3) PLANNED NEXT STEPS |
| line-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Line | A) TODO/FIXME Inventory (41 total) |
| 328-routes-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ~328 routes | B) Test Coverage Analysis |
| app-api-souq-orders-e-commerce-orders-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `app/api/souq/orders/*` — E-commerce orders | B) Test Coverage Analysis |
| app-api-admin-admin-operations-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `app/api/admin/*` — Admin operations | B) Test Coverage Analysis |
| app-api-onboarding-user-onboarding-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `app/api/onboarding/*` — User onboarding | B) Test Coverage Analysis |
| 117-next-steps-app-api-copilot-chat-route-ts | P2 | ? | 5 | pending | app/api/copilot/chat/route.ts | 117 | D) JSON.parse Safety Audit |
| 72-next-steps-app-api-projects-route-ts | P2 | ? | 5 | pending | app/api/projects/route.ts | 72 | D) JSON.parse Safety Audit |
| update-interfaces-types-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Update interfaces/types | Pattern A: Incomplete Migrations |
| feature-flag-for-gradual-rollout-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Feature flag for gradual rollout | Pattern A: Incomplete Migrations |
| remove-old-code-last-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Remove old code LAST | Pattern A: Incomplete Migrations |
| locations-3-api-routes-missing-try-catch-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | **Locations**: 3 API routes missing try-catch | Pattern B: JSON.parse Without Error Handling |
| utility-available-lib-api-parse-body-ts-created-earlier-next-steps-lib-api-parse | P2 | ? | 5 | unknown | lib/api/parse-body.ts | **Utility Available**: `lib/api/parse-body.ts` (created earlier) | Pattern B: JSON.parse Without Error Handling |
| action-routes-should-use-parsebody-utility-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Action**: Routes should use `parseBody()` utility | Pattern B: JSON.parse Without Error Handling |
| locations-10-form-submission-pages-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Locations**: 10+ form submission pages | Pattern C: .catch(() => ({})) Pattern |
| status-intentional-graceful-degradation-for-error-messages-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Status**: ✅ INTENTIONAL - graceful degradation for error messages | Pattern C: .catch(() => ({})) Pattern |
| no-action-needed-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **No Action Needed** | Pattern C: .catch(() => ({})) Pattern |
| x-typescript-0-errors-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] TypeScript: 0 errors | 7) PRODUCTION READINESS CHECKLIST |
| x-unit-tests-2-594-passing-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] Unit tests: 2,594 passing | 7) PRODUCTION READINESS CHECKLIST |
| x-innerhtml-all-properly-sanitized-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] innerHTML: All properly sanitized | 7) PRODUCTION READINESS CHECKLIST |
| x-paytabs-files-restored-working-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | [x] PayTabs: Files restored, working | 7) PRODUCTION READINESS CHECKLIST |
| paytabs-production-keys-user-action-required-next-steps-doc-only | P2 | ? | 5 | blocked | Doc-only | [ ] PayTabs production keys: User action required | 7) PRODUCTION READINESS CHECKLIST |
| e2e-tests-on-staging-devops-action-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] E2E tests on staging: DevOps action | 7) PRODUCTION READINESS CHECKLIST |
| reverted-21-deleted-paytabs-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Reverted 21 deleted PayTabs files | 8) SESSION SUMMARY |
| reverted-6-modified-job-service-files-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Reverted 6 modified job/service files | 8) SESSION SUMMARY |
| deep-dive-codebase-analysis-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Deep-dive codebase analysis | 8) SESSION SUMMARY |
| identified-41-todos-none-critical-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Identified 41 TODOs (none critical) | 8) SESSION SUMMARY |
| updated-pending-master-to-v15-8-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Updated PENDING_MASTER to v15.8 | 8) SESSION SUMMARY |
| only-user-action-remaining-paytabs-env-config-next-steps-doc-only | P2 | ? | 5 | blocked | Doc-only | Only user action remaining: PayTabs env config | 8) SESSION SUMMARY |
| verify-in-production-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Verify in production | 7) CURRENT PROGRESS & NEXT STEPS |
| app-api-paytabs-legacy-api-routes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `app/api/paytabs/*` - Legacy API routes | Files Removed (PayTabs cleanup) |
| tests-paytabs-all-paytabs-tests-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `tests/*paytabs*` - All PayTabs tests | Files Removed (PayTabs cleanup) |
| paytabs-profile-id-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `PAYTABS_PROFILE_ID` | Environment Variables |
| paytabs-server-key-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `PAYTABS_SERVER_KEY` | Environment Variables |
| paytabs-base-url-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `PAYTABS_BASE_URL` | Environment Variables |
| tap-secret-key-tap-api-secret-key-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | `TAP_SECRET_KEY` - TAP API secret key | Environment Variables |
| other-tap-configuration-as-per-lib-tapconfig-ts-next-steps-lib-tapconfig-ts | P2 | ? | 5 | unknown | lib/tapConfig.ts | Other TAP configuration as per `lib/tapConfig.ts` | Environment Variables |
| all-app-tsx-with-use-client-directive-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | All `app/**/*.tsx` with `"use client"` directive | 4) DEEP-DIVE: SIMILAR ISSUES FOUND |
| cross-referenced-with-imports-of-lib-config-constants-and-lib-logger-next-steps- | P2 | ? | 5 | unknown | Doc-only | Cross-referenced with imports of `@/lib/config/constants` and `@/lib/logger` | 4) DEEP-DIVE: SIMILAR ISSUES FOUND |
| never-import-lib-config-constants-in-client-components-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Never import `@/lib/config/constants` in client components | 4) DEEP-DIVE: SIMILAR ISSUES FOUND |
| use-next-public-environment-variables-for-client-side-access-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Use `NEXT_PUBLIC_*` environment variables for client-side access | 4) DEEP-DIVE: SIMILAR ISSUES FOUND |
| never-import-lib-logger-in-client-components-use-console-error-with-eslint-disab | P2 | ? | 5 | unknown | Doc-only | Never import `@/lib/logger` in client components (use `console.error` with eslint-disable comment) | 4) DEEP-DIVE: SIMILAR ISSUES FOUND |
| slow-unstable-internet-connection-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Slow/unstable internet connection | 5) NETWORK TIMEOUT ERROR (SEPARATE ISSUE) |
| firewall-blocking-requests-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Firewall blocking requests | 5) NETWORK TIMEOUT ERROR (SEPARATE ISSUE) |
| server-timeout-on-long-running-requests-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Server timeout on long-running requests | 5) NETWORK TIMEOUT ERROR (SEPARATE ISSUE) |
| internet-connection-stability-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Internet connection stability | 5) NETWORK TIMEOUT ERROR (SEPARATE ISSUE) |
| firewall-proxy-settings-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Firewall/proxy settings | 5) NETWORK TIMEOUT ERROR (SEPARATE ISSUE) |
| vpn-if-using-one-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | VPN if using one | 5) NETWORK TIMEOUT ERROR (SEPARATE ISSUE) |
| set-a-32-character-nextauth-secret-or-auth-secret-in-all-environments-to-remove- | P2 | ? | 5 | unknown | Doc-only | Set a 32+ character `NEXTAUTH_SECRET` (or `AUTH_SECRET`) in all environments to remove runtime warnings and align JWT/session signing across routes. | 1) CURRENT PROGRESS & NEXT STEPS |
| run-pnpm-typecheck-pnpm-lint-pnpm-test-to-validate-the-config-change-end-to-end- | P2 | ? | 5 | unknown | Doc-only | Run `pnpm typecheck && pnpm lint && pnpm test` to validate the config change end-to-end. | 1) CURRENT PROGRESS & NEXT STEPS |
| confirm-api-health-auth-returns-healthy-status-after-secrets-are-set-verifies-ve | P2 | ? | 5 | unknown | Doc-only | Confirm `/api/health/auth` returns healthy status after secrets are set (verifies Vercel/production parity). | 1) CURRENT PROGRESS & NEXT STEPS |
| reviewed-all-nextauth-secret-touchpoints-auth-config-ts-app-api-auth-routes-test | P2 | ? | 5 | unknown | auth.config.ts | Reviewed all NEXTAUTH_SECRET touchpoints (`auth.config.ts`, `app/api/auth/*` routes, `tests/setup.ts`, `scripts/check-e2e-env.js`, health check endpoints): all already support AUTH_SECRET fallback or emit actionable errors. | 3) DEEP-DIVE: SIMILAR PATTERNS & SINGLE SOURCE UPDATE |
| production-alignment-ensure-nextauth-secret-and-auth-secret-values-match-across- | P2 | ? | 5 | unknown | Doc-only | Production alignment: ensure NEXTAUTH_SECRET and AUTH_SECRET values match across Vercel/preview/local to avoid JWT/signature mismatches between Config consumers and direct env access. | 3) DEEP-DIVE: SIMILAR PATTERNS & SINGLE SOURCE UPDATE |
| full-codebase-scan-for-todos-fixmes-hacks-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Full codebase scan for TODOs, FIXMEs, HACKs | 1) CURRENT PROGRESS |
| empty-catch-block-analysis-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Empty catch block analysis | 1) CURRENT PROGRESS |
| typescript-escape-pattern-review-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ TypeScript escape pattern review | 1) CURRENT PROGRESS |
| eslint-disable-pattern-audit-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ ESLint disable pattern audit | 1) CURRENT PROGRESS |
| api-test-coverage-assessment-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ API test coverage assessment | 1) CURRENT PROGRESS |
| json-parse-safety-audit-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ JSON.parse safety audit | 1) CURRENT PROGRESS |
| created-tests-api-hr-employees-route-test-ts-20-tests-next-steps-tests-api-hr-em | P2 | ? | 5 | unknown | tests/api/hr/employees.route.test.ts | ✅ Created `tests/api/hr/employees.route.test.ts` (20 tests) | Test Coverage (Priority: HIGH) |
| created-tests-api-hr-leaves-route-test-ts-18-tests-next-steps-tests-api-hr-leave | P2 | ? | 5 | unknown | tests/api/hr/leaves.route.test.ts | ✅ Created `tests/api/hr/leaves.route.test.ts` (18 tests) | Test Coverage (Priority: HIGH) |
| created-tests-api-hr-payroll-runs-route-test-ts-15-tests-next-steps-tests-api-hr | P2 | ? | 5 | unknown | tests/api/hr/payroll-runs.route.test.ts | ✅ Created `tests/api/hr/payroll-runs.route.test.ts` (15 tests) | Test Coverage (Priority: HIGH) |
| created-tests-api-souq-orders-route-test-ts-15-tests-next-steps-tests-api-souq-o | P2 | ? | 5 | unknown | tests/api/souq/orders.route.test.ts | ✅ Created `tests/api/souq/orders.route.test.ts` (15 tests) | Test Coverage (Priority: HIGH) |
| created-tests-api-onboarding-cases-route-test-ts-13-tests-next-steps-tests-api-o | P2 | ? | 5 | unknown | tests/api/onboarding/cases.route.test.ts | ✅ Created `tests/api/onboarding/cases.route.test.ts` (13 tests) | Test Coverage (Priority: HIGH) |
| immediate-this-session-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Immediate** (This Session): | 7) PLANNED NEXT STEPS |
| commit-and-push-changes-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ⏳ Commit and push changes | 7) PLANNED NEXT STEPS |
| short-term-next-session-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Short-term** (Next Session): | 7) PLANNED NEXT STEPS |
| add-test-fixtures-for-order-management-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Add test fixtures for order management | 7) PLANNED NEXT STEPS |
| medium-term-future-sessions-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Medium-term** (Future Sessions): | 7) PLANNED NEXT STEPS |
| achieve-50-api-test-coverage-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Achieve 50% API test coverage | 7) PLANNED NEXT STEPS |
| automate-test-coverage-reporting-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | Automate test coverage reporting | 7) PLANNED NEXT STEPS |
| dangerouslysetinnerhtml-10-instances-all-safe-rehype-sanitize-next-steps-doc-onl | P2 | ? | 5 | unknown | Doc-only | ✅ **dangerouslySetInnerHTML**: 10 instances, ALL SAFE (rehype-sanitize) | 8) SESSION SUMMARY |
| typescript-escapes-1-instance-justified-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **TypeScript escapes**: 1 instance, JUSTIFIED | 8) SESSION SUMMARY |
| eslint-disables-20-instances-all-documented-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **ESLint disables**: 20+ instances, ALL DOCUMENTED | 8) SESSION SUMMARY |
| console-statements-1-production-instance-required-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **Console statements**: 1 production instance, REQUIRED | 8) SESSION SUMMARY |
| empty-catches-12-instances-all-in-ci-scripts-tests-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ **Empty catches**: 12 instances, ALL in CI/scripts/tests | 8) SESSION SUMMARY |
| api-test-coverage-6-4-23-357-routes-needs-improvement-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ⚠️ **API test coverage**: 6.4% (23/357 routes) — NEEDS IMPROVEMENT | 8) SESSION SUMMARY |
| no-unhandled-code-patterns-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | No unhandled code patterns | 8) SESSION SUMMARY |
| test-coverage-gap-identified-but-not-blocking-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Test coverage gap identified but not blocking | 8) SESSION SUMMARY |
| sync-overhead-splitting-would-create-multiple-files-to-keep-synchronized-next-st | P2 | ? | 5 | unknown | Doc-only | **Sync Overhead**: Splitting would create multiple files to keep synchronized | 2) DOC-001: Split PENDING_MASTER.md — ✅ **NOT NEEDED** |
| searchability-one-file-one-search-location-for-any-issue-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Searchability**: One file = one search location for any issue | 2) DOC-001: Split PENDING_MASTER.md — ✅ **NOT NEEDED** |
| historical-context-sessions-are-chronologically-ordered-splitting-loses-context- | P2 | ? | 5 | unknown | Doc-only | **Historical Context**: Sessions are chronologically ordered, splitting loses context | 2) DOC-001: Split PENDING_MASTER.md — ✅ **NOT NEEDED** |
| devops-dba-3-mongodb-index-staging-e2e-lighthouse-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **DevOps/DBA**: 3 (MongoDB index, staging E2E, Lighthouse) | 5) SESSION SUMMARY |
| agent-tasks-0-remaining-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **Agent Tasks**: 0 remaining | 5) SESSION SUMMARY |
| UI-001 | P2 | ? | 5 | unknown | Doc-only | ✅ UI-001: Phone placeholders are intentional (not bugs) | 5) SESSION SUMMARY |
| ERR-016 | P2 | ? | 5 | pending | lib/api/parse-body.ts | ERR-016 | 1) VERIFICATION SUMMARY |
| replaced-stubs-with-db-backed-resolvers-auth-context-me-work-orders-list-detail- | P2 | ? | 5 | unknown | Doc-only | Replaced stubs with DB-backed resolvers (auth context, `me`, work orders list/detail, dashboard stats, creation) | Pattern B: GraphQL TODOs (resolved in `lib/graphql/index.ts`) |
| guarded-by-feature-integrations-graphql-api-false-unless-explicitly-enabled-next | P2 | ? | 5 | unknown | Doc-only | Guarded by `FEATURE_INTEGRATIONS_GRAPHQL_API=false` unless explicitly enabled | Pattern B: GraphQL TODOs (resolved in `lib/graphql/index.ts`) |
| 3-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 3 | 3) COMPREHENSIVE CODEBASE ANALYSIS RESULTS |
| 22-high-json-parse-error-handling-fetch-error-boundaries-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | **22 High**: JSON.parse error handling, fetch error boundaries | Code Quality Backlog |
| 39-medium-utility-function-extraction-pattern-standardization-next-steps-doc-onl | P2 | ? | 5 | unknown | Doc-only | **39 Medium**: Utility function extraction, pattern standardization | Code Quality Backlog |
| typescript-0-errors-confirmed-via-task-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ TypeScript: 0 errors (confirmed via task) | 8) SESSION SUMMARY |
| eslint-0-errors-confirmed-via-task-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ ESLint: 0 errors (confirmed via task) | 8) SESSION SUMMARY |
| git-clean-on-main-up-to-date-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Git: Clean on main, up to date | 8) SESSION SUMMARY |
| open-prs-0-all-processed-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Open PRs: 0 (all processed) | 8) SESSION SUMMARY |
| console-statements-1-justified-error-boundary-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Console statements: 1 justified (error boundary) | 8) SESSION SUMMARY |
| empty-catches-20-all-intentional-graceful-degradation-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ Empty catches: 20+ all intentional (graceful degradation) | 8) SESSION SUMMARY |
| typescript-escapes-4-production-documented-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ TypeScript escapes: 4 production (documented) | 8) SESSION SUMMARY |
| eslint-disable-2-both-justified-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ eslint-disable: 2 (both justified) | 8) SESSION SUMMARY |
| dangerouslysetinnerhtml-10-uses-all-sanitized-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | ✅ dangerouslySetInnerHTML: 10 uses, all sanitized | 8) SESSION SUMMARY |
| all-verification-gates-pass-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | All verification gates pass | 8) SESSION SUMMARY |
| no-blocking-issues-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | No blocking issues | 8) SESSION SUMMARY |
| 87-code-quality-items-identified-for-backlog-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | 87 code quality items identified for backlog | 8) SESSION SUMMARY |
| push-topbar-fix-to-main-next-steps-doc-only | P2 | ? | 5 | in_progress | Doc-only | Push TopBar fix to main | 4) PLANNED NEXT STEPS |
| verify-vercel-deployment-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Verify Vercel deployment | 4) PLANNED NEXT STEPS |
| run-e2e-tests-on-staging-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Run E2E tests on staging | 2) PLANNED NEXT STEPS |
| dbb3729-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | dbb3729 | 5) AFFECTED VERCEL DEPLOYMENTS |
| 22a175c-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 22a175c | 5) AFFECTED VERCEL DEPLOYMENTS |
| c08fc87-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | c08fc87 | 5) AFFECTED VERCEL DEPLOYMENTS |
| 8-remaining-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | 8 remaining | 1) CURRENT PROGRESS |
| lighthouse-performance-check-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | Lighthouse performance check | 2) PLANNED NEXT STEPS |
| app-work-orders-sla-watchlist-page-tsx-13-missing-error-handling-next-steps-app- | P2 | ? | 5 | pending | app/work-orders/sla-watchlist/page.ts | `app/work-orders/sla-watchlist/page.tsx:13` - Missing error handling | Pattern A: Promise Chains Without Error Handling (52 occurrences) |
| app-app-subscription-page-tsx-34-36-chain-without-catch-next-steps-subscription- | P2 | ? | 5 | unknown | /subscription/page.ts | `app/(app)/subscription/page.tsx:34-36` - Chain without catch | Pattern A: Promise Chains Without Error Handling (52 occurrences) |
| recorded-no-exec-constraint-acknowledgement-tests-installs-not-run-next-steps-do | P2 | ? | 5 | unknown | Doc-only | Recorded no-exec constraint acknowledgement; tests/installs not run. | 📈 Progress & Planned Next Steps |
| lockfile-sql-prisma-instrumentation-lines-pruned-pending-fresh-install-to-regene | P2 | ? | 5 | pending | Doc-only | Lockfile SQL/Prisma instrumentation lines pruned; pending fresh install to regenerate clean lock. | 📈 Progress & Planned Next Steps |
| bugs-prevent-malformed-body-500s-by-completing-safe-parser-rollout-on-remaining- | P2 | ? | 5 | unknown | Doc-only | **Bugs:** Prevent malformed-body 500s by completing safe parser rollout on remaining finance/HR routes. | 🧩 Enhancements (Prod Readiness) |
| typecheck-not-run-today-lint-not-run-today-tests-full-suite-next-steps-doc-only | P2 | ? | 5 | pending | Doc-only | typecheck ⏳ not run today; lint ⏳ not run today; tests ✅ full suite | 📍 Current Progress & Planned Next Steps |
| next-steps-run-pnpm-typecheck-pnpm-lint-to-clear-gates-rerun-playwright-smoke-if | P2 | ? | 5 | unknown | Doc-only | Next steps: Run `pnpm typecheck && pnpm lint` to clear gates; rerun Playwright smoke if still required by release process; keep org-scoped key validation consistent with presign outputs in any new upload routes. | 📍 Current Progress & Planned Next Steps |
| typecheck-not-run-today-lint-not-run-today-tests-targeted-suites-next-steps-doc- | P2 | ? | 5 | pending | Doc-only | typecheck ⏳ not run today; lint ⏳ not run today; tests ✅ targeted suites | 📍 Current Progress & Planned Next Steps |
| typecheck-lint-unit-test-models-playwright-e2e-skipped-via-skip-playwright-true- | P2 | ? | 5 | pending | Doc-only | typecheck ✅; lint ✅; unit ✅; test:models ✅; Playwright e2e ⏭️ Skipped via SKIP_PLAYWRIGHT=true | 📍 Current Progress & Planned Next Steps |
| smoke-timeouts-indicate-dev-server-or-selector-waits-not-completing-needs-stabil | P2 | ? | 5 | pending | Doc-only | Smoke timeouts indicate dev-server or selector waits not completing; needs stabilization before pipeline run. | 🛠️ Enhancements Needed (Production Readiness) |
| dashboard-rtl-smoke-expects-arabic-headings-only-system-finance-hr-are-covered-o | P2 | ? | 5 | unknown | Doc-only | Dashboard RTL smoke expects Arabic headings; only system/finance/HR are covered—other dashboards likely still English under Playwright, causing intermittent failures. | 🛠️ Enhancements Needed (Production Readiness) |
| add-regression-smoke-unit-assertions-for-playwright-header-dashboard-link-and-pd | P2 | ? | 5 | unknown | Doc-only | Add regression smoke/unit assertions for Playwright header Dashboard link and PDP stub href; add test ensuring SupportOrg Playwright stub returns safe defaults. | 🛠️ Enhancements Needed (Production Readiness) |
| dashboard-heading-parity-finance-hr-system-now-use-arabic-under-flag-remaining-d | P2 | ? | 5 | unknown | Doc-only | Dashboard heading parity: finance/HR/system now use Arabic under flag; remaining `/dashboard/**` pages likely still English, mirroring earlier RTL failures. Apply the same conditional heading pattern to avoid selector drift. | 🔎 Deep-Dive Analysis (Similar/Repeated Issues) |
| backlog-import-sync-requires-running-api-to-post-api-issues-import-next-steps-do | P2 | ? | 5 | unknown | Doc-only | Backlog import/sync — requires running API to POST /api/issues/import | 2025-12-16 15:08 (Asia/Riyadh) — Code Review Update |
| start-api-and-re-run-api-issues-import-to-record-latest-currently-empty-backlog- | P2 | ? | 5 | unknown | Doc-only | Start API and re-run /api/issues/import to record latest (currently empty) backlog extraction. | 2025-12-16 15:08 (Asia/Riyadh) — Code Review Update |
| db-import-failed-localhost-3000-api-issues-import-unreachable-next-steps-doc-onl | P2 | ? | 5 | unknown | Doc-only | DB import failed — localhost:3000/api/issues/import unreachable | 2025-12-21 13:41 (Asia/Riyadh) — Code Review Update |
| fixzit-agent-assignments-json-scope-expansion-lock-update-next-steps-fixzit-agen | P2 | ? | 5 | unknown | .fixzit/agent-assignments.js | .fixzit/agent-assignments.json � scope expansion lock update | 2025-12-29 14:34 (Asia/Riyadh) � Code Review Update [AGENT-003-A] |
| backlog-audit-md-regenerated-audit-report-next-steps-backlog-audit-md | P2 | ? | 5 | unknown | BACKLOG_AUDIT.md | BACKLOG_AUDIT.md � regenerated audit report | 2025-12-29 14:34 (Asia/Riyadh) � Code Review Update [AGENT-003-A] |
| curl-exe-s-http-localhost-3000-api-issues-stats-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | curl.exe -s http://localhost:3000/api/issues/stats | 2025-12-29 14:34 (Asia/Riyadh) � Code Review Update [AGENT-003-A] |
| pnpm-test-failed-wsl-not-installed-for-playwright-e2e-next-steps-doc-only | P2 | ? | 5 | unknown | Doc-only | pnpm test (FAILED: WSL not installed for playwright e2e) | 2025-12-29 14:35 (Asia/Riyadh) � Verification Addendum [AGENT-003-A] |
| CR-2025 | P2 | ? | 5 | unknown | app/superadmin/jobs/page.tsx:111-112 | CR-2025-12-29-001 � Superadmin jobs page swallows fetch/process errors without logging context � sourceRef: code-review:app/superadmin/jobs/page.tsx:111-112 | 2025-12-29 14:49 (Asia/Riyadh) � Code Review Update [AGENT-003-A] |
| add-zod-validation-to-remaining-191-routes-8h-next-steps-doc-only | P2 | M | 5 | pending | Doc-only | [ ] **Add Zod validation to remaining 191 routes** - 8h | P2 — Medium Priority (Next week) |
| fm-tests-17-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | FM tests (+17) | 📋 Updated Action Plan |
| add-rate-limiting-to-assets-cms-others-90-routes-4h-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [ ] **Add rate limiting to Assets, CMS, Others** (90 routes) - 4h | P2 — Medium Priority (Next week) |
| add-api-tests-for-assets-cms-6-tests-2h-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [ ] **Add API tests for Assets & CMS** (6 tests) - 2h | P2 — Medium Priority (Next week) |
| query-optimization-identify-and-fix-n-1-queries-3h-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [ ] **Query optimization**: Identify and fix N+1 queries - 3h | P2 — Medium Priority (Next week) |
| performance-monitoring-add-apm-spans-to-critical-paths-2h-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [ ] **Performance monitoring**: Add APM spans to critical paths - 2h | P2 — Medium Priority (Next week) |
| e3-centralize-session-guard-helper-2h-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [ ] **E3**: Centralize session guard helper - 2h | P3 — Nice to Have |
| o1-generate-openapi-specs-for-all-routes-4h-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [ ] **O1**: Generate OpenAPI specs for all routes - 4h | P3 — Nice to Have |
| o2-add-sentry-apm-spans-3h-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [ ] **O2**: Add Sentry APM spans - 3h | P3 — Nice to Have |
| o3-request-id-correlation-2h-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [ ] **O3**: Request ID correlation - 2h | P3 — Nice to Have |
| o4-comprehensive-audit-logging-4h-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [ ] **O4**: Comprehensive audit logging - 4h | P3 — Nice to Have |
| add-graphql-resolver-tests-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | Add GraphQL resolver tests | 🟡 Remaining (P2) |
| VAL-001 | P2 | S | 5 | pending | Doc-only | Input Validation | Medium Priority (P2) |
| wip-update-pending-master-v17-0-next-steps-doc-only | P2 | S | 5 | pending | Doc-only | [WIP] Update PENDING_MASTER v17.0 | 2. Open PRs Cleanup (6 stale PRs) |
| obs-db-mongodb-index-audit-2h-dba-next-steps-doc-only | P2 | S | 5 | unknown | Doc-only | 🔄 OBS-DB: MongoDB index audit (2h, DBA) | 5) SESSION SUMMARY |
| e4-create-shared-rate-limit-helper-with-decorators-1h-next-steps-doc-only | P2 | XS | 5 | pending | Doc-only | [ ] **E4**: Create shared rate limit helper with decorators - 1h | P3 — Nice to Have |
| scripts-cleanup-test-users-ts-test-org-id-env-var-support-next-steps-scripts-cle | P3 | ? | 5 | unknown | scripts/cleanup-test-users.ts | `scripts/cleanup-test-users.ts` — TEST_ORG_ID env var support | 📁 Files Modified (8 files) |
| p3-clean-up-nested-project-folders-fixzit-fixzit-fresh-fixzit-tenant-next-steps- | P3 | ? | 5 | unknown | Doc-only | **P3**: Clean up nested project folders (Fixzit/, Fixzit-fresh/, Fixzit-tenant/) | 2025-12-23 12:00 (Asia/Riyadh) — File Migration Verification & TypeScript Fixes |
| coverage-gap-existing-billing-tests-cover-subscribe-upgrade-history-only-finance | P3 | ? | 4 | pending | Doc-only | **Coverage gap**: Existing billing tests cover subscribe/upgrade/history only. Finance coverage is limited to payments/invoices happy paths; no tests for quote, Tap checkout, accounts/expenses/journals, or JSON-error/unauth flows. Add route tests before refactors to lock behavior. | 🔍 Deep-Dive: Similar/Identical Issues |
| coderabbit-toast-docs-nitpick-non-blocking-next-steps-doc-only | P3 | ? | 3 | unknown | Doc-only | CodeRabbit Toast docs: **Nitpick** (non-blocking) | 📝 CI Investigation (2025-12-24 02:20) |
| configure-otp-env-var-or-disable-bypass-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Configure OTP env var or disable bypass | 🎯 Recommended Next Steps |
| coverage-001-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | COVERAGE-001 | 🐛 Identified Issues (Prioritized) |
| committed-12-commits-utility-files-tests-api-fixes-services-docs-next-steps-doc- | P3 | ? | 3 | unknown | Doc-only | ✅ Committed 12 commits (utility files, tests, API fixes, services, docs) | 📍 Current Progress & Planned Next Steps |
| pushed-all-commits-to-docs-pending-v60-head-d8aa6a892-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | ✅ Pushed all commits to `docs/pending-v60` (HEAD: `d8aa6a892`) | 📍 Current Progress & Planned Next Steps |
| not-run-docs-only-update-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Not run (docs-only update) | 📍 Current Progress & Planned Next Steps |
| docs-pending-v59-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | `docs/pending-v59` | 📍 Current Progress Summary |
| admin-route-metrics-page-tsx-useeffect-cleanup-next-steps-admin-route-metrics-pa | P3 | ? | 3 | unknown | admin/route-metrics/page.ts | `admin/route-metrics/page.tsx` - useEffect cleanup ✅ | Pattern 3: Memory Management |
| dashboard-hr-recruitment-page-tsx-useeffect-cleanup-next-steps-dashboard-hr-recr | P3 | ? | 3 | unknown | dashboard/hr/recruitment/page.ts | `dashboard/hr/recruitment/page.tsx` - useEffect cleanup ✅ | Pattern 3: Memory Management |
| components-slatimer-tsx-return-cleanup-next-steps-components-slatimer-ts | P3 | ? | 3 | unknown | components/SLATimer.ts | `components/SLATimer.tsx` - return cleanup ✅ | Pattern 3: Memory Management |
| components-fm-workorderattachments-tsx-useeffect-cleanup-next-steps-components-f | P3 | ? | 3 | unknown | components/fm/WorkOrderAttachments.ts | `components/fm/WorkOrderAttachments.tsx` - useEffect cleanup ✅ | Pattern 3: Memory Management |
| components-admin-sms-providerhealthdashboard-tsx-useeffect-cleanup-next-steps-co | P3 | ? | 3 | unknown | components/admin/sms/ProviderHealthDashboard.ts | `components/admin/sms/ProviderHealthDashboard.tsx` - useEffect cleanup ✅ | Pattern 3: Memory Management |
| components-careers-jobapplicationform-tsx-useeffect-cleanup-next-steps-component | P3 | ? | 3 | unknown | components/careers/JobApplicationForm.ts | `components/careers/JobApplicationForm.tsx` - useEffect cleanup ✅ | Pattern 3: Memory Management |
| x-memory-safety-all-intervals-have-cleanup-next-steps-doc-only | P3 | ? | 3 | unknown | Doc-only | [x] Memory Safety: All intervals have cleanup | ✅ Verification Gates (v58.0) |
| ran-repo-wide-rg-n-hardcod-sweep-across-app-lib-scripts-docs-to-re-confirm-remai | P3 | ? | 3 | unknown | Doc-only | Ran repo-wide `rg -n "hardcod"` sweep across app/lib/scripts/docs to re-confirm remaining hardcoded risks; no new code changes applied. | 📍 Current Progress & Next Steps |
| PR-001 | P3 | ? | 3 | pending | Doc-only | Stale PRs | Low Priority (P3) - Technical Debt |
| unknown-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Unknown | 📍 Current Progress Summary |
| p3-add-rate-limiting-to-remaining-modules-marketplace-copilot-ats-next-steps-doc | P3 | ? | 3 | unknown | Doc-only | **P3**: Add rate limiting to remaining modules (marketplace, copilot, ats) | 📋 Next Steps (Priority Order) |
| app-docs-error-tsx-next-steps-app-docs-error-ts | P3 | ? | 3 | unknown | app/docs/error.ts | `app/docs/error.tsx` | Previous Session (v36.0) |
| review-29-todo-fixme-comments-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Review 29 TODO/FIXME comments | 🔲 Planned Next Steps |
| error-boundaries-for-subpages-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Error boundaries for subpages | 🔲 Planned Next Steps |
| remaining-service-tests-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Remaining service tests | 🔲 Planned Next Steps |
| system-wide-scan-docs-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | System-wide scan docs | 🔲 Stale PRs to Close |
| add-tests-for-6-services-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Add tests for 6 services | 📋 PLANNED NEXT STEPS |
| expand-rate-limiting-to-60-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Expand rate limiting to 60% | 📋 PLANNED NEXT STEPS |
| add-error-boundaries-8-dirs-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Add error boundaries (+8 dirs) | 📋 PLANNED NEXT STEPS |
| remove-7-todo-comments-in-lib-graphql-next-steps-doc-only | P3 | ? | 3 | pending | Doc-only | Remove 7 TODO comments in lib/graphql | 📋 Planned Next Steps |
| impact-reintroduces-forbidden-sql-prisma-stack-violates-kill-on-sight-policy-and | P3 | ? | 3 | unknown | Doc-only | **Impact:** Reintroduces forbidden SQL/Prisma stack; violates kill-on-sight policy and contradicts prior cleanup claims. | 🔴 Stack/Architecture Violations |
| PR-537 | P3 | ? | 3 | pending | Doc-only | **PR-537** | 🔴 REQUIRED — Blocking Items |
| docs-inventory-paytabs-duplicates-md-next-steps-docs-inventory-paytabs-duplicate | P3 | ? | 3 | unknown | docs/inventory/paytabs-duplicates.md | `docs/inventory/paytabs-duplicates.md` | Files Removed (PayTabs cleanup) |
| delete-32-paytabs-files-lib-config-routes-tests-scripts-docs-next-steps-doc-only | P3 | ? | 3 | unknown | Doc-only | Delete 32 PayTabs files (lib, config, routes, tests, scripts, docs) | 4) COMMIT COMMAND |
| 18-low-documentation-minor-refactoring-next-steps-doc-only | P3 | ? | 3 | unknown | Doc-only | **18 Low**: Documentation, minor refactoring | Code Quality Backlog |
| docs-pending-v18-0-next-steps-doc-only | P3 | M | 3 | pending | Doc-only | docs(pending): v18.0 | 2. Open PRs Cleanup (6 stale PRs) |
| docs-pending-v17-0-next-steps-doc-only | P3 | M | 3 | pending | Doc-only | docs(pending): v17.0 | 2. Open PRs Cleanup (6 stale PRs) |

## Missing Tests
| Key | Priority | Effort | Impact | Status | Location | Title | SourceRef |
| --- | --- | --- | --- | --- | --- | --- | --- |
| coderabbit-missing-tests-server-security-health-token-ts-25 | P0 | ? | 10 | pending | server/security/health-token.ts:25 | CodeRabbit | 2025-12-15 18:45 (Asia/Riyadh) — PR Batch Processing Complete + Review Analysis |
| EFF-004 | P0 | ? | 10 | pending | docs/PENDING_MASTER.md:75 | EFF-004 — PM routes rate limiting — sourceRef: docs/PENDING_MASTER.md:75 | A) EFFICIENCY IMPROVEMENTS |
| graphql-todo-stubs-missing-tests-lib-graphql-index-ts | P0 | ? | 10 | pending | lib/graphql/index.ts | **GraphQL TODO stubs** | Pattern 1: User-ID as OrgId Fallback (5 locations) |
| scanned-package-json-pnpm-lock-yaml-docs-categorized-tasks-list-md-docs-pending- | P0 | ? | 10 | pending | package.js | Scanned: `package.json`, `pnpm-lock.yaml`, `docs/CATEGORIZED_TASKS_LIST.md`, `docs/PENDING_MASTER.md`, RBAC enums/guards (`types/user.ts`, `lib/auth/role-guards.ts`), FM data scope (`domain/fm/fm.behavior.ts`), HR payroll route, finance/HR API routes. | ✅ SESSION 2025-12-11T00:00 COMPLETED FIXES (Batch 4) |
| add-tests-ensuring-budgets-crud-rejects-requests-without-orgid-role-missing-test | P0 | ? | 10 | pending | Doc-only | Add tests ensuring budgets CRUD rejects requests without orgId/role. | Missing Tests |
| token-based-polling-is-now-per-tenant-environments-must-supply-either-a-json-map | P0 | ? | 10 | pending | Doc-only | Token-based polling is now per-tenant; environments must supply either a JSON map (`SCAN_STATUS_TOKENS_BY_ORG`) or org+token pair. Missing/mismatched tokens return 401, blocking cross-tenant leakage. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| rbac-119-352-routes-34-missing-tests-doc-only | P0 | ? | 9 | pending | Doc-only | [ ] RBAC: 119/352 routes (34%) | ✅ QA Gate Checklist |
| unit-integration-tests-for-override-vs-base-config-across-returns-claims-fulfill | P0 | ? | 9 | pending | Doc-only | Unit/integration tests for override vs base config across returns/claims/fulfillment/pricing; assert telemetry counters. | Missing Tests |
| 4-missing-tests-doc-only | P0 | ? | 9 | pending | Doc-only | 4 | 📋 QUICK NAVIGATION — PENDING ITEMS BY CATEGORY |
| PERF-001 | P0 | L | 9 | pending | services/souq/pricing/auto-repricer.ts | P0 | 5) SESSION SUMMARY |
| test-coverage-gap-p0-api-test-coverage-only-24-88-367-routes-need-206-more-tests | P0 | XL | 9 | pending | Doc-only | **TEST-COVERAGE-GAP** (P0) — API test coverage only 24% (88/367 routes), need 206 more tests (120h effort) | 2025-12-17 23:16 (Asia/Riyadh) — AI Improvement Analysis + Backlog Sync |
| app-api-pm-plans-route-ts-43-fmpmplan-find-query-needs-org-id-injection-missing- | P2 | ? | 9 | pending | app/api/pm/plans/route.ts:43 | `app/api/pm/plans/route.ts:43` — `FMPMPlan.find(query)` needs org_id injection | 2. Tenant Isolation Gaps |
| UX-001 | P1 | ? | 7 | pending | mobile-ux-audit:2025-12 | UX-001 (P1) — 6 list components missing mobile CardList views — sourceRef: code-review:mobile-ux-audit:2025-12-17 | 2025-12-17 23:18 (Asia/Riyadh) — Comprehensive Analysis + QA Gate Update |
| docs-pending-v60-missing-tests-doc-only | P1 | ? | 7 | pending | Doc-only | `docs/pending-v60` | 📍 Current Progress & Planned Next Steps |
| routes-missing-tests-doc-only | P1 | ? | 7 | pending | Doc-only | Routes | Pattern 3: Rate Limit Gaps by Module |
| souq-module-missing-tests-doc-only | P1 | ? | 7 | pending | Doc-only | Souq Module | 🧪 Missing Tests |
| admin-module-missing-tests-doc-only | P1 | ? | 7 | pending | Doc-only | Admin Module | 🧪 Missing Tests |
| fm-module-missing-tests-doc-only | P1 | ? | 7 | pending | Doc-only | FM Module | 🧪 Missing Tests |
| SOUQ-51 | P1 | ? | 7 | pending | Doc-only | Souq module | Missing Tests |
| ADMIN-26 | P1 | ? | 7 | pending | Doc-only | Admin module | Missing Tests |
| FM-19 | P1 | ? | 7 | pending | Doc-only | FM module | Missing Tests |
| tests-for-aws-region-aws-s3-bucket-fail-fast-and-rotation-script-env-requirement | P1 | ? | 7 | pending | Doc-only | Tests for AWS_REGION/AWS_S3_BUCKET fail-fast and rotation script env requirements. | Missing Tests |
| auth-checkout-returns-claims-after-rule-ui-config-rollout-missing-tests-doc-only | P1 | ? | 7 | pending | Doc-only | Auth/checkout/returns/claims after rule UI + config rollout. | Missing Tests |
| auth-store-failure-503-for-routes-with-getsessionorerror-missing-tests-doc-only | P1 | ? | 7 | pending | Doc-only | Auth store failure → 503 for routes with `getSessionOrError` | Missing Tests |
| 51-souq-routes-22-admin-routes-17-fm-routes-need-tests-missing-tests-doc-only | P1 | ? | 7 | pending | Doc-only | 51 Souq routes, 22 Admin routes, 17 FM routes need tests | Missing Tests |
| OPT-002 | P1 | ? | 7 | pending | lib/tracing.ts | OpenTelemetry tracing | Optional Enhancements (3) - ✅ ALL RESOLVED (2025-12-11) |
| PERF-002 | P1 | M | 7 | pending | services/souq/fulfillment-service.ts | P1 | 5) SESSION SUMMARY |
| add-zod-to-remaining-191-routes-missing-tests-doc-only | P1 | M | 7 | pending | Doc-only | Add Zod to remaining 191 routes | 📋 Remaining P0-P1 Tasks |
| review-db-collection-usages-for-tenant-scoping-gaps-missing-tests-doc-only | P2 | ? | 7 | pending | Doc-only | Review db.collection() usages for tenant scoping gaps | 2025-12-20 11:45 (Asia/Riyadh) — Production Readiness Session: Security + Test Coverage |
| TENANT-001 | P2 | ? | 7 | pending | Doc-only | **CRM-TENANT-001** — CRM contacts endpoint missing orgId filter | 2025-12-16 18:35 (Asia/Riyadh) — CRM Tenant Scope + API Test Fixes (P0 Security) |
| validation-rate-limiting-authentication-permissions-missing-tenant-scope-missing | P2 | ? | 7 | pending | Doc-only | **Validation:** Rate limiting, authentication, permissions, missing tenant scope | 2025-12-17 00:05 (Asia/Riyadh) — TEST-002/003/004 Complete: HR/CRM/Finance Test Suite |
| 401-403-missing-tenant-scope-orgid-missing-tests-doc-only | P2 | ? | 7 | pending | Doc-only | 401/403 missing tenant scope (orgId) | 2025-12-17 00:05 (Asia/Riyadh) — TEST-002/003/004 Complete: HR/CRM/Finance Test Suite |
| BUG-010 | P2 | ? | 7 | pending | /click/route.ts | PM routes missing tenant filter | B) BUGS/LOGIC ERRORS |
| needs-review-should-require-auth-missing-tests-app-api-tenants-route-ts | P2 | ? | 7 | pending | app/api/tenants/route.ts | 🔴 Needs review - should require auth | Pattern 2: Routes Without Auth Check (10 locations) |
| missing-negative-path-tests-no-tests-for-auth-infra-failures-db-outages-rate-lim | P2 | ? | 7 | pending | Doc-only | **Missing negative-path tests**: No tests for auth infra failures, DB outages, rate limit hits | Test Coverage Anti-Patterns Found |
| tests-ensuring-token-based-status-scan-paths-are-tenant-namespaced-and-fail-on-o | P2 | ? | 7 | pending | Doc-only | Tests ensuring token-based status/scan paths are tenant-namespaced and fail on org mismatch or missing token. | Missing Tests |
| tests-failing-when-orgid-absent-and-asserting-correct-tenant-org-persisted-missi | P2 | ? | 7 | pending | Doc-only | Tests failing when orgId absent and asserting correct tenant org persisted | Missing Tests |
| GH-006 | P2 | ? | 7 | pending | pr_agent.yml:26-27 | pr_agent.yml:26-27 | 🔍 GitHub Workflow Diagnostic Analysis |
| taqnyat-service-outage-missing-tests-doc-only | P2 | ? | 7 | pending | Doc-only | **Taqnyat service outage** | 🔍 Potential Root Causes |
| todo-missing-tests-lib-config-tenant-ts-98 | P2 | ? | 7 | pending | lib/config/tenant.ts:98 | TODO | 4) DEEP-DIVE: TODO/FIXME ANALYSIS |
| pending-missing-tests-doc-only | P2 | M | 7 | pending | Doc-only | ⏳ PENDING | 📍 Progress Summary (v65.19) |
| blocked-missing-tests-doc-only | P2 | ? | 6 | blocked | Doc-only | ❌ Blocked | ⚠️ BLOCKERS REQUIRING USER ACTION |
| github-ci-billing-block-missing-tests-doc-only | P2 | ? | 6 | blocked | Doc-only | GitHub CI billing block | 📋 FULL ACTION PLAN (From User's Security Analysis) |
| bug-invoices-filters-missing-serializefilters-on-line-170-missing-tests-doc-only | P2 | ? | 6 | pending | Doc-only | BUG-INVOICES-FILTERS-MISSING: serializeFilters() on line 170 | 2025-12-21 16:00 (Asia/Riyadh) — SSOT Viewer + Backlog Reconciliation |
| expanded-invoice-statusstyles-to-include-pending-and-sent-missing-tests-doc-only | P2 | ? | 6 | pending | Doc-only | Expanded Invoice statusStyles to include PENDING and SENT | 2025-12-18 08:31 (Asia/Riyadh) — FIX-001 Re-application + Parallel Agent Type Cleanup |
| bug-invoices-filters-missing-local-sourceref-code-review-components-finance-invo | P2 | ? | 6 | pending | components/finance/InvoicesList.tsx:111-116 | BUG-INVOICES-FILTERS-MISSING-LOCAL — sourceRef: code-review:components/finance/InvoicesList.tsx:111-116 | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| bug-invoices-filters-missing-wire-daterange-customer-filters-into-query-chips-mi | P2 | ? | 6 | pending | Doc-only | BUG-INVOICES-FILTERS-MISSING — Wire dateRange/customer filters into query + chips | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| cleared-missing-tests-doc-only | P2 | ? | 6 | pending | Doc-only | ✅ Cleared | 📍 Current Progress Summary |
| missing-integration-tests-settlement-flows-kyc-verification-billing-benchmarks-h | P2 | ? | 6 | pending | Doc-only | **Missing integration tests**: Settlement flows, KYC verification, billing benchmarks have no coverage | Test Coverage Anti-Patterns Found |
| integration-tests-that-reject-keys-outside-the-caller-s-org-prefix-and-validate- | P2 | ? | 6 | pending | Doc-only | Integration tests that reject keys outside the caller’s org prefix and validate org-bound signing for scan/metadata/status routes. | Missing Tests |
| unit-webhook-tests-for-lib-finance-tap-payments-ts-lib-finance-checkout-ts-missi | P2 | ? | 6 | pending | lib/finance/tap-payments.ts | Unit + webhook tests for `lib/finance/tap-payments.ts`, `lib/finance/checkout.ts` | Missing Tests |
| properties-invoice-have-guards-but-todo-stubs-missing-tests-doc-only | P2 | ? | 6 | pending | Doc-only | `properties`, `invoice` - 🟡 Have guards but TODO stubs | Pattern 2: GraphQL Org/Tenant Fallback (Consistent Risk) |
| tap-payments-ts-core-gateway-checkout-ts-validation-missing-tests-tap-payments-t | P2 | ? | 6 | pending | tap-payments.ts | tap-payments.ts core gateway + checkout.ts validation | Missing Tests (production readiness) |
| subscriptionbillingservice-recurring-charges-missing-tests-doc-only | P2 | ? | 6 | pending | Doc-only | subscriptionBillingService recurring charges | Missing Tests (production readiness) |
| test-coverage-gap-357-api-routes-only-4-tested-billing-finance-priority-missing- | P2 | ? | 6 | pending | Doc-only | **Test Coverage Gap**: 357 API routes, only 4 tested (billing/finance priority) | 8) SESSION SUMMARY |
| ISSUE-005 | P2 | ? | 6 | pending | scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts | **ISSUE-005 – Mixed orgId Storage in Souq Payouts/Withdrawals** (Major, Pending Migration - Ops): run `npx tsx scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts` (dry-run then execute). | 🔄 Imported OPS Pending (synced 2025-12-11T10:35 +03) |
| bug-invoices-filters-missing-sourceref-components-finance-invoiceslist-tsx-111-1 | P2 | S | 6 | pending | components/finance/InvoicesList.ts | **BUG-INVOICES-FILTERS-MISSING** — sourceRef: components/finance/InvoicesList.tsx:111-116 (4h) | 2025-12-17 23:43 (Asia/Riyadh) — AI Improvement Analysis Complete + SSOT Backlog Sync |
| none-staged-in-docs-backlog-audit-json-import-pending-missing-tests-docs-backlog | P2 | ? | 5 | pending | docs/BACKLOG_AUDIT.js | None (staged in docs/BACKLOG_AUDIT.json; import pending) | 2025-12-21 13:41 (Asia/Riyadh) — Code Review Update |
| open-ready-for-review-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Open, ready for review | 📋 AGENT-003-A SESSION SUMMARY (2025-12-28) |
| feat-issue-152-assets-form-validation-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | feat/issue-152-assets-form-validation | 📌 OPEN PRs |
| sub-pr-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | (sub-PR) | 📌 OPEN PRs |
| none-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ None | 2025-12-29 14:52 (Asia/Riyadh) � Code Review Update [AGENT-003-A] |
| pending-master-update-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | PENDING_MASTER update | ✅ Current Session Progress |
| vitest-ai-dep-vitest-config-ts-missing-tests-vitest-config-ts | P2 | ? | 5 | unknown | vitest.config.ts | **Vitest AI Dep** (`vitest.config.ts`) | 2025-12-17 23:16 (Asia/Riyadh) — AI Improvement Analysis + Backlog Sync |
| public-static-routes-app-api-public-app-api-docs-openapi-app-api-help-articles-a | P2 | ? | 5 | pending | Doc-only | Public/static routes (`app/api/public/*`, `app/api/docs/openapi`, `app/api/help/articles`) are correctly cached | 7. Decisions & Assumptions |
| api-route-app-api-superadmin-ssot-route-ts-protected-endpoint-to-read-pending-ma | P2 | ? | 5 | pending | app/api/superadmin/ssot/route.ts | **API Route:** `app/api/superadmin/ssot/route.ts` - Protected endpoint to read PENDING_MASTER.md | 2025-12-21 16:00 (Asia/Riyadh) — SSOT Viewer + Backlog Reconciliation |
| test-coverage-gap-api-test-coverage-now-101-9-376-369-routes-missing-tests-doc-o | P2 | ? | 5 | pending | Doc-only | TEST-COVERAGE-GAP: API test coverage now 101.9% (376/369 routes) | 2025-12-21 16:00 (Asia/Riyadh) — SSOT Viewer + Backlog Reconciliation |
| bug-wo-filters-missing-serializefilters-on-line-189-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | BUG-WO-FILTERS-MISSING: serializeFilters() on line 189 | 2025-12-21 16:00 (Asia/Riyadh) — SSOT Viewer + Backlog Reconciliation |
| bug-users-filters-missing-serializefilters-on-line-127-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | BUG-USERS-FILTERS-MISSING: serializeFilters() on line 127 | 2025-12-21 16:00 (Asia/Riyadh) — SSOT Viewer + Backlog Reconciliation |
| bug-employees-filters-missing-serializefilters-on-line-137-missing-tests-doc-onl | P2 | ? | 5 | pending | Doc-only | BUG-EMPLOYEES-FILTERS-MISSING: serializeFilters() on line 137 | 2025-12-21 16:00 (Asia/Riyadh) — SSOT Viewer + Backlog Reconciliation |
| bug-auditlogs-filters-missing-serializefilters-on-line-130-missing-tests-doc-onl | P2 | ? | 5 | pending | Doc-only | BUG-AUDITLOGS-FILTERS-MISSING: serializeFilters() on line 130 | 2025-12-21 16:00 (Asia/Riyadh) — SSOT Viewer + Backlog Reconciliation |
| blocker-001-vercel-build-failing-webpack-module-not-found-needs-investigation-mi | P2 | ? | 5 | blocked | Doc-only | **BLOCKER-001:** Vercel build failing (webpack "Module not found") - Needs investigation | 2025-12-17 23:46 (Asia/Riyadh) — Critical System Fixes (100% Execution - No Deferral) |
| tests-aggregate-tests-6-6-passing-full-suite-pending-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Tests: 🟢 Aggregate tests 6/6 passing (full suite pending) | 2025-12-17 23:46 (Asia/Riyadh) — Critical System Fixes (100% Execution - No Deferral) |
| component-test-coverage-gap-7-15-217-components-tested-deferred-to-phase-4-missi | P2 | ? | 5 | pending | Doc-only | Component test coverage gap: 7% (15/217 components tested) - deferred to Phase 4 | 2025-12-17 23:43 (Asia/Riyadh) — AI Improvement Analysis Complete + SSOT Backlog Sync |
| test-coverage-needs-improvement-api-24-component-7-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Test Coverage: 🟡 NEEDS IMPROVEMENT (API: 24%, Component: 7%) | 2025-12-17 23:43 (Asia/Riyadh) — AI Improvement Analysis Complete + SSOT Backlog Sync |
| db-sync-pending-mongodb-offline-blocked-missing-tests-doc-only | P2 | ? | 5 | blocked | Doc-only | ⚠️ DB sync pending (MongoDB offline - blocked) | Issue Tracker Status |
| bug-wo-filters-missing-local-sourceref-code-review-components-fm-workordersviewn | P2 | ? | 5 | pending | components/fm/WorkOrdersViewNew.tsx:149-153 | BUG-WO-FILTERS-MISSING-LOCAL — sourceRef: code-review:components/fm/WorkOrdersViewNew.tsx:149-153 | 2025-12-17 23:16 (Asia/Riyadh) — AI Improvement Analysis + Backlog Sync |
| bug-users-filters-missing-local-sourceref-code-review-components-administration- | P2 | ? | 5 | pending | components/administration/UsersList.tsx:107-113 | BUG-USERS-FILTERS-MISSING-LOCAL — sourceRef: code-review:components/administration/UsersList.tsx:107-113 | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| bug-employees-filters-missing-local-sourceref-code-review-components-hr-employee | P2 | ? | 5 | pending | components/hr/EmployeesList.tsx:112-116 | BUG-EMPLOYEES-FILTERS-MISSING-LOCAL — sourceRef: code-review:components/hr/EmployeesList.tsx:112-116 | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| bug-auditlogs-filters-missing-local-sourceref-code-review-components-administrat | P2 | ? | 5 | pending | components/administration/AuditLogsList.tsx:108-114 | BUG-AUDITLOGS-FILTERS-MISSING-LOCAL — sourceRef: code-review:components/administration/AuditLogsList.tsx:108-114 | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| TEST-002 | P2 | ? | 5 | pending | docs/PENDING_MASTER.md:76 | TEST-002 (P2) — List component integration tests missing — sourceRef: analysis:testing-recommendations:2025-12-17 | Enhancements / Bugs / Logic / Missing Tests (Prod Readiness Focus) |
| test-coverage-needs-improvement-24-api-coverage-88-367-routes-tested-missing-tes | P2 | ? | 5 | pending | Doc-only | Test Coverage: 🟡 NEEDS IMPROVEMENT (24% API coverage: 88/367 routes tested) | 2025-12-17 23:16 (Asia/Riyadh) — AI Improvement Analysis + Backlog Sync |
| none-backlog-items-already-captured-import-pending-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | None (backlog items already captured; import pending) | 2025-12-17 23:02 (Asia/Riyadh) — Code Review Update |
| bug-wo-filters-missing-sourceref-code-review-components-fm-workordersviewnew-tsx | P2 | ? | 5 | pending | components/fm/WorkOrdersViewNew.tsx:124-153 | BUG-WO-FILTERS-MISSING — sourceRef: code-review:components/fm/WorkOrdersViewNew.tsx:124-153 (pending DB import) | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| bug-wo-filters-missing-include-overdue-assignment-filters-in-api-params-tests-mi | P2 | ? | 5 | pending | Doc-only | BUG-WO-FILTERS-MISSING — Include overdue/assignment filters in API params + tests | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| bug-users-filters-missing-wire-inactivedays-lastlogin-filters-into-query-chips-m | P2 | ? | 5 | pending | Doc-only | BUG-USERS-FILTERS-MISSING — Wire inactiveDays/lastLogin filters into query + chips | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| bug-employees-filters-missing-add-joiningdate-reviewdue-filters-to-query-chips-m | P2 | ? | 5 | pending | Doc-only | BUG-EMPLOYEES-FILTERS-MISSING — Add joiningDate/reviewDue filters to query + chips | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| bug-auditlogs-filters-missing-add-daterange-action-filters-to-query-chips-missin | P2 | ? | 5 | pending | Doc-only | BUG-AUDITLOGS-FILTERS-MISSING — Add dateRange/action filters to query + chips | 2025-12-17 22:53 (Asia/Riyadh) — Code Review Update |
| x-documentation-pending-master-md-updated-with-complete-inventory-missing-tests- | P2 | ? | 5 | pending | PENDING_MASTER.md | [x] Documentation: PENDING_MASTER.md updated with complete inventory | 8) SESSION SUMMARY |
| features-quick-chips-open-urgent-overdue-due-today-url-sync-sort-dropdown-row-cl | P2 | ? | 5 | pending | Doc-only | **Features**: Quick chips (Open, Urgent, Overdue, Due Today), URL sync, Sort dropdown, Row click | 2025-12-17 23:30 — P2 COMPLETE: All Module Migrations + Mobile CardList ✅ 100% DELIVERED |
| leaverequestslist-tsx-527-lines-new-status-leave-type-period-quick-stats-pending | P2 | ? | 5 | pending | LeaveRequestsList.ts | **LeaveRequestsList.tsx** (527 lines, NEW): Status, Leave Type, Period + Quick stats (Pending/Approved/Total Days) + Pending/Upcoming chips | 2025-12-17 23:30 — P2 COMPLETE: All Module Migrations + Mobile CardList ✅ 100% DELIVERED |
| compact-encoding-filters-status-open-priority-high-not-verbose-json-missing-test | P2 | ? | 5 | pending | Doc-only | **Compact Encoding**: `filters=status:["open"],priority:["high"]` (not verbose JSON) | 2025-12-17 22:00 — P1 FOUNDATION COMPLETE: Design Tokens + Table System + Filter Components ✅ 100% DELIVERED |
| multi-select-checkboxes-with-counts-e-g-open-12-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Multi-select checkboxes with counts (e.g., "Open (12)") | 2025-12-17 22:00 — P1 FOUNDATION COMPLETE: Design Tokens + Table System + Filter Components ✅ 100% DELIVERED |
| components-fm-workordersview-tsx-refactoring-in-progress-by-other-agent-missing- | P2 | ? | 5 | in_progress | components/fm/WorkOrdersView.ts | `components/fm/WorkOrdersView.tsx` (refactoring in progress by other agent) | 2025-12-17 22:00 — P1 FOUNDATION COMPLETE: Design Tokens + Table System + Filter Components ✅ 100% DELIVERED |
| pr-creation-open-pr-for-feat-superadmin-branding-main-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | PR creation: Open PR for `feat/superadmin-branding` → `main` | 2025-12-17 21:50 — P0 SSRF Hardening + Test Fixes + Multi-Agent Coordination ✅ MERGE-READY |
| p2-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | P2 | 🔄 Planned Next Steps |
| when-superadmin-clicks-these-links-middleware-detects-missing-orgid-redirects-to | P2 | ? | 5 | pending | Doc-only | When superadmin clicks these links → middleware detects missing `orgId` → redirects to `/login` | 2025-12-17 01:45 (Asia/Riyadh) — Superadmin Navigation Fix (P0 UX Critical) |
| investigate-refresh-replay-test-ts-failure-p2-2-hours-missing-tests-refresh-repl | P2 | ? | 5 | pending | refresh.replay.test.ts | Investigate `refresh.replay.test.ts` failure (P2, 2 hours) | 2025-12-17 01:45 (Asia/Riyadh) — Superadmin Navigation Fix (P0 UX Critical) |
| root-cause-missing-orgid-filters-on-crmlead-and-crmactivity-operations-missing-t | P2 | ? | 5 | pending | Doc-only | **Root Cause:** Missing `orgId` filters on CrmLead and CrmActivity operations | 2025-12-17 00:30 (Asia/Riyadh) — CRM Tenant Scope Security Fix (SEC-CRM-001) |
| rationale-crm-routes-use-resolveuser-which-returns-null-for-both-missing-auth-an | P2 | ? | 5 | pending | Doc-only | **Rationale:** CRM routes use `resolveUser` which returns null for both missing auth and insufficient role → 401 | 2025-12-16 18:35 (Asia/Riyadh) — CRM Tenant Scope + API Test Fixes (P0 Security) |
| DOC-101 | P2 | ? | 5 | pending | Doc-only | DOC-101 through DOC-110: Documentation gaps (JSDoc, OpenAPI, READMEs) | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| TEST-005 | P2 | ? | 5 | in_progress | decimal.ts | TEST-005: Aqar test coverage (in progress) | Comprehensive Enhancements / Bugs / Missing Tests (production focus) |
| 13-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 13 | 2025-12-15 22:30 (Asia/Riyadh) — SSOT Backlog Sync + Verification Audit |
| branch-docs-pending-v60-deleted-locally-and-remotely-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Branch `docs/pending-v60` deleted locally and remotely | 2025-12-15 18:45 (Asia/Riyadh) — PR Batch Processing Complete + Review Analysis |
| 0-open-prs-remaining-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **0 open PRs remaining** | 2025-12-15 18:45 (Asia/Riyadh) — PR Batch Processing Complete + Review Analysis |
| fallback-logic-falls-back-to-auth-secret-when-nextauth-secret-missing-missing-te | P2 | ? | 5 | pending | Doc-only | **Fallback Logic:** Falls back to AUTH_SECRET when NEXTAUTH_SECRET missing | 2025-12-14 00:20 (Asia/Riyadh) — v65.29 P0 Resolution: CONFIG-002 NEXTAUTH_SECRET Fixed |
| test-2-validates-production-runtime-error-when-both-missing-missing-tests-doc-on | P2 | ? | 5 | pending | Doc-only | Test 2: Validates production runtime error when both missing | 2025-12-14 00:20 (Asia/Riyadh) — v65.29 P0 Resolution: CONFIG-002 NEXTAUTH_SECRET Fixed |
| 9-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 9 | 2025-12-14 00:20 (Asia/Riyadh) — v65.29 P0 Resolution: CONFIG-002 NEXTAUTH_SECRET Fixed |
| CONFIG-002 | P2 | ? | 5 | pending | Doc-only | **CONFIG-002 — NEXTAUTH_SECRET missing in Vercel production** | 2025-12-14 00:02 (Asia/Riyadh) — 🚨 P0 PRODUCTION OUTAGE: NEXTAUTH_SECRET Missing |
| 9-was-8-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 9 (was 8) | Then redeploy |
| 10-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 10 | 1) CURRENT PROGRESS |
| missing-tests-6-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Missing Tests: 6 | 2025-12-14 00:00 (Asia/Riyadh) — v65.26 Backlog Extractor v2.5 Sync |
| none-no-new-issues-beyond-pending-master-open-items-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | None (no new issues beyond PENDING_MASTER open items) | 2025-12-13 23:10 (Asia/Riyadh) — SSOT Correction (no DB sync) |
| BUG-011 | P2 | ? | 5 | pending | docs/PENDING_MASTER.md:78 | BUG-011 — Notification .then() chains — sourceRef: docs/PENDING_MASTER.md:78 | 🎯 Remaining Priority Items |
| module-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Module | 📋 Missing Tests (Priority List) |
| hardened-pr-agent-to-ignore-bots-require-repo-pr-context-and-skip-when-openai-ke | P2 | ? | 5 | pending | .github/workflows/pr_agent.yml:20-47 | Hardened PR Agent to ignore bots, require repo PR context, and skip when `OPENAI_KEY` missing (`.github/workflows/pr_agent.yml:20-47`). | ✅ Session Progress — Workflow lint + fork safety |
| aqar-module-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Aqar Module | 🧪 Missing Tests |
| needs-review-should-require-auth-missing-tests-app-api-properties-route-ts | P2 | ? | 5 | pending | app/api/properties/route.ts | 🔴 Needs review - should require auth | Pattern 2: Routes Without Auth Check (10 locations) |
| needs-review-should-require-auth-missing-tests-app-api-work-orders-route-ts | P2 | ? | 5 | pending | app/api/work-orders/route.ts | 🔴 Needs review - should require auth | Pattern 1: Missing Rate Limiting in Legacy Routes |
| test-files-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Test Files | 📈 Test Coverage by Module |
| json-parse-43-routes-remaining-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] JSON-PARSE: 43 routes remaining | ✅ QA Gate Checklist |
| no-e2e-for-critical-flows-settlements-payouts-kyc-approval-missing-end-to-end-va | P2 | ? | 5 | pending | Doc-only | **No E2E for critical flows**: Settlements, payouts, KYC approval missing end-to-end validation | Test Coverage Anti-Patterns Found |
| e2e-gate-still-timing-out-in-scripts-run-playwright-sh-likely-dev-server-hang-re | P2 | ? | 5 | pending | Doc-only | E2E gate still timing out in `scripts/run-playwright.sh`; likely dev-server hang. Retry with `PW_SKIP_E2E=true` or `SKIP_PLAYWRIGHT=true` if intentional, otherwise investigate webpack dev server startup when invoked via the script. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| fix-graphql-resolver-todos-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | `fix/graphql-resolver-todos` | 📍 Current Progress & Planned Next Steps |
| coverage-for-org-required-orgless-rejection-on-queries-mutations-missing-tests-d | P2 | ? | 5 | pending | Doc-only | Coverage for org-required + orgless rejection on queries/mutations | Missing Tests |
| test-enforcing-session-orgid-and-stored-org-consistency-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Test enforcing session orgId and stored org consistency | Missing Tests |
| broaden-coverage-across-14-auth-routes-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Broaden coverage across 14 auth routes | Missing Tests |
| settlements-seller-flow-coverage-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Settlements/seller flow coverage | Missing Tests |
| workflow-env-gaps-release-gate-environments-missing-creating-staging-production- | P2 | ? | 5 | pending | Doc-only | **Workflow env gaps**: release-gate environments missing; creating `staging`, `production-approval`, `production` resolves all workflow warnings without code changes. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| hardened-superadmin-rotation-to-env-only-credentials-via-requireenv-with-no-lite | P2 | ? | 5 | pending | scripts/update-superadmin-credentials.ts:21-91 | ✅ Hardened SuperAdmin rotation to env-only credentials via `requireEnv` with no literal echoes; fails fast when envs are missing (`scripts/update-superadmin-credentials.ts:21-91`). | 📍 Current Progress |
| env-readiness-enforcement-lib-config-constants-ts-24-47-now-throws-on-missing-aw | P2 | ? | 5 | pending | lib/config/constants.ts:24-47 | **Env Readiness Enforcement** — `lib/config/constants.ts:24-47` now throws on missing AWS_REGION/AWS_S3_BUCKET, but env sample/docs still show optional S3 fields; add documentation gating to prevent regressions. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| to-run-after-pending-changes-pnpm-typecheck-pnpm-lint-pnpm-test-feat-marketplace | P2 | ? | 5 | pending | Doc-only | ⏳ To run after pending changes: `pnpm typecheck && pnpm lint && pnpm test` (feat/marketplace-api-tests), `pnpm test:e2e` (Playwright smoke for auth/checkout/returns/claims). | 🧪 Verification |
| pushed-commits-8fcd7df5e-and-696b7bd05-to-docs-pending-v60-branch-missing-tests- | P2 | ? | 5 | pending | Doc-only | ✅ Pushed commits `8fcd7df5e` and `696b7bd05` to `docs/pending-v60` branch | 📍 Current Progress |
| located-master-pending-report-no-duplicates-and-reviewed-prior-hardening-work-sa | P2 | ? | 5 | pending | Doc-only | Located Master Pending Report (no duplicates) and reviewed prior hardening work (safe session/parser rollouts). | 📍 Current Progress |
| manual-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Manual | B. Technical Debt Reduction |
| opentelemetry-tracing-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | OpenTelemetry tracing | C. Infrastructure Improvements |
| d7c82f309-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | `d7c82f309` | 📍 Current Progress Summary |
| 2-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 2 | Outstanding Categories ⚠️ |
| pending-master-v18-0-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | PENDING_MASTER v18.0 | 📋 Open Pull Requests (6 Stale Drafts) |
| pending-master-v17-0-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | PENDING_MASTER v17.0 | 🔲 Stale Draft PRs to Close |
| close-9-stale-draft-prs-539-547-15m-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Close 9 stale draft PRs (#539-547) — 15m | P0 — Critical (Next Session) |
| add-rate-limiting-to-3-legacy-routes-30m-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Add rate limiting to 3 legacy routes — 30m | P0 — Critical (Next 24h) |
| check-4-similar-ref-patterns-for-type-errors-30m-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Check 4 similar ref patterns for type errors — 30m | P1 — High Priority (Next 3 days) |
| merge-pr-548-after-approval-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Merge PR #548 after approval | P1 — High Priority (Next 3 days) |
| review-similar-dynamic-require-patterns-30m-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Review similar dynamic require patterns — 30m | P2 — Medium Priority (Next week) |
| 6-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 6 | 📍 Current Progress Summary |
| 0-found-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 0 found | 🟢 Category 5: Verified Production-Ready |
| app-api-souq-products-route-ts-e-commerce-needs-protection-missing-tests-app-api | P2 | ? | 5 | pending | app/api/souq/products/route.ts | `app/api/souq/products/route.ts` — E-commerce, needs protection | Pattern 2: Unbounded Database Queries |
| close-9-stale-draft-prs-15m-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Close 9 stale draft PRs — 15m | P0 — Critical (Next 24h) |
| review-2-json-parse-locations-without-try-catch-30m-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Review 2 JSON.parse locations without try-catch — 30m | P1 — High Priority (Next 3 days) |
| add-request-id-correlation-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Add request ID correlation | P3 — Nice to Have |
| add-apm-spans-for-critical-paths-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Add APM spans for critical paths | P3 — Nice to Have |
| clean-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Clean | ✅ Strengths Identified |
| paytabs-tap-cleanup-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | PayTabs→TAP cleanup | 📋 Open Pull Requests (6 Stale Drafts) |
| tests-server-api-counters-contract-test-ts-missing-tests-tests-server-api-counte | P2 | ? | 5 | pending | tests/server/api/counters.contract.test.ts | `tests/server/api/counters.contract.test.ts` | Pattern 2: Test Mock Incomplete Setup |
| tests-unit-api-health-health-test-ts-missing-tests-tests-unit-api-health-health- | P2 | ? | 5 | pending | tests/unit/api/health/health.test.ts | `tests/unit/api/health/health.test.ts` | Category 1: Test Failures (P0 - 12 Files, 28 Tests) |
| tests-unit-api-marketplace-search-route-test-ts-missing-tests-tests-unit-api-mar | P2 | ? | 5 | pending | tests/unit/api/marketplace/search/route.test.ts | `tests/unit/api/marketplace/search/route.test.ts` | Pattern 2: Test Mock Incomplete Setup |
| 546-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | #546 | Category 2: Stale PRs (P0 - 9 PRs) |
| 542-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | #542 | Category 10: Stale PRs (P0 - 6 PRs) |
| 540-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | #540 | Category 10: Stale PRs (P0 - 6 PRs) |
| 539-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | #539 | Category 10: Stale PRs (P0 - 6 PRs) |
| openai-key-context-missing-tests-pr-agent-yml | P2 | ? | 5 | pending | pr_agent.yml | OPENAI_KEY context | Workflow Diagnostics Verified |
| creategraphqlhandler-disabled-deps-missing-branches-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | `createGraphQLHandler` disabled/deps-missing branches | Category 5: Missing Test Coverage |
| 84-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 84% | 📊 Production Readiness Score |
| graphql-review-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | GraphQL review | 📁 Session Activity Log |
| pending-master-v42-0-created-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | PENDING_MASTER v42.0 created | 📁 Session Activity Log |
| 717df925c-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | `717df925c` | 📍 Current Progress Summary |
| 60-req-min-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 60 req/min | Routes with Direct Rate Limiting Added (30+) |
| 40-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 40 | 📊 Status Summary |
| missing-env-vars-missing-tests-tests-e2e-auth-spec-ts | P2 | ? | 5 | pending | tests/e2e/auth.spec.ts | Missing env vars | Skipped Tests (15 total) |
| 69-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 69% | 📊 Production Readiness Score Update |
| api-routes-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | API Routes | 🔍 Deep-Dive Analysis: Test Coverage Gaps |
| 119-352-34-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 119/352 (34%) | 📍 Current Progress Summary |
| 11-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 11 | 📍 Current Progress Summary |
| risk-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Risk | Pattern 5: Missing Error Boundaries |
| path-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Path | C. Missing Tests (Production Readiness) |
| critical-functions-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Critical Functions | Pattern 5: Services Without Unit Tests |
| missing-email-tocontain-invalid-input-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Missing email: `toContain("Invalid input")` | 3. `tests/unit/api/auth/forgot-password.test.ts` |
| pr-ready-to-commit-and-merge-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] PR: Ready to commit and merge | Verification Gates |
| 7-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 7 | 📈 Metrics Overview |
| 19-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 19 | Pattern 3: Rate Limit Gaps by Module |
| 25-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 25 | Pattern 3: Rate Limit Gaps by Module |
| 15-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 15 | Pattern 3: Rate Limit Gaps by Module |
| lint-not-yet-run-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Lint: Not yet run | 📋 Verification Checklist |
| tests-not-yet-run-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Tests: Not yet run | 📋 Verification Checklist |
| pr-ready-to-merge-after-tests-pass-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] PR: Ready to merge after tests pass | 📋 Verification Checklist |
| lib-finance-missing-tests-pricing-ts | P2 | ? | 5 | pending | pricing.ts | lib/finance/ | E. Missing Tests (Production Readiness) |
| lib-aqar-missing-tests-pricinginsights-ts | P2 | ? | 5 | pending | pricingInsights.ts | lib/aqar/ | TEST-001: Critical Services Without Tests (7 remaining, 2 completed) |
| lib-aqar-missing-tests-recommendation-ts | P2 | ? | 5 | pending | recommendation.ts | lib/aqar/ | TEST-001: Critical Services Without Tests (7 remaining, 2 completed) |
| lib-finance-missing-tests-decimal-ts | P2 | ? | 5 | pending | decimal.ts | lib/finance/ | TEST-001: Critical Services Without Tests (7 remaining, 2 completed) |
| lib-finance-missing-tests-provision-ts | P2 | ? | 5 | pending | provision.ts | lib/finance/ | TEST-001: Critical Services Without Tests (7 remaining, 2 completed) |
| server-services-missing-tests-onboardingentities-ts | P2 | ? | 5 | pending | onboardingEntities.ts | server/services/ | TEST-001: Critical Services Without Tests (7 remaining, 2 completed) |
| server-services-missing-tests-onboardingkpi-service-ts | P2 | ? | 5 | pending | onboardingKpi.service.ts | server/services/ | TEST-001: Critical Services Without Tests (7 remaining, 2 completed) |
| server-services-missing-tests-subscriptionseatservice-ts | P2 | ? | 5 | pending | subscriptionSeatService.ts | server/services/ | TEST-001: Critical Services Without Tests (7 remaining, 2 completed) |
| needs-env-vars-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | ⏳ Needs env vars | 📋 Production Readiness Checklist |
| docs-pending-update-pending-master-v18-0-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | docs(pending): Update PENDING_MASTER v18.0 | 📁 Open Pull Requests |
| docs-pending-update-pending-master-v17-0-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | docs(pending): Update PENDING_MASTER v17.0 | 📁 Open Pull Requests |
| app-api-fm-needs-verification-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | `app/api/fm/` — Needs verification | Pattern 1: Missing Error Handling in Work Orders API |
| 10-routes-missing-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 🟡 10 routes missing | 📋 Production Readiness Checklist |
| 7-remaining-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 7 remaining | 📊 Current Codebase Metrics |
| 75-routes-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 75 routes | 🔍 Deep-Dive Analysis: Test Coverage Gaps |
| 19-routes-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 19 routes | 🔍 Deep-Dive Analysis: Test Coverage Gaps |
| 25-routes-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 25 routes | 🔍 Deep-Dive Analysis: Test Coverage Gaps |
| 7-routes-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 7 routes | 🔍 Deep-Dive Analysis: Test Coverage Gaps |
| SENTRY-001 | P2 | ? | 5 | pending | Doc-only | Add Sentry context to FM/Souq modules | Priority 3: Infrastructure |
| add-try-catch-to-69-api-routes-with-json-parse-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Add try-catch to 69 API routes with JSON.parse | 🎯 Outstanding Items (Unchanged from Previous Report) |
| add-sentry-context-to-fm-souq-modules-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Add Sentry context to FM/Souq modules | 🎯 Outstanding Items (Unchanged from Previous Report) |
| 20-routes-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 20+ routes | 📊 Codebase Metrics |
| 127-api-routes-without-dedicated-tests-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 127 API routes without dedicated tests | Missing Tests |
| 50-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 50 | 📊 Issue Count Update |
| 57-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 57 | 📊 Session Status Changes |
| pending-master-updated-as-single-source-of-truth-no-duplicate-reports-created-mi | P2 | ? | 5 | pending | Doc-only | PENDING_MASTER updated as single source of truth; no duplicate reports created. | Progress (current session) |
| remaining-routes-signup-refresh-session-edge-cases-beyond-new-otp-post-login-for | P2 | ? | 5 | in_progress | Doc-only | Remaining routes (signup/refresh/session edge cases) beyond new OTP/post-login/forgot/reset coverage | Missing Tests (production readiness) |
| settlements-seller-lifecycle-beyond-new-escrow-payout-tests-missing-tests-doc-on | P2 | ? | 5 | pending | Doc-only | Settlements seller lifecycle beyond new escrow/payout tests | Missing Tests (production readiness) |
| environment-setup-gaps-release-gate-and-related-workflows-reference-missing-gith | P2 | ? | 5 | pending | Doc-only | **Environment setup gaps**: release-gate and related workflows reference missing GitHub environments; same fix (create envs) resolves all three workflow warnings. | Deep-Dive: Similar Issues Found Elsewhere |
| pending-counts-adjusted-5-items-after-test-coverage-full-recount-pending-for-jso | P2 | ? | 5 | pending | Doc-only | Pending counts adjusted (-5 items) after test coverage; full recount pending for JSON-protection backlog. | 🔎 Notes |
| component-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Component | C) MISSING TESTS (Production Readiness) |
| testing-gaps-45-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **Testing Gaps**: 45 | 📈 Progress Summary |
| component-function-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Component/Function | Missing Tests |
| taqnyat-api-credentials-missing-invalid-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **Taqnyat API credentials missing/invalid** | 🔍 Potential Root Causes |
| sender-id-not-registered-with-citc-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **Sender ID not registered with CITC** | 🔍 Potential Root Causes |
| phone-number-format-incorrect-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **Phone number format incorrect** | 🔍 Potential Root Causes |
| rate-limiting-hit-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **Rate limiting hit** | 🔍 Potential Root Causes |
| otp-not-being-stored-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **OTP not being stored** | 🔍 Potential Root Causes |
| api-route-error-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **API route error** | 🔍 Potential Root Causes |
| test-across-all-pages-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Test across all pages | 📋 ACTION PLAN: Theme Toggle |
| gh-quota-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **GH-QUOTA** | 5) REMAINING ITEMS |
| gh-envs-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | **GH-ENVS** | 5) REMAINING ITEMS |
| 1-537-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 1 (#537) | 📊 PROGRESS SINCE LAST UPDATE |
| openai-key-secret-missing-tests-pr-agent-yml-27 | P2 | ? | 5 | pending | pr_agent.yml:27 | OPENAI_KEY secret | B) GitHub Actions Warnings (Informational) |
| gh-quota-still-pending-devops-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | `GH-QUOTA` — Still pending (DevOps) | 🔄 DE-DUPLICATION NOTES |
| gh-envs-still-pending-devops-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | `GH-ENVS` — Still pending (DevOps) | 🔄 DE-DUPLICATION NOTES |
| docs-update-pending-master-to-v14-4-with-verification-audit-missing-tests-doc-on | P2 | ? | 5 | pending | Doc-only | docs: Update PENDING_MASTER to v14.4 with verification audit | 1) PR PROCESSING SUMMARY |
| 12-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 12 | 6) REVISED PENDING ITEMS |
| jobs-recurring-charge-ts-missing-tests-jobs-recurring-charge-ts | P2 | ? | 5 | pending | jobs/recurring-charge.ts | `jobs/recurring-charge.ts` | 2) CRITICAL ISSUE RESOLVED: Broken PayTabs Migration |
| configure-paytabs-production-credentials-user-action-missing-tests-doc-only | P2 | ? | 5 | blocked | Doc-only | [ ] Configure PayTabs production credentials (user action) | 6) PRODUCTION CHECKLIST |
| run-e2e-tests-on-staging-devops-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Run E2E tests on staging (DevOps) | 6) PRODUCTION CHECKLIST |
| DOC-001 | P2 | ? | 5 | pending | openapi.yaml | ✅ DOC-001: Split PENDING_MASTER → NOT NEEDED (single source of truth is correct) | 🟢 CATEGORY 7: LOW PRIORITY - Documentation (5 Items) |
| error-handling-gap-30-routes-lack-json-parse-error-handling-missing-tests-doc-on | P2 | ? | 5 | pending | Doc-only | **Error Handling Gap**: ~30 routes lack JSON parse error handling | 8) SESSION SUMMARY |
| todo-missing-tests-lib-graphql-index-ts-463 | P2 | ? | 5 | pending | lib/graphql/index.ts:463 | TODO | 4) DEEP-DIVE: TODO/FIXME ANALYSIS |
| todo-missing-tests-lib-graphql-index-ts-485 | P2 | ? | 5 | pending | lib/graphql/index.ts:485 | TODO | 4) DEEP-DIVE: TODO/FIXME ANALYSIS |
| todo-missing-tests-lib-graphql-index-ts-507 | P2 | ? | 5 | pending | lib/graphql/index.ts:507 | TODO | 4) DEEP-DIVE: TODO/FIXME ANALYSIS |
| todo-missing-tests-lib-graphql-index-ts-520 | P2 | ? | 5 | pending | lib/graphql/index.ts:520 | TODO | 4) DEEP-DIVE: TODO/FIXME ANALYSIS |
| todo-missing-tests-lib-graphql-index-ts-592 | P2 | ? | 5 | pending | lib/graphql/index.ts:592 | TODO | 4) DEEP-DIVE: TODO/FIXME ANALYSIS |
| todo-missing-tests-lib-graphql-index-ts-796 | P2 | ? | 5 | pending | lib/graphql/index.ts:796 | TODO | 4) DEEP-DIVE: TODO/FIXME ANALYSIS |
| 7-10-todos-are-in-graphql-module-which-is-intentionally-a-stub-rest-apis-are-pri | P2 | ? | 5 | pending | Doc-only | 7/10 TODOs are in GraphQL module which is **intentionally** a stub (REST APIs are primary) | 4) DEEP-DIVE: TODO/FIXME ANALYSIS |
| open-prs-0-all-merged-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Open PRs: 0 (all merged) | 8) SESSION SUMMARY |
| todo-analysis-10-items-all-intentional-backlog-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ TODO analysis: 10 items, all intentional backlog | 8) SESSION SUMMARY |
| fix-i18n-add-36-missing-translation-keys-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | fix(i18n): Add 36 missing translation keys | 1) PR AUDIT RESULTS |
| translation-audit-0-gaps-2-953-keys-100-en-ar-parity-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Translation audit: 0 gaps, 2,953 keys, 100% EN-AR parity | 7) SESSION SUMMARY |
| documented-8-intentional-todo-comments-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Documented 8 intentional TODO comments | 7) SESSION SUMMARY |
| e2e-and-lighthouse-tests-pending-for-staging-run-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | 🟡 E2E and Lighthouse tests pending for staging run | 7) SESSION SUMMARY |
| todo-comments-are-in-graphql-resolvers-placeholders-for-db-integration-and-curre | P2 | ? | 5 | pending | Doc-only | **TODO comments** are in GraphQL resolvers (placeholders for DB integration) and currency formatter (future API) | ✅ SESSION 2025-12-11T09:28 COMPLETED FIXES (Batch 10 - Code Hygiene Audit) |
| MAJ-004 | P2 | ? | 5 | pending | services/souq/seller-kyc-service.ts | Placeholder URL example.com/placeholder.pdf | ✅ SESSION 2025-12-10T23:00 COMPLETED FIXES (Batch 2) |
| info-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | ℹ️ INFO | ✅ LOCAL VERIFICATION STATUS (2025-12-11T08:58 +03) |
| CI-001 | P2 | ? | 5 | pending | docs/GITHUB_SECRETS_SETUP.md | **ISSUE-CI-001 – GitHub Actions Workflows Failing** (High, Pending Investigation): check runners, secrets per `docs/GITHUB_SECRETS_SETUP.md`, review workflow syntax. | 🔄 Imported OPS Pending (synced 2025-12-11T10:35 +03) |
| pending-operational-checks-auth-email-domain-set-email-domain-and-expose-window- | P2 | ? | 5 | pending | scripts/test-api-endpoints.ts | **Pending Operational Checks (Auth & Email Domain)**: set `EMAIL_DOMAIN` (and expose `window.EMAIL_DOMAIN`) before demos/public pages; run `npx tsx scripts/test-api-endpoints.ts --endpoint=auth --BASE_URL=<env-url>`; run E2E auth suites `qa/tests/e2e-auth-unified.spec.ts` and `qa/tests/auth-flows.spec.ts`. | 🔄 Imported OPS Pending (synced 2025-12-11T10:35 +03) |
| docs-audits-pending-tasks-report-md-missing-tests-docs-audits-pending-tasks-repo | P2 | ? | 5 | pending | docs/audits/PENDING_TASKS_REPORT.md | `docs/audits/PENDING_TASKS_REPORT.md` | 🔗 CONSOLIDATED FROM |
| reports-master-pending-report-md-stub-pointer-missing-tests-reports-master-pendi | P2 | ? | 5 | pending | reports/MASTER_PENDING_REPORT.md | `reports/MASTER_PENDING_REPORT.md` (stub pointer) | 🔗 CONSOLIDATED FROM |
| task-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Task | Testing Gaps (4) |
| need-coverage-on-real-rent-late-fee-implementation-not-just-test-helper-to-asser | P2 | ? | 5 | pending | Doc-only | Need coverage on real rent late-fee implementation (not just test helper) to assert whole-day calculation and grace window. | Missing Tests |
| add-integration-style-tests-asserting-rate-limit-applied-before-auth-for-souq-ge | P2 | ? | 5 | pending | Doc-only | Add integration-style tests asserting rate-limit applied before auth for Souq GET routes that intentionally rate-limit unauthenticated traffic. | Missing Tests |
| org-upload-scoping-the-scan-verify-routes-depend-on-buildorgawareratelimitkey-mi | P2 | ? | 5 | pending | Doc-only | Org upload scoping: the scan/verify routes depend on `buildOrgAwareRateLimitKey`; missing mocks caused 500s. Ensure future org-scoped upload tests include both rate-limit key and session/token mocks so infra guards don't mask validation failures. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| add-cases-for-non-seller-roles-and-missing-org-to-ensure-401-403-422-behave-as-e | P2 | ? | 5 | pending | Doc-only | Add cases for non-seller roles and missing org to ensure 401/403/422 behave as expected. | Missing Tests |
| finance-budget-tests-mirror-prior-tenancy-gaps-seen-in-uploads-souq-routes-ensur | P2 | ? | 5 | pending | Doc-only | Finance budget tests mirror prior tenancy gaps seen in uploads/Souq routes: ensure routes enforce `orgId` on reads/writes and that tests assert rejection when missing. Patterns from `validateOrgScopedKey` and Souq rate-limit resets can guide helper extraction. | 🔍 Deep-Dive: Similar/Identical Issue Patterns |
| full-suite-with-skip-flags-off-missing-tests-doc-only | P2 | ? | 5 | pending | Doc-only | Full suite with skip flags off. | Missing Tests |
| souq-missing-tests-doc-only | P2 | L | 5 | pending | Doc-only | Souq | 📋 Missing Tests (Priority List) |
| add-souq-module-tests-21-subdirectories-8h-missing-tests-doc-only | P2 | M | 5 | pending | Doc-only | [ ] Add Souq module tests (21 subdirectories) — 8h | P1 — High Priority (Next 3 days) |
| add-api-tests-for-souq-module-75-routes-8h-missing-tests-doc-only | P2 | M | 5 | pending | Doc-only | [ ] Add API tests for Souq module (75 routes) — 8h | P1 — High Priority (Next 3 days) |
| 231-routes-missing-tests-doc-only | P2 | M | 5 | pending | Doc-only | 231 routes | 🎯 Summary of Findings |
| 232-routes-missing-tests-doc-only | P2 | M | 5 | pending | Doc-only | 232 routes | 🎯 Summary of Findings |
| docs-pending-report-update-missing-tests-doc-only | P2 | M | 5 | pending | Doc-only | `docs/pending-report-update` | Pattern 3: Stale PR Accumulation |
| bug-wo-filters-missing-sourceref-components-fm-workordersviewnew-tsx-149-153-4h- | P2 | S | 5 | pending | components/fm/WorkOrdersViewNew.ts | **BUG-WO-FILTERS-MISSING** — sourceRef: components/fm/WorkOrdersViewNew.tsx:149-153 (4h) | 2025-12-17 23:43 (Asia/Riyadh) — AI Improvement Analysis Complete + SSOT Backlog Sync |
| bug-users-filters-missing-sourceref-components-administration-userslist-tsx-107- | P2 | S | 5 | pending | components/administration/UsersList.ts | **BUG-USERS-FILTERS-MISSING** — sourceRef: components/administration/UsersList.tsx:107-113 (4h) | 2025-12-17 23:43 (Asia/Riyadh) — AI Improvement Analysis Complete + SSOT Backlog Sync |
| bug-employees-filters-missing-sourceref-components-hr-employeeslist-tsx-112-116- | P2 | S | 5 | pending | components/hr/EmployeesList.ts | **BUG-EMPLOYEES-FILTERS-MISSING** — sourceRef: components/hr/EmployeesList.tsx:112-116 (4h) | 2025-12-17 23:43 (Asia/Riyadh) — AI Improvement Analysis Complete + SSOT Backlog Sync |
| bug-auditlogs-filters-missing-sourceref-components-administration-auditlogslist- | P2 | S | 5 | pending | components/administration/AuditLogsList.ts | **BUG-AUDITLOGS-FILTERS-MISSING** — sourceRef: components/administration/AuditLogsList.tsx:108-114 (4h) | 2025-12-17 23:43 (Asia/Riyadh) — AI Improvement Analysis Complete + SSOT Backlog Sync |
| fix-bug-wo-filters-missing-4h-highest-user-impact-missing-tests-doc-only | P2 | S | 5 | pending | Doc-only | Fix BUG-WO-FILTERS-MISSING (4h) - highest user impact | 2025-12-17 23:43 (Asia/Riyadh) — AI Improvement Analysis Complete + SSOT Backlog Sync |
| fix-bug-wo-filters-missing-4h-wire-status-overdue-assignedto-filters-to-query-pa | P2 | S | 5 | pending | Doc-only | Fix BUG-WO-FILTERS-MISSING (4h) — wire status/overdue/assignedTo filters to query params | 2025-12-17 23:16 (Asia/Riyadh) — AI Improvement Analysis + Backlog Sync |
| fix-20-failing-tests-8-files-2h-missing-tests-doc-only | P2 | S | 5 | pending | Doc-only | [ ] Fix 20 failing tests (8 files) — 2h | P0 — Critical (Next 24h) |
| add-aqar-api-tests-3h-missing-tests-doc-only | P2 | S | 5 | pending | Doc-only | [ ] Add Aqar API tests — 3h | P2 — Medium Priority (Next week) |
| add-fm-api-tests-4h-missing-tests-doc-only | P2 | S | 5 | pending | Doc-only | [ ] Add FM API tests — 4h | P2 — Medium Priority (Next week) |
| add-api-tests-for-aqar-16-routes-3h-missing-tests-doc-only | P2 | S | 5 | pending | Doc-only | [ ] Add API tests for Aqar (16 routes) — 3h | P2 — Medium Priority (Next week) |
| add-api-tests-for-fm-25-routes-4h-missing-tests-doc-only | P2 | S | 5 | pending | Doc-only | [ ] Add API tests for FM (25 routes) — 4h | P2 — Medium Priority (Next week) |
| partial-missing-tests-doc-only | P2 | S | 5 | pending | Doc-only | Partial | 🟡 Areas for Future Improvement (P2) |
| test-coverage-gap-api-test-coverage-24-88-367-routes-tested-need-206-more-120h-e | P2 | XL | 5 | pending | Doc-only | **TEST-COVERAGE-GAP** — API test coverage 24% (88/367 routes tested, need 206 more) (120h effort) | 2025-12-17 23:43 (Asia/Riyadh) — AI Improvement Analysis Complete + SSOT Backlog Sync |
| test-missing-tests-doc-only | P2 | XL | 5 | pending | Doc-only | TEST-* | 4) 🟡 MEDIUM PRIORITY (P2) — VERIFICATION RESULTS |
| audit-8-no-explicit-any-eslint-disable-usages-1h-missing-tests-doc-only | P2 | XS | 5 | pending | Doc-only | [ ] Audit 8 `no-explicit-any` eslint-disable usages — 1h | P2 — Medium Priority (Next week) |
| p3-missing-tests-doc-only | P3 | M | 3 | in_progress | Doc-only | P3 | 📋 Planned Next Steps (Priority Order) |
| admin-missing-tests-doc-only | P3 | M | 3 | pending | Doc-only | Admin | 📋 Missing Tests (Priority List) |
| support-missing-tests-doc-only | P3 | S | 3 | pending | Doc-only | Support | 📋 Missing Tests (Priority List) |

## Logic Errors
| Key | Priority | Effort | Impact | Status | Location | Title | SourceRef |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LOGIC-123 | P0 | ? | 10 | pending | Doc-only | Aqar writes | Logic Errors |
| LOGIC-021 | P0 | ? | 10 | pending | tests/unit/security/banned-literals.test.ts | Secrets guard scope | Logic Errors |
| LOGIC-125 | P1 | ? | 10 | pending | app/api/upload/verify-metadata/route.ts:46-119 | app/api/upload/verify-metadata/route.ts:46-119 | Logic Errors |
| LOGIC-127 | P0 | ? | 9 | pending | Doc-only | Test coverage gaps | Logic Errors |
| dashboard-tenant-count-active-users-open-wos-system-health-alerts-logic-errors-d | P1 | ? | 9 | pending | Doc-only | Dashboard: Tenant count, active users, open WOs, system health, alerts | PHASE 2: COMMAND CENTER (Week 3-4) - Est. 60h |
| QUOTA-001 | P1 | ? | 9 | pending | Doc-only | No tenant quota management | P1 - HIGH (Missing Core Features) |
| LOGIC-124 | P1 | ? | 9 | pending | app/api/upload/scan-status/route.ts:83-210 | app/api/upload/scan-status/route.ts:83-210 | Logic Errors |
| LOGIC-121 | P1 | ? | 9 | pending | Doc-only | GraphQL read resolvers | Logic Errors |
| LOGIC-122 | P1 | ? | 9 | pending | Doc-only | Souq review flow | Logic Errors |
| infra-sentry-q1-2026-activate-sentry-needs-dsn-logic-errors-doc-only | P1 | ? | 8 | pending | Doc-only | INFRA-SENTRY → Q1 2026: Activate Sentry (needs DSN) | 2025-12-21 23:55 (Asia/Riyadh) — SSOT Backlog Sync Complete |
| infra-sentry-logic-errors-doc-only | P1 | ? | 8 | pending | Doc-only | INFRA-SENTRY | 🟠 DEFERRED (6 Post-MVP Items) |
| COMP-001 | P1 | ? | 8 | pending | Doc-only | open | 2025-12-21 22:30 (Asia/Riyadh) — SSOT Backlog Sync + Code Review Update |
| migrate-refund-processor-ts-to-tap-createrefund-getrefund-logic-errors-refund-pr | P1 | ? | 8 | unknown | refund-processor.ts | Migrate refund-processor.ts to TAP createRefund()/getRefund() | C) Logic Errors Corrected (This Session) |
| opt-in-defaults-for-missing-preferences-logic-errors-services-admin-notification | P1 | ? | 7 | pending | services/admin/notification-engine.ts | Opt-in defaults for missing preferences | Security & Error Handling |
| distributed-tracing-opentelemetry-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | Distributed tracing (OpenTelemetry) | DevOps Gate Analysis |
| gap-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | Gap | Missing Tests |
| DASH-001 | P1 | ? | 7 | pending | Doc-only | No superadmin dashboard overview | P1 - HIGH (Missing Core Features) |
| impersonation-history-not-tracked-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | Impersonation history not tracked | P1 - HIGH (Missing Core Features) |
| no-webhook-management-ui-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | No webhook management UI | P1 - HIGH (Missing Core Features) |
| EMAIL-001 | P1 | ? | 7 | pending | Doc-only | No email template management | P1 - HIGH (Missing Core Features) |
| no-scheduled-tasks-ui-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | No scheduled tasks UI | P1 - HIGH (Missing Core Features) |
| VENDOR-001 | P1 | ? | 7 | pending | Doc-only | Vendors missing B2B/B2C capability badges | P2 - MEDIUM (Business Model Support) |
| catalog-missing-businessmodel-filter-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | Catalog missing businessModel filter | P2 - MEDIUM (Business Model Support) |
| fm-services-not-in-catalog-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | FM Services not in catalog | P2 - MEDIUM (Business Model Support) |
| status-open-awaiting-review-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | **Status:** Open, awaiting review | 📋 PR STATUS |
| open-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | open | 📌 Current Progress Summary |
| LOGIC-001 | P1 | ? | 7 | pending | Doc-only | open | Enhancements / Bugs / Logic / Missing Tests (Prod Readiness Focus) |
| start-dev-server-and-sync-backlog-audit-json-to-mongodb-via-post-api-issues-impo | P1 | ? | 7 | pending | BACKLOG_AUDIT.js | [ ] Start dev server and sync BACKLOG_AUDIT.json to MongoDB via POST /api/issues/import | 2025-12-29 14:45 (Asia/Riyadh) � Import Retry [AGENT-003-A] |
| 6-superadmin-pages-exist-but-are-missing-from-navigation-nav-missing-001-logic-e | P1 | ? | 7 | pending | Doc-only | 6 superadmin pages exist but are missing from navigation (NAV-MISSING-001) | 2025-12-21 22:00 (Asia/Riyadh) — Phase 0 Discovery + Nav Gap Audit |
| area-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | Area | C. Missing Tests Identified |
| 53800eee4-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | `53800eee4` | 📍 Current Progress Summary |
| in-progress-logic-errors-doc-only | P1 | ? | 7 | in_progress | Doc-only | ✅ In Progress | ✅ v65.22 Session Progress |
| LOGIC-020 | P1 | ? | 7 | pending | Doc-only | Souq rule consumption | Logic Errors |
| LOGIC-005 | P1 | ? | 7 | pending | Doc-only | 20+ upload/help/onboarding routes | Logic Errors |
| located-and-updated-the-master-pending-report-no-duplicate-file-documented-fresh | P1 | ? | 7 | pending | Doc-only | Located and updated the Master Pending Report (no duplicate file); documented fresh findings from repo-wide ripgrep of silent handlers (`catch(() => null\|{}\|undefined\|false)`). | 📍 Current Progress |
| update-openapi-to-use-parameterized-server-url-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | 🟡 Update OpenAPI to use parameterized server URL | Phase 3: Multi-tenant/Rebrand Support (This Quarter) |
| DOC-004 | P1 | ? | 7 | pending | docs/architecture/ARCHITECTURE_DECISION_RECORDS.md | ~~DOC-004: Architecture decision records missing~~ → ✅ `docs/architecture/ARCHITECTURE_DECISION_RECORDS.md` (362 lines) | Documentation (5) - ✅ ALL RESOLVED (2025-12-11) |
| no-open-prs-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | No open PRs | 🔓 Open Pull Requests |
| investigate-github-actions-failures-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | Investigate GitHub Actions failures | Category B: Testing & Quality (Agent) |
| fix-pnpm-build-artifact-gap-next-server-webpack-runtime-js-missing-34223-js-logi | P1 | ? | 7 | pending | .next/server/webpack-runtime.js | Fix `pnpm build` artifact gap (`.next/server/webpack-runtime.js` missing `./34223.js`) | Category B: Testing & Quality (Agent) |
| process-ai-memory-batches-353-pending-logic-errors-doc-only | P1 | ? | 7 | pending | Doc-only | Process AI memory batches (353 pending) | Category D: AI & Automation (Agent) |
| LOGIC-126 | P2 | ? | 5 | pending | Doc-only | Large route files | Logic Errors |

## Efficiency
| Key | Priority | Effort | Impact | Status | Location | Title | SourceRef |
| --- | --- | --- | --- | --- | --- | --- | --- |
| efficiency-doc-only | P0 | ? | 10 | pending | Doc-only | — | 🎯 Production Readiness Checklist |
| implemented-efficiency-doc-only | P0 | ? | 10 | pending | Doc-only | Implemented | 📊 API Route Security & Validation Coverage |
| 80-efficiency-doc-only | P0 | ? | 10 | pending | Doc-only | 80% | 📊 Production Readiness Score |
| TG-005 | P0 | ? | 10 | pending | Doc-only | E2E for finance PII encryption | Testing Gaps (5) |
| SEC-002 | P0 | ? | 9 | pending | /route.ts | [ ] Continue with SEC-002/BUG-001/TEST-* items | Security (1) |
| TG-002 | P0 | ? | 9 | pending | Doc-only | RBAC role-based filtering tests | Testing Gaps (5) |
| fix-9-test-failures-efficiency-doc-only | P0 | S | 9 | pending | Doc-only | Fix 9 test failures | 📋 Remaining Work |
| bug-invoices-filters-missing-efficiency-doc-only | P1 | ? | 8 | pending | Doc-only | BUG-INVOICES-FILTERS-MISSING | ✅ COMPLETED TODAY (16 Resolved Items) |
| ALT-001 | P1 | ? | 7 | pending | Doc-only | Images missing alt text | 🟠 P1 - High Priority Quality Issues |
| 0-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | **0** | 1) CURRENT PROGRESS |
| nav-missing-001-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | NAV-MISSING-001 | ✅ COMPLETED TODAY (16 Resolved Items) |
| bug-wo-filters-missing-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | BUG-WO-FILTERS-MISSING | ✅ COMPLETED TODAY (16 Resolved Items) |
| bug-users-filters-missing-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | BUG-USERS-FILTERS-MISSING | ✅ COMPLETED TODAY (16 Resolved Items) |
| bug-employees-filters-missing-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | BUG-EMPLOYEES-FILTERS-MISSING | ✅ COMPLETED TODAY (16 Resolved Items) |
| bug-auditlogs-filters-missing-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | BUG-AUDITLOGS-FILTERS-MISSING | ✅ COMPLETED TODAY (16 Resolved Items) |
| test-coverage-gap-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | TEST-COVERAGE-GAP | ✅ COMPLETED TODAY (16 Resolved Items) |
| ADR-001 | P1 | ? | 7 | pending | Doc-only | Q1 2026 | DEFERRED (P2) - Postponed with tracking |
| open-0-items-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | 🔴 Open: 0 items | 2025-12-21 23:55 (Asia/Riyadh) — SSOT Backlog Sync Complete |
| EFF-003 | P1 | ? | 7 | pending | app/api/fm/finance/budgets/route.ts:135-143 | `app/api/fm/finance/budgets/route.ts:135-143` | Efficiency Improvements |
| p1-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | **P1** | 📋 Deferred Items & Action Plan |
| testing-efficiency-doc-only | P1 | ? | 7 | pending | Doc-only | Testing | 🟡 P2 — Medium Priority (Backlog) |
| token-warnings-2-items-renovate-token-openai-key-context-warnings-valid-usage-pa | P2 | ? | 6 | pending | Doc-only | **Token Warnings (2 items):** RENOVATE_TOKEN/OPENAI_KEY context warnings — valid usage patterns | 2025-12-16 19:10 (Asia/Riyadh) — GitHub Actions Workflow Fixes + Problems Panel Audit (68 Diagnostics) |
| 17-items-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | 17 items | 2025-12-21 22:30 (Asia/Riyadh) — Batch 3 Performance & i18n Improvements |
| TODO-001 | P2 | ? | 5 | pending | Doc-only | [x] DOCS-TODO-001: Documented 17 TODOs with categories and priorities | 📝 Issues Register Update |
| 0-open-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ 0 open | 2025-12-20 11:45 (Asia/Riyadh) — Production Readiness Session: Security + Test Coverage |
| docs-pending-master-md-this-entry-efficiency-docs-pending-master-md | P2 | ? | 5 | pending | docs/PENDING_MASTER.md | docs/PENDING_MASTER.md (this entry) | ✅ SESSION 2025-12-11T18:45 COMPLETED FIXES (Batch 7 - Historical Backlog Cleanup) |
| master-pending-report-md-commit-b44beaa7e-mongodb-25-1-8-efficiency-master-pendi | P2 | ? | 5 | pending | MASTER_PENDING_REPORT.md | MASTER_PENDING_REPORT.md: commit b44beaa7e, MongoDB 25/1/8 ✅ | Process.env audit: grep -r "process\.env\." app/ \| wc -l (should be 0) |
| statushistory-tracks-status-changes-from-open-baseline-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | `statusHistory` → tracks status changes from 'open' baseline | 2025-12-16 19:29 (Asia/Riyadh) — Backlog Import: Tenant Scoping + Schema-Safe Issue Documents |
| legacy-repair-unscoped-docs-missing-orgid-auto-repaired-on-update-prevents-silen | P2 | ? | 5 | pending | Doc-only | **Legacy Repair:** Unscoped docs (missing orgId) auto-repaired on update; prevents silent query misses | Diff Stats |
| commit-pending-push-2-files-changed-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | **Commit:** pending-push (2 files changed) | 2025-12-16 19:10 (Asia/Riyadh) — GitHub Actions Workflow Fixes + Problems Panel Audit (68 Diagnostics) |
| commit-pending-push-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | **Commit:** pending-push | 2025-12-16 19:10 (Asia/Riyadh) — GitHub Actions Workflow Fixes + Problems Panel Audit (68 Diagnostics) |
| backlog-audit-refreshed-with-12-evidence-backed-open-items-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | **BACKLOG_AUDIT:** Refreshed with 12 evidence-backed open items | 2025-12-16 23:30 (Asia/Riyadh) — DB Sync Status + PERF-001 Resolution |
| start-api-server-for-db-import-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Start API server for DB import | 2025-12-16 23:30 (Asia/Riyadh) — DB Sync Status + PERF-001 Resolution |
| has-openai-key-secrets-openai-key-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | `HAS_OPENAI_KEY: \${{ secrets.OPENAI_KEY != '' }}` | 2025-12-16 23:00 (Asia/Riyadh) — GitHub Actions Workflow Validation Fixes |
| if-env-has-openai-key-true-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | `if: env.HAS_OPENAI_KEY == 'true'` | 2025-12-16 23:00 (Asia/Riyadh) — GitHub Actions Workflow Validation Fixes |
| EFF-001 | P2 | ? | 5 | pending | Doc-only | Rate Limiting | 5) SESSION SUMMARY |
| replace-all-error-tsx-files-with-shared-component-import-efficiency-error-ts | P2 | ? | 5 | unknown | error.ts | Replace all error.tsx files with shared component import | Pattern 4: Missing Error Boundaries — 6 modules |
| todo-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | 🔲 TODO | Efficiency Improvements |
| EFF-002 | P2 | ? | 5 | pending | app/privacy/page.ts | EFF-002 console statements (12) | Efficiency / Performance |
| validation-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | Validation | 🟡 P2 — Medium Priority (Architecture/Efficiency) |
| current-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Current | Security Coverage |
| 539-docs-pending-update-pending-master-v17-0-paytabs-tap-cleanup-efficiency-doc- | P2 | ? | 5 | pending | Doc-only | #539: `docs(pending): Update PENDING_MASTER v17.0 - PayTabs→TAP cleanup` | 📋 Repository Cleanup |
| 540-docs-pending-update-pending-master-v18-0-system-wide-scan-efficiency-doc-onl | P2 | ? | 5 | pending | Doc-only | #540: `docs(pending): Update PENDING_MASTER v18.0 — System-Wide Scan` | 📋 Repository Cleanup |
| 542-wip-update-pending-master-to-v17-0-for-paytabs-tap-cleanup-efficiency-doc-on | P2 | ? | 5 | pending | Doc-only | #542: `[WIP] Update PENDING_MASTER to v17.0 for PayTabs TAP cleanup` | 📋 Repository Cleanup |
| 546-wip-update-pending-master-v18-0-for-system-wide-scan-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | #546: `[WIP] Update PENDING_MASTER v18.0 for system-wide scan` | 📋 Repository Cleanup |
| this-entry-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ This entry | 📦 Session Deliverables |
| 38-45-modules-84-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ 38/45 modules (84%) | 🟢 Strengths Identified |
| assets-routes-1-test-needs-4-more-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | ❌ Assets routes: 1 test (needs 4 more) | 🧪 Test Coverage Analysis |
| onboarding-flow-partial-coverage-needs-integration-tests-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | ❌ Onboarding flow: Partial coverage (needs integration tests) | 🧪 Test Coverage Analysis |
| 75-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | 75% | Pattern 3: Rate Limit Gaps by Module |
| app-api-projects-route-ts-72-header-parsing-efficiency-app-api-projects-route-ts | P2 | ? | 5 | unknown | app/api/projects/route.ts:72 | `app/api/projects/route.ts:72` - Header parsing | Pattern 3: JSON.parse Without Protection in Webhooks |
| 51-352-14-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | 51/352 (14%) | 📍 Current Progress Summary |
| 111-352-32-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | 111/352 (32%) | 📍 Current Progress Summary |
| 30-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | 30 | 📍 Current Progress Summary |
| 5-all-draft-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | 5 (all draft) | 📍 Current Progress Summary |
| total-routes-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | Total Routes | Zod Validation Coverage |
| server-services-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | `server/services/**` | 🟡 MEDIUM PRIORITY — Efficiency & Reliability |
| 34-coverage-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | ⚠️ 34% coverage | 📊 Production Readiness Summary |
| TEST-006 | P2 | ? | 5 | pending | escalation.service.ts | Tests | 📝 Issues Register Update |
| EFF-005 | P2 | ? | 5 | pending | Doc-only | Hooks in wrong directories | A) EFFICIENCY IMPROVEMENTS |
| PERF-003 | P2 | ? | 5 | pending | services/souq/returns/claim-service.ts | N+1 in claim escalation | D) PERFORMANCE ISSUES |
| PERF-004 | P2 | ? | 5 | pending | app/api/admin/notifications/send/route.ts | Sequential notifications | D) PERFORMANCE ISSUES |
| DOC-003 | P2 | ? | 5 | pending | README.md | DOC-003 | Documentation (1) |
| CQ-008 | P2 | ? | 5 | pending | Doc-only | Mixed async/await and Promise chains | Code Quality (8) |
| issue-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | Issue | Testing Gaps (5) |
| TG-003 | P2 | ? | 5 | pending | Doc-only | Auth middleware edge cases | Testing Gaps (4) |
| TG-004 | P2 | ? | 5 | pending | Doc-only | Translation key audit tests | Testing Gaps (5) |
| DOC-002 | P2 | ? | 5 | pending | Doc-only | Missing JSDoc on services | Documentation (3) |
| UX-005 | P2 | ? | 5 | pending | Doc-only | UX-005: Color contrast fixes (4.5:1 ratio) - Needs visual audit | 🟢 CATEGORY 9: LOW PRIORITY - UI/UX (8 Items) - **7/8 VERIFIED/FIXED (2025-12-11)** |
| a11y-001-missing-aria-labels-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | A11Y-001: Missing ARIA labels | Accessibility (4) |
| CH-004 | P2 | ? | 5 | pending | Doc-only | Long function refactoring | 🟢 CATEGORY 8: LOW PRIORITY - Code Hygiene (12 Items) - **7/12 VERIFIED CLEAN (2025-12-11)** |
| 22-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | **22** | 📊 PENDING ITEMS SUMMARY BY SEVERITY |
| CH-002 | P2 | ? | 5 | pending | Doc-only | ~~TODO/FIXME comments~~ | Code Hygiene (0) - **All 5 Items Verified Clean ✅** |
| missing-aria-labels-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | Missing ARIA labels | Accessibility (4) |
| updated-pending-master-with-accurate-metrics-v12-3-efficiency-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Updated PENDING_MASTER with accurate metrics (v12.3) | ✅ COMPLETED This Session (2025-12-11 → 2025-12-12) |
| v12-5-2025-12-11t09-41-03-ui-ux-accessibility-audit-complete-reduced-to-30-pendi | P2 | ? | 5 | pending | Doc-only | v12.5 (2025-12-11T09:41+03) - UI/UX & Accessibility audit complete, reduced to 30 pending | ✅ COMPLETED This Session (2025-12-11 → 2025-12-12) |
| v12-4-2025-12-11t09-28-03-code-hygiene-audit-complete-5-5-clean-reduced-to-37-pe | P2 | ? | 5 | pending | Doc-only | v12.4 (2025-12-11T09:28+03) - Code Hygiene audit complete (5/5 clean), reduced to 37 pending | ✅ COMPLETED This Session (2025-12-11 → 2025-12-12) |
| v12-2-2025-12-11t08-49-03-consolidated-action-plan-counts-42-pending-efficiency- | P2 | ? | 5 | pending | Doc-only | v12.2 (2025-12-11T08:49+03) - Consolidated action plan, counts (42 pending) | ✅ COMPLETED This Session (2025-12-11 → 2025-12-12) |
| v11-0-2025-12-11t08-08-03-updated-timestamp-all-pending-items-organized-by-categ | P2 | ? | 5 | pending | Doc-only | v11.0 (2025-12-11T08:08+03) - Updated timestamp, all pending items organized by category | ✅ COMPLETED This Session (2025-12-11 → 2025-12-12) |
| logged-efficiency-doc-only | P2 | L | 5 | pending | Doc-only | 📋 LOGGED | ✅ P2 MEDIUM-TERM IMPROVEMENTS (AUDITED) |
| REF-001 | P2 | M | 5 | pending | Doc-only | **REF-001** — Create CRM route handler unit tests (P2, effort:M, sourceRef:PENDING_MASTER) | 2025-12-16 19:10 (Asia/Riyadh) — GitHub Actions Workflow Fixes + Problems Panel Audit (68 Diagnostics) |
| complete-openapi-documentation-efficiency-doc-only | P2 | S | 5 | pending | Doc-only | Complete OpenAPI documentation | P2 — Low Priority (Next Week) |
| generate-openapi-specs-efficiency-doc-only | P2 | S | 5 | pending | Doc-only | Generate OpenAPI specs | 📋 Remaining Work |
| documentation-efficiency-doc-only | P3 | ? | 3 | pending | Doc-only | Documentation | 🟢 P3 — Low Priority (Nice to Have) |

## Bugs
| Key | Priority | Effort | Impact | Status | Location | Title | SourceRef |
| --- | --- | --- | --- | --- | --- | --- | --- |
| critical-gap-51-lib-modules-without-documentation-includes-auth-security-middlew | P0 | ? | 10 | pending | Doc-only | **Critical gap:** 51 lib modules without documentation (includes auth, security, middleware) | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| SEC-001 | P0 | ? | 10 | pending | lib/auth/role-guards.ts | `lib/auth/role-guards.ts` | 🟡 CATEGORY 5: MODERATE PRIORITY - Security (3 Items) |
| BUG-1709 | P0 | ? | 10 | pending | app/api/upload/scan/route.ts:44-92 | app/api/upload/scan/route.ts:44-92 | Bugs |
| silent-upload-auth-cluster-app-api-upload-presigned-url-verify-metadata-scan-sca | P0 | ? | 10 | unknown | app/api/settings/logo/route.ts | SILENT-UPLOAD-AUTH-CLUSTER — `app/api/upload/(presigned-url\|verify-metadata\|scan\|scan-status)`, `app/api/settings/logo/route.ts`, `server/middleware/subscriptionCheck.ts`: Silent auth store failures become 401s with no signal; presign body parsing also falls back to `{}`. Introduce telemetry-aware auth helper and safe body parser. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| 1-bugs-doc-only | P0 | ? | 10 | pending | Doc-only | 1 | 📈 Updated Metrics |
| security-bugs-lib-config-tenant-server-ts | P0 | ? | 10 | pending | lib/config/tenant.server.ts | Security | 📁 Files Modified This Session |
| missing-tests-add-negative-invalid-json-tests-for-finance-hr-routes-add-payroll- | P0 | ? | 10 | pending | Doc-only | **Missing Tests:** Add negative/invalid-JSON tests for finance/HR routes; add payroll RBAC tests (HR-only); add lockfile guard to prevent SQL/Prisma deps; extend TAP payments tests to cover `lastChargeId` path and failure handling. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| missing-tests-add-negative-json-tests-for-expenses-payments-root-actions-hr-leav | P0 | ? | 10 | pending | Doc-only | **Missing Tests:** Add negative JSON tests for expenses, payments (root/actions), HR leaves PUT; add payroll RBAC tests; add lockfile guard to detect SQL/Prisma deps. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| missing-tests-add-negative-json-tests-for-expenses-payments-root-actions-hr-leav | P0 | ? | 10 | pending | Doc-only | **Missing Tests:** Add negative JSON tests for expenses, payments (root/actions), HR leaves PUT; add payroll RBAC tests; add lockfile guard test for forbidden deps. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| OTP-001 | P0 | ? | 9 | pending | lib/finance/tap-payments.ts | 🔴 P0 | 🎯 Current Status & Next Steps (Top 5) |
| 43-routes-bugs-request-js | P0 | ? | 9 | in_progress | request.js | 43 routes | 2) PLANNED NEXT STEPS |
| json-parse-fallbacks-linger-in-remaining-upload-onboarding-routes-that-still-use | P0 | ? | 9 | unknown | req.js | **JSON parse fallbacks** linger in remaining upload/onboarding routes that still use `req.json().catch(() => ({}\|null))`, risking bad writes and inconsistent 400s; migrate to shared parser and keep `lint:json-fallbacks` enforced. | 📈 Progress & Planned Next Steps |
| merge-pr-from-fix-graphql-resolver-todos-bugs-doc-only | P0 | ? | 9 | pending | Doc-only | Merge PR from `fix/graphql-resolver-todos` | 🎯 Planned Next Steps |
| BUG-1714 | P0 | ? | 9 | pending | tests/unit/api/fm/finance/budgets.test.ts | tests/unit/api/fm/finance/budgets.test.ts (fixtures) | Bugs |
| app-api-issues-id-route-ts-add-issueleandoc-type-use-issuewithkey-pattern-bugs-r | P1 | ? | 9 | unknown | /route.ts | app/api/issues/[id]/route.ts: Add IssueLeanDoc type, use issueWithKey pattern | 🚀 Enhancements / Issues (Production Readiness) |
| FM-001 | P1 | XS | 9 | pending | fm/utils/tenant.ts | 🟠 P1 | 🐛 Identified Bugs |
| CONFIG-001 | P2 | ? | 9 | pending | lib/config/tenant.server.ts | Reliability | ⚠️ Enhancements / Bugs / Test Gaps (Production Readiness) |
| PAY-001 | P1 | ? | 8 | pending | payments/tap/checkout/route.ts:251 | `payments/tap/checkout/route.ts:251` | 🐛 Identified Bugs |
| DOC-102 | P1 | M | 8 | pending | Doc-only | DOC-102 — Missing JSDoc for 51 lib utility modules (auth, payments, storage, middleware) — P1, Effort: M | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| BUG-1708 | P2 | ? | 8 | pending | app/api/upload/verify-metadata/route.ts:37-119 | app/api/upload/verify-metadata/route.ts:37-119 | Bugs |
| isolation-missing-tenant-audit-context-on-reads-workorders-workorder-dashboardst | P2 | ? | 8 | pending | Doc-only | **Isolation \| Missing tenant/audit context on reads**: workOrders, workOrder, dashboardStats, organization, property/properties, and invoice resolvers do not set tenant/audit context, bypassing tenant isolation on read paths. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| details-todo-fetch-from-database-when-multi-tenant-is-implemented-bugs-doc-only | P2 | ? | 8 | pending | Doc-only | **Details:** `// TODO: Fetch from database when multi-tenant is implemented` | Issue #2: Multi-tenant TODO |
| BUG-001 | P1 | ? | 7 | unknown | app/api/auth/otp/send/route.ts | Table rows: `\| BUG-001 \| Title \| P1 \| ...` | B) BUGS/LOGIC ERRORS |
| CART-001 | P1 | ? | 7 | pending | marketplace/cart/route.ts | `marketplace/cart/route.ts` | 🐛 Identified Bugs |
| KYC-001 | P1 | ? | 7 | pending | Doc-only | 🟠 P1 | 🐛 Identified Bugs |
| rate-limiting-audit-bugs-doc-only | P1 | ? | 7 | pending | Doc-only | Rate Limiting Audit | ✅ Session 2025-12-13T00:12 Progress |
| add-dompurify-to-10-dangerouslysetinnerhtml-usages-bugs-doc-only | P1 | ? | 7 | pending | Doc-only | Add DOMPurify to 10 dangerouslySetInnerHTML usages | 🎯 REMAINING ITEMS |
| test-coverage-gap-pattern-feature-flagged-graphql-surface-still-lacks-unit-integ | P1 | ? | 7 | pending | Doc-only | Test coverage gap pattern: feature-flagged GraphQL surface still lacks unit/integration tests; apply the same coverage model used for REST work orders (pagination, filters, authorization) to prevent regressions when the flag is enabled. | Deep-Dive: Similar/Identical Patterns to Address |
| BUG-1710 | P2 | ? | 7 | pending | app/api/upload/scan-status/route.ts:106-209 | app/api/upload/scan-status/route.ts:106-209 | Bugs |
| souq-rule-overrides-bugs-tests-unit-services-souq-rules-config-test-ts | P2 | ? | 7 | pending | tests/unit/services/souq-rules-config.test.ts | Souq rule overrides | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| DBERR-001 | P2 | ? | 7 | pending | /route.ts | Correctness | ⚠️ Enhancements / Bugs / Test Gaps (Production Readiness) |
| plan-enforce-required-org-context-for-all-query-resolvers-wrap-reads-with-tenant | P2 | ? | 7 | pending | app/api/graphql/route.ts | Plan: enforce required org context for all Query resolvers, wrap reads with tenant/audit context, normalize org once, parallelize workOrders find/count; add unit tests for org-less requests, `createGraphQLHandler` disabled/deps-missing branches, and rate-limit wrapper in `app/api/graphql/route.ts`. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| tenant-context-missing-uniformly-on-reads-unlike-mutations-no-query-resolver-wra | P2 | ? | 7 | pending | Doc-only | **Tenant context missing uniformly on reads**: Unlike Mutations, no Query resolver wraps DB access with tenant/audit context, so isolation plugins are skipped everywhere on reads. Apply the same context setup/teardown pattern used in mutations to all read paths. | 🔍 Deep-Dive: Similar/Identical Issues |
| update-test-expectations-for-tenant-role-filter-test-needs-fixing-not-code-bugs- | P2 | ? | 7 | pending | Doc-only | Update test expectations for TENANT role filter (test needs fixing, not code) | 🚀 Production Readiness Assessment |
| missing-tests-graphql-resolvers-context-building-pagination-creation-errors-tena | P2 | ? | 7 | pending | Doc-only | Missing tests: GraphQL resolvers (context building, pagination, creation errors), tenant config DB-backed path, Souq ad click negative cases, and a rerun of Playwright suite after timeout. | Enhancements / Production Readiness (Efficiency, Bugs, Logic, Missing Tests) |
| BUG-1706 | P2 | ? | 6 | pending | app/api/aqar/packages/route.ts:102-124 | app/api/aqar/packages/route.ts:102-124 | Bugs |
| missing-tests-add-negative-cases-for-invalid-metadata-non-object-non-string-keys | P2 | ? | 6 | pending | Doc-only | **Missing Tests:** Add negative cases for invalid metadata (non-object, non-string keys), invalid transition status, empty comment text/attachments payloads, and regression tests asserting error response shape and HTTP status (400). | 🛠️ Enhancements, Bugs, Logic, Missing Tests (Production Readiness) |
| DOC-105 | P2 | S | 6 | pending | Doc-only | DOC-105 — Missing inline comments for ZATCA TLV encoding logic — P2, Effort: S | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| vulnerability-product-find-id-in-productids-missing-orgid-filter-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | **Vulnerability:** `Product.find({ _id: { $in: productIds } })` missing orgId filter | 2025-12-16 21:45 (Asia/Riyadh) — P1 Security & Config Fixes Complete |
| vulnerability-souqlisting-find-id-in-listingobjectids-missing-orgid-filter-bugs- | P2 | ? | 5 | pending | Doc-only | **Vulnerability:** `SouqListing.find({ _id: { $in: listingObjectIds } })` missing orgId filter | 2025-12-16 21:45 (Asia/Riyadh) — P1 Security & Config Fixes Complete |
| tests-unit-tests-pending-for-cart-orders-routes-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | ⏳ Tests: Unit tests pending for cart/orders routes | 2025-12-16 21:45 (Asia/Riyadh) — P1 Security & Config Fixes Complete |
| TEST-003 | P2 | ? | 5 | pending | Doc-only | **TEST-003** — Finance module tests missing | 2025-12-16 20:30 (Asia/Riyadh) — Backlog Status Review |
| TEST-004 | P2 | ? | 5 | pending | subscriptionSeatService.ts | **TEST-004** — CRM module test coverage gaps | 📝 Issues Register Update |
| rotate-api-keys-in-mongodb-atlas-public-key-qefjbwzu-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Rotate API keys in MongoDB Atlas (public key: qefjbwzu) | 2025-12-16 17:00 (Asia/Riyadh) — MongoDB Atlas App Services Export |
| document-trigger-function-development-workflow-if-needed-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Document trigger/function development workflow if needed | 2025-12-16 17:00 (Asia/Riyadh) — MongoDB Atlas App Services Export |
| consider-setting-up-triggers-for-issue-tracker-sync-automation-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Consider setting up triggers for Issue Tracker sync automation | 2025-12-16 17:00 (Asia/Riyadh) — MongoDB Atlas App Services Export |
| state-open-large-divergence-from-main-89-files-1786-890-lines-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | **State**: OPEN - Large divergence from main (89 files, +1786/-890 lines) | 2025-12-16 16:30 (Asia/Riyadh) — BUILD-TS-001 Resolution + PR Pipeline Cleanup |
| monitor-for-typescript-regressions-in-queue-infrastructure-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] Monitor for TypeScript regressions in queue infrastructure | 2025-12-16 16:30 (Asia/Riyadh) — BUILD-TS-001 Resolution + PR Pipeline Cleanup |
| status-open-blocker-for-all-prs-bugs-doc-only | P2 | ? | 5 | blocked | Doc-only | Status: **OPEN** (blocker for all PRs) | 2025-12-16 08:00 (Asia/Riyadh) — PR Copilot Batch + ESLint Build Fix |
| risk-missing-required-indexes-before-build-deploy-could-cause-runtime-failures-b | P2 | ? | 5 | pending | Doc-only | Risk: Missing required indexes before build/deploy could cause runtime failures | 2025-12-15 10:15 (Asia/Riyadh) — Workflow MongoDB Index Guard Fix |
| prevents-missing-index-errors-during-sentry-sourcemap-uploads-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Prevents missing index errors during Sentry sourcemap uploads | Step conditional (line 54) |
| error-enotfound-dns-resolution-failed-for-invalid-missing-redis-url-bugs-doc-onl | P2 | ? | 5 | pending | Doc-only | Error: `ENOTFOUND` - DNS resolution failed for invalid/missing REDIS_URL | 2025-12-15 09:40 (Asia/Riyadh) — Production Redis Error Spam Fix |
| return-403-if-orgid-missing-or-invalid-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | Return 403 if orgId missing or invalid | 2025-12-14 19:15 (Asia/Riyadh) — Tenant-Isolation Fixes (Aqar + Issue Tracker) |
| gap-from-threshold-35-percentage-points-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | **Gap from threshold:** 35 percentage points | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| sourceref-code-review-openapi-yaml-n-a-bugs-openapi-yaml | P2 | ? | 5 | pending | openapi.yaml | sourceRef: code-review:openapi.yaml:N/A | Production Files (MUST FIX) |
| api-discoverability-openapi-spec-missing-new-endpoints-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | **API discoverability:** OpenAPI spec missing new endpoints | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| location-master-pending-report-md-repo-root-bugs-master-pending-report-md | P2 | ? | 5 | pending | /MASTER_PENDING_REPORT.md | Location: /MASTER_PENDING_REPORT.md (repo root) | 2025-12-14 00:00 (Asia/Riyadh) — Workspace-Wide Audit Complete + MASTER SSOT Created |
| missing-lean-10-read-only-queries-performance-optimization-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | **Missing .lean()** (10+ read-only queries) - Performance optimization | 2025-12-14 00:00 (Asia/Riyadh) — Workspace-Wide Audit Complete + MASTER SSOT Created |
| TEST-001 | P2 | ? | 5 | pending | BACKLOG_AUDIT.js | Integrated test coverage gaps from BACKLOG_AUDIT.json (TEST-001 through TEST-005) | 2) ENHANCEMENTS & FIXES (PRODUCTION READINESS) |
| cross-referenced-pending-master-sessions-with-new-findings-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | Cross-referenced PENDING_MASTER sessions with new findings | 2025-12-14 00:00 (Asia/Riyadh) — Workspace-Wide Audit Complete + MASTER SSOT Created |
| todo-fixme-0-found-in-api-routes-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | TODO/FIXME: 0 found in API routes | 2025-12-15 v65.20 — Aqar Test Coverage Complete + Code Quality 100% |
| build-breaker-bugs-scripts-verify-api-ts | P2 | ? | 5 | pending | scripts/verify-api.ts | Build breaker | Identified Bugs |
| complete-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | ✅ Complete | ✅ COMPLETED THIS SESSION |
| auth-errors-401-token-missing-expired-invalid-credentials-revoked-session-unauth | P2 | ? | 5 | pending | Doc-only | **Auth errors (401)**: Token missing/expired, invalid credentials, revoked session, UnauthorizedError | 🔍 Deep-Dive: Pattern Classification |
| BUG-1701 | P2 | ? | 5 | pending | lib/graphql/index.ts:769-801 | lib/graphql/index.ts:769-801 | Bugs |
| BUG-1703 | P2 | ? | 5 | pending | lib/graphql/index.ts:936-1052 | lib/graphql/index.ts:936-1052 | Bugs |
| BUG-1704 | P2 | ? | 5 | pending | app/api/souq/reviews/route.ts:61-108 | app/api/souq/reviews/route.ts:61-108 | Bugs |
| BUG-1705 | P2 | ? | 5 | pending | app/api/aqar/listings/route.ts:99-138 | app/api/aqar/listings/route.ts:99-138 | Bugs |
| BUG-1707 | P2 | ? | 5 | pending | app/api/aqar/favorites/route.ts:61-138 | app/api/aqar/favorites/route.ts:61-138 | Bugs |
| BUG-002 | P2 | ? | 5 | pending | lib/graphql/index.ts | BUG-002 GraphQL resolvers TODO (7) | B) BUGS/LOGIC ERRORS |
| BUG-1527 | P2 | ? | 5 | pending | Doc-only | 🟠 High | Identified Bugs |
| BUG-006 | P2 | ? | 5 | pending | Doc-only | 🟠 High | B. Bugs & Logic Errors |
| BUG-007 | P2 | ? | 5 | pending | Doc-only | 🟡 Medium | Identified Bugs |
| BUG-005 | P2 | ? | 5 | pending | /route.ts | 🟡 Medium | 🐛 BUGS & LOGIC ERRORS |
| JSON-001 | P2 | ? | 5 | pending | app/api/help/escalate/route.ts | **SILENT-HELP-JSON-001 (Moderate)** — `app/api/help/escalate/route.ts`: Malformed JSON creates tickets with missing context and no logging. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| error-rate-visibility-is-missing-add-counters-alerts-per-route-group-auth-upload | P2 | ? | 5 | pending | Doc-only | Error-rate visibility is missing; add counters/alerts per route group (auth/upload/help/OTP/AV) and structured logs (status, reason, correlation id). | 3) Bugs and Errors |
| env-enforcement-s3-guard-now-fails-fast-in-prod-consider-similar-guards-for-othe | P2 | ? | 5 | pending | Doc-only | Env enforcement: S3 guard now fails fast in prod; consider similar guards for other critical providers (email/SMS) if gaps surface. | 🔍 Deep-Dive: Similar/Identical Issues Observed |
| e2e-coverage-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | E2E coverage | 🧩 Enhancements / Bugs / Logic / Missing Tests (Production Readiness) |
| env-enforcement-gaps-s3-now-fails-fast-in-production-similar-guards-should-be-co | P2 | ? | 5 | pending | Doc-only | Env enforcement gaps: S3 now fails fast in production; similar guards should be considered for email/SMS providers to avoid silent fallbacks and misroutes. | 🔍 Deep-Dive: Similar/Identical Issues Observed |
| 6e3bb4b05-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | `6e3bb4b05` | 📍 Current Progress Summary |
| open-prs-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | **Open PRs**: | ✅ Current State |
| 5b7e425ac-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | `5b7e425ac` | 📍 Current Progress Summary |
| 100-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | 100% | 🟡 MEDIUM PRIORITY — Validation & Quality |
| env-enforcement-drift-s3-config-now-throws-in-production-when-missing-ensure-dep | P2 | ? | 5 | pending | Doc-only | Env enforcement drift: S3 config now throws in production when missing; ensure deployment pipelines set AWS_REGION/AWS_S3_BUCKET explicitly. `validateAwsConfig` guard prevents silent fallbacks. | 🔍 Deep-Dive: Similar/Identical Issues Observed |
| branch-feat-marketplace-api-tests-working-tree-already-dirty-from-prior-sessions | P2 | ? | 5 | unknown | app/about/page.ts | Branch: `feat/marketplace-api-tests`; working tree already dirty from prior sessions (`app/about/page.tsx`, `app/api/hr/leaves/route.ts`, `app/api/hr/payroll/runs/route.ts`, `app/api/souq/ads/clicks/route.ts`, `app/api/webhooks/taqnyat/route.ts`). | 🔐 Security Audit |
| config-enforcement-for-hardcoded-sensitive-values-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | Config enforcement for hardcoded-sensitive values | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| 33-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | 33% | 📊 Production Readiness Score |
| missing-tests-add-coverage-for-auth-gated-monitoring-start-backoff-alert-posting | P2 | ? | 5 | pending | Doc-only | **Missing Tests**: Add coverage for auth-gated monitoring start/backoff/alert posting, and for OTP/forgot-password happy/error paths. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| auth-flows-failing-together-both-otp-send-and-forgot-password-endpoints-return-5 | P2 | ? | 5 | pending | Doc-only | **Auth flows failing together**: Both OTP send and forgot-password endpoints return 500, indicating a shared backend/config gap; fix once and add tests to prevent repeat failures across auth flows. | 🔍 Deep-Dive: Similar/Identical Issues |
| bugs-logic-auto-monitor-unauthorized-calls-otp-send-and-forgot-password-500s-hea | P2 | ? | 5 | pending | Doc-only | Bugs/logic: auto-monitor unauthorized calls; OTP send and forgot password 500s; health monitoring without auth; error handling gaps. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| missing-tests-auth-gated-monitoring-error-handling-otp-forgot-password-flows-qa- | P2 | ? | 5 | pending | Doc-only | Missing tests: auth-gated monitoring, error handling, OTP/forgot-password flows, QA reconnect/alert guard. | 🧩 Enhancements / Bugs / Logic / Missing Tests (Prod Readiness) |
| auto-monitor-pattern-reused-across-components-triggering-unauthenticated-loops-n | P2 | ? | 5 | pending | Doc-only | Auto-monitor pattern reused across components triggering unauthenticated loops; needs centralized guard. | 🔍 Deep-Dive: Similar/Identical Issues |
| 36-blocking-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | 36 blocking | 📍 Current Progress Summary |
| BUG-004 | P2 | ? | 5 | pending | app/api/souq/reviews/route.ts:61-108 | Souq review POST no org | B) BUGS/LOGIC ERRORS |
| increase-rate-limiting-coverage-34-60-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | Increase rate limiting coverage (34% → 60%) | 🎯 REMAINING ITEMS |
| audit-21-console-statements-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | Audit 21 console statements | 🎯 REMAINING ITEMS |
| investigate-playwright-timeout-issues-unrelated-to-production-code-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | Investigate Playwright timeout issues (unrelated to production code) | 🚀 Production Readiness Assessment |
| new-task-source-drift-categorized-tasks-list-deprecated-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | [ ] **🟡 New Task source drift (CATEGORIZED_TASKS_LIST deprecated)** | 🟢 Cleanup & Governance |
| fix-direction-update-anchors-to-use-pending-master-or-restore-refresh-categorize | P2 | ? | 5 | pending | Doc-only | **Fix Direction:** Update anchors to use PENDING_MASTER or restore/refresh categorized list. | 🟢 Cleanup & Governance |
| missing-tests-prod-readiness-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | **Missing Tests (prod readiness)** | Comprehensive Enhancements / Bugs / Missing Tests (production focus) |
| typecheck-currently-failing-at-lib-finance-checkout-ts-171-itapinfo-missing-char | P2 | ? | 5 | pending | lib/finance/checkout.ts:171 | Typecheck currently failing at `lib/finance/checkout.ts:171` (ITapInfo missing `chargeId`); lint unchanged; tests above passing. | 🧪 Verification |
| TYPE-001 | P2 | ? | 5 | pending | lib/finance/checkout.ts:171 | ITapInfo missing `chargeId` on checkout payload | Bugs / Logic / Security |
| SEC-005 | P2 | ? | 5 | pending | Doc-only | Rate limiting gaps | Security |
| OPS-002 | P2 | ? | 5 | pending | Doc-only | DevOps | Enhancements / Bugs / Logic / Missing Tests (Prod Readiness Focus) |
| monitoring-assets-unvalidated-grafana-alerts-dashboards-mirror-the-missing-gate- | P2 | ? | 5 | pending | Doc-only | **Monitoring assets unvalidated** (Grafana alerts/dashboards) mirror the missing gate issue seen with translation/ts-prune; add a generic lint/validate step to avoid silent drift. | Deep-Dive: Similar Issues Patterning |
| BUG-009 | P2 | ? | 5 | pending | app/api/webhooks/sendgrid/route.ts:82 | Uncaught JSON.parse | 🎯 Current Status & Next Steps (Top 5) |
| todo-fixme-comments-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | TODO/FIXME comments | Category H: Historical Backlog (Future Sprints) |
| add-this-variable-code-expects-taqnyat-sender-name-not-taqnyat-sender-id-bugs-do | P2 | ? | 5 | pending | Doc-only | Add this variable (code expects `TAQNYAT_SENDER_NAME`, not `TAQNYAT_SENDER_ID`) | ISSUE-VERCEL-001: Production Environment Variables |
| todo-fixme-comments-audit-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | TODO/FIXME Comments Audit | ✅ COMPLETED (December 2025 Session) |
| fm-module-tests-bugs-doc-only | P2 | ? | 5 | pending | Doc-only | FM Module Tests | 🟧 HIGH Priority |
| BUG-1711 | P2 | ? | 5 | pending | Doc-only | domain/aqar (late fee calc patterns) | Bugs |
| DOC-103 | P2 | L | 5 | pending | Doc-only | DOC-103 — Missing JSDoc for 124 Mongoose model schemas (server/models) — P2, Effort: L | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| DOC-108 | P2 | M | 5 | pending | Doc-only | DOC-108 — Missing API endpoint documentation in OpenAPI spec — P2, Effort: M | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| DOC-109 | P2 | M | 5 | pending | Doc-only | DOC-109 — Missing error response documentation for API routes — P2, Effort: M | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| DOC-106 | P2 | S | 5 | pending | Doc-only | DOC-106 — Missing README for backlog tracker feature — P2, Effort: S | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| BUG-003 | P2 | S | 5 | pending | lib/graphql/index.ts:936-1052 | 🟠 High | B) BUGS/LOGIC ERRORS |
| DOC-104 | P2 | XS | 5 | pending | Doc-only | DOC-104 — Missing function-level JSDoc for superadmin issues CRUD endpoints — P2, Effort: XS | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| ts-expect-error-3-uses-2-have-justifications-1-needs-docs-bugs-doc-only | P3 | ? | 3 | pending | Doc-only | @ts-expect-error: 3 uses, 2 have justifications (1 needs docs) | 2025-12-14 00:00 (Asia/Riyadh) — Workspace-Wide Audit Complete + MASTER SSOT Created |
| BUG-1528 | P3 | ? | 3 | pending | docs/analysis/COMPREHENSIVE_DEPLOYMENT_AUDIT.md:177-180 | 🟡 Medium | Identified Bugs |
| branch-docs-pending-v60-active-bugs-doc-only | P3 | ? | 3 | pending | Doc-only | **Branch**: `docs/pending-v60` (active) | ✅ Current State |
| pr-549-docs-pending-v59-souq-rules-config-5-new-tests-bugs-doc-only | P3 | ? | 3 | pending | Doc-only | PR #549: `docs/pending-v59` — Souq rules-config + 5 new tests | ✅ Current State |
| pr-550-docs-pending-v60-orgid-audit-complete-test-fixes-bugs-doc-only | P3 | ? | 3 | pending | Doc-only | PR #550: `docs/pending-v60` — orgId audit complete + test fixes | ✅ Current State |
| reconcile-docs-categorized-tasks-list-md-status-with-context-anchors-either-revi | P3 | ? | 3 | pending | docs/CATEGORIZED_TASKS_LIST.md | Reconcile `docs/CATEGORIZED_TASKS_LIST.md` status with context anchors (either revive or update anchors to point to `docs/PENDING_MASTER.md`). | 🟢 Cleanup & Governance |
| missing-docstrings-bugs-doc-only | P3 | ? | 3 | pending | Doc-only | Missing docstrings | Category H: Historical Backlog (Future Sprints) |
| DOC-107 | P3 | XS | 3 | pending | Doc-only | DOC-107 — Missing TypeScript interface documentation for BacklogIssue types — P3, Effort: XS | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |
| DOC-110 | P3 | XS | 3 | pending | Doc-only | DOC-110 — Missing deployment checklist for backlog tracker — P3, Effort: XS | 2025-12-14 18:30 (Asia/Riyadh) — Documentation Coverage Audit |

## Open Questions
| Key | Field | Reason |
| --- | --- | --- |
| commit-pending-next-steps-doc-only | effort | Scope unclear in source |
| all-validation-gaps-addressed-null-checks-input-validation-next-steps-doc-only | effort | Scope unclear in source |
| none-staged-in-docs-backlog-audit-json-import-pending-missing-tests-docs-backlog | effort | Scope unclear in source |
| opt-in-defaults-for-missing-preferences-logic-errors-services-admin-notification | effort | Scope unclear in source |
| distributed-tracing-opentelemetry-logic-errors-doc-only | effort | Scope unclear in source |
| gap-logic-errors-doc-only | effort | Scope unclear in source |
| dashboard-tenant-count-active-users-open-wos-system-health-alerts-logic-errors-d | effort | Scope unclear in source |
| DASH-001 | effort | Scope unclear in source |
| QUOTA-001 | effort | Scope unclear in source |
| impersonation-history-not-tracked-logic-errors-doc-only | effort | Scope unclear in source |
| no-webhook-management-ui-logic-errors-doc-only | effort | Scope unclear in source |
| EMAIL-001 | effort | Scope unclear in source |
| no-scheduled-tasks-ui-logic-errors-doc-only | effort | Scope unclear in source |
| VENDOR-001 | effort | Scope unclear in source |
| catalog-missing-businessmodel-filter-logic-errors-doc-only | effort | Scope unclear in source |
| fm-services-not-in-catalog-logic-errors-doc-only | effort | Scope unclear in source |
| status-open-awaiting-review-logic-errors-doc-only | effort | Scope unclear in source |
| open-ready-for-review-missing-tests-doc-only | effort | Scope unclear in source |
| feat-issue-152-assets-form-validation-missing-tests-doc-only | effort | Scope unclear in source |
| sub-pr-missing-tests-doc-only | effort | Scope unclear in source |
| blocked-missing-tests-doc-only | effort | Scope unclear in source |
| github-ci-billing-block-missing-tests-doc-only | effort | Scope unclear in source |
| AGENT-001 | effort | Scope unclear in source |
| create-pr-for-review-next-steps-doc-only | effort | Scope unclear in source |
| after-codex-approval-deploy-to-production-next-steps-doc-only | effort | Scope unclear in source |
| verify-production-login-flow-works-after-rate-limit-resets-next-steps-doc-only | effort | Scope unclear in source |
| fix-test-add-missing-connecttodatabase-mock-to-claims-refund-processor-test-next | effort | Scope unclear in source |
| rtl-compliance-clean-all-physical-classes-converted-to-logical-next-steps-doc-on | effort | Scope unclear in source |
| security-clean-no-vulnerabilities-found-next-steps-doc-only | effort | Scope unclear in source |
| tests-2918-passing-next-steps-doc-only | effort | Scope unclear in source |
| typescript-0-errors-next-steps-doc-only | effort | Scope unclear in source |
| eslint-0-errors-next-steps-doc-only | effort | Scope unclear in source |
| monitor-auto-assignment-engine-for-any-runtime-errors-next-steps-doc-only | effort | Scope unclear in source |
| verify-system-automated-work-orders-create-correctly-with-null-assignedby-next-s | effort | Scope unclear in source |
| none-missing-tests-doc-only | effort | Scope unclear in source |
| await-codex-review-gate-agents-md-section-14-next-steps-agents-md | effort | Scope unclear in source |
| pending-user-configuration-next-steps-doc-only | effort | Scope unclear in source |
| zatca-api-key-next-steps-doc-only | effort | Scope unclear in source |
| pending-user-action-next-steps-doc-only | effort | Scope unclear in source |
| x-fix-vendor-products-route-test-ts-mock-isolation-next-steps-vendor-products-ro | effort | Scope unclear in source |
| x-fix-7-mongoose-mock-test-files-next-steps-doc-only | effort | Scope unclear in source |
| x-push-fixes-e7c3c5d9c-next-steps-doc-only | effort | Scope unclear in source |
| wait-for-ci-to-complete-and-verify-tests-server-4-4-passes-next-steps-doc-only | effort | Scope unclear in source |
| address-remaining-pr-601-review-comments-next-steps-doc-only | effort | Scope unclear in source |
| merge-pr-601-after-all-ci-checks-pass-next-steps-doc-only | effort | Scope unclear in source |
| x-run-full-test-suite-to-verify-timer-isolation-fix-works-314s-all-pass-next-ste | effort | Scope unclear in source |
| address-remaining-pr-review-comments-design-tokens-css-question-next-steps-desig | effort | Scope unclear in source |
| merge-pr-601-after-ci-passes-next-steps-doc-only | effort | Scope unclear in source |
| tests-unit-services-work-order-status-race-test-ts-next-steps-tests-unit-service | effort | Scope unclear in source |
| tests-unit-security-multi-tenant-isolation-test-ts-next-steps-tests-unit-securit | effort | Scope unclear in source |
| tests-unit-server-services-onboardingentities-test-ts-next-steps-tests-unit-serv | effort | Scope unclear in source |
| tests-unit-api-issues-issues-route-test-ts-next-steps-tests-unit-api-issues-issu | effort | Scope unclear in source |
| tests-unit-api-admin-users-route-test-ts-next-steps-tests-unit-api-admin-users-r | effort | Scope unclear in source |
| tests-unit-api-admin-users-users-route-test-ts-next-steps-tests-unit-api-admin-u | effort | Scope unclear in source |
| tests-server-services-owner-financeintegration-test-ts-next-steps-tests-server-s | effort | Scope unclear in source |
| tests-models-aqarbooking-test-ts-next-steps-tests-models-aqarbooking-test-ts | effort | Scope unclear in source |
| tests-api-superadmin-organizations-route-test-ts-next-steps-tests-api-superadmin | effort | Scope unclear in source |
| tests-api-admin-users-route-test-ts-next-steps-tests-api-admin-users-route-test- | effort | Scope unclear in source |
| ci-sharded-typecheck-next-steps-doc-only | effort | Scope unclear in source |
| announce-completion-next-steps-doc-only | effort | Scope unclear in source |
| notify-eng-sultan-next-steps-doc-only | effort | Scope unclear in source |
| wait-for-codex-approved-next-steps-doc-only | effort | Scope unclear in source |
| awaiting-next-steps-doc-only | effort | Scope unclear in source |
| tests-i18n-scan-mjs-error-boundary-exclusions-next-steps-tests-i18n-scan-mjs | effort | Scope unclear in source |
| github-workflows-route-quality-yml-rtl-smoke-auth-secrets-next-steps-github-work | effort | Scope unclear in source |
| github-workflows-qa-yml-heap-memory-increase-next-steps-github-workflows-qa-yml | effort | Scope unclear in source |
| scripts-ci-check-critical-env-ts-redis-removed-tap-vercel-aware-next-steps-scrip | effort | Scope unclear in source |
| scripts-check-nav-routes-ts-route-group-mappings-next-steps-scripts-check-nav-ro | effort | Scope unclear in source |
| lib-db-collections-ts-index-sparse-partial-fix-next-steps-lib-db-collections-ts | effort | Scope unclear in source |
| lib-ai-embeddings-embeddings-ts-renamed-from-ai-next-steps-lib-ai-embeddings-emb | effort | Scope unclear in source |
| lib-mongo-ts-top-level-await-fix-next-steps-lib-mongo-ts | effort | Scope unclear in source |
| pending-master-update-missing-tests-doc-only | effort | Scope unclear in source |
| announce-complete-next-steps-doc-only | effort | Scope unclear in source |
| redis-removed-entirely-from-check-critical-env-ts-not-just-skipped-next-steps-ch | effort | Scope unclear in source |
| tap-payments-kept-strict-payment-infrastructure-next-steps-doc-only | effort | Scope unclear in source |
| ai-folder-conflict-renamed-to-lib-ai-embeddings-next-steps-doc-only | effort | Scope unclear in source |
| github-workflows-e2e-tests-yml-quoted-github-output-next-steps-github-workflows- | effort | Scope unclear in source |
| kb-ingest-ts-updated-import-path-next-steps-kb-ingest-ts | effort | Scope unclear in source |
| scripts-kb-change-stream-ts-updated-import-path-next-steps-scripts-kb-change-str | effort | Scope unclear in source |
| app-api-help-ask-route-ts-updated-import-path-next-steps-app-api-help-ask-route- | effort | Scope unclear in source |
| qa-workflow-should-pass-after-redis-removal-next-steps-doc-only | effort | Scope unclear in source |
| route-quality-should-pass-after-nav-path-fix-next-steps-doc-only | effort | Scope unclear in source |
| test-runner-should-pass-after-index-fix-next-steps-doc-only | effort | Scope unclear in source |
| changed-flag-local-ai-folder-conflicts-with-ai-npm-package-next-steps-doc-only | effort | Scope unclear in source |
| depends-on-above-fixes-next-steps-doc-only | effort | Scope unclear in source |
| mongodb-safe-pattern-scripts-assert-nonprod-mongo-ts-next-steps-scripts-assert-n | effort | Scope unclear in source |
| removed-fixzit-from-production-patterns-ci-legitimately-uses-this-db-next-steps- | effort | Scope unclear in source |
| rtl-lint-components-i18n-currencychangeconfirmdialog-tsx-50-next-steps-component | effort | Scope unclear in source |
| changed-text-right-text-left-text-end-text-start-next-steps-doc-only | effort | Scope unclear in source |
| lines-64-72-grouped-echo-github-step-summary-into-github-step-summary-next-steps | effort | Scope unclear in source |
| lines-258-263-grouped-echo-github-env-next-steps-doc-only | effort | Scope unclear in source |
| lines-514-521-grouped-summary-output-next-steps-doc-only | effort | Scope unclear in source |
| vitest-ai-dep-vitest-config-ts-missing-tests-vitest-config-ts | effort | Scope unclear in source |
| scripts-check-tenant-role-drift-ts-allowed-roles-synced-with-canonical-roles-nex | effort | Scope unclear in source |
| scripts-seed-demo-users-ts-default-org-id-env-var-replaced-6-hardcoded-ids-next- | effort | Scope unclear in source |
| scripts-create-demo-users-ts-default-org-id-with-validation-next-steps-scripts-c | effort | Scope unclear in source |
| scripts-seed-test-users-ts-test-org-id-default-org-id-pattern-next-steps-scripts | effort | Scope unclear in source |
| scripts-seed-e2e-test-users-ts-same-pattern-next-steps-scripts-seed-e2e-test-use | effort | Scope unclear in source |
| scripts-cleanup-test-users-ts-test-org-id-env-var-support-next-steps-scripts-cle | effort | Scope unclear in source |
| scripts-count-null-employeeid-ts-test-org-id-with-validation-next-steps-scripts- | effort | Scope unclear in source |
| lib-config-demo-users-ts-corporate-roles-canonical-displayrole-next-steps-lib-co | effort | Scope unclear in source |
| before-drift-check-failing-with-6-violations-non-canonical-roles-hardcoded-org-i | effort | Scope unclear in source |
| after-drift-check-passes-all-seed-scripts-use-env-vars-roles-match-canonical-rol | effort | Scope unclear in source |
| fail-next-steps-doc-only | effort | Scope unclear in source |
| 218-translation-keys-missing-in-en-json-ar-json-next-steps-en-json-ar-js | effort | Scope unclear in source |
| missing-redis-url-redis-key-in-ci-next-steps-doc-only | effort | Scope unclear in source |
| rtl-styles-animations-css-l17-35-defines-css-vars-l86-109-defines-rtl-aware-keyf | effort | Scope unclear in source |
| animation-presets-lib-theme-useanimation-ts-l19-21-adds-types-l453-464-adds-pres | effort | Scope unclear in source |
| client-test-2-2-failure-export-worker-process-test-ts-requires-redis-config-redi | effort | Scope unclear in source |
| test-runner-failure-drift-guard-detects-non-canonical-roles-in-seed-scripts-next | effort | Scope unclear in source |
| artifact-naming-colons-in-artifact-names-rejected-by-github-actions-next-steps-d | effort | Scope unclear in source |
| gemini-promise-resolve-comment-false-positive-next-js-15-uses-async-params-tests | effort | Scope unclear in source |
| coderabbit-jsonc-formatting-nitpick-non-blocking-next-steps-doc-only | effort | Scope unclear in source |
| coderabbit-toast-docs-nitpick-non-blocking-next-steps-doc-only | effort | Scope unclear in source |
| tests-api-filters-presets-route-test-ts-static-imports-fix-next-steps-tests-api- | effort | Scope unclear in source |
| deleted-420-stub-test-files-next-steps-doc-only | effort | Scope unclear in source |
| deleted-20-empty-bracket-folders-next-steps-doc-only | effort | Scope unclear in source |
| styles-tokens-css-ssot-design-tokens-next-steps-styles-tokens-css | effort | Scope unclear in source |
| lib-theme-index-ts-exports-next-steps-lib-theme-index-ts | effort | Scope unclear in source |
| components-ui-icon-tsx-token-classes-next-steps-components-ui-icon-ts | effort | Scope unclear in source |
| styles-globals-css-imports-next-steps-styles-globals-css | effort | Scope unclear in source |
| components-ui-icons-ts-central-barrel-file-next-steps-components-ui-icons-ts | effort | Scope unclear in source |
| re-exports-all-icons-from-lucide-react-next-steps-doc-only | effort | Scope unclear in source |
| exports-icon-iconbutton-iconsizemap-iconcolormap-next-steps-doc-only | effort | Scope unclear in source |
| exports-types-iconprops-iconbuttonprops-iconsize-iconcolor-lucideicon-lucideprop | effort | Scope unclear in source |
| default-1-5px-stroke-weight-dga-standard-next-steps-doc-only | effort | Scope unclear in source |
| size-variants-xs-12-sm-16-md-20-lg-24-xl-32-next-steps-doc-only | effort | Scope unclear in source |
| color-variants-default-primary-0061a8-success-00a859-warning-ffb400-error-muted- | effort | Scope unclear in source |
| iconbutton-with-44px-minimum-touch-target-next-steps-doc-only | effort | Scope unclear in source |
| all-6-066-source-files-confirmed-present-app-754-lib-243-server-220-components-2 | effort | Scope unclear in source |
| vs-code-problems-panel-showed-stale-errors-actual-typecheck-passes-next-steps-do | effort | Scope unclear in source |
| TYPES-002 | effort | Scope unclear in source |
| created-types-xmlbuilder2-d-ts-type-declarations-for-xml-builder-next-steps-type | effort | Scope unclear in source |
| p0-fix-rate-limit-test-assertions-check-if-routes-actually-implement-rate-limiti | effort | Scope unclear in source |
| p1-fix-react-import-in-client-component-tests-next-steps-doc-only | effort | Scope unclear in source |
| p2-address-eslint-no-unused-vars-across-copied-files-next-steps-doc-only | effort | Scope unclear in source |
| p3-clean-up-nested-project-folders-fixzit-fixzit-fresh-fixzit-tenant-next-steps- | effort | Scope unclear in source |
| as-any-occurrences-15-found-across-issues-superadmin-routes-next-steps-doc-only | effort | Scope unclear in source |
| ts-expect-error-2-found-justified-3rd-party-libs-next-steps-doc-only | effort | Scope unclear in source |
| console-log-in-prod-1-found-jsdoc-example-not-actual-code-next-steps-doc-only | effort | Scope unclear in source |
| TYPES-001 | effort | Scope unclear in source |
| app-api-issues-import-route-ts-use-request-json-directly-add-issueleandoc-type-n | effort | Scope unclear in source |
| app-api-issues-route-ts-import-iissue-cast-duplicates-properly-next-steps-app-ap | effort | Scope unclear in source |
| app-api-issues-id-route-ts-add-issueleandoc-type-use-issuewithkey-pattern-bugs-r | effort | Scope unclear in source |
| app-api-superadmin-login-route-ts-use-request-json-directly-next-steps-app-api-s | effort | Scope unclear in source |
| app-api-superadmin-branding-route-ts-add-platformsettingswithaudit-type-for-audi | effort | Scope unclear in source |
| eslint-0-errors-1-warning-expected-vitest-comment-next-steps-doc-only | effort | Scope unclear in source |
| 17-items-efficiency-doc-only | effort | Scope unclear in source |
| ALT-001 | effort | Scope unclear in source |
| TODO-001 | effort | Scope unclear in source |
| 0-efficiency-doc-only | effort | Scope unclear in source |
| nav-missing-001-efficiency-doc-only | effort | Scope unclear in source |
| bug-wo-filters-missing-efficiency-doc-only | effort | Scope unclear in source |
| bug-users-filters-missing-efficiency-doc-only | effort | Scope unclear in source |
| bug-employees-filters-missing-efficiency-doc-only | effort | Scope unclear in source |
| bug-invoices-filters-missing-efficiency-doc-only | effort | Scope unclear in source |
| bug-auditlogs-filters-missing-efficiency-doc-only | effort | Scope unclear in source |
| test-coverage-gap-efficiency-doc-only | effort | Scope unclear in source |
| 0-open-efficiency-doc-only | effort | Scope unclear in source |
| docs-pending-master-md-this-entry-efficiency-docs-pending-master-md | effort | Scope unclear in source |
| ADR-001 | effort | Scope unclear in source |
| open-0-items-efficiency-doc-only | effort | Scope unclear in source |
| infra-sentry-q1-2026-activate-sentry-needs-dsn-logic-errors-doc-only | effort | Scope unclear in source |
| infra-sentry-logic-errors-doc-only | effort | Scope unclear in source |
| open-logic-errors-doc-only | effort | Scope unclear in source |
| LOGIC-001 | effort | Scope unclear in source |
| COMP-001 | effort | Scope unclear in source |
| start-dev-server-and-sync-backlog-audit-json-to-mongodb-via-post-api-issues-impo | effort | Scope unclear in source |
| 6-superadmin-pages-exist-but-are-missing-from-navigation-nav-missing-001-logic-e | effort | Scope unclear in source |
| area-logic-errors-doc-only | effort | Scope unclear in source |
| public-static-routes-app-api-public-app-api-docs-openapi-app-api-help-articles-a | effort | Scope unclear in source |
| api-route-app-api-superadmin-ssot-route-ts-protected-endpoint-to-read-pending-ma | effort | Scope unclear in source |
| test-coverage-gap-api-test-coverage-now-101-9-376-369-routes-missing-tests-doc-o | effort | Scope unclear in source |
| bug-wo-filters-missing-serializefilters-on-line-189-missing-tests-doc-only | effort | Scope unclear in source |
| bug-users-filters-missing-serializefilters-on-line-127-missing-tests-doc-only | effort | Scope unclear in source |
| bug-employees-filters-missing-serializefilters-on-line-137-missing-tests-doc-onl | effort | Scope unclear in source |
| bug-invoices-filters-missing-serializefilters-on-line-170-missing-tests-doc-only | effort | Scope unclear in source |
| bug-auditlogs-filters-missing-serializefilters-on-line-130-missing-tests-doc-onl | effort | Scope unclear in source |
| review-db-collection-usages-for-tenant-scoping-gaps-missing-tests-doc-only | effort | Scope unclear in source |
| expanded-invoice-statusstyles-to-include-pending-and-sent-missing-tests-doc-only | effort | Scope unclear in source |
| blocker-001-vercel-build-failing-webpack-module-not-found-needs-investigation-mi | effort | Scope unclear in source |
| tests-aggregate-tests-6-6-passing-full-suite-pending-missing-tests-doc-only | effort | Scope unclear in source |
| component-test-coverage-gap-7-15-217-components-tested-deferred-to-phase-4-missi | effort | Scope unclear in source |
| test-coverage-needs-improvement-api-24-component-7-missing-tests-doc-only | effort | Scope unclear in source |
| db-sync-pending-mongodb-offline-blocked-missing-tests-doc-only | effort | Scope unclear in source |
| bug-wo-filters-missing-local-sourceref-code-review-components-fm-workordersviewn | effort | Scope unclear in source |
| bug-users-filters-missing-local-sourceref-code-review-components-administration- | effort | Scope unclear in source |
| bug-employees-filters-missing-local-sourceref-code-review-components-hr-employee | effort | Scope unclear in source |
| bug-invoices-filters-missing-local-sourceref-code-review-components-finance-invo | effort | Scope unclear in source |
| bug-auditlogs-filters-missing-local-sourceref-code-review-components-administrat | effort | Scope unclear in source |
| UX-001 | effort | Scope unclear in source |
| TEST-002 | effort | Scope unclear in source |
| test-coverage-needs-improvement-24-api-coverage-88-367-routes-tested-missing-tes | effort | Scope unclear in source |
| none-backlog-items-already-captured-import-pending-missing-tests-doc-only | effort | Scope unclear in source |
| bug-wo-filters-missing-sourceref-code-review-components-fm-workordersviewnew-tsx | effort | Scope unclear in source |
| bug-wo-filters-missing-include-overdue-assignment-filters-in-api-params-tests-mi | effort | Scope unclear in source |
| bug-users-filters-missing-wire-inactivedays-lastlogin-filters-into-query-chips-m | effort | Scope unclear in source |
| bug-employees-filters-missing-add-joiningdate-reviewdue-filters-to-query-chips-m | effort | Scope unclear in source |
| bug-invoices-filters-missing-wire-daterange-customer-filters-into-query-chips-mi | effort | Scope unclear in source |
| bug-auditlogs-filters-missing-add-daterange-action-filters-to-query-chips-missin | effort | Scope unclear in source |
| x-documentation-pending-master-md-updated-with-complete-inventory-missing-tests- | effort | Scope unclear in source |
| features-quick-chips-open-urgent-overdue-due-today-url-sync-sort-dropdown-row-cl | effort | Scope unclear in source |
| leaverequestslist-tsx-527-lines-new-status-leave-type-period-quick-stats-pending | effort | Scope unclear in source |
| compact-encoding-filters-status-open-priority-high-not-verbose-json-missing-test | effort | Scope unclear in source |
| multi-select-checkboxes-with-counts-e-g-open-12-missing-tests-doc-only | effort | Scope unclear in source |
| components-fm-workordersview-tsx-refactoring-in-progress-by-other-agent-missing- | effort | Scope unclear in source |
| pr-creation-open-pr-for-feat-superadmin-branding-main-missing-tests-doc-only | effort | Scope unclear in source |
| p2-missing-tests-doc-only | effort | Scope unclear in source |
| when-superadmin-clicks-these-links-middleware-detects-missing-orgid-redirects-to | effort | Scope unclear in source |
| investigate-refresh-replay-test-ts-failure-p2-2-hours-missing-tests-refresh-repl | effort | Scope unclear in source |
| root-cause-missing-orgid-filters-on-crmlead-and-crmactivity-operations-missing-t | effort | Scope unclear in source |
| master-pending-report-md-commit-b44beaa7e-mongodb-25-1-8-efficiency-master-pendi | effort | Scope unclear in source |
| statushistory-tracks-status-changes-from-open-baseline-efficiency-doc-only | effort | Scope unclear in source |
| legacy-repair-unscoped-docs-missing-orgid-auto-repaired-on-update-prevents-silen | effort | Scope unclear in source |
| commit-pending-push-2-files-changed-efficiency-doc-only | effort | Scope unclear in source |
| commit-pending-push-efficiency-doc-only | effort | Scope unclear in source |
| token-warnings-2-items-renovate-token-openai-key-context-warnings-valid-usage-pa | effort | Scope unclear in source |
| TENANT-001 | effort | Scope unclear in source |
| rationale-crm-routes-use-resolveuser-which-returns-null-for-both-missing-auth-an | effort | Scope unclear in source |
| validation-rate-limiting-authentication-permissions-missing-tenant-scope-missing | effort | Scope unclear in source |
| 401-403-missing-tenant-scope-orgid-missing-tests-doc-only | effort | Scope unclear in source |
| DOC-101 | effort | Scope unclear in source |
| TEST-005 | effort | Scope unclear in source |
| backlog-audit-refreshed-with-12-evidence-backed-open-items-efficiency-doc-only | effort | Scope unclear in source |
| start-api-server-for-db-import-efficiency-doc-only | effort | Scope unclear in source |
| SEC-002 | effort | Scope unclear in source |
| has-openai-key-secrets-openai-key-efficiency-doc-only | effort | Scope unclear in source |
| if-env-has-openai-key-true-efficiency-doc-only | effort | Scope unclear in source |
| vulnerability-product-find-id-in-productids-missing-orgid-filter-bugs-doc-only | effort | Scope unclear in source |
| vulnerability-souqlisting-find-id-in-listingobjectids-missing-orgid-filter-bugs- | effort | Scope unclear in source |
| tests-unit-tests-pending-for-cart-orders-routes-bugs-doc-only | effort | Scope unclear in source |
| TEST-003 | effort | Scope unclear in source |
| TEST-004 | effort | Scope unclear in source |
| rotate-api-keys-in-mongodb-atlas-public-key-qefjbwzu-bugs-doc-only | effort | Scope unclear in source |
| document-trigger-function-development-workflow-if-needed-bugs-doc-only | effort | Scope unclear in source |
| consider-setting-up-triggers-for-issue-tracker-sync-automation-bugs-doc-only | effort | Scope unclear in source |
| state-open-large-divergence-from-main-89-files-1786-890-lines-bugs-doc-only | effort | Scope unclear in source |
| monitor-for-typescript-regressions-in-queue-infrastructure-bugs-doc-only | effort | Scope unclear in source |
| status-open-blocker-for-all-prs-bugs-doc-only | effort | Scope unclear in source |
| risk-missing-required-indexes-before-build-deploy-could-cause-runtime-failures-b | effort | Scope unclear in source |
| prevents-missing-index-errors-during-sentry-sourcemap-uploads-bugs-doc-only | effort | Scope unclear in source |
| error-enotfound-dns-resolution-failed-for-invalid-missing-redis-url-bugs-doc-onl | effort | Scope unclear in source |
| return-403-if-orgid-missing-or-invalid-bugs-doc-only | effort | Scope unclear in source |
| gap-from-threshold-35-percentage-points-bugs-doc-only | effort | Scope unclear in source |
| sourceref-code-review-openapi-yaml-n-a-bugs-openapi-yaml | effort | Scope unclear in source |
| critical-gap-51-lib-modules-without-documentation-includes-auth-security-middlew | effort | Scope unclear in source |
| api-discoverability-openapi-spec-missing-new-endpoints-bugs-doc-only | effort | Scope unclear in source |
| location-master-pending-report-md-repo-root-bugs-master-pending-report-md | effort | Scope unclear in source |
| missing-lean-10-read-only-queries-performance-optimization-bugs-doc-only | effort | Scope unclear in source |
| ts-expect-error-3-uses-2-have-justifications-1-needs-docs-bugs-doc-only | effort | Scope unclear in source |
| TEST-001 | effort | Scope unclear in source |
| cross-referenced-pending-master-sessions-with-new-findings-bugs-doc-only | effort | Scope unclear in source |
| todo-fixme-0-found-in-api-routes-bugs-doc-only | effort | Scope unclear in source |
| 13-missing-tests-doc-only | effort | Scope unclear in source |
| branch-docs-pending-v60-deleted-locally-and-remotely-missing-tests-doc-only | effort | Scope unclear in source |
| 0-open-prs-remaining-missing-tests-doc-only | effort | Scope unclear in source |
| coderabbit-missing-tests-server-security-health-token-ts-25 | effort | Scope unclear in source |
| fallback-logic-falls-back-to-auth-secret-when-nextauth-secret-missing-missing-te | effort | Scope unclear in source |
| test-2-validates-production-runtime-error-when-both-missing-missing-tests-doc-on | effort | Scope unclear in source |
| 9-missing-tests-doc-only | effort | Scope unclear in source |
| CONFIG-002 | effort | Scope unclear in source |
| 9-was-8-missing-tests-doc-only | effort | Scope unclear in source |
| 10-missing-tests-doc-only | effort | Scope unclear in source |
| missing-tests-6-missing-tests-doc-only | effort | Scope unclear in source |
| none-no-new-issues-beyond-pending-master-open-items-missing-tests-doc-only | effort | Scope unclear in source |
| EFF-004 | effort | Scope unclear in source |
| BUG-011 | effort | Scope unclear in source |
| docs-pending-v60-missing-tests-doc-only | effort | Scope unclear in source |
| BUG-010 | effort | Scope unclear in source |
| 53800eee4-logic-errors-doc-only | effort | Scope unclear in source |
| in-progress-logic-errors-doc-only | effort | Scope unclear in source |
| EFF-001 | effort | Scope unclear in source |
| module-missing-tests-doc-only | effort | Scope unclear in source |
| app-api-pm-plans-route-ts-43-fmpmplan-find-query-needs-org-id-injection-missing- | effort | Scope unclear in source |
| add-rate-limiting-to-superadmin-routes-pending-limiter-hardening-next-steps-doc- | effort | Scope unclear in source |
| add-rate-limiting-to-issues-api-routes-pending-limiter-hardening-next-steps-doc- | effort | Scope unclear in source |
| billing-history-missing-org-returns-401-blocker-mongodb-ssot-sync-unavailable-fa | effort | Scope unclear in source |
| none-db-sync-blocked-create-billing-history-missing-org-returns-401-when-mongo-a | effort | Scope unclear in source |
| billing-history-missing-org-returns-401-align-route-to-return-400-without-org-an | effort | Scope unclear in source |
| add-rate-limiting-to-superadmin-routes-add-enforceratelimit-middleware-regressio | effort | Scope unclear in source |
| add-rate-limiting-to-issues-api-routes-apply-enforceratelimit-across-issues-rout | effort | Scope unclear in source |
| build-breaker-bugs-scripts-verify-api-ts | effort | Scope unclear in source |
| cleared-missing-tests-doc-only | effort | Scope unclear in source |
| hardened-pr-agent-to-ignore-bots-require-repo-pr-context-and-skip-when-openai-ke | effort | Scope unclear in source |
| efficiency-improvements-next-steps-doc-only | effort | Scope unclear in source |
| standardize-cache-path-outputs-across-workflows-using-the-pnpm-store-pattern-git | effort | Scope unclear in source |
| guard-db-dependent-steps-behind-secret-presence-to-avoid-fork-failures-agent-gov | effort | Scope unclear in source |
| identified-bugs-next-steps-doc-only | effort | Scope unclear in source |
| logic-errors-next-steps-doc-only | effort | Scope unclear in source |
| none-observed-in-this-session-next-steps-doc-only | effort | Scope unclear in source |
| missing-tests-next-steps-doc-only | effort | Scope unclear in source |
| no-automated-checks-enforce-fork-safety-secret-guards-add-actionlint-or-a-reusab | effort | Scope unclear in source |
| build-sourcemaps-yml-53-56-still-attempts-mongo-index-creation-with-a-localhost- | effort | Scope unclear in source |
| multiple-workflows-e-g-test-runner-yml-e2e-tests-yml-intentionally-use-secret-fa | effort | Scope unclear in source |
| no-additional-store-path-nextauth-url-style-warnings-remain-after-current-workfl | effort | Scope unclear in source |
| not-re-run-last-recorded-0-next-steps-doc-only | effort | Scope unclear in source |
| baseline-99-8-next-steps-doc-only | effort | Scope unclear in source |
| logged-next-steps-tests-unit-security-encryption-test-ts | effort | Scope unclear in source |
| review-webhook-open-routes-app-api-payments-callback-route-ts-app-api-healthchec | effort | Scope unclear in source |
| api-billing-history-returns-401-instead-of-400-when-org-context-is-missing-tests | effort | Scope unclear in source |
| none-detected-in-current-sweep-no-behavior-regressions-surfaced-by-tests-next-st | effort | Scope unclear in source |
| crm-module-4-routes-lacks-coverage-add-crud-tests-for-app-api-crm-next-steps-doc | effort | Scope unclear in source |
| superadmin-routes-3-routes-lack-tests-add-auth-session-regression-cases-next-ste | effort | Scope unclear in source |
| souq-coverage-gaps-remain-on-44-routes-75-total-prioritize-checkout-repricer-ful | effort | Scope unclear in source |
| support-admin-gaps-5-and-19-routes-respectively-add-impersonation-and-admin-acti | effort | Scope unclear in source |
| react-act-warnings-in-rtl-i18n-flows-tests-integration-dashboard-hr-integration- | effort | Scope unclear in source |
| 16-gaps-next-steps-doc-only | effort | Scope unclear in source |
| system-next-steps-app-api-healthcheck-route-ts | effort | Scope unclear in source |
| auth-next-steps-app-api-superadmin-logout-route-ts | effort | Scope unclear in source |
| x-tests-100-passing-3309-3309-next-steps-doc-only | effort | Scope unclear in source |
| x-build-0-ts-errors-next-steps-doc-only | effort | Scope unclear in source |
| x-eslint-0-errors-next-steps-doc-only | effort | Scope unclear in source |
| x-console-log-0-in-api-all-using-logger-next-steps-doc-only | effort | Scope unclear in source |
| x-empty-catches-0-in-api-next-steps-doc-only | effort | Scope unclear in source |
| x-xss-all-innerhtml-sanitized-next-steps-doc-only | effort | Scope unclear in source |
| username-superadmin-next-steps-doc-only | effort | Scope unclear in source |
| password-admin123-change-in-production-next-steps-doc-only | effort | Scope unclear in source |
| BUG-001 | effort | Scope unclear in source |
| category-from-id-prefix-bug-sec-logic-etc-next-steps-doc-only | effort | Scope unclear in source |
| priority-from-text-patterns-p0-critical-p1-high-etc-next-steps-doc-only | effort | Scope unclear in source |
| status-from-checkbox-x-vs-next-steps-doc-only | effort | Scope unclear in source |
| priority-breakdown-cards-p0-p3-counts-next-steps-doc-only | effort | Scope unclear in source |
| filters-status-priority-category-search-view-mode-next-steps-doc-only | effort | Scope unclear in source |
| view-modes-all-quick-wins-stale-next-steps-doc-only | effort | Scope unclear in source |
| issues-table-with-sorting-next-steps-doc-only | effort | Scope unclear in source |
| pagination-next-steps-doc-only | effort | Scope unclear in source |
| export-to-json-next-steps-doc-only | effort | Scope unclear in source |
| import-dialog-json-text-dry-run-support-next-steps-doc-only | effort | Scope unclear in source |
| sync-from-pending-master-button-next-steps-doc-only | effort | Scope unclear in source |
| issue-details-editing-title-description-root-cause-proposed-fix-next-steps-doc-o | effort | Scope unclear in source |
| properties-panel-status-priority-effort-category-next-steps-doc-only | effort | Scope unclear in source |
| location-display-file-path-line-numbers-next-steps-doc-only | effort | Scope unclear in source |
| metadata-module-mention-count-first-last-seen-legacy-id-next-steps-doc-only | effort | Scope unclear in source |
| labels-and-risk-tags-display-next-steps-doc-only | effort | Scope unclear in source |
| activity-tab-with-audit-history-next-steps-doc-only | effort | Scope unclear in source |
| comments-tab-next-steps-doc-only | effort | Scope unclear in source |
| delete-confirmation-dialog-next-steps-doc-only | effort | Scope unclear in source |
| save-button-with-api-patch-next-steps-doc-only | effort | Scope unclear in source |
| objectid-validation-try-new-objectid-id-catch-return-id-intentional-next-steps-d | effort | Scope unclear in source |
| json-parse-catch-return-graceful-degradation-next-steps-doc-only | effort | Scope unclear in source |
| optional-features-catch-silently-continue-feature-flags-next-steps-doc-only | effort | Scope unclear in source |
| x-tests-100-passing-3286-3286-next-steps-doc-only | effort | Scope unclear in source |
| x-no-console-runtime-issues-next-steps-doc-only | effort | Scope unclear in source |
| x-tenancy-filters-all-enforced-next-steps-doc-only | effort | Scope unclear in source |
| get-api-help-articles-401-unauthorized-next-steps-doc-only | effort | Scope unclear in source |
| get-api-notifications-401-unauthorized-next-steps-doc-only | effort | Scope unclear in source |
| get-api-qa-health-401-unauthorized-next-steps-doc-only | effort | Scope unclear in source |
| post-api-qa-reconnect-401-unauthorized-next-steps-doc-only | effort | Scope unclear in source |
| post-api-qa-alert-403-forbidden-next-steps-doc-only | effort | Scope unclear in source |
| post-api-auth-otp-send-500-config-issue-next-steps-doc-only | effort | Scope unclear in source |
| nextauth-bypass-otp-is-enabled-but-nextauth-bypass-otp-code-is-not-set-next-step | effort | Scope unclear in source |
| deploy-and-verify-console-is-clean-next-steps-doc-only | effort | Scope unclear in source |
| configure-otp-env-var-or-disable-bypass-next-steps-doc-only | effort | Scope unclear in source |
| x-no-runtime-hydration-issues-next-steps-doc-only | effort | Scope unclear in source |
| x-tenancy-filters-n-a-client-side-fix-next-steps-doc-only | effort | Scope unclear in source |
| x-rbac-enforced-via-auth-flags-next-steps-doc-only | effort | Scope unclear in source |
| located-master-pending-report-this-file-and-avoided-duplicates-next-steps-doc-on | effort | Scope unclear in source |
| implemented-super-admin-gating-for-autofix-auto-monitoring-to-stop-unauthenticat | effort | Scope unclear in source |
| stopped-default-constructor-auto-start-monitoring-now-opt-in-and-client-only-nex | effort | Scope unclear in source |
| ongoing-otp-send-endpoint-returning-500-needs-reproduction-details-awaiting-resp | effort | Scope unclear in source |
| verify-in-browser-logged-out-logged-in-non-super-admin-that-no-auto-monitor-netw | effort | Scope unclear in source |
| capture-otp-send-failure-evidence-response-json-server-logs-and-triage-root-caus | effort | Scope unclear in source |
| run-lint-targeted-vitest-for-qa-routes-after-ui-confirmation-to-ensure-no-regres | effort | Scope unclear in source |
| efficiency-add-backoff-debounce-to-autofix-health-checks-when-consecutive-failur | effort | Scope unclear in source |
| bugs-block-systemverifier-actions-when-unauthenticated-non-super-admin-now-gated | effort | Scope unclear in source |
| logic-errors-avoid-retrying-qa-reconnect-while-unauthenticated-add-early-return- | effort | Scope unclear in source |
| missing-tests-add-client-side-test-covering-autofixinitializer-behavior-for-gues | effort | Scope unclear in source |
| clientlayout-injects-autofixinitializer-for-both-marketing-and-protected-shells- | effort | Scope unclear in source |
| qa-endpoints-app-api-qa-health-app-api-qa-reconnect-app-api-qa-alert-enforce-sup | effort | Scope unclear in source |
| coverage-001-next-steps-doc-only | effort | Scope unclear in source |
| x-tests-100-passing-3285-3285-next-steps-doc-only | effort | Scope unclear in source |
| x-tenancy-filters-enforced-next-steps-doc-only | effort | Scope unclear in source |
| x-tests-99-8-passing-6-test-route-sync-issues-next-steps-doc-only | effort | Scope unclear in source |
| complete-bugs-doc-only | effort | Scope unclear in source |
| mdx-markdown-content-with-rehype-sanitize-next-steps-doc-only | effort | Scope unclear in source |
| server-rendered-static-content-next-steps-doc-only | effort | Scope unclear in source |
| no-user-input-directly-in-innerhtml-next-steps-doc-only | effort | Scope unclear in source |
| CART-001 | effort | Scope unclear in source |
| routes-missing-tests-doc-only | effort | Scope unclear in source |
| lib-config-constants-ts-5-occurrences-intentional-for-dev-next-steps-lib-config- | effort | Scope unclear in source |
| lib-config-domains-ts-intentional-cors-whitelist-next-steps-lib-config-domains-t | effort | Scope unclear in source |
| lib-security-cors-allowlist-ts-intentional-cors-whitelist-next-steps-lib-securit | effort | Scope unclear in source |
| app-api-payments-tap-checkout-route-ts-needs-fix-next-steps-app-api-payments-tap | effort | Scope unclear in source |
| most-are-intentional-defaults-for-development-next-steps-doc-only | effort | Scope unclear in source |
| one-instance-in-payments-needs-next-public-base-url-to-be-required-next-steps-do | effort | Scope unclear in source |
| tbd-next-steps-doc-only | effort | Scope unclear in source |
| tests-api-souq-categories-route-test-ts-tests-api-souq-categories-route-test-ts- | effort | Scope unclear in source |
| tests-api-souq-inventory-route-test-ts-tests-api-souq-inventory-route-test-ts-ne | effort | Scope unclear in source |
| tests-api-souq-sellers-route-test-ts-tests-api-souq-sellers-route-test-ts-next-s | effort | Scope unclear in source |
| tests-api-souq-brands-route-test-ts-tests-api-souq-brands-route-test-ts-next-ste | effort | Scope unclear in source |
| tests-api-souq-deals-route-test-ts-tests-api-souq-deals-route-test-ts-next-steps | effort | Scope unclear in source |
| gated-kyc-auto-approval-on-bank-detail-completion-services-souq-seller-kyc-servi | effort | Scope unclear in source |
| enforced-vendor-context-in-kyc-tests-and-ensured-parsebodysafe-compatibility-kyc | effort | Scope unclear in source |
| tightened-fm-expenses-tests-to-require-200-201-responses-and-assert-success-payl | effort | Scope unclear in source |
| copilot-instructions-updated-with-execution-discipline-and-multi-agent-coordinat | effort | Scope unclear in source |
| apply-vendor-rbac-guard-and-vendorid-scoping-directly-in-kyc-submit-route-servic | effort | Scope unclear in source |
| extend-fm-tenant-helpers-and-expenses-budgets-apis-to-enforce-unitid-consistentl | effort | Scope unclear in source |
| broaden-regression-tests-cross-tenant-unitid-for-budgets-kyc-rbac-vendor-negativ | effort | Scope unclear in source |
| rerun-wider-vitest-set-budgets-fm-suites-and-update-pending-master-with-outcomes | effort | Scope unclear in source |
| app-api-fm-finance-budgets-route-ts-199-225-add-projection-compound-index-orgid- | effort | Scope unclear in source |
| services-souq-seller-kyc-service-ts-194-225-use-lean-projection-to-avoid-duplica | effort | Scope unclear in source |
| app-api-souq-seller-central-kyc-submit-route-ts-17-100-route-still-sets-vendorid | effort | Scope unclear in source |
| services-souq-seller-kyc-service-ts-193-237-vendor-filter-present-but-route-does | effort | Scope unclear in source |
| app-api-fm-finance-budgets-route-ts-191-225-292-306-unit-scoping-present-but-ind | effort | Scope unclear in source |
| app-api-fm-utils-tenant-ts-48-67-buildtenantfilter-supports-unitids-but-callers- | effort | Scope unclear in source |
| app-api-souq-seller-central-kyc-submit-route-ts-53-79-parsebodysafe-errors-retur | effort | Scope unclear in source |
| tests-unit-api-fm-finance-budgets-test-ts-add-unitid-required-post-path-and-cros | effort | Scope unclear in source |
| lenient-status-tolerances-fm-expenses-tests-previously-allowed-200-500-and-condi | effort | Scope unclear in source |
| vendor-scoping-gap-route-sets-vendorid-session-user-id-but-does-not-enforce-vend | effort | Scope unclear in source |
| bank-verification-gating-auto-approval-now-requires-bankdetailscomplete-route-st | effort | Scope unclear in source |
| OTP-001 | effort | Scope unclear in source |
| KYC-001 | effort | Scope unclear in source |
| EFF-003 | effort | Scope unclear in source |
| 43-routes-bugs-request-js | effort | Scope unclear in source |
| SEC-001 | effort | Scope unclear in source |
| PAY-001 | effort | Scope unclear in source |
| souq-module-missing-tests-doc-only | effort | Scope unclear in source |
| admin-module-missing-tests-doc-only | effort | Scope unclear in source |
| fm-module-missing-tests-doc-only | effort | Scope unclear in source |
| aqar-module-missing-tests-doc-only | effort | Scope unclear in source |
| needs-review-should-require-auth-missing-tests-app-api-properties-route-ts | effort | Scope unclear in source |
| needs-review-should-require-auth-missing-tests-app-api-tenants-route-ts | effort | Scope unclear in source |
| needs-review-should-require-auth-missing-tests-app-api-work-orders-route-ts | effort | Scope unclear in source |
| test-files-missing-tests-doc-only | effort | Scope unclear in source |
| json-parse-43-routes-remaining-missing-tests-doc-only | effort | Scope unclear in source |
| rbac-119-352-routes-34-missing-tests-doc-only | effort | Scope unclear in source |
| tightened-kyc-submit-happy-path-expectations-to-require-200-nextstep-tests-unit- | effort | Scope unclear in source |
| flagged-fm-expenses-happy-path-assertions-tolerating-400-500-status-and-conditio | effort | Scope unclear in source |
| reconfirmed-route-gaps-missing-seller-rbac-vendor-guard-in-kyc-submit-app-api-so | effort | Scope unclear in source |
| add-seller-vendor-rbac-guard-and-vendor-id-scoping-to-kyc-submit-sellerkycservic | effort | Scope unclear in source |
| normalize-fm-expenses-tests-to-strict-success-expectations-and-assert-orgid-unit | effort | Scope unclear in source |
| extend-fm-tenant-helpers-to-emit-unitid-and-backfill-index-orgid-unitid-departme | effort | Scope unclear in source |
| app-api-fm-finance-budgets-route-ts-135-143-add-projection-and-compound-index-or | effort | Scope unclear in source |
| app-api-fm-finance-budgets-route-ts-119-129-org-only-buildtenantfilter-missing-u | effort | Scope unclear in source |
| app-api-fm-finance-budgets-route-ts-200-207-create-payload-omits-unitid-next-ste | effort | Scope unclear in source |
| app-api-fm-utils-tenant-ts-35-52-cannot-emit-unit-scope-cross-unit-leakage-next- | effort | Scope unclear in source |
| services-souq-seller-kyc-service-ts-533-557-approval-should-wait-for-documents-b | effort | Scope unclear in source |
| lenient-status-tolerances-expenses-tests-lines-above-mirror-kyc-leniency-both-al | effort | Scope unclear in source |
| rbac-tenant-guard-gap-kyc-submit-route-lacks-seller-vendor-rbac-service-lookup-i | effort | Scope unclear in source |
| souq-22-ads-campaigns-ads-campaigns-id-ads-impressions-ads-clicks-settlements-se | effort | Scope unclear in source |
| admin-8-footer-sms-sms-settings-testing-users-testing-users-id-2-handlers-route- | effort | Scope unclear in source |
| aqar-4-insights-pricing-leads-listings-id-support-chatbot-next-steps-doc-only | effort | Scope unclear in source |
| marketplace-3-cart-rfq-vendor-products-next-steps-doc-only | effort | Scope unclear in source |
| fm-1-inspections-vendor-assignments-next-steps-doc-only | effort | Scope unclear in source |
| pm-2-plans-plans-id-next-steps-doc-only | effort | Scope unclear in source |
| user-1-preferences-has-try-catch-but-not-parsebodysafe-next-steps-doc-only | effort | Scope unclear in source |
| webhooks-1-carrier-tracking-next-steps-doc-only | effort | Scope unclear in source |
| SOUQ-51 | effort | Scope unclear in source |
| ADMIN-26 | effort | Scope unclear in source |
| FM-19 | effort | Scope unclear in source |
| sprint-1-continuation-apply-parsebodysafe-to-remaining-44-routes-batch-by-module | effort | Scope unclear in source |
| fm-unit-scoping-extend-buildtenantfilter-to-include-unitid-next-steps-doc-only | effort | Scope unclear in source |
| kyc-workflow-fix-premature-approval-pattern-in-seller-kyc-service-next-steps-doc | effort | Scope unclear in source |
| test-coverage-add-unit-tests-for-json-parse-rejection-fm-cross-unit-kyc-rbac-nex | effort | Scope unclear in source |
| hardened-souq-kyc-submit-unit-tests-to-fail-on-500-responses-and-always-assert-n | effort | Scope unclear in source |
| flagged-parallel-lenient-status-assertions-in-fm-expenses-tests-to-close-false-n | effort | Scope unclear in source |
| souq-kyc-submit-tests-fm-finance-expenses-tests-next-steps-doc-only | effort | Scope unclear in source |
| apply-rbac-vendor-ownership-guard-to-souq-kyc-submit-route-align-sellerkycservic | effort | Scope unclear in source |
| normalize-fm-expenses-tests-to-require-deterministic-200-201-responses-and-asser | effort | Scope unclear in source |
| souq-ads-deals-fulfillment-inventory-repricer-settlements-next-steps-doc-only | effort | Scope unclear in source |
| admin-footer-sms-testing-users-export-next-steps-doc-only | effort | Scope unclear in source |
| aqar-leads-listings-id-insights-pricing-next-steps-doc-only | effort | Scope unclear in source |
| marketplace-cart-rfq-vendor-products-next-steps-doc-only | effort | Scope unclear in source |
| fm-inspections-vendor-assignments-next-steps-doc-only | effort | Scope unclear in source |
| pm-plans-next-steps-doc-only | effort | Scope unclear in source |
| souq-kyc-rbac-tests-fm-budgets-unit-scope-typecheck-lint-triage-started-next-ste | effort | Scope unclear in source |
| pnpm-typecheck-50-ts-errors-pnpm-lint-135-errors-next-steps-doc-only | effort | Scope unclear in source |
| souq-kyc-submit-seller-only-rbac-guard-company-info-no-longer-auto-approves-vend | effort | Scope unclear in source |
| fm-budgets-route-unitid-scoping-enforced-via-resolveunitscope-and-buildtenantfil | effort | Scope unclear in source |
| typecheck-lint-triage-identified-failing-files-aqar-listings-issues-api-marketpl | effort | Scope unclear in source |
| typecheck-pass-1-issue-tracker-issues-api-fix-imports-types-null-guards-getserve | effort | Scope unclear in source |
| typecheck-pass-2-aqar-marketplace-fix-enum-nullable-handling-in-aqar-listing-rou | effort | Scope unclear in source |
| follow-ups-add-kyc-integration-tests-for-document-bank-verification-and-super-ad | effort | Scope unclear in source |
| marketplace-ads-campaigns-reuse-parsed-payloads-and-avoid-multiple-date-casts-no | effort | Scope unclear in source |
| fm-budgets-add-compound-index-orgid-unitid-department-updatedat-1-to-prevent-sca | effort | Scope unclear in source |
| aqar-listings-id-furnishing-listing-status-casts-accept-null-causing-ts-errors-a | effort | Scope unclear in source |
| issue-tracker-routes-missing-modules-models-issue-lib-db-lib-auth-and-outdated-g | effort | Scope unclear in source |
| marketplace-cart-rfq-vendor-products-constructing-zoderror-from-arrays-incorrect | effort | Scope unclear in source |
| souq-ads-campaigns-unknown-values-assigned-to-enums-type-errors-potential-runtim | effort | Scope unclear in source |
| issue-tracker-scripts-implicit-any-parameters-and-missing-commander-import-break | effort | Scope unclear in source |
| souq-kyc-integration-tests-for-document-bank-verification-flows-and-super-admin- | effort | Scope unclear in source |
| fm-budgets-tests-for-unitid-persistence-on-insert-and-rejection-when-unit-not-as | effort | Scope unclear in source |
| auth-import-drift-in-issue-tracker-multiple-routes-import-non-existent-models-is | effort | Scope unclear in source |
| validation-typing-gaps-marketplace-routes-construct-zod-errors-from-plain-arrays | effort | Scope unclear in source |
| enum-nullable-misuse-aqar-listings-and-souq-ads-campaigns-assign-unknown-to-enum | effort | Scope unclear in source |
| not-run-this-session-next-steps-doc-only | effort | Scope unclear in source |
| tightened-kyc-unit-tests-deterministic-200-expectations-non-seller-negative-case | effort | Scope unclear in source |
| re-ran-budgets-unit-tests-suite-green-with-existing-tenant-unit-aware-mocks-next | effort | Scope unclear in source |
| run-pnpm-typecheck-pnpm-lint-to-complete-gates-next-steps-doc-only | effort | Scope unclear in source |
| audit-souq-kyc-service-for-vendor-ownership-scoping-across-all-steps-and-align-r | effort | Scope unclear in source |
| extend-integration-tests-to-cover-kyc-document-bank-verification-paths-and-super | effort | Scope unclear in source |
| backfill-fm-budgets-route-with-unitid-scoping-once-shared-tenant-helper-supports | effort | Scope unclear in source |
| souq-kyc-submit-status-reuse-a-single-seller-fetch-with-projection-lean-before-b | effort | Scope unclear in source |
| fm-budgets-listing-add-projection-and-compound-index-orgid-unitid-department-upd | effort | Scope unclear in source |
| fm-budgets-filtering-still-org-only-in-helper-unitid-not-enforced-for-get-post-q | effort | Scope unclear in source |
| kyc-company-info-step-previously-set-status-to-approved-corrected-to-pending-doc | effort | Scope unclear in source |
| super-admin-cross-tenant-mode-post-budgets-should-continue-to-reject-cross-tenan | effort | Scope unclear in source |
| add-kyc-integration-tests-for-document-bank-verification-sequences-and-vendor-ow | effort | Scope unclear in source |
| add-fm-budgets-tests-for-unitid-persistence-on-insert-and-rejection-when-unitid- | effort | Scope unclear in source |
| rbac-gaps-on-sensitive-routes-souq-kyc-submit-lacked-seller-role-guard-similar-t | effort | Scope unclear in source |
| tenant-dimension-omissions-fm-budgets-continues-to-inherit-org-only-buildtenantf | effort | Scope unclear in source |
| workflow-premature-approvals-kyc-company-info-auto-approved-sellers-same-regress | effort | Scope unclear in source |
| socialize-the-updated-instructions-with-all-agents-ensure-new-guidance-is-honore | effort | Scope unclear in source |
| if-any-ambiguity-arises-during-concurrent-edits-record-assumptions-and-coordinat | effort | Scope unclear in source |
| run-targeted-suites-vitest-for-fm-budgets-and-souq-kyc-on-next-code-change-touch | effort | Scope unclear in source |
| none-new-identified-in-this-pass-doc-only-keep-prior-performance-items-active-ne | effort | Scope unclear in source |
| none-new-identified-in-this-pass-doc-only-keep-prior-fm-budgets-and-souq-kyc-fin | effort | Scope unclear in source |
| none-new-identified-in-this-pass-doc-only-maintain-earlier-kyc-approval-flow-cor | effort | Scope unclear in source |
| none-new-identified-in-this-pass-on-next-code-edits-rerun-extend-fm-budgets-and- | effort | Scope unclear in source |
| parallel-agent-contention-recent-overlapping-edits-highlight-risk-of-clobbering- | effort | Scope unclear in source |
| standardized-hr-module-rbac-with-hasallowedrole-helper-7-routes-next-steps-doc-o | effort | Scope unclear in source |
| documented-legitimate-orgid-fallback-patterns-3-files-next-steps-doc-only | effort | Scope unclear in source |
| confirmed-fm-budgets-get-post-enforce-orgid-unitid-via-resolveunitscope-and-buil | effort | Scope unclear in source |
| confirmed-souq-kyc-route-uses-rbac-vendor-only-and-service-enforces-vendor-owner | effort | Scope unclear in source |
| add-deterministic-tests-for-fm-budgets-unit-scoping-including-multi-unit-selecti | effort | Scope unclear in source |
| add-compound-index-orgid-1-unitid-1-department-1-updatedat-1-to-budgets-collecti | effort | Scope unclear in source |
| gate-super-admin-cross-tenant-fm-budgets-listing-currently-empty-filter-when-ten | effort | Scope unclear in source |
| app-api-fm-finance-budgets-route-ts-215-225-add-projection-and-compound-index-or | effort | Scope unclear in source |
| services-souq-seller-kyc-service-ts-224-233-use-lean-projection-for-seller-looku | effort | Scope unclear in source |
| app-api-fm-finance-budgets-route-ts-191-205-when-super-admin-resolves-to-cross-t | effort | Scope unclear in source |
| none-new-in-this-pass-company-info-keeps-kyc-status-in-review-vendor-scoping-enf | effort | Scope unclear in source |
| super-admin-cross-tenant-gap-for-fm-budgets-cross-tenant-marker-yields-query-wit | effort | Scope unclear in source |
| test-coverage-gaps-current-unit-tests-allow-200-500-in-souq-kyc-and-lack-unit-sc | effort | Scope unclear in source |
| ongoing-playwright-smoke-rerun-required-previous-runs-timed-out-copilot-strict-s | effort | Scope unclear in source |
| next-re-run-pnpm-test-e2e-project-smoke-reporter-line-after-cooldown-triage-test | effort | Scope unclear in source |
| keep-pdp-in-playwright-mode-fully-static-to-prevent-upstream-timeouts-add-memoiz | effort | Scope unclear in source |
| copilot-strict-failures-remain-layout-overlay-tenant-isolation-personal-intent-s | effort | Scope unclear in source |
| smoke-suite-timing-out-playwright-server-left-running-until-manual-kill-need-sta | effort | Scope unclear in source |
| org-context-guards-other-than-supportorg-may-still-throw-outside-providers-in-pl | effort | Scope unclear in source |
| system-dashboard-english-h1-remains-visible-in-non-playwright-mode-only-ensure-t | effort | Scope unclear in source |
| add-smoke-assertions-for-playwright-header-dashboard-link-and-pdp-stub-link-href | effort | Scope unclear in source |
| add-targeted-playwright-spec-or-unit-tests-for-copilot-tenant-isolation-and-over | effort | Scope unclear in source |
| guard-stub-pattern-usesupportorg-now-playwright-safe-contexts-supportorgcontext- | effort | Scope unclear in source |
| playwright-ui-branches-finance-hr-system-now-have-arabic-headings-under-flag-but | effort | Scope unclear in source |
| marketplace-stubs-homepage-playwright-branch-now-links-to-pdp-stub-but-search-li | effort | Scope unclear in source |
| add-unit-level-tenant-scoping-org-id-unit-id-across-fm-helpers-and-budgets-queri | effort | Scope unclear in source |
| add-seller-vendor-rbac-guard-and-vendor-id-scoping-to-souq-kyc-submission-route- | effort | Scope unclear in source |
| add-deterministic-success-paths-and-coverage-for-rate-limit-cross-tenant-rejecti | effort | Scope unclear in source |
| services-souq-seller-kyc-service-ts-204-221-reuse-a-single-seller-lookup-with-pr | effort | Scope unclear in source |
| app-api-souq-seller-central-kyc-submit-route-ts-24-67-no-server-side-role-rbac-g | effort | Scope unclear in source |
| early-approval-state-services-souq-seller-kyc-service-ts-262-282-status-flips-to | effort | Scope unclear in source |
| in-progress-smoke-suite-rerun-pnpm-test-e2e-project-smoke-attempts-timed-out-cop | effort | Scope unclear in source |
| next-re-run-smoke-after-server-cooldown-address-copilot-strict-layout-tenant-iso | effort | Scope unclear in source |
| missing-tests-add-regression-smoke-to-assert-playwright-header-has-dashboard-lin | effort | Scope unclear in source |
| playwright-only-branches-still-sparse-across-dashboard-modules-system-page-neede | effort | Scope unclear in source |
| marketplace-stubs-ensure-any-future-playwright-facing-components-search-listings | effort | Scope unclear in source |
| scanned-entire-codebase-for-23-priority-action-categories-next-steps-doc-only | effort | Scope unclear in source |
| identified-19-remaining-issues-requiring-attention-5-8-6-next-steps-doc-only | effort | Scope unclear in source |
| deep-dive-analysis-on-similar-patterns-across-codebase-next-steps-doc-only | effort | Scope unclear in source |
| requireorgid-session-string-throws-if-missing-next-steps-doc-only | effort | Scope unclear in source |
| validateorgid-value-boolean-validates-format-next-steps-doc-only | effort | Scope unclear in source |
| channel-handlers-ts-120-164-199-248-278-5x-fire-and-forget-notifications-next-st | effort | Scope unclear in source |
| work-orders-presign-route-ts-85-optional-presign-validation-next-steps-work-orde | effort | Scope unclear in source |
| billing-charge-recurring-route-ts-103-error-text-extraction-next-steps-billing-c | effort | Scope unclear in source |
| fire-and-forget-notifications-acceptable-add-logging-next-steps-doc-only | effort | Scope unclear in source |
| data-operations-replace-with-proper-error-handling-next-steps-doc-only | effort | Scope unclear in source |
| app-error-tsx-20-files-same-template-with-mr-2-next-steps-error-ts | effort | Scope unclear in source |
| various-components-with-left-right-positioning-next-steps-doc-only | effort | Scope unclear in source |
| create-shared-errorboundary-component-with-rtl-safe-classes-next-steps-doc-only | effort | Scope unclear in source |
| replace-all-error-tsx-files-with-shared-component-import-efficiency-error-ts | effort | Scope unclear in source |
| add-eslint-rule-no-physical-direction-classes-next-steps-doc-only | effort | Scope unclear in source |
| needs-db-review-next-steps-doc-only | effort | Scope unclear in source |
| needs-review-next-steps-doc-only | effort | Scope unclear in source |
| needs-build-analysis-next-steps-doc-only | effort | Scope unclear in source |
| needs-audit-next-steps-doc-only | effort | Scope unclear in source |
| services-souq-rules-config-ts-44-next-steps-services-souq-rules-config-ts-44 | effort | Scope unclear in source |
| services-souq-settlements-settlement-calculator-ts-262-next-steps-services-souq- | effort | Scope unclear in source |
| lib-jobs-sms-sla-monitor-ts-64-next-steps-lib-jobs-sms-sla-monitor-ts-64 | effort | Scope unclear in source |
| lib-ats-rbac-ts-106-next-steps-lib-ats-rbac-ts-106 | effort | Scope unclear in source |
| lib-apiguard-ts-33-next-steps-lib-apiguard-ts-33 | effort | Scope unclear in source |
| lib-audit-middleware-ts-203-205-next-steps-lib-audit-middleware-ts-203 | effort | Scope unclear in source |
| lib-config-tenant-ts-95-next-steps-lib-config-tenant-ts-95 | effort | Scope unclear in source |
| lib-config-tenant-server-ts-113-next-steps-lib-config-tenant-server-ts-113 | effort | Scope unclear in source |
| lib-marketplace-context-ts-174-next-steps-lib-marketplace-context-ts-174 | effort | Scope unclear in source |
| lib-security-monitoring-ts-224-next-steps-lib-security-monitoring-ts-224 | effort | Scope unclear in source |
| lib-fm-auth-middleware-ts-74-313-365-next-steps-lib-fm-auth-middleware-ts-74 | effort | Scope unclear in source |
| lib-feature-flags-ts-405-next-steps-lib-feature-flags-ts-405 | effort | Scope unclear in source |
| lib-middleware-orgid-validation-ts-25-next-steps-lib-middleware-orgid-validation | effort | Scope unclear in source |
| scripts-seed-production-data-ts-39-next-steps-scripts-seed-production-data-ts-39 | effort | Scope unclear in source |
| jobs-onboarding-queue-ts-59-next-steps-jobs-onboarding-queue-ts-59 | effort | Scope unclear in source |
| jobs-onboarding-expiry-worker-ts-131-next-steps-jobs-onboarding-expiry-worker-ts | effort | Scope unclear in source |
| create-lib-auth-tenant-utils-ts-next-steps-lib-auth-tenant-utils-ts | effort | Scope unclear in source |
| replace-all-orgid-value-with-requireorgid-session-next-steps-doc-only | effort | Scope unclear in source |
| add-eslint-rule-to-prevent-fallback-patterns-next-steps-doc-only | effort | Scope unclear in source |
| channel-handlers-ts-5-occurrences-fire-and-forget-acceptable-with-logging-next-s | effort | Scope unclear in source |
| work-orders-presign-route-ts-1-needs-fix-next-steps-work-orders-presign-route-ts | effort | Scope unclear in source |
| auth-test-credentials-debug-route-ts-1-test-route-acceptable-next-steps-auth-tes | effort | Scope unclear in source |
| admin-notifications-test-route-ts-1-needs-logging-next-steps-admin-notifications | effort | Scope unclear in source |
| billing-charge-recurring-route-ts-1-error-text-acceptable-next-steps-billing-cha | effort | Scope unclear in source |
| create-shared-components-errors-errorpage-tsx-with-rtl-safe-classes-next-steps-c | effort | Scope unclear in source |
| replace-all-mr-2-with-me-2-margin-end-next-steps-doc-only | effort | Scope unclear in source |
| add-eslint-rule-no-restricted-syntax-for-physical-direction-classes-next-steps-d | effort | Scope unclear in source |
| returns-503-on-optional-module-import-failure-next-steps-doc-only | effort | Scope unclear in source |
| returns-503-on-organization-lookup-db-failure-next-steps-doc-only | effort | Scope unclear in source |
| search-route-ts-extracted-to-lib-permissions-ts-scoping-ts-entity-builders-ts-ne | effort | Scope unclear in source |
| admin-notifications-send-route-ts-extracted-to-lib-channel-handlers-ts-recipient | effort | Scope unclear in source |
| souq-orders-route-ts-extracted-to-lib-order-lifecycle-ts-order-validation-ts-nex | effort | Scope unclear in source |
| fm-work-orders-id-transition-route-ts-extracted-to-lib-fsm-transitions-ts-transi | effort | Scope unclear in source |
| safe-session-test-ts-11-auth-infra-failure-scenarios-next-steps-safe-session-tes | effort | Scope unclear in source |
| campaigns-route-test-ts-17-souq-ads-campaigns-next-steps-campaigns-route-test-ts | effort | Scope unclear in source |
| settings-route-test-ts-17-souq-repricer-settings-next-steps-settings-route-test- | effort | Scope unclear in source |
| vendors-route-test-ts-18-fm-marketplace-vendors-next-steps-vendors-route-test-ts | effort | Scope unclear in source |
| route-refactoring-p2-extracted-helpers-from-2-large-route-files-next-steps-doc-o | effort | Scope unclear in source |
| auth-otp-send-1091-lines-extracted-to-lib-auth-otp-test-users-ts-lib-auth-otp-he | effort | Scope unclear in source |
| payments-tap-webhook-815-lines-extracted-to-lib-finance-tap-webhook-handlers-ts- | effort | Scope unclear in source |
| souq-kyc-submit-test-ts-17-claims-route-test-ts-22-next-steps-kyc-submit-test-ts | effort | Scope unclear in source |
| admin-benchmark-test-ts-10-users-route-test-ts-18-next-steps-benchmark-test-ts | effort | Scope unclear in source |
| fm-expenses-test-ts-12-budgets-test-ts-18-next-steps-expenses-test-ts | effort | Scope unclear in source |
| a29893220-refactor-p2-extract-helpers-from-large-routes-p1-module-tests-next-ste | effort | Scope unclear in source |
| bc5f60662-test-p1-add-critical-module-tests-claims-users-budgets-next-steps-doc- | effort | Scope unclear in source |
| test-coverage-gap-analysis-route-size-audit-next-steps-doc-only | effort | Scope unclear in source |
| created-lib-auth-safe-session-ts-with-getsessionorerror-getsessionornull-helpers | effort | Scope unclear in source |
| applied-auth-infra-aware-helper-to-29-occurrences-across-25-routes-next-steps-do | effort | Scope unclear in source |
| committed-12-commits-utility-files-tests-api-fixes-services-docs-next-steps-doc- | effort | Scope unclear in source |
| pushed-all-commits-to-docs-pending-v60-head-d8aa6a892-next-steps-doc-only | effort | Scope unclear in source |
| analyzed-test-coverage-gaps-souq-51-75-missing-admin-26-28-missing-fm-19-25-miss | effort | Scope unclear in source |
| p1-add-priority-module-tests-souq-settlements-ads-seller-central-admin-notificat | effort | Scope unclear in source |
| p2-split-large-route-files-auth-otp-send-1091-lines-payments-tap-webhook-815-lin | effort | Scope unclear in source |
| p2-add-negative-path-tests-for-auth-infra-failure-scenarios-next-steps-doc-only | effort | Scope unclear in source |
| LOGIC-126 | effort | Scope unclear in source |
| LOGIC-127 | effort | Scope unclear in source |
| missing-integration-tests-settlement-flows-kyc-verification-billing-benchmarks-h | effort | Scope unclear in source |
| missing-negative-path-tests-no-tests-for-auth-infra-failures-db-outages-rate-lim | effort | Scope unclear in source |
| no-e2e-for-critical-flows-settlements-payouts-kyc-approval-missing-end-to-end-va | effort | Scope unclear in source |
| next-steps-stage-and-commit-remaining-uncommitted-files-from-previous-sessions-u | effort | Scope unclear in source |
| auth-errors-401-token-missing-expired-invalid-credentials-revoked-session-unauth | effort | Scope unclear in source |
| typecheck-lint-test-models-test-e2e-timed-out-scripts-run-playwright-sh-next-ste | effort | Scope unclear in source |
| e2e-gate-still-timing-out-in-scripts-run-playwright-sh-likely-dev-server-hang-re | effort | Scope unclear in source |
| not-run-docs-only-update-next-steps-doc-only | effort | Scope unclear in source |
| progress-located-master-pending-report-reviewed-upload-scan-status-verify-metada | effort | Scope unclear in source |
| next-steps-add-tenant-bound-s3-key-validation-shared-helper-for-upload-routes-na | effort | Scope unclear in source |
| todo-efficiency-doc-only | effort | Scope unclear in source |
| BUG-1708 | effort | Scope unclear in source |
| BUG-1709 | effort | Scope unclear in source |
| BUG-1710 | effort | Scope unclear in source |
| LOGIC-124 | effort | Scope unclear in source |
| LOGIC-125 | effort | Scope unclear in source |
| integration-tests-that-reject-keys-outside-the-caller-s-org-prefix-and-validate- | effort | Scope unclear in source |
| tests-ensuring-token-based-status-scan-paths-are-tenant-namespaced-and-fail-on-o | effort | Scope unclear in source |
| fix-graphql-resolver-todos-missing-tests-doc-only | effort | Scope unclear in source |
| progress-located-master-pending-report-and-refreshed-orgid-audit-notes-mapped-us | effort | Scope unclear in source |
| next-steps-enforce-required-orgid-tenant-audit-context-on-graphql-reads-writes-r | effort | Scope unclear in source |
| BUG-1701 | effort | Scope unclear in source |
| BUG-1703 | effort | Scope unclear in source |
| BUG-1704 | effort | Scope unclear in source |
| BUG-1705 | effort | Scope unclear in source |
| BUG-1706 | effort | Scope unclear in source |
| BUG-1707 | effort | Scope unclear in source |
| LOGIC-121 | effort | Scope unclear in source |
| LOGIC-122 | effort | Scope unclear in source |
| LOGIC-123 | effort | Scope unclear in source |
| coverage-for-org-required-orgless-rejection-on-queries-mutations-missing-tests-d | effort | Scope unclear in source |
| test-enforcing-session-orgid-and-stored-org-consistency-missing-tests-doc-only | effort | Scope unclear in source |
| tests-failing-when-orgid-absent-and-asserting-correct-tenant-org-persisted-missi | effort | Scope unclear in source |
| e2e-stability-rerun-pnpm-playwright-test-tests-e2e-smoke-reporter-list-workers-1 | effort | Scope unclear in source |
| tests-backfill-the-11-service-unit-gaps-keep-lint-typecheck-test-gates-green-aft | effort | Scope unclear in source |
| logging-replace-remaining-console-usages-with-logger-for-observability-and-pii-s | effort | Scope unclear in source |
| EFF-002 | effort | Scope unclear in source |
| BUG-002 | effort | Scope unclear in source |
| release-gate-environments-missing-next-steps-doc-only | effort | Scope unclear in source |
| playwright-smoke-timeout-next-steps-doc-only | effort | Scope unclear in source |
| alias-correctness-aqar-chat-alias-fix-highlights-risk-of-broken-re-exports-audit | effort | Scope unclear in source |
| mongoose-hook-typing-as-any-usage-clusters-in-encryption-hooks-a-shared-typed-ho | effort | Scope unclear in source |
| logging-consistency-console-usage-persists-in-a-few-entry-points-standardizing-o | effort | Scope unclear in source |
| e2e-setup-drift-playwright-hangs-without-output-suggest-blocking-setup-fixtures- | effort | Scope unclear in source |
| gates-remain-green-after-invoice-typing-lint-fixes-pnpm-typecheck-pnpm-lint-pnpm | effort | Scope unclear in source |
| footer-theme-status-ux-additions-remain-stable-no-regressions-detected-during-fi | effort | Scope unclear in source |
| workflow-diagnostics-confirmed-as-environment-setup-gaps-staging-production-appr | effort | Scope unclear in source |
| unit-webhook-tests-for-lib-finance-tap-payments-ts-lib-finance-checkout-ts-missi | effort | Scope unclear in source |
| broaden-coverage-across-14-auth-routes-missing-tests-doc-only | effort | Scope unclear in source |
| settlements-seller-flow-coverage-missing-tests-doc-only | effort | Scope unclear in source |
| workflow-env-gaps-release-gate-environments-missing-creating-staging-production- | effort | Scope unclear in source |
| hardened-superadmin-rotation-to-env-only-credentials-via-requireenv-with-no-lite | effort | Scope unclear in source |
| BUG-1527 | effort | Scope unclear in source |
| BUG-1528 | effort | Scope unclear in source |
| LOGIC-020 | effort | Scope unclear in source |
| LOGIC-021 | effort | Scope unclear in source |
| unit-integration-tests-for-override-vs-base-config-across-returns-claims-fulfill | effort | Scope unclear in source |
| tests-for-aws-region-aws-s3-bucket-fail-fast-and-rotation-script-env-requirement | effort | Scope unclear in source |
| auth-checkout-returns-claims-after-rule-ui-config-rollout-missing-tests-doc-only | effort | Scope unclear in source |
| env-readiness-enforcement-lib-config-constants-ts-24-47-now-throws-on-missing-aw | effort | Scope unclear in source |
| to-run-after-pending-changes-pnpm-typecheck-pnpm-lint-pnpm-test-feat-marketplace | effort | Scope unclear in source |
| pushed-commits-8fcd7df5e-and-696b7bd05-to-docs-pending-v60-branch-missing-tests- | effort | Scope unclear in source |
| p1-efficiency-doc-only | effort | Scope unclear in source |
| BUG-006 | effort | Scope unclear in source |
| BUG-007 | effort | Scope unclear in source |
| LOGIC-005 | effort | Scope unclear in source |
| auth-store-failure-503-for-routes-with-getsessionorerror-missing-tests-doc-only | effort | Scope unclear in source |
| 51-souq-routes-22-admin-routes-17-fm-routes-need-tests-missing-tests-doc-only | effort | Scope unclear in source |
| located-master-pending-report-no-duplicates-and-reviewed-prior-hardening-work-sa | effort | Scope unclear in source |
| align-and-merge-local-changes-on-dirty-upload-help-onboarding-settings-files-the | effort | Scope unclear in source |
| extend-parsebodysafe-parsebody-to-remaining-upload-variants-scan-scan-status-ver | effort | Scope unclear in source |
| add-integration-coverage-for-resume-download-storage-failures-and-emit-av-scanne | effort | Scope unclear in source |
| efficiency-improvements-gate-av-scan-processing-on-scanner-health-and-avoid-repr | effort | Scope unclear in source |
| identified-bugs-remaining-silent-auth-fallbacks-in-upload-help-onboarding-settin | effort | Scope unclear in source |
| logic-errors-json-parsing-defaults-still-exist-in-some-upload-variants-and-onboa | effort | Scope unclear in source |
| missing-tests-need-integration-tests-for-resume-download-storage-failure-403-503 | effort | Scope unclear in source |
| silent-auth-session-fallbacks-remain-in-dirty-routes-upload-variants-help-contex | effort | Scope unclear in source |
| json-parse-fallbacks-linger-in-remaining-upload-onboarding-routes-that-still-use | effort | Scope unclear in source |
| observability-gaps-av-scan-availability-is-not-reported-to-dashboards-auth-infra | effort | Scope unclear in source |
| roll-the-telemetry-aware-session-helper-to-remaining-upload-help-onboarding-sett | effort | Scope unclear in source |
| extend-safe-parser-adoption-to-remaining-upload-scan-verify-metadata-routes-and- | effort | Scope unclear in source |
| add-coverage-for-resume-download-storage-failures-in-integration-tests-and-surfa | effort | Scope unclear in source |
| shared-json-parser-removes-per-route-parsing-boilerplate-and-standardizes-respon | effort | Scope unclear in source |
| lint-json-fallbacks-provides-automated-detection-of-silent-parse-fallbacks-enfor | effort | Scope unclear in source |
| auth-failures-vs-infra-failures-not-yet-separated-in-onboarding-upload-settings- | effort | Scope unclear in source |
| trial-request-now-dlqs-to-webhook-on-db-failure-ensure-webhook-is-set-in-prod-or | effort | Scope unclear in source |
| tenant-config-callers-still-need-to-handle-thrown-errors-ensure-upstream-apis-ma | effort | Scope unclear in source |
| add-parser-negative-path-tests-for-updated-routes-and-upcoming-migrations-next-s | effort | Scope unclear in source |
| add-auth-infra-failure-tests-for-routes-adopting-getsessionorerror-next-steps-do | effort | Scope unclear in source |
| add-dlq-webhook-success-failure-tests-for-trial-request-when-env-is-set-next-ste | effort | Scope unclear in source |
| json-parse-fallbacks-remain-across-help-listings-context-aqar-fm-budgets-project | effort | Scope unclear in source |
| auth-infra-masking-persists-where-getsessionuser-catch-null-is-still-used-onboar | effort | Scope unclear in source |
| trial-request-resilience-db-outage-now-503-dlq-webhook-similar-pattern-could-be- | effort | Scope unclear in source |
| tenant-config-failures-now-logged-with-metric-ensure-dashboard-alerting-consumes | effort | Scope unclear in source |
| add-health-hints-json-in-503-responses-code-retryable-traceid-to-speed-triage-ne | effort | Scope unclear in source |
| per-tenant-feature-flag-to-disable-test-only-endpoints-e-g-api-auth-test-session | effort | Scope unclear in source |
| promote-trial-request-dlq-to-a-durable-queue-writer-instead-of-webhook-to-avoid- | effort | Scope unclear in source |
| add-admin-dashboard-cards-for-tenant-config-load-status-and-last-successful-refr | effort | Scope unclear in source |
| restored-shared-json-parser-module-lib-api-parse-json-ts-and-refactored-remainin | effort | Scope unclear in source |
| auth-infra-aware-helper-is-applied-across-upload-flows-help-articles-comments-su | effort | Scope unclear in source |
| health-hinted-503s-used-by-auth-test-session-trial-request-and-upload-scan-confi | effort | Scope unclear in source |
| trial-request-dlq-durability-intact-webhook-file-tenant-config-load-continues-lo | effort | Scope unclear in source |
| targeted-suites-passing-pnpm-vitest-tests-unit-api-auth-test-session-route-test- | effort | Scope unclear in source |
| shared-parser-lint-guard-in-place-continue-using-for-new-remaining-routes-next-s | effort | Scope unclear in source |
| health-hints-helper-standardizes-503-responses-and-triage-metadata-next-steps-do | effort | Scope unclear in source |
| none-new-primary-gap-is-missing-health-hints-alerts-on-other-503-surfaces-and-ab | effort | Scope unclear in source |
| trial-request-dlq-is-best-effort-webhook-file-without-durable-queue-leads-can-st | effort | Scope unclear in source |
| tenant-config-callers-should-add-health-hinted-responses-when-surfacing-503s-to- | effort | Scope unclear in source |
| add-health-hint-assertions-on-av-scan-config-failure-paths-and-tenant-config-cal | effort | Scope unclear in source |
| health-hints-coverage-gap-only-auth-test-session-trial-request-and-upload-scan-c | effort | Scope unclear in source |
| alerting-gap-metrics-exist-tenant-config-load-failure-trial-request-persist-fail | effort | Scope unclear in source |
| dlq-resilience-trial-request-uses-webhook-file-consider-durable-dlq-for-other-pu | effort | Scope unclear in source |
| extended-shared-json-parser-auth-infra-aware-helper-to-upload-flows-presigned-ur | effort | Scope unclear in source |
| api-auth-test-session-now-enforce-allowed-orgs-via-test-session-allowed-orgs-ret | effort | Scope unclear in source |
| api-trial-request-db-failures-now-log-metric-attempt-webhook-dlq-and-append-to-d | effort | Scope unclear in source |
| ci-lint-ci-now-runs-lint-json-fallbacks-strict-to-block-new-inline-parsers-next- | effort | Scope unclear in source |
| tests-after-this-batch-not-yet-rerun-prior-targeted-suite-still-passing-next-ste | effort | Scope unclear in source |
| shared-parser-reduces-per-route-boilerplate-lint-guard-prevents-regressions-next | effort | Scope unclear in source |
| health-hint-helper-standardizes-503-responses-for-faster-triage-next-steps-doc-o | effort | Scope unclear in source |
| auth-infra-vs-auth-failure-separation-incomplete-onboarding-settings-upload-remn | effort | Scope unclear in source |
| trial-request-dlq-webhook-file-is-best-effort-without-durable-queue-leads-can-st | effort | Scope unclear in source |
| test-session-endpoint-gated-by-org-ensure-staging-shared-envs-set-test-session-a | effort | Scope unclear in source |
| add-negative-path-tests-for-new-parser-auth-health-hint-behaviors-malformed-json | effort | Scope unclear in source |
| add-tests-for-allowed-org-gating-on-api-auth-test-session-next-steps-doc-only | effort | Scope unclear in source |
| add-tests-for-health-hint-payload-presence-on-503-responses-in-routes-using-the- | effort | Scope unclear in source |
| json-parse-fallbacks-still-present-in-help-list-context-aqar-listings-packages-f | effort | Scope unclear in source |
| auth-infra-masking-routes-still-using-getsessionuser-catch-null-onboarding-setti | effort | Scope unclear in source |
| dlq-resilience-trial-request-now-writes-webhook-file-vendor-apply-and-other-publ | effort | Scope unclear in source |
| health-hints-currently-on-auth-test-session-and-trial-request-extend-to-av-scan- | effort | Scope unclear in source |
| BUG-005 | effort | Scope unclear in source |
| manual-missing-tests-doc-only | effort | Scope unclear in source |
| opentelemetry-tracing-missing-tests-doc-only | effort | Scope unclear in source |
| d7c82f309-missing-tests-doc-only | effort | Scope unclear in source |
| 2-missing-tests-doc-only | effort | Scope unclear in source |
| JSON-001 | effort | Scope unclear in source |
| error-rate-visibility-is-missing-add-counters-alerts-per-route-group-auth-upload | effort | Scope unclear in source |
| located-and-updated-the-master-pending-report-no-duplicate-file-documented-fresh | effort | Scope unclear in source |
| replace-inline-getsessionuser-catch-null-usage-in-upload-help-onboarding-setting | effort | Scope unclear in source |
| add-observability-and-guardrails-for-av-scanning-surface-scanner-outages-short-c | effort | Scope unclear in source |
| AVSCAN-001 | effort | Scope unclear in source |
| APPLY-001 | effort | Scope unclear in source |
| silent-upload-auth-cluster-app-api-upload-presigned-url-verify-metadata-scan-sca | effort | Scope unclear in source |
| add-negative-path-tests-for-vendor-apply-db-unavailable-persistence-error-otp-or | effort | Scope unclear in source |
| silent-auth-session-failures-getsessionuser-catch-null-recurs-in-upload-flows-ap | effort | Scope unclear in source |
| security-next-steps-assistant-query-route-ts-259 | effort | Scope unclear in source |
| security-next-steps-pm-plans-route-ts-42 | effort | Scope unclear in source |
| security-next-steps-vendors-route-ts-214 | effort | Scope unclear in source |
| reliability-next-steps-vendor-apply-route-ts | effort | Scope unclear in source |
| reliability-next-steps-doc-only | effort | Scope unclear in source |
| testing-efficiency-doc-only | effort | Scope unclear in source |
| validation-efficiency-doc-only | effort | Scope unclear in source |
| documentation-efficiency-doc-only | effort | Scope unclear in source |
| efficiency-doc-only | effort | Scope unclear in source |
| centralized-souq-fraud-return-rule-windows-with-tenant-overrides-returns-claims- | effort | Scope unclear in source |
| next-rerun-playwright-e2e-when-runtime-allows-extend-banned-literal-list-if-new- | effort | Scope unclear in source |
| souq-rule-overrides-bugs-tests-unit-services-souq-rules-config-test-ts | effort | Scope unclear in source |
| env-enforcement-s3-guard-now-fails-fast-in-prod-consider-similar-guards-for-othe | effort | Scope unclear in source |
| identified-additional-silent-failure-points-vendor-apply-submissions-upload-auth | effort | Scope unclear in source |
| no-commands-executed-documentation-only-update-next-steps-doc-only | effort | Scope unclear in source |
| superadmin-rotation-script-is-now-env-only-username-password-required-credential | effort | Scope unclear in source |
| souq-fraud-return-rule-windows-centralized-with-tenant-overrides-returns-and-cla | effort | Scope unclear in source |
| next-rerun-playwright-smoke-to-validate-auth-checkout-returns-extend-banned-lite | effort | Scope unclear in source |
| e2e-coverage-bugs-doc-only | effort | Scope unclear in source |
| env-enforcement-gaps-s3-now-fails-fast-in-production-similar-guards-should-be-co | effort | Scope unclear in source |
| 6e3bb4b05-bugs-doc-only | effort | Scope unclear in source |
| 1-bugs-doc-only | effort | Scope unclear in source |
| branch-docs-pending-v60-active-bugs-doc-only | effort | Scope unclear in source |
| open-prs-bugs-doc-only | effort | Scope unclear in source |
| pr-549-docs-pending-v59-souq-rules-config-5-new-tests-bugs-doc-only | effort | Scope unclear in source |
| pr-550-docs-pending-v60-orgid-audit-complete-test-fixes-bugs-doc-only | effort | Scope unclear in source |
| security-bugs-lib-config-tenant-server-ts | effort | Scope unclear in source |
| p0-next-steps-tenant-server-ts | effort | Scope unclear in source |
| 98-next-steps-doc-only | effort | Scope unclear in source |
| api-auth-test-session-db-user-lookup-failures-now-503-user-must-exist-404-otherw | effort | Scope unclear in source |
| api-trial-request-db-connect-insert-failures-now-503-no-silent-lead-loss-next-st | effort | Scope unclear in source |
| api-souq-claims-id-db-failures-now-500-instead-of-false-404s-next-steps-doc-only | effort | Scope unclear in source |
| tests-unit-lib-config-tenant-server-test-ts-tenant-load-failure-next-steps-tests | effort | Scope unclear in source |
| tests-api-souq-claims-get-error-route-test-ts-order-lookup-failure-returns-500-n | effort | Scope unclear in source |
| replace-per-route-inline-json-parsing-with-shared-helper-to-reduce-duplicate-cod | effort | Scope unclear in source |
| add-tenant-config-cache-warm-up-metric-emission-to-cut-latency-and-detect-org-sp | effort | Scope unclear in source |
| legacy-inline-catch-null-still-present-e-g-app-api-help-escalate-route-ts-app-ap | effort | Scope unclear in source |
| auth-helper-fallback-getsessionuser-catch-null-masks-infra-failures-in-onboardin | effort | Scope unclear in source |
| defaulting-to-default-tenant-config-on-load-failure-previously-masked-tenant-iss | effort | Scope unclear in source |
| add-parse-failure-tests-for-routes-using-inline-json-fallbacks-billing-quote-fm- | effort | Scope unclear in source |
| add-auth-infra-failure-tests-for-routes-using-getsessionuser-catch-null-onboardi | effort | Scope unclear in source |
| add-tenant-config-caller-tests-to-ensure-503-or-explicit-tenant-missing-is-retur | effort | Scope unclear in source |
| auth-infra-masking-getsessionuser-catch-null-used-across-onboarding-help-upload- | effort | Scope unclear in source |
| test-session-misuse-previously-minted-tokens-on-infra-failure-verify-other-test- | effort | Scope unclear in source |
| docs-pending-v59-next-steps-doc-only | effort | Scope unclear in source |
| 37bd93d69-next-steps-doc-only | effort | Scope unclear in source |
| app-all-api-routes-next-steps-doc-only | effort | Scope unclear in source |
| services-all-service-layers-next-steps-doc-only | effort | Scope unclear in source |
| lib-all-library-code-next-steps-doc-only | effort | Scope unclear in source |
| 2961-tests-pass-0-failures-next-steps-doc-only | effort | Scope unclear in source |
| 305-test-files-next-steps-doc-only | effort | Scope unclear in source |
| no-code-changes-or-verification-commands-run-documentation-only-update-fixes-and | effort | Scope unclear in source |
| CONFIG-001 | effort | Scope unclear in source |
| DBERR-001 | effort | Scope unclear in source |
| 5b7e425ac-bugs-doc-only | effort | Scope unclear in source |
| all-marketplace-related-modules-have-35-coverage-next-steps-doc-only | effort | Scope unclear in source |
| admin-routes-have-minimal-test-coverage-next-steps-doc-only | effort | Scope unclear in source |
| webhook-handlers-are-largely-untested-next-steps-doc-only | effort | Scope unclear in source |
| admin-route-metrics-page-tsx-useeffect-cleanup-next-steps-admin-route-metrics-pa | effort | Scope unclear in source |
| dashboard-hr-recruitment-page-tsx-useeffect-cleanup-next-steps-dashboard-hr-recr | effort | Scope unclear in source |
| components-slatimer-tsx-return-cleanup-next-steps-components-slatimer-ts | effort | Scope unclear in source |
| components-auth-otpverification-tsx-clearinterval-next-steps-components-auth-otp | effort | Scope unclear in source |
| components-fm-workorderattachments-tsx-useeffect-cleanup-next-steps-components-f | effort | Scope unclear in source |
| components-admin-sms-providerhealthdashboard-tsx-useeffect-cleanup-next-steps-co | effort | Scope unclear in source |
| components-careers-jobapplicationform-tsx-useeffect-cleanup-next-steps-component | effort | Scope unclear in source |
| x-pnpm-typecheck-0-errors-next-steps-doc-only | effort | Scope unclear in source |
| x-pnpm-lint-0-errors-next-steps-doc-only | effort | Scope unclear in source |
| x-pnpm-vitest-run-2927-tests-passing-294-files-next-steps-doc-only | effort | Scope unclear in source |
| x-memory-safety-all-intervals-have-cleanup-next-steps-doc-only | effort | Scope unclear in source |
| x-error-boundaries-38-files-comprehensive-coverage-next-steps-doc-only | effort | Scope unclear in source |
| x-rate-limiting-352-352-routes-100-next-steps-doc-only | effort | Scope unclear in source |
| 100-bugs-doc-only | effort | Scope unclear in source |
| 4cc4726f3-next-steps-doc-only | effort | Scope unclear in source |
| extensive-missingstring-invalidnumbers-validpricing-validgeo-next-steps-aqar-lis | effort | Scope unclear in source |
| pm-generate-wos-cron-secret-header-validation-next-steps-doc-only | effort | Scope unclear in source |
| metrics-metrics-token-authentication-next-steps-doc-only | effort | Scope unclear in source |
| sla-check-super-admin-role-requirement-next-steps-doc-only | effort | Scope unclear in source |
| x-pnpm-vitest-run-2927-tests-passing-next-steps-doc-only | effort | Scope unclear in source |
| centralized-souq-fraud-return-windows-in-shared-config-with-tenant-overrides-ser | effort | Scope unclear in source |
| verification-pnpm-typecheck-pnpm-lint-pnpm-test-ci-all-passing-full-vitest-suite | effort | Scope unclear in source |
| next-evaluate-existing-dirty-app-api-changes-user-owned-before-merging-optionall | effort | Scope unclear in source |
| env-enforcement-drift-s3-config-now-throws-in-production-when-missing-ensure-dep | effort | Scope unclear in source |
| ran-repo-wide-rg-n-hardcod-sweep-across-app-lib-scripts-docs-to-re-confirm-remai | effort | Scope unclear in source |
| branch-feat-marketplace-api-tests-working-tree-already-dirty-from-prior-sessions | effort | Scope unclear in source |
| next-parameterize-residual-hardcoded-credentials-config-centralize-souq-rule-win | effort | Scope unclear in source |
| config-enforcement-for-hardcoded-sensitive-values-bugs-doc-only | effort | Scope unclear in source |
| current-efficiency-doc-only | effort | Scope unclear in source |
| 539-docs-pending-update-pending-master-v17-0-paytabs-tap-cleanup-efficiency-doc- | effort | Scope unclear in source |
| 540-docs-pending-update-pending-master-v18-0-system-wide-scan-efficiency-doc-onl | effort | Scope unclear in source |
| 542-wip-update-pending-master-to-v17-0-for-paytabs-tap-cleanup-efficiency-doc-on | effort | Scope unclear in source |
| 546-wip-update-pending-master-v18-0-for-system-wide-scan-efficiency-doc-only | effort | Scope unclear in source |
| this-entry-efficiency-doc-only | effort | Scope unclear in source |
| lib-otp-store-redis-ts-updated-otpdata-interface-next-steps-lib-otp-store-redis- | effort | Scope unclear in source |
| professional-html-email-template-with-branding-next-steps-doc-only | effort | Scope unclear in source |
| per-email-rate-limiting-prevents-email-bombing-next-steps-doc-only | effort | Scope unclear in source |
| fallback-to-sms-if-no-email-registered-next-steps-doc-only | effort | Scope unclear in source |
| email-masking-in-responses-u-example-com-next-steps-doc-only | effort | Scope unclear in source |
| communication-logging-includes-delivery-method-next-steps-doc-only | effort | Scope unclear in source |
| pending-master-v18-0-missing-tests-doc-only | effort | Scope unclear in source |
| pending-master-v17-0-missing-tests-doc-only | effort | Scope unclear in source |
| close-9-stale-draft-prs-539-547-15m-missing-tests-doc-only | effort | Scope unclear in source |
| add-rate-limiting-to-3-legacy-routes-30m-missing-tests-doc-only | effort | Scope unclear in source |
| check-4-similar-ref-patterns-for-type-errors-30m-missing-tests-doc-only | effort | Scope unclear in source |
| merge-pr-548-after-approval-missing-tests-doc-only | effort | Scope unclear in source |
| review-similar-dynamic-require-patterns-30m-missing-tests-doc-only | effort | Scope unclear in source |
| 6-missing-tests-doc-only | effort | Scope unclear in source |
| 0-found-missing-tests-doc-only | effort | Scope unclear in source |
| app-api-souq-products-route-ts-e-commerce-needs-protection-missing-tests-app-api | effort | Scope unclear in source |
| close-9-stale-draft-prs-15m-missing-tests-doc-only | effort | Scope unclear in source |
| review-2-json-parse-locations-without-try-catch-30m-missing-tests-doc-only | effort | Scope unclear in source |
| add-request-id-correlation-missing-tests-doc-only | effort | Scope unclear in source |
| add-apm-spans-for-critical-paths-missing-tests-doc-only | effort | Scope unclear in source |
| clean-missing-tests-doc-only | effort | Scope unclear in source |
| paytabs-tap-cleanup-missing-tests-doc-only | effort | Scope unclear in source |
| commit-pending-test-files-next-steps-doc-only | effort | Scope unclear in source |
| push-changes-to-remote-next-steps-doc-only | effort | Scope unclear in source |
| close-6-stale-draft-prs-539-544-next-steps-doc-only | effort | Scope unclear in source |
| add-zod-validation-to-remaining-routes-next-steps-doc-only | effort | Scope unclear in source |
| merge-feat-marketplace-api-tests-to-main-next-steps-doc-only | effort | Scope unclear in source |
| add-audit-logging-for-sensitive-operations-next-steps-doc-only | effort | Scope unclear in source |
| tests-server-api-counters-contract-test-ts-missing-tests-tests-server-api-counte | effort | Scope unclear in source |
| tests-unit-api-health-health-test-ts-missing-tests-tests-unit-api-health-health- | effort | Scope unclear in source |
| tests-unit-api-marketplace-search-route-test-ts-missing-tests-tests-unit-api-mar | effort | Scope unclear in source |
| 546-missing-tests-doc-only | effort | Scope unclear in source |
| 542-missing-tests-doc-only | effort | Scope unclear in source |
| 540-missing-tests-doc-only | effort | Scope unclear in source |
| 539-missing-tests-doc-only | effort | Scope unclear in source |
| openai-key-context-missing-tests-pr-agent-yml | effort | Scope unclear in source |
| implemented-efficiency-doc-only | effort | Scope unclear in source |
| 38-45-modules-84-efficiency-doc-only | effort | Scope unclear in source |
| assets-routes-1-test-needs-4-more-efficiency-doc-only | effort | Scope unclear in source |
| onboarding-flow-partial-coverage-needs-integration-tests-efficiency-doc-only | effort | Scope unclear in source |
| 80-efficiency-doc-only | effort | Scope unclear in source |
| 75-efficiency-doc-only | effort | Scope unclear in source |
| x-add-rate-limiting-to-marketplace-15-routes-already-complete-next-steps-doc-onl | effort | Scope unclear in source |
| x-add-zod-validation-to-top-20-write-endpoints-already-complete-next-steps-doc-o | effort | Scope unclear in source |
| x-add-rate-limiting-to-finance-10-remaining-routes-already-complete-19-19-routes | effort | Scope unclear in source |
| x-add-rate-limiting-to-hr-2-remaining-routes-already-complete-7-7-routes-next-st | effort | Scope unclear in source |
| x-add-rate-limiting-to-crm-4-remaining-routes-already-complete-4-4-routes-next-s | effort | Scope unclear in source |
| x-add-zod-validation-to-marketplace-routes-15-routes-already-complete-9-9-routes | effort | Scope unclear in source |
| app-api-marketplace-products-route-ts-post-next-steps-app-api-marketplace-produc | effort | Scope unclear in source |
| app-api-marketplace-cart-route-ts-post-next-steps-app-api-marketplace-cart-route | effort | Scope unclear in source |
| app-api-marketplace-checkout-route-ts-post-next-steps-app-api-marketplace-checko | effort | Scope unclear in source |
| app-api-hr-employees-route-ts-post-next-steps-app-api-hr-employees-route-ts | effort | Scope unclear in source |
| app-api-finance-accounts-route-ts-post-next-steps-app-api-finance-accounts-route | effort | Scope unclear in source |
| 33-bugs-doc-only | effort | Scope unclear in source |
| rate-limiting-audit-bugs-doc-only | effort | Scope unclear in source |
| lib-15-todos-mostly-optimization-notes-next-steps-doc-only | effort | Scope unclear in source |
| app-10-todos-feature-enhancements-next-steps-doc-only | effort | Scope unclear in source |
| services-4-todos-integration-improvements-next-steps-doc-only | effort | Scope unclear in source |
| tests-api-finance-invoices-route-test-ts-next-steps-tests-api-finance-invoices-r | effort | Scope unclear in source |
| and-6-others-next-steps-doc-only | effort | Scope unclear in source |
| 2-stubs-next-steps-doc-only | effort | Scope unclear in source |
| graphql-todo-stubs-next-steps-doc-only | effort | Scope unclear in source |
| uses-lib-sanitize-html-which-imports-dompurify-from-isomorphic-dompurify-next-st | effort | Scope unclear in source |
| applies-sanitize-strict-config-with-allowlist-of-safe-tags-next-steps-doc-only | effort | Scope unclear in source |
| allowed-tags-p-strong-em-u-a-ul-ol-li-br-span-div-h1-h6-pre-code-blockquote-tabl | effort | Scope unclear in source |
| allowed-attributes-href-target-rel-style-class-src-alt-title-next-steps-doc-only | effort | Scope unclear in source |
| blocked-all-javascript-event-handlers-onclick-onerror-etc-script-tags-iframe-etc | effort | Scope unclear in source |
| properties-resolver-was-todo-at-line-943-next-steps-doc-only | effort | Scope unclear in source |
| invoice-resolver-was-todo-at-line-987-next-steps-doc-only | effort | Scope unclear in source |
| both-resolvers-require-ctx-orgid-returns-empty-null-if-missing-next-steps-doc-on | effort | Scope unclear in source |
| both-use-settenantcontext-cleartenantcontext-for-proper-isolation-next-steps-doc | effort | Scope unclear in source |
| invoice-resolver-validates-objectid-before-querying-next-steps-doc-only | effort | Scope unclear in source |
| explicit-orgid-filter-in-query-prevents-cross-tenant-access-next-steps-doc-only | effort | Scope unclear in source |
| app-aqar-error-tsx-imports-logger-next-steps-app-aqar-error-ts | effort | Scope unclear in source |
| app-about-error-tsx-imports-logger-next-steps-app-about-error-ts | effort | Scope unclear in source |
| 20-other-client-components-using-logger-next-steps-doc-only | effort | Scope unclear in source |
| used-variable-for-module-name-to-prevent-compile-time-resolution-next-steps-doc- | effort | Scope unclear in source |
| result-0-other-client-components-have-dynamic-imports-next-steps-doc-only | effort | Scope unclear in source |
| status-no-additional-risks-identified-next-steps-doc-only | effort | Scope unclear in source |
| GQL-002 | effort | Scope unclear in source |
| PR-001 | effort | Scope unclear in source |
| 95-next-steps-doc-only | effort | Scope unclear in source |
| 116-352-33-next-steps-doc-only | effort | Scope unclear in source |
| properties-has-org-guard-but-todo-stub-next-steps-doc-only | effort | Scope unclear in source |
| invoice-has-org-guard-but-todo-stub-next-steps-doc-only | effort | Scope unclear in source |
| organization-uses-org-fallback-pattern-next-steps-doc-only | effort | Scope unclear in source |
| creategraphqlhandler-disabled-deps-missing-branches-missing-tests-doc-only | effort | Scope unclear in source |
| properties-invoice-have-guards-but-todo-stubs-missing-tests-doc-only | effort | Scope unclear in source |
| 84-missing-tests-doc-only | effort | Scope unclear in source |
| graphql-review-missing-tests-doc-only | effort | Scope unclear in source |
| pending-master-v42-0-created-missing-tests-doc-only | effort | Scope unclear in source |
| 717df925c-missing-tests-doc-only | effort | Scope unclear in source |
| 60-req-min-missing-tests-doc-only | effort | Scope unclear in source |
| branch-fix-graphql-resolver-todos-planning-only-this-session-no-new-code-committ | effort | Scope unclear in source |
| identified-graphql-query-resolver-gaps-orgid-fallback-to-userid-missing-tenant-a | effort | Scope unclear in source |
| plan-enforce-required-org-context-for-all-query-resolvers-wrap-reads-with-tenant | effort | Scope unclear in source |
| verification-pending-rerun-pnpm-typecheck-pnpm-lint-pnpm-test-after-implementing | effort | Scope unclear in source |
| isolation-missing-tenant-audit-context-on-reads-workorders-workorder-dashboardst | effort | Scope unclear in source |
| tenant-context-missing-uniformly-on-reads-unlike-mutations-no-query-resolver-wra | effort | Scope unclear in source |
| confirmed-auto-monitor-health-checks-running-while-logged-out-spamming-api-help- | effort | Scope unclear in source |
| otp-send-and-forgot-password-flows-returning-500-password-reset-also-logs-a-stub | effort | Scope unclear in source |
| plan-gate-auto-monitor-startup-on-authenticated-session-and-ssr-feature-flag-dis | effort | Scope unclear in source |
| missing-tests-add-coverage-for-auth-gated-monitoring-start-backoff-alert-posting | effort | Scope unclear in source |
| auth-flows-failing-together-both-otp-send-and-forgot-password-endpoints-return-5 | effort | Scope unclear in source |
| observed-repeated-401-403-spam-from-auto-monitor-health-checks-hitting-api-help- | effort | Scope unclear in source |
| post-api-auth-otp-send-returning-500-post-api-auth-forgot-password-returning-500 | effort | Scope unclear in source |
| plan-gate-auto-monitoring-health-checks-on-authenticated-session-ssr-make-monito | effort | Scope unclear in source |
| bugs-logic-auto-monitor-unauthorized-calls-otp-send-and-forgot-password-500s-hea | effort | Scope unclear in source |
| missing-tests-auth-gated-monitoring-error-handling-otp-forgot-password-flows-qa- | effort | Scope unclear in source |
| auto-monitor-pattern-reused-across-components-triggering-unauthenticated-loops-n | effort | Scope unclear in source |
| 36-blocking-bugs-doc-only | effort | Scope unclear in source |
| missing-model-helper-types-employeemutable-employeedoclike-usermutable-hydratedd | effort | Scope unclear in source |
| rate-limit-helper-missing-next-steps-app-api-billing-upgrade-route-ts | effort | Scope unclear in source |
| no-coverage-for-admin-notification-config-test-routes-or-support-impersonation-a | effort | Scope unclear in source |
| 40-missing-tests-doc-only | effort | Scope unclear in source |
| unknown-next-steps-doc-only | effort | Scope unclear in source |
| lib-sanitize-html-ts-manually-imported-jsdom-node-js-only-library-next-steps-lib | effort | Scope unclear in source |
| import-chain-safehtml-tsx-sanitize-html-ts-jsdom-next-steps-safehtml-ts | effort | Scope unclear in source |
| webpack-tried-to-bundle-child-process-for-client-side-impossible-next-steps-doc- | effort | Scope unclear in source |
| when-minification-encountered-this-error-it-tried-to-create-a-webpackerror-next- | effort | Scope unclear in source |
| the-real-error-was-masked-by-the-webpackerror-constructor-failure-next-steps-doc | effort | Scope unclear in source |
| lib-aws-secrets-ts-only-imported-in-api-routes-next-steps-lib-aws-secrets-ts | effort | Scope unclear in source |
| lib-redis-ts-only-imported-in-api-routes-next-steps-lib-redis-ts | effort | Scope unclear in source |
| lib-redis-client-ts-only-imported-in-api-routes-next-steps-lib-redis-client-ts | effort | Scope unclear in source |
| app-aqar-filters-page-tsx-121-filter-state-parsing-next-steps-app-aqar-filters-p | effort | Scope unclear in source |
| app-shell-clientsidebar-tsx-129-websocket-event-next-steps-app-shell-clientsideb | effort | Scope unclear in source |
| app-marketplace-vendor-products-upload-page-tsx-151-form-specs-next-steps-app-ma | effort | Scope unclear in source |
| app-api-projects-route-ts-72-header-parsing-efficiency-app-api-projects-route-ts | effort | Scope unclear in source |
| app-api-webhooks-sendgrid-route-ts-86-webhook-payload-next-steps-app-api-webhook | effort | Scope unclear in source |
| app-api-webhooks-taqnyat-route-ts-152-sms-webhook-next-steps-app-api-webhooks-ta | effort | Scope unclear in source |
| effort-30-minutes-next-steps-doc-only | effort | Scope unclear in source |
| impact-prevents-runtime-crashes-on-malformed-data-next-steps-doc-only | effort | Scope unclear in source |
| effort-15-minutes-next-steps-doc-only | effort | Scope unclear in source |
| impact-security-verification-next-steps-doc-only | effort | Scope unclear in source |
| graphql-todo-stubs-missing-tests-lib-graphql-index-ts | effort | Scope unclear in source |
| missing-env-vars-missing-tests-tests-e2e-auth-spec-ts | effort | Scope unclear in source |
| app-api-finance-invoices-route-ts-next-steps-app-api-finance-invoices-route-ts | effort | Scope unclear in source |
| app-api-finance-journals-id-post-route-ts-next-steps-post-route-ts | effort | Scope unclear in source |
| app-api-finance-journals-id-void-route-ts-next-steps-void-route-ts | effort | Scope unclear in source |
| app-api-finance-payments-id-complete-route-ts-next-steps-complete-route-ts | effort | Scope unclear in source |
| app-api-finance-reports-owner-statement-route-ts-next-steps-app-api-finance-repo | effort | Scope unclear in source |
| app-api-health-auth-route-ts-next-steps-app-api-health-auth-route-ts | effort | Scope unclear in source |
| app-api-health-database-route-ts-next-steps-app-api-health-database-route-ts | effort | Scope unclear in source |
| app-api-health-db-diag-route-ts-next-steps-app-api-health-db-diag-route-ts | effort | Scope unclear in source |
| app-api-health-debug-route-ts-next-steps-app-api-health-debug-route-ts | effort | Scope unclear in source |
| app-api-health-live-route-ts-next-steps-app-api-health-live-route-ts | effort | Scope unclear in source |
| app-api-health-ready-route-ts-next-steps-app-api-health-ready-route-ts | effort | Scope unclear in source |
| app-api-health-route-ts-next-steps-app-api-health-route-ts | effort | Scope unclear in source |
| app-api-health-sms-route-ts-next-steps-app-api-health-sms-route-ts | effort | Scope unclear in source |
| app-api-help-articles-id-comments-route-ts-next-steps-comments-route-ts | effort | Scope unclear in source |
| app-api-help-context-route-ts-next-steps-app-api-help-context-route-ts | effort | Scope unclear in source |
| app-api-marketplace-categories-route-ts-next-steps-app-api-marketplace-categorie | effort | Scope unclear in source |
| app-api-marketplace-orders-route-ts-next-steps-app-api-marketplace-orders-route- | effort | Scope unclear in source |
| app-api-marketplace-search-route-ts-next-steps-app-api-marketplace-search-route- | effort | Scope unclear in source |
| app-api-onboarding-caseid-complete-tutorial-route-ts-next-steps-complete-tutoria | effort | Scope unclear in source |
| app-api-onboarding-caseid-documents-confirm-upload-route-ts-next-steps-documents | effort | Scope unclear in source |
| app-api-onboarding-caseid-documents-request-upload-route-ts-next-steps-documents | effort | Scope unclear in source |
| app-api-onboarding-documents-id-review-route-ts-next-steps-review-route-ts | effort | Scope unclear in source |
| app-api-onboarding-initiate-route-ts-next-steps-app-api-onboarding-initiate-rout | effort | Scope unclear in source |
| app-api-onboarding-route-ts-next-steps-app-api-onboarding-route-ts | effort | Scope unclear in source |
| app-api-webhooks-carrier-tracking-route-ts-next-steps-app-api-webhooks-carrier-t | effort | Scope unclear in source |
| app-api-webhooks-sendgrid-route-ts-next-steps-app-api-webhooks-sendgrid-route-ts | effort | Scope unclear in source |
| app-api-webhooks-taqnyat-route-ts-next-steps-app-api-webhooks-taqnyat-route-ts | effort | Scope unclear in source |
| lib-config-tenant-ts-exported-constants-next-steps-lib-config-tenant-ts | effort | Scope unclear in source |
| 147-352-42-next-steps-doc-only | effort | Scope unclear in source |
| git-status-only-pnpm-lock-yaml-modified-next-steps-pnpm-lock-yaml | effort | Scope unclear in source |
| aqar-rate-limiting-100-complete-16-16-routes-next-steps-doc-only | effort | Scope unclear in source |
| production-readiness-91-next-steps-doc-only | effort | Scope unclear in source |
| total-unprotected-routes-205-next-steps-doc-only | effort | Scope unclear in source |
| health-test-demo-endpoints-acceptable-16-next-steps-doc-only | effort | Scope unclear in source |
| webhook-endpoints-need-separate-handling-4-next-steps-doc-only | effort | Scope unclear in source |
| routes-needing-protection-185-next-steps-doc-only | effort | Scope unclear in source |
| app-api-admin-audit-logs-route-ts-next-steps-app-api-admin-audit-logs-route-ts | effort | Scope unclear in source |
| app-api-admin-billing-benchmark-route-ts-next-steps-app-api-admin-billing-benchm | effort | Scope unclear in source |
| app-api-admin-billing-pricebooks-route-ts-next-steps-app-api-admin-billing-price | effort | Scope unclear in source |
| app-api-admin-discounts-route-ts-next-steps-app-api-admin-discounts-route-ts | effort | Scope unclear in source |
| app-api-admin-notifications-config-route-ts-next-steps-app-api-admin-notificatio | effort | Scope unclear in source |
| app-api-admin-notifications-history-route-ts-next-steps-app-api-admin-notificati | effort | Scope unclear in source |
| app-api-admin-notifications-send-route-ts-next-steps-app-api-admin-notifications | effort | Scope unclear in source |
| app-api-admin-notifications-test-route-ts-next-steps-app-api-admin-notifications | effort | Scope unclear in source |
| app-api-admin-price-tiers-route-ts-next-steps-app-api-admin-price-tiers-route-ts | effort | Scope unclear in source |
| app-api-admin-sms-route-ts-next-steps-app-api-admin-sms-route-ts | effort | Scope unclear in source |
| app-api-admin-users-route-ts-next-steps-app-api-admin-users-route-ts | effort | Scope unclear in source |
| app-api-aqar-chat-route-ts-next-steps-app-api-aqar-chat-route-ts | effort | Scope unclear in source |
| app-api-aqar-listings-search-route-ts-next-steps-app-api-aqar-listings-search-ro | effort | Scope unclear in source |
| app-api-aqar-map-route-ts-next-steps-app-api-aqar-map-route-ts | effort | Scope unclear in source |
| app-api-aqar-pricing-route-ts-next-steps-app-api-aqar-pricing-route-ts | effort | Scope unclear in source |
| app-api-aqar-properties-route-ts-next-steps-app-api-aqar-properties-route-ts | effort | Scope unclear in source |
| app-api-aqar-recommendations-route-ts-next-steps-app-api-aqar-recommendations-ro | effort | Scope unclear in source |
| app-api-aqar-support-chatbot-route-ts-next-steps-app-api-aqar-support-chatbot-ro | effort | Scope unclear in source |
| app-api-auth-force-logout-route-ts-next-steps-app-api-auth-force-logout-route-ts | effort | Scope unclear in source |
| app-api-auth-forgot-password-route-ts-next-steps-app-api-auth-forgot-password-ro | effort | Scope unclear in source |
| app-api-auth-me-route-ts-next-steps-app-api-auth-me-route-ts | effort | Scope unclear in source |
| app-api-auth-post-login-route-ts-next-steps-app-api-auth-post-login-route-ts | effort | Scope unclear in source |
| app-api-auth-refresh-route-ts-next-steps-app-api-auth-refresh-route-ts | effort | Scope unclear in source |
| app-api-auth-reset-password-route-ts-next-steps-app-api-auth-reset-password-rout | effort | Scope unclear in source |
| app-api-auth-signup-route-ts-next-steps-app-api-auth-signup-route-ts | effort | Scope unclear in source |
| app-api-auth-test-credentials-debug-route-ts-next-steps-app-api-auth-test-creden | effort | Scope unclear in source |
| app-api-auth-test-session-route-ts-next-steps-app-api-auth-test-session-route-ts | effort | Scope unclear in source |
| app-api-auth-verify-route-ts-next-steps-app-api-auth-verify-route-ts | effort | Scope unclear in source |
| app-api-auth-verify-send-route-ts-next-steps-app-api-auth-verify-send-route-ts | effort | Scope unclear in source |
| app-api-ats-analytics-route-ts-next-steps-app-api-ats-analytics-route-ts | effort | Scope unclear in source |
| app-api-ats-applications-route-ts-next-steps-app-api-ats-applications-route-ts | effort | Scope unclear in source |
| app-api-ats-convert-to-employee-route-ts-next-steps-app-api-ats-convert-to-emplo | effort | Scope unclear in source |
| app-api-ats-interviews-route-ts-next-steps-app-api-ats-interviews-route-ts | effort | Scope unclear in source |
| app-api-ats-jobs-id-apply-route-ts-next-steps-apply-route-ts | effort | Scope unclear in source |
| app-api-ats-jobs-id-publish-route-ts-next-steps-publish-route-ts | effort | Scope unclear in source |
| app-api-ats-jobs-public-route-ts-next-steps-app-api-ats-jobs-public-route-ts | effort | Scope unclear in source |
| app-api-ats-jobs-route-ts-next-steps-app-api-ats-jobs-route-ts | effort | Scope unclear in source |
| app-api-ats-moderation-route-ts-next-steps-app-api-ats-moderation-route-ts | effort | Scope unclear in source |
| app-api-ats-public-post-route-ts-next-steps-app-api-ats-public-post-route-ts | effort | Scope unclear in source |
| app-api-ats-settings-route-ts-next-steps-app-api-ats-settings-route-ts | effort | Scope unclear in source |
| app-api-billing-charge-recurring-route-ts-next-steps-app-api-billing-charge-recu | effort | Scope unclear in source |
| app-api-billing-history-route-ts-next-steps-app-api-billing-history-route-ts | effort | Scope unclear in source |
| app-api-billing-quote-route-ts-next-steps-app-api-billing-quote-route-ts | effort | Scope unclear in source |
| app-api-billing-subscribe-route-ts-next-steps-app-api-billing-subscribe-route-ts | effort | Scope unclear in source |
| 69-missing-tests-doc-only | effort | Scope unclear in source |
| p0-review-graphql-todo-stubs-decide-if-full-implementation-needed-or-remove-next | effort | Scope unclear in source |
| p1-add-rate-limiting-to-auth-routes-12-routes-prevent-brute-force-next-steps-doc | effort | Scope unclear in source |
| p1-add-rate-limiting-to-payments-routes-4-routes-critical-for-billing-next-steps | effort | Scope unclear in source |
| p1-add-rate-limiting-to-finance-routes-10-routes-protect-sensitive-data-next-ste | effort | Scope unclear in source |
| p2-add-safejson-utility-for-json-parse-calls-next-steps-doc-only | effort | Scope unclear in source |
| p2-verify-test-imports-in-2-potentially-stale-test-files-next-steps-doc-only | effort | Scope unclear in source |
| p3-add-rate-limiting-to-remaining-modules-marketplace-copilot-ats-next-steps-doc | effort | Scope unclear in source |
| issue-185-routes-lack-enforceratelimit-call-next-steps-doc-only | effort | Scope unclear in source |
| solution-add-to-all-api-routes-with-appropriate-limits-per-http-method-next-step | effort | Scope unclear in source |
| issue-8-instances-of-unprotected-json-parse-next-steps-doc-only | effort | Scope unclear in source |
| similar-all-in-different-modules-aqar-shell-api-routes-marketplace-help-next-ste | effort | Scope unclear in source |
| solution-create-lib-utils-safejson-ts-utility-and-replace-all-instances-next-ste | effort | Scope unclear in source |
| issue-2-todos-in-resolvers-returning-empty-data-next-steps-doc-only | effort | Scope unclear in source |
| impact-properties-and-invoice-queries-return-no-data-next-steps-doc-only | effort | Scope unclear in source |
| solution-implement-actual-queries-or-document-as-not-implemented-next-steps-doc- | effort | Scope unclear in source |
| all-validations-pass-next-steps-doc-only | effort | Scope unclear in source |
| status-complete-next-steps-doc-only | effort | Scope unclear in source |
| coverage-100-16-16-routes-protected-next-steps-doc-only | effort | Scope unclear in source |
| aqar-insights-pricing-60-req-min-reads-next-steps-doc-only | effort | Scope unclear in source |
| aqar-favorites-get-60-min-post-30-min-next-steps-doc-only | effort | Scope unclear in source |
| aqar-favorites-id-delete-20-min-next-steps-doc-only | effort | Scope unclear in source |
| aqar-listings-post-30-min-next-steps-doc-only | effort | Scope unclear in source |
| aqar-listings-id-get-60-min-patch-30-min-delete-20-min-next-steps-doc-only | effort | Scope unclear in source |
| aqar-listings-recommendations-get-60-min-next-steps-doc-only | effort | Scope unclear in source |
| aqar-packages-get-60-min-post-20-min-next-steps-doc-only | effort | Scope unclear in source |
| aqar-offline-get-30-min-expensive-operation-next-steps-doc-only | effort | Scope unclear in source |
| pattern-enforceratelimit-with-keyprefix-per-endpoint-next-steps-doc-only | effort | Scope unclear in source |
| workorder-query-has-settenantcontext-org-filter-cleartenantcontext-in-finally-ne | effort | Scope unclear in source |
| dashboardstats-query-has-org-enforcement-returns-empty-if-no-orgid-next-steps-do | effort | Scope unclear in source |
| createworkorder-mutation-has-org-enforcement-rejects-if-no-orgid-next-steps-doc- | effort | Scope unclear in source |
| app-administration-error-tsx-next-steps-app-administration-error-ts | effort | Scope unclear in source |
| app-careers-error-tsx-next-steps-app-careers-error-ts | effort | Scope unclear in source |
| app-cms-error-tsx-next-steps-app-cms-error-ts | effort | Scope unclear in source |
| app-docs-error-tsx-next-steps-app-docs-error-ts | effort | Scope unclear in source |
| app-forgot-password-error-tsx-next-steps-app-forgot-password-error-ts | effort | Scope unclear in source |
| app-help-error-tsx-next-steps-app-help-error-ts | effort | Scope unclear in source |
| app-login-error-tsx-next-steps-app-login-error-ts | effort | Scope unclear in source |
| app-notifications-error-tsx-next-steps-app-notifications-error-ts | effort | Scope unclear in source |
| app-pricing-error-tsx-next-steps-app-pricing-error-ts | effort | Scope unclear in source |
| app-product-error-tsx-next-steps-app-product-error-ts | effort | Scope unclear in source |
| app-profile-error-tsx-next-steps-app-profile-error-ts | effort | Scope unclear in source |
| app-reports-error-tsx-next-steps-app-reports-error-ts | effort | Scope unclear in source |
| app-support-error-tsx-next-steps-app-support-error-ts | effort | Scope unclear in source |
| app-system-error-tsx-next-steps-app-system-error-ts | effort | Scope unclear in source |
| app-vendor-error-tsx-next-steps-app-vendor-error-ts | effort | Scope unclear in source |
| 139-352-39-next-steps-doc-only | effort | Scope unclear in source |
| 213-352-61-next-steps-doc-only | effort | Scope unclear in source |
| 29-next-steps-doc-only | effort | Scope unclear in source |
| api-routes-missing-tests-doc-only | effort | Scope unclear in source |
| 117-next-steps-copilot-chat-route-ts | effort | Scope unclear in source |
| 72-next-steps-projects-route-ts | effort | Scope unclear in source |
| app-help-slug-helparticleclient-tsx-help-articles-sanitized-next-steps-helpartic | effort | Scope unclear in source |
| components-safehtml-tsx-sanitization-wrapper-itself-next-steps-components-safeht | effort | Scope unclear in source |
| merge-pr-fix-graphql-resolver-todos-next-steps-doc-only | effort | Scope unclear in source |
| close-stale-draft-prs-539-544-next-steps-doc-only | effort | Scope unclear in source |
| rate-limiting-payments-4-routes-next-steps-doc-only | effort | Scope unclear in source |
| rate-limiting-auth-12-routes-next-steps-doc-only | effort | Scope unclear in source |
| rate-limiting-aqar-15-routes-next-steps-doc-only | effort | Scope unclear in source |
| rate-limiting-finance-11-routes-next-steps-doc-only | effort | Scope unclear in source |
| add-try-catch-to-json-parse-4-files-next-steps-doc-only | effort | Scope unclear in source |
| api-tests-aqar-module-16-routes-next-steps-doc-only | effort | Scope unclear in source |
| api-tests-hr-module-7-routes-next-steps-doc-only | effort | Scope unclear in source |
| review-29-todo-fixme-comments-next-steps-doc-only | effort | Scope unclear in source |
| total-next-steps-doc-only | effort | Scope unclear in source |
| commit-push-p1-rate-limiting-next-steps-doc-only | effort | Scope unclear in source |
| analytics-subscriptionbillingservice-payroll-escalation-next-steps-doc-only | effort | Scope unclear in source |
| attendance-hr-notification-payroll-finance-ics-next-steps-doc-only | effort | Scope unclear in source |
| 51-352-14-efficiency-doc-only | effort | Scope unclear in source |
| 111-352-32-efficiency-doc-only | effort | Scope unclear in source |
| 30-efficiency-doc-only | effort | Scope unclear in source |
| 5-all-draft-efficiency-doc-only | effort | Scope unclear in source |
| close-stale-draft-prs-540-544-next-steps-doc-only | effort | Scope unclear in source |
| rate-limiting-souq-module-next-steps-doc-only | effort | Scope unclear in source |
| rate-limiting-fm-module-next-steps-doc-only | effort | Scope unclear in source |
| rate-limiting-admin-module-next-steps-doc-only | effort | Scope unclear in source |
| zod-validation-expansion-next-steps-doc-only | effort | Scope unclear in source |
| error-boundaries-for-subpages-next-steps-doc-only | effort | Scope unclear in source |
| remaining-service-tests-next-steps-doc-only | effort | Scope unclear in source |
| total-routes-efficiency-doc-only | effort | Scope unclear in source |
| total-tests-2814-passing-next-steps-doc-only | effort | Scope unclear in source |
| test-files-282-next-steps-doc-only | effort | Scope unclear in source |
| coverage-all-core-functionality-tested-next-steps-doc-only | effort | Scope unclear in source |
| mostly-missing-next-steps-doc-only | effort | Scope unclear in source |
| app-api-fm-vendors-route-ts-find-without-limit-next-steps-app-api-fm-vendors-rou | effort | Scope unclear in source |
| various-aggregation-pipelines-missing-limit-stage-next-steps-doc-only | effort | Scope unclear in source |
| app-root-main-app-shell-next-steps-doc-only | effort | Scope unclear in source |
| app-aqar-filters-app-aqar-map-property-features-next-steps-doc-only | effort | Scope unclear in source |
| app-work-orders-board-app-work-orders-new-core-wo-features-next-steps-doc-only | effort | Scope unclear in source |
| app-fm-vendors-app-fm-invoices-fm-operations-next-steps-doc-only | effort | Scope unclear in source |
| identified-rate-limiting-gaps-next-steps-doc-only | effort | Scope unclear in source |
| 30-core-25-missing-subpages-next-steps-doc-only | effort | Scope unclear in source |
| 5-services-need-tests-next-steps-doc-only | effort | Scope unclear in source |
| system-wide-scan-docs-next-steps-doc-only | effort | Scope unclear in source |
| 119-352-34-missing-tests-doc-only | effort | Scope unclear in source |
| 11-missing-tests-doc-only | effort | Scope unclear in source |
| add-missing-service-tests-next-steps-doc-only | effort | Scope unclear in source |
| server-services-efficiency-doc-only | effort | Scope unclear in source |
| risk-missing-tests-doc-only | effort | Scope unclear in source |
| test-coverage-8-pattern-detection-tests-in-org-enforcement-test-ts-next-steps-or | effort | Scope unclear in source |
| pattern-using-errors-instead-of-issues-on-zoderror-next-steps-doc-only | effort | Scope unclear in source |
| fix-changed-to-error-issues-in-all-affected-routes-next-steps-doc-only | effort | Scope unclear in source |
| test-coverage-zod-validation-test-ts-checks-for-this-pattern-next-steps-zod-vali | effort | Scope unclear in source |
| app-api-souq-reviews-route-ts-sec-fix-orgid-required-next-steps-app-api-souq-rev | effort | Scope unclear in source |
| app-api-aqar-listings-route-ts-sec-fix-orgid-required-next-steps-app-api-aqar-li | effort | Scope unclear in source |
| app-api-aqar-packages-route-ts-sec-fix-orgid-required-next-steps-app-api-aqar-pa | effort | Scope unclear in source |
| app-api-aqar-favorites-route-ts-sec-fix-orgid-required-next-steps-app-api-aqar-f | effort | Scope unclear in source |
| app-api-souq-search-route-ts-fix-zod-error-access-next-steps-app-api-souq-search | effort | Scope unclear in source |
| app-properties-error-tsx-new-error-boundary-next-steps-app-properties-error-ts | effort | Scope unclear in source |
| app-vendors-error-tsx-new-error-boundary-next-steps-app-vendors-error-ts | effort | Scope unclear in source |
| tests-security-org-enforcement-test-ts-new-8-tests-next-steps-tests-security-org | effort | Scope unclear in source |
| tests-security-error-boundary-test-ts-new-3-tests-next-steps-tests-security-erro | effort | Scope unclear in source |
| tests-security-zod-validation-test-ts-new-5-tests-next-steps-tests-security-zod- | effort | Scope unclear in source |
| add-zod-to-52-remaining-routes-next-steps-doc-only | effort | Scope unclear in source |
| add-try-catch-to-8-routes-next-steps-doc-only | effort | Scope unclear in source |
| fix-graphql-orgid-isolation-next-steps-doc-only | effort | Scope unclear in source |
| add-tests-for-6-services-next-steps-doc-only | effort | Scope unclear in source |
| expand-rate-limiting-to-60-next-steps-doc-only | effort | Scope unclear in source |
| BUG-004 | effort | Scope unclear in source |
| path-missing-tests-doc-only | effort | Scope unclear in source |
| critical-functions-missing-tests-doc-only | effort | Scope unclear in source |
| missing-email-tocontain-invalid-input-missing-tests-doc-only | effort | Scope unclear in source |
| pr-ready-to-commit-and-merge-missing-tests-doc-only | effort | Scope unclear in source |
| expand-rate-limiting-to-hr-crm-next-steps-doc-only | effort | Scope unclear in source |
| server-security-ratelimit-smartratelimit-mockfn-next-steps-doc-only | effort | Scope unclear in source |
| server-security-headers-getclientip-vi-fn-next-steps-doc-only | effort | Scope unclear in source |
| mock-must-return-allowed-true-not-success-true-next-steps-doc-only | effort | Scope unclear in source |
| any-route-test-under-tests-api-next-steps-doc-only | effort | Scope unclear in source |
| must-be-applied-in-beforeeach-to-reset-between-tests-next-steps-doc-only | effort | Scope unclear in source |
| missing-required-field-invalid-input-expected-x-received-undefined-next-steps-do | effort | Scope unclear in source |
| invalid-format-schema-specific-message-e-g-invalid-email-format-next-steps-doc-o | effort | Scope unclear in source |
| tests-should-use-tocontain-for-robustness-against-message-changes-next-steps-doc | effort | Scope unclear in source |
| progress-master-pending-report-updated-with-latest-orgid-audit-cataloged-user-id | effort | Scope unclear in source |
| next-steps-enforce-orgid-tenant-audit-context-on-graphql-reads-writes-remove-use | effort | Scope unclear in source |
| normalize-org-once-per-graphql-request-and-reuse-across-resolvers-next-steps-doc | effort | Scope unclear in source |
| short-circuit-graphql-reads-when-orgid-missing-next-steps-doc-only | effort | Scope unclear in source |
| graphql-workorder-query-lacks-org-filter-next-steps-lib-graphql-index-ts-769-801 | effort | Scope unclear in source |
| graphql-createworkorder-writes-with-userid-fallback-next-steps-lib-graphql-index | effort | Scope unclear in source |
| souq-review-post-falls-back-to-user-id-next-steps-app-api-souq-reviews-route-ts- | effort | Scope unclear in source |
| aqar-listings-packages-favorites-use-user-id-fallback-next-steps-app-api-aqar-li | effort | Scope unclear in source |
| graphql-org-enforcement-tenant-audit-context-next-steps-doc-only | effort | Scope unclear in source |
| souq-review-post-org-requirement-next-steps-doc-only | effort | Scope unclear in source |
| aqar-listing-package-favorites-org-enforcement-next-steps-doc-only | effort | Scope unclear in source |
| user-id-as-orgid-fallbacks-recur-across-graphql-createworkorder-souq-review-post | effort | Scope unclear in source |
| graphql-reads-workorder-dashboardstats-properties-invoice-run-without-tenant-aud | effort | Scope unclear in source |
| souq-reviews-enforce-org-on-get-but-not-post-aqar-routes-show-the-same-user-as-o | effort | Scope unclear in source |
| 10-files-staged-unstaged-next-steps-doc-only | effort | Scope unclear in source |
| 7-missing-tests-doc-only | effort | Scope unclear in source |
| 4-missing-tests-doc-only | effort | Scope unclear in source |
| 19-missing-tests-doc-only | effort | Scope unclear in source |
| 25-missing-tests-doc-only | effort | Scope unclear in source |
| 15-missing-tests-doc-only | effort | Scope unclear in source |
| lint-not-yet-run-missing-tests-doc-only | effort | Scope unclear in source |
| tests-not-yet-run-missing-tests-doc-only | effort | Scope unclear in source |
| pr-ready-to-merge-after-tests-pass-missing-tests-doc-only | effort | Scope unclear in source |
| progress-master-pending-report-refreshed-with-latest-orgid-audit-cataloged-cross | effort | Scope unclear in source |
| next-steps-enforce-orgid-tenant-audit-context-on-graphql-resolvers-remove-user-i | effort | Scope unclear in source |
| fm-work-orders-id-assign-assigneeid-assigneetype-next-steps-doc-only | effort | Scope unclear in source |
| fm-work-orders-id-patch-status-priority-description-next-steps-doc-only | effort | Scope unclear in source |
| fm-work-orders-id-attachments-file-metadata-next-steps-doc-only | effort | Scope unclear in source |
| fm-properties-post-property-fields-next-steps-doc-only | effort | Scope unclear in source |
| fm-finance-expenses-amount-category-vendor-next-steps-doc-only | effort | Scope unclear in source |
| fm-finance-budgets-budget-fields-next-steps-doc-only | effort | Scope unclear in source |
| kb-ingest-kb-search-document-content-next-steps-doc-only | effort | Scope unclear in source |
| fm-marketplace-vendor-listings-orders-next-steps-doc-only | effort | Scope unclear in source |
| fm-system-roles-user-invites-next-steps-doc-only | effort | Scope unclear in source |
| fm-support-tickets-escalations-next-steps-doc-only | effort | Scope unclear in source |
| run-pnpm-typecheck-pnpm-lint-pnpm-test-next-steps-doc-only | effort | Scope unclear in source |
| commit-staged-changes-next-steps-doc-only | effort | Scope unclear in source |
| add-zod-validation-to-52-routes-next-steps-doc-only | effort | Scope unclear in source |
| add-try-catch-to-5-routes-next-steps-doc-only | effort | Scope unclear in source |
| add-error-boundaries-8-dirs-next-steps-doc-only | effort | Scope unclear in source |
| not-run-pending-next-steps-doc-only | effort | Scope unclear in source |
| kept-markdown-rendering-and-safehtml-rendering-under-dompurify-sanitized-json-ld | effort | Scope unclear in source |
| locked-api-sms-test-behind-a-production-404-while-retaining-super-admin-rate-lim | effort | Scope unclear in source |
| not-run-in-this-session-please-execute-pnpm-typecheck-pnpm-lint-pnpm-test-before | effort | Scope unclear in source |
| progress-master-pending-report-located-and-updated-with-orgid-audit-expanded-rev | effort | Scope unclear in source |
| next-steps-enforce-required-orgid-tenant-audit-context-on-graphql-reads-writes-r | effort | Scope unclear in source |
| normalize-org-once-per-graphql-request-and-reuse-next-steps-doc-only | effort | Scope unclear in source |
| aqar-package-payment-creation-uses-user-id-fallback-next-steps-app-api-aqar-pack | effort | Scope unclear in source |
| aqar-favorites-uses-user-id-fallback-for-tenant-scope-next-steps-app-api-aqar-fa | effort | Scope unclear in source |
| souq-review-creation-org-requirement-next-steps-doc-only | effort | Scope unclear in source |
| graphql-reads-workorder-dashboardstats-properties-invoice-run-without-tenant-aud | effort | Scope unclear in source |
| souq-reviews-enforce-org-on-get-but-not-on-post-mirroring-the-broader-user-as-or | effort | Scope unclear in source |
| progress-master-pending-report-updated-with-latest-orgid-audit-risks-cataloged-a | effort | Scope unclear in source |
| user-id-as-orgid-fallbacks-repeat-across-graphql-createworkorder-souq-review-pos | effort | Scope unclear in source |
| graphql-reads-workorder-dashboardstats-properties-invoice-run-without-tenant-aud | effort | Scope unclear in source |
| souq-reviews-enforce-org-on-get-but-not-post-aqar-routes-show-the-same-user-as-o | effort | Scope unclear in source |
| 117-352-33-next-steps-doc-only | effort | Scope unclear in source |
| verify-next-steps-properties-route-ts | effort | Scope unclear in source |
| lib-finance-missing-tests-pricing-ts | effort | Scope unclear in source |
| use-health503-lib-api-health-ts-for-consistent-503-responses-instead-of-ad-hoc-j | effort | Scope unclear in source |
| zod-parse-failures-surface-as-500-where-parse-is-used-directly-switch-to-safepar | effort | Scope unclear in source |
| payloads-that-partially-validate-can-proceed-to-db-writes-in-the-above-routes-en | effort | Scope unclear in source |
| auth-infra-vs-auth-failure-responses-are-inconsistent-routes-not-using-safe-sess | effort | Scope unclear in source |
| add-negative-tests-for-malformed-json-and-invalid-payloads-for-checkout-quote-ch | effort | Scope unclear in source |
| add-unit-tests-for-parsejsonbody-success-error-branches-and-safe-session-503-vs- | effort | Scope unclear in source |
| auth-infra-separation-new-safe-session-helper-provides-503-vs-401-discrimination | effort | Scope unclear in source |
| next-fix-zod-record-signature-in-transition-route-widen-error-path-typing-in-wor | effort | Scope unclear in source |
| add-focused-tests-around-invalid-metadata-comment-payloads-and-validation-error- | effort | Scope unclear in source |
| missing-tests-add-negative-cases-for-invalid-metadata-non-object-non-string-keys | effort | Scope unclear in source |
| merge-pr-from-fix-graphql-resolver-todos-bugs-doc-only | effort | Scope unclear in source |
| add-dompurify-to-10-dangerouslysetinnerhtml-usages-bugs-doc-only | effort | Scope unclear in source |
| increase-rate-limiting-coverage-34-60-bugs-doc-only | effort | Scope unclear in source |
| audit-21-console-statements-bugs-doc-only | effort | Scope unclear in source |
| push-local-commit-70fab2816-next-steps-doc-only | effort | Scope unclear in source |
| add-rate-limiting-to-6-auth-routes-next-steps-doc-only | effort | Scope unclear in source |
| add-try-catch-to-4-json-parse-usages-next-steps-doc-only | effort | Scope unclear in source |
| add-dompurify-to-8-dangerouslysetinnerhtml-2-are-json-stringify-safe-next-steps- | effort | Scope unclear in source |
| expand-rate-limit-coverage-to-50-next-steps-doc-only | effort | Scope unclear in source |
| add-rate-limiting-to-auth-routes-1-hour-effort-next-steps-doc-only | effort | Scope unclear in source |
| wrap-json-parse-in-webhooks-with-try-catch-30-min-next-steps-doc-only | effort | Scope unclear in source |
| add-dompurify-sanitization-low-risk-content-is-mostly-trusted-next-steps-doc-onl | effort | Scope unclear in source |
| 121-352-34-next-steps-doc-only | effort | Scope unclear in source |
| add-dompurify-to-8-dangerouslysetinnerhtml-next-steps-doc-only | effort | Scope unclear in source |
| add-rate-limiting-to-auth-routes-next-steps-doc-only | effort | Scope unclear in source |
| wrap-json-parse-in-webhook-routes-with-try-catch-next-steps-doc-only | effort | Scope unclear in source |
| add-tests-for-9-services-without-coverage-next-steps-doc-only | effort | Scope unclear in source |
| audit-unprotected-async-void-operations-next-steps-doc-only | effort | Scope unclear in source |
| 34-coverage-efficiency-doc-only | effort | Scope unclear in source |
| create-pr-for-fix-graphql-resolver-todos-branch-with-all-fixes-next-steps-doc-on | effort | Scope unclear in source |
| merge-comprehensive-type-safety-and-test-coverage-improvements-next-steps-doc-on | effort | Scope unclear in source |
| deploy-to-staging-for-e2e-validation-next-steps-doc-only | effort | Scope unclear in source |
| all-2650-tests-passing-100-next-steps-doc-only | effort | Scope unclear in source |
| eslint-0-warnings-next-steps-doc-only | effort | Scope unclear in source |
| no-as-any-type-bypasses-in-production-code-next-steps-doc-only | effort | Scope unclear in source |
| all-api-routes-have-error-handling-direct-or-via-factory-re-export-next-steps-do | effort | Scope unclear in source |
| lib-aqar-missing-tests-pricinginsights-ts | effort | Scope unclear in source |
| lib-aqar-missing-tests-recommendation-ts | effort | Scope unclear in source |
| lib-finance-missing-tests-decimal-ts | effort | Scope unclear in source |
| lib-finance-missing-tests-provision-ts | effort | Scope unclear in source |
| server-services-missing-tests-onboardingentities-ts | effort | Scope unclear in source |
| server-services-missing-tests-onboardingkpi-service-ts | effort | Scope unclear in source |
| server-services-missing-tests-subscriptionseatservice-ts | effort | Scope unclear in source |
| update-test-expectations-for-tenant-role-filter-test-needs-fixing-not-code-bugs- | effort | Scope unclear in source |
| investigate-playwright-timeout-issues-unrelated-to-production-code-bugs-doc-only | effort | Scope unclear in source |
| re-ran-pnpm-test-e2e-with-extended-timeout-suite-still-timed-out-copilot-isolati | effort | Scope unclear in source |
| efficiency-currency-feature-flag-type-single-sources-maintained-formatter-curren | effort | Scope unclear in source |
| missing-tests-new-coverage-for-checkout-happy-quote-error-tap-client-still-needs | effort | Scope unclear in source |
| sms-readiness-otp-flows-should-continue-to-gate-on-sms-config-and-log-delivery-e | effort | Scope unclear in source |
| tap-coverage-add-tests-for-refund-failures-api-error-codes-and-webhook-signature | effort | Scope unclear in source |
| verification-pnpm-typecheck-pnpm-lint-pnpm-test-models-pnpm-test-e2e-timed-out-1 | effort | Scope unclear in source |
| efficiency-currency-currencies-feature-flag-single-sources-already-consolidated- | effort | Scope unclear in source |
| bugs-logic-taqnyat-webhook-now-size-capped-and-json-safe-before-processing-souq- | effort | Scope unclear in source |
| sms-readiness-otp-flows-should-gate-on-issmsoperational-to-prevent-blackholes-ve | effort | Scope unclear in source |
| tap-payments-unit-coverage-exists-for-charge-helpers-add-scenarios-for-error-cod | effort | Scope unclear in source |
| needs-env-vars-missing-tests-doc-only | effort | Scope unclear in source |
| docs-pending-update-pending-master-v18-0-missing-tests-doc-only | effort | Scope unclear in source |
| docs-pending-update-pending-master-v17-0-missing-tests-doc-only | effort | Scope unclear in source |
| pending-p1-add-unit-tests-for-11-services-without-coverage-keep-lint-typecheck-t | effort | Scope unclear in source |
| pending-p2-replace-remaining-12-console-usages-with-logger-calls-next-steps-doc- | effort | Scope unclear in source |
| planned-actions-re-run-pnpm-lint-pnpm-test-after-upcoming-changes-keep-staging-r | effort | Scope unclear in source |
| gh-envs-for-release-gate-next-steps-doc-only | effort | Scope unclear in source |
| route-alias-correctness-aqar-chat-alias-required-correct-relative-path-and-runti | effort | Scope unclear in source |
| type-safety-in-mongoose-hooks-repeated-as-any-usage-stems-from-missing-hook-gene | effort | Scope unclear in source |
| logging-consistency-console-usage-outside-logger-remains-in-a-few-client-server- | effort | Scope unclear in source |
| app-api-fm-needs-verification-missing-tests-doc-only | effort | Scope unclear in source |
| 10-routes-missing-missing-tests-doc-only | effort | Scope unclear in source |
| 7-remaining-missing-tests-doc-only | effort | Scope unclear in source |
| 75-routes-missing-tests-doc-only | effort | Scope unclear in source |
| 19-routes-missing-tests-doc-only | effort | Scope unclear in source |
| 25-routes-missing-tests-doc-only | effort | Scope unclear in source |
| 7-routes-missing-tests-doc-only | effort | Scope unclear in source |
| SENTRY-001 | effort | Scope unclear in source |
| add-try-catch-to-69-api-routes-with-json-parse-missing-tests-doc-only | effort | Scope unclear in source |
| add-sentry-context-to-fm-souq-modules-missing-tests-doc-only | effort | Scope unclear in source |
| 20-routes-missing-tests-doc-only | effort | Scope unclear in source |
| add-try-catch-to-critical-api-routes-next-steps-doc-only | effort | Scope unclear in source |
| add-tests-for-ip-reputation-ts-next-steps-ip-reputation-ts | effort | Scope unclear in source |
| wrap-json-parse-in-safe-utility-next-steps-doc-only | effort | Scope unclear in source |
| app-api-work-orders-id-assign-route-ts-work-order-operations-next-steps-assign-r | effort | Scope unclear in source |
| lib-security-monitoring-ts-security-events-next-steps-lib-security-monitoring-ts | effort | Scope unclear in source |
| lib-logger-ts-error-capturing-next-steps-lib-logger-ts | effort | Scope unclear in source |
| lib-audit-ts-audit-trail-next-steps-lib-audit-ts | effort | Scope unclear in source |
| fm-module-no-context-tagging-next-steps-doc-only | effort | Scope unclear in source |
| souq-module-no-context-tagging-next-steps-doc-only | effort | Scope unclear in source |
| next-regenerate-lockfile-without-sql-prisma-knex-pg-mysql-instrumentations-fix-t | effort | Scope unclear in source |
| missing-tests-add-negative-invalid-json-tests-for-finance-hr-routes-add-payroll- | effort | Scope unclear in source |
| remove-7-todo-comments-in-lib-graphql-next-steps-doc-only | effort | Scope unclear in source |
| app-api-vendors-route-ts-app-api-vendors-route-ts-l140-next-steps-app-api-vendor | effort | Scope unclear in source |
| app-api-payments-create-route-ts-app-api-payments-create-route-ts-l116-next-step | effort | Scope unclear in source |
| app-api-work-orders-id-status-route-ts-app-api-work-orders-id-status-route-ts-l7 | effort | Scope unclear in source |
| lib-logger-ts-250-logger-utility-needs-generic-error-handling-next-steps-lib-log | effort | Scope unclear in source |
| server-plugins-fieldencryption-ts-mongoose-plugin-requires-dynamic-types-next-st | effort | Scope unclear in source |
| server-models-hr-models-ts-pii-encryption-hooks-next-steps-server-models-hr-mode | effort | Scope unclear in source |
| server-models-aqar-booking-ts-could-use-generics-instead-of-any-next-steps-serve | effort | Scope unclear in source |
| details-todo-fetch-from-database-when-multi-tenant-is-implemented-bugs-doc-only | effort | Scope unclear in source |
| TEST-006 | effort | Scope unclear in source |
| scanned-package-json-pnpm-lock-yaml-docs-categorized-tasks-list-md-docs-pending- | effort | Scope unclear in source |
| fix-tenant-scope-for-role-tenant-to-require-org-id-unit-id-no-tenant-id-user-id- | effort | Scope unclear in source |
| restrict-hr-payroll-routes-to-hr-roles-optionally-corporate-admin-per-sot-and-re | effort | Scope unclear in source |
| reconcile-docs-categorized-tasks-list-md-status-with-context-anchors-either-revi | effort | Scope unclear in source |
| new-hr-payroll-role-bleed-to-finance-next-steps-doc-only | effort | Scope unclear in source |
| evidence-app-api-hr-payroll-runs-route-ts-38-102-payroll-allowed-roles-includes- | effort | Scope unclear in source |
| status-new-next-steps-doc-only | effort | Scope unclear in source |
| impact-finance-roles-can-read-create-payroll-runs-pii-salary-data-without-hr-app | effort | Scope unclear in source |
| pattern-signature-payroll-endpoints-allowing-finance-roles-next-steps-doc-only | effort | Scope unclear in source |
| fix-direction-limit-to-hr-hr-officer-corporate-admin-if-sot-audit-existing-runs- | effort | Scope unclear in source |
| evidence-e-g-app-api-finance-accounts-route-ts-255-app-api-finance-expenses-rout | effort | Scope unclear in source |
| status-persisting-re-validated-next-steps-doc-only | effort | Scope unclear in source |
| impact-malformed-json-triggers-500s-dos-in-critical-finance-hr-apis-inconsistent | effort | Scope unclear in source |
| fix-direction-add-shared-safe-parser-with-400-response-schema-validation-next-st | effort | Scope unclear in source |
| new-tenant-scope-uses-tenant-id-userid-no-org-unit-enforcement-next-steps-doc-on | effort | Scope unclear in source |
| evidence-domain-fm-fm-behavior-ts-1355-1361-sets-filter-tenant-id-ctx-userid-wit | effort | Scope unclear in source |
| impact-tenants-scoped-to-userid-instead-of-org-id-unit-id-risks-cross-tenant-rea | effort | Scope unclear in source |
| pattern-signature-tenant-filter-uses-userid-next-steps-doc-only | effort | Scope unclear in source |
| fix-direction-require-filter-org-id-ctx-orgid-and-filter-unit-id-in-ctx-units-re | effort | Scope unclear in source |
| new-sql-prisma-instrumentation-present-in-lockfile-next-steps-doc-only | effort | Scope unclear in source |
| evidence-pnpm-lock-yaml-11992-12006-bundles-opentelemetry-instrumentation-knex-m | effort | Scope unclear in source |
| impact-reintroduces-forbidden-sql-prisma-stack-violates-kill-on-sight-policy-and | effort | Scope unclear in source |
| pattern-signature-sql-prisma-instrumentation-packages-in-lock-next-steps-doc-onl | effort | Scope unclear in source |
| fix-direction-remove-instrumentation-bundle-or-exclude-sql-drivers-regenerate-lo | effort | Scope unclear in source |
| new-task-source-drift-categorized-tasks-list-deprecated-bugs-doc-only | effort | Scope unclear in source |
| fix-direction-update-anchors-to-use-pending-master-or-restore-refresh-categorize | effort | Scope unclear in source |
| planned-next-steps-reuse-rest-zod-schemas-for-graphql-inputs-add-integration-tes | effort | Scope unclear in source |
| shared-mapper-util-module-id-tenant-address-enum-mapping-next-steps-doc-only | effort | Scope unclear in source |
| validation-parity-gap-next-steps-doc-only | effort | Scope unclear in source |
| integration-feature-flagged-handler-next-steps-doc-only | effort | Scope unclear in source |
| negative-mutation-cases-next-steps-doc-only | effort | Scope unclear in source |
| id-normalization-duplication-objectid-checks-appear-in-rest-and-graphql-properti | effort | Scope unclear in source |
| status-priority-drift-historic-divergence-between-graphql-enums-and-rest-state-m | effort | Scope unclear in source |
| validation-gaps-graphql-currently-accepts-broad-inputs-while-rest-uses-zod-reusi | effort | Scope unclear in source |
| soft-delete-tenant-guards-previously-missing-in-graphql-now-applied-any-new-reso | effort | Scope unclear in source |
| finished-wiring-all-graphql-resolver-todos-auth-context-extraction-session-beare | effort | Scope unclear in source |
| tenant-config-now-loads-from-organizations-tenants-collections-with-cache-defaul | effort | Scope unclear in source |
| verification-this-session-pnpm-typecheck-pnpm-lint-pnpm-test-models-pnpm-test-e2 | effort | Scope unclear in source |
| souq-ad-click-handler-hardened-timestamp-parsed-once-to-number-before-signature- | effort | Scope unclear in source |
| missing-tests-graphql-resolvers-context-building-pagination-creation-errors-tena | effort | Scope unclear in source |
| test-coverage-gap-pattern-feature-flagged-graphql-surface-still-lacks-unit-integ | effort | Scope unclear in source |
| planned-next-steps-rerun-playwright-with-higher-timeout-add-unit-integration-tes | effort | Scope unclear in source |
| efficiency-improvements-batch-optimize-any-sequential-loops-in-graphql-work-orde | effort | Scope unclear in source |
| logic-errors-graphql-creation-currently-allows-minimal-payload-add-org-scoped-ex | effort | Scope unclear in source |
| missing-tests-add-graphql-resolver-tests-me-workorders-workorder-dashboardstats- | effort | Scope unclear in source |
| org-tenant-scoping-graphql-uses-soft-delete-guard-orgid-audit-remaining-graphql- | effort | Scope unclear in source |
| validation-parity-rest-work-orders-enforce-schema-and-org-existence-checks-graph | effort | Scope unclear in source |
| all-verification-gates-passing-typecheck-lint-build-next-steps-doc-only | effort | Scope unclear in source |
| test-files-expanded-from-225-230-5-new-next-steps-doc-only | effort | Scope unclear in source |
| new-test-coverage-for-finance-invoices-fm-work-orders-souq-settlements-hr-employ | effort | Scope unclear in source |
| work-order-api-routes-enhanced-with-error-handling-next-steps-doc-only | effort | Scope unclear in source |
| pnpm-typecheck-0-errors-next-steps-doc-only | effort | Scope unclear in source |
| pnpm-lint-passing-next-steps-doc-only | effort | Scope unclear in source |
| pnpm-build-passing-next-steps-doc-only | effort | Scope unclear in source |
| test-files-230-total-up-from-225-next-steps-doc-only | effort | Scope unclear in source |
| api-routes-352-total-next-steps-doc-only | effort | Scope unclear in source |
| directory-created-next-steps-doc-only | effort | Scope unclear in source |
| fm-work-orders-tests-missing-requirefmability-mock-configuration-next-steps-doc- | effort | Scope unclear in source |
| finance-invoices-tests-auth-session-mock-not-properly-configured-next-steps-doc- | effort | Scope unclear in source |
| tests-api-fm-work-orders-test-ts-fm-ability-mocking-next-steps-test-ts | effort | Scope unclear in source |
| app-api-work-orders-id-attachments-presign-route-ts-next-steps-attachments-presi | effort | Scope unclear in source |
| app-api-work-orders-id-checklists-route-ts-next-steps-checklists-route-ts | effort | Scope unclear in source |
| app-api-work-orders-id-checklists-toggle-route-ts-next-steps-checklists-toggle-r | effort | Scope unclear in source |
| app-api-work-orders-id-materials-route-ts-next-steps-materials-route-ts | effort | Scope unclear in source |
| app-api-work-orders-export-route-ts-next-steps-app-api-work-orders-export-route- | effort | Scope unclear in source |
| test-files-230-total-next-steps-doc-only | effort | Scope unclear in source |
| coverage-ratio-65-needs-verification-next-steps-doc-only | effort | Scope unclear in source |
| lib-security-ip-reputation-ts-next-steps-lib-security-ip-reputation-ts | effort | Scope unclear in source |
| lib-sms-providers-taqnyat-ts-next-steps-lib-sms-providers-taqnyat-ts | effort | Scope unclear in source |
| services-souq-pricing-auto-repricer-service-ts-next-steps-services-souq-pricing- | effort | Scope unclear in source |
| 36-next-steps-doc-only | effort | Scope unclear in source |
| pnpm-run-test-models-91-tests-passing-next-steps-doc-only | effort | Scope unclear in source |
| test-files-225-total-api-unit-e2e-next-steps-doc-only | effort | Scope unclear in source |
| api-routes-352-total-64-coverage-gap-next-steps-doc-only | effort | Scope unclear in source |
| all-verification-gates-passing-next-steps-doc-only | effort | Scope unclear in source |
| test-coverage-expanded-225-test-files-next-steps-doc-only | effort | Scope unclear in source |
| 127-api-routes-without-dedicated-tests-missing-tests-doc-only | effort | Scope unclear in source |
| missing-tests-prod-readiness-bugs-doc-only | effort | Scope unclear in source |
| 50-missing-tests-doc-only | effort | Scope unclear in source |
| 57-missing-tests-doc-only | effort | Scope unclear in source |
| pending-master-updated-as-single-source-of-truth-no-duplicate-reports-created-mi | effort | Scope unclear in source |
| typecheck-currently-failing-at-lib-finance-checkout-ts-171-itapinfo-missing-char | effort | Scope unclear in source |
| TYPE-001 | effort | Scope unclear in source |
| tap-payments-ts-core-gateway-checkout-ts-validation-missing-tests-tap-payments-t | effort | Scope unclear in source |
| remaining-routes-signup-refresh-session-edge-cases-beyond-new-otp-post-login-for | effort | Scope unclear in source |
| settlements-seller-lifecycle-beyond-new-escrow-payout-tests-missing-tests-doc-on | effort | Scope unclear in source |
| subscriptionbillingservice-recurring-charges-missing-tests-doc-only | effort | Scope unclear in source |
| environment-setup-gaps-release-gate-and-related-workflows-reference-missing-gith | effort | Scope unclear in source |
| GH-006 | effort | Scope unclear in source |
| SEC-005 | effort | Scope unclear in source |
| pending-counts-adjusted-5-items-after-test-coverage-full-recount-pending-for-jso | effort | Scope unclear in source |
| fix-create-parsebodyornull-utility-apply-to-all-routes-next-steps-doc-only | effort | Scope unclear in source |
| effort-4-hours-next-steps-doc-only | effort | Scope unclear in source |
| file-server-audit-log-ts-lines-140-175-next-steps-server-audit-log-ts | effort | Scope unclear in source |
| fix-add-null-guard-at-function-entry-next-steps-doc-only | effort | Scope unclear in source |
| app-fm-app-hr-app-crm-app-settings-app-profile-app-reports-next-steps-doc-only | effort | Scope unclear in source |
| master-pending-report-located-and-updated-as-the-single-source-of-truth-no-dupli | effort | Scope unclear in source |
| billing-finance-routes-reviewed-for-parsing-auth-gaps-payment-create-auth-orderi | effort | Scope unclear in source |
| next-steps-next-steps-doc-only | effort | Scope unclear in source |
| coverage-gap-existing-billing-tests-cover-subscribe-upgrade-history-only-finance | effort | Scope unclear in source |
| progress-scoped-review-of-otp-webhook-pm-plan-apis-to-capture-production-readine | effort | Scope unclear in source |
| bugs-logic-next-steps-doc-only | effort | Scope unclear in source |
| app-api-pm-plans-route-ts-const-body-await-request-json-post-lacks-safe-parse-sc | effort | Scope unclear in source |
| efficiency-services-souq-ads-auction-engine-ts-const-campaignbids-await-this-fet | effort | Scope unclear in source |
| pm-plan-routes-no-coverage-found-rg-pm-plans-tests-no-matches-add-create-patch-h | effort | Scope unclear in source |
| webhook-auth-tests-unit-lib-sms-providers-taqnyat-test-ts-covers-provider-client | effort | Scope unclear in source |
| progress-config-resolveauthsecret-now-aliases-auth-secret-nextauth-secret-before | effort | Scope unclear in source |
| progress-master-report-updated-single-source-of-truth-no-duplicate-files-created | effort | Scope unclear in source |
| OPS-002 | effort | Scope unclear in source |
| monitoring-assets-unvalidated-grafana-alerts-dashboards-mirror-the-missing-gate- | effort | Scope unclear in source |
| EFF-005 | effort | Scope unclear in source |
| BUG-009 | effort | Scope unclear in source |
| component-missing-tests-doc-only | effort | Scope unclear in source |
| PERF-003 | effort | Scope unclear in source |
| PERF-004 | effort | Scope unclear in source |
| testing-gaps-45-missing-tests-doc-only | effort | Scope unclear in source |
| component-function-missing-tests-doc-only | effort | Scope unclear in source |
| taqnyat-api-credentials-missing-invalid-missing-tests-doc-only | effort | Scope unclear in source |
| sender-id-not-registered-with-citc-missing-tests-doc-only | effort | Scope unclear in source |
| phone-number-format-incorrect-missing-tests-doc-only | effort | Scope unclear in source |
| taqnyat-service-outage-missing-tests-doc-only | effort | Scope unclear in source |
| rate-limiting-hit-missing-tests-doc-only | effort | Scope unclear in source |
| otp-not-being-stored-missing-tests-doc-only | effort | Scope unclear in source |
| api-route-error-missing-tests-doc-only | effort | Scope unclear in source |
| test-across-all-pages-missing-tests-doc-only | effort | Scope unclear in source |
| gh-quota-missing-tests-doc-only | effort | Scope unclear in source |
| gh-envs-missing-tests-doc-only | effort | Scope unclear in source |
| comments-and-documentation-references-next-steps-doc-only | effort | Scope unclear in source |
| environment-variable-documentation-next-steps-doc-only | effort | Scope unclear in source |
| test-file-references-next-steps-doc-only | effort | Scope unclear in source |
| schema-type-definitions-next-steps-doc-only | effort | Scope unclear in source |
| 1-537-missing-tests-doc-only | effort | Scope unclear in source |
| PR-537 | effort | Scope unclear in source |
| openai-key-secret-missing-tests-pr-agent-yml-27 | effort | Scope unclear in source |
| gh-quota-still-pending-devops-missing-tests-doc-only | effort | Scope unclear in source |
| gh-envs-still-pending-devops-missing-tests-doc-only | effort | Scope unclear in source |
| docs-update-pending-master-to-v14-4-with-verification-audit-missing-tests-doc-on | effort | Scope unclear in source |
| 32-paytabs-files-deleted-all-routes-lib-config-tests-removed-next-steps-doc-only | effort | Scope unclear in source |
| recurring-billing-migrated-to-tap-createcharge-with-saved-cards-next-steps-doc-o | effort | Scope unclear in source |
| refund-processing-migrated-to-tap-createrefund-and-new-getrefund-method-next-ste | effort | Scope unclear in source |
| withdrawal-service-simplified-to-manual-bank-transfer-tap-doesn-t-support-payout | effort | Scope unclear in source |
| subscription-model-updated-with-tap-schema-fields-next-steps-doc-only | effort | Scope unclear in source |
| all-verification-gates-pass-2-538-tests-0-typescript-errors-0-eslint-errors-next | effort | Scope unclear in source |
| app-api-billing-callback-paytabs-route-ts-next-steps-app-api-billing-callback-pa | effort | Scope unclear in source |
| app-api-payments-paytabs-callback-route-ts-next-steps-app-api-payments-paytabs-c | effort | Scope unclear in source |
| app-api-payments-paytabs-route-ts-next-steps-app-api-payments-paytabs-route-ts | effort | Scope unclear in source |
| app-api-paytabs-callback-route-ts-next-steps-app-api-paytabs-callback-route-ts | effort | Scope unclear in source |
| app-api-paytabs-return-route-ts-next-steps-app-api-paytabs-return-route-ts | effort | Scope unclear in source |
| config-paytabs-config-ts-next-steps-config-paytabs-config-ts | effort | Scope unclear in source |
| docs-inventory-paytabs-duplicates-md-next-steps-docs-inventory-paytabs-duplicate | effort | Scope unclear in source |
| lib-finance-paytabs-subscription-ts-next-steps-lib-finance-paytabs-subscription- | effort | Scope unclear in source |
| lib-payments-paytabs-callback-contract-ts-next-steps-lib-payments-paytabs-callba | effort | Scope unclear in source |
| lib-paytabs-ts-next-steps-lib-paytabs-ts | effort | Scope unclear in source |
| qa-tests-readme-paytabs-unit-tests-md-next-steps-qa-tests-readme-paytabs-unit-te | effort | Scope unclear in source |
| qa-tests-lib-paytabs-spec-ts-4-files-next-steps-spec-ts | effort | Scope unclear in source |
| scripts-sign-paytabs-payload-ts-next-steps-scripts-sign-paytabs-payload-ts | effort | Scope unclear in source |
| tests-api-lib-paytabs-test-ts-next-steps-tests-api-lib-paytabs-test-ts | effort | Scope unclear in source |
| tests-api-paytabs-callback-test-ts-next-steps-tests-api-paytabs-callback-test-ts | effort | Scope unclear in source |
| tests-lib-payments-paytabs-callback-contract-test-ts-next-steps-tests-lib-paymen | effort | Scope unclear in source |
| tests-paytabs-test-ts-next-steps-tests-paytabs-test-ts | effort | Scope unclear in source |
| tests-unit-api-api-payments-paytabs-callback-tenancy-test-ts-next-steps-tests-un | effort | Scope unclear in source |
| tests-unit-api-api-paytabs-callback-test-ts-next-steps-tests-unit-api-api-paytab | effort | Scope unclear in source |
| tests-unit-api-api-paytabs-test-ts-next-steps-tests-unit-api-api-paytabs-test-ts | effort | Scope unclear in source |
| tests-unit-lib-paytabs-payout-test-ts-next-steps-tests-unit-lib-paytabs-payout-t | effort | Scope unclear in source |
| delete-32-paytabs-files-lib-config-routes-tests-scripts-docs-next-steps-doc-only | effort | Scope unclear in source |
| migrate-recurring-charge-ts-to-tap-createcharge-api-next-steps-recurring-charge- | effort | Scope unclear in source |
| migrate-refund-processor-ts-to-tap-createrefund-getrefund-logic-errors-refund-pr | effort | Scope unclear in source |
| migrate-payments-create-route-ts-to-tap-next-steps-payments-create-route-ts | effort | Scope unclear in source |
| update-subscription-model-with-tap-schema-fields-next-steps-doc-only | effort | Scope unclear in source |
| simplify-withdrawal-service-ts-manual-only-tap-no-payouts-next-steps-withdrawal- | effort | Scope unclear in source |
| add-getrefund-method-to-tappaymentsclient-next-steps-doc-only | effort | Scope unclear in source |
| all-2-538-tests-pass-0-typescript-eslint-errors-next-steps-doc-only | effort | Scope unclear in source |
| 12-missing-tests-doc-only | effort | Scope unclear in source |
| commit-and-push-all-changes-next-steps-doc-only | effort | Scope unclear in source |
| deploy-to-production-next-steps-doc-only | effort | Scope unclear in source |
| verify-no-configurationerror-in-console-next-steps-doc-only | effort | Scope unclear in source |
| jobs-recurring-charge-ts-missing-tests-jobs-recurring-charge-ts | effort | Scope unclear in source |
| configure-paytabs-production-keys-next-steps-doc-only | effort | Scope unclear in source |
| line-next-steps-doc-only | effort | Scope unclear in source |
| 328-routes-next-steps-doc-only | effort | Scope unclear in source |
| app-api-hr-hr-payroll-sensitive-data-next-steps-doc-only | effort | Scope unclear in source |
| app-api-souq-orders-e-commerce-orders-next-steps-doc-only | effort | Scope unclear in source |
| app-api-admin-admin-operations-next-steps-doc-only | effort | Scope unclear in source |
| app-api-onboarding-user-onboarding-next-steps-doc-only | effort | Scope unclear in source |
| 117-next-steps-app-api-copilot-chat-route-ts | effort | Scope unclear in source |
| 72-next-steps-app-api-projects-route-ts | effort | Scope unclear in source |
| this-session-paytabs-tap-migration-reverted-next-steps-doc-only | effort | Scope unclear in source |
| prevention-create-migration-checklist-next-steps-doc-only | effort | Scope unclear in source |
| update-interfaces-types-next-steps-doc-only | effort | Scope unclear in source |
| database-migration-next-steps-doc-only | effort | Scope unclear in source |
| feature-flag-for-gradual-rollout-next-steps-doc-only | effort | Scope unclear in source |
| remove-old-code-last-next-steps-doc-only | effort | Scope unclear in source |
| locations-3-api-routes-missing-try-catch-next-steps-doc-only | effort | Scope unclear in source |
| utility-available-lib-api-parse-body-ts-created-earlier-next-steps-lib-api-parse | effort | Scope unclear in source |
| action-routes-should-use-parsebody-utility-next-steps-doc-only | effort | Scope unclear in source |
| locations-10-form-submission-pages-next-steps-doc-only | effort | Scope unclear in source |
| status-intentional-graceful-degradation-for-error-messages-next-steps-doc-only | effort | Scope unclear in source |
| no-action-needed-next-steps-doc-only | effort | Scope unclear in source |
| x-typescript-0-errors-next-steps-doc-only | effort | Scope unclear in source |
| x-unit-tests-2-594-passing-next-steps-doc-only | effort | Scope unclear in source |
| x-security-no-hardcoded-secrets-next-steps-doc-only | effort | Scope unclear in source |
| x-innerhtml-all-properly-sanitized-next-steps-doc-only | effort | Scope unclear in source |
| x-paytabs-files-restored-working-next-steps-doc-only | effort | Scope unclear in source |
| x-broken-migrations-reverted-next-steps-doc-only | effort | Scope unclear in source |
| paytabs-production-keys-user-action-required-next-steps-doc-only | effort | Scope unclear in source |
| e2e-tests-on-staging-devops-action-next-steps-doc-only | effort | Scope unclear in source |
| detected-incomplete-tap-migration-by-other-ai-agent-next-steps-doc-only | effort | Scope unclear in source |
| reverted-21-deleted-paytabs-files-next-steps-doc-only | effort | Scope unclear in source |
| reverted-6-modified-job-service-files-next-steps-doc-only | effort | Scope unclear in source |
| deep-dive-codebase-analysis-next-steps-doc-only | effort | Scope unclear in source |
| identified-41-todos-none-critical-next-steps-doc-only | effort | Scope unclear in source |
| security-scan-all-clear-next-steps-doc-only | effort | Scope unclear in source |
| updated-pending-master-to-v15-8-next-steps-doc-only | effort | Scope unclear in source |
| only-user-action-remaining-paytabs-env-config-next-steps-doc-only | effort | Scope unclear in source |
| verify-in-production-next-steps-doc-only | effort | Scope unclear in source |
| app-api-payments-paytabs-api-routes-next-steps-doc-only | effort | Scope unclear in source |
| app-api-paytabs-legacy-api-routes-next-steps-doc-only | effort | Scope unclear in source |
| tests-paytabs-all-paytabs-tests-next-steps-doc-only | effort | Scope unclear in source |
| paytabs-profile-id-next-steps-doc-only | effort | Scope unclear in source |
| paytabs-server-key-next-steps-doc-only | effort | Scope unclear in source |
| paytabs-base-url-next-steps-doc-only | effort | Scope unclear in source |
| tap-secret-key-tap-api-secret-key-next-steps-doc-only | effort | Scope unclear in source |
| other-tap-configuration-as-per-lib-tapconfig-ts-next-steps-lib-tapconfig-ts | effort | Scope unclear in source |
| lib-env-validation-ts-has-validatepaymentconfig-that-validates-at-startup-next-s | effort | Scope unclear in source |
| configure-paytabs-production-credentials-user-action-missing-tests-doc-only | effort | Scope unclear in source |
| run-e2e-tests-on-staging-devops-missing-tests-doc-only | effort | Scope unclear in source |
| all-app-tsx-with-use-client-directive-next-steps-doc-only | effort | Scope unclear in source |
| cross-referenced-with-imports-of-lib-config-constants-and-lib-logger-next-steps- | effort | Scope unclear in source |
| never-import-lib-config-constants-in-client-components-next-steps-doc-only | effort | Scope unclear in source |
| use-next-public-environment-variables-for-client-side-access-next-steps-doc-only | effort | Scope unclear in source |
| never-import-lib-logger-in-client-components-use-console-error-with-eslint-disab | effort | Scope unclear in source |
| slow-unstable-internet-connection-next-steps-doc-only | effort | Scope unclear in source |
| firewall-blocking-requests-next-steps-doc-only | effort | Scope unclear in source |
| server-timeout-on-long-running-requests-next-steps-doc-only | effort | Scope unclear in source |
| internet-connection-stability-next-steps-doc-only | effort | Scope unclear in source |
| firewall-proxy-settings-next-steps-doc-only | effort | Scope unclear in source |
| vpn-if-using-one-next-steps-doc-only | effort | Scope unclear in source |
| tests-api-billing-callback-route-test-ts-4-files-next-steps-route-test-ts | effort | Scope unclear in source |
| set-a-32-character-nextauth-secret-or-auth-secret-in-all-environments-to-remove- | effort | Scope unclear in source |
| run-pnpm-typecheck-pnpm-lint-pnpm-test-to-validate-the-config-change-end-to-end- | effort | Scope unclear in source |
| confirm-api-health-auth-returns-healthy-status-after-secrets-are-set-verifies-ve | effort | Scope unclear in source |
| reviewed-all-nextauth-secret-touchpoints-auth-config-ts-app-api-auth-routes-test | effort | Scope unclear in source |
| production-alignment-ensure-nextauth-secret-and-auth-secret-values-match-across- | effort | Scope unclear in source |
| full-codebase-scan-for-todos-fixmes-hacks-next-steps-doc-only | effort | Scope unclear in source |
| empty-catch-block-analysis-next-steps-doc-only | effort | Scope unclear in source |
| typescript-escape-pattern-review-next-steps-doc-only | effort | Scope unclear in source |
| eslint-disable-pattern-audit-next-steps-doc-only | effort | Scope unclear in source |
| dangerouslysetinnerhtml-security-review-next-steps-doc-only | effort | Scope unclear in source |
| api-test-coverage-assessment-next-steps-doc-only | effort | Scope unclear in source |
| json-parse-safety-audit-next-steps-doc-only | effort | Scope unclear in source |
| created-tests-api-payments-create-route-test-ts-10-tests-next-steps-tests-api-pa | effort | Scope unclear in source |
| created-tests-api-hr-employees-route-test-ts-20-tests-next-steps-tests-api-hr-em | effort | Scope unclear in source |
| created-tests-api-hr-leaves-route-test-ts-18-tests-next-steps-tests-api-hr-leave | effort | Scope unclear in source |
| created-tests-api-hr-payroll-runs-route-test-ts-15-tests-next-steps-tests-api-hr | effort | Scope unclear in source |
| created-tests-api-souq-orders-route-test-ts-15-tests-next-steps-tests-api-souq-o | effort | Scope unclear in source |
| created-tests-api-onboarding-cases-route-test-ts-13-tests-next-steps-tests-api-o | effort | Scope unclear in source |
| DOC-003 | effort | Scope unclear in source |
| immediate-this-session-next-steps-doc-only | effort | Scope unclear in source |
| commit-and-push-changes-next-steps-doc-only | effort | Scope unclear in source |
| short-term-next-session-next-steps-doc-only | effort | Scope unclear in source |
| create-test-scaffolding-for-payment-routes-next-steps-doc-only | effort | Scope unclear in source |
| add-test-fixtures-for-order-management-next-steps-doc-only | effort | Scope unclear in source |
| medium-term-future-sessions-next-steps-doc-only | effort | Scope unclear in source |
| achieve-50-api-test-coverage-next-steps-doc-only | effort | Scope unclear in source |
| automate-test-coverage-reporting-next-steps-doc-only | effort | Scope unclear in source |
| dangerouslysetinnerhtml-10-instances-all-safe-rehype-sanitize-next-steps-doc-onl | effort | Scope unclear in source |
| typescript-escapes-1-instance-justified-next-steps-doc-only | effort | Scope unclear in source |
| eslint-disables-20-instances-all-documented-next-steps-doc-only | effort | Scope unclear in source |
| console-statements-1-production-instance-required-next-steps-doc-only | effort | Scope unclear in source |
| empty-catches-12-instances-all-in-ci-scripts-tests-next-steps-doc-only | effort | Scope unclear in source |
| api-test-coverage-6-4-23-357-routes-needs-improvement-next-steps-doc-only | effort | Scope unclear in source |
| no-unhandled-code-patterns-next-steps-doc-only | effort | Scope unclear in source |
| test-coverage-gap-identified-but-not-blocking-next-steps-doc-only | effort | Scope unclear in source |
| sync-overhead-splitting-would-create-multiple-files-to-keep-synchronized-next-st | effort | Scope unclear in source |
| searchability-one-file-one-search-location-for-any-issue-next-steps-doc-only | effort | Scope unclear in source |
| historical-context-sessions-are-chronologically-ordered-splitting-loses-context- | effort | Scope unclear in source |
| DOC-001 | effort | Scope unclear in source |
| HIGH-002 | effort | Scope unclear in source |
| devops-dba-3-mongodb-index-staging-e2e-lighthouse-next-steps-doc-only | effort | Scope unclear in source |
| agent-tasks-0-remaining-next-steps-doc-only | effort | Scope unclear in source |
| UI-001 | effort | Scope unclear in source |
| ERR-016 | effort | Scope unclear in source |
| resolve-github-actions-quota-billing-next-steps-doc-only | effort | Scope unclear in source |
| configure-tap-paytabs-production-keys-next-steps-doc-only | effort | Scope unclear in source |
| replaced-stubs-with-db-backed-resolvers-auth-context-me-work-orders-list-detail- | effort | Scope unclear in source |
| guarded-by-feature-integrations-graphql-api-false-unless-explicitly-enabled-next | effort | Scope unclear in source |
| supports-org-scoped-branding-features-when-data-exists-defaults-remain-for-offli | effort | Scope unclear in source |
| 3-next-steps-doc-only | effort | Scope unclear in source |
| 8-critical-test-coverage-gaps-billing-finance-routes-innerhtml-sanitization-in-p | effort | Scope unclear in source |
| 22-high-json-parse-error-handling-fetch-error-boundaries-next-steps-doc-only | effort | Scope unclear in source |
| 39-medium-utility-function-extraction-pattern-standardization-next-steps-doc-onl | effort | Scope unclear in source |
| 18-low-documentation-minor-refactoring-next-steps-doc-only | effort | Scope unclear in source |
| typescript-0-errors-confirmed-via-task-next-steps-doc-only | effort | Scope unclear in source |
| eslint-0-errors-confirmed-via-task-next-steps-doc-only | effort | Scope unclear in source |
| git-clean-on-main-up-to-date-next-steps-doc-only | effort | Scope unclear in source |
| open-prs-0-all-processed-next-steps-doc-only | effort | Scope unclear in source |
| console-statements-1-justified-error-boundary-next-steps-doc-only | effort | Scope unclear in source |
| empty-catches-20-all-intentional-graceful-degradation-next-steps-doc-only | effort | Scope unclear in source |
| typescript-escapes-4-production-documented-next-steps-doc-only | effort | Scope unclear in source |
| eslint-disable-2-both-justified-next-steps-doc-only | effort | Scope unclear in source |
| dangerouslysetinnerhtml-10-uses-all-sanitized-next-steps-doc-only | effort | Scope unclear in source |
| all-verification-gates-pass-next-steps-doc-only | effort | Scope unclear in source |
| no-blocking-issues-next-steps-doc-only | effort | Scope unclear in source |
| core-pending-github-actions-quota-billing-payment-keys-user-config-next-steps-do | effort | Scope unclear in source |
| 87-code-quality-items-identified-for-backlog-next-steps-doc-only | effort | Scope unclear in source |
| test-coverage-gap-357-api-routes-only-4-tested-billing-finance-priority-missing- | effort | Scope unclear in source |
| error-handling-gap-30-routes-lack-json-parse-error-handling-missing-tests-doc-on | effort | Scope unclear in source |
| todo-missing-tests-lib-config-tenant-ts-98 | effort | Scope unclear in source |
| todo-missing-tests-lib-graphql-index-ts-463 | effort | Scope unclear in source |
| todo-missing-tests-lib-graphql-index-ts-485 | effort | Scope unclear in source |
| todo-missing-tests-lib-graphql-index-ts-507 | effort | Scope unclear in source |
| todo-missing-tests-lib-graphql-index-ts-520 | effort | Scope unclear in source |
| todo-missing-tests-lib-graphql-index-ts-592 | effort | Scope unclear in source |
| todo-missing-tests-lib-graphql-index-ts-796 | effort | Scope unclear in source |
| 7-10-todos-are-in-graphql-module-which-is-intentionally-a-stub-rest-apis-are-pri | effort | Scope unclear in source |
| open-prs-0-all-merged-missing-tests-doc-only | effort | Scope unclear in source |
| todo-analysis-10-items-all-intentional-backlog-missing-tests-doc-only | effort | Scope unclear in source |
| fix-i18n-add-36-missing-translation-keys-missing-tests-doc-only | effort | Scope unclear in source |
| push-topbar-fix-to-main-next-steps-doc-only | effort | Scope unclear in source |
| verify-vercel-deployment-next-steps-doc-only | effort | Scope unclear in source |
| run-e2e-tests-on-staging-next-steps-doc-only | effort | Scope unclear in source |
| dbb3729-next-steps-doc-only | effort | Scope unclear in source |
| 22a175c-next-steps-doc-only | effort | Scope unclear in source |
| c08fc87-next-steps-doc-only | effort | Scope unclear in source |
| 8-remaining-next-steps-doc-only | effort | Scope unclear in source |
| lighthouse-performance-check-next-steps-doc-only | effort | Scope unclear in source |
| app-work-orders-sla-watchlist-page-tsx-13-missing-error-handling-next-steps-app- | effort | Scope unclear in source |
| app-app-subscription-page-tsx-34-36-chain-without-catch-next-steps-subscription- | effort | Scope unclear in source |
| app-app-billing-history-page-tsx-20-fetch-without-error-handler-next-steps-billi | effort | Scope unclear in source |
| app-fm-dashboard-page-tsx-116-dashboard-data-fetch-next-steps-app-fm-dashboard-p | effort | Scope unclear in source |
| translation-audit-0-gaps-2-953-keys-100-en-ar-parity-missing-tests-doc-only | effort | Scope unclear in source |
| documented-8-intentional-todo-comments-missing-tests-doc-only | effort | Scope unclear in source |
| e2e-and-lighthouse-tests-pending-for-staging-run-missing-tests-doc-only | effort | Scope unclear in source |
| todo-comments-are-in-graphql-resolvers-placeholders-for-db-integration-and-curre | effort | Scope unclear in source |
| OPT-002 | effort | Scope unclear in source |
| MAJ-004 | effort | Scope unclear in source |
| info-missing-tests-doc-only | effort | Scope unclear in source |
| CI-001 | effort | Scope unclear in source |
| ISSUE-005 | effort | Scope unclear in source |
| pending-operational-checks-auth-email-domain-set-email-domain-and-expose-window- | effort | Scope unclear in source |
| CQ-008 | effort | Scope unclear in source |
| issue-efficiency-doc-only | effort | Scope unclear in source |
| TG-002 | effort | Scope unclear in source |
| TG-003 | effort | Scope unclear in source |
| TG-004 | effort | Scope unclear in source |
| TG-005 | effort | Scope unclear in source |
| DOC-002 | effort | Scope unclear in source |
| UX-005 | effort | Scope unclear in source |
| a11y-001-missing-aria-labels-efficiency-doc-only | effort | Scope unclear in source |
| update-openapi-to-use-parameterized-server-url-logic-errors-doc-only | effort | Scope unclear in source |
| DOC-004 | effort | Scope unclear in source |
| no-open-prs-logic-errors-doc-only | effort | Scope unclear in source |
| investigate-github-actions-failures-logic-errors-doc-only | effort | Scope unclear in source |
| fix-pnpm-build-artifact-gap-next-server-webpack-runtime-js-missing-34223-js-logi | effort | Scope unclear in source |
| process-ai-memory-batches-353-pending-logic-errors-doc-only | effort | Scope unclear in source |
| todo-fixme-comments-bugs-doc-only | effort | Scope unclear in source |
| missing-docstrings-bugs-doc-only | effort | Scope unclear in source |
| add-this-variable-code-expects-taqnyat-sender-name-not-taqnyat-sender-id-bugs-do | effort | Scope unclear in source |
| todo-fixme-comments-audit-bugs-doc-only | effort | Scope unclear in source |
| fm-module-tests-bugs-doc-only | effort | Scope unclear in source |
| docs-audits-pending-tasks-report-md-missing-tests-docs-audits-pending-tasks-repo | effort | Scope unclear in source |
| reports-master-pending-report-md-stub-pointer-missing-tests-reports-master-pendi | effort | Scope unclear in source |
| task-missing-tests-doc-only | effort | Scope unclear in source |
| CH-004 | effort | Scope unclear in source |
| 22-efficiency-doc-only | effort | Scope unclear in source |
| CH-002 | effort | Scope unclear in source |
| missing-aria-labels-efficiency-doc-only | effort | Scope unclear in source |
| updated-pending-master-with-accurate-metrics-v12-3-efficiency-doc-only | effort | Scope unclear in source |
| v12-5-2025-12-11t09-41-03-ui-ux-accessibility-audit-complete-reduced-to-30-pendi | effort | Scope unclear in source |
| v12-4-2025-12-11t09-28-03-code-hygiene-audit-complete-5-5-clean-reduced-to-37-pe | effort | Scope unclear in source |
| v12-2-2025-12-11t08-49-03-consolidated-action-plan-counts-42-pending-efficiency- | effort | Scope unclear in source |
| v11-0-2025-12-11t08-08-03-updated-timestamp-all-pending-items-organized-by-categ | effort | Scope unclear in source |
| applied-safe-json-parsing-across-finance-hr-routes-accounts-root-id-expenses-pay | effort | Scope unclear in source |
| next-extend-safe-parser-to-remaining-finance-hr-routes-regenerate-lock-via-pnpm- | effort | Scope unclear in source |
| missing-tests-add-negative-json-tests-for-expenses-payments-root-actions-hr-leav | effort | Scope unclear in source |
| recorded-no-exec-constraint-acknowledgement-tests-installs-not-run-next-steps-do | effort | Scope unclear in source |
| safe-parser-applied-to-finance-hr-routes-accounts-root-id-expenses-payments-root | effort | Scope unclear in source |
| lockfile-sql-prisma-instrumentation-lines-pruned-pending-fresh-install-to-regene | effort | Scope unclear in source |
| missing-tests-add-negative-json-tests-for-expenses-payments-root-actions-hr-leav | effort | Scope unclear in source |
| progress-master-report-updated-tenancy-rbac-fixes-and-safe-json-parsing-rolled-o | effort | Scope unclear in source |
| efficiency-batch-payment-allocations-remove-sequential-awaits-and-recheck-auto-r | effort | Scope unclear in source |
| bugs-prevent-malformed-body-500s-by-completing-safe-parser-rollout-on-remaining- | effort | Scope unclear in source |
| logic-errors-ensure-payroll-stays-hr-only-no-finance-bleed-and-tenant-scoping-us | effort | Scope unclear in source |
| missing-tests-add-negative-json-tests-for-expenses-payments-root-actions-hr-leav | effort | Scope unclear in source |
| typecheck-not-run-today-lint-not-run-today-tests-full-suite-next-steps-doc-only | effort | Scope unclear in source |
| next-steps-run-pnpm-typecheck-pnpm-lint-to-clear-gates-rerun-playwright-smoke-if | effort | Scope unclear in source |
| BUG-1711 | effort | Scope unclear in source |
| need-coverage-on-real-rent-late-fee-implementation-not-just-test-helper-to-asser | effort | Scope unclear in source |
| add-integration-style-tests-asserting-rate-limit-applied-before-auth-for-souq-ge | effort | Scope unclear in source |
| org-upload-scoping-the-scan-verify-routes-depend-on-buildorgawareratelimitkey-mi | effort | Scope unclear in source |
| typecheck-not-run-today-lint-not-run-today-tests-targeted-suites-next-steps-doc- | effort | Scope unclear in source |
| next-steps-run-full-pnpm-typecheck-pnpm-lint-pnpm-vitest-run-to-reconfirm-gates- | effort | Scope unclear in source |
| BUG-1714 | effort | Scope unclear in source |
| add-tests-ensuring-budgets-crud-rejects-requests-without-orgid-role-missing-test | effort | Scope unclear in source |
| add-cases-for-non-seller-roles-and-missing-org-to-ensure-401-403-422-behave-as-e | effort | Scope unclear in source |
| finance-budget-tests-mirror-prior-tenancy-gaps-seen-in-uploads-souq-routes-ensur | effort | Scope unclear in source |
| typecheck-lint-unit-test-models-playwright-e2e-skipped-via-skip-playwright-true- | effort | Scope unclear in source |
| full-suite-with-skip-flags-off-missing-tests-doc-only | effort | Scope unclear in source |
| token-based-polling-is-now-per-tenant-environments-must-supply-either-a-json-map | effort | Scope unclear in source |
| ongoing-smoke-suite-reruns-timing-out-copilot-strict-specs-layout-preservation-t | effort | Scope unclear in source |
| reduce-playwright-smoke-network-churn-by-adding-env-gated-stubs-to-marketplace-s | effort | Scope unclear in source |
| copilot-strict-layout-tenant-isolation-still-red-must-fix-overlay-positioning-an | effort | Scope unclear in source |
| smoke-timeouts-indicate-dev-server-or-selector-waits-not-completing-needs-stabil | effort | Scope unclear in source |
| dashboard-rtl-smoke-expects-arabic-headings-only-system-finance-hr-are-covered-o | effort | Scope unclear in source |
| add-regression-smoke-unit-assertions-for-playwright-header-dashboard-link-and-pd | effort | Scope unclear in source |
| add-targeted-playwright-tests-for-copilot-strict-scenarios-layout-overlay-stays- | effort | Scope unclear in source |
| dashboard-heading-parity-finance-hr-system-now-use-arabic-under-flag-remaining-d | effort | Scope unclear in source |
| marketplace-data-reliance-homepage-pdp-stubbed-but-search-listings-remain-api-de | effort | Scope unclear in source |
| backlog-import-sync-requires-running-api-to-post-api-issues-import-next-steps-do | effort | Scope unclear in source |
| start-api-and-re-run-api-issues-import-to-record-latest-currently-empty-backlog- | effort | Scope unclear in source |
| db-import-failed-localhost-3000-api-issues-import-unreachable-next-steps-doc-onl | effort | Scope unclear in source |
| fixzit-agent-assignments-json-scope-expansion-lock-update-next-steps-fixzit-agen | effort | Scope unclear in source |
| backlog-audit-md-regenerated-audit-report-next-steps-backlog-audit-md | effort | Scope unclear in source |
| curl-exe-s-http-localhost-3000-api-issues-stats-next-steps-doc-only | effort | Scope unclear in source |
| pnpm-lint-warnings-local-require-tenant-scope-in-superadmin-routes-next-steps-do | effort | Scope unclear in source |
| pnpm-test-failed-wsl-not-installed-for-playwright-e2e-next-steps-doc-only | effort | Scope unclear in source |
| CR-2025 | effort | Scope unclear in source |
