# Backlog Audit (SSOT Export)
- Generated: 2025-12-31 12:14 (Asia/Riyadh)
- Source: MongoDB issues collection (SSOT)
- Total Issues: 2830
- Active (open/in_progress/blocked/in_review): 2808
- Resolved (resolved/closed/wont_fix): 22

## Priority Breakdown
| Priority | Count |
| --- | --- |
| P0 | 115 |
| P1 | 100 |
| P2 | 1490 |
| P3 | 1041 |

## Status Breakdown
| Status | Count |
| --- | --- |
| open | 2747 |
| in_progress | 35 |
| blocked | 26 |
| resolved | 22 |

## Category Breakdown
| Category | Count |
| --- | --- |
| Security | 9 |
| Bugs | 685 |
| Logic Errors | 72 |
| Missing Tests | 328 |
| Efficiency | 77 |
| Features | 2 |
| Refactor | 2 |
| Documentation | 15 |
| Next Steps | 1625 |
| tests | 7 |
| layout | 1 |
| logic | 7 |

## Org Breakdown
| Org ID | Count |
| --- | --- |
| 000000000000000000000001 | 1835 |
| 507f1f77bcf86cd799439011 | 19 |
| 68dc8955a1ba6ed80ff372dc | 976 |

## File Heat Map (Top 10, Active Issues)
| File | Count |
| --- | --- |
| Doc-only | 1357 |
| docs/PENDING_MASTER.md | 618 |
| lib/graphql/index.ts | 8 |
| /route.ts | 7 |
| subscriptionSeatService.ts | 4 |
| lib/finance/tap-payments.ts | 4 |
| tests/unit/api/souq/seller-central/kyc-submit.test.ts | 4 |
| lib/graphql/index.ts:936-1052 | 4 |
| app/api/souq/reviews/route.ts:61-108 | 4 |
| req.js | 4 |

## Active Issues
| ID | Priority | Status | Category | Title | Location |
| --- | --- | --- | --- | --- | --- |
| TASK-1051 | P0 | open | Next Steps | Copilot STRICT layout/tenant isolation still red; must fix overlay positioning and RBAC guards before CI green. | Doc-only |
| BUG-1714 | P0 | open | Bugs | tests/unit/api/fm/finance/budgets.test.ts (fixtures) | tests/unit/api/fm/finance/budgets.test.ts |
| TASK-1115 | P0 | open | Next Steps | Next steps: Run full `pnpm typecheck && pnpm lint && pnpm vitest run` to reconfirm gates after KYC/budget changes; audit finance budget routes for org scoping + RBAC and align mocks across seller-c... | Doc-only |
| TASK-1045 | P0 | open | Next Steps | **Missing Tests:** Add negative JSON tests for expenses, payments (root/actions), HR leaves PUT; add payroll RBAC tests; add lockfile guard to fail on SQL/Prisma/knex/pg/mysql reintroduction. | Doc-only |
| TASK-1041 | P0 | open | Next Steps | Progress: Master report updated; tenancy/RBAC fixes and safe JSON parsing rolled out to key finance/HR routes; SQL/Prisma instrumentation pruned from lock; no commands run (per no-exec policy). | Doc-only |
| TASK-1039 | P0 | open | Next Steps | Safe parser applied to finance/HR routes (accounts root/id, expenses, payments root/actions, HR leaves, payroll runs); tenancy/RBAC fixes from earlier session retained. | Doc-only |
| TASK-1113 | P0 | open | Next Steps | Next: extend safe parser to remaining finance/HR routes, regenerate lock via `pnpm install`, then run `pnpm typecheck && pnpm lint && pnpm test`; add payroll RBAC tests and finance negative cases (... | Doc-only |
| TASK-1003 | P0 | open | Next Steps | Resolve GitHub Actions quota (billing) | Doc-only |
| TASK-0973 | P0 | open | Next Steps | ✅ dangerouslySetInnerHTML security review | Doc-only |
| TASK-0940 | P0 | open | Next Steps | ✅ Security scan: All clear | Doc-only |
| TASK-0929 | P0 | open | Next Steps | [x] Security: No hardcoded secrets | Doc-only |
| TASK-0854 | P0 | open | Next Steps | `lib/security/ip-reputation.ts` | lib/security/ip-reputation.ts |
| TASK-0817 | P0 | open | Next Steps | **Impact:** Tenants scoped to userId instead of `{ org_id, unit_id }`; risks cross-tenant reads. | Doc-only |
| missing-tests-add-negative-invalid-json-tests-for-finance-hr-routes-add-payroll- | P0 | open | Bugs | **Missing Tests:** Add negative/invalid-JSON tests for finance/HR routes; add payroll RBAC tests (HR-only); add lockfile guard to prevent SQL/Prisma deps; extend TAP payments tests to cover `lastCh... | Doc-only |
| TASK-0790 | P0 | open | Next Steps | ✅ `lib/security/monitoring.ts` — Security events | lib/security/monitoring.ts |
| TASK-0788 | P0 | open | Next Steps | Wrap JSON.parse in safe utility | Doc-only |
| TASK-0755 | P0 | open | Next Steps | Push local commit `70fab2816` | Doc-only |
| TASK-0746 | P0 | open | Next Steps | User-id-as-orgId fallbacks repeat across GraphQL createWorkOrder, Souq review POST, Aqar listings/packages/favorites, causing cross-tenant writes and orgId type drift. | Doc-only |
| TASK-0733 | P0 | open | Next Steps | Commit staged changes | Doc-only |
| TASK-0732 | P0 | open | Next Steps | Run `pnpm typecheck && pnpm lint && pnpm test` | Doc-only |
| TASK-0719 | P0 | open | Next Steps | User-id-as-orgId fallbacks recur across GraphQL createWorkOrder, Souq review POST, and Aqar listings/packages/favorites, risking cross-tenant writes and orgId type drift. | Doc-only |
| TASK-0713 | P0 | open | Next Steps | GraphQL `createWorkOrder` writes with userId fallback | lib/graphql/index.ts:936-1052 |
| TASK-0712 | P0 | open | Next Steps | GraphQL `workOrder` query lacks org filter | lib/graphql/index.ts:769-801 |
| TASK-0703 | P0 | open | Next Steps | `@/server/security/headers` → `{ getClientIP: vi.fn() }` | Doc-only |
| TASK-0702 | P0 | open | Next Steps | `@/server/security/rateLimit` → `{ smartRateLimit: mockFn }` | Doc-only |
| TASK-0695 | P0 | open | Next Steps | `tests/security/zod-validation.test.ts` - NEW: 5 tests | tests/security/zod-validation.test.ts |
| TASK-0694 | P0 | open | Next Steps | `tests/security/error-boundary.test.ts` - NEW: 3 tests | tests/security/error-boundary.test.ts |
| TASK-0693 | P0 | open | Next Steps | `tests/security/org-enforcement.test.ts` - NEW: 8 tests | tests/security/org-enforcement.test.ts |
| TASK-0677 | P0 | open | Next Steps | Identified rate limiting gaps | Doc-only |
| TASK-0660 | P0 | open | Next Steps | Close stale draft PRs (540-544) | Doc-only |
| TASK-0657 | P0 | open | Next Steps | Commit & push P1 rate limiting | Doc-only |
| TASK-0647 | P0 | open | Next Steps | Close stale draft PRs (539-544) | Doc-only |
| TASK-0646 | P0 | open | Next Steps | Merge PR `fix/graphql-resolver-todos` | Doc-only |
| TASK-0597 | P0 | open | Next Steps | **P0**: Review GraphQL TODO stubs - Decide if full implementation needed or remove | Doc-only |
| TASK-0543 | P0 | open | Next Steps | `app/api/webhooks/taqnyat/route.ts` | app/api/webhooks/taqnyat/route.ts |
| TASK-0516 | P0 | open | Next Steps | Impact: Security verification | Doc-only |
| TASK-0485 | P0 | open | Next Steps | Explicit `orgId` filter in query prevents cross-tenant access | Doc-only |
| logic-021 | P0 | open | Logic Errors | Secrets guard scope | tests/unit/security/banned-literals.test.ts |
| logic-123 | P0 | open | Logic Errors | Aqar writes | Doc-only |
| bug-1709 | P0 | open | Bugs | app/api/upload/scan/route.ts:44-92 | app/api/upload/scan/route.ts:44-92 |
| logic-127 | P0 | open | Logic Errors | Test coverage gaps | Doc-only |
| TASK-0328 | P0 | open | Next Steps | `lib/security/monitoring.ts:224` | lib/security/monitoring.ts:224 |
| TASK-0322 | P0 | open | Next Steps | `lib/ats/rbac.ts:106` | lib/ats/rbac.ts:106 |
| TASK-1085 | P0 | open | Next Steps | `app/api/souq/seller-central/kyc/submit/route.ts:24-67` — No server-side role/RBAC guard; any authenticated user with orgId can submit seller KYC. Action: wrap with seller/vendor role guard and rej... | app/api/souq/seller-central/kyc/submit/route.ts:24-67 |
| add-deterministic-success-paths-and-coverage-for-rate-limit-cross-tenant-rejecti | P0 | open | Next Steps | Add deterministic success paths and coverage for rate-limit, cross-tenant rejection, and vendor scoping in related tests. | Doc-only |
| add-seller-vendor-rbac-guard-and-vendor-id-scoping-to-souq-kyc-submission-route- | P0 | open | Next Steps | Add seller/vendor RBAC guard and vendor_id scoping to Souq KYC submission route + service; align with marketplace role matrix. | Doc-only |
| TASK-0294 | P0 | open | Next Steps | Copilot STRICT failures remain (layout overlay + tenant isolation + PERSONAL intent): surfaced during `pnpm test`; requires targeted fixes in copilot UI/RBAC before CI can pass. | Doc-only |
| TASK-0292 | P0 | open | Next Steps | **Test coverage gaps**: Current unit tests allow `[200,500]` in Souq KYC and lack unit-scope assertions in FM budgets, masking regressions in scoping and RBAC. | Doc-only |
| TASK-1081 | P0 | open | Next Steps | **Super Admin cross-tenant gap**: For FM budgets, cross-tenant marker yields `{}` query; without explicit tenant+unit selection, a Super Admin could list all budgets. Requires explicit gating or te... | Doc-only |
| TASK-1080 | P0 | open | Next Steps | `app/api/fm/finance/budgets/route.ts:191-205` — When Super Admin resolves to cross-tenant marker, `buildTenantFilter` returns `{}` and unit scope allows empty set; GET can enumerate all budgets wit... | app/api/fm/finance/budgets/route.ts:191-205 |
| gate-super-admin-cross-tenant-fm-budgets-listing-currently-empty-filter-when-ten | P0 | open | Next Steps | Gate super-admin cross-tenant FM budgets listing (currently empty filter when tenantId is cross marker). | Doc-only |
| confirmed-souq-kyc-route-uses-rbac-vendor-only-and-service-enforces-vendor-owner | P0 | open | Next Steps | Confirmed Souq KYC route uses RBAC (vendor-only) and service enforces vendor ownership + `in_review` status progression. | Doc-only |
| TASK-0288 | P0 | open | Next Steps | Standardized HR module RBAC with hasAllowedRole() helper (7 routes) | Doc-only |
| TASK-1075 | P0 | open | Next Steps | **RBAC gaps on sensitive routes**: Souq KYC submit lacked seller-role guard similar to past marketplace payout/reviews routes. Pattern: routes relying solely on `auth()` without `hasAnyRole`/RBAC c... | Doc-only |
| TASK-0281 | P0 | open | Next Steps | Super Admin cross-tenant mode: POST budgets should continue to reject cross-tenant marker; confirm helper emits explicit error for write paths. | Doc-only |
| TASK-0001 | P0 | open | Next Steps | issue-tracker model virtuals: `age`/`isStale` typings missing, effort/priority enums mismatched in model methods (P0/L not allowed by types). | Doc-only |
| souq-kyc-submit-seller-only-rbac-guard-company-info-no-longer-auto-approves-vend | P0 | open | Next Steps | Souq KYC submit: seller-only RBAC guard; company_info no longer auto-approves; vendorId passed into service; unit tests tightened and passing. | Doc-only |
| apply-rbac-vendor-ownership-guard-to-souq-kyc-submit-route-align-sellerkycservic | P0 | open | Next Steps | Apply RBAC/vendor ownership guard to Souq KYC submit route; align sellerKYCService with vendor_id scoping and staged approvals. | Doc-only |
| TASK-0253 | P0 | open | Next Steps | **Test Coverage:** Add unit tests for JSON-PARSE rejection, FM cross-unit, KYC RBAC | Doc-only |
| TASK-0242 | P0 | open | Next Steps | **RBAC/tenant guard gap** — KYC submit route lacks seller/vendor RBAC; service lookup is org-only, enabling cross-seller submission. | Doc-only |
| TASK-0239 | P0 | open | Next Steps | `app/api/fm/utils/tenant.ts:35-52` — cannot emit unit scope; cross-unit leakage. | app/api/fm/utils/tenant.ts:35-52 |
| add-seller-vendor-rbac-guard-and-vendor-id-scoping-to-kyc-submit-sellerkycservic | P0 | open | Next Steps | Add seller/vendor RBAC guard and vendor_id scoping to KYC submit + sellerKYCService. | Doc-only |
| reconfirmed-route-gaps-missing-seller-rbac-vendor-guard-in-kyc-submit-app-api-so | P0 | open | Next Steps | Reconfirmed route gaps: missing seller RBAC/vendor guard in KYC submit (app/api/souq/seller-central/kyc/submit/route.ts:15-78); org-only FM budget filters (app/api/fm/finance/budgets/route.ts:119-1... | app/api/souq/seller-central/kyc/submit/route.ts:15-78 |
| tightened-kyc-submit-happy-path-expectations-to-require-200-nextstep-tests-unit- | P0 | open | Next Steps | Tightened KYC submit happy-path expectations to require 200 + `nextStep` (tests/unit/api/souq/seller-central/kyc-submit.test.ts:145-238); run validated. | tests/unit/api/souq/seller-central/kyc-submit.test.ts:145-238 |
| sec-001 | P0 | open | Security | `lib/auth/role-guards.ts` | lib/auth/role-guards.ts |
| otp-001 | P0 | open | Bugs | OTP-001: Verify Taqnyat credentials on Vercel | lib/finance/tap-payments.ts |
| TASK-0235 | P0 | open | Next Steps | `tests/unit/api/fm/finance/budgets.test.ts` — Add unitId-required POST path and cross-tenant rejection. | tests/unit/api/fm/finance/budgets.test.ts |
| broaden-regression-tests-cross-tenant-unitid-for-budgets-kyc-rbac-vendor-negativ | P0 | open | Next Steps | Broaden regression tests: cross-tenant/unitId for budgets; KYC RBAC/vendor negatives; FM expenses response payload and org/unit assertions. | Doc-only |
| apply-vendor-rbac-guard-and-vendorid-scoping-directly-in-kyc-submit-route-servic | P0 | open | Next Steps | Apply vendor RBAC guard and vendorId scoping directly in KYC submit route/service to mirror test expectations end-to-end. | Doc-only |
| TASK-0225 | P0 | open | Next Steps | Enforced vendor context in KYC tests and ensured parseBodySafe compatibility; KYC submit tests now pass strictly (tests/unit/api/souq/seller-central/kyc-submit.test.ts). | tests/unit/api/souq/seller-central/kyc-submit.test.ts |
| TASK-0214 | P0 | open | Next Steps | `lib/security/cors-allowlist.ts` - INTENTIONAL CORS whitelist | lib/security/cors-allowlist.ts |
| TASK-0199 | P0 | open | Next Steps | [x] RBAC: Enforced via auth flags | Doc-only |
| TASK-0165 | P0 | open | Next Steps | ✅ Priority breakdown cards (P0-P3 counts) | Doc-only |
| TASK-0163 | P0 | open | Next Steps | Priority from text patterns (P0/critical, P1/high, etc.) | Doc-only |
| TASK-0143 | P0 | open | Next Steps | 🔶 Logged | tests/unit/security/encryption.test.ts |
| eff-004 | P0 | open | Missing Tests | EFF-004 — PM routes rate limiting — sourceRef: docs/PENDING_MASTER.md:75 | docs/PENDING_MASTER.md:75 |
| sec-002 | P0 | open | Security | [ ] Continue with SEC-002/BUG-001/TEST-* items | /route.ts |
| perf-001 | P0 | open | Efficiency | 33 db.collection calls still exist | services/souq/pricing/auto-repricer.ts |
| TASK-0113 | P0 | open | Next Steps | **P0**: Fix rate limit test assertions (check if routes actually implement rate limiting) | Doc-only |
| TASK-0034 | P0 | open | Next Steps | `tests/unit/security/multi-tenant-isolation.test.ts` | tests/unit/security/multi-tenant-isolation.test.ts |
| TASK-0025 | P0 | open | Next Steps | **Security:** ✅ Clean - no vulnerabilities found | Doc-only |
| SEC-0006 | P0 | open | Security | Public tour endpoint lacks orgId scoping on building model and property queries | app/api/fm/properties/[id]/tour/route.ts:75-137 |
| billing-subscriptionbillingservice-recurring-charges-critical-todo-bugs-doc-only | P0 | open | Bugs | \| Billing \| subscriptionBillingService recurring charges \| 🔴 CRITICAL \| ⏳ TODO \| | Doc-only |
| payments-tap-tap-payments-ts-core-gateway-checkout-ts-validation-critical-todo-b | P0 | open | Bugs | \| Payments/TAP \| tap-payments.ts core gateway + checkout.ts validation \| 🔴 CRITICAL \| ⏳ TODO \| | tap-payments.ts |
| total-pending-items-0-critical-code-1-critical-devops-3-high-12-medium-20-low-36 | P0 | open | Bugs | **Total Pending Items**: 0 Critical (code) + 1 Critical (DevOps) + 3 High + 12 Medium + 20 Low = 36 Issues | Doc-only |
| medium-wrap-json-parse-in-safe-utility-security-1-hr-todo-next-steps-doc-only | P0 | open | Next Steps | \| 🟡 MEDIUM \| Wrap JSON.parse in safe utility \| Security \| 1 hr \| 🔲 TODO \| | Doc-only |
| high-add-try-catch-to-critical-api-routes-reliability-2-hrs-todo-next-steps-doc- | P0 | open | Next Steps | \| 🔴 HIGH \| Add try-catch to critical API routes \| Reliability \| 2 hrs \| 🔲 TODO \| | Doc-only |
| p0-push-local-commit-70fab2816-1-min-pending-next-steps-doc-only | P0 | open | Next Steps | \| 🔴 P0 \| Push local commit `70fab2816` \| 1 min \| ⏳ Pending \| | Doc-only |
| critical-gaps-bugs-doc-only | P0 | open | Bugs | **Critical Gaps:** | Doc-only |
| service-critical-functions-test-gap-missing-tests-doc-only | P0 | open | Missing Tests | \| Service \| Critical Functions \| Test Gap \| | Doc-only |
| graphql-security-gaps-1-0-1-bugs-doc-only | P0 | open | Bugs | \| GraphQL Security Gaps \| 1 \| 0 \| -1 \| | Doc-only |
| p0-close-stale-draft-prs-540-544-10-min-cleanup-todo-next-steps-doc-only | P0 | open | Next Steps | \| 🔴 P0 \| Close stale draft PRs (540-544) \| 10 min \| Cleanup \| 🔲 TODO \| | Doc-only |
| p0-commit-push-p1-rate-limiting-5-min-44-routes-protected-todo-next-steps-doc-on | P0 | open | Next Steps | \| 🔴 P0 \| Commit & push P1 rate limiting \| 5 min \| 44 routes protected \| 🔲 TODO \| | Doc-only |
| p1-rate-limiting-auth-12-routes-30-min-critical-security-todo-next-steps-doc-onl | P0 | open | Next Steps | \| 🔴 P1 \| Rate limiting: Auth (12 routes) \| 30 min \| Critical security \| 🔲 TODO \| | Doc-only |
| p1-rate-limiting-payments-4-routes-15-min-critical-security-todo-next-steps-doc- | P0 | open | Next Steps | \| 🔴 P1 \| Rate limiting: Payments (4 routes) \| 15 min \| Critical security \| 🔲 TODO \| | Doc-only |
| p0-close-stale-draft-prs-539-544-10-min-cleanup-todo-next-steps-doc-only | P0 | open | Next Steps | \| 🔴 P0 \| Close stale draft PRs (539-544) \| 10 min \| Cleanup \| 🔲 TODO \| | Doc-only |
| 1-p0-review-graphql-todo-stubs-decide-if-full-implementation-needed-or-remove-ne | P0 | open | Next Steps | 1. **P0**: Review GraphQL TODO stubs - Decide if full implementation needed or remove | Doc-only |
| p0-fix-9-test-failures-pending-2h-missing-tests-doc-only | P0 | open | Missing Tests | \| P0 \| Fix 9 test failures \| 🔴 Pending \| 2h \| | Doc-only |
| performance-monitoring-add-apm-spans-to-critical-paths-2h-efficiency-doc-only | P0 | open | Efficiency | - [ ] **Performance monitoring**: Add APM spans to critical paths - 2h | Doc-only |
| security-layer-implemented-missing-coverage-priority-missing-tests-doc-only | P0 | open | Missing Tests | \| Security Layer \| Implemented \| Missing \| Coverage \| Priority \| | Doc-only |
| common-root-cause-missing-getclientip-export-in-server-security-headers-mock-bug | P0 | open | Bugs | **Common Root Cause**: Missing `getClientIP` export in `@/server/security/headers` mock. | Doc-only |
| add-apm-spans-for-critical-paths-bugs-doc-only | P0 | open | Bugs | - [ ] Add APM spans for critical paths | Doc-only |
| p0-002-security-lib-config-tenant-server-ts-tenant-load-errors-silently-fall-bac | P0 | open | Logic Errors | \| P0-002 \| Security \| `lib/config/tenant.server.ts` \| Tenant load errors silently fall back to defaults \| 🔴 TODO \| | lib/config/tenant.server.ts |
| p0-002-security-pm-plans-route-ts-42-68-189-fmpmplan-find-without-orgid-todo-add | P0 | open | Logic Errors | \| P0-002 \| Security \| `pm/plans/route.ts:42,68,189` \| FMPMPlan.find without orgId \| 🔴 TODO \| Add tenant scoping \| | pm/plans/route.ts:42 |
| p0-001-security-assistant-query-route-ts-259-workorder-find-without-orgid-todo-a | P0 | open | Logic Errors | \| P0-001 \| Security \| `assistant/query/route.ts:259` \| WorkOrder.find without orgId \| 🔴 TODO \| Add tenant scoping \| | assistant/query/route.ts:259 |
| souq-rule-overrides-unit-integration-tests-for-override-vs-base-config-across-re | P0 | open | Missing Tests | \| Souq rule overrides \| Unit/integration tests for override vs base config across returns/claims/fulfillment/pricing; assert telemetry counters. \| P0 \| 🔴 Missing \| | Doc-only |
| payments-tap-unit-webhook-tests-for-lib-finance-tap-payments-ts-lib-finance-chec | P0 | open | Missing Tests | \| Payments/TAP \| Unit + webhook tests for `lib/finance/tap-payments.ts`, `lib/finance/checkout.ts` \| 🔴 Critical \| ⏳ Pending \| | lib/finance/tap-payments.ts |
| FEATURE-001-LOCAL | P0 | open | Features | Real-time notifications system (WebSocket/SSE) | lib/websocket/server.ts (NEW) |
| TEST-COVERAGE-GAP-LOCAL | P0 | open | Missing Tests | API test coverage only 24% (88/367 routes) | tests/api/ |
| json-parse | P0 | open | Bugs | request.json without guard across 66 routes | app/api/** |
| TASK-0263 | P0 | in_progress | Next Steps | Souq KYC RBAC+tests; FM budgets unit scope; typecheck/lint triage started | Doc-only |
| json-parse-43-routes-unprotected-request-json-calls-p0-in-progress-bugs-request- | P0 | in_progress | Bugs | \| JSON-PARSE \| 43 routes \| Unprotected `request.json()` calls \| 🔴 P0 \| 🔄 In Progress \| | request.js |
| critical-auth-login-dashboard-session-blocked-by-otp-bugs-doc-only | P0 | blocked | Bugs | \| 🔴 Critical \| Auth \| `/login` → `/dashboard` \| Session \| ❌ BLOCKED by OTP \| | Doc-only |
| LOGIC-0128 | P1 | open | Logic Errors | Opt-in defaults for missing preferences | services/admin/notification-engine.ts |
| DOC-004 | P1 | open | Documentation | ~~DOC-004: Architecture decision records missing~~ → ✅ `docs/architecture/ARCHITECTURE_DECISION_RECORDS.md` (362 lines) | docs/architecture/ARCHITECTURE_DECISION_RECORDS.md |
| OPT-002 | P1 | open | Missing Tests | OpenTelemetry tracing | lib/tracing.ts |
| TASK-1004 | P1 | open | Next Steps | Configure TAP/PayTabs production keys | Doc-only |
| pending-p1-add-unit-tests-for-11-services-without-coverage-keep-lint-typecheck-t | P1 | open | Next Steps | Pending P1: Add unit tests for 11 services without coverage; keep lint/typecheck/test gates green. | Doc-only |
| TASK-0766 | P1 | open | Next Steps | Wrap JSON.parse in webhook routes with try-catch | Doc-only |
| TASK-0765 | P1 | open | Next Steps | Add rate limiting to auth routes | Doc-only |
| TASK-0764 | P1 | open | Next Steps | Add DOMPurify to 8 dangerouslySetInnerHTML | Doc-only |
| TASK-0758 | P1 | open | Next Steps | Add DOMPurify to 8 dangerouslySetInnerHTML (2 are JSON.stringify - safe) | Doc-only |
| TASK-0757 | P1 | open | Next Steps | Add try-catch to 4 JSON.parse usages | Doc-only |
| TASK-0756 | P1 | open | Next Steps | Add rate limiting to 6 auth routes | Doc-only |
| TASK-0701 | P1 | open | Next Steps | Expand rate limiting to HR/CRM | Doc-only |
| TASK-0698 | P1 | open | Next Steps | Fix GraphQL orgId isolation | Doc-only |
| TASK-0663 | P1 | open | Next Steps | Rate limiting: Admin module | Doc-only |
| TASK-0662 | P1 | open | Next Steps | Rate limiting: FM module | Doc-only |
| TASK-0661 | P1 | open | Next Steps | Rate limiting: Souq module | Doc-only |
| TASK-0650 | P1 | open | Next Steps | Rate limiting: Aqar (15 routes) | Doc-only |
| TASK-0649 | P1 | open | Next Steps | Rate limiting: Auth (12 routes) | Doc-only |
| TASK-0648 | P1 | open | Next Steps | Rate limiting: Payments (4 routes) | Doc-only |
| TASK-0600 | P1 | open | Next Steps | **P1**: Add rate limiting to finance routes (10 routes) - Protect sensitive data | Doc-only |
| TASK-0599 | P1 | open | Next Steps | **P1**: Add rate limiting to payments routes (4 routes) - Critical for billing | Doc-only |
| TASK-0598 | P1 | open | Next Steps | **P1**: Add rate limiting to auth routes (12 routes) - Prevent brute force | Doc-only |
| TASK-0475 | P1 | open | Next Steps | GraphQL TODO Stubs | Doc-only |
| TASK-0003 | P1 | open | Next Steps | Aqar tests (+13) | Doc-only |
| TASK-0002 | P1 | open | Next Steps | Souq tests (+56) | Doc-only |
| located-and-updated-the-master-pending-report-no-duplicate-file-documented-fresh | P1 | open | Logic Errors | Located and updated the Master Pending Report (no duplicate file); documented fresh findings from repo-wide ripgrep of silent handlers (`catch(() => null\|{}\|undefined\|false)`). | Doc-only |
| logic-005 | P1 | open | Logic Errors | 20+ upload/help/onboarding routes | Doc-only |
| logic-020 | P1 | open | Logic Errors | Souq rule consumption | Doc-only |
| logic-122 | P1 | open | Logic Errors | Souq review flow | Doc-only |
| logic-121 | P1 | open | Logic Errors | GraphQL read resolvers | Doc-only |
| logic-125 | P1 | open | Logic Errors | app/api/upload/verify-metadata/route.ts:46-119 | app/api/upload/verify-metadata/route.ts:46-119 |
| logic-124 | P1 | open | Logic Errors | app/api/upload/scan-status/route.ts:83-210 | app/api/upload/scan-status/route.ts:83-210 |
| p1-add-priority-module-tests-souq-settlements-ads-seller-central-admin-notificat | P1 | open | Next Steps | P1: Add priority module tests (Souq settlements/ads/seller-central, Admin notifications/billing, FM work-orders) | Doc-only |
| bc5f60662-test-p1-add-critical-module-tests-claims-users-budgets-next-steps-doc- | P1 | open | Next Steps | `bc5f60662` - test(P1): add critical module tests - claims, users, budgets | Doc-only |
| pay-001 | P1 | open | Bugs | `payments/tap/checkout/route.ts:251` | payments/tap/checkout/route.ts:251 |
| eff-003 | P1 | open | Efficiency | `app/api/fm/finance/budgets/route.ts:135-143` | app/api/fm/finance/budgets/route.ts:135-143 |
| kyc-001 | P1 | open | Bugs | BUG-KYC-001: Add RBAC guard to KYC submit | Doc-only |
| fm-001 | P1 | open | Bugs | BUG-FM-001: Add unitId to tenant filter | fm/utils/tenant.ts |
| cart-001 | P1 | open | Bugs | `marketplace/cart/route.ts` | marketplace/cart/route.ts |
| TASK-0195 | P1 | open | Next Steps | Deploy and verify console is clean | Doc-only |
| bug-001 | P1 | open | Bugs | Table rows: `\| BUG-001 \| Title \| P1 \| ...` | app/api/auth/otp/send/route.ts |
| doc-102 | P1 | open | Documentation | DOC-102 — Missing JSDoc for 51 lib utility modules (auth, payments, storage, middleware) — P1, Effort: M | Doc-only |
| perf-002 | P1 | open | Efficiency | Cache headers review needed | services/souq/fulfillment-service.ts |
| NAV-MISSING-001 | P1 | open | Logic Errors | 6 superadmin pages exist but are missing from navigation (NAV-MISSING-001) | Doc-only |
| start-dev-server-and-sync-backlog-audit-json-to-mongodb-via-post-api-issues-impo | P1 | open | Logic Errors | [ ] Start dev server and sync BACKLOG_AUDIT.json to MongoDB via POST /api/issues/import | BACKLOG_AUDIT.js |
| comp-001 | P1 | open | Logic Errors | ZATCA Phase 2 deadline Q2 2026 | Doc-only |
| logic-001 | P1 | open | Logic Errors | Business hours calendar Q1 2026 | Doc-only |
| ADR-001 | P1 | open | Efficiency | Q1 2026 | Doc-only |
| TASK-0114 | P1 | open | Next Steps | **P1**: Fix React import in client component tests | Doc-only |
| TASK-0024 | P1 | open | Next Steps | **RTL Compliance:** ✅ Clean - all physical classes converted to logical | Doc-only |
| SA-IMPERSONATE-001 | P1 | open | Logic Errors | Impersonation history not tracked | Doc-only |
| SEC-0007 | P1 | open | Security | Public tour response exposes tenant details and unit identifiers in model metadata | app/api/fm/properties/[id]/tour/route.ts:32-40 |
| playwright-smoke-bug-docs-pending-master-md | P1 | open | Bugs | Playwright smoke | docs/PENDING_MASTER.md |
| SSOT-IMPORT-ENUMS-001 | P1 | open | Bugs | SSOT import rejects BACKLOG_AUDIT categories/status/effort enums | scripts/import-backlog.ts:183-186 |
| marketplace-souq-settlements-seller-lifecycle-beyond-new-escrow-payout-tests-hig | P1 | open | Missing Tests | \| Marketplace/Souq \| Settlements seller lifecycle beyond new escrow/payout tests \| 🟡 HIGH \| ⏳ TODO \| | Doc-only |
| p1-wrap-json-parse-in-webhook-routes-with-try-catch-30-min-todo-next-steps-doc-o | P1 | open | Next Steps | \| 🟡 P1 \| Wrap JSON.parse in webhook routes with try-catch \| 30 min \| 🔲 TODO \| | Doc-only |
| p1-add-rate-limiting-to-auth-routes-1-hr-todo-next-steps-doc-only | P1 | open | Next Steps | \| 🟡 P1 \| Add rate limiting to auth routes \| 1 hr \| 🔲 TODO \| | Doc-only |
| p1-add-dompurify-to-8-dangerouslysetinnerhtml-2-hrs-todo-next-steps-doc-only | P1 | open | Next Steps | \| 🟡 P1 \| Add DOMPurify to 8 dangerouslySetInnerHTML \| 2 hrs \| 🔲 TODO \| | Doc-only |
| p1-add-dompurify-to-8-dangerouslysetinnerhtml-2-are-json-stringify-safe-1-hr-tod | P1 | open | Next Steps | \| 🟡 P1 \| Add DOMPurify to 8 dangerouslySetInnerHTML (2 are JSON.stringify - safe) \| 1 hr \| 🔲 TODO \| | Doc-only |
| p1-add-try-catch-to-4-json-parse-usages-30-min-todo-next-steps-doc-only | P1 | open | Next Steps | \| 🟡 P1 \| Add try-catch to 4 JSON.parse usages \| 30 min \| 🔲 TODO \| | Doc-only |
| p1-add-rate-limiting-to-6-auth-routes-1-hr-todo-next-steps-doc-only | P1 | open | Next Steps | \| 🟡 P1 \| Add rate limiting to 6 auth routes \| 1 hr \| 🔲 TODO \| | Doc-only |
| p1-1-add-dompurify-to-10-dangerouslysetinnerhtml-usages-todo-2-hrs-bugs-doc-only | P1 | open | Bugs | \| 🟡 P1-1 \| Add DOMPurify to 10 dangerouslySetInnerHTML usages \| 🔲 TODO \| 2 hrs \| | Doc-only |
| missing-error-boundaries-high-priority-bugs-doc-only | P1 | open | Bugs | **Missing Error Boundaries** (High Priority): | Doc-only |
| p1-rate-limiting-admin-module-1-hr-14-routes-need-protection-todo-next-steps-doc | P1 | open | Next Steps | \| 🟡 P1 \| Rate limiting: Admin module \| 1 hr \| 14 routes need protection \| 🔲 TODO \| | Doc-only |
| p1-rate-limiting-fm-module-1-hr-19-routes-need-protection-todo-next-steps-doc-on | P1 | open | Next Steps | \| 🟡 P1 \| Rate limiting: FM module \| 1 hr \| 19 routes need protection \| 🔲 TODO \| | Doc-only |
| p1-rate-limiting-souq-module-2-hrs-69-routes-need-protection-todo-next-steps-doc | P1 | open | Next Steps | \| 🟡 P1 \| Rate limiting: Souq module \| 2 hrs \| 69 routes need protection \| 🔲 TODO \| | Doc-only |
| p1-rate-limiting-aqar-15-routes-30-min-high-traffic-module-todo-next-steps-doc-o | P1 | open | Next Steps | \| 🔴 P1 \| Rate limiting: Aqar (15 routes) \| 30 min \| High traffic module \| 🔲 TODO \| | Doc-only |
| p1-add-zod-to-remaining-191-routes-pending-8h-bugs-doc-only | P1 | open | Bugs | \| P1 \| Add Zod to remaining 191 routes \| 🟡 Pending \| 8h \| | Doc-only |
| p1-aqar-tests-13-3h-todo-missing-tests-doc-only | P1 | open | Missing Tests | \| **P1** \| Aqar tests (+13) \| 3h \| 🔴 TODO \| | Doc-only |
| p1-souq-tests-56-6h-todo-missing-tests-doc-only | P1 | open | Missing Tests | \| **P1** \| Souq tests (+56) \| 6h \| 🔴 TODO \| | Doc-only |
| p1-003-reliability-multiple-upload-routes-getsessionuser-silent-failures-todo-ad | P1 | open | Bugs | \| P1-003 \| Reliability \| Multiple upload routes \| getSessionUser silent failures \| 🔴 TODO \| Add telemetry wrapper \| | Doc-only |
| p1-002-reliability-vendor-apply-route-ts-silent-db-failure-on-apply-todo-return- | P1 | open | Bugs | \| P1-002 \| Reliability \| vendor/apply/route.ts \| Silent DB failure on apply \| 🔴 TODO \| Return 503 on failure \| | vendor/apply/route.ts |
| standardize-request-body-parsing-on-a-safe-parser-that-emits-400-422-with-teleme | P1 | open | Next Steps | - Standardize request body parsing on a safe parser that emits 400/422 with telemetry (replace `req.json().catch(() => ({}\|null))` in help escalation, Aqar packages/listings, FM budgets PATCH, project | req.js |
| module-coverage-51-souq-routes-22-admin-routes-17-fm-routes-need-tests-p1-p2-tod | P1 | open | Missing Tests | \| Module coverage \| 51 Souq routes, 22 Admin routes, 17 FM routes need tests \| P1-P2 \| 🔴 TODO \| | Doc-only |
| auth-infra-auth-store-failure-503-for-routes-with-getsessionorerror-p1-todo-bugs | P1 | open | Bugs | \| Auth-infra \| Auth store failure → 503 for routes with `getSessionOrError` \| P1 \| 🔴 TODO \| | Doc-only |
| playwright-smoke-auth-checkout-returns-claims-after-rule-ui-config-rollout-p1-pe | P1 | open | Bugs | \| Playwright smoke \| Auth/checkout/returns/claims after rule UI + config rollout. \| P1 \| 🔴 Pending \| | Doc-only |
| secrets-gate-in-ci-ensure-banned-literals-test-is-wired-into-ci-and-extended-tok | P1 | open | Missing Tests | \| Secrets gate in CI \| Ensure banned-literals test is wired into CI and extended token list verified. \| P1 \| 🔴 Missing \| | Doc-only |
| env-guards-tests-for-aws-region-aws-s3-bucket-fail-fast-and-rotation-script-env- | P1 | open | Missing Tests | \| Env guards \| Tests for AWS_REGION/AWS_S3_BUCKET fail-fast and rotation script env requirements. \| P1 \| 🔴 Missing \| | Doc-only |
| marketplace-souq-settlements-seller-flow-coverage-high-pending-missing-tests-doc | P1 | open | Missing Tests | \| Marketplace/Souq \| Settlements/seller flow coverage \| 🟡 High \| ⏳ Pending \| | Doc-only |
| auth-api-broaden-coverage-across-14-auth-routes-high-pending-missing-tests-doc-o | P1 | open | Missing Tests | \| Auth/API \| Broaden coverage across 14 auth routes \| 🟡 High \| ⏳ Pending \| | Doc-only |
| all-p1-p2-items-complete-ready-for-eng-sultan-review-next-steps-doc-only | P1 | open | Next Steps | **All P1/P2 Items Complete** - Ready for Eng. Sultan review. | Doc-only |
| p1-deploy-and-verify-console-is-clean-5m-pending-deploy-next-steps-doc-only | P1 | open | Next Steps | \| P1 \| Deploy and verify console is clean \| 5m \| Pending deploy \| | Doc-only |
| open-high-priority-issues-new-from-ai-analysis-bugs-doc-only | P1 | open | Bugs | **🔴 Open High-Priority Issues (NEW from AI Analysis):** | Doc-only |
| open-issues-p1-require-attention-bugs-doc-only | P1 | open | Bugs | **🔴 Open Issues (P1 - Require Attention):** | Doc-only |
| INFRA-SENTRY-LOCAL | P1 | open | Bugs | Activate Sentry error tracking (already configured but inactive) | next.config.js |
| COMP-001-LOCAL | P1 | open | Bugs | ZATCA E-Invoicing Phase 2 implementation (Saudi compliance) | services/finance/zatca/ |
| LOGIC-001-LOCAL | P1 | open | Logic Errors | Work Order SLA calculation doesn't account for business hours | lib/sla/calculator.ts (NEW) |
| FEATURE-002-LOCAL | P1 | open | Features | Bulk operations UI (select multiple rows, batch actions) | components/fm/WorkOrdersViewNew.tsx, components/finance/InvoicesList.tsx |
| PERF-003-LOCAL | P1 | open | Bugs | Timer cleanup memory leaks - 47 setTimeout/setInterval without cleanup | components/ (search, auto-refresh, polling) |
| PERF-002-LOCAL | P1 | open | Efficiency | API response caching missing - 95% of GET endpoints have no cache headers | app/api/marketplace/categories/route.ts, app/api/souq/brands/route.ts |
| CR-2025 | P2 | open | Next Steps | CR-2025-12-29-001 � Superadmin jobs page swallows fetch/process errors without logging context � sourceRef: code-review:app/superadmin/jobs/page.tsx:111-112 | app/superadmin/jobs/page.tsx:111-112 |
| TASK-1064 | P2 | open | Next Steps | pnpm test (FAILED: WSL not installed for playwright e2e) | Doc-only |
| TASK-1063 | P2 | open | Next Steps | pnpm lint (warnings: local/require-tenant-scope in superadmin routes) | Doc-only |
| TASK-1062 | P2 | open | Next Steps | curl.exe -s http://localhost:3000/api/issues/stats | Doc-only |
| TASK-1061 | P2 | open | Next Steps | BACKLOG_AUDIT.md � regenerated audit report | BACKLOG_AUDIT.md |
| TASK-1060 | P2 | open | Next Steps | .fixzit/agent-assignments.json � scope expansion lock update | .fixzit/agent-assignments.js |
| TASK-1059 | P2 | open | Next Steps | DB import failed — localhost:3000/api/issues/import unreachable | Doc-only |
| TASK-1058 | P2 | open | Next Steps | Start API and re-run /api/issues/import to record latest (currently empty) backlog extraction. | Doc-only |
| TASK-1057 | P2 | open | Next Steps | Backlog import/sync — requires running API to POST /api/issues/import | Doc-only |
| TASK-1056 | P2 | open | Next Steps | Marketplace data reliance: homepage/PDP stubbed, but search/listings remain API-dependent. Prior flakiness suggests aligning those routes with flag-gated stub data to keep smoke predictable. | Doc-only |
| TASK-1116 | P2 | open | Next Steps | Dashboard heading parity: finance/HR/system now use Arabic under flag; remaining `/dashboard/**` pages likely still English, mirroring earlier RTL failures. Apply the same conditional heading patte... | Doc-only |
| TASK-1055 | P2 | open | Next Steps | Add targeted Playwright tests for copilot STRICT scenarios (layout overlay stays non-destructive; tenant isolation enforced) to catch regressions early. | Doc-only |
| TASK-1054 | P2 | open | Next Steps | Add regression smoke/unit assertions for Playwright header Dashboard link and PDP stub href; add test ensuring SupportOrg Playwright stub returns safe defaults. | Doc-only |
| TASK-1053 | P2 | open | Next Steps | Dashboard RTL smoke expects Arabic headings; only system/finance/HR are covered—other dashboards likely still English under Playwright, causing intermittent failures. | Doc-only |
| TASK-1052 | P2 | open | Next Steps | Smoke timeouts indicate dev-server or selector waits not completing; needs stabilization before pipeline run. | Doc-only |
| TASK-1050 | P2 | open | Next Steps | Reduce Playwright smoke network churn by adding env-gated stubs to marketplace search/listings similar to PDP/homepage (app/marketplace/*); cache static stub data to avoid repeated renders. | Doc-only |
| TASK-1049 | P2 | open | Next Steps | Ongoing: Smoke suite reruns timing out; copilot STRICT specs (layout preservation, tenant isolation, PERSONAL intent) still failing in full test run. | Doc-only |
| TASK-1048 | P2 | open | Next Steps | typecheck ✅; lint ✅; unit ✅; test:models ✅; Playwright e2e ⏭️ Skipped via SKIP_PLAYWRIGHT=true | Doc-only |
| TASK-1047 | P2 | open | Next Steps | typecheck ⏳ not run today; lint ⏳ not run today; tests ✅ targeted suites | Doc-only |
| BUG-1711 | P2 | open | Bugs | domain/aqar (late fee calc patterns) | Doc-only |
| TASK-1114 | P2 | open | Next Steps | Next steps: Run `pnpm typecheck && pnpm lint` to clear gates; rerun Playwright smoke if still required by release process; keep org-scoped key validation consistent with presign outputs in any new ... | Doc-only |
| TASK-1046 | P2 | open | Next Steps | typecheck ⏳ not run today; lint ⏳ not run today; tests ✅ full suite | Doc-only |
| TASK-1044 | P2 | open | Next Steps | **Logic Errors:** Ensure payroll stays HR-only (no Finance bleed) and tenant scoping uses `{ org_id, unit_id }` consistently. | Doc-only |
| TASK-1043 | P2 | open | Next Steps | **Bugs:** Prevent malformed-body 500s by completing safe parser rollout on remaining finance/HR routes. | Doc-only |
| TASK-1042 | P2 | open | Next Steps | **Efficiency:** Batch payment allocations (remove sequential awaits) and recheck auto-repricer N+1 pattern. | Doc-only |
| TASK-1040 | P2 | open | Next Steps | Lockfile SQL/Prisma instrumentation lines pruned; pending fresh install to regenerate clean lock. | Doc-only |
| TASK-1038 | P2 | open | Next Steps | Recorded no-exec constraint acknowledgement; tests/installs not run. | Doc-only |
| TASK-1037 | P2 | open | Next Steps | Applied safe JSON parsing across finance/HR routes (accounts root/id, expenses, payments root, payment actions, HR leaves/payroll) with 400 fallback for malformed bodies. | Doc-only |
| PERF-0005 | P2 | open | Efficiency | 📋 LOGGED | Doc-only |
| A11Y-001 | P2 | open | Efficiency | Missing ARIA labels | Doc-only |
| CH-002 | P2 | open | Efficiency | ~~TODO/FIXME comments~~ | Doc-only |
| CH-004 | P2 | open | Efficiency | Long function refactoring | Doc-only |
| BUG-0003 | P2 | open | Bugs | WorkOrdersViewNew filters not wired to query params | components/fm/WorkOrdersViewNew.tsx |
| UX-005 | P2 | open | Efficiency | UX-005: Color contrast fixes (4.5:1 ratio) - Needs visual audit | Doc-only |
| DOC-002 | P2 | open | Documentation | Missing JSDoc on services | Doc-only |
| TG-005 | P2 | open | Bugs | E2E for finance PII encryption | docs/PENDING_MASTER.md |
| TG-004 | P2 | open | Bugs | Translation key audit tests | docs/PENDING_MASTER.md |
| TG-003 | P2 | open | Bugs | Auth middleware edge cases | docs/PENDING_MASTER.md |
| TG-002 | P2 | open | Bugs | RBAC role-based filtering tests | docs/PENDING_MASTER.md |
| CQ-008 | P2 | open | Bugs | Mixed async/await and Promise chains | docs/PENDING_MASTER.md |
| ISSUE-005 | P2 | open | Bugs | ISSUE-005 â€“ Mixed orgId Storage in Souq Payouts/Withdrawals (Major, Pending Migration - Ops): run npx tsx scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts (dry-run then execute). | scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts |
| CI-001 | P2 | open | Missing Tests | **ISSUE-CI-001 – GitHub Actions Workflows Failing** (High, Pending Investigation): check runners, secrets per `docs/GITHUB_SECRETS_SETUP.md`, review workflow syntax. | docs/GITHUB_SECRETS_SETUP.md |
| MAJ-004 | P2 | open | Missing Tests | Placeholder URL example.com/placeholder.pdf | services/souq/seller-kyc-service.ts |
| TASK-1036 | P2 | open | Next Steps | `app/fm/dashboard/page.tsx:116` - Dashboard data fetch | app/fm/dashboard/page.ts |
| TASK-1035 | P2 | open | Next Steps | `app/(app)/billing/history/page.tsx:20` - Fetch without error handler | /billing/history/page.ts |
| TASK-1034 | P2 | open | Next Steps | `app/(app)/subscription/page.tsx:34-36` - Chain without catch | /subscription/page.ts |
| TASK-1033 | P2 | open | Next Steps | `app/work-orders/sla-watchlist/page.tsx:13` - Missing error handling | app/work-orders/sla-watchlist/page.ts |
| TASK-1032 | P2 | open | Next Steps | Lighthouse performance check | Doc-only |
| TASK-1031 | P2 | open | Next Steps | 8 remaining | Doc-only |
| TASK-1030 | P2 | open | Next Steps | c08fc87 | Doc-only |
| TASK-1029 | P2 | open | Next Steps | 22a175c | Doc-only |
| TASK-1028 | P2 | open | Next Steps | dbb3729 | Doc-only |
| TASK-1027 | P2 | open | Next Steps | Run E2E tests on staging | Doc-only |
| TASK-1026 | P2 | open | Next Steps | Verify Vercel deployment | Doc-only |
| TASK-1024 | P2 | open | Next Steps | 87 code quality items identified for backlog | Doc-only |
| TASK-1023 | P2 | open | Next Steps | Core pending: GitHub Actions quota (billing), payment keys (user config) | Doc-only |
| TASK-1022 | P2 | open | Next Steps | No blocking issues | Doc-only |
| TASK-1021 | P2 | open | Next Steps | All verification gates pass | Doc-only |
| TASK-1020 | P2 | open | Next Steps | ✅ dangerouslySetInnerHTML: 10 uses, all sanitized | Doc-only |
| TASK-1019 | P2 | open | Next Steps | ✅ eslint-disable: 2 (both justified) | Doc-only |
| TASK-1018 | P2 | open | Next Steps | ✅ TypeScript escapes: 4 production (documented) | Doc-only |
| TASK-1017 | P2 | open | Next Steps | ✅ Empty catches: 20+ all intentional (graceful degradation) | Doc-only |
| TASK-1016 | P2 | open | Next Steps | ✅ Console statements: 1 justified (error boundary) | Doc-only |
| TASK-1015 | P2 | open | Next Steps | ✅ Open PRs: 0 (all processed) | Doc-only |
| TASK-1014 | P2 | open | Next Steps | ✅ Git: Clean on main, up to date | Doc-only |
| TASK-1013 | P2 | open | Next Steps | ✅ ESLint: 0 errors (confirmed via task) | Doc-only |
| TASK-1012 | P2 | open | Next Steps | ✅ TypeScript: 0 errors (confirmed via task) | Doc-only |
| TASK-1010 | P2 | open | Next Steps | **39 Medium**: Utility function extraction, pattern standardization | Doc-only |
| TASK-1009 | P2 | open | Next Steps | **22 High**: JSON.parse error handling, fetch error boundaries | Doc-only |
| TASK-1008 | P2 | open | Next Steps | **8 Critical**: Test coverage gaps (billing/finance routes), innerHTML sanitization in public/*.js | Doc-only |
| TASK-1007 | P2 | open | Next Steps | Supports org-scoped branding/features when data exists; defaults remain for offline builds | Doc-only |
| TASK-1006 | P2 | open | Next Steps | Guarded by `FEATURE_INTEGRATIONS_GRAPHQL_API=false` unless explicitly enabled | Doc-only |
| TASK-1005 | P2 | open | Next Steps | Replaced stubs with DB-backed resolvers (auth context, `me`, work orders list/detail, dashboard stats, creation) | Doc-only |
| ERR-016 | P2 | open | Next Steps | ERR-016 | lib/api/parse-body.ts |
| TASK-0020 | P2 | open | Next Steps | 🔄 OBS-DB: MongoDB index audit (2h, DBA) | Doc-only |
| UI-001 | P2 | open | Next Steps | ✅ UI-001: Phone placeholders are intentional (not bugs) | Doc-only |
| TASK-1002 | P2 | open | Next Steps | **Agent Tasks**: 0 remaining | Doc-only |
| TASK-1001 | P2 | open | Next Steps | **DevOps/DBA**: 3 (MongoDB index, staging E2E, Lighthouse) | Doc-only |
| DOC-001 | P2 | open | Documentation | ✅ DOC-001: Split PENDING_MASTER → NOT NEEDED (single source of truth is correct) | openapi.yaml |
| TASK-1000 | P2 | open | Next Steps | **Historical Context**: Sessions are chronologically ordered, splitting loses context | Doc-only |
| TASK-0999 | P2 | open | Next Steps | **Searchability**: One file = one search location for any issue | Doc-only |
| TASK-0998 | P2 | open | Next Steps | **Sync Overhead**: Splitting would create multiple files to keep synchronized | Doc-only |
| TASK-0997 | P2 | open | Next Steps | Test coverage gap identified but not blocking | Doc-only |
| TASK-0996 | P2 | open | Next Steps | No unhandled code patterns | Doc-only |
| TASK-0995 | P2 | open | Next Steps | ⚠️ **API test coverage**: 6.4% (23/357 routes) — NEEDS IMPROVEMENT | Doc-only |
| TASK-0994 | P2 | open | Next Steps | ✅ **Empty catches**: 12 instances, ALL in CI/scripts/tests | Doc-only |
| TASK-0993 | P2 | open | Next Steps | ✅ **Console statements**: 1 production instance, REQUIRED | Doc-only |
| TASK-0992 | P2 | open | Next Steps | ✅ **ESLint disables**: 20+ instances, ALL DOCUMENTED | Doc-only |
| TASK-0991 | P2 | open | Next Steps | ✅ **TypeScript escapes**: 1 instance, JUSTIFIED | Doc-only |
| TASK-0990 | P2 | open | Next Steps | ✅ **dangerouslySetInnerHTML**: 10 instances, ALL SAFE (rehype-sanitize) | Doc-only |
| TASK-0989 | P2 | open | Next Steps | Automate test coverage reporting | Doc-only |
| TASK-0988 | P2 | open | Next Steps | Achieve 50% API test coverage | Doc-only |
| TASK-0987 | P2 | open | Next Steps | **Medium-term** (Future Sessions): | Doc-only |
| TASK-0986 | P2 | open | Next Steps | Add test fixtures for order management | Doc-only |
| TASK-0985 | P2 | open | Next Steps | Create test scaffolding for payment routes | Doc-only |
| TASK-0984 | P2 | open | Next Steps | **Short-term** (Next Session): | Doc-only |
| TASK-0983 | P2 | open | Next Steps | ⏳ Commit and push changes | Doc-only |
| TASK-0982 | P2 | open | Next Steps | **Immediate** (This Session): | Doc-only |
| DOC-003 | P2 | open | Documentation | DOC-003 | README.md |
| TASK-0981 | P2 | open | Next Steps | ✅ Created `tests/api/onboarding/cases.route.test.ts` (13 tests) | tests/api/onboarding/cases.route.test.ts |
| TASK-0980 | P2 | open | Next Steps | ✅ Created `tests/api/souq/orders.route.test.ts` (15 tests) | tests/api/souq/orders.route.test.ts |
| TASK-0979 | P2 | open | Next Steps | ✅ Created `tests/api/hr/payroll-runs.route.test.ts` (15 tests) | tests/api/hr/payroll-runs.route.test.ts |
| TASK-0978 | P2 | open | Next Steps | ✅ Created `tests/api/hr/leaves.route.test.ts` (18 tests) | tests/api/hr/leaves.route.test.ts |
| TASK-0977 | P2 | open | Next Steps | ✅ Created `tests/api/hr/employees.route.test.ts` (20 tests) | tests/api/hr/employees.route.test.ts |
| TASK-0976 | P2 | open | Next Steps | ✅ Created `tests/api/payments/create.route.test.ts` (10 tests) | tests/api/payments/create.route.test.ts |
| TASK-0975 | P2 | open | Next Steps | ✅ JSON.parse safety audit | Doc-only |
| TASK-0974 | P2 | open | Next Steps | ✅ API test coverage assessment | Doc-only |
| TASK-0972 | P2 | open | Next Steps | ✅ ESLint disable pattern audit | Doc-only |
| TASK-0971 | P2 | open | Next Steps | ✅ TypeScript escape pattern review | Doc-only |
| TASK-0970 | P2 | open | Next Steps | ✅ Empty catch block analysis | Doc-only |
| TASK-0969 | P2 | open | Next Steps | ✅ Full codebase scan for TODOs, FIXMEs, HACKs | Doc-only |
| TASK-0968 | P2 | open | Next Steps | Production alignment: ensure NEXTAUTH_SECRET and AUTH_SECRET values match across Vercel/preview/local to avoid JWT/signature mismatches between Config consumers and direct env access. | Doc-only |
| TASK-1112 | P2 | open | Next Steps | Reviewed all NEXTAUTH_SECRET touchpoints (`auth.config.ts`, `app/api/auth/*` routes, `tests/setup.ts`, `scripts/check-e2e-env.js`, health check endpoints): all already support AUTH_SECRET fallback ... | auth.config.ts |
| TASK-0967 | P2 | open | Next Steps | Confirm `/api/health/auth` returns healthy status after secrets are set (verifies Vercel/production parity). | Doc-only |
| TASK-0966 | P2 | open | Next Steps | Run `pnpm typecheck && pnpm lint && pnpm test` to validate the config change end-to-end. | Doc-only |
| TASK-0965 | P2 | open | Next Steps | Set a 32+ character `NEXTAUTH_SECRET` (or `AUTH_SECRET`) in all environments to remove runtime warnings and align JWT/session signing across routes. | Doc-only |
| TASK-0964 | P2 | open | Next Steps | `tests/api/billing/callback-*.route.test.ts` (4 files) | .route.test.ts |
| TASK-0963 | P2 | open | Next Steps | VPN if using one | Doc-only |
| TASK-0962 | P2 | open | Next Steps | Firewall/proxy settings | Doc-only |
| TASK-0961 | P2 | open | Next Steps | Internet connection stability | Doc-only |
| TASK-0960 | P2 | open | Next Steps | Server timeout on long-running requests | Doc-only |
| TASK-0959 | P2 | open | Next Steps | Firewall blocking requests | Doc-only |
| TASK-0958 | P2 | open | Next Steps | Slow/unstable internet connection | Doc-only |
| TASK-0957 | P2 | open | Next Steps | Never import `@/lib/logger` in client components (use `console.error` with eslint-disable comment) | Doc-only |
| TASK-0956 | P2 | open | Next Steps | Use `NEXT_PUBLIC_*` environment variables for client-side access | Doc-only |
| TASK-0955 | P2 | open | Next Steps | Never import `@/lib/config/constants` in client components | Doc-only |
| TASK-0954 | P2 | open | Next Steps | Cross-referenced with imports of `@/lib/config/constants` and `@/lib/logger` | Doc-only |
| TASK-0953 | P2 | open | Next Steps | All `app/**/*.tsx` with `"use client"` directive | Doc-only |
| TASK-0952 | P2 | open | Next Steps | `lib/env-validation.ts` - Has `validatePaymentConfig()` that validates at startup | lib/env-validation.ts |
| TASK-0951 | P2 | open | Next Steps | Other TAP configuration as per `lib/tapConfig.ts` | lib/tapConfig.ts |
| TASK-0950 | P2 | open | Next Steps | `TAP_SECRET_KEY` - TAP API secret key | Doc-only |
| TASK-0949 | P2 | open | Next Steps | `PAYTABS_BASE_URL` | Doc-only |
| TASK-0948 | P2 | open | Next Steps | `PAYTABS_SERVER_KEY` | Doc-only |
| TASK-0947 | P2 | open | Next Steps | `PAYTABS_PROFILE_ID` | Doc-only |
| TASK-0946 | P2 | open | Next Steps | `tests/*paytabs*` - All PayTabs tests | Doc-only |
| TASK-0945 | P2 | open | Next Steps | `app/api/paytabs/*` - Legacy API routes | Doc-only |
| TASK-0944 | P2 | open | Next Steps | `app/api/payments/paytabs/*` - API routes | Doc-only |
| TASK-0943 | P2 | open | Next Steps | Verify in production | Doc-only |
| TASK-0941 | P2 | open | Next Steps | ✅ Updated PENDING_MASTER to v15.8 | Doc-only |
| TASK-0939 | P2 | open | Next Steps | ✅ Identified 41 TODOs (none critical) | Doc-only |
| TASK-0938 | P2 | open | Next Steps | ✅ Deep-dive codebase analysis | Doc-only |
| TASK-0937 | P2 | open | Next Steps | ✅ Reverted 6 modified job/service files | Doc-only |
| TASK-0936 | P2 | open | Next Steps | ✅ Reverted 21 deleted PayTabs files | Doc-only |
| TASK-0935 | P2 | open | Next Steps | ✅ Detected incomplete TAP migration by other AI agent | Doc-only |
| TASK-0934 | P2 | open | Next Steps | [ ] E2E tests on staging: DevOps action | Doc-only |
| TASK-0932 | P2 | open | Next Steps | [x] Broken migrations: Reverted | Doc-only |
| TASK-0931 | P2 | open | Next Steps | [x] PayTabs: Files restored, working | Doc-only |
| TASK-0930 | P2 | open | Next Steps | [x] innerHTML: All properly sanitized | Doc-only |
| TASK-0928 | P2 | open | Next Steps | [x] Unit tests: 2,594 passing | Doc-only |
| TASK-0927 | P2 | open | Next Steps | [x] TypeScript: 0 errors | Doc-only |
| TASK-0926 | P2 | open | Next Steps | **No Action Needed** | Doc-only |
| TASK-0925 | P2 | open | Next Steps | **Status**: ✅ INTENTIONAL - graceful degradation for error messages | Doc-only |
| TASK-0924 | P2 | open | Next Steps | **Locations**: 10+ form submission pages | Doc-only |
| TASK-0923 | P2 | open | Next Steps | **Action**: Routes should use `parseBody()` utility | Doc-only |
| TASK-0922 | P2 | open | Next Steps | **Utility Available**: `lib/api/parse-body.ts` (created earlier) | lib/api/parse-body.ts |
| TASK-0921 | P2 | open | Next Steps | **Locations**: 3 API routes missing try-catch | Doc-only |
| TASK-0920 | P2 | open | Next Steps | Remove old code LAST | Doc-only |
| TASK-0919 | P2 | open | Next Steps | Feature flag for gradual rollout | Doc-only |
| TASK-0918 | P2 | open | Next Steps | Database migration | Doc-only |
| TASK-0917 | P2 | open | Next Steps | Update interfaces/types | Doc-only |
| TASK-0916 | P2 | open | Next Steps | **Prevention**: Create migration checklist: | Doc-only |
| TASK-0915 | P2 | open | Next Steps | **This Session**: PayTabs→TAP migration (reverted) | Doc-only |
| TASK-0914 | P2 | open | Next Steps | `app/api/onboarding/*` — User onboarding | Doc-only |
| TASK-0913 | P2 | open | Next Steps | `app/api/admin/*` — Admin operations | Doc-only |
| TASK-0912 | P2 | open | Next Steps | `app/api/souq/orders/*` — E-commerce orders | Doc-only |
| TASK-0911 | P2 | open | Next Steps | `app/api/hr/*` — HR/Payroll (sensitive data) | Doc-only |
| TASK-0910 | P2 | open | Next Steps | ~328 routes | Doc-only |
| TASK-0909 | P2 | open | Next Steps | Line | Doc-only |
| TASK-0908 | P2 | open | Next Steps | Configure PayTabs production keys | Doc-only |
| TASK-0907 | P2 | open | Next Steps | Verify no ConfigurationError in console | Doc-only |
| TASK-0906 | P2 | open | Next Steps | Deploy to production | Doc-only |
| TASK-0905 | P2 | open | Next Steps | Commit and push all changes | Doc-only |
| TASK-0904 | P2 | open | Next Steps | All 2,538 tests pass, 0 TypeScript/ESLint errors | Doc-only |
| TASK-0903 | P2 | open | Next Steps | Add getRefund() method to TapPaymentsClient | Doc-only |
| TASK-0902 | P2 | open | Next Steps | Simplify withdrawal-service.ts (manual only, TAP no payouts) | withdrawal-service.ts |
| TASK-0901 | P2 | open | Next Steps | Update Subscription model with tap schema fields | Doc-only |
| TASK-0900 | P2 | open | Next Steps | Migrate payments/create/route.ts to TAP | payments/create/route.ts |
| TASK-0899 | P2 | open | Next Steps | Migrate recurring-charge.ts to TAP createCharge() API | recurring-charge.ts |
| TASK-0897 | P2 | open | Next Steps | `tests/unit/lib/paytabs-payout.test.ts` | tests/unit/lib/paytabs-payout.test.ts |
| TASK-0896 | P2 | open | Next Steps | `tests/unit/api/api-paytabs.test.ts` | tests/unit/api/api-paytabs.test.ts |
| TASK-0895 | P2 | open | Next Steps | `tests/unit/api/api-paytabs-callback.test.ts` | tests/unit/api/api-paytabs-callback.test.ts |
| TASK-0894 | P2 | open | Next Steps | `tests/unit/api/api-payments-paytabs-callback-tenancy.test.ts` | tests/unit/api/api-payments-paytabs-callback-tenancy.test.ts |
| TASK-0893 | P2 | open | Next Steps | `tests/paytabs.test.ts` | tests/paytabs.test.ts |
| TASK-0892 | P2 | open | Next Steps | `tests/lib/payments/paytabs-callback.contract.test.ts` | tests/lib/payments/paytabs-callback.contract.test.ts |
| TASK-0891 | P2 | open | Next Steps | `tests/api/paytabs-callback.test.ts` | tests/api/paytabs-callback.test.ts |
| TASK-0890 | P2 | open | Next Steps | `tests/api/lib-paytabs.test.ts` | tests/api/lib-paytabs.test.ts |
| TASK-0889 | P2 | open | Next Steps | `scripts/sign-paytabs-payload.ts` | scripts/sign-paytabs-payload.ts |
| TASK-0888 | P2 | open | Next Steps | `qa/tests/lib-paytabs.*.spec.ts` (4 files) | .spec.ts |
| TASK-0887 | P2 | open | Next Steps | `qa/tests/README-paytabs-unit-tests.md` | qa/tests/README-paytabs-unit-tests.md |
| TASK-0886 | P2 | open | Next Steps | `lib/paytabs.ts` | lib/paytabs.ts |
| TASK-0885 | P2 | open | Next Steps | `lib/payments/paytabs-callback.contract.ts` | lib/payments/paytabs-callback.contract.ts |
| TASK-0884 | P2 | open | Next Steps | `lib/finance/paytabs-subscription.ts` | lib/finance/paytabs-subscription.ts |
| TASK-0882 | P2 | open | Next Steps | `config/paytabs.config.ts` | config/paytabs.config.ts |
| TASK-0881 | P2 | open | Next Steps | `app/api/paytabs/return/route.ts` | app/api/paytabs/return/route.ts |
| TASK-0880 | P2 | open | Next Steps | `app/api/paytabs/callback/route.ts` | app/api/paytabs/callback/route.ts |
| TASK-0879 | P2 | open | Next Steps | `app/api/payments/paytabs/route.ts` | app/api/payments/paytabs/route.ts |
| TASK-0878 | P2 | open | Next Steps | `app/api/payments/paytabs/callback/route.ts` | app/api/payments/paytabs/callback/route.ts |
| TASK-0877 | P2 | open | Next Steps | `app/api/billing/callback/paytabs/route.ts` | app/api/billing/callback/paytabs/route.ts |
| TASK-0876 | P2 | open | Next Steps | ✅ **All verification gates pass**: 2,538 tests, 0 TypeScript errors, 0 ESLint errors | Doc-only |
| TASK-0875 | P2 | open | Next Steps | ✅ **Subscription model** updated with `tap` schema fields | Doc-only |
| TASK-0874 | P2 | open | Next Steps | ✅ **Withdrawal service** simplified to manual bank transfer (TAP doesn't support payouts) | Doc-only |
| TASK-0873 | P2 | open | Next Steps | ✅ **Refund processing** migrated to TAP `createRefund()` and new `getRefund()` method | Doc-only |
| TASK-0872 | P2 | open | Next Steps | ✅ **Recurring billing** migrated to TAP `createCharge()` with saved cards | Doc-only |
| TASK-0871 | P2 | open | Next Steps | ✅ **32 PayTabs files deleted** (all routes, lib, config, tests removed) | Doc-only |
| schema-type-definitions-next-steps-doc-only | P2 | open | Next Steps | [ ] Schema/type definitions | Doc-only |
| test-file-references-next-steps-doc-only | P2 | open | Next Steps | [ ] Test file references | Doc-only |
| environment-variable-documentation-next-steps-doc-only | P2 | open | Next Steps | [ ] Environment variable documentation | Doc-only |
| comments-and-documentation-references-next-steps-doc-only | P2 | open | Next Steps | [ ] Comments and documentation references | Doc-only |
| testing-gaps-45-missing-tests-doc-only | P2 | open | Missing Tests | **Testing Gaps**: 45 | Doc-only |
| perf-004 | P2 | open | Efficiency | Sequential notifications | app/api/admin/notifications/send/route.ts |
| perf-003 | P2 | open | Efficiency | N+1 in claim escalation | services/souq/returns/claim-service.ts |
| bug-009 | P2 | open | Bugs | Uncaught JSON.parse | app/api/webhooks/sendgrid/route.ts:82 |
| eff-005 | P2 | open | Efficiency | Hooks in wrong directories | Doc-only |
| ops-002 | P2 | open | Bugs | DevOps | Doc-only |
| progress-master-report-updated-single-source-of-truth-no-duplicate-files-created | P2 | open | Next Steps | Progress: Master report updated (single source of truth) — no duplicate files created. | Doc-only |
| progress-config-resolveauthsecret-now-aliases-auth-secret-nextauth-secret-before | P2 | open | Next Steps | Progress: Config `resolveAuthSecret()` now aliases `AUTH_SECRET → NEXTAUTH_SECRET` before validation; no additional crash paths found in auth routes/health checks/tests/scripts (all already use `NE... | Doc-only |
| TASK-0870 | P2 | open | Next Steps | Webhook auth: `tests/unit/lib/sms-providers/taqnyat.test.ts` covers provider client only; no route-level tests for `app/api/webhooks/taqnyat/route.ts` (search `rg "webhooks/taqnyat" tests` → none). | tests/unit/lib/sms-providers/taqnyat.test.ts |
| TASK-0869 | P2 | open | Next Steps | PM plan routes: no coverage found (`rg "pm/plans" tests` → no matches); add create/patch happy-path + malformed-body + auth tests. | Doc-only |
| TASK-1111 | P2 | open | Next Steps | Efficiency: `services/souq/ads/auction-engine.ts::const campaignBids = await this.fetchCampaignBids(` — bid fetch + quality scoring executed sequentially per campaign/bid; batch fetch bids and use ... | services/souq/ads/auction-engine.ts |
| TASK-0868 | P2 | open | Next Steps | `app/api/pm/plans/route.ts::const body = await request.json();` — POST lacks safe parse + schema validation; invalid payloads surface as 500 from Mongoose. | app/api/pm/plans/route.ts |
| TASK-0867 | P2 | open | Next Steps | Bugs/Logic: | Doc-only |
| progress-scoped-review-of-otp-webhook-pm-plan-apis-to-capture-production-readine | P2 | open | Next Steps | Progress: Scoped review of OTP/webhook + PM plan APIs to capture production-readiness gaps; no code changes or commands executed in this session. | Doc-only |
| next-steps-next-steps-doc-only | P2 | open | Next Steps | Next steps: | Doc-only |
| billing-finance-routes-reviewed-for-parsing-auth-gaps-payment-create-auth-orderi | P2 | open | Next Steps | Billing/finance routes reviewed for parsing/auth gaps; payment create/auth ordering issue identified. | Doc-only |
| master-pending-report-located-and-updated-as-the-single-source-of-truth-no-dupli | P2 | open | Next Steps | Master Pending Report located and updated as the single source of truth (no duplicate files created). | Doc-only |
| TASK-0866 | P2 | open | Next Steps | app/fm/, app/hr/, app/crm/, app/settings/, app/profile/, app/reports/ | Doc-only |
| TASK-0865 | P2 | open | Next Steps | **Fix**: Add null guard at function entry | Doc-only |
| TASK-0864 | P2 | open | Next Steps | **File**: server/audit-log.ts (lines 140-175) | server/audit-log.ts |
| TASK-0863 | P2 | open | Next Steps | **Effort**: 4 hours | Doc-only |
| TASK-0862 | P2 | open | Next Steps | **Fix**: Create `parseBodyOrNull()` utility, apply to all routes | Doc-only |
| pending-counts-adjusted-5-items-after-test-coverage-full-recount-pending-for-jso | P2 | open | Missing Tests | Pending counts adjusted (-5 items) after test coverage; full recount pending for JSON-protection backlog. | Doc-only |
| sec-005 | P2 | open | Security | Rate limiting gaps | Doc-only |
| GH-006 | P2 | open | Missing Tests | pr_agent.yml:26-27 | pr_agent.yml:26-27 |
| TYPE-001 | P2 | open | Bugs | ITapInfo missing `chargeId` on checkout payload | lib/finance/checkout.ts:171 |
| TASK-0861 | P2 | open | Next Steps | Test coverage expanded (225 test files) | Doc-only |
| TASK-0860 | P2 | open | Next Steps | All verification gates passing | Doc-only |
| TASK-0859 | P2 | open | Next Steps | API routes: **352 total** (64% coverage gap) | Doc-only |
| TASK-0858 | P2 | open | Next Steps | Test files: **225 total** (API, unit, E2E) | Doc-only |
| TASK-0857 | P2 | open | Next Steps | `pnpm run test:models` ✅ **91 tests passing** | Doc-only |
| TASK-0856 | P2 | open | Next Steps | `services/souq/pricing/auto-repricer-service.ts` | services/souq/pricing/auto-repricer-service.ts |
| TASK-0855 | P2 | open | Next Steps | `lib/sms-providers/taqnyat.ts` | lib/sms-providers/taqnyat.ts |
| TASK-0853 | P2 | open | Next Steps | Coverage Ratio: ~65% (needs verification) | Doc-only |
| TASK-0852 | P2 | open | Next Steps | Test Files: 230 total | Doc-only |
| TASK-0851 | P2 | open | Next Steps | `app/api/work-orders/export/route.ts` | app/api/work-orders/export/route.ts |
| TASK-0850 | P2 | open | Next Steps | `app/api/work-orders/[id]/materials/route.ts` | /materials/route.ts |
| TASK-0849 | P2 | open | Next Steps | `app/api/work-orders/[id]/checklists/toggle/route.ts` | /checklists/toggle/route.ts |
| TASK-0848 | P2 | open | Next Steps | `app/api/work-orders/[id]/checklists/route.ts` | /checklists/route.ts |
| TASK-0847 | P2 | open | Next Steps | `app/api/work-orders/[id]/attachments/presign/route.ts` | /attachments/presign/route.ts |
| TASK-0846 | P2 | open | Next Steps | `tests/api/fm/work-orders/*.test.ts` - FM ability mocking | .test.ts |
| TASK-0845 | P2 | open | Next Steps | Finance invoices tests: Auth session mock not properly configured | Doc-only |
| TASK-0844 | P2 | open | Next Steps | FM work-orders tests: Missing `requireFmAbility` mock configuration | Doc-only |
| TASK-0843 | P2 | open | Next Steps | (directory created) | Doc-only |
| TASK-0842 | P2 | open | Next Steps | API routes: **352 total** | Doc-only |
| TASK-0841 | P2 | open | Next Steps | Test files: **230 total** (up from 225) | Doc-only |
| TASK-0840 | P2 | open | Next Steps | `pnpm build` ✅ **PASSING** | Doc-only |
| TASK-0839 | P2 | open | Next Steps | `pnpm lint` ✅ **PASSING** | Doc-only |
| TASK-0838 | P2 | open | Next Steps | `pnpm typecheck` ✅ **0 errors** | Doc-only |
| TASK-0837 | P2 | open | Next Steps | Work order API routes enhanced with error handling | Doc-only |
| TASK-0836 | P2 | open | Next Steps | New test coverage for: finance/invoices, fm/work-orders, souq/settlements, hr/employees | Doc-only |
| TASK-0835 | P2 | open | Next Steps | Test files expanded from 225 → 230 (+5 new) | Doc-only |
| TASK-0834 | P2 | open | Next Steps | All verification gates passing (typecheck, lint, build) | Doc-only |
| TASK-0833 | P2 | open | Next Steps | Validation parity: REST work orders enforce schema and org existence checks; GraphQL creation path should reuse or share validation utilities to prevent divergence when the feature flag is enabled. | Doc-only |
| TASK-0832 | P2 | open | Next Steps | Org/tenant scoping: GraphQL uses soft-delete guard + `orgId`; audit remaining GraphQL/REST handlers to ensure consistent `orgId` filtering and avoid legacy `tenant_id=userId` patterns. | Doc-only |
| missing-tests-add-graphql-resolver-tests-me-workorders-workorder-dashboardstats- | P2 | open | Next Steps | Missing tests: add GraphQL resolver tests (me/workOrders/workOrder/dashboardStats/createWorkOrder), tenant config DB-fetch/caching tests, Souq ad click negative cases, and rerun/complete Playwright... | Doc-only |
| TASK-1109 | P2 | open | Next Steps | Logic errors: GraphQL creation currently allows minimal payload—add org-scoped existence checks for property/assignee to mirror REST; ensure dashboard stats handle null orgId by returning 0s (alrea... | Doc-only |
| TASK-1108 | P2 | open | Next Steps | Efficiency improvements: batch/optimize any sequential loops in GraphQL work order creation and dashboard aggregation; cache tenant config lookups (already present) and add metrics to observe cache... | Doc-only |
| planned-next-steps-rerun-playwright-with-higher-timeout-add-unit-integration-tes | P2 | open | Next Steps | Planned next steps: rerun Playwright with higher timeout; add unit/integration tests for GraphQL resolvers (context, pagination, creation validation) and tenant config DB path; add negative tests f... | Doc-only |
| missing-tests-graphql-resolvers-context-building-pagination-creation-errors-tena | P2 | open | Bugs | Missing tests: GraphQL resolvers (context building, pagination, creation errors), tenant config DB-backed path, Souq ad click negative cases, and a rerun of Playwright suite after timeout. | Doc-only |
| souq-ad-click-handler-hardened-timestamp-parsed-once-to-number-before-signature- | P2 | open | Next Steps | Souq ad click handler hardened: timestamp parsed once to number before signature verification to satisfy type guard and avoid silent coercion issues. | Doc-only |
| verification-this-session-pnpm-typecheck-pnpm-lint-pnpm-test-models-pnpm-test-e2 | P2 | open | Next Steps | Verification this session: `pnpm typecheck` ✅, `pnpm lint` ✅, `pnpm test:models` ✅, `pnpm test:e2e` ⚠️ timed out (~10m). Next: rerun Playwright with higher timeout/CI gate to confirm full pass. | Doc-only |
| tenant-config-now-loads-from-organizations-tenants-collections-with-cache-defaul | P2 | open | Next Steps | Tenant config now loads from `organizations`/`tenants` collections with cache + default fallback; still serves defaults if DB unreachable. | Doc-only |
| finished-wiring-all-graphql-resolver-todos-auth-context-extraction-session-beare | P2 | open | Next Steps | Finished wiring all GraphQL resolver TODOs: auth context extraction (session/bearer), `me` user lookup, work order list/detail pagination, dashboard stats via shared query helpers, and creation wit... | Doc-only |
| TASK-0831 | P2 | open | Next Steps | **Soft-delete/tenant guards**: Previously missing in GraphQL; now applied. Any new resolvers should inherit the guard helper to match REST isolation (FM/finance models especially). | Doc-only |
| TASK-1107 | P2 | open | Next Steps | **Validation gaps**: GraphQL currently accepts broad inputs while REST uses Zod; reusing schemas closes bypass paths and aligns error payloads—applies to future GraphQL mutations (properties/invoic... | Doc-only |
| TASK-0830 | P2 | open | Next Steps | **Status/priority drift**: Historic divergence between GraphQL enums and REST state machine; normalized now—future GraphQL types must reuse the mapping to keep dashboards/statistics consistent. | Doc-only |
| TASK-0829 | P2 | open | Next Steps | **ID normalization duplication**: ObjectId checks appear in REST and GraphQL (properties, invoices, work orders). A shared helper will prevent scoping/404 inconsistencies. | Doc-only |
| TASK-0828 | P2 | open | Next Steps | Negative mutation cases | Doc-only |
| TASK-0827 | P2 | open | Next Steps | Integration (feature-flagged handler) | Doc-only |
| TASK-0826 | P2 | open | Next Steps | Validation parity gap | Doc-only |
| TASK-0825 | P2 | open | Next Steps | Shared mapper/util module (ID, tenant, address, enum mapping) | Doc-only |
| planned-next-steps-reuse-rest-zod-schemas-for-graphql-inputs-add-integration-tes | P2 | open | Next Steps | Planned next steps: Reuse REST Zod schemas for GraphQL inputs, add integration tests (pagination/auth/error payloads) under the feature flag, and extract shared mapping helpers (ID/tenant/address/s... | Doc-only |
| new-task-source-drift-categorized-tasks-list-deprecated-bugs-doc-only | P2 | open | Bugs | [ ] **🟡 New Task source drift (CATEGORIZED_TASKS_LIST deprecated)** | Doc-only |
| TASK-0824 | P2 | open | Next Steps | **Fix Direction:** Remove instrumentation bundle or exclude SQL drivers; regenerate lock sans SQL/Prisma. | Doc-only |
| TASK-0823 | P2 | open | Next Steps | **Pattern Signature:** SQL/Prisma instrumentation packages in lock. | Doc-only |
| TASK-0821 | P2 | open | Next Steps | **Evidence:** `pnpm-lock.yaml:11992-12006` bundles `@opentelemetry/instrumentation-knex/mysql/pg` and `@prisma/instrumentation` via `@sentry/opentelemetry`. | pnpm-lock.yaml:11992-12006 |
| TASK-0820 | P2 | open | Next Steps | [ ] **🔴 New SQL/Prisma instrumentation present in lockfile** | Doc-only |
| TASK-0819 | P2 | open | Next Steps | **Fix Direction:** Require `filter.org_id = ctx.orgId` and `filter.unit_id = { $in: ctx.units }`; remove `tenant_id === user.id`. | Doc-only |
| TASK-0818 | P2 | open | Next Steps | **Pattern Signature:** Tenant filter uses userId. | Doc-only |
| TASK-0816 | P2 | open | Next Steps | **Evidence:** `domain/fm/fm.behavior.ts:1355-1361` sets `filter.tenant_id = ctx.userId` with optional units. | domain/fm/fm.behavior.ts:1355-1361 |
| TASK-0815 | P2 | open | Next Steps | [ ] **🔴 New Tenant scope uses tenant_id=userId (no org/unit enforcement)** | Doc-only |
| TASK-0814 | P2 | open | Next Steps | **Fix Direction:** Add shared safe parser with 400 response + schema validation. | Doc-only |
| TASK-0813 | P2 | open | Next Steps | **Impact:** Malformed JSON triggers 500s/DoS in critical finance/HR APIs; inconsistent error contracts. | Doc-only |
| TASK-0812 | P2 | open | Next Steps | **Status:** 🟠 Persisting (Re-validated) | Doc-only |
| TASK-0811 | P2 | open | Next Steps | **Evidence:** e.g., `app/api/finance/accounts/route.ts:255`, `app/api/finance/expenses/route.ts:145`, `app/api/hr/payroll/runs/route.ts:106` (18 total finance/HR routes). | app/api/finance/accounts/route.ts:255 |
| TASK-0810 | P2 | open | Next Steps | **Fix Direction:** Limit to HR/HR_OFFICER (+ Corporate Admin if SoT), audit existing runs. | Doc-only |
| TASK-0809 | P2 | open | Next Steps | **Pattern Signature:** Payroll endpoints allowing Finance roles. | Doc-only |
| TASK-0808 | P2 | open | Next Steps | **Impact:** Finance roles can read/create payroll runs (PII/salary data) without HR approval. | Doc-only |
| TASK-0807 | P2 | open | Next Steps | **Status:** 🔴 New | Doc-only |
| TASK-0806 | P2 | open | Next Steps | **Evidence:** `app/api/hr/payroll/runs/route.ts:38-102` (PAYROLL_ALLOWED_ROLES includes `FINANCE`, `FINANCE_OFFICER`). | app/api/hr/payroll/runs/route.ts:38-102 |
| TASK-0805 | P2 | open | Next Steps | [ ] **🔴 New HR payroll role bleed to Finance** | Doc-only |
| TASK-0804 | P2 | open | Next Steps | Restrict HR payroll routes to HR roles (optionally Corporate Admin per SoT) and remove Finance role access. | Doc-only |
| TASK-0803 | P2 | open | Next Steps | Fix tenant scope for `Role.TENANT` to require `{ org_id, unit_id }` (no `tenant_id === user.id`) in `domain/fm/fm.behavior.ts`. | domain/fm/fm.behavior.ts |
| test-006 | P2 | open | Missing Tests | Tests | escalation.service.ts |
| TASK-0802 | P2 | open | Next Steps | `server/models/aqar/Booking.ts` — Could use generics instead of `any` | server/models/aqar/Booking.ts |
| TASK-0801 | P2 | open | Next Steps | `server/models/hr.models.ts` — PII encryption hooks | server/models/hr.models.ts |
| TASK-0800 | P2 | open | Next Steps | `server/plugins/fieldEncryption.ts` — Mongoose plugin requires dynamic types | server/plugins/fieldEncryption.ts |
| TASK-0799 | P2 | open | Next Steps | `lib/logger.ts:250` — Logger utility needs generic error handling | lib/logger.ts:250 |
| TASK-0798 | P2 | open | Next Steps | [app/api/work-orders/[id]/status/route.ts](app/api/work-orders/[id]/status/route.ts#L77) | /status/route.ts |
| TASK-0797 | P2 | open | Next Steps | [app/api/payments/create/route.ts](app/api/payments/create/route.ts#L116) | app/api/payments/create/route.ts |
| TASK-0796 | P2 | open | Next Steps | [app/api/vendors/route.ts](app/api/vendors/route.ts#L140) | app/api/vendors/route.ts |
| next-regenerate-lockfile-without-sql-prisma-knex-pg-mysql-instrumentations-fix-t | P2 | open | Next Steps | Next: regenerate lockfile without SQL/Prisma/knex/pg/mysql instrumentations; fix tenant scope to `{ org_id, unit_id }`; gate payroll to HR-only; add safe JSON parser across finance/HR routes; rerun... | Doc-only |
| TASK-0794 | P2 | open | Next Steps | ❌ Souq module — No context tagging | Doc-only |
| TASK-0793 | P2 | open | Next Steps | ❌ FM module — No context tagging | Doc-only |
| TASK-0792 | P2 | open | Next Steps | ✅ `lib/audit.ts` — Audit trail | lib/audit.ts |
| TASK-0791 | P2 | open | Next Steps | ✅ `lib/logger.ts` — Error capturing | lib/logger.ts |
| TASK-0789 | P2 | open | Next Steps | `app/api/work-orders/[id]/assign/route.ts` — Work order operations | /assign/route.ts |
| TASK-0787 | P2 | open | Next Steps | Add tests for ip-reputation.ts | ip-reputation.ts |
| TASK-0786 | P2 | open | Next Steps | Add try-catch to critical API routes | Doc-only |
| sentry-001 | P2 | open | Missing Tests | Add Sentry context to FM/Souq modules | Doc-only |
| TASK-0785 | P2 | open | Next Steps | Logging consistency: Console usage outside logger remains in a few client/server entry points; standardize on `logger` to keep observability structured and PII-safe. | Doc-only |
| TASK-0784 | P2 | open | Next Steps | Type safety in Mongoose hooks: Repeated `as any` usage stems from missing hook generics; centralizing hook type helpers will eliminate all 13 instances and reduce runtime casting risks. | Doc-only |
| TASK-1106 | P2 | open | Next Steps | Route alias correctness: Aqar chat alias required correct relative path and runtime export; audit any other alias/re-export routes to ensure they forward handlers (and `runtime` when needed) withou... | Doc-only |
| TASK-0783 | P2 | open | Next Steps | GH envs for release-gate | Doc-only |
| planned-actions-re-run-pnpm-lint-pnpm-test-after-upcoming-changes-keep-staging-r | P2 | open | Next Steps | Planned actions: Re-run `pnpm lint && pnpm test` after upcoming changes; keep staging release-gate ready. | Doc-only |
| pending-p2-replace-remaining-12-console-usages-with-logger-calls-next-steps-doc- | P2 | open | Next Steps | Pending P2: Replace remaining 12 console usages with `logger` calls. | Doc-only |
| TASK-0782 | P2 | open | Next Steps | TAP payments: Unit coverage exists for charge helpers; add scenarios for error codes/refunds/webhook parsing to align with checkout coverage. | Doc-only |
| TASK-0781 | P2 | open | Next Steps | SMS readiness: OTP flows should gate on `isSmsOperational` to prevent blackholes; verify Taqnyat creds in prod and monitor `sendOTP` outcomes. | Doc-only |
| TASK-0780 | P2 | open | Next Steps | Bugs/Logic: Taqnyat webhook now size-capped and JSON-safe before processing; Souq ad clicks return 400 on bad JSON instead of crashing; OTP send returns 503 when SMS disabled to avoid silent failures. | Doc-only |
| TASK-0779 | P2 | open | Next Steps | Efficiency: Currency + CURRENCIES + feature-flag single sources already consolidated; reuse shared formatter/map across client/server (no divergent configs). | Doc-only |
| verification-pnpm-typecheck-pnpm-lint-pnpm-test-models-pnpm-test-e2e-timed-out-1 | P2 | open | Next Steps | Verification: `pnpm typecheck` ✅, `pnpm lint` ✅, `pnpm test:models` ✅, `pnpm test:e2e` ⚠️ timed out (~10m, Copilot suite still running). | Doc-only |
| TASK-0778 | P2 | open | Next Steps | TAP coverage: Add tests for refund failures, API error codes, and webhook signature mismatch to mirror checkout coverage and ensure regression safety. | Doc-only |
| TASK-0777 | P2 | open | Next Steps | SMS readiness: OTP flows should continue to gate on SMS config and log delivery errors; validate Taqnyat credentials in deployed envs. | Doc-only |
| missing-tests-new-coverage-for-checkout-happy-quote-error-tap-client-still-needs | P2 | open | Next Steps | Missing Tests: New coverage for checkout happy/quote/error; TAP client still needs additional negative/refund/webhook parsing cases; full Playwright still pending completion. | Doc-only |
| TASK-0776 | P2 | open | Next Steps | Efficiency: Currency/feature-flag/type single sources maintained (formatter + currencies map + feature-flags shim + FM/Invoice types). | Doc-only |
| re-ran-pnpm-test-e2e-with-extended-timeout-suite-still-timed-out-copilot-isolati | P2 | open | Next Steps | Re-ran `pnpm test:e2e` with extended timeout; suite still timed out (Copilot isolation flow still running). Typecheck/lint remain clean; models tests already green. | Doc-only |
| TASK-0775 | P2 | open | Next Steps | All API routes have error handling (direct or via factory/re-export) | Doc-only |
| TASK-0774 | P2 | open | Next Steps | No `as any` type bypasses in production code | Doc-only |
| TASK-0773 | P2 | open | Next Steps | ESLint: 0 warnings | Doc-only |
| TASK-0772 | P2 | open | Next Steps | All 2650 tests passing (100%) | Doc-only |
| TASK-0771 | P2 | open | Next Steps | **Deploy** to staging for E2E validation | Doc-only |
| TASK-0770 | P2 | open | Next Steps | **Merge** comprehensive type safety and test coverage improvements | Doc-only |
| TASK-0769 | P2 | open | Next Steps | **Create PR** for `fix/graphql-resolver-todos` branch with all fixes | Doc-only |
| TASK-0768 | P2 | open | Next Steps | Audit unprotected async void operations | Doc-only |
| TASK-0767 | P2 | open | Next Steps | Add tests for 9 services without coverage | Doc-only |
| TASK-0763 | P2 | open | Next Steps | 121/352 (34%) | Doc-only |
| TASK-0762 | P2 | open | Next Steps | Add DOMPurify sanitization (low risk, content is mostly trusted) | Doc-only |
| TASK-0761 | P2 | open | Next Steps | Wrap JSON.parse in webhooks with try-catch (30 min) | Doc-only |
| TASK-0760 | P2 | open | Next Steps | Add rate limiting to auth routes (1 hour effort) | Doc-only |
| TASK-0759 | P2 | open | Next Steps | Expand rate limit coverage to 50%+ | Doc-only |
| P2-11 | P2 | open | Bugs | \| ≡ƒƒó P2-11 \| Audit 21 console statements \| ≡ƒö▓ TODO \| 30 min \| | docs/PENDING_MASTER.md:19684 |
| P2-10 | P2 | open | Bugs | \| ≡ƒƒó P2-10 \| Increase rate limiting coverage (34% ΓåÆ 60%) \| ≡ƒö▓ TODO \| 2 hrs \| | docs/PENDING_MASTER.md:19683 |
| P1-1 | P2 | open | Bugs | \| ≡ƒƒí P1-1 \| Add Zod validation to 59 remaining routes \| 4 hrs \| ≡ƒö▓ \| None \| | 3.5 |
| missing-tests-add-negative-cases-for-invalid-metadata-non-object-non-string-keys | P2 | open | Bugs | **Missing Tests:** Add negative cases for invalid metadata (non-object, non-string keys), invalid transition status, empty comment text/attachments payloads, and regression tests asserting error re... | Doc-only |
| add-focused-tests-around-invalid-metadata-comment-payloads-and-validation-error- | P2 | open | Next Steps | Add focused tests around invalid metadata/comment payloads and validation error shaping before shipping. | Doc-only |
| next-fix-zod-record-signature-in-transition-route-widen-error-path-typing-in-wor | P2 | open | Next Steps | Next: fix Zod record signature in transition route, widen error path typing in work-order creation, then rerun `pnpm typecheck && pnpm lint && pnpm test`. | Doc-only |
| TASK-1105 | P2 | open | Next Steps | **Auth/infra separation**: new `safe-session` helper provides 503 vs 401 discrimination; several routes still call `getSessionUser` directly and return generic 500 on infra errors, diverging from t... | Doc-only |
| TASK-0754 | P2 | open | Next Steps | Add unit tests for `parseJsonBody` success/error branches and `safe-session` (503 vs 401) to lock behavior. | Doc-only |
| TASK-0753 | P2 | open | Next Steps | Add negative tests for malformed JSON and invalid payloads for `checkout/quote`, `checkout/session`, `properties/[id]` PATCH, `upload/scan-callback`, ensuring 400/422 (not 500). | Doc-only |
| TASK-0752 | P2 | open | Next Steps | Auth infra vs auth failure responses are inconsistent; routes not using `safe-session` may mask outages as 401, reducing reliability. | Doc-only |
| TASK-0751 | P2 | open | Next Steps | Payloads that partially validate can proceed to DB writes in the above routes; enforce schema validation first and short-circuit before side effects. | Doc-only |
| TASK-0750 | P2 | open | Next Steps | Zod parse failures surface as 500 where `parse` is used directly; switch to `safeParse` and return structured validation errors (same files above). | Doc-only |
| TASK-0749 | P2 | open | Next Steps | Use `health503` (`lib/api/health.ts`) for consistent 503 responses instead of ad-hoc JSON bodies in infra-sensitive paths (middleware and API routes). | lib/api/health.ts |
| TASK-0748 | P2 | open | Next Steps | 🔲 VERIFY | properties/route.ts |
| TASK-0747 | P2 | open | Next Steps | 117/352 (33%) | Doc-only |
| TASK-0720 | P2 | open | Next Steps | Souq reviews enforce org on GET but not POST; Aqar routes show the same “user-as-org” shortcut—clean up across modules to keep tenancy consistent. | Doc-only |
| TASK-1104 | P2 | open | Next Steps | GraphQL reads (workOrder, dashboardStats, properties, invoice) run without tenant/audit context and allow orgless execution; mirror mutation pattern by requiring orgId and setting contexts before D... | Doc-only |
| progress-master-pending-report-updated-with-latest-orgid-audit-risks-cataloged-a | P2 | open | Next Steps | Progress: Master Pending Report updated with latest orgId audit; risks cataloged across GraphQL read/write paths and Souq/Aqar routes using user-id fallbacks. | Doc-only |
| TASK-0745 | P2 | open | Next Steps | Souq reviews enforce org on GET but not on POST, mirroring the broader “user-as-org” shortcut seen in Aqar routes; clean up the pattern across modules to keep tenancy consistent. | Doc-only |
| TASK-0744 | P2 | open | Next Steps | Souq review creation org requirement | Doc-only |
| TASK-0743 | P2 | open | Next Steps | Aqar favorites uses user-id fallback for tenant scope | app/api/aqar/favorites/route.ts:61-138 |
| TASK-0742 | P2 | open | Next Steps | Aqar package/payment creation uses user-id fallback | app/api/aqar/packages/route.ts:102-124 |
| TASK-0741 | P2 | open | Next Steps | Normalize org once per GraphQL request and reuse | Doc-only |
| next-steps-enforce-required-orgid-tenant-audit-context-on-graphql-reads-writes-r | P2 | open | Next Steps | Next steps: Enforce required orgId + tenant/audit context on GraphQL reads/writes, remove user-id fallbacks in Souq/Aqar routes, add regression tests, then run `pnpm typecheck && pnpm lint && pnpm ... | Doc-only |
| progress-master-pending-report-located-and-updated-with-orgid-audit-expanded-rev | P2 | open | Next Steps | Progress: Master Pending Report located and updated with orgId audit; expanded review across GraphQL queries/mutations and Souq/Aqar routes that fall back to user ids. | Doc-only |
| TASK-0740 | P2 | open | Next Steps | Not run in this session. Please execute `pnpm typecheck && pnpm lint && pnpm test` before release. | Doc-only |
| TASK-0739 | P2 | open | Next Steps | Locked `/api/sms/test` behind a production 404 while retaining super-admin + rate-limit checks for lower environments. | Doc-only |
| TASK-0738 | P2 | open | Next Steps | Kept markdown rendering and SafeHtml rendering under DOMPurify; sanitized JSON-LD injection on about page to remove remaining direct `dangerouslySetInnerHTML` risks. | Doc-only |
| TASK-0737 | P2 | open | Next Steps | Not run (pending) | Doc-only |
| TASK-0735 | P2 | open | Next Steps | Add try-catch to 5 routes | Doc-only |
| TASK-0734 | P2 | open | Next Steps | Add Zod validation to 52 routes | Doc-only |
| TASK-0731 | P2 | open | Next Steps | `fm/support/*` — tickets, escalations | Doc-only |
| TASK-0730 | P2 | open | Next Steps | `fm/system/*` — roles, user invites | Doc-only |
| TASK-0729 | P2 | open | Next Steps | `fm/marketplace/*` — vendor, listings, orders | Doc-only |
| TASK-0728 | P2 | open | Next Steps | `kb/ingest`, `kb/search` — document content | Doc-only |
| TASK-0727 | P2 | open | Next Steps | `fm/finance/budgets` — budget fields | Doc-only |
| TASK-0726 | P2 | open | Next Steps | `fm/finance/expenses` — amount, category, vendor | Doc-only |
| TASK-0725 | P2 | open | Next Steps | `fm/properties` POST — property fields | Doc-only |
| TASK-0724 | P2 | open | Next Steps | `fm/work-orders/[id]/attachments` — file metadata | Doc-only |
| TASK-0723 | P2 | open | Next Steps | `fm/work-orders/[id]` PATCH — status, priority, description | Doc-only |
| TASK-0722 | P2 | open | Next Steps | `fm/work-orders/[id]/assign` — assigneeId, assigneeType | Doc-only |
| next-steps-enforce-orgid-tenant-audit-context-on-graphql-resolvers-remove-user-i | P2 | open | Next Steps | Next steps: Enforce orgId + tenant/audit context on GraphQL resolvers, remove user-id fallbacks in Souq/Aqar writes, add regression tests, then run `pnpm typecheck && pnpm lint && pnpm test`. | Doc-only |
| progress-master-pending-report-refreshed-with-latest-orgid-audit-cataloged-cross | P2 | open | Next Steps | Progress: Master Pending Report refreshed with latest orgId audit; cataloged cross-module user-id fallbacks and missing tenant context on GraphQL reads/writes. | Doc-only |
| pr-ready-to-merge-after-tests-pass-missing-tests-doc-only | P2 | open | Missing Tests | [ ] PR: Ready to merge after tests pass | Doc-only |
| tests-not-yet-run-missing-tests-doc-only | P2 | open | Missing Tests | [ ] Tests: Not yet run | Doc-only |
| TASK-0721 | P2 | open | Next Steps | ~10 files (staged + unstaged) | Doc-only |
| TASK-0718 | P2 | open | Next Steps | Aqar listing/package/favorites org enforcement | Doc-only |
| TASK-0717 | P2 | open | Next Steps | Souq review POST org requirement | Doc-only |
| TASK-0716 | P2 | open | Next Steps | GraphQL org enforcement + tenant/audit context | Doc-only |
| TASK-0715 | P2 | open | Next Steps | Aqar listings/packages/favorites use user-id fallback | app/api/aqar/listings/route.ts:99-138 |
| TASK-0714 | P2 | open | Next Steps | Souq review POST falls back to user id | app/api/souq/reviews/route.ts:61-108 |
| TASK-0711 | P2 | open | Next Steps | Short-circuit GraphQL reads when orgId missing | Doc-only |
| TASK-0710 | P2 | open | Next Steps | Normalize org once per GraphQL request and reuse across resolvers | Doc-only |
| next-steps-enforce-orgid-tenant-audit-context-on-graphql-reads-writes-remove-use | P2 | open | Next Steps | Next steps: Enforce orgId + tenant/audit context on GraphQL reads/writes, remove user-id fallbacks in Souq/Aqar writes, add regression tests, then run `pnpm typecheck && pnpm lint && pnpm test`. | Doc-only |
| progress-master-pending-report-updated-with-latest-orgid-audit-cataloged-user-id | P2 | open | Next Steps | Progress: Master Pending Report updated with latest orgId audit; cataloged user-id fallbacks and missing tenant context across GraphQL, Souq, and Aqar flows. | Doc-only |
| TASK-0709 | P2 | open | Next Steps | Tests should use `toContain()` for robustness against message changes | Doc-only |
| TASK-0708 | P2 | open | Next Steps | Invalid format: Schema-specific message (e.g., `"Invalid email format"`) | Doc-only |
| TASK-0707 | P2 | open | Next Steps | Missing required field: `"Invalid input: expected X, received undefined"` | Doc-only |
| TASK-0706 | P2 | open | Next Steps | Must be applied in `beforeEach` to reset between tests | Doc-only |
| TASK-0705 | P2 | open | Next Steps | Any route test under `tests/api/` | Doc-only |
| TASK-0704 | P2 | open | Next Steps | Mock must return `{ allowed: true }` not `{ success: true }` | Doc-only |
| bug-004 | P2 | open | Bugs | Souq review POST no org | app/api/souq/reviews/route.ts:61-108 |
| TASK-0697 | P2 | open | Next Steps | Add try-catch to 8 routes | Doc-only |
| TASK-0696 | P2 | open | Next Steps | Add Zod to 52 remaining routes | Doc-only |
| TASK-0692 | P2 | open | Next Steps | `app/vendors/error.tsx` - NEW: Error boundary | app/vendors/error.ts |
| TASK-0691 | P2 | open | Next Steps | `app/properties/error.tsx` - NEW: Error boundary | app/properties/error.ts |
| TASK-0690 | P2 | open | Next Steps | `app/api/souq/search/route.ts` - Fix: Zod error access | app/api/souq/search/route.ts |
| TASK-0689 | P2 | open | Next Steps | `app/api/aqar/favorites/route.ts` - SEC-FIX: orgId required | app/api/aqar/favorites/route.ts |
| TASK-0688 | P2 | open | Next Steps | `app/api/aqar/packages/route.ts` - SEC-FIX: orgId required | app/api/aqar/packages/route.ts |
| TASK-0687 | P2 | open | Next Steps | `app/api/aqar/listings/route.ts` - SEC-FIX: orgId required | app/api/aqar/listings/route.ts |
| TASK-0686 | P2 | open | Next Steps | `app/api/souq/reviews/route.ts` - SEC-FIX: orgId required | app/api/souq/reviews/route.ts |
| TASK-0685 | P2 | open | Next Steps | **Test Coverage:** `zod-validation.test.ts` checks for this pattern | zod-validation.test.ts |
| TASK-0684 | P2 | open | Next Steps | **Fix:** Changed to `error.issues` in all affected routes | Doc-only |
| TASK-0683 | P2 | open | Next Steps | **Pattern:** Using `.errors` instead of `.issues` on ZodError | Doc-only |
| TASK-0682 | P2 | open | Next Steps | **Test Coverage:** 8 pattern detection tests in `org-enforcement.test.ts` | org-enforcement.test.ts |
| TASK-0681 | P2 | open | Next Steps | Add missing service tests | Doc-only |
| TASK-0679 | P2 | open | Next Steps | 5 services need tests | Doc-only |
| TASK-0678 | P2 | open | Next Steps | 30 core + 25 missing subpages | Doc-only |
| TASK-0676 | P2 | open | Next Steps | `app/fm/vendors/`, `app/fm/invoices/` - FM operations | Doc-only |
| TASK-0675 | P2 | open | Next Steps | `app/work-orders/board/`, `app/work-orders/new/` - Core WO features | Doc-only |
| TASK-0674 | P2 | open | Next Steps | `app/aqar/filters/`, `app/aqar/map/` - Property features | Doc-only |
| TASK-0673 | P2 | open | Next Steps | `app/(root)/` - Main app shell | Doc-only |
| TASK-0672 | P2 | open | Next Steps | Various aggregation pipelines missing $limit stage | Doc-only |
| TASK-0671 | P2 | open | Next Steps | `app/api/fm/vendors/route.ts` - find without limit | app/api/fm/vendors/route.ts |
| TASK-0670 | P2 | open | Next Steps | Mostly missing | Doc-only |
| TASK-0669 | P2 | open | Next Steps | **Coverage**: All core functionality tested | Doc-only |
| TASK-0668 | P2 | open | Next Steps | **Test Files**: 282 | Doc-only |
| TASK-0667 | P2 | open | Next Steps | **Total Tests**: 2814 passing | Doc-only |
| TASK-0664 | P2 | open | Next Steps | Zod validation expansion | Doc-only |
| TASK-0659 | P2 | open | Next Steps | attendance, hr-notification, payroll-finance, ics | Doc-only |
| TASK-0658 | P2 | open | Next Steps | analytics, subscriptionBillingService, payroll, escalation | Doc-only |
| TASK-0656 | P2 | open | Next Steps | Total | Doc-only |
| TASK-0654 | P2 | open | Next Steps | API tests: HR module (7 routes) | Doc-only |
| TASK-0653 | P2 | open | Next Steps | API tests: Aqar module (16 routes) | Doc-only |
| TASK-0652 | P2 | open | Next Steps | Add try-catch to JSON.parse (4 files) | Doc-only |
| TASK-0651 | P2 | open | Next Steps | Rate limiting: Finance (11 routes) | Doc-only |
| TASK-0645 | P2 | open | Next Steps | `components/SafeHtml.tsx` — Sanitization wrapper itself | components/SafeHtml.ts |
| TASK-0644 | P2 | open | Next Steps | `app/help/[slug]/HelpArticleClient.tsx` — Help articles (sanitized) | /HelpArticleClient.ts |
| TASK-0643 | P2 | open | Next Steps | 213/352 (61%) | Doc-only |
| TASK-0641 | P2 | open | Next Steps | `app/vendor/error.tsx` | app/vendor/error.ts |
| TASK-0640 | P2 | open | Next Steps | `app/system/error.tsx` | app/system/error.ts |
| TASK-0639 | P2 | open | Next Steps | `app/support/error.tsx` | app/support/error.ts |
| TASK-0638 | P2 | open | Next Steps | `app/reports/error.tsx` | app/reports/error.ts |
| TASK-0637 | P2 | open | Next Steps | `app/profile/error.tsx` | app/profile/error.ts |
| TASK-0636 | P2 | open | Next Steps | `app/product/error.tsx` | app/product/error.ts |
| TASK-0635 | P2 | open | Next Steps | `app/pricing/error.tsx` | app/pricing/error.ts |
| TASK-0634 | P2 | open | Next Steps | `app/notifications/error.tsx` | app/notifications/error.ts |
| TASK-0633 | P2 | open | Next Steps | `app/login/error.tsx` | app/login/error.ts |
| TASK-0632 | P2 | open | Next Steps | `app/help/error.tsx` | app/help/error.ts |
| TASK-0631 | P2 | open | Next Steps | `app/forgot-password/error.tsx` | app/forgot-password/error.ts |
| TASK-0629 | P2 | open | Next Steps | `app/cms/error.tsx` | app/cms/error.ts |
| TASK-0628 | P2 | open | Next Steps | `app/careers/error.tsx` | app/careers/error.ts |
| TASK-0627 | P2 | open | Next Steps | `app/administration/error.tsx` | app/administration/error.ts |
| TASK-0626 | P2 | open | Next Steps | `createWorkOrder` mutation: Has org enforcement, rejects if no orgId | Doc-only |
| TASK-0625 | P2 | open | Next Steps | `dashboardStats` query: Has org enforcement, returns empty if no orgId | Doc-only |
| TASK-0624 | P2 | open | Next Steps | `workOrder` query: Has `setTenantContext()`, org filter, `clearTenantContext()` in finally | Doc-only |
| TASK-0623 | P2 | open | Next Steps | Pattern: `enforceRateLimit` with keyPrefix per endpoint | Doc-only |
| TASK-0622 | P2 | open | Next Steps | `aqar/offline` - GET 30/min (expensive operation) | Doc-only |
| TASK-0621 | P2 | open | Next Steps | `aqar/packages` - GET 60/min, POST 20/min | Doc-only |
| TASK-0620 | P2 | open | Next Steps | `aqar/listings/recommendations` - GET 60/min | Doc-only |
| TASK-0619 | P2 | open | Next Steps | `aqar/listings/[id]` - GET 60/min, PATCH 30/min, DELETE 20/min | Doc-only |
| TASK-0618 | P2 | open | Next Steps | `aqar/listings` - POST 30/min | Doc-only |
| TASK-0617 | P2 | open | Next Steps | `aqar/favorites/[id]` - DELETE 20/min | Doc-only |
| TASK-0616 | P2 | open | Next Steps | `aqar/favorites` - GET 60/min, POST 30/min | Doc-only |
| TASK-0615 | P2 | open | Next Steps | `aqar/insights/pricing` - 60 req/min (reads) | Doc-only |
| TASK-0614 | P2 | open | Next Steps | Coverage: 100% (16/16 routes protected) | Doc-only |
| TASK-0613 | P2 | open | Next Steps | **Status**: ✅ COMPLETE | Doc-only |
| TASK-0612 | P2 | open | Next Steps | All validations pass | Doc-only |
| TASK-0611 | P2 | open | Next Steps | **Solution**: Implement actual queries or document as "not implemented" | Doc-only |
| TASK-0610 | P2 | open | Next Steps | **Impact**: Properties and Invoice queries return no data | Doc-only |
| TASK-0609 | P2 | open | Next Steps | **Issue**: 2 TODOs in resolvers returning empty data | Doc-only |
| TASK-0608 | P2 | open | Next Steps | **Solution**: Create `lib/utils/safeJSON.ts` utility and replace all instances | lib/utils/safeJSON.ts |
| TASK-0607 | P2 | open | Next Steps | **Similar**: All in different modules (aqar, shell, api routes, marketplace, help) | Doc-only |
| TASK-0606 | P2 | open | Next Steps | **Issue**: 8 instances of unprotected JSON.parse | Doc-only |
| TASK-0605 | P2 | open | Next Steps | **Solution**: Add to all API routes with appropriate limits per HTTP method | Doc-only |
| TASK-0604 | P2 | open | Next Steps | **Issue**: 185 routes lack `enforceRateLimit` call | Doc-only |
| TASK-0602 | P2 | open | Next Steps | **P2**: Verify test imports in 2 potentially stale test files | Doc-only |
| TASK-0601 | P2 | open | Next Steps | **P2**: Add safeJSON utility for JSON.parse calls | Doc-only |
| TASK-0596 | P2 | open | Next Steps | `app/api/billing/subscribe/route.ts` | app/api/billing/subscribe/route.ts |
| TASK-0595 | P2 | open | Next Steps | `app/api/billing/quote/route.ts` | app/api/billing/quote/route.ts |
| TASK-0594 | P2 | open | Next Steps | `app/api/billing/history/route.ts` | app/api/billing/history/route.ts |
| TASK-0593 | P2 | open | Next Steps | `app/api/billing/charge-recurring/route.ts` | app/api/billing/charge-recurring/route.ts |
| TASK-0592 | P2 | open | Next Steps | `app/api/ats/settings/route.ts` | app/api/ats/settings/route.ts |
| TASK-0591 | P2 | open | Next Steps | `app/api/ats/public-post/route.ts` | app/api/ats/public-post/route.ts |
| TASK-0590 | P2 | open | Next Steps | `app/api/ats/moderation/route.ts` | app/api/ats/moderation/route.ts |
| TASK-0589 | P2 | open | Next Steps | `app/api/ats/jobs/route.ts` | app/api/ats/jobs/route.ts |
| TASK-0588 | P2 | open | Next Steps | `app/api/ats/jobs/public/route.ts` | app/api/ats/jobs/public/route.ts |
| TASK-0587 | P2 | open | Next Steps | `app/api/ats/jobs/[id]/publish/route.ts` | /publish/route.ts |
| TASK-0586 | P2 | open | Next Steps | `app/api/ats/jobs/[id]/apply/route.ts` | /apply/route.ts |
| TASK-0585 | P2 | open | Next Steps | `app/api/ats/interviews/route.ts` | app/api/ats/interviews/route.ts |
| TASK-0584 | P2 | open | Next Steps | `app/api/ats/convert-to-employee/route.ts` | app/api/ats/convert-to-employee/route.ts |
| TASK-0583 | P2 | open | Next Steps | `app/api/ats/applications/route.ts` | app/api/ats/applications/route.ts |
| TASK-0582 | P2 | open | Next Steps | `app/api/ats/analytics/route.ts` | app/api/ats/analytics/route.ts |
| TASK-0581 | P2 | open | Next Steps | `app/api/auth/verify/send/route.ts` | app/api/auth/verify/send/route.ts |
| TASK-0580 | P2 | open | Next Steps | `app/api/auth/verify/route.ts` | app/api/auth/verify/route.ts |
| TASK-0579 | P2 | open | Next Steps | `app/api/auth/test/session/route.ts` | app/api/auth/test/session/route.ts |
| TASK-0578 | P2 | open | Next Steps | `app/api/auth/test/credentials-debug/route.ts` | app/api/auth/test/credentials-debug/route.ts |
| TASK-0577 | P2 | open | Next Steps | `app/api/auth/signup/route.ts` | app/api/auth/signup/route.ts |
| TASK-0576 | P2 | open | Next Steps | `app/api/auth/reset-password/route.ts` | app/api/auth/reset-password/route.ts |
| TASK-0575 | P2 | open | Next Steps | `app/api/auth/refresh/route.ts` | app/api/auth/refresh/route.ts |
| TASK-0574 | P2 | open | Next Steps | `app/api/auth/post-login/route.ts` | app/api/auth/post-login/route.ts |
| TASK-0573 | P2 | open | Next Steps | `app/api/auth/me/route.ts` | app/api/auth/me/route.ts |
| TASK-0572 | P2 | open | Next Steps | `app/api/auth/forgot-password/route.ts` | app/api/auth/forgot-password/route.ts |
| TASK-0571 | P2 | open | Next Steps | `app/api/auth/force-logout/route.ts` | app/api/auth/force-logout/route.ts |
| TASK-0570 | P2 | open | Next Steps | `app/api/aqar/support/chatbot/route.ts` | app/api/aqar/support/chatbot/route.ts |
| TASK-0569 | P2 | open | Next Steps | `app/api/aqar/recommendations/route.ts` | app/api/aqar/recommendations/route.ts |
| TASK-0568 | P2 | open | Next Steps | `app/api/aqar/properties/route.ts` | app/api/aqar/properties/route.ts |
| TASK-0567 | P2 | open | Next Steps | `app/api/aqar/pricing/route.ts` | app/api/aqar/pricing/route.ts |
| TASK-0566 | P2 | open | Next Steps | `app/api/aqar/map/route.ts` | app/api/aqar/map/route.ts |
| TASK-0565 | P2 | open | Next Steps | `app/api/aqar/listings/search/route.ts` | app/api/aqar/listings/search/route.ts |
| TASK-0564 | P2 | open | Next Steps | `app/api/aqar/chat/route.ts` | app/api/aqar/chat/route.ts |
| TASK-0563 | P2 | open | Next Steps | `app/api/admin/users/route.ts` | app/api/admin/users/route.ts |
| TASK-0562 | P2 | open | Next Steps | `app/api/admin/sms/route.ts` | app/api/admin/sms/route.ts |
| TASK-0561 | P2 | open | Next Steps | `app/api/admin/price-tiers/route.ts` | app/api/admin/price-tiers/route.ts |
| TASK-0560 | P2 | open | Next Steps | `app/api/admin/notifications/test/route.ts` | app/api/admin/notifications/test/route.ts |
| TASK-0559 | P2 | open | Next Steps | `app/api/admin/notifications/send/route.ts` | app/api/admin/notifications/send/route.ts |
| TASK-0558 | P2 | open | Next Steps | `app/api/admin/notifications/history/route.ts` | app/api/admin/notifications/history/route.ts |
| TASK-0557 | P2 | open | Next Steps | `app/api/admin/notifications/config/route.ts` | app/api/admin/notifications/config/route.ts |
| TASK-0556 | P2 | open | Next Steps | `app/api/admin/discounts/route.ts` | app/api/admin/discounts/route.ts |
| TASK-0555 | P2 | open | Next Steps | `app/api/admin/billing/pricebooks/route.ts` | app/api/admin/billing/pricebooks/route.ts |
| TASK-0554 | P2 | open | Next Steps | `app/api/admin/billing/benchmark/route.ts` | app/api/admin/billing/benchmark/route.ts |
| TASK-0553 | P2 | open | Next Steps | `app/api/admin/audit-logs/route.ts` | app/api/admin/audit-logs/route.ts |
| TASK-0552 | P2 | open | Next Steps | **Routes Needing Protection**: 185 | Doc-only |
| TASK-0551 | P2 | open | Next Steps | **Webhook Endpoints** (Need separate handling): 4 | Doc-only |
| TASK-0550 | P2 | open | Next Steps | **Health/Test/Demo Endpoints** (Acceptable): 16 | Doc-only |
| TASK-0549 | P2 | open | Next Steps | **Total Unprotected Routes**: 205 | Doc-only |
| TASK-0548 | P2 | open | Next Steps | Production Readiness: 91% | Doc-only |
| TASK-0547 | P2 | open | Next Steps | Aqar Rate Limiting: 100% complete (16/16 routes) | Doc-only |
| TASK-0546 | P2 | open | Next Steps | Git status: Only `pnpm-lock.yaml` modified | pnpm-lock.yaml |
| TASK-0544 | P2 | open | Next Steps | `lib/config/tenant.ts` - Exported constants | lib/config/tenant.ts |
| TASK-0542 | P2 | open | Next Steps | `app/api/webhooks/sendgrid/route.ts` | app/api/webhooks/sendgrid/route.ts |
| TASK-0541 | P2 | open | Next Steps | `app/api/webhooks/carrier/tracking/route.ts` | app/api/webhooks/carrier/tracking/route.ts |
| TASK-0540 | P2 | open | Next Steps | `app/api/onboarding/route.ts` | app/api/onboarding/route.ts |
| TASK-0539 | P2 | open | Next Steps | `app/api/onboarding/initiate/route.ts` | app/api/onboarding/initiate/route.ts |
| TASK-0538 | P2 | open | Next Steps | `app/api/onboarding/documents/[id]/review/route.ts` | /review/route.ts |
| TASK-0537 | P2 | open | Next Steps | `app/api/onboarding/[caseId]/documents/request-upload/route.ts` | /documents/request-upload/route.ts |
| TASK-0536 | P2 | open | Next Steps | `app/api/onboarding/[caseId]/documents/confirm-upload/route.ts` | /documents/confirm-upload/route.ts |
| TASK-0535 | P2 | open | Next Steps | `app/api/onboarding/[caseId]/complete-tutorial/route.ts` | /complete-tutorial/route.ts |
| TASK-0534 | P2 | open | Next Steps | `app/api/marketplace/search/route.ts` | app/api/marketplace/search/route.ts |
| TASK-0533 | P2 | open | Next Steps | `app/api/marketplace/orders/route.ts` | app/api/marketplace/orders/route.ts |
| TASK-0532 | P2 | open | Next Steps | `app/api/marketplace/categories/route.ts` | app/api/marketplace/categories/route.ts |
| TASK-0531 | P2 | open | Next Steps | `app/api/help/context/route.ts` | app/api/help/context/route.ts |
| TASK-0530 | P2 | open | Next Steps | `app/api/help/articles/[id]/comments/route.ts` | /comments/route.ts |
| TASK-0529 | P2 | open | Next Steps | `app/api/health/sms/route.ts` | app/api/health/sms/route.ts |
| TASK-0528 | P2 | open | Next Steps | `app/api/health/route.ts` | app/api/health/route.ts |
| TASK-0527 | P2 | open | Next Steps | `app/api/health/ready/route.ts` | app/api/health/ready/route.ts |
| TASK-0526 | P2 | open | Next Steps | `app/api/health/live/route.ts` | app/api/health/live/route.ts |
| TASK-0525 | P2 | open | Next Steps | `app/api/health/debug/route.ts` | app/api/health/debug/route.ts |
| TASK-0524 | P2 | open | Next Steps | `app/api/health/db-diag/route.ts` | app/api/health/db-diag/route.ts |
| TASK-0523 | P2 | open | Next Steps | `app/api/health/database/route.ts` | app/api/health/database/route.ts |
| TASK-0522 | P2 | open | Next Steps | `app/api/health/auth/route.ts` | app/api/health/auth/route.ts |
| TASK-0521 | P2 | open | Next Steps | `app/api/finance/reports/owner-statement/route.ts` | app/api/finance/reports/owner-statement/route.ts |
| TASK-0520 | P2 | open | Next Steps | `app/api/finance/payments/[id]/complete/route.ts` | /complete/route.ts |
| TASK-0519 | P2 | open | Next Steps | `app/api/finance/journals/[id]/void/route.ts` | /void/route.ts |
| TASK-0518 | P2 | open | Next Steps | `app/api/finance/journals/[id]/post/route.ts` | /post/route.ts |
| TASK-0517 | P2 | open | Next Steps | `app/api/finance/invoices/route.ts` | app/api/finance/invoices/route.ts |
| TASK-0515 | P2 | open | Next Steps | Effort: 15 minutes | Doc-only |
| TASK-0514 | P2 | open | Next Steps | Impact: Prevents runtime crashes on malformed data | Doc-only |
| TASK-0513 | P2 | open | Next Steps | Effort: 30 minutes | Doc-only |
| TASK-0017 | P2 | open | Next Steps | [WIP] Update PENDING_MASTER v17.0 | Doc-only |
| TASK-0512 | P2 | open | Next Steps | `app/api/webhooks/taqnyat/route.ts:152` - SMS webhook | app/api/webhooks/taqnyat/route.ts:152 |
| TASK-0511 | P2 | open | Next Steps | `app/api/webhooks/sendgrid/route.ts:86` - Webhook payload | app/api/webhooks/sendgrid/route.ts:86 |
| TASK-0510 | P2 | open | Next Steps | `app/marketplace/vendor/products/upload/page.tsx:151` - Form specs | app/marketplace/vendor/products/upload/page.ts |
| TASK-0509 | P2 | open | Next Steps | `app/_shell/ClientSidebar.tsx:129` - WebSocket event | app/_shell/ClientSidebar.ts |
| TASK-0508 | P2 | open | Next Steps | `app/aqar/filters/page.tsx:121` - Filter state parsing | app/aqar/filters/page.ts |
| TASK-0507 | P2 | open | Next Steps | `lib/redis-client.ts` - Only imported in API routes | lib/redis-client.ts |
| TASK-0506 | P2 | open | Next Steps | `lib/redis.ts` - Only imported in API routes | lib/redis.ts |
| TASK-0505 | P2 | open | Next Steps | `lib/aws-secrets.ts` - Only imported in API routes | lib/aws-secrets.ts |
| TASK-0504 | P2 | open | Next Steps | The real error was masked by the `WebpackError` constructor failure | Doc-only |
| TASK-0503 | P2 | open | Next Steps | When minification encountered this error, it tried to create a `WebpackError` | Doc-only |
| TASK-0502 | P2 | open | Next Steps | Webpack tried to bundle `child_process` for client-side (impossible) | Doc-only |
| TASK-0501 | P2 | open | Next Steps | Import chain: `SafeHtml.tsx` → `sanitize-html.ts` → `jsdom` | SafeHtml.ts |
| TASK-0500 | P2 | open | Next Steps | `lib/sanitize-html.ts` manually imported `jsdom` (Node.js-only library) | lib/sanitize-html.ts |
| TASK-0498 | P2 | open | Next Steps | No coverage for admin notification config/test routes or support impersonation auth path | Doc-only |
| TASK-0497 | P2 | open | Next Steps | Rate limit helper missing | app/api/billing/upgrade/route.ts |
| TASK-0496 | P2 | open | Next Steps | Missing model helper types (`EmployeeMutable`, `EmployeeDocLike`, `UserMutable`, `HydratedDocument`) | types/mongoose-encrypted.d.ts |
| missing-tests-auth-gated-monitoring-error-handling-otp-forgot-password-flows-qa- | P2 | open | Bugs | Missing tests: auth-gated monitoring, error handling, OTP/forgot-password flows, QA reconnect/alert guard. | Doc-only |
| plan-gate-auto-monitoring-health-checks-on-authenticated-session-ssr-make-monito | P2 | open | Next Steps | Plan: gate auto-monitoring/health checks on authenticated session/SSR; make monitor init a no-op when logged out; fix OTP/forgot-password handlers and add tests. | Doc-only |
| post-api-auth-otp-send-returning-500-post-api-auth-forgot-password-returning-500 | P2 | open | Next Steps | `POST /api/auth/otp/send` returning 500; `POST /api/auth/forgot-password` returning 500 (password reset stub warning). | Doc-only |
| observed-repeated-401-403-spam-from-auto-monitor-health-checks-hitting-api-help- | P2 | open | Next Steps | Observed repeated 401/403 spam from auto-monitor/health checks hitting `/api/help/articles`, `/api/notifications`, `/api/qa/health`, `/api/qa/reconnect`, `/api/qa/alert` while unauthenticated (clie... | Doc-only |
| missing-tests-add-coverage-for-auth-gated-monitoring-start-backoff-alert-posting | P2 | open | Bugs | **Missing Tests**: Add coverage for auth-gated monitoring start/backoff/alert posting, and for OTP/forgot-password happy/error paths. | Doc-only |
| plan-gate-auto-monitor-startup-on-authenticated-session-and-ssr-feature-flag-dis | P2 | open | Next Steps | Plan: gate auto-monitor startup on authenticated session (and SSR/feature flag), disable the constructor auto-start, add exponential backoff and dedupe, and only post QA alerts when auth/session pr... | Doc-only |
| otp-send-and-forgot-password-flows-returning-500-password-reset-also-logs-a-stub | P2 | open | Next Steps | OTP send and forgot-password flows returning 500; password reset also logs a “stub” warning in the console. | Doc-only |
| confirmed-auto-monitor-health-checks-running-while-logged-out-spamming-api-help- | P2 | open | Next Steps | Confirmed auto-monitor/health checks running while logged out, spamming `/api/help/articles`, `/api/notifications`, `/api/qa/health`, `/api/qa/reconnect`, `/api/qa/alert` with 401/403 responses. | Doc-only |
| isolation-missing-tenant-audit-context-on-reads-workorders-workorder-dashboardst | P2 | open | Bugs | **Isolation \| Missing tenant/audit context on reads**: workOrders, workOrder, dashboardStats, organization, property/properties, and invoice resolvers do not set tenant/audit context, bypassing ten... | Doc-only |
| verification-pending-rerun-pnpm-typecheck-pnpm-lint-pnpm-test-after-implementing | P2 | open | Next Steps | Verification pending: rerun `pnpm typecheck && pnpm lint && pnpm test` after implementing changes. | Doc-only |
| plan-enforce-required-org-context-for-all-query-resolvers-wrap-reads-with-tenant | P2 | open | Bugs | Plan: enforce required org context for all Query resolvers, wrap reads with tenant/audit context, normalize org once, parallelize workOrders find/count; add unit tests for org-less requests, `creat... | app/api/graphql/route.ts |
| identified-graphql-query-resolver-gaps-orgid-fallback-to-userid-missing-tenant-a | P2 | open | Next Steps | Identified GraphQL Query resolver gaps: orgId fallback to userId, missing tenant/audit context on reads, sequential DB calls in workOrders. | Doc-only |
| branch-fix-graphql-resolver-todos-planning-only-this-session-no-new-code-committ | P2 | open | Next Steps | Branch `fix/graphql-resolver-todos`; planning only this session (no new code committed). | Doc-only |
| TASK-0495 | P2 | open | Next Steps | `organization` - ⚠️ Uses org fallback pattern | Doc-only |
| TASK-0494 | P2 | open | Next Steps | `invoice` - 🟡 Has org guard but TODO stub | Doc-only |
| TASK-0493 | P2 | open | Next Steps | `properties` - 🟡 Has org guard but TODO stub | Doc-only |
| TASK-0492 | P2 | open | Next Steps | ~116/352 (33%) | Doc-only |
| gql-002 | P2 | open | Next Steps | Incomplete | lib/graphql/index.ts |
| val-001 | P2 | open | Next Steps | Input Validation | Doc-only |
| TASK-0491 | P2 | open | Next Steps | **Status**: ✅ No additional risks identified | Doc-only |
| TASK-0490 | P2 | open | Next Steps | **Result**: 0 other client components have dynamic imports | Doc-only |
| TASK-0489 | P2 | open | Next Steps | Used variable for module name to prevent compile-time resolution | Doc-only |
| TASK-0488 | P2 | open | Next Steps | ~20+ other client components using logger | Doc-only |
| TASK-0487 | P2 | open | Next Steps | `app/about/error.tsx` - imports logger | app/about/error.ts |
| TASK-0486 | P2 | open | Next Steps | `app/aqar/error.tsx` - imports logger | app/aqar/error.ts |
| TASK-0016 | P2 | open | Next Steps | Add GraphQL resolver tests | Doc-only |
| TASK-0484 | P2 | open | Next Steps | Invoice resolver validates ObjectId before querying | Doc-only |
| TASK-0483 | P2 | open | Next Steps | Both use `setTenantContext()` / `clearTenantContext()` for proper isolation | Doc-only |
| TASK-0482 | P2 | open | Next Steps | Both resolvers require `ctx.orgId` (returns empty/null if missing) | Doc-only |
| TASK-0481 | P2 | open | Next Steps | **`invoice` resolver** (was TODO at line ~987): | Doc-only |
| TASK-0480 | P2 | open | Next Steps | **`properties` resolver** (was TODO at line ~943): | Doc-only |
| TASK-0479 | P2 | open | Next Steps | **Allowed attributes**: href, target, rel, style, class, src, alt, title | Doc-only |
| TASK-0478 | P2 | open | Next Steps | **Allowed tags**: p, strong, em, u, a, ul, ol, li, br, span, div, h1-h6, pre, code, blockquote, table elements, img, hr | Doc-only |
| TASK-0477 | P2 | open | Next Steps | Applies `SANITIZE_STRICT_CONFIG` with allowlist of safe tags | Doc-only |
| TASK-0476 | P2 | open | Next Steps | Uses `@/lib/sanitize-html` which imports `DOMPurify` from `isomorphic-dompurify` | Doc-only |
| TASK-0474 | P2 | open | Next Steps | 2 stubs | Doc-only |
| TASK-0473 | P2 | open | Next Steps | And 6 others | Doc-only |
| TASK-0472 | P2 | open | Next Steps | `tests/api/finance/invoices.route.test.ts` | tests/api/finance/invoices.route.test.ts |
| TASK-0471 | P2 | open | Next Steps | **services/**: 4 TODOs (integration improvements) | Doc-only |
| TASK-0470 | P2 | open | Next Steps | **app/**: 10 TODOs (feature enhancements) | Doc-only |
| TASK-0469 | P2 | open | Next Steps | **lib/**: 15 TODOs (mostly optimization notes) | Doc-only |
| TASK-0468 | P2 | open | Next Steps | `app/api/finance/accounts/route.ts` POST | app/api/finance/accounts/route.ts |
| TASK-0467 | P2 | open | Next Steps | `app/api/hr/employees/route.ts` POST | app/api/hr/employees/route.ts |
| TASK-0466 | P2 | open | Next Steps | `app/api/marketplace/checkout/route.ts` POST | app/api/marketplace/checkout/route.ts |
| TASK-0465 | P2 | open | Next Steps | `app/api/marketplace/cart/route.ts` POST | app/api/marketplace/cart/route.ts |
| TASK-0464 | P2 | open | Next Steps | `app/api/marketplace/products/route.ts` POST | app/api/marketplace/products/route.ts |
| TASK-0015 | P2 | open | Next Steps | [ ] **O4**: Comprehensive audit logging - 4h | Doc-only |
| TASK-0014 | P2 | open | Next Steps | [ ] **O3**: Request ID correlation - 2h | Doc-only |
| TASK-0013 | P2 | open | Next Steps | [ ] **O2**: Add Sentry APM spans - 3h | Doc-only |
| TASK-0012 | P2 | open | Next Steps | [ ] **O1**: Generate OpenAPI specs for all routes - 4h | Doc-only |
| TASK-0011 | P2 | open | Next Steps | [ ] **E4**: Create shared rate limit helper with decorators - 1h | Doc-only |
| TASK-0010 | P2 | open | Next Steps | [ ] **E3**: Centralize session guard helper - 2h | Doc-only |
| TASK-0009 | P2 | open | Next Steps | [ ] **Performance monitoring**: Add APM spans to critical paths - 2h | Doc-only |
| TASK-0008 | P2 | open | Next Steps | [ ] **Query optimization**: Identify and fix N+1 queries - 3h | Doc-only |
| TASK-0007 | P2 | open | Next Steps | [ ] **Add API tests for Assets & CMS** (6 tests) - 2h | Doc-only |
| TASK-0006 | P2 | open | Next Steps | [ ] **Add rate limiting to Assets, CMS, Others** (90 routes) - 4h | Doc-only |
| TASK-0005 | P2 | open | Next Steps | [ ] **Add Zod validation to remaining 191 routes** - 8h | Doc-only |
| TASK-0463 | P2 | open | Next Steps | [x] ~~**Add Zod validation to Marketplace routes** (15 routes)~~ - ✅ Already Complete (9/9 routes) | Doc-only |
| TASK-0462 | P2 | open | Next Steps | [x] ~~**Add rate limiting to CRM** (4 remaining routes)~~ - ✅ Already Complete (4/4 routes) | Doc-only |
| TASK-0461 | P2 | open | Next Steps | [x] ~~**Add rate limiting to HR** (2 remaining routes)~~ - ✅ Already Complete (7/7 routes) | Doc-only |
| TASK-0460 | P2 | open | Next Steps | [x] ~~**Add rate limiting to Finance** (10 remaining routes)~~ - ✅ Already Complete (19/19 routes) | Doc-only |
| TASK-0459 | P2 | open | Next Steps | [x] ~~**Add Zod validation to top 20 write endpoints**~~ - ✅ Already Complete | Doc-only |
| TASK-0458 | P2 | open | Next Steps | [x] ~~**Add rate limiting to Marketplace** (15 routes)~~ - ✅ Already Complete | Doc-only |
| TASK-0457 | P2 | open | Next Steps | [ ] Add audit logging for sensitive operations | Doc-only |
| TASK-0456 | P2 | open | Next Steps | [ ] Merge `feat/marketplace-api-tests` to main | Doc-only |
| TASK-0455 | P2 | open | Next Steps | [ ] Add Zod validation to remaining routes | Doc-only |
| TASK-0454 | P2 | open | Next Steps | [ ] Close 6 stale draft PRs (#539-544) | Doc-only |
| TASK-0453 | P2 | open | Next Steps | [ ] Push changes to remote | Doc-only |
| TASK-0452 | P2 | open | Next Steps | [ ] Commit pending test files | Doc-only |
| add-api-tests-for-fm-25-routes-4h-missing-tests-doc-only | P2 | open | Missing Tests | [ ] Add API tests for FM (25 routes) — 4h | Doc-only |
| add-api-tests-for-aqar-16-routes-3h-missing-tests-doc-only | P2 | open | Missing Tests | [ ] Add API tests for Aqar (16 routes) — 3h | Doc-only |
| add-api-tests-for-souq-module-75-routes-8h-missing-tests-doc-only | P2 | open | Missing Tests | [ ] Add API tests for Souq module (75 routes) — 8h | Doc-only |
| add-fm-api-tests-4h-missing-tests-doc-only | P2 | open | Missing Tests | [ ] Add FM API tests — 4h | Doc-only |
| add-aqar-api-tests-3h-missing-tests-doc-only | P2 | open | Missing Tests | [ ] Add Aqar API tests — 3h | Doc-only |
| add-souq-module-tests-21-subdirectories-8h-missing-tests-doc-only | P2 | open | Missing Tests | [ ] Add Souq module tests (21 subdirectories) — 8h | Doc-only |
| fix-20-failing-tests-8-files-2h-missing-tests-doc-only | P2 | open | Missing Tests | [ ] Fix 20 failing tests (8 files) — 2h | Doc-only |
| TASK-0451 | P2 | open | Next Steps | Communication logging includes delivery method | Doc-only |
| TASK-0450 | P2 | open | Next Steps | Email masking in responses (`u***@example.com`) | Doc-only |
| TASK-0449 | P2 | open | Next Steps | Fallback to SMS if no email registered | Doc-only |
| TASK-0448 | P2 | open | Next Steps | Per-email rate limiting (prevents email bombing) | Doc-only |
| TASK-0447 | P2 | open | Next Steps | Professional HTML email template with branding | Doc-only |
| TASK-0446 | P2 | open | Next Steps | `lib/otp-store-redis.ts` — Updated OTPData interface | lib/otp-store-redis.ts |
| next-parameterize-residual-hardcoded-credentials-config-centralize-souq-rule-win | P2 | open | Next Steps | Next: parameterize residual hardcoded credentials/config, centralize Souq rule windows, enforce env-driven storage config, then run `pnpm typecheck && pnpm lint && pnpm test`. | Doc-only |
| branch-feat-marketplace-api-tests-working-tree-already-dirty-from-prior-sessions | P2 | open | Bugs | Branch: `feat/marketplace-api-tests`; working tree already dirty from prior sessions (`app/about/page.tsx`, `app/api/hr/leaves/route.ts`, `app/api/hr/payroll/runs/route.ts`, `app/api/souq/ads/click... | app/about/page.ts |
| next-evaluate-existing-dirty-app-api-changes-user-owned-before-merging-optionall | P2 | open | Next Steps | Next: evaluate existing dirty app/api changes (user-owned) before merging; optionally rerun Playwright once environment stabilizes. | Doc-only |
| verification-pnpm-typecheck-pnpm-lint-pnpm-test-ci-all-passing-full-vitest-suite | P2 | open | Next Steps | Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test:ci` all passing (full vitest suite). Playwright e2e not rerun this pass (previous attempts hit timeout). | Doc-only |
| centralized-souq-fraud-return-windows-in-shared-config-with-tenant-overrides-ser | P2 | open | Next Steps | Centralized Souq fraud/return windows in shared config with tenant overrides + services wired to the shared getter. | Doc-only |
| TASK-0445 | P2 | open | Next Steps | [x] `pnpm vitest run` - 2927 tests passing | Doc-only |
| TASK-0004 | P2 | open | Next Steps | FM tests (+17) | Doc-only |
| TASK-0444 | P2 | open | Next Steps | SLA check: SUPER_ADMIN role requirement | Doc-only |
| TASK-0443 | P2 | open | Next Steps | Metrics: METRICS_TOKEN authentication | Doc-only |
| TASK-0442 | P2 | open | Next Steps | PM generate-wos: CRON_SECRET header validation | Doc-only |
| TASK-0441 | P2 | open | Next Steps | Extensive: missingString, invalidNumbers, validPricing, validGeo | aqar/listings/route.ts |
| TASK-0440 | P2 | open | Next Steps | `4cc4726f3` | Doc-only |
| TASK-0439 | P2 | open | Next Steps | [x] Rate Limiting: 352/352 routes (100%) | Doc-only |
| TASK-0438 | P2 | open | Next Steps | [x] Error Boundaries: 38 files comprehensive coverage | Doc-only |
| TASK-0436 | P2 | open | Next Steps | [x] `pnpm vitest run` - 2927 tests passing (294 files) | Doc-only |
| TASK-0435 | P2 | open | Next Steps | [x] `pnpm lint` - 0 errors | Doc-only |
| TASK-0434 | P2 | open | Next Steps | [x] `pnpm typecheck` - 0 errors | Doc-only |
| TASK-0430 | P2 | open | Next Steps | `components/auth/OTPVerification.tsx` - clearInterval ✅ | components/auth/OTPVerification.ts |
| TASK-0426 | P2 | open | Next Steps | Webhook handlers are largely untested | Doc-only |
| TASK-0425 | P2 | open | Next Steps | Admin routes have minimal test coverage | Doc-only |
| TASK-0424 | P2 | open | Next Steps | All marketplace-related modules have <35% coverage | Doc-only |
| TASK-0423 | P2 | open | Next Steps | No code changes or verification commands run (documentation-only update); fixes and regression tests still needed. | Doc-only |
| TASK-0422 | P2 | open | Next Steps | ✅ 305 test files | Doc-only |
| TASK-0421 | P2 | open | Next Steps | ✅ 2961 tests pass (0 failures) | Doc-only |
| TASK-0420 | P2 | open | Next Steps | `lib/**` — All library code ✅ | Doc-only |
| TASK-0419 | P2 | open | Next Steps | `services/**` — All service layers ✅ | Doc-only |
| TASK-0418 | P2 | open | Next Steps | `app/**` — All API routes ✅ | Doc-only |
| TASK-0417 | P2 | open | Next Steps | `37bd93d69` | Doc-only |
| TASK-0415 | P2 | open | Next Steps | **Test-session misuse**: Previously minted tokens on infra failure; verify other test-only endpoints do not bypass failure checks and ensure E2E harness treats 503 as blocking. | Doc-only |
| TASK-0414 | P2 | open | Next Steps | **Auth infra masking**: `getSessionUser(...).catch(() => null)` used across onboarding/help/upload/settings; outages become 401/empty responses. Need infra-aware helper and telemetry. | Doc-only |
| TASK-0413 | P2 | open | Next Steps | Add tenant-config caller tests to ensure 503 or explicit tenant-missing is returned (no silent defaults). | Doc-only |
| TASK-0412 | P2 | open | Next Steps | Add auth-infra failure tests for routes using `getSessionUser(...).catch(() => null)` (onboarding, upload presign/scan, help context/articles, settings logo). | Doc-only |
| TASK-0411 | P2 | open | Next Steps | Add parse-failure tests for routes using inline JSON fallbacks (billing quote, FM transitions, help escalate, admin billing discount). | Doc-only |
| TASK-0410 | P2 | open | Next Steps | Defaulting to `DEFAULT_TENANT_CONFIG` on load failure previously masked tenant issues; now throws, but callers must handle and surface appropriate 503/tenant-missing responses. | Doc-only |
| TASK-0409 | P2 | open | Next Steps | Auth helper fallback (`getSessionUser(...).catch(() => null)`) masks infra failures in onboarding/help/upload routes; can misreport outages as 401. Introduce infra-aware handling (503) with logging. | Doc-only |
| TASK-1119 | P2 | open | Next Steps | Legacy inline `.catch(() => ({}\|null))` still present (e.g., `app/api/help/escalate/route.ts`, `app/api/billing/quote/route.ts`, `app/api/fm/work-orders/[id]/transition/route.ts`, `app/api/admin/bi... | app/api/help/escalate/route.ts |
| TASK-0408 | P2 | open | Next Steps | Add tenant-config cache warm-up/metric emission to cut latency and detect org-specific degradation. | Doc-only |
| TASK-0407 | P2 | open | Next Steps | Replace per-route inline JSON parsing with shared helper to reduce duplicate code and improve observability. | Doc-only |
| TASK-0406 | P2 | open | Next Steps | `tests/api/souq/claims-get-error.route.test.ts` (order lookup failure returns 500) | tests/api/souq/claims-get-error.route.test.ts |
| TASK-0405 | P2 | open | Next Steps | `tests/unit/lib/config/tenant.server.test.ts` (tenant load failure) | tests/unit/lib/config/tenant.server.test.ts |
| TASK-0404 | P2 | open | Next Steps | `/api/souq/claims/[id]`: DB failures now 500 instead of false 404s. | Doc-only |
| TASK-0403 | P2 | open | Next Steps | `/api/trial-request`: DB connect/insert failures now 503 (no silent lead loss). | Doc-only |
| TASK-0402 | P2 | open | Next Steps | `/api/auth/test/session`: DB/user lookup failures now 503; user must exist (404 otherwise). | Doc-only |
| P0-002 | P2 | open | Bugs | \| P0-002 \| Security \| `pm/plans/route.ts:42,68,189` \| FMPMPlan.find without orgId \| ≡ƒö┤ TODO \| Add tenant scoping \| | pm/plans/route.ts:42,68,189 |
| open-prs-bugs-doc-only | P2 | open | Bugs | **Open PRs**: | Doc-only |
| next-rerun-playwright-smoke-to-validate-auth-checkout-returns-extend-banned-lite | P2 | open | Next Steps | Next: rerun Playwright smoke to validate auth/checkout/returns, extend banned-literal list if new tokens appear, and ensure deployment pipelines inject AWS + SuperAdmin secrets before rotation. | Doc-only |
| souq-fraud-return-rule-windows-centralized-with-tenant-overrides-returns-and-cla | P2 | open | Next Steps | Souq fraud/return rule windows centralized with tenant overrides; returns and claims flows are wired to the shared config. | Doc-only |
| superadmin-rotation-script-is-now-env-only-username-password-required-credential | P2 | open | Next Steps | SuperAdmin rotation script is now env-only (username/password required), credential echo removed, and banned-literal guard test in place; rotation ready once secrets are set. | Doc-only |
| no-commands-executed-documentation-only-update-next-steps-doc-only | P2 | open | Next Steps | No commands executed (documentation-only update). | Doc-only |
| identified-additional-silent-failure-points-vendor-apply-submissions-upload-auth | P2 | open | Next Steps | Identified additional silent-failure points (vendor apply submissions, upload/auth/session cluster, OTP org resolution, resume download, FM report AV scan) not covered in the last audit. | Doc-only |
| next-rerun-playwright-e2e-when-runtime-allows-extend-banned-literal-list-if-new- | P2 | open | Next Steps | Next: rerun Playwright e2e when runtime allows; extend banned-literal list if new sensitive tokens appear; ensure pipelines set AWS envs and SuperAdmin secrets before rotation. | Doc-only |
| centralized-souq-fraud-return-rule-windows-with-tenant-overrides-returns-claims- | P2 | open | Next Steps | Centralized Souq fraud/return rule windows with tenant overrides; returns + claims investigation now consume the shared config. | Doc-only |
| P3-003 | P2 | open | Bugs | \| P3-003 \| Documentation \| OpenAPI \| Spec needs updating \| ≡ƒƒó Backlog \| Sync with routes \| | docs/PENDING_MASTER.md:11539 |
| P2-002 | P2 | open | Bugs | \| P2-002 \| Validation \| ~118 routes \| Missing Zod validation \| ≡ƒƒí Backlog \| Add schemas \| | docs/PENDING_MASTER.md:11528 |
| P1-004 | P2 | open | Bugs | \| P1-004 \| Testing \| Souq module \| 51 routes missing tests \| ≡ƒƒá Backlog \| Add test files \| | docs/PENDING_MASTER.md:11521 |
| P1-003 | P2 | open | Bugs | \| P1-003 \| Reliability \| Multiple upload routes \| getSessionUser silent failures \| ≡ƒö┤ TODO \| Add telemetry wrapper \| | docs/PENDING_MASTER.md:11520 |
| P1-002 | P2 | open | Bugs | \| P1-002 \| Reliability \| vendor/apply/route.ts \| Silent DB failure on apply \| ≡ƒö┤ TODO \| Return 503 on failure \| | vendor/apply/route.ts |
| P0-003 | P2 | open | Bugs | \| P0-003 \| Security \| `vendors/route.ts:214,218` \| Vendor.find/countDocuments missing orgId \| ΓÜá∩╕Å Verify \| Check if scoped elsewhere \| | vendors/route.ts:214,218 |
| P0-001 | P2 | open | Bugs | \| P0-001 \| Security \| `assistant/query/route.ts:259` \| WorkOrder.find without orgId \| ≡ƒö┤ TODO \| Add tenant scoping \| | assistant/query/route.ts:259 |
| TASK-1103 | P2 | open | Next Steps | Add negative-path tests for: vendor apply DB unavailable/persistence error; OTP org lookup DB failure; upload/auth helper infra failure returning 503; malformed JSON in help escalation, Aqar listin... | Doc-only |
| APPLY-001 | P2 | open | Next Steps | SILENT-VENDOR-APPLY-001 — `app/api/vendor/apply/route.ts`: Swallows DB connect failures and still returns `{ ok: true }`, dropping submissions silently. Require DB success, persist payload, return ... | app/api/vendor/apply/route.ts |
| AVSCAN-001 | P2 | open | Next Steps | SILENT-FM-AVSCAN-001 — `app/api/fm/reports/process/route.ts`: AV scan fallback `catch(() => false)` causes wasted reruns and hides scanner outages. Add structured telemetry, fail-fast when scanner ... | app/api/fm/reports/process/route.ts |
| add-observability-and-guardrails-for-av-scanning-surface-scanner-outages-short-c | P2 | open | Next Steps | Add observability and guardrails for AV scanning: surface scanner outages, short-circuit processing, and add a health metric/test in FM reports worker. | Doc-only |
| replace-inline-getsessionuser-catch-null-usage-in-upload-help-onboarding-setting | P2 | open | Next Steps | Replace inline `getSessionUser(...).catch(() => null)` usage in upload/help/onboarding/settings/subscription/resume routes with a shared helper that logs infra failures and returns 503, preserving ... | Doc-only |
| bug-005 | P2 | open | Bugs | 🟡 Medium | /route.ts |
| bug-003 | P2 | open | Bugs | 🟠 High | lib/graphql/index.ts:936-1052 |
| TASK-1102 | P2 | open | Next Steps | **Health hints**: currently on auth test session and trial-request; extend to AV scan/config 503s (upload scan, FM reports), tenant-config callers, and other infra-dependent routes for consistent t... | Doc-only |
| TASK-0401 | P2 | open | Next Steps | **DLQ resilience**: trial-request now writes webhook + file; vendor-apply and other public submission endpoints should mirror durable DLQ to avoid silent drops during DB outages. | Doc-only |
| TASK-1101 | P2 | open | Next Steps | **Auth infra masking**: routes still using `getSessionUser(...).catch(() => null)` (onboarding, settings logo, remaining upload/subscription checks) will misclassify infra outages as 401. Roll out ... | Doc-only |
| TASK-1100 | P2 | open | Next Steps | **JSON parse fallbacks**: still present in help list/context, Aqar listings/packages, FM budgets, projects test API, and onboarding/upload flows. Apply shared parser + lint guard to eliminate silen... | Doc-only |
| TASK-0400 | P2 | open | Next Steps | Add tests for health-hint payload presence on 503 responses in routes using the helper. | Doc-only |
| TASK-0399 | P2 | open | Next Steps | Add tests for allowed-org gating on `/api/auth/test/session`. | Doc-only |
| TASK-0398 | P2 | open | Next Steps | Add negative-path tests for new parser/auth/health-hint behaviors (malformed JSON, auth-store failure, DLQ webhook/file failure). | Doc-only |
| TASK-0397 | P2 | open | Next Steps | Test-session endpoint gated by org; ensure staging/shared envs set `TEST_SESSION_ALLOWED_ORGS` to avoid accidental exposure. | Doc-only |
| TASK-0396 | P2 | open | Next Steps | Trial-request DLQ webhook/file is best-effort; without durable queue, leads can still drop if both fail. Recommendation: add queue-backed DLQ. | Doc-only |
| TASK-0395 | P2 | open | Next Steps | Auth infra vs auth failure separation incomplete (onboarding/settings/upload remnants). Risk: outages look like 401. Recommendation: roll out `getSessionOrError`. | Doc-only |
| TASK-0394 | P2 | open | Next Steps | Health-hint helper standardizes 503 responses for faster triage. | Doc-only |
| TASK-0393 | P2 | open | Next Steps | Shared parser reduces per-route boilerplate; lint guard prevents regressions. | Doc-only |
| TASK-0392 | P2 | open | Next Steps | Tests after this batch not yet rerun; prior targeted suite still passing. | Doc-only |
| TASK-0391 | P2 | open | Next Steps | CI: `lint:ci` now runs `lint:json-fallbacks --strict` to block new inline parsers. | Doc-only |
| TASK-1099 | P2 | open | Next Steps | `/api/trial-request`: DB failures now log metric, attempt webhook DLQ, and append to durable file DLQ (`TRIAL_REQUEST_DLQ_FILE`, default `_artifacts/trial-request-dlq.jsonl`), then return health-hi... | _artifacts/trial-request-dlq.js |
| TASK-0390 | P2 | open | Next Steps | `/api/auth/test/session`: now enforce allowed orgs via `TEST_SESSION_ALLOWED_ORGS`; returns 404 if org not allowed; 503s now include health hints. | Doc-only |
| TASK-1098 | P2 | open | Next Steps | Extended shared JSON parser + auth infra-aware helper to upload flows (`presigned-url`, `verify-metadata`, `scan`, `scan-status`) and help articles/comments; subscription middleware now surfaces au... | Doc-only |
| TASK-0389 | P2 | open | Next Steps | **DLQ resilience**: Trial-request uses webhook + file; consider durable DLQ for other public submission endpoints (e.g., vendor apply) to avoid silent drops during DB outages. | Doc-only |
| TASK-0388 | P2 | open | Next Steps | **Alerting gap**: Metrics exist (`tenant_config_load_failure`, `trial_request_persist_failure`, DLQ failures, `auth_infra_failure`) but dashboards/alerts are missing; risk of silent degradation. | Doc-only |
| TASK-1097 | P2 | open | Next Steps | **Health hints coverage gap**: Only auth test session, trial-request, and upload scan config/policy failures emit health-hinted 503s. Apply helper to other infra-dependent paths (tenant-config cons... | Doc-only |
| TASK-0387 | P2 | open | Next Steps | Add health-hint assertions on AV scan/config failure paths and tenant-config caller responses once implemented. | Doc-only |
| TASK-0386 | P2 | open | Next Steps | Tenant-config callers should add health-hinted responses when surfacing 503s to aid ops. | Doc-only |
| TASK-0385 | P2 | open | Next Steps | Trial-request DLQ is best-effort (webhook + file); without durable queue, leads can still drop if both fail. | Doc-only |
| TASK-0384 | P2 | open | Next Steps | None new; primary gap is missing health-hints/alerts on other 503 surfaces and absent dashboards for emitted metrics. | Doc-only |
| TASK-0383 | P2 | open | Next Steps | Health-hints helper standardizes 503 responses and triage metadata. | Doc-only |
| TASK-0382 | P2 | open | Next Steps | Shared parser + lint guard in place; continue using for new/remaining routes. | Doc-only |
| TASK-1096 | P2 | open | Next Steps | Targeted suites passing: `pnpm vitest tests/unit/api/auth-test-session.route.test.ts tests/unit/api/trial-request/route.test.ts tests/unit/lib/config/tenant.server.test.ts tests/api/souq/claims-get... | tests/unit/api/auth-test-session.route.test.ts |
| TASK-0381 | P2 | open | Next Steps | Trial-request DLQ durability intact (webhook + file); tenant-config load continues logging `tenant_config_load_failure`. | Doc-only |
| TASK-0380 | P2 | open | Next Steps | Health-hinted 503s used by auth test session, trial-request, and upload scan config/policy failures; helper tolerates missing `nextUrl`. | Doc-only |
| TASK-1095 | P2 | open | Next Steps | Auth infra-aware helper is applied across upload flows, help articles/comments, subscription middleware, settings logo, auth test session, and FM attachment presign; no residual `getSessionUser(...... | Doc-only |
| TASK-1094 | P2 | open | Next Steps | Restored shared JSON parser module (`lib/api/parse-json.ts`) and refactored remaining inline fallback cases (auth test session, FM work-order attachment presign). Re-scan shows no `req.json().catch... | lib/api/parse-json.ts |
| TASK-0379 | P2 | open | Next Steps | Add admin dashboard cards for tenant-config load status and last successful refresh. | Doc-only |
| TASK-0378 | P2 | open | Next Steps | Promote trial-request DLQ to a durable queue writer (instead of webhook) to avoid drops during DB outages. | Doc-only |
| TASK-0377 | P2 | open | Next Steps | Per-tenant feature flag to disable test-only endpoints (e.g., `/api/auth/test/session`) in shared/stage environments. | Doc-only |
| TASK-0376 | P2 | open | Next Steps | Add health-hints JSON in 503 responses (`code`, `retryable`, `traceId`) to speed triage. | Doc-only |
| TASK-0375 | P2 | open | Next Steps | **Tenant-config failures** now logged with metric; ensure dashboard/alerting consumes `tenant_config_load_failure` to avoid silent tenant degradation. | Doc-only |
| TASK-0374 | P2 | open | Next Steps | **Trial-request resilience**: DB outage now 503 + DLQ webhook; similar pattern could be applied to other public submission endpoints (e.g., vendor apply) to avoid silent drops. | Doc-only |
| TASK-0373 | P2 | open | Next Steps | **Auth infra masking** persists where `getSessionUser(...).catch(() => null)` is still used (onboarding/upload/settings/subscription-adjacent). Apply new helper to surface 503 on infra failure. | Doc-only |
| TASK-0372 | P2 | open | Next Steps | **JSON parse fallbacks** remain across help listings/context, Aqar, FM budgets, projects test API, and upload flows; migrate to shared parser to avoid silent defaults. | Doc-only |
| TASK-0371 | P2 | open | Next Steps | Add DLQ webhook success/failure tests for trial-request when env is set. | Doc-only |
| TASK-0370 | P2 | open | Next Steps | Add auth-infra failure tests for routes adopting `getSessionOrError`. | Doc-only |
| TASK-0369 | P2 | open | Next Steps | Add parser negative-path tests for updated routes and upcoming migrations. | Doc-only |
| TASK-0368 | P2 | open | Next Steps | Tenant-config callers still need to handle thrown errors; ensure upstream APIs map to 503 or explicit tenant-missing. | Doc-only |
| TASK-0367 | P2 | open | Next Steps | Trial-request now DLQs to webhook on DB failure; ensure webhook is set in prod or replace with durable queue. | Doc-only |
| TASK-0366 | P2 | open | Next Steps | Auth failures vs infra failures not yet separated in onboarding/upload/settings routes; outages still appear as 401. Recommendation: adopt `getSessionOrError` wrapper and log 503 with metric. | Doc-only |
| TASK-0365 | P2 | open | Next Steps | `lint:json-fallbacks` provides automated detection of silent parse fallbacks; enforced in CI. | Doc-only |
| TASK-0364 | P2 | open | Next Steps | Shared JSON parser removes per-route parsing boilerplate and standardizes responses/telemetry. | Doc-only |
| add-coverage-for-resume-download-storage-failures-in-integration-tests-and-surfa | P2 | open | Next Steps | Add coverage for resume download storage failures in integration tests and surface AV scan health in monitoring/dashboards. | Doc-only |
| extend-safe-parser-adoption-to-remaining-upload-scan-verify-metadata-routes-and- | P2 | open | Next Steps | Extend safe parser adoption to remaining upload/scan/verify-metadata routes and ensure CI `lint:json-fallbacks` stays clean. | Doc-only |
| roll-the-telemetry-aware-session-helper-to-remaining-upload-help-onboarding-sett | P2 | open | Next Steps | Roll the telemetry-aware session helper to remaining upload/help/onboarding/settings routes still showing silent auth fallbacks in git status. | Doc-only |
| TASK-1093 | P2 | open | Next Steps | **Observability gaps**: AV scan availability is not reported to dashboards; auth infra failures counted only in logs. Add metrics (`auth_infra_failure`, `av_scan_unavailable`) and alerts to catch o... | Doc-only |
| TASK-1092 | P2 | open | Next Steps | **Silent auth/session fallbacks** remain in dirty routes (upload variants, help context/list, onboarding document routes, settings logo) still using `getSessionUser(...).catch(() => null)`, masking... | Doc-only |
| missing-tests-need-integration-tests-for-resume-download-storage-failure-403-503 | P2 | open | Next Steps | **Missing tests**: Need integration tests for resume download storage failure/403/503 paths; negative-path tests for auth infra failures on upload/help/onboarding/settings; parser failure tests on ... | Doc-only |
| TASK-1091 | P2 | open | Next Steps | **Logic errors**: JSON parsing defaults still exist in some upload variants and onboarding flows, allowing malformed bodies to proceed; auth vs infra conflation persists where safe-session helper i... | Doc-only |
| TASK-1090 | P2 | open | Next Steps | **Identified bugs**: Remaining silent auth fallbacks in upload/help/onboarding/settings cause 401s on infra failure; AV scan health not surfaced to monitoring; resume download still maps storage fa... | Doc-only |
| TASK-0363 | P2 | open | Next Steps | **Efficiency improvements**: Gate AV scan processing on scanner health and avoid reprocessing loops; ensure rate-limit/parse helpers are reused across upload routes to cut duplicate logic. | Doc-only |
| add-integration-coverage-for-resume-download-storage-failures-and-emit-av-scanne | P2 | open | Next Steps | Add integration coverage for resume download storage failures and emit AV scanner health metrics/dashboards; wire alerts for auth infra failures (metric `auth_infra_failure`) and AV outages. | Doc-only |
| extend-parsebodysafe-parsebody-to-remaining-upload-variants-scan-scan-status-ver | P2 | open | Next Steps | Extend `parseBodySafe`/`parseBody` to remaining upload variants (`scan`, `scan-status`, `verify-metadata`, presign siblings) and keep `lint:json-fallbacks` clean. | Doc-only |
| align-and-merge-local-changes-on-dirty-upload-help-onboarding-settings-files-the | P2 | open | Next Steps | Align and merge local changes on dirty upload/help/onboarding/settings files, then apply `getSessionOrError` to remove `getSessionUser(...).catch(() => null)` fallbacks. | Doc-only |
| located-master-pending-report-no-duplicates-and-reviewed-prior-hardening-work-sa | P2 | open | Missing Tests | Located Master Pending Report (no duplicates) and reviewed prior hardening work (safe session/parser rollouts). | Doc-only |
| bug-007 | P2 | open | Bugs | 🟡 Medium | Doc-only |
| bug-006 | P2 | open | Bugs | 🟠 High | Doc-only |
| bug-1527 | P2 | open | Bugs | 🟠 High | Doc-only |
| TASK-0362 | P2 | open | Next Steps | Workflow diagnostics confirmed as environment setup gaps (staging / production-approval / production) rather than code defects. | Doc-only |
| TASK-0361 | P2 | open | Next Steps | Footer/theme/status UX additions remain stable; no regressions detected during finance updates. | Doc-only |
| TASK-0360 | P2 | open | Next Steps | Gates remain green after invoice typing/lint fixes: `pnpm typecheck`, `pnpm lint`, `pnpm run test:models`. | Doc-only |
| TASK-1089 | P2 | open | Next Steps | E2E setup drift: Playwright hangs without output suggest blocking setup/fixtures; review `scripts/run-playwright.sh` and smoke suite hooks for long waits, and apply the same checks across other E2E... | Doc-only |
| TASK-0359 | P2 | open | Next Steps | Logging consistency: Console usage persists in a few entry points; standardizing on `logger` keeps observability structured and PII-safe. | Doc-only |
| TASK-0358 | P2 | open | Next Steps | Mongoose hook typing: `as any` usage clusters in encryption hooks; a shared typed hook helper would remove all 13 occurrences and cut casting risks. | Doc-only |
| TASK-0357 | P2 | open | Next Steps | Alias correctness: Aqar chat alias fix highlights risk of broken re-exports; audit other alias routes to ensure handler + `runtime` are forwarded correctly. | Doc-only |
| TASK-0356 | P2 | open | Next Steps | Playwright smoke timeout | Doc-only |
| TASK-0355 | P2 | open | Next Steps | Release-gate environments missing | Doc-only |
| bug-002 | P2 | open | Bugs | BUG-002 GraphQL resolvers TODO (7) | lib/graphql/index.ts |
| eff-002 | P2 | open | Efficiency | EFF-002 console statements (12) | app/privacy/page.ts |
| logging-replace-remaining-console-usages-with-logger-for-observability-and-pii-s | P2 | open | Next Steps | Logging: replace remaining console usages with `logger` for observability and PII safety. | Doc-only |
| tests-backfill-the-11-service-unit-gaps-keep-lint-typecheck-test-gates-green-aft | P2 | open | Next Steps | Tests: backfill the 11 service/unit gaps; keep lint/typecheck/test gates green after changes. | Doc-only |
| e2e-stability-rerun-pnpm-playwright-test-tests-e2e-smoke-reporter-list-workers-1 | P2 | open | Next Steps | E2E stability: rerun `pnpm playwright test tests/e2e/smoke --reporter=list --workers=1 --timeout=120000` (or enable `DEBUG=pw:api`) to surface hang; review `scripts/run-playwright.sh` for blocking ... | Doc-only |
| bug-1707 | P2 | open | Bugs | app/api/aqar/favorites/route.ts:61-138 | app/api/aqar/favorites/route.ts:61-138 |
| bug-1706 | P2 | open | Bugs | app/api/aqar/packages/route.ts:102-124 | app/api/aqar/packages/route.ts:102-124 |
| bug-1705 | P2 | open | Bugs | app/api/aqar/listings/route.ts:99-138 | app/api/aqar/listings/route.ts:99-138 |
| bug-1704 | P2 | open | Bugs | app/api/souq/reviews/route.ts:61-108 | app/api/souq/reviews/route.ts:61-108 |
| bug-1703 | P2 | open | Bugs | lib/graphql/index.ts:936-1052 | lib/graphql/index.ts:936-1052 |
| bug-1701 | P2 | open | Bugs | lib/graphql/index.ts:769-801 | lib/graphql/index.ts:769-801 |
| progress-located-master-pending-report-and-refreshed-orgid-audit-notes-mapped-us | P2 | open | Next Steps | Progress: Located Master Pending Report and refreshed orgId audit notes; mapped user-id fallbacks and missing tenant/audit context across GraphQL queries/mutations and Souq/Aqar write routes. | Doc-only |
| bug-1710 | P2 | open | Bugs | app/api/upload/scan-status/route.ts:106-209 | app/api/upload/scan-status/route.ts:106-209 |
| bug-1708 | P2 | open | Bugs | app/api/upload/verify-metadata/route.ts:37-119 | app/api/upload/verify-metadata/route.ts:37-119 |
| next-steps-add-tenant-bound-s3-key-validation-shared-helper-for-upload-routes-na | P2 | open | Next Steps | Next steps: Add tenant-bound S3 key validation + shared helper for upload routes, namespace scan tokens per org, backfill regression tests, then run `pnpm typecheck && pnpm lint && pnpm test`. | Doc-only |
| progress-located-master-pending-report-reviewed-upload-scan-status-verify-metada | P2 | open | Next Steps | Progress: Located Master Pending Report; reviewed upload scan/status/verify-metadata flows and safe-session adoption for tenant isolation; no code changes yet (documentation-only). | Doc-only |
| TASK-0353 | P2 | open | Next Steps | typecheck ✅; lint ✅; test:models ✅; test:e2e ⏳ Timed out (scripts/run-playwright.sh) | Doc-only |
| next-steps-stage-and-commit-remaining-uncommitted-files-from-previous-sessions-u | P2 | open | Next Steps | Next steps: Stage and commit remaining uncommitted files from previous sessions; update PENDING_MASTER with route fix summary; consider adding negative-path tests for auth infra failure scenarios. | Doc-only |
| logic-126 | P2 | open | Logic Errors | Large route files | Doc-only |
| p2-add-negative-path-tests-for-auth-infra-failure-scenarios-next-steps-doc-only | P2 | open | Next Steps | P2: Add negative-path tests for auth infra failure scenarios | Doc-only |
| p2-split-large-route-files-auth-otp-send-1091-lines-payments-tap-webhook-815-lin | P2 | open | Next Steps | P2: Split large route files (auth/otp/send 1091 lines, payments/tap/webhook 815 lines) | Doc-only |
| TASK-0352 | P2 | open | Next Steps | ✅ Analyzed test coverage gaps: Souq 51/75 missing, Admin 26/28 missing, FM 19/25 missing | Doc-only |
| TASK-0349 | P2 | open | Next Steps | ✅ Applied auth-infra-aware helper to 29 occurrences across 25 routes | Doc-only |
| TASK-0348 | P2 | open | Next Steps | ✅ Created `lib/auth/safe-session.ts` with `getSessionOrError`/`getSessionOrNull` helpers | lib/auth/safe-session.ts |
| TASK-0347 | P2 | open | Next Steps | Test coverage gap analysis + route size audit | Doc-only |
| a29893220-refactor-p2-extract-helpers-from-large-routes-p1-module-tests-next-ste | P2 | open | Next Steps | `a29893220` - refactor(P2): extract helpers from large routes + P1 module tests | Doc-only |
| fm-expenses-test-ts-12-budgets-test-ts-18-next-steps-expenses-test-ts | P2 | open | Next Steps | FM: `expenses.test.ts` (12), `budgets.test.ts` (18) | expenses.test.ts |
| admin-benchmark-test-ts-10-users-route-test-ts-18-next-steps-benchmark-test-ts | P2 | open | Next Steps | Admin: `benchmark.test.ts` (10), `users.route.test.ts` (18) | benchmark.test.ts |
| souq-kyc-submit-test-ts-17-claims-route-test-ts-22-next-steps-kyc-submit-test-ts | P2 | open | Next Steps | Souq: `kyc-submit.test.ts` (17), `claims.route.test.ts` (22) | kyc-submit.test.ts |
| payments-tap-webhook-815-lines-extracted-to-lib-finance-tap-webhook-handlers-ts- | P2 | open | Next Steps | `payments/tap/webhook` (815 lines) → extracted to `lib/finance/tap-webhook/handlers.ts` + `persistence.ts` | lib/finance/tap-webhook/handlers.ts |
| auth-otp-send-1091-lines-extracted-to-lib-auth-otp-test-users-ts-lib-auth-otp-he | P2 | open | Next Steps | `auth/otp/send` (1091 lines) → extracted to `lib/auth/otp/test-users.ts` + `lib/auth/otp/helpers.ts` | lib/auth/otp/test-users.ts |
| TASK-0346 | P2 | open | Next Steps | ✅ **Route Refactoring (P2)**: Extracted helpers from 2 large route files | Doc-only |
| vendors-route-test-ts-18-fm-marketplace-vendors-next-steps-vendors-route-test-ts | P2 | open | Next Steps | `vendors.route.test.ts` (18) - FM marketplace vendors | vendors.route.test.ts |
| settings-route-test-ts-17-souq-repricer-settings-next-steps-settings-route-test- | P2 | open | Next Steps | `settings.route.test.ts` (17) - Souq repricer settings | settings.route.test.ts |
| campaigns-route-test-ts-17-souq-ads-campaigns-next-steps-campaigns-route-test-ts | P2 | open | Next Steps | `campaigns.route.test.ts` (17) - Souq ads campaigns | campaigns.route.test.ts |
| safe-session-test-ts-11-auth-infra-failure-scenarios-next-steps-safe-session-tes | P2 | open | Next Steps | `safe-session.test.ts` (11) - Auth infra failure scenarios | safe-session.test.ts |
| fm-work-orders-id-transition-route-ts-extracted-to-lib-fsm-transitions-ts-transi | P2 | open | Next Steps | `fm/work-orders/[id]/transition/route.ts` → extracted to `_lib/fsm-transitions.ts`, `transition-context.ts` | /transition/route.ts |
| souq-orders-route-ts-extracted-to-lib-order-lifecycle-ts-order-validation-ts-nex | P2 | open | Next Steps | `souq/orders/route.ts` → extracted to `_lib/order-lifecycle.ts`, `order-validation.ts` | souq/orders/route.ts |
| admin-notifications-send-route-ts-extracted-to-lib-channel-handlers-ts-recipient | P2 | open | Next Steps | `admin/notifications/send/route.ts` → extracted to `_lib/channel-handlers.ts`, `recipient-resolver.ts` | admin/notifications/send/route.ts |
| search-route-ts-extracted-to-lib-permissions-ts-scoping-ts-entity-builders-ts-ne | P2 | open | Next Steps | `search/route.ts` → extracted to `_lib/permissions.ts`, `scoping.ts`, `entity-builders.ts` | search/route.ts |
| returns-503-on-organization-lookup-db-failure-next-steps-doc-only | P2 | open | Next Steps | Returns 503 on organization lookup DB failure | Doc-only |
| returns-503-on-optional-module-import-failure-next-steps-doc-only | P2 | open | Next Steps | Returns 503 on optional module import failure | Doc-only |
| TASK-0345 | P2 | open | Next Steps | Add ESLint rule: `no-restricted-syntax` for physical direction classes | Doc-only |
| TASK-0344 | P2 | open | Next Steps | Replace all `mr-2` with `me-2` (margin-end) | Doc-only |
| TASK-0343 | P2 | open | Next Steps | Create shared `components/errors/ErrorPage.tsx` with RTL-safe classes | components/errors/ErrorPage.ts |
| TASK-0342 | P2 | open | Next Steps | `billing/charge-recurring/route.ts` (1) — error text, acceptable | billing/charge-recurring/route.ts |
| TASK-0341 | P2 | open | Next Steps | `admin/notifications/test/route.ts` (1) — needs logging | admin/notifications/test/route.ts |
| TASK-0340 | P2 | open | Next Steps | `auth/test/credentials-debug/route.ts` (1) — test route, acceptable | auth/test/credentials-debug/route.ts |
| TASK-0339 | P2 | open | Next Steps | `work-orders/presign/route.ts` (1) — needs fix | work-orders/presign/route.ts |
| TASK-0338 | P2 | open | Next Steps | `channel-handlers.ts` (5 occurrences) — fire-and-forget, acceptable with logging | channel-handlers.ts |
| TASK-0337 | P2 | open | Next Steps | Add ESLint rule to prevent fallback patterns | Doc-only |
| TASK-0336 | P2 | open | Next Steps | Replace all `orgId \|\| "value"` with `requireOrgId(session)` | Doc-only |
| TASK-0335 | P2 | open | Next Steps | Create `lib/auth/tenant-utils.ts`: | lib/auth/tenant-utils.ts |
| TASK-0334 | P2 | open | Next Steps | `jobs/onboarding-expiry-worker.ts:131` | jobs/onboarding-expiry-worker.ts:131 |
| TASK-0333 | P2 | open | Next Steps | `jobs/onboarding-queue.ts:59` | jobs/onboarding-queue.ts:59 |
| TASK-0332 | P2 | open | Next Steps | `scripts/seed-production-data.ts:39` | scripts/seed-production-data.ts:39 |
| TASK-0331 | P2 | open | Next Steps | `lib/middleware/orgId-validation.ts:25` | lib/middleware/orgId-validation.ts:25 |
| TASK-0330 | P2 | open | Next Steps | `lib/feature-flags.ts:405` | lib/feature-flags.ts:405 |
| TASK-0329 | P2 | open | Next Steps | `lib/fm-auth-middleware.ts:74,313,365` | lib/fm-auth-middleware.ts:74 |
| TASK-0327 | P2 | open | Next Steps | `lib/marketplace/context.ts:174` | lib/marketplace/context.ts:174 |
| TASK-0326 | P2 | open | Next Steps | `lib/config/tenant.server.ts:113` | lib/config/tenant.server.ts:113 |
| TASK-0325 | P2 | open | Next Steps | `lib/config/tenant.ts:95` | lib/config/tenant.ts:95 |
| TASK-0324 | P2 | open | Next Steps | `lib/audit/middleware.ts:203,205` | lib/audit/middleware.ts:203 |
| TASK-0323 | P2 | open | Next Steps | `lib/apiGuard.ts:33` | lib/apiGuard.ts:33 |
| TASK-0321 | P2 | open | Next Steps | `lib/jobs/sms-sla-monitor.ts:64` | lib/jobs/sms-sla-monitor.ts:64 |
| TASK-0320 | P2 | open | Next Steps | `services/souq/settlements/settlement-calculator.ts:262` | services/souq/settlements/settlement-calculator.ts:262 |
| TASK-0319 | P2 | open | Next Steps | `services/souq/rules-config.ts:44` | services/souq/rules-config.ts:44 |
| TASK-0318 | P2 | open | Next Steps | ⏳ Needs audit | Doc-only |
| TASK-0317 | P2 | open | Next Steps | ⏳ Needs build analysis | Doc-only |
| TASK-0316 | P2 | open | Next Steps | ⏳ Needs review | Doc-only |
| TASK-0315 | P2 | open | Next Steps | ⏳ Needs DB review | Doc-only |
| TASK-0314 | P2 | open | Next Steps | Add ESLint rule: no-physical-direction-classes | Doc-only |
| TASK-0313 | P2 | open | Next Steps | Create shared ErrorBoundary component with RTL-safe classes | Doc-only |
| TASK-0312 | P2 | open | Next Steps | Various components with left/right positioning | Doc-only |
| TASK-0311 | P2 | open | Next Steps | app/*/error.tsx (20 files) - same template with mr-2 | /error.ts |
| TASK-0310 | P2 | open | Next Steps | Data operations: 🔴 Replace with proper error handling | Doc-only |
| TASK-0309 | P2 | open | Next Steps | Fire-and-forget (notifications): ✅ Acceptable, add logging | Doc-only |
| TASK-0308 | P2 | open | Next Steps | billing/charge-recurring/route.ts:103 - error text extraction | billing/charge-recurring/route.ts:103 |
| TASK-0307 | P2 | open | Next Steps | work-orders/presign/route.ts:85 - optional presign validation | work-orders/presign/route.ts:85 |
| TASK-0306 | P2 | open | Next Steps | channel-handlers.ts:120,164,199,248,278 (5x) - fire-and-forget notifications | channel-handlers.ts:120 |
| TASK-0305 | P2 | open | Next Steps | validateOrgId(value): boolean - validates format | Doc-only |
| TASK-0304 | P2 | open | Next Steps | requireOrgId(session): string - throws if missing | Doc-only |
| TASK-0303 | P2 | open | Next Steps | ✅ **Deep-dive analysis** on similar patterns across codebase | Doc-only |
| TASK-0302 | P2 | open | Next Steps | ✅ **Identified 19 remaining issues** requiring attention (5 🔴, 8 🟠, 6 🟡) | Doc-only |
| TASK-0301 | P2 | open | Next Steps | ✅ **Scanned entire codebase** for 23 priority action categories | Doc-only |
| TASK-1088 | P2 | open | Next Steps | Marketplace stubs: ensure any future Playwright-facing components (search listings, pricing/fulfillment previews) surface link targets and CTA buttons to satisfy smoke selectors without hitting rea... | Doc-only |
| TASK-1087 | P2 | open | Next Steps | Playwright-only branches still sparse across dashboard modules; system page needed Arabic H1, finance/HR already covered — audit remaining `/dashboard/**` pages for PLAYWRIGHT_TESTS hooks to preven... | Doc-only |
| missing-tests-add-regression-smoke-to-assert-playwright-header-has-dashboard-lin | P2 | open | Next Steps | Missing tests: add regression smoke to assert Playwright header has Dashboard link and SupportOrg fallback yields no boundary errors; unit test for Playwright PDP stub to ensure button renders with... | Doc-only |
| next-re-run-smoke-after-server-cooldown-address-copilot-strict-layout-tenant-iso | P2 | open | Next Steps | Next: Re-run smoke after server cooldown; address Copilot STRICT layout/tenant isolation failures; keep PLAYWRIGHT flags set in pipeline; ensure marketplace cart flow stays green after stubs. | Doc-only |
| TASK-1086 | P2 | open | Next Steps | **Early approval state** (`services/souq/seller-kyc-service.ts:262-282`): status flips to approved after company_info; this mirrors earlier audit findings on premature approvals and can propagate t... | services/souq/seller-kyc-service.ts:262-282 |
| TASK-0300 | P2 | open | Next Steps | `services/souq/seller-kyc-service.ts:204-221` — Reuse a single seller lookup with projection and `lean()` before branching by step to avoid redundant fetches. | services/souq/seller-kyc-service.ts:204-221 |
| add-unit-level-tenant-scoping-org-id-unit-id-across-fm-helpers-and-budgets-queri | P2 | open | Next Steps | Add unit-level tenant scoping (org_id + unit_id) across FM helpers and budgets queries; backfill data to persist `unitId`. | Doc-only |
| TASK-1084 | P2 | open | Next Steps | Marketplace stubs: homepage Playwright branch now links to PDP stub, but search/listings routes still rely on live data; consider adding flag-gated stub data to app/marketplace/search and listings ... | Doc-only |
| TASK-1083 | P2 | open | Next Steps | Playwright UI branches: finance/HR/system now have Arabic headings under flag, but other dashboard pages remain unguarded; RTL smoke may fail if headings stay English. Extend the Playwright conditi... | app/dashboard/system/page.ts |
| TASK-1082 | P2 | open | Next Steps | Guard stub pattern: useSupportOrg now Playwright-safe (contexts/SupportOrgContext.tsx:36-214), but other guards (useOrgGuard/useFmOrgGuard) lack env-aware stubs; similar boundary errors could surfa... | contexts/SupportOrgContext.ts |
| TASK-0299 | P2 | open | Next Steps | Add targeted Playwright spec or unit tests for copilot tenant isolation and overlay layout to catch STRICT regressions early. | Doc-only |
| TASK-0298 | P2 | open | Next Steps | Add smoke assertions for Playwright header Dashboard link and PDP stub link href; add unit/regression tests ensuring SupportOrg Playwright stub returns safe defaults. | Doc-only |
| TASK-0297 | P2 | open | Next Steps | System dashboard English H1 remains visible in non-Playwright mode only; ensure tests that expect Arabic run solely under flag to avoid dual-heading confusion. | Doc-only |
| TASK-0296 | P2 | open | Next Steps | Org-context guards other than SupportOrg may still throw outside providers in Playwright renders; pattern match against hooks/useOrgGuard to add similar env-aware stub or wrapper. | Doc-only |
| TASK-0295 | P2 | open | Next Steps | Smoke suite timing out: Playwright server left running until manual kill; need stable run with sufficient timeout and lighter scope. | Doc-only |
| TASK-0293 | P2 | open | Next Steps | Keep PDP in Playwright mode fully static to prevent upstream timeouts; add memoized stub data to reduce re-renders (app/marketplace/product/[slug]/page.tsx:92-138). | /page.ts |
| next-re-run-pnpm-test-e2e-project-smoke-reporter-line-after-cooldown-triage-test | P2 | open | Next Steps | Next: Re-run `pnpm test:e2e -- --project smoke --reporter=line` after cooldown; triage `tests/copilot/copilot.spec.ts` failures; consider extending Playwright-safe guard to other org guard hooks; a... | tests/copilot/copilot.spec.ts |
| ongoing-playwright-smoke-rerun-required-previous-runs-timed-out-copilot-strict-s | P2 | open | Next Steps | Ongoing: Playwright smoke rerun required (previous runs timed out); copilot STRICT specs still failing in full test run (layout preservation, tenant isolation, intent routing). | Doc-only |
| TASK-0291 | P2 | open | Next Steps | None new in this pass (company_info keeps KYC status in_review; vendor scoping enforced). | Doc-only |
| TASK-0290 | P2 | open | Next Steps | `services/souq/seller-kyc-service.ts:224-233` — Use `lean()` + projection for seller lookup before step routing to reduce repeated document hydration. | services/souq/seller-kyc-service.ts:224-233 |
| TASK-1079 | P2 | open | Next Steps | `app/api/fm/finance/budgets/route.ts:215-225` — Add projection and compound index `{ orgId: 1, unitId: 1, department: 1, updatedAt: -1 }` on `fm_budgets` to keep search/pagination off collection sc... | app/api/fm/finance/budgets/route.ts:215-225 |
| add-compound-index-orgid-1-unitid-1-department-1-updatedat-1-to-budgets-collecti | P2 | open | Next Steps | Add compound index `{ orgId: 1, unitId: 1, department: 1, updatedAt: -1 }` to budgets collection to avoid scans. | Doc-only |
| add-deterministic-tests-for-fm-budgets-unit-scoping-including-multi-unit-selecti | P2 | open | Next Steps | Add deterministic tests for FM budgets unit scoping (including multi-unit selection) and Souq KYC vendor guard. | Doc-only |
| confirmed-fm-budgets-get-post-enforce-orgid-unitid-via-resolveunitscope-and-buil | P2 | open | Next Steps | Confirmed FM budgets GET/POST enforce orgId + unitId via `resolveUnitScope` and `buildTenantFilter` (unit-aware). | Doc-only |
| TASK-0289 | P2 | open | Next Steps | Documented legitimate orgId fallback patterns (3 files) | Doc-only |
| TASK-1078 | P2 | open | Next Steps | **Parallel agent contention**: Recent overlapping edits highlight risk of clobbering changes without coordination. The new Section 14 mitigates by requiring git-status checks, surgical diffs, and a... | Doc-only |
| TASK-0287 | P2 | open | Next Steps | None new identified in this pass. On next code edits, rerun/extend FM budgets and Souq KYC unit coverage as previously planned. | Doc-only |
| TASK-0286 | P2 | open | Next Steps | None new identified in this pass (doc-only). Maintain earlier KYC approval-flow corrections already logged. | Doc-only |
| TASK-0285 | P2 | open | Next Steps | None new identified in this pass (doc-only). Keep prior FM budgets and Souq KYC findings active. | Doc-only |
| TASK-0284 | P2 | open | Next Steps | None new identified in this pass (doc-only). Keep prior performance items active. | Doc-only |
| run-targeted-suites-vitest-for-fm-budgets-and-souq-kyc-on-next-code-change-touch | P2 | open | Next Steps | Run targeted suites (`vitest` for FM budgets and Souq KYC) on next code change touching those areas. | Doc-only |
| if-any-ambiguity-arises-during-concurrent-edits-record-assumptions-and-coordinat | P2 | open | Next Steps | If any ambiguity arises during concurrent edits, record assumptions and coordination notes directly in this report before proceeding. | Doc-only |
| socialize-the-updated-instructions-with-all-agents-ensure-new-guidance-is-honore | P2 | open | Next Steps | Socialize the updated instructions with all agents; ensure new guidance is honored in upcoming changes. | Doc-only |
| TASK-1077 | P2 | open | Next Steps | **Workflow premature approvals**: KYC company_info auto-approved sellers; same regression pattern seen in prior approval flows (e.g., auto-approve after partial data). Guard approvals to verificati... | Doc-only |
| TASK-1076 | P2 | open | Next Steps | **Tenant dimension omissions**: FM budgets continues to inherit org-only `buildTenantFilter`, mirroring earlier cross-unit leaks in FM utilities. Without unitId filters, unit-level isolation is not... | Doc-only |
| TASK-0283 | P2 | open | Next Steps | Add FM budgets tests for unitId persistence on insert and rejection when unitId not in actor units (negative path). | Doc-only |
| TASK-0282 | P2 | open | Next Steps | Add KYC integration tests for document/bank verification sequences and vendor ownership assertions. | Doc-only |
| TASK-0280 | P2 | open | Next Steps | KYC company_info step previously set status to approved; corrected to pending/documents. Ensure approval only happens in verifyDocument/approveKYC paths. | Doc-only |
| TASK-0279 | P2 | open | Next Steps | FM budgets filtering still org-only in helper; unitId not enforced for GET/POST queries (app/api/fm/utils/tenant.ts, app/api/fm/finance/budgets/route.ts) — cross-unit leakage risk. | app/api/fm/utils/tenant.ts |
| TASK-0278 | P2 | open | Next Steps | FM budgets listing: add projection and compound index `{ orgId, unitId, department, updatedAt: -1 }` to avoid scans under search (app/api/fm/finance/budgets/route.ts). | app/api/fm/finance/budgets/route.ts |
| TASK-0277 | P2 | open | Next Steps | Souq KYC submit/status: reuse a single seller fetch with projection/`lean()` before branching steps to cut duplicate queries (services/souq/seller-kyc-service.ts). | services/souq/seller-kyc-service.ts |
| backfill-fm-budgets-route-with-unitid-scoping-once-shared-tenant-helper-supports | P2 | open | Next Steps | Backfill FM budgets route with unitId scoping once shared tenant helper supports unit arrays; add compound index `{ orgId, unitId, department, updatedAt }`. | Doc-only |
| extend-integration-tests-to-cover-kyc-document-bank-verification-paths-and-super | P2 | open | Next Steps | Extend integration tests to cover KYC document/bank verification paths and super-admin header override behavior. | Doc-only |
| audit-souq-kyc-service-for-vendor-ownership-scoping-across-all-steps-and-align-r | P2 | open | Next Steps | Audit Souq KYC service for vendor ownership scoping across all steps and align route to pass vendorId explicitly if required. | Doc-only |
| run-pnpm-typecheck-pnpm-lint-to-complete-gates-next-steps-doc-only | P2 | open | Next Steps | Run `pnpm typecheck && pnpm lint` to complete gates. | Doc-only |
| re-ran-budgets-unit-tests-suite-green-with-existing-tenant-unit-aware-mocks-next | P2 | open | Next Steps | Re-ran budgets unit tests; suite green with existing tenant/unit-aware mocks. | Doc-only |
| tightened-kyc-unit-tests-deterministic-200-expectations-non-seller-negative-case | P2 | open | Next Steps | Tightened KYC unit tests: deterministic 200 expectations, non-seller negative case, service call assertions now match vendorId injection. | Doc-only |
| TASK-0276 | P2 | open | Next Steps | Not run this session | Doc-only |
| TASK-0275 | P2 | open | Next Steps | **Enum/nullable misuse**: aqar listings and souq ads campaigns assign `{}`/unknown to enums, mirroring earlier finance/souq cases where loose casting caused typecheck breaks and runtime risk. | Doc-only |
| TASK-0274 | P2 | open | Next Steps | **Validation typing gaps**: marketplace routes construct Zod errors from plain arrays; similar pattern across cart/rfq/vendor products/souq ads campaigns leads to TS errors and weak validation. | Doc-only |
| TASK-1074 | P2 | open | Next Steps | **Auth/import drift in issue-tracker**: multiple routes import non-existent `@/models/issue`/`@/lib/db`/`@/lib/auth` causing consistent TS failures; indicates a stale copy of Next auth/db wiring in... | Doc-only |
| TASK-0273 | P2 | open | Next Steps | FM budgets: tests for unitId persistence on insert and rejection when unit not assigned; coverage for new compound index behavior (query projections). | Doc-only |
| TASK-0272 | P2 | open | Next Steps | Souq KYC: integration tests for document/bank verification flows and super-admin override/vendor ownership assertion. | Doc-only |
| TASK-0271 | P2 | open | Next Steps | issue-tracker scripts: implicit any parameters and missing commander import break CLI typing and may fail at runtime. | Doc-only |
| TASK-0270 | P2 | open | Next Steps | souq ads campaigns: unknown values assigned to enums (type errors), potential runtime validation gaps. | Doc-only |
| TASK-0269 | P2 | open | Next Steps | marketplace cart/rfq/vendor products: constructing ZodError from arrays; incorrect types passed to validation helpers. | Doc-only |
| TASK-0268 | P2 | open | Next Steps | issue-tracker routes: missing modules (`@/models/issue`, `@/lib/db`, `@/lib/auth`) and outdated `getServerSession` import; causes typecheck failures and potential runtime crashes. | Doc-only |
| TASK-0267 | P2 | open | Next Steps | aqar listings `[id]`: furnishing/listing status casts accept `{}`/null, causing TS errors and potential runtime mismatches. | Doc-only |
| TASK-0266 | P2 | open | Next Steps | FM budgets: add compound index `{ orgId, unitId, department, updatedAt: -1 }` to prevent scans on filtered listings. | Doc-only |
| TASK-0265 | P2 | open | Next Steps | Marketplace ads/campaigns: reuse parsed payloads and avoid multiple Date casts; normalize Zod error handling to reduce duplicate parsing. | Doc-only |
| follow-ups-add-kyc-integration-tests-for-document-bank-verification-and-super-ad | P2 | open | Next Steps | Follow-ups: add KYC integration tests for document/bank verification and super-admin override; add FM budgets compound index `{ orgId, unitId, department, updatedAt: -1 }` and unitId persistence/re... | Doc-only |
| typecheck-pass-2-aqar-marketplace-fix-enum-nullable-handling-in-aqar-listing-rou | P2 | open | Next Steps | Typecheck Pass 2 (aqar/marketplace): fix enum/nullable handling in aqar listing route; correct Zod error handling/unknown casting in marketplace cart/rfq/vendor products and souq ads campaigns; re-... | Doc-only |
| typecheck-pass-1-issue-tracker-issues-api-fix-imports-types-null-guards-getserve | P2 | open | Next Steps | Typecheck Pass 1 (issue-tracker & issues API): fix imports/types, null guards, getServerSession wiring, virtual typings, missing deps; re-run `pnpm typecheck`. | Doc-only |
| typecheck-lint-triage-identified-failing-files-aqar-listings-issues-api-marketpl | P2 | open | Next Steps | Typecheck/lint triage: identified failing files (aqar listings, issues API, marketplace ads/cart/rfq/vendor products, issue-tracker app/models/scripts). | Doc-only |
| fm-budgets-route-unitid-scoping-enforced-via-resolveunitscope-and-buildtenantfil | P2 | open | Next Steps | FM budgets route: unitId scoping enforced via `resolveUnitScope` and `buildTenantFilter` unit support; tests passing. | Doc-only |
| TASK-0264 | P2 | open | Next Steps | `pnpm typecheck` ❌ (50+ TS errors); `pnpm lint` ❌ (135 errors) | Doc-only |
| TASK-0262 | P2 | open | Next Steps | PM: plans | Doc-only |
| TASK-0261 | P2 | open | Next Steps | FM: inspections/vendor-assignments | Doc-only |
| TASK-0260 | P2 | open | Next Steps | Marketplace: cart, rfq, vendor/products | Doc-only |
| TASK-0259 | P2 | open | Next Steps | Aqar: leads, listings/[id], insights/pricing | Doc-only |
| TASK-0258 | P2 | open | Next Steps | Admin: footer, sms, testing-users, export | Doc-only |
| TASK-0257 | P2 | open | Next Steps | Souq: ads/*, deals, fulfillment/*, inventory/*, repricer/*, settlements/* | Doc-only |
| normalize-fm-expenses-tests-to-require-deterministic-200-201-responses-and-asser | P2 | open | Next Steps | Normalize FM expenses tests to require deterministic 200/201 responses and assert response bodies; enforce orgId/unitId expectations on inserts. | Doc-only |
| TASK-0255 | P2 | open | Next Steps | Flagged parallel lenient status assertions in FM expenses tests to close false-negative gaps. | Doc-only |
| TASK-0254 | P2 | open | Next Steps | Hardened Souq KYC submit unit tests to fail on 500 responses and always assert `nextStep` guidance. | Doc-only |
| TASK-0252 | P2 | open | Next Steps | **KYC Workflow:** Fix premature approval pattern in seller-kyc-service | Doc-only |
| TASK-0251 | P2 | open | Next Steps | **FM Unit Scoping:** Extend `buildTenantFilter` to include `unitId` | Doc-only |
| TASK-0250 | P2 | open | Next Steps | **Sprint 1 Continuation:** Apply `parseBodySafe` to remaining 44 routes (batch by module) | Doc-only |
| TASK-0249 | P2 | open | Next Steps | **Webhooks (1):** carrier/tracking | Doc-only |
| TASK-0248 | P2 | open | Next Steps | **User (1):** preferences (has try/catch but not parseBodySafe) | Doc-only |
| TASK-0247 | P2 | open | Next Steps | **PM (2):** plans, plans/[id] | Doc-only |
| TASK-0246 | P2 | open | Next Steps | **FM (1):** inspections/vendor-assignments | Doc-only |
| TASK-0245 | P2 | open | Next Steps | **Marketplace (3):** cart, rfq, vendor/products | Doc-only |
| TASK-0244 | P2 | open | Next Steps | **Aqar (4):** insights/pricing, leads, listings/[id], support/chatbot | Doc-only |
| TASK-0243 | P2 | open | Next Steps | **Admin (8):** footer, sms, sms/settings, testing-users, testing-users/[id] (2 handlers), route-aliases/workflow, users/[id], export, notifications/test | Doc-only |
| TASK-1117 | P2 | open | Next Steps | **Souq (22):** ads/campaigns, ads/campaigns/[id], ads/impressions, ads/clicks, settlements, settlements/request-payout, catalog/products, fulfillment/rates, fulfillment/assign-fast-badge, fulfillme... | Doc-only |
| TASK-0241 | P2 | open | Next Steps | **Lenient status tolerances** — Expenses tests (lines above) mirror KYC leniency; both allow 400/500 to pass, masking regressions. | Doc-only |
| TASK-0240 | P2 | open | Next Steps | `services/souq/seller-kyc-service.ts:533-557` — approval should wait for documents + bank verification. | services/souq/seller-kyc-service.ts:533-557 |
| TASK-0238 | P2 | open | Next Steps | `app/api/fm/finance/budgets/route.ts:200-207` — create payload omits `unitId`. | app/api/fm/finance/budgets/route.ts:200-207 |
| TASK-0237 | P2 | open | Next Steps | `app/api/fm/finance/budgets/route.ts:119-129` — org-only `buildTenantFilter`; missing `unitId`. | app/api/fm/finance/budgets/route.ts:119-129 |
| TASK-0236 | P2 | open | Next Steps | `app/api/fm/finance/budgets/route.ts:135-143` — Add projection and compound index `{ orgId: 1, unitId: 1, department: 1, updatedAt: -1 }` for paginated search. | app/api/fm/finance/budgets/route.ts:135-143 |
| extend-fm-tenant-helpers-to-emit-unitid-and-backfill-index-orgid-unitid-departme | P2 | open | Next Steps | Extend FM tenant helpers to emit unitId and backfill index `{ orgId, unitId, department, updatedAt }`. | Doc-only |
| normalize-fm-expenses-tests-to-strict-success-expectations-and-assert-orgid-unit | P2 | open | Next Steps | Normalize FM expenses tests to strict success expectations and assert orgId/unitId on inserts. | Doc-only |
| flagged-fm-expenses-happy-path-assertions-tolerating-400-500-status-and-conditio | P2 | open | Next Steps | Flagged FM expenses happy-path assertions tolerating 400/500 status and conditional bodies (tests/unit/api/fm/finance/expenses.test.ts:195-201,305-351). | tests/unit/api/fm/finance/expenses.test.ts:195-201 |
| TASK-1073 | P2 | open | Next Steps | **Bank verification gating** — Auto-approval now requires bankDetailsComplete; route still permits progression without verifying bank details explicitly. Align route validation with service expecta... | Doc-only |
| TASK-1072 | P2 | open | Next Steps | **Vendor scoping gap** — Route sets `vendorId: session.user.id` but does not enforce vendor membership; service vendor filter depends on provided vendorId. Aligning route+service is needed to preve... | Doc-only |
| TASK-1071 | P2 | open | Next Steps | **Lenient status tolerances** — FM expenses tests previously allowed `[200,500]` and conditional assertions; pattern matched prior KYC leniency. Both suites now enforce strict 200/201 and body chec... | Doc-only |
| TASK-0234 | P2 | open | Next Steps | `app/api/souq/seller-central/kyc/submit/route.ts:53-79` — parseBodySafe errors return “Invalid JSON payload”, not field-specific; tests adjusted—consider keeping user-friendly messages. | app/api/souq/seller-central/kyc/submit/route.ts:53-79 |
| TASK-0233 | P2 | open | Next Steps | `app/api/fm/utils/tenant.ts:48-67` — buildTenantFilter supports unitIds, but callers (expenses, other FM routes) need consistent unitId plumbing. | app/api/fm/utils/tenant.ts:48-67 |
| TASK-0232 | P2 | open | Next Steps | `app/api/fm/finance/budgets/route.ts:191-225,292-306` — Unit scoping present but index missing; risk of slow queries; ensure unitId required on POST responses. | app/api/fm/finance/budgets/route.ts:191-225 |
| TASK-0231 | P2 | open | Next Steps | `services/souq/seller-kyc-service.ts:193-237` — Vendor filter present but route does not supply vendorId; risk of cross-seller tampering. | services/souq/seller-kyc-service.ts:193-237 |
| TASK-0230 | P2 | open | Next Steps | `app/api/souq/seller-central/kyc/submit/route.ts:17-100` — Route still sets vendorId to user.id; needs explicit vendor guard + vendorId propagation from session. | app/api/souq/seller-central/kyc/submit/route.ts:17-100 |
| TASK-0229 | P2 | open | Next Steps | `services/souq/seller-kyc-service.ts:194-225` — Use `lean()` + projection to avoid duplicate seller reads per step. | services/souq/seller-kyc-service.ts:194-225 |
| TASK-0228 | P2 | open | Next Steps | `app/api/fm/finance/budgets/route.ts:199-225` — Add projection + compound index `{ orgId: 1, unitId: 1, department: 1, updatedAt: -1 }` to reduce scan cost on paginated search. | app/api/fm/finance/budgets/route.ts:199-225 |
| rerun-wider-vitest-set-budgets-fm-suites-and-update-pending-master-with-outcomes | P2 | open | Next Steps | Rerun wider vitest set (budgets + FM suites) and update PENDING_MASTER with outcomes. | Doc-only |
| extend-fm-tenant-helpers-and-expenses-budgets-apis-to-enforce-unitid-consistentl | P2 | open | Next Steps | Extend FM tenant helpers and expenses/budgets APIs to enforce unitId consistently; add compound index `{ orgId, unitId, department, updatedAt }`. | Doc-only |
| TASK-0227 | P2 | open | Next Steps | Copilot instructions updated with “Execution Discipline” and “Multi-Agent Coordination” sections to avoid deferral/drift. | Doc-only |
| TASK-0226 | P2 | open | Next Steps | Tightened FM expenses tests to require 200/201 responses and assert success payload + orgId insertion (tests/unit/api/fm/finance/expenses.test.ts). | tests/unit/api/fm/finance/expenses.test.ts |
| TASK-0224 | P2 | open | Next Steps | Gated KYC auto-approval on bank detail completion (services/souq/seller-kyc-service.ts:606-612). | services/souq/seller-kyc-service.ts:606-612 |
| TASK-0223 | P2 | open | Next Steps | [tests/api/souq/deals.route.test.ts](tests/api/souq/deals.route.test.ts) | tests/api/souq/deals.route.test.ts |
| TASK-0222 | P2 | open | Next Steps | [tests/api/souq/brands.route.test.ts](tests/api/souq/brands.route.test.ts) | tests/api/souq/brands.route.test.ts |
| TASK-0221 | P2 | open | Next Steps | [tests/api/souq/sellers.route.test.ts](tests/api/souq/sellers.route.test.ts) | tests/api/souq/sellers.route.test.ts |
| TASK-0220 | P2 | open | Next Steps | [tests/api/souq/inventory.route.test.ts](tests/api/souq/inventory.route.test.ts) | tests/api/souq/inventory.route.test.ts |
| TASK-0219 | P2 | open | Next Steps | [tests/api/souq/categories.route.test.ts](tests/api/souq/categories.route.test.ts) | tests/api/souq/categories.route.test.ts |
| TASK-0217 | P2 | open | Next Steps | One instance in payments needs NEXT_PUBLIC_BASE_URL to be required | Doc-only |
| TASK-0216 | P2 | open | Next Steps | Most are intentional defaults for development | Doc-only |
| TASK-0215 | P2 | open | Next Steps | `app/api/payments/tap/checkout/route.ts` - NEEDS FIX | app/api/payments/tap/checkout/route.ts |
| TASK-0213 | P2 | open | Next Steps | `lib/config/domains.ts` - INTENTIONAL CORS whitelist | lib/config/domains.ts |
| TASK-0212 | P2 | open | Next Steps | `lib/config/constants.ts` (5 occurrences) - INTENTIONAL for dev | lib/config/constants.ts |
| TASK-0211 | P2 | open | Next Steps | No user input directly in innerHTML | Doc-only |
| TASK-0210 | P2 | open | Next Steps | Server-rendered static content | Doc-only |
| TASK-0209 | P2 | open | Next Steps | MDX/Markdown content with rehype-sanitize | Doc-only |
| TASK-0208 | P2 | open | Next Steps | [x] Tests: 99.8% passing (6 test-route sync issues) | Doc-only |
| TASK-0207 | P2 | open | Next Steps | [x] Tenancy filters enforced | Doc-only |
| TASK-0206 | P2 | open | Next Steps | [x] Tests: 100% passing (3285/3285) | Doc-only |
| TASK-1070 | P2 | open | Next Steps | QA endpoints (`app/api/qa/health`, `app/api/qa/reconnect`, `app/api/qa/alert`) enforce SUPER_ADMIN; any future health/alert clients must check session/role first to prevent the same 401/403 spam pa... | Doc-only |
| TASK-1069 | P2 | open | Next Steps | ClientLayout injects AutoFixInitializer for both marketing and protected shells (components/ClientLayout.tsx). With the new guard, marketing/guest views no longer trigger QA endpoints; this pattern... | components/ClientLayout.ts |
| missing-tests-add-client-side-test-covering-autofixinitializer-behavior-for-gues | P2 | open | Next Steps | Missing tests: add client-side test covering AutoFixInitializer behavior for guest vs SUPER_ADMIN; add integration test ensuring no network calls fire when not authenticated. | Doc-only |
| TASK-0205 | P2 | open | Next Steps | Logic errors: avoid retrying QA reconnect while unauthenticated; add early return guard in AutoFix checks for missing session to prevent false degraded statuses. | Doc-only |
| TASK-0204 | P2 | open | Next Steps | Bugs: block SystemVerifier actions when unauthenticated/non-super-admin (now gated, but add UI disable states + toast); ensure AutoFix alert POST honors auth headers/cookies before sending. | Doc-only |
| TASK-0203 | P2 | open | Next Steps | Efficiency: add backoff/debounce to AutoFix health checks when consecutive failures occur to reduce network noise; centralize interval management to a single mount point. | Doc-only |
| run-lint-targeted-vitest-for-qa-routes-after-ui-confirmation-to-ensure-no-regres | P2 | open | Next Steps | Run lint + targeted vitest for QA routes after UI confirmation to ensure no regressions. | Doc-only |
| capture-otp-send-failure-evidence-response-json-server-logs-and-triage-root-caus | P2 | open | Next Steps | Capture OTP send failure evidence (response JSON + server logs) and triage root cause; add regression test once repro is known. | Doc-only |
| verify-in-browser-logged-out-logged-in-non-super-admin-that-no-auto-monitor-netw | P2 | open | Next Steps | Verify in-browser (logged out + logged in non-super-admin) that no auto-monitor network chatter occurs; confirm only SUPER_ADMIN can start monitoring/SystemVerifier actions. | Doc-only |
| TASK-0202 | P2 | open | Next Steps | Ongoing: OTP send endpoint returning 500 needs reproduction details; awaiting response payload/logs to isolate root cause. | Doc-only |
| TASK-0201 | P2 | open | Next Steps | Stopped default constructor auto-start; monitoring now opt-in and client-only. | Doc-only |
| TASK-1068 | P2 | open | Next Steps | Implemented super-admin gating for AutoFix auto-monitoring to stop unauthenticated 401/403 storms to `/api/help/articles`, `/api/notifications`, `/api/qa/*` (lib/AutoFixManager.ts; components/AutoF... | lib/AutoFixManager.ts |
| TASK-0200 | P2 | open | Next Steps | Located Master Pending Report (this file) and avoided duplicates. | Doc-only |
| TASK-0198 | P2 | open | Next Steps | [x] Tenancy filters: N/A (client-side fix) | Doc-only |
| TASK-0197 | P2 | open | Next Steps | [x] No runtime/hydration issues | Doc-only |
| TASK-0194 | P2 | open | Next Steps | `NEXTAUTH_BYPASS_OTP` is enabled but `NEXTAUTH_BYPASS_OTP_CODE` is not set | Doc-only |
| TASK-0193 | P2 | open | Next Steps | `POST /api/auth/otp/send` → 500 (Config issue) | Doc-only |
| TASK-0192 | P2 | open | Next Steps | `POST /api/qa/alert` → 403 (Forbidden) | Doc-only |
| TASK-0191 | P2 | open | Next Steps | `POST /api/qa/reconnect` → 401 (Unauthorized) | Doc-only |
| TASK-0190 | P2 | open | Next Steps | `GET /api/qa/health` → 401 (Unauthorized) | Doc-only |
| TASK-0189 | P2 | open | Next Steps | `GET /api/notifications` → 401 (Unauthorized) | Doc-only |
| TASK-0188 | P2 | open | Next Steps | `GET /api/help/articles` → 401 (Unauthorized) | Doc-only |
| TASK-0187 | P2 | open | Next Steps | [x] Tenancy filters: All enforced | Doc-only |
| TASK-0186 | P2 | open | Next Steps | [x] No console/runtime issues | Doc-only |
| TASK-0185 | P2 | open | Next Steps | [x] Tests: 100% passing (3286/3286) | Doc-only |
| TASK-0184 | P2 | open | Next Steps | Optional features: `catch { /* silently continue */ }` - feature flags | Doc-only |
| TASK-0183 | P2 | open | Next Steps | JSON parse: `catch { return {} }` - graceful degradation | Doc-only |
| TASK-0182 | P2 | open | Next Steps | ObjectId validation: `try { new ObjectId(id) } catch { return id }` - intentional | Doc-only |
| TASK-0181 | P2 | open | Next Steps | ✅ Save button with API PATCH | Doc-only |
| TASK-0180 | P2 | open | Next Steps | ✅ Delete confirmation dialog | Doc-only |
| TASK-0179 | P2 | open | Next Steps | ✅ Comments tab | Doc-only |
| TASK-0178 | P2 | open | Next Steps | ✅ Activity tab with audit history | Doc-only |
| TASK-0177 | P2 | open | Next Steps | ✅ Labels and risk tags display | Doc-only |
| TASK-0176 | P2 | open | Next Steps | ✅ Metadata (module, mention count, first/last seen, legacy ID) | Doc-only |
| TASK-0175 | P2 | open | Next Steps | ✅ Location display (file path, line numbers) | Doc-only |
| TASK-0174 | P2 | open | Next Steps | ✅ Properties panel (status, priority, effort, category) | Doc-only |
| TASK-0173 | P2 | open | Next Steps | ✅ Issue details editing (title, description, root cause, proposed fix) | Doc-only |
| TASK-0172 | P2 | open | Next Steps | ✅ Sync from PENDING_MASTER button | Doc-only |
| TASK-0171 | P2 | open | Next Steps | ✅ Import dialog (JSON/text, dry-run support) | Doc-only |
| TASK-0170 | P2 | open | Next Steps | ✅ Export to JSON | Doc-only |
| TASK-0169 | P2 | open | Next Steps | ✅ Pagination | Doc-only |
| TASK-0168 | P2 | open | Next Steps | ✅ Issues table with sorting | Doc-only |
| TASK-0167 | P2 | open | Next Steps | ✅ View modes: All, Quick Wins, Stale | Doc-only |
| TASK-0166 | P2 | open | Next Steps | ✅ Filters: status, priority, category, search, view mode | Doc-only |
| TASK-0164 | P2 | open | Next Steps | Status from checkbox `[x]` vs `[ ]` | Doc-only |
| TASK-0162 | P2 | open | Next Steps | Category from ID prefix (BUG, SEC, LOGIC, etc.) | Doc-only |
| TASK-0161 | P2 | open | Next Steps | Password: `admin123` (change in production!) | Doc-only |
| TASK-0160 | P2 | open | Next Steps | Username: `superadmin` | Doc-only |
| TASK-0159 | P2 | open | Next Steps | [x] XSS: All innerHTML sanitized | Doc-only |
| TASK-0158 | P2 | open | Next Steps | [x] Empty catches: 0 in API | Doc-only |
| TASK-0157 | P2 | open | Next Steps | [x] Console.log: 0 in API (all using logger) | Doc-only |
| TASK-0156 | P2 | open | Next Steps | [x] ESLint: 0 errors | Doc-only |
| TASK-0155 | P2 | open | Next Steps | [x] Build: 0 TS errors | Doc-only |
| TASK-0154 | P2 | open | Next Steps | [x] Tests: 100% passing (3309/3309) | Doc-only |
| TASK-0153 | P2 | open | Next Steps | Auth | app/api/superadmin/logout/route.ts |
| TASK-0152 | P2 | open | Next Steps | System | app/api/healthcheck/route.ts |
| TASK-0151 | P2 | open | Next Steps | 🔶 16 gaps | Doc-only |
| TASK-1067 | P2 | open | Next Steps | **React act() warnings in RTL/i18n flows**: `tests/integration/dashboard-hr.integration.test.tsx` triggers double `act()` warnings tied to `i18n/I18nProvider.tsx:27` when state updates fire during ... | tests/integration/dashboard-hr.integration.test.ts |
| TASK-0150 | P2 | open | Next Steps | Support/Admin gaps (5 and 19 routes respectively); add impersonation and admin action flows to raise confidence. | Doc-only |
| TASK-0149 | P2 | open | Next Steps | Souq coverage gaps remain on 44 routes (75 total); prioritize checkout, repricer, fulfillment edges. | Doc-only |
| TASK-0148 | P2 | open | Next Steps | Superadmin routes (3 routes) lack tests; add auth/session/regression cases. | Doc-only |
| TASK-0147 | P2 | open | Next Steps | CRM module (4 routes) lacks coverage; add CRUD tests for `app/api/crm/*`. | Doc-only |
| TASK-0146 | P2 | open | Next Steps | None detected in current sweep; no behavior regressions surfaced by tests. | Doc-only |
| TASK-0145 | P2 | open | Next Steps | `/api/billing/history` returns 401 instead of 400 when org context is missing (`tests/api/billing/history.route.test.ts`, `pnpm vitest run --bail 1 --reporter=dot`). | tests/api/billing/history.route.test.ts |
| TASK-0144 | P2 | open | Next Steps | Review webhook/open routes (`app/api/payments/callback/route.ts`, `app/api/healthcheck/route.ts`) for explicit allowlist rationale and document exceptions. | app/api/payments/callback/route.ts |
| TASK-0141 | P2 | open | Next Steps | Not re-run (last recorded 0) | Doc-only |
| TASK-0140 | P2 | open | Next Steps | No additional `STORE_PATH`/`NEXTAUTH_URL` style warnings remain after current workflow edits. | Doc-only |
| TASK-1066 | P2 | open | Next Steps | Multiple workflows (e.g., `test-runner.yml`, `e2e-tests.yml`) intentionally use secret fallbacks; standardize guardrails or document exceptions to prevent future lint noise and accidental secret re... | test-runner.yml |
| TASK-1065 | P2 | open | Next Steps | `build-sourcemaps.yml:53-56` still attempts Mongo index creation with a localhost fallback; on forks, this can fail due to missing Mongo. Recommend adding `if: ${{ env.MONGODB_URI != '' }}` and rem... | build-sourcemaps.yml:53-56 |
| TASK-0139 | P2 | open | Next Steps | No automated checks enforce fork-safety/secret guards; add actionlint or a reusable composite check for workflows touching secrets. | Doc-only |
| TASK-0138 | P2 | open | Next Steps | **Missing tests** | Doc-only |
| TASK-0137 | P2 | open | Next Steps | None observed in this session. | Doc-only |
| TASK-0136 | P2 | open | Next Steps | **Logic errors** | Doc-only |
| TASK-0135 | P2 | open | Next Steps | **Identified bugs** | Doc-only |
| TASK-0134 | P2 | open | Next Steps | Guard DB-dependent steps behind secret presence to avoid fork failures (`agent-governor.yml:76-82`; mirror in `build-sourcemaps.yml:53-56`). | agent-governor.yml:76-82 |
| TASK-0133 | P2 | open | Next Steps | Standardize cache path outputs across workflows using the `pnpm-store` pattern (`.github/workflows/agent-governor.yml:41-52`). | .github/workflows/agent-governor.yml:41-52 |
| TASK-0132 | P2 | open | Next Steps | **Efficiency improvements** | Doc-only |
| TASK-0131 | P2 | open | Next Steps | add-rate-limiting-to-issues-api-routes — apply `enforceRateLimit` across Issues routes + tests. | Doc-only |
| TASK-0130 | P2 | open | Next Steps | add-rate-limiting-to-superadmin-routes — add `enforceRateLimit` middleware + regression tests. | Doc-only |
| TASK-0129 | P2 | open | Next Steps | billing-history-missing-org-returns-401 — align route to return 400 without org and rerun full vitest. | Doc-only |
| TASK-0126 | P2 | open | Next Steps | add-rate-limiting-to-issues-api-routes — pending limiter hardening. | Doc-only |
| TASK-0125 | P2 | open | Next Steps | add-rate-limiting-to-superadmin-routes — pending limiter hardening. | Doc-only |
| eff-001 | P2 | open | Efficiency | Rate Limiting | Doc-only |
| bug-010 | P2 | open | Bugs | PM routes missing tenant filter | /click/route.ts |
| bug-011 | P2 | open | Bugs | BUG-011 — Notification .then() chains — sourceRef: docs/PENDING_MASTER.md:78 | docs/PENDING_MASTER.md:78 |
| missing-tests-6-missing-tests-doc-only | P2 | open | Missing Tests | Missing Tests: 6 | Doc-only |
| todo-fixme-0-found-in-api-routes-bugs-doc-only | P2 | open | Bugs | TODO/FIXME: 0 found in API routes | Doc-only |
| test-001 | P2 | open | Missing Tests | Integrated test coverage gaps from BACKLOG_AUDIT.json (TEST-001 through TEST-005) | BACKLOG_AUDIT.js |
| api-discoverability-openapi-spec-missing-new-endpoints-bugs-doc-only | P2 | open | Bugs | **API discoverability:** OpenAPI spec missing new endpoints | Doc-only |
| doc-109 | P2 | open | Documentation | DOC-109 — Missing error response documentation for API routes — P2, Effort: M | Doc-only |
| doc-108 | P2 | open | Documentation | DOC-108 — Missing API endpoint documentation in OpenAPI spec — P2, Effort: M | Doc-only |
| doc-106 | P2 | open | Documentation | DOC-106 — Missing README for backlog tracker feature — P2, Effort: S | Doc-only |
| doc-105 | P2 | open | Documentation | DOC-105 — Missing inline comments for ZATCA TLV encoding logic — P2, Effort: S | Doc-only |
| doc-104 | P2 | open | Documentation | DOC-104 — Missing function-level JSDoc for superadmin issues CRUD endpoints — P2, Effort: XS | Doc-only |
| doc-103 | P2 | open | Documentation | DOC-103 — Missing JSDoc for 124 Mongoose model schemas (server/models) — P2, Effort: L | Doc-only |
| gap-from-threshold-35-percentage-points-bugs-doc-only | P2 | open | Bugs | **Gap from threshold:** 35 percentage points | Doc-only |
| risk-missing-required-indexes-before-build-deploy-could-cause-runtime-failures-b | P2 | open | Bugs | Risk: Missing required indexes before build/deploy could cause runtime failures | Doc-only |
| monitor-for-typescript-regressions-in-queue-infrastructure-bugs-doc-only | P2 | open | Bugs | [ ] Monitor for TypeScript regressions in queue infrastructure | Doc-only |
| consider-setting-up-triggers-for-issue-tracker-sync-automation-bugs-doc-only | P2 | open | Bugs | [ ] Consider setting up triggers for Issue Tracker sync automation | Doc-only |
| document-trigger-function-development-workflow-if-needed-bugs-doc-only | P2 | open | Bugs | [ ] Document trigger/function development workflow if needed | Doc-only |
| rotate-api-keys-in-mongodb-atlas-public-key-qefjbwzu-bugs-doc-only | P2 | open | Bugs | [ ] Rotate API keys in MongoDB Atlas (public key: qefjbwzu) | Doc-only |
| test-004 | P2 | open | Missing Tests | **TEST-004** — CRM module test coverage gaps | subscriptionSeatService.ts |
| test-003 | P2 | open | Missing Tests | **TEST-003** — Finance module tests missing | Doc-only |
| doc-101 | P2 | open | Documentation | DOC-101 through DOC-110: Documentation gaps (JSDoc, OpenAPI, READMEs) | Doc-only |
| TENANT-001 | P2 | open | Bugs | - **CRM-TENANT-001** — CRM contacts endpoint missing orgId filter | Doc-only |
| REF-001 | P2 | open | Efficiency | **REF-001** Ã¢â‚¬â€ Create CRM route handler unit tests (P2, effort:M, sourceRef:PENDING_MASTER) | docs/PENDING_MASTER.md:6340 |
| leaverequestslist-tsx-527-lines-new-status-leave-type-period-quick-stats-pending | P2 | open | Missing Tests | **LeaveRequestsList.tsx** (527 lines, NEW): Status, Leave Type, Period + Quick stats (Pending/Approved/Total Days) + Pending/Upcoming chips | LeaveRequestsList.ts |
| features-quick-chips-open-urgent-overdue-due-today-url-sync-sort-dropdown-row-cl | P2 | open | Missing Tests | **Features**: Quick chips (Open, Urgent, Overdue, Due Today), URL sync, Sort dropdown, Row click | Doc-only |
| test-002 | P2 | open | Missing Tests | TEST-002 (P2) — List component integration tests missing — sourceRef: analysis:testing-recommendations:2025-12-17 | docs/PENDING_MASTER.md:76 |
| FEATURE-002 | P2 | open | Bugs | open | docs/PENDING_MASTER.md |
| todo-001 | P2 | open | Efficiency | [x] DOCS-TODO-001: Documented 17 TODOs with categories and priorities | Doc-only |
| TASK-0124 | P2 | open | Next Steps | ESLint: 0 errors, 1 warning (expected vitest comment) | Doc-only |
| TASK-0123 | P2 | open | Next Steps | app/api/superadmin/branding/route.ts: Add PlatformSettingsWithAudit type for audit plugin fields | app/api/superadmin/branding/route.ts |
| TASK-0122 | P2 | open | Next Steps | app/api/superadmin/login/route.ts: Use request.json() directly | app/api/superadmin/login/route.ts |
| TASK-0121 | P2 | open | Next Steps | app/api/issues/route.ts: Import IIssue, cast duplicates properly | app/api/issues/route.ts |
| TASK-0120 | P2 | open | Next Steps | app/api/issues/import/route.ts: Use request.json() directly, add IssueLeanDoc type | app/api/issues/import/route.ts |
| TYPES-001 | P2 | open | Next Steps | FIX-TYPES-001: Removed 15 `as any` casts with proper type assertions | Doc-only |
| TASK-0119 | P2 | open | Next Steps | `console.log` in prod: 1 found (JSDoc example, not actual code) | Doc-only |
| TASK-0118 | P2 | open | Next Steps | `@ts-expect-error`: 2 found (justified - 3rd party libs) | Doc-only |
| TASK-0117 | P2 | open | Next Steps | `as any` occurrences: 15+ found across issues, superadmin routes | Doc-only |
| TASK-0115 | P2 | open | Next Steps | **P2**: Address ESLint no-unused-vars across copied files | Doc-only |
| TASK-0112 | P2 | open | Next Steps | Created `types/xmlbuilder2.d.ts` - type declarations for XML builder | types/xmlbuilder2.d.ts |
| TYPES-002 | P2 | open | Next Steps | FIX-TYPES-002: Created `types/xmlbuilder2.d.ts` type declarations | types/xmlbuilder2.d.ts |
| TASK-0111 | P2 | open | Next Steps | VS Code Problems panel showed stale errors - actual typecheck passes | Doc-only |
| TASK-0110 | P2 | open | Next Steps | All 6,066+ source files confirmed present (app: 754, lib: 243, server: 220, components: 272) | Doc-only |
| TASK-0109 | P2 | open | Next Steps | IconButton with 44px minimum touch target | Doc-only |
| TASK-0108 | P2 | open | Next Steps | Color variants: default, primary(#0061A8), success(#00A859), warning(#FFB400), error, muted | Doc-only |
| TASK-0107 | P2 | open | Next Steps | Size variants: xs(12), sm(16), md(20), lg(24), xl(32) | Doc-only |
| TASK-0106 | P2 | open | Next Steps | Default 1.5px stroke weight (DGA standard) | Doc-only |
| TASK-0105 | P2 | open | Next Steps | Exports types: IconProps, IconButtonProps, IconSize, IconColor, LucideIcon, LucideProps | Doc-only |
| TASK-0104 | P2 | open | Next Steps | Exports Icon, IconButton, iconSizeMap, iconColorMap | Doc-only |
| TASK-0103 | P2 | open | Next Steps | Re-exports all icons from lucide-react | Doc-only |
| TASK-0102 | P2 | open | Next Steps | **`components/ui/icons.ts`** - Central barrel file | components/ui/icons.ts |
| TASK-0101 | P2 | open | Next Steps | `styles/globals.css` - Imports | styles/globals.css |
| TASK-0100 | P2 | open | Next Steps | `components/ui/Icon.tsx` - Token classes | components/ui/Icon.ts |
| TASK-0099 | P2 | open | Next Steps | `lib/theme/index.ts` - Exports | lib/theme/index.ts |
| TASK-0098 | P2 | open | Next Steps | `styles/tokens.css` - SSOT design tokens | styles/tokens.css |
| TASK-0097 | P2 | open | Next Steps | Deleted 20 empty bracket folders | Doc-only |
| TASK-0096 | P2 | open | Next Steps | Deleted 420 stub test files | Doc-only |
| TASK-0095 | P2 | open | Next Steps | `tests/api/filters/presets.route.test.ts` - Static imports fix | tests/api/filters/presets.route.test.ts |
| TASK-0093 | P2 | open | Next Steps | CodeRabbit JSONC formatting: **Nitpick** (non-blocking) | Doc-only |
| TASK-0092 | P2 | open | Next Steps | Gemini `Promise.resolve()` comment: **FALSE POSITIVE** (Next.js 15 uses async params, tests pass) | Next.js |
| TASK-0091 | P2 | open | Next Steps | **Artifact Naming**: Colons in artifact names rejected by GitHub Actions | Doc-only |
| TASK-0090 | P2 | open | Next Steps | **Test Runner Failure**: Drift Guard detects non-canonical roles in seed scripts | Doc-only |
| TASK-0089 | P2 | open | Next Steps | **Client Test (2/2) Failure**: `export-worker.process.test.ts` requires Redis config (REDIS_URL/REDIS_KEY) | export-worker.process.test.ts |
| L19-21 | P2 | open | Next Steps | Animation Presets: `lib/theme/useAnimation.ts` L19-21 adds types; L453-464 adds presets | lib/theme/useAnimation.ts |
| L17-35 | P2 | open | Next Steps | RTL: `styles/animations.css` L17-35 defines CSS vars; L86-109 defines RTL-aware keyframes; L682-693 defines utility classes | styles/animations.css |
| TASK-0088 | P2 | open | Next Steps | Missing REDIS_URL/REDIS_KEY in CI | Doc-only |
| TASK-0087 | P2 | open | Next Steps | 218 translation keys missing in en.json/ar.json | en.json/ar.js |
| TASK-0086 | P2 | open | Next Steps | ❌ FAIL | Doc-only |
| TASK-0085 | P2 | open | Next Steps | **After:** Drift check passes, all seed scripts use env vars, roles match CANONICAL_ROLES | Doc-only |
| TASK-0084 | P2 | open | Next Steps | **Before:** Drift check failing with 6 violations (non-canonical roles + hardcoded org ID) | Doc-only |
| TASK-0083 | P2 | open | Next Steps | `lib/config/demo-users.ts` — CORPORATE roles → canonical + displayRole | lib/config/demo-users.ts |
| TASK-0082 | P2 | open | Next Steps | `scripts/count-null-employeeid.ts` — TEST_ORG_ID with validation | scripts/count-null-employeeid.ts |
| TASK-0080 | P2 | open | Next Steps | `scripts/seed-e2e-test-users.ts` — Same pattern | scripts/seed-e2e-test-users.ts |
| TASK-0079 | P2 | open | Next Steps | `scripts/seed-test-users.ts` — TEST_ORG_ID \|\| DEFAULT_ORG_ID pattern | scripts/seed-test-users.ts |
| TASK-0078 | P2 | open | Next Steps | `scripts/create-demo-users.ts` — DEFAULT_ORG_ID with validation | scripts/create-demo-users.ts |
| TASK-0077 | P2 | open | Next Steps | `scripts/seed-demo-users.ts` — DEFAULT_ORG_ID env var, replaced 6 hardcoded IDs | scripts/seed-demo-users.ts |
| TASK-0076 | P2 | open | Next Steps | `scripts/check-tenant-role-drift.ts` — ALLOWED_ROLES synced with CANONICAL_ROLES | scripts/check-tenant-role-drift.ts |
| TASK-0075 | P2 | open | Next Steps | Lines 514-521: Grouped summary output | Doc-only |
| TASK-0074 | P2 | open | Next Steps | Lines 258-263: Grouped `echo >> $GITHUB_ENV` | Doc-only |
| TASK-0073 | P2 | open | Next Steps | Lines 64-72: Grouped `echo >> $GITHUB_STEP_SUMMARY` into `{ } >> "$GITHUB_STEP_SUMMARY"` | Doc-only |
| TASK-0072 | P2 | open | Next Steps | Changed `text-right/text-left` → `text-end/text-start` | Doc-only |
| TASK-0071 | P2 | open | Next Steps | **RTL Lint** (`components/i18n/CurrencyChangeConfirmDialog.tsx:50`) | components/i18n/CurrencyChangeConfirmDialog.ts |
| TASK-0070 | P2 | open | Next Steps | Removed `/fixzit$/` from `PRODUCTION_PATTERNS` (CI legitimately uses this DB) | Doc-only |
| TASK-0069 | P2 | open | Next Steps | **MongoDB Safe Pattern** (`scripts/assert-nonprod-mongo.ts`) | scripts/assert-nonprod-mongo.ts |
| TASK-0068 | P2 | open | Next Steps | Depends on above fixes | Doc-only |
| TASK-0067 | P2 | open | Next Steps | `--changed` flag + local `ai/` folder conflicts with `ai` npm package | Doc-only |
| TASK-0066 | P2 | open | Next Steps | Test Runner - should pass after index fix | Doc-only |
| TASK-0065 | P2 | open | Next Steps | Route Quality - should pass after nav path fix | Doc-only |
| TASK-0064 | P2 | open | Next Steps | QA workflow - should pass after Redis removal | Doc-only |
| TASK-0063 | P2 | open | Next Steps | `app/api/help/ask/route.ts` — Updated import path | app/api/help/ask/route.ts |
| TASK-0062 | P2 | open | Next Steps | `scripts/kb-change-stream.ts` — Updated import path | scripts/kb-change-stream.ts |
| TASK-0061 | P2 | open | Next Steps | `kb/ingest.ts` — Updated import path | kb/ingest.ts |
| TASK-0060 | P2 | open | Next Steps | `.github/workflows/e2e-tests.yml` — Quoted $GITHUB_OUTPUT | .github/workflows/e2e-tests.yml |
| TASK-0059 | P2 | open | Next Steps | ✅ **AI folder conflict** - Renamed to lib/ai-embeddings | Doc-only |
| TASK-0058 | P2 | open | Next Steps | ✅ **Tap Payments** - Kept strict (payment infrastructure) | Doc-only |
| TASK-0057 | P2 | open | Next Steps | ✅ **Redis** - Removed entirely from check-critical-env.ts (not just skipped) | check-critical-env.ts |
| TASK-0056 | P2 | open | Next Steps | Announce complete | Doc-only |
| TASK-0055 | P2 | open | Next Steps | `lib/mongo.ts` — Top-level await fix | lib/mongo.ts |
| TASK-0054 | P2 | open | Next Steps | `lib/ai-embeddings/embeddings.ts` — Renamed from ai/ | lib/ai-embeddings/embeddings.ts |
| TASK-0053 | P2 | open | Next Steps | `lib/db/collections.ts` — Index sparse+partial fix | lib/db/collections.ts |
| TASK-0052 | P2 | open | Next Steps | `scripts/check-nav-routes.ts` — Route group mappings | scripts/check-nav-routes.ts |
| TASK-0051 | P2 | open | Next Steps | `scripts/ci/check-critical-env.ts` — Redis removed, Tap Vercel-aware | scripts/ci/check-critical-env.ts |
| TASK-0050 | P2 | open | Next Steps | `.github/workflows/qa.yml` — Heap memory increase | .github/workflows/qa.yml |
| TASK-0049 | P2 | open | Next Steps | `.github/workflows/route-quality.yml` — RTL smoke auth secrets | .github/workflows/route-quality.yml |
| TASK-0048 | P2 | open | Next Steps | `tests/i18n-scan.mjs` — Error boundary exclusions | tests/i18n-scan.mjs |
| TASK-0047 | P2 | open | Next Steps | AWAITING | Doc-only |
| TASK-0046 | P2 | open | Next Steps | Wait for Codex APPROVED | Doc-only |
| TASK-0045 | P2 | open | Next Steps | NOTIFY Eng. Sultan | Doc-only |
| TASK-0044 | P2 | open | Next Steps | Announce completion | Doc-only |
| TASK-0043 | P2 | open | Next Steps | CI-Sharded typecheck | Doc-only |
| TASK-0042 | P2 | open | Next Steps | `tests/api/admin/users.route.test.ts` | tests/api/admin/users.route.test.ts |
| TASK-0041 | P2 | open | Next Steps | `tests/api/superadmin/organizations.route.test.ts` | tests/api/superadmin/organizations.route.test.ts |
| TASK-0040 | P2 | open | Next Steps | `tests/models/aqarBooking.test.ts` | tests/models/aqarBooking.test.ts |
| TASK-0039 | P2 | open | Next Steps | `tests/server/services/owner/financeIntegration.test.ts` | tests/server/services/owner/financeIntegration.test.ts |
| TASK-0038 | P2 | open | Next Steps | `tests/unit/api/admin/users/users.route.test.ts` | tests/unit/api/admin/users/users.route.test.ts |
| TASK-0037 | P2 | open | Next Steps | `tests/unit/api/admin/users.route.test.ts` | tests/unit/api/admin/users.route.test.ts |
| TASK-0036 | P2 | open | Next Steps | `tests/unit/api/issues/issues.route.test.ts` | tests/unit/api/issues/issues.route.test.ts |
| TASK-0035 | P2 | open | Next Steps | `tests/unit/server/services/onboardingEntities.test.ts` | tests/unit/server/services/onboardingEntities.test.ts |
| TASK-0033 | P2 | open | Next Steps | `tests/unit/services/work-order-status-race.test.ts` | tests/unit/services/work-order-status-race.test.ts |
| merge-pr-601-after-ci-passes-next-steps-doc-only | P2 | open | Next Steps | [ ] Merge PR #601 after CI passes | Doc-only |
| TASK-0032 | P2 | open | Next Steps | [ ] Address remaining PR review comments (design-tokens.css question) | design-tokens.css |
| x-run-full-test-suite-to-verify-timer-isolation-fix-works-314s-all-pass-next-ste | P2 | open | Next Steps | [x] Run full test suite to verify timer isolation fix works ✅ (314s, all pass) | Doc-only |
| merge-pr-601-after-all-ci-checks-pass-next-steps-doc-only | P2 | open | Next Steps | [ ] Merge PR #601 after all CI checks pass | Doc-only |
| address-remaining-pr-601-review-comments-next-steps-doc-only | P2 | open | Next Steps | [ ] Address remaining PR #601 review comments | Doc-only |
| wait-for-ci-to-complete-and-verify-tests-server-4-4-passes-next-steps-doc-only | P2 | open | Next Steps | [ ] Wait for CI to complete and verify Tests (Server) 4/4 passes | Doc-only |
| x-push-fixes-e7c3c5d9c-next-steps-doc-only | P2 | open | Next Steps | [x] Push fixes (e7c3c5d9c) ✅ | Doc-only |
| x-fix-7-mongoose-mock-test-files-next-steps-doc-only | P2 | open | Next Steps | [x] Fix 7 mongoose mock test files ✅ | Doc-only |
| x-fix-vendor-products-route-test-ts-mock-isolation-next-steps-vendor-products-ro | P2 | open | Next Steps | [x] Fix vendor-products.route.test.ts mock isolation ✅ | vendor-products.route.test.ts |
| TASK-0029 | P2 | open | Next Steps | ⏳ Pending user configuration | Doc-only |
| await-codex-review-gate-agents-md-section-14-next-steps-agents-md | P2 | open | Next Steps | [ ] Await Codex review gate (AGENTS.md Section 14) | AGENTS.md |
| verify-system-automated-work-orders-create-correctly-with-null-assignedby-next-s | P2 | open | Next Steps | [ ] Verify system-automated work orders create correctly with null assignedBy | Doc-only |
| monitor-auto-assignment-engine-for-any-runtime-errors-next-steps-doc-only | P2 | open | Next Steps | [ ] Monitor auto-assignment-engine for any runtime errors | Doc-only |
| TASK-0028 | P2 | open | Next Steps | **ESLint:** ✅ 0 errors | Doc-only |
| TASK-0027 | P2 | open | Next Steps | **TypeScript:** ✅ 0 errors | Doc-only |
| TASK-0026 | P2 | open | Next Steps | **Tests:** ✅ 2918+ passing | Doc-only |
| TASK-0023 | P2 | open | Next Steps | fix(test): Add missing connectToDatabase mock to claims-refund-processor test | Doc-only |
| verify-production-login-flow-works-after-rate-limit-resets-next-steps-doc-only | P2 | open | Next Steps | [ ] Verify production login flow works (after rate limit resets) | Doc-only |
| after-codex-approval-deploy-to-production-next-steps-doc-only | P2 | open | Next Steps | [ ] After Codex approval, deploy to production | Doc-only |
| create-pr-for-review-next-steps-doc-only | P2 | open | Next Steps | [ ] Create PR for review | Doc-only |
| agent-001 | P2 | open | Next Steps | [ ] Commit changes with `[AGENT-001-A]` token | Doc-only |
| SA-SERVICE-001 | P2 | open | Bugs | FM Services not in catalog | docs/PENDING_MASTER.md |
| SA-CATALOG-001 | P2 | open | Bugs | Catalog missing businessModel filter | docs/PENDING_MASTER.md |
| SA-SCHEDULE-001 | P2 | open | Bugs | No scheduled tasks UI | docs/PENDING_MASTER.md |
| SA-WEBHOOK-001 | P2 | open | Bugs | No webhook management UI | docs/PENDING_MASTER.md |
| TASK-0022 | P2 | open | Next Steps | All validation gaps addressed (null checks, input validation) | Doc-only |
| TASK-0021 | P2 | open | Next Steps | Commit: (pending) | Doc-only |
| BUG-0006 | P2 | open | Bugs | CI workflows failing for feature/building-3d-model with missing logs | .github/workflows:1-1 |
| TEST-0007 | P2 | open | Missing Tests | Missing API tests for public tour and building-model data endpoints | app/api/fm/properties/[id]/tour/route.ts:52-151 |
| ISSUE-1767168814769 | P2 | open | Logic Errors | Audit logs page size selection ignored in fetch and range | app/(fm)/admin/audit-logs/page.tsx:121-179 |
| PERF-0003 | P2 | open | Bugs | \| db.collection() calls \| 📋 LOGGED \| 37 calls in 25 API files bypass Mongoose. Estimated 24h. Needs delegation \| | db.c |
| PR-537 | P2 | open | Bugs | 1 | docs/PENDING_MASTER.md |
| PERF-004 | P2 | open | Efficiency | \| PERF-004 \| Sequential notifications \| app/api/admin/notifications/send/route.ts \| 1000├ù3 = 3000 API calls \| Use batch APIs, queue with BullMQ \| ΓÅ│ TODO \| | app/api/admin/notifications/send/route.ts |
| PERF-003 | P2 | open | Bugs | 2. Timer cleanup (8h) → PERF-003 | Doc-only |
| BUG-009 | P2 | open | Bugs | Uncaught JSON.parse | app/api/webhooks/sendgrid/route.ts:82 |
| EFF-005 | P2 | open | Bugs | \| EFF-005 \| Hooks in wrong directories \| lib/fm/use*.ts, components/**/use*.tsx \| Inconsistent organization \| Move to hooks/ directory \| ΓÅ│ TODO \| | docs/PENDING_MASTER.md:23432 |
| OPS-002 | P2 | open | Bugs | DevOps | Doc-only |
| SEC-005 | P2 | open | Bugs | \| SEC-005 \| Rate limiting gaps \| auth/otp routes \| Γ£à FALSE POSITIVE \| - \| | docs/PENDING_MASTER.md:23001 |
| TEST-006 | P2 | open | Bugs | Tests | escalation.service.ts |
| SENTRY-001 | P2 | open | Bugs | \| SENTRY-001 \| Add Sentry context to FM/Souq modules \| ≡ƒö▓ TODO \| | docs/PENDING_MASTER.md:21591 |
| BUG-004 | P2 | open | Bugs | Souq review POST no org | app/api/souq/reviews/route.ts |
| LOGIC-126 | P2 | open | logic | Large route files | docs/PENDING_MASTER.md |
| EFF-001 | P2 | open | Bugs | Efficiency | docs/PENDING_MASTER.md |
| BUG-010 | P2 | open | Bugs | \| BUG-010 \| PM routes missing tenant filter \| ✅ FALSE POSITIVE \| Routes already have `orgId` filter; grep missed camelCase \| | Doc-only |
| DOC-109 | P2 | open | Bugs | DOC-109 Ã¢â‚¬â€ Missing error response documentation for API routes Ã¢â‚¬â€ P2, Effort: M | docs/PENDING_MASTER.md:7447 |
| DOC-108 | P2 | open | Bugs | DOC-108 Ã¢â‚¬â€ Missing API endpoint documentation in OpenAPI spec Ã¢â‚¬â€ P2, Effort: M | docs/PENDING_MASTER.md:7443 |
| DOC-106 | P2 | open | Bugs | DOC-106 Ã¢â‚¬â€ Missing README for backlog tracker feature Ã¢â‚¬â€ P2, Effort: S | docs/PENDING_MASTER.md:7437 |
| DOC-105 | P2 | open | Bugs | DOC-105 Ã¢â‚¬â€ Missing inline comments for ZATCA TLV encoding logic Ã¢â‚¬â€ P2, Effort: S | docs/PENDING_MASTER.md:7433 |
| TEST-004 | P2 | open | Bugs | Tests | subscriptionSeatService.ts |
| TEST-005 | P2 | open | Bugs | TEST-005 — Aqar test coverage (5 new files pending commit) | docs/PENDING_MASTER.md |
| COMP-001 | P2 | open | Bugs | open | docs/PENDING_MASTER.md |
| LOGIC-001 | P2 | open | Logic Errors | open | docs/PENDING_MASTER.md |
| TODO-001 | P2 | open | Bugs | Cleanup | docs/PENDING_MASTER.md |
| AGENT-001 | P2 | open | Bugs | [x] Open PR from agent/AGENT-001-A/souq/settlements-tests → main (#604) | docs/PENDING_MASTER.md |
| e2e-runner-requires-bash-wsl-on-windows-bug-package-json-l117 | P2 | open | Bugs | E2E runner requires bash/WSL on Windows | package.json:117-117 |
| TENANT-SCOPE-VENDOR-APPLY | P2 | open | Bugs | Vendor apply creates records without orgId | app/api/vendor/apply/route.ts:94 |
| f2-aggregate-wrapper-bug-docs-pending-master-md | P2 | open | Bugs | F2 (Aggregate wrapper) | docs/PENDING_MASTER.md |
| ISSUE-CI-001 | P2 | open | Bugs | ISSUE-CI-001 â€“ GitHub Actions Workflows Failing (High, Pending Investigation): check runners, secrets per docs/GITHUBSECRETSSETUP.md, review workflow syntax. | docs/GITHUB_SECRETS_SETUP.md |
| HC-MAJ-004 | P2 | open | Bugs | Placeholder URL example.com/placeholder.pdf | services/souq/seller-kyc-service.ts |
| AUTH-TEST-001 | P2 | open | Bugs | Tests | docs/PENDING_MASTER.md |
| AUTH-SEC-002 | P2 | open | Bugs | DevOps | docs/PENDING_MASTER.md |
| AUTH-TEST-002 | P2 | open | Bugs | Tests | docs/PENDING_MASTER.md |
| AUTH-LOGIC-001 | P2 | open | Bugs | Logic | docs/PENDING_MASTER.md |
| AUTH-OPS-002 | P2 | open | Bugs | DevOps | docs/PENDING_MASTER.md |
| AUTH-BUG-001 | P2 | open | Bugs | Bug | docs/PENDING_MASTER.md |
| PATTERN-001 | P2 | open | Bugs | Reliability | req.js |
| SILENT-HELP-JSON-001 | P2 | open | Bugs | Correctness | app/api/help/escalate/route.ts |
| BUG-1702 | P2 | open | Bugs | lib/graphql/index.ts:803-887 | lib/graphql/index.ts |
| BUG-PAY-001 | P2 | open | Bugs | payments/tap/checkout/route.ts:251 | payments/tap/checkout/route.ts |
| BUG-KYC-001 | P2 | open | Bugs | 4 | docs/PENDING_MASTER.md |
| BUG-FM-001 | P2 | open | Bugs | 3 | docs/PENDING_MASTER.md |
| CR-2025-12-29-003 | P2 | open | Bugs | Vendor intelligence alert creation logs omit error details | services/souq/vendor-intelligence.ts |
| CR-2025-12-29-002 | P2 | open | Bugs | Superadmin subscriptions page swallows tier save errors without logging context | app/superadmin/subscriptions/page.tsx |
| CR-2025-12-29-001 | P2 | open | Bugs | Superadmin jobs page swallows fetch/process errors without logging context | app/superadmin/jobs/page.tsx |
| FEATURE-001 | P2 | open | Bugs | Q1 2026 | docs/PENDING_MASTER.md |
| SA-VENDOR-001 | P2 | open | Bugs | Vendors missing B2B/B2C capability badges | docs/PENDING_MASTER.md |
| SA-EMAIL-001 | P2 | open | Bugs | No email template management | docs/PENDING_MASTER.md |
| SA-QUOTA-001 | P2 | open | Bugs | No tenant quota management | docs/PENDING_MASTER.md |
| SA-DASH-001 | P2 | open | Bugs | No superadmin dashboard overview | docs/PENDING_MASTER.md |
| location-master-pending-report-md-repo-root-bugs-master-pending-report-md | P2 | open | Bugs | - Location: /MASTER_PENDING_REPORT.md (repo root) | /MASTER_PENDING_REPORT.md |
| test-coverage-gap-api-test-coverage-now-101-9-376-369-routes-missing-tests-101-9 | P2 | open | Bugs | TEST-COVERAGE-GAP: API test coverage now 101.9% (376/369 routes) | 101.9 |
| TEST-ASSERT-500-PRESIGNED-URL | P2 | open | Bugs | Tests accept 500/501 responses in presigned URL assertions | tests/api/upload/presigned-url.route.test.ts:220 |
| TEST-001-007 | P2 | open | Bugs | **TEST-001-007**: Add payment/billing test coverage (CRITICAL) | docs/PENDING_MASTER.md:23589 |
| FIN-TEST-001 | P2 | open | Bugs | \| FIN-TEST-001 \| Missing Tests \| Billing/Finance payments stack \| No coverage for billing/quote, payments/create, payments/tap/checkout, finance accounts/expenses/journals \| Regressions in auth/valida | docs/PENDING_MASTER.md:23298 |
| GH-ENV | P2 | open | Efficiency | \| GH-ENV \| Create GitHub environments (staging, production-approval, production) \| ≡ƒƒí HIGH \| 15min \| DevOps \| | docs/PENDING_MASTER.md:22978 |
| TEST-API-GAP | P2 | open | Bugs | \| TEST-API-GAP \| 127 API routes without dedicated tests \| ΓÅ│ Coverage gap \| | docs/PENDING_MASTER.md:22654 |
| E2E-TIMEOUT | P2 | open | Bugs | \| ≡ƒƒó MEDIUM \| E2E-TIMEOUT \| Rerun Playwright with extended timeout \| 30min \| | docs/PENDING_MASTER.md:22638 |
| TEST-TAQNYAT | P2 | open | Bugs | \| ≡ƒƒó MEDIUM \| TEST-TAQNYAT \| Add tests for `lib/sms-providers/taqnyat.ts` \| 1h \| | lib/sms-providers/taqnyat.ts |
| TEST-IP | P2 | open | Bugs | \| ≡ƒƒó MEDIUM \| TEST-IP \| Add tests for `lib/security/ip-reputation.ts` \| 1h \| | lib/security/ip-reputation.ts |
| TEST-COV | P2 | open | Bugs | \| ≡ƒƒó MEDIUM \| TEST-COV \| Continue API route test coverage expansion \| 4h \| | 6.4 |
| TEST-FIX | P2 | open | Bugs | \| ≡ƒƒí HIGH \| TEST-FIX \| Fix 21 failing tests in new test files \| 2h \| | docs/PENDING_MASTER.md:22470 |
| ENH-LP-007 | P2 | open | Bugs | \| ≡ƒƒí MEDIUM \| ENH-LP-007: Sentry.setContext() for FM/Souq \| Observability \| 30 min \| ΓÜá∩╕Å PARTIAL \| | Sentry.setContext |
| P2-3 | P2 | open | Bugs | \| ≡ƒƒó P2-3 \| Replace 13 console statements with logger \| 1 hr \| ≡ƒö▓ Not started \| | docs/PENDING_MASTER.md:20713 |
| P0-1 | P2 | open | Bugs | \| ≡ƒö┤ P0-1 \| Configure Taqnyat env vars in Vercel \| 15 min \| ΓÅ│ \| DevOps access \| | docs/PENDING_MASTER.md:19722 |
| P2-2 | P2 | open | Bugs | \| ≡ƒƒó P2-2 \| P3-004 Unused exports cleanup \| 1 hr \| ≡ƒö▓ DEFERRED \| Optional \| | docs/PENDING_MASTER.md:19093 |
| P2-1 | P2 | open | Bugs | \| ≡ƒƒó P2-1 \| P3-002 Hardcoded strings ΓåÆ i18n \| 2 hrs \| ≡ƒö▓ DEFERRED \| Optional \| | docs/PENDING_MASTER.md:19092 |
| P1-3 | P2 | open | Bugs | \| ≡ƒƒí P1-3 \| Add try-catch to 8 routes without error handling \| 30 min \| ≡ƒö▓ \| None \| | docs/PENDING_MASTER.md:19091 |
| P1-2 | P2 | open | Bugs | \| ≡ƒƒí P1-2 \| Expand rate limiting (HR: 0/7, CRM: 0/4, Finance: 1/19) \| 2 hrs \| ≡ƒö▓ \| None \| | 3.5 |
| projects-route-ts-72-medium-needs-try-catch-next-steps-projects-route-ts | P2 | open | Bugs | \| `projects/route.ts` \| 72 \| Medium \| Needs try-catch \| | projects/route.ts |
| SOUQ-CLAIM-DBERR-001 | P2 | open | Bugs | \| SOUQ-CLAIM-DBERR-001 \| Correctness \| `app/api/souq/claims/[id]/route.ts` \| Order/user lookups use `.catch(() => null)` and return 404 on any DB error. \| Operational errors become false "not found", | app/api/souq/claims/[id]/route.ts |
| P2-001 | P2 | open | Bugs | \| P2-001 \| Testing \| Aqar module \| ~11 routes missing tests \| ≡ƒƒí Backlog \| | docs/PENDING_MASTER.md:11773 |
| SILENT-RESUME-DOWNLOAD-001 | P2 | open | Bugs | \| SILENT-RESUME-DOWNLOAD-001 \| Reliability/Observability \| app/api/files/resumes/[file]/route.ts \| Auth retrieval and local file read both use `.catch(() => null)`, mapping infra errors to 401/404 wit | /route.ts |
| SILENT-UPLOAD-AUTH-CLUSTER | P2 | open | Bugs | \| SILENT-UPLOAD-AUTH-CLUSTER \| Reliability/Security \| app/api/upload/(presigned-url\|verify-metadata\|scan\|scan-status), app/api/settings/logo/route.ts, server/middleware/subscriptionCheck.ts \| `getSess | app/api/settings/logo/route.ts |
| P2-005 | P2 | open | Bugs | \| P2-005 \| Testing \| Admin module \| 23 routes missing tests \| ≡ƒƒí Backlog \| Add test files \| | docs/PENDING_MASTER.md:11531 |
| P2-004 | P2 | open | Bugs | \| P2-004 \| Testing \| FM module \| 17 routes missing tests \| ≡ƒƒí Backlog \| Add test files \| | docs/PENDING_MASTER.md:11530 |
| P2-003 | P2 | open | Bugs | \| P2-003 \| Testing \| Aqar module \| 11 routes missing tests \| ≡ƒƒí Backlog \| Add test files \| | docs/PENDING_MASTER.md:11529 |
| P1-P2 | P2 | open | Bugs | \| Module coverage \| 51 Souq routes, 22 Admin routes, 17 FM routes need tests \| P1-P2 \| ≡ƒö┤ TODO \| | docs/PENDING_MASTER.md:10857 |
| RTL-001 | P2 | open | Bugs | \| P1 \| Fix RTL-001: Error page template \| 30min \| ΓÇö \| | docs/PENDING_MASTER.md:9932 |
| TEN-001 | P2 | open | Bugs | \| P0 \| Fix TEN-001/002/005: Critical orgId fallbacks \| 1h \| ΓÇö \| | docs/PENDING_MASTER.md:9929 |
| work-orders-presign-route-ts-1-needs-fix-next-steps-work-orders-presign-route-ts | P2 | open | Bugs | `work-orders/presign/route.ts` (1) ΓÇö needs fix | work-orders/presign/route.ts |
| TEST-FM-19 | P2 | open | Bugs | \| TEST-FM-19 \| FM module \| 19 routes missing coverage \| ≡ƒƒá P1 \| | docs/PENDING_MASTER.md:9204 |
| TEST-ADMIN-26 | P2 | open | Bugs | \| TEST-ADMIN-26 \| Admin module \| 26 routes missing coverage \| ≡ƒƒá P1 \| | docs/PENDING_MASTER.md:9203 |
| TEST-SOUQ-51 | P2 | open | Bugs | \| TEST-SOUQ-51 \| Souq module \| 51 routes missing coverage \| ≡ƒƒá P1 \| | docs/PENDING_MASTER.md:9202 |
| TEST-AQAR | P2 | open | Bugs | \| TEST-AQAR \| Aqar Module \| Route coverage gap \| 14 routes \| ≡ƒƒí P2 \| | docs/PENDING_MASTER.md:8950 |
| TEST-FM | P2 | open | Bugs | \| TEST-FM \| FM Module \| Route coverage gap \| 19 routes \| ≡ƒƒá P1 \| | docs/PENDING_MASTER.md:8949 |
| TEST-ADMIN | P2 | open | Bugs | \| TEST-ADMIN \| Admin Module \| Route coverage gap \| 26 routes \| ≡ƒƒá P1 \| | docs/PENDING_MASTER.md:8948 |
| TEST-SOUQ | P2 | open | Bugs | \| TEST-SOUQ \| Souq Module \| Route coverage gap \| 51 routes \| ≡ƒƒá P1 \| | docs/PENDING_MASTER.md:8947 |
| BUG-ISSUES-001 | P2 | open | Bugs | \| P1 \| Fix BUG-ISSUES-001 (duplicate logger) \| 5m \| Agent \| | docs/PENDING_MASTER.md:8585 |
| BUG-SETTLE-001 | P2 | open | Bugs | \| P1 \| Fix BUG-SETTLE-001 (BankAccount type) \| 15m \| Agent \| | docs/PENDING_MASTER.md:8583 |
| BUG-CART-001 | P2 | open | Bugs | \| BUG-CART-001 \| `marketplace/cart/route.ts` \| Missing zodValidationError \| P1 \| NEW \| | marketplace/cart/route.ts |
| CRM-TENANT-001 | P2 | open | Bugs | **CRM-TENANT-001** ΓÇö CRM contacts endpoint missing orgId filter | docs/PENDING_MASTER.md:5143 |
| BUG-AUDITLOGS-FILTERS-MISSING-LOCAL | P2 | open | Bugs | BUG-AUDITLOGS-FILTERS-MISSING-LOCAL ΓÇö sourceRef: code-review:components/administration/AuditLogsList.tsx:108-114 | components/administration/AuditLogsList.tsx:108-114 |
| BUG-INVOICES-FILTERS-MISSING-LOCAL | P2 | open | Bugs | BUG-INVOICES-FILTERS-MISSING-LOCAL ΓÇö sourceRef: code-review:components/finance/InvoicesList.tsx:111-116 | components/finance/InvoicesList.tsx:111-116 |
| BUG-EMPLOYEES-FILTERS-MISSING-LOCAL | P2 | open | Bugs | BUG-EMPLOYEES-FILTERS-MISSING-LOCAL ΓÇö sourceRef: code-review:components/hr/EmployeesList.tsx:112-116 | components/hr/EmployeesList.tsx:112-116 |
| BUG-USERS-FILTERS-MISSING-LOCAL | P2 | open | Bugs | BUG-USERS-FILTERS-MISSING-LOCAL ΓÇö sourceRef: code-review:components/administration/UsersList.tsx:107-113 | components/administration/UsersList.tsx:107-113 |
| BUG-WO-FILTERS-MISSING-LOCAL | P2 | open | Bugs | BUG-WO-FILTERS-MISSING-LOCAL ΓÇö sourceRef: code-review:components/fm/WorkOrdersViewNew.tsx:149-153 | components/fm/WorkOrdersViewNew.tsx:149-153 |
| INFRA-SENTRY | P2 | open | Bugs | INFRA-SENTRY ΓåÆ Q1 2026: Activate Sentry (needs DSN) | docs/PENDING_MASTER.md:2142 |
| DOCS-TODO-001 | P2 | open | Bugs | DOCS-TODO-001: Documented 17 TODOs with categories and priorities | docs/PENDING_MASTER.md:1789 |
| A11Y-ALT-001 | P2 | open | Bugs | \| A11Y-ALT-001 \| Images missing alt text \| 38 \| WCAG non-compliance \| ΓÅ╕∩╕Å False Positive \| | docs/PENDING_MASTER.md:1730 |
| AGENT-001-A | P2 | open | Bugs | Commit changes with `[AGENT-001-A]` token | agent/AGENT-001-A/souq/settlements-tests |
| total-gap-102-efficiency-docs-pending-master-md-12938 | P2 | open | Efficiency | \| **Total Gap** \| — \| — \| — \| **102** \| | docs/PENDING_MASTER.md:12938:12938 |
| module-routes-tests-coverage-gap-missing-tests-docs-pending-master-md-12932 | P2 | open | Bugs | \| Module \| Routes \| Tests \| Coverage \| Gap \| | docs/PENDING_MASTER.md:12932:12932 |
| open-prs-2-2-active-549-550-missing-tests-docs-pending-master-md-12735 | P2 | open | Bugs | \| **Open PRs** \| 2 \| 2 \| 🔄 Active \| #549, #550 \| | docs/PENDING_MASTER.md:12735:12735 |
| module-routes-estimated-tests-gap-missing-tests-docs-pending-master-md-12239 | P2 | open | Bugs | \| Module \| Routes \| Estimated Tests \| Gap \| | docs/PENDING_MASTER.md:12239:12239 |
| gaps-by-module-missing-tests-docs-pending-master-md-12238 | P2 | open | Bugs | **Gaps by Module**: | docs/PENDING_MASTER.md:12238:12238 |
| area-gap-priority-status-missing-tests-docs-pending-master-md-12053 | P2 | open | Bugs | \| Area \| Gap \| Priority \| Status \| | docs/PENDING_MASTER.md:12053:12053 |
| branch-fix-graphql-resolver-todos-active-next-steps-docs-pending-master-md-11942 | P2 | open | Bugs | \| Branch \| `fix/graphql-resolver-todos` \| ✅ Active \| | docs/PENDING_MASTER.md:11942:11942 |
| area-gap-status-missing-tests-docs-pending-master-md-11879 | P2 | open | Bugs | \| Area \| Gap \| Status \| | docs/PENDING_MASTER.md:11879:11879 |
| throw-new-tenanterror-missing-or-invalid-orgid-bugs-docs-pending-master-md-11203 | P2 | open | Bugs | throw new TenantError('Missing or invalid orgId'); | docs/PENDING_MASTER.md:11203:11203 |
| df406f6f7-on-branch-docs-pending-v60-next-steps-docs-pending-master-md-10877 | P2 | open | Bugs | `df406f6f7` on branch `docs/pending-v60` | docs/PENDING_MASTER.md:10877:10877 |
| 1e7a0237b-on-branch-docs-pending-v60-next-steps-docs-pending-master-md-10712 | P2 | open | Bugs | `1e7a0237b` on branch `docs/pending-v60` | docs/PENDING_MASTER.md:10712:10712 |
| rbac-119-352-routes-34-missing-tests-docs-pending-master-md-10404 | P2 | open | Bugs | RBAC: 119/352 routes (34%) | docs/PENDING_MASTER.md:10404:10404 |
| json-parse-43-routes-remaining-missing-tests-docs-pending-master-md-10403 | P2 | open | Bugs | JSON-PARSE: 43 routes remaining | docs/PENDING_MASTER.md:10403:10403 |
| module-routes-tests-gap-priority-missing-tests-docs-pending-master-md-9880 | P2 | open | Bugs | \| Module \| Routes \| Tests \| Gap \| Priority \| | docs/PENDING_MASTER.md:9880:9880 |
| area-routes-verified-missing-scope-notes-next-steps-docs-pending-master-md-9670 | P2 | open | Bugs | \| Area \| Routes Verified \| Missing Scope \| Notes \| | docs/PENDING_MASTER.md:9670:9670 |
| todo-fixme-in-api-0-clean-none-needed-next-steps-docs-pending-master-md-9473 | P2 | open | Bugs | \| TODO/FIXME in API \| 0 \| ✅ Clean \| None needed \| | docs/PENDING_MASTER.md:9473:9473 |
| branch-docs-pending-v60-active-next-steps-docs-pending-master-md-9433 | P2 | open | Bugs | \| **Branch** \| `docs/pending-v60` \| ✅ Active \| — \| | docs/PENDING_MASTER.md:9433:9433 |
| todo-fixme-in-api-0-clean-next-steps-docs-pending-master-md-9207 | P2 | open | Bugs | \| TODO/FIXME in API \| 0 \| ✅ \| Clean \| | docs/PENDING_MASTER.md:9207:9207 |
| sync-from-pending-master-button-next-steps-docs-pending-master-md-9155 | P2 | open | Bugs | ✅ Sync from PENDING_MASTER button | docs/PENDING_MASTER.md:9155:9155 |
| todo-fixme-in-api-0-clean-codebase-next-steps-docs-pending-master-md-8969 | P2 | open | Bugs | \| TODO/FIXME in API \| 0 \| ✅ \| Clean codebase \| | docs/PENDING_MASTER.md:8969:8969 |
| todo-fixme-api-0-clean-next-steps-docs-pending-master-md-8932 | P2 | open | Bugs | \| **TODO/FIXME (API)** \| 0 \| ✅ Clean \| | docs/PENDING_MASTER.md:8932:8932 |
| latest-commit-pending-ready-triage-fixes-next-steps-docs-pending-master-md-8864 | P2 | open | Bugs | \| **Latest Commit** \| pending \| ✅ Ready \| triage fixes \| | docs/PENDING_MASTER.md:8864:8864 |
| missing-tests-missing-tests-docs-pending-master-md-8609 | P2 | open | Bugs | **Missing tests** | docs/PENDING_MASTER.md:8609:8609 |
| id-module-routes-tests-gap-priority-missing-tests-docs-pending-master-md-8416 | P2 | open | Bugs | \| ID \| Module \| Routes \| Tests \| Gap \| Priority \| | docs/PENDING_MASTER.md:8416:8416 |
| branch-docs-pending-v60-active-stable-missing-tests-docs-pending-master-md-8290 | P2 | open | Bugs | \| **Branch** \| `docs/pending-v60` \| ✅ Active \| Stable \| | docs/PENDING_MASTER.md:8290:8290 |
| missing-tests-6-missing-tests-docs-pending-master-md-8117 | P2 | open | Bugs | Missing Tests: 6 | docs/PENDING_MASTER.md:8117:8117 |
| total-pending-10-missing-tests-docs-pending-master-md-8109 | P2 | open | Bugs | \| Total Pending \| 10 \| | docs/PENDING_MASTER.md:8109:8109 |
| total-open-9-was-8-missing-tests-docs-pending-master-md-8027 | P2 | open | Bugs | \| Total Open \| 9 (was 8) \| | docs/PENDING_MASTER.md:8027:8027 |
| pending-9-8-1-missing-tests-docs-pending-master-md-7982 | P2 | open | Bugs | \| Pending \| 9 \| 8 \| -1 \| | docs/PENDING_MASTER.md:7982:7982 |
| 0-open-prs-remaining-missing-tests-docs-pending-master-md-7893 | P2 | open | Bugs | **0 open PRs remaining** | docs/PENDING_MASTER.md:7893:7893 |
| remaining-open-items-11-missing-tests-docs-pending-master-md-7868 | P2 | open | Bugs | **Remaining Open Items (11):** | docs/PENDING_MASTER.md:7868:7868 |
| total-open-13-11-2-missing-tests-docs-pending-master-md-7862 | P2 | open | Bugs | \| Total Open \| 13 \| 11 \| -2 ✅ \| | docs/PENDING_MASTER.md:7862:7862 |
| remaining-open-items-10-missing-tests-docs-pending-master-md-7825 | P2 | open | Bugs | **Remaining Open Items (10):** | docs/PENDING_MASTER.md:7825:7825 |
| total-open-13-10-3-missing-tests-docs-pending-master-md-7819 | P2 | open | Bugs | \| Total Open \| 13 \| 10 \| -3 ✅ \| | docs/PENDING_MASTER.md:7819:7819 |
| todo-fixme-0-found-in-api-routes-bugs-docs-pending-master-md-7638 | P2 | open | Bugs | TODO/FIXME: 0 found in API routes | docs/PENDING_MASTER.md:7638:7638 |
| branch-docs-pending-v60-bugs-docs-pending-master-md-7618 | P2 | open | Bugs | **Branch:** docs/pending-v60 | docs/PENDING_MASTER.md:7618:7618 |
| context-docs-pending-v60-e07cbbf35-no-pr-bugs-docs-pending-master-md-7550 | P2 | open | Bugs | **Context:** docs/pending-v60 \| e07cbbf35 \| no PR | docs/PENDING_MASTER.md:7550:7550 |
| db-sync-pending-dev-server-offline-bugs-docs-pending-master-md-7463 | P2 | open | Bugs | **DB Sync:** ⏳ PENDING (dev server offline) | docs/PENDING_MASTER.md:7463:7463 |
| gap-from-threshold-35-percentage-points-bugs-docs-pending-master-md-7372 | P2 | open | Bugs | **Gap from threshold:** 35 percentage points | docs/PENDING_MASTER.md:7372:7372 |
| return-403-if-orgid-missing-or-invalid-bugs-docs-pending-master-md-7337 | P2 | open | Bugs | Return 403 if orgId missing or invalid | docs/PENDING_MASTER.md:7337:7337 |
| status-open-blocker-for-all-prs-bugs-docs-pending-master-md-7163 | P2 | open | Bugs | Status: **OPEN** (blocker for all PRs) | docs/PENDING_MASTER.md:7163:7163 |
| tests-unit-tests-pending-for-cart-orders-routes-bugs-docs-pending-master-md-6955 | P2 | open | Bugs | ⏳ Tests: Unit tests pending for cart/orders routes | docs/PENDING_MASTER.md:6955:6955 |
| start-api-server-for-db-import-efficiency-docs-pending-master-md-6685 | P2 | open | Efficiency | Start API server for DB import | docs/PENDING_MASTER.md:6685:6685 |
| 401-403-missing-tenant-scope-orgid-missing-tests-docs-pending-master-md-6607 | P2 | open | Bugs | 401/403 missing tenant scope (orgId) | docs/PENDING_MASTER.md:6607:6607 |
| commit-pending-push-efficiency-docs-pending-master-md-6287 | P2 | open | Efficiency | **Commit:** pending-push | docs/PENDING_MASTER.md:6287:6287 |
| commit-pending-push-2-files-changed-efficiency-docs-pending-master-md-6280 | P2 | open | Efficiency | **Commit:** pending-push (2 files changed) | docs/PENDING_MASTER.md:6280:6280 |
| open-19-efficiency-docs-pending-master-md-6227 | P2 | open | Efficiency | open=19 | docs/PENDING_MASTER.md:6227:6227 |
| pending-user-action-missing-tests-docs-pending-master-md-5548 | P2 | open | Bugs | **⚠️ Pending User Action:** | docs/PENDING_MASTER.md:5548:5548 |
| returns-400-when-orgid-is-missing-missing-tests-docs-pending-master-md-5229 | P2 | open | Bugs | ✓ returns 400 when orgId is missing | docs/PENDING_MASTER.md:5229:5229 |
| dependabot-alerts-0-open-missing-tests-docs-pending-master-md-3999 | P2 | open | Bugs | \| Dependabot Alerts \| 0 open ✅ \| | docs/PENDING_MASTER.md:3999:3999 |
| open-prs-0-missing-tests-docs-pending-master-md-3944 | P2 | open | Bugs | \| Open PRs \| 0 ✅ \| | docs/PENDING_MASTER.md:3944:3944 |
| 3-remaining-open-items-confirmed-missing-tests-docs-pending-master-md-3878 | P2 | open | Bugs | **3. Remaining Open Items (Confirmed):** | docs/PENDING_MASTER.md:3878:3878 |
| id-area-evidence-gap-logic-errors-docs-pending-master-md-3782 | P2 | open | Bugs | \| ID \| Area \| Evidence \| Gap \| | docs/PENDING_MASTER.md:3782:3782 |
| open-0-items-efficiency-docs-pending-master-md-3393 | P2 | open | Efficiency | 🔴 Open: 0 items | docs/PENDING_MASTER.md:3393:3393 |
| backlog-0-open-efficiency-docs-pending-master-md-3291 | P2 | open | Efficiency | \| Backlog \| ✅ 0 open \| | docs/PENDING_MASTER.md:3291:3291 |
| open-0-efficiency-docs-pending-master-md-3182 | P2 | open | Efficiency | \| 🔴 Open \| **0** \| | docs/PENDING_MASTER.md:3182:3182 |
| todo-fixme-inventory-17-items-efficiency-docs-pending-master-md-3090 | P2 | open | Efficiency | **TODO/FIXME Inventory (17 items):** | docs/PENDING_MASTER.md:3090:3090 |
| todos-documented-17-items-next-steps-docs-pending-master-md-2954 | P2 | open | Bugs | \| TODOs documented \| 17 items \| | docs/PENDING_MASTER.md:2954:2954 |
| open-issues-p1-require-attention-next-steps-docs-pending-master-md-2909 | P2 | open | Bugs | **🔴 Open Issues (P1 - Require Attention):** | docs/PENDING_MASTER.md:2909:2909 |
| context-main-commit-pending-next-steps-docs-pending-master-md-2817 | P2 | open | Bugs | **Context:** main \| Commit: pending | docs/PENDING_MASTER.md:2817:2817 |
| vercel-awaiting-needs-project-access-next-steps-docs-pending-master-md-2379 | P2 | open | Bugs | \| ⏳ Vercel \| AWAITING \| Needs project access \| | docs/PENDING_MASTER.md:2379:2379 |
| merge-pr-601-after-ci-passes-next-steps-docs-pending-master-md-2231 | P2 | open | Bugs | Merge PR #601 after CI passes | docs/PENDING_MASTER.md:2231:2231 |
| merge-pr-601-after-all-ci-checks-pass-next-steps-docs-pending-master-md-2182 | P2 | open | Bugs | Merge PR #601 after all CI checks pass | docs/PENDING_MASTER.md:2182:2182 |
| address-remaining-pr-601-review-comments-next-steps-docs-pending-master-md-2181 | P2 | open | Bugs | Address remaining PR #601 review comments | docs/PENDING_MASTER.md:2181:2181 |
| zatca-seller-address-pending-user-action-next-steps-docs-pending-master-md-1778 | P2 | open | Bugs | \| \| ZATCA_SELLER_ADDRESS \| ⏳ Pending (user action) \| | docs/PENDING_MASTER.md:1778:1778 |
| zatca-vat-number-pending-user-action-next-steps-docs-pending-master-md-1777 | P2 | open | Bugs | \| \| ZATCA_VAT_NUMBER \| ⏳ Pending (user action) \| | docs/PENDING_MASTER.md:1777:1777 |
| zatca-seller-name-pending-user-action-next-steps-docs-pending-master-md-1776 | P2 | open | Bugs | \| \| ZATCA_SELLER_NAME \| ⏳ Pending (user action) \| | docs/PENDING_MASTER.md:1776:1776 |
| zatca-zatca-api-key-pending-user-action-next-steps-docs-pending-master-md-1775 | P2 | open | Bugs | \| **ZATCA** \| ZATCA_API_KEY \| ⏳ Pending (user action) \| | docs/PENDING_MASTER.md:1775:1775 |
| zatca-pending-user-configuration-next-steps-docs-pending-master-md-1751 | P2 | open | Bugs | \| **ZATCA** \| ⏳ Pending user configuration \| | docs/PENDING_MASTER.md:1751:1751 |
| open-prs-none-gh-pr-list-state-open-next-steps-docs-pending-master-md-1687 | P2 | open | Bugs | \| Open PRs \| ✅ None \| `gh pr list --state open` \| | docs/PENDING_MASTER.md:1687:1687 |
| after-codex-approval-deploy-to-production-next-steps-docs-pending-master-md-1458 | P2 | open | Bugs | After Codex approval, deploy to production | docs/PENDING_MASTER.md:1458:1458 |
| create-pr-for-review-next-steps-docs-pending-master-md-1457 | P2 | open | Bugs | Create PR for review | docs/PENDING_MASTER.md:1457:1457 |
| context-main-pending-commit-missing-tests-docs-pending-master-md-1405 | P2 | open | Bugs | **Context:** main \| (pending commit) | docs/PENDING_MASTER.md:1405:1405 |
| 617-sub-pr-open-missing-tests-docs-pending-master-md-1336 | P2 | open | Bugs | \| #617 \| (sub-PR) \| Open \| | docs/PENDING_MASTER.md:1336:1336 |
| 614-sub-pr-open-missing-tests-docs-pending-master-md-1335 | P2 | open | Bugs | \| #614 \| (sub-PR) \| Open \| | docs/PENDING_MASTER.md:1335:1335 |
| 613-sub-pr-open-missing-tests-docs-pending-master-md-1334 | P2 | open | Bugs | \| #613 \| (sub-PR) \| Open \| | docs/PENDING_MASTER.md:1334:1334 |
| status-set-handoff-pending-missing-tests-docs-pending-master-md-1307 | P2 | open | Bugs | │  Status Set: handoff_pending                                            │ | docs/PENDING_MASTER.md:1307:1307 |
| pr-611-open-ready-for-review-missing-tests-docs-pending-master-md-1295 | P2 | open | Bugs | \| PR #611 \| ✅ Open, ready for review \| | docs/PENDING_MASTER.md:1295:1295 |
| status-open-awaiting-review-logic-errors-docs-pending-master-md-1221 | P2 | open | Bugs | **Status:** Open, awaiting review | docs/PENDING_MASTER.md:1221:1221 |
| id-gap-current-target-effort-logic-errors-docs-pending-master-md-729 | P2 | open | Bugs | \| ID \| Gap \| Current \| Target \| Effort \| | docs/PENDING_MASTER.md:729:729 |
| distributed-tracing-opentelemetry-logic-errors-docs-pending-master-md-396 | P2 | open | Bugs | Distributed tracing (OpenTelemetry) | docs/PENDING_MASTER.md:396:396 |
| structured-logging-opentelemetry-logic-errors-docs-pending-master-md-295 | P2 | open | Bugs | ☑ Structured logging (OpenTelemetry) | docs/PENDING_MASTER.md:295:295 |
| medium-add-tests-for-ip-reputation-ts-testing-30-min-todo-next-steps-ip-reputati | P2 | open | Next Steps | \| 🟡 MEDIUM \| Add tests for ip-reputation.ts \| Testing \| 30 min \| 🔲 TODO \| | ip-reputation.ts |
| medium-add-sentry-context-to-fm-souq-modules-todo-bugs-doc-only | P2 | open | Bugs | \| 🟡 MEDIUM \| Add Sentry context to FM/Souq modules \| 🔲 TODO \| | Doc-only |
| medium-add-try-catch-to-69-api-routes-with-json-parse-todo-bugs-doc-only | P2 | open | Bugs | \| 🟡 MEDIUM \| Add try-catch to 69 API routes with JSON.parse \| 🔲 TODO \| | Doc-only |
| onboardingentities-ts-server-services-medium-0-pending-bugs-onboardingentities-t | P2 | open | Bugs | \| `onboardingEntities.ts` \| server/services/ \| 🟡 MEDIUM \| 0 \| 🔲 Pending \| | onboardingEntities.ts |
| provision-ts-lib-finance-medium-0-pending-bugs-provision-ts | P2 | open | Bugs | \| `provision.ts` \| lib/finance/ \| 🟡 MEDIUM \| 0 \| 🔲 Pending \| | provision.ts |
| decimal-ts-lib-finance-medium-0-pending-bugs-decimal-ts | P2 | open | Bugs | \| `decimal.ts` \| lib/finance/ \| 🟡 MEDIUM \| 0 \| 🔲 Pending \| | decimal.ts |
| recommendation-ts-lib-aqar-medium-0-pending-bugs-recommendation-ts | P2 | open | Bugs | \| `recommendation.ts` \| lib/aqar/ \| 🟡 MEDIUM \| 0 \| 🔲 Pending \| | recommendation.ts |
| pricinginsights-ts-lib-aqar-medium-0-pending-bugs-pricinginsights-ts | P2 | open | Bugs | \| `pricingInsights.ts` \| lib/aqar/ \| 🟡 MEDIUM \| 0 \| 🔲 Pending \| | pricingInsights.ts |
| p2-audit-unprotected-async-void-operations-1-hr-todo-next-steps-doc-only | P2 | open | Next Steps | \| 🟢 P2 \| Audit unprotected async void operations \| 1 hr \| 🔲 TODO \| | Doc-only |
| p2-add-tests-for-9-services-without-coverage-4-hrs-todo-next-steps-doc-only | P2 | open | Next Steps | \| 🟢 P2 \| Add tests for 9 services without coverage \| 4 hrs \| 🔲 TODO \| | Doc-only |
| p2-expand-rate-limit-coverage-to-50-4-hrs-todo-next-steps-doc-only | P2 | open | Next Steps | \| 🟢 P2 \| Expand rate limit coverage to 50%+ \| 4 hrs \| 🔲 TODO \| | Doc-only |
| p2-11-audit-21-console-statements-todo-30-min-bugs-doc-only | P2 | open | Bugs | \| 🟢 P2-11 \| Audit 21 console statements \| 🔲 TODO \| 30 min \| | Doc-only |
| p2-10-increase-rate-limiting-coverage-34-60-todo-2-hrs-missing-tests-doc-only | P2 | open | Missing Tests | \| 🟢 P2-10 \| Increase rate limiting coverage (34% → 60%) \| 🔲 TODO \| 2 hrs \| | Doc-only |
| pricing-ts-lib-finance-medium-needs-unit-tests-missing-tests-pricing-ts | P2 | open | Missing Tests | \| `pricing.ts` \| lib/finance/ \| 🟡 MEDIUM \| 🔲 Needs unit tests \| | pricing.ts |
| p2-zod-validation-expansion-4-hrs-241-routes-need-schemas-todo-next-steps-doc-on | P2 | open | Next Steps | \| 🟡 P2 \| Zod validation expansion \| 4 hrs \| 241 routes need schemas \| 🔲 TODO \| | Doc-only |
| p2-api-tests-hr-module-7-routes-1-hr-test-coverage-todo-next-steps-doc-only | P2 | open | Next Steps | \| 🟡 P2 \| API tests: HR module (7 routes) \| 1 hr \| Test coverage \| 🔲 TODO \| | Doc-only |
| p2-api-tests-aqar-module-16-routes-2-hrs-test-coverage-todo-next-steps-doc-only | P2 | open | Next Steps | \| 🟡 P2 \| API tests: Aqar module (16 routes) \| 2 hrs \| Test coverage \| 🔲 TODO \| | Doc-only |
| p2-add-try-catch-to-json-parse-4-files-15-min-error-handling-todo-next-steps-doc | P2 | open | Next Steps | \| 🟡 P2 \| Add try-catch to JSON.parse (4 files) \| 15 min \| Error handling \| 🔲 TODO \| | Doc-only |
| p2-rate-limiting-finance-11-routes-30-min-financial-data-todo-next-steps-doc-onl | P2 | open | Next Steps | \| 🟡 P2 \| Rate limiting: Finance (11 routes) \| 30 min \| Financial data \| 🔲 TODO \| | Doc-only |
| projects-route-ts-72-medium-needs-try-catch-bugs-projects-route-ts | P2 | open | Bugs | \| `projects/route.ts` \| 72 \| Medium \| Needs try-catch \| | projects/route.ts |
| copilot-chat-route-ts-117-medium-needs-try-catch-bugs-copilot-chat-route-ts | P2 | open | Bugs | \| `copilot/chat/route.ts` \| 117 \| Medium \| Needs try-catch \| | copilot/chat/route.ts |
| missing-tests-no-coverage-for-admin-notification-config-test-routes-or-support-i | P2 | open | Missing Tests | \| Missing Tests \| No coverage for admin notification config/test routes or support impersonation auth path \| 🟡 Medium \| Add unit tests validating auth paths, rate limiting, and happy-path responses f | Doc-only |
| missing-zod-validation-232-routes-p2-6h-bugs-doc-only | P2 | open | Bugs | \| Missing Zod Validation \| 232 routes \| P2 \| 6h \| | Doc-only |
| missing-zod-validation-231-routes-p2-6h-bugs-doc-only | P2 | open | Bugs | \| Missing Zod Validation \| 231 routes \| P2 \| 6h \| | Doc-only |
| p2-fm-tests-17-3h-todo-missing-tests-doc-only | P2 | open | Missing Tests | \| **P2** \| FM tests (+17) \| 3h \| 🟡 TODO \| | Doc-only |
| p2-002-validation-118-routes-missing-zod-validation-backlog-add-schemas-bugs-doc | P2 | open | Bugs | \| P2-002 \| Validation \| ~118 routes \| Missing Zod validation \| 🟡 Backlog \| Add schemas \| | Doc-only |
| 4-investigate-refresh-replay-test-ts-failure-p2-2-hours-missing-tests-refresh-re | P2 | open | Missing Tests | 4. Investigate `refresh.replay.test.ts` failure (P2, 2 hours) | refresh.replay.test.ts |
| f2-aggregate-wrapper-p2-created-1-pending-bugs-doc-only | P2 | open | Bugs | \| F2 (Aggregate wrapper) \| P2 \| ✅ CREATED \| 1 \| Pending \| | Doc-only |
| BUG-AUDITLOGS-FILTERS-MISSING | P2 | open | Bugs | AuditLogsList filters not wired to query params | components/administration/AuditLogsList.tsx |
| BUG-INVOICES-FILTERS-MISSING | P2 | open | Bugs | InvoicesList filters not wired to query params | components/finance/InvoicesList.tsx |
| BUG-EMPLOYEES-FILTERS-MISSING | P2 | open | Bugs | EmployeesList filters not wired to query params | components/hr/EmployeesList.tsx |
| BUG-USERS-FILTERS-MISSING | P2 | open | Bugs | UsersList filters not wired to query params | components/administration/UsersList.tsx |
| TASK-1025 | P2 | in_progress | Next Steps | Push TopBar fix to main | Doc-only |
| TASK-0642 | P2 | in_progress | Next Steps | 139/352 (39%) | Doc-only |
| TASK-0545 | P2 | in_progress | Next Steps | 147/352 (42%) | Doc-only |
| in-progress-smoke-suite-rerun-pnpm-test-e2e-project-smoke-attempts-timed-out-cop | P2 | in_progress | Next Steps | In Progress: Smoke suite rerun (pnpm test:e2e -- --project smoke) — attempts timed out; Copilot STRICT specs still failing in full `pnpm test` run (see console for copilot.spec failures). | Doc-only |
| TASK-0256 | P2 | in_progress | Next Steps | Souq KYC submit tests; FM finance expenses tests | Doc-only |
| TASK-0218 | P2 | in_progress | Next Steps | TBD | Doc-only |
| test-005 | P2 | in_progress | Missing Tests | TEST-005: Aqar test coverage (in progress) | decimal.ts |
| P3-SOUQ-PRODUCTS | P2 | in_progress | Bugs | \| P3-SOUQ-PRODUCTS \| P3 \| In Progress \| M \| Souq Products migration \| | docs/PENDING_MASTER.md:2550 |
| P3-AQAR-FILTERS | P2 | in_progress | Efficiency | \| P3-AQAR-FILTERS \| P3 \| In Progress \| M \| Aqar SearchFilters refactor \| | docs/PENDING_MASTER.md:2549 |
| in-progress-missing-tests-docs-pending-master-md-4176 | P2 | in_progress | Bugs | **🟠 In Progress:** | docs/PENDING_MASTER.md:4176:4176 |
| BUG-0005 | P2 | in_progress | Bugs | Verification gate failures across compliance, superadmin, finance, and jobs tests | services/compliance/contract-lifecycle.ts:1150 |
| HIGH-002 | P2 | blocked | Next Steps | **User Actions**: 2 (Payment keys HIGH-002, GitHub quota QUOTA-001) | Doc-only |
| TASK-0942 | P2 | blocked | Next Steps | Only user action remaining: PayTabs env config | Doc-only |
| TASK-0933 | P2 | blocked | Next Steps | [ ] PayTabs production keys: User action required | Doc-only |
| P0-2 | P2 | blocked | Bugs | \| ≡ƒö┤ P0-2 \| Configure Taqnyat env vars in Vercel \| 15 min \| ΓÅ│ \| DevOps access \| | fix/graphql-resolver-todos |
| blocked-all-javascript-event-handlers-onclick-onerror-etc-script-tags-iframe-etc | P2 | blocked | Next Steps | **Blocked**: All JavaScript event handlers (onclick, onerror, etc.), script tags, iframe, etc. | Doc-only |
| TASK-0142 | P2 | blocked | Next Steps | Baseline 99.8% | Doc-only |
| TASK-0128 | P2 | blocked | Next Steps | None (DB sync blocked; create `billing-history-missing-org-returns-401` when Mongo available). | Doc-only |
| TASK-0127 | P2 | blocked | Next Steps | billing-history-missing-org-returns-401 — blocker: MongoDB SSOT sync unavailable; failing suite expects 400, got 401 (`tests/api/billing/history.route.test.ts:57-65`). | tests/api/billing/history.route.test.ts:57-65 |
| blocker-001 | P2 | blocked | Missing Tests | **BLOCKER-001:** Vercel build failing (webpack "Module not found") - Needs investigation | Doc-only |
| TASK-0031 | P2 | blocked | Next Steps | ⏳ Pending (user action) | Doc-only |
| TASK-0030 | P2 | blocked | Next Steps | ZATCA_API_KEY | Doc-only |
| TASK-1011 | P3 | open | Next Steps | **18 Low**: Documentation, minor refactoring | Doc-only |
| TASK-0898 | P3 | open | Next Steps | Delete 32 PayTabs files (lib, config, routes, tests, scripts, docs) | Doc-only |
| TASK-0883 | P3 | open | Next Steps | `docs/inventory/paytabs-duplicates.md` | docs/inventory/paytabs-duplicates.md |
| pr-537 | P3 | open | Next Steps | **PR-537** | Doc-only |
| TASK-1110 | P3 | open | Next Steps | **Coverage gap**: Existing billing tests cover subscribe/upgrade/history only. Finance coverage is limited to payments/invoices happy paths; no tests for quote, Tap checkout, accounts/expenses/jour... | Doc-only |
| TASK-0822 | P3 | open | Next Steps | **Impact:** Reintroduces forbidden SQL/Prisma stack; violates kill-on-sight policy and contradicts prior cleanup claims. | Doc-only |
| TASK-0795 | P3 | open | Next Steps | Remove 7 TODO comments in lib/graphql | Doc-only |
| TASK-0736 | P3 | open | Next Steps | Add error boundaries (+8 dirs) | Doc-only |
| TASK-0700 | P3 | open | Next Steps | Expand rate limiting to 60% | Doc-only |
| TASK-0699 | P3 | open | Next Steps | Add tests for 6 services | Doc-only |
| TASK-0680 | P3 | open | Next Steps | System-wide scan docs | Doc-only |
| TASK-0666 | P3 | open | Next Steps | Remaining service tests | Doc-only |
| TASK-0665 | P3 | open | Next Steps | Error boundaries for subpages | Doc-only |
| TASK-0655 | P3 | open | Next Steps | Review 29 TODO/FIXME comments | Doc-only |
| TASK-0630 | P3 | open | Next Steps | `app/docs/error.tsx` | app/docs/error.ts |
| TASK-0603 | P3 | open | Next Steps | **P3**: Add rate limiting to remaining modules (marketplace, copilot, ats) | Doc-only |
| TASK-0019 | P3 | open | Next Steps | docs(pending): v17.0 | Doc-only |
| TASK-0018 | P3 | open | Next Steps | docs(pending): v18.0 | Doc-only |
| TASK-0499 | P3 | open | Next Steps | Unknown | Doc-only |
| pr-001 | P3 | open | Next Steps | Stale PRs | Doc-only |
| GQL-001 | P3 | open | Next Steps | \| GQL-001 \| Tenant Isolation \| 3 resolvers \| GraphQL Query org guard gaps \| 1h \| | docs/PENDING_MASTER.md:16755 |
| ran-repo-wide-rg-n-hardcod-sweep-across-app-lib-scripts-docs-to-re-confirm-remai | P3 | open | Next Steps | Ran repo-wide `rg -n "hardcod"` sweep across app/lib/scripts/docs to re-confirm remaining hardcoded risks; no new code changes applied. | Doc-only |
| TASK-0437 | P3 | open | Next Steps | [x] Memory Safety: All intervals have cleanup | Doc-only |
| TASK-0433 | P3 | open | Next Steps | `components/careers/JobApplicationForm.tsx` - useEffect cleanup ✅ | components/careers/JobApplicationForm.ts |
| TASK-0432 | P3 | open | Next Steps | `components/admin/sms/ProviderHealthDashboard.tsx` - useEffect cleanup ✅ | components/admin/sms/ProviderHealthDashboard.ts |
| TASK-0431 | P3 | open | Next Steps | `components/fm/WorkOrderAttachments.tsx` - useEffect cleanup ✅ | components/fm/WorkOrderAttachments.ts |
| TASK-0429 | P3 | open | Next Steps | `components/SLATimer.tsx` - return cleanup ✅ | components/SLATimer.ts |
| TASK-0428 | P3 | open | Next Steps | `dashboard/hr/recruitment/page.tsx` - useEffect cleanup ✅ | dashboard/hr/recruitment/page.ts |
| TASK-0427 | P3 | open | Next Steps | `admin/route-metrics/page.tsx` - useEffect cleanup ✅ | admin/route-metrics/page.ts |
| DBERR-001 | P3 | open | Bugs | \| SOUQ-CLAIM-DBERR-001 \| Correctness \| `app/api/souq/claims/[id]/route.ts` \| Order/user lookups use `.catch(() => null)` and return 404 on any DB error. \| Operational errors become false "not found",  | /route.ts |
| CONFIG-001 | P3 | open | Bugs | \| TENANT-CONFIG-001 \| Reliability \| `lib/config/tenant.server.ts` \| Catches all errors and silently returns defaults for tenant config (no logging/telemetry). \| Tenant-specific features/branding silen | lib/config/tenant.server.ts |
| TASK-0416 | P3 | open | Next Steps | `docs/pending-v59` | Doc-only |
| TASK-1118 | P3 | open | Next Steps | **Silent auth/session failures** — `getSessionUser(...).catch(() => null)` recurs in upload flows (`app/api/upload/presigned-url/route.ts`, `app/api/upload/scan/route.ts`, `app/api/upload/scan-stat... | app/api/upload/presigned-url/route.ts |
| JSON-001 | P3 | open | Bugs | **SILENT-HELP-JSON-001 (Moderate)** — `app/api/help/escalate/route.ts`: Malformed JSON creates tickets with missing context and no logging. | app/api/help/escalate/route.ts |
| bug-1528 | P3 | open | Bugs | 🟡 Medium | docs/analysis/COMPREHENSIVE_DEPLOYMENT_AUDIT.md:177-180 |
| TASK-0354 | P3 | open | Next Steps | Not run (docs-only update) | Doc-only |
| TASK-0351 | P3 | open | Next Steps | ✅ Pushed all commits to `docs/pending-v60` (HEAD: `d8aa6a892`) | Doc-only |
| TASK-0350 | P3 | open | Next Steps | ✅ Committed 12 commits (utility files, tests, API fixes, services, docs) | Doc-only |
| FM-19 | P3 | open | Missing Tests | \| TEST-FM-19 \| FM module \| 19 routes missing coverage \| 🟠 P1 \| | docs/PENDING_MASTER.md:10540 |
| ADMIN-26 | P3 | open | Missing Tests | \| TEST-ADMIN-26 \| Admin module \| 26 routes missing coverage \| 🟠 P1 \| | docs/PENDING_MASTER.md:10539 |
| SOUQ-51 | P3 | open | Missing Tests | \| TEST-SOUQ-51 \| Souq module \| 51 routes missing coverage \| 🟠 P1 \| | docs/PENDING_MASTER.md:10538 |
| COVERAGE-001 | P3 | open | Missing Tests | \| P3 \| COVERAGE-001 \| 10+ admin routes missing tests \| Various \| Backlog \| | docs/PENDING_MASTER.md:9522 |
| TASK-0196 | P3 | open | Next Steps | Configure OTP env var or disable bypass | Doc-only |
| CONFIG-002 | P3 | open | Bugs | **CONFIG-002 Ã¢â‚¬â€ NEXTAUTH_SECRET missing in Vercel production** | docs/PENDING_MASTER.md:8046 |
| doc-110 | P3 | open | Documentation | DOC-110 — Missing deployment checklist for backlog tracker — P3, Effort: XS | Doc-only |
| doc-107 | P3 | open | Documentation | DOC-107 — Missing TypeScript interface documentation for BacklogIssue types — P3, Effort: XS | Doc-only |
| TASK-0116 | P3 | open | Next Steps | **P3**: Clean up nested project folders (Fixzit/, Fixzit-fresh/, Fixzit-tenant/) | Doc-only |
| TASK-0094 | P3 | open | Next Steps | CodeRabbit Toast docs: **Nitpick** (non-blocking) | Doc-only |
| TASK-0081 | P3 | open | Next Steps | `scripts/cleanup-test-users.ts` — TEST_ORG_ID env var support | scripts/cleanup-test-users.ts |
| VENDOR-001 | P3 | open | Bugs | \| SA-VENDOR-001 \| Vendors missing B2B/B2C capability badges \| Add businessCapabilities field \| Ã¢ÂÂ³ PENDING \| | docs/PENDING_MASTER.md:1174 |
| EMAIL-001 | P3 | open | Bugs | \| SA-EMAIL-001 \| No email template management \| CRUD for transactional email templates \| Ã¢ÂÂ³ PENDING \| | docs/PENDING_MASTER.md:1167 |
| QUOTA-001 | P3 | open | Bugs | \| SA-QUOTA-001 \| No tenant quota management \| Storage, users, API calls per tenant \| Ã¢ÂÂ³ PENDING \| | docs/PENDING_MASTER.md:1164 |
| DASH-001 | P3 | open | Bugs | \| SA-DASH-001 \| No superadmin dashboard overview \| Need system health, module status, recent activity \| Ã¢ÂÂ³ PENDING \| | docs/PENDING_MASTER.md:1163 |
| DOC-0104 | P3 | open | Documentation | Missing acceptance criteria / SSOT linkage for public tour changes | app/api/fm/properties/[id]/tour/route.ts:1-1 |
| PR-001 | P3 | open | Next Steps | \| PR-001 \| Stale PRs \| 6 \| 🟡 Needs cleanup \| | docs/PENDING_MASTER.md:16764 |
| GQL-002 | P3 | open | Next Steps | \| GQL-002 \| Incomplete \| 2 resolvers \| TODO stubs in property/invoice \| 30m \| | docs/PENDING_MASTER.md:16756 |
| VAL-001 | P3 | open | Next Steps | \| VAL-001 \| Input Validation \| 236 routes \| Missing Zod validation schemas \| 4h \| | docs/PENDING_MASTER.md:16754 |
| LOGIC-005 | P3 | open | Bugs | \| LOGIC-005 \| 20+ upload/help/onboarding routes \| Auth failure treated as 401 (masks 503 infra errors) \| Apply `getSessionOrError` wrapper \| 🔴 TODO \| | docs/PENDING_MASTER.md:12185 |
| BUG-007 | P3 | open | Bugs | \| BUG-007 \| 🟡 Medium \| 9 uncommitted files \| Previous session changes not yet committed \| 🔴 TODO \| | docs/PENDING_MASTER.md:12180 |
| BUG-006 | P3 | open | Bugs | \| BUG-006 \| 🟠 High \| 20+ routes \| `getSessionUser(...).catch(() => null)` masks auth infra failures as 401 \| 🔴 TODO \| | docs/PENDING_MASTER.md:12179 |
| LOGIC-021 | P3 | open | Logic Errors | \| LOGIC-021 \| Secrets guard scope \| `tests/unit/security/banned-literals.test.ts` ignores `docs/**`, leaving documented literals unsanitized. \| Add docs scrub task or broaden guard with a sanitized al | tests/unit/security/banned-literals.test.ts |
| LOGIC-020 | P3 | open | Efficiency | \| LOGIC-020 \| Souq rule consumption \| Missing central getter in fulfillment/pricing flows means overrides/telemetry not applied. \| Refactor to call `getSouqRuleConfig(orgId)` everywhere and delete loc | docs/PENDING_MASTER.md:12108 |
| BUG-1528 | P3 | open | Bugs | \| BUG-1528 \| 🟡 Medium \| Repo docs (e.g., docs/analysis/COMPREHENSIVE_DEPLOYMENT_AUDIT.md:177-180; docs/fixes/DEPLOYMENT_FIX_STEP_BY_STEP.md:275-286) \| Live credentials remain in documentation; code g | e.g |
| BUG-1527 | P3 | open | Bugs | \| BUG-1527 \| 🟠 High \| Souq fulfillment/pricing \| Still bypass shared rules (no `getSouqRuleConfig` usage), risking inconsistent return/fraud windows. \| 🔴 TODO \| | docs/PENDING_MASTER.md:12102 |
| PAY-001 | P3 | open | Bugs | \| BUG-PAY-001 \| `payments/tap/checkout/route.ts:251` \| localhost:3000 fallback \| 🟠 P1 \| ⏳ Pending \| | payments/tap/checkout/route.ts:251 |
| EFF-003 | P3 | open | Efficiency | \| EFF-003 \| `app/api/fm/finance/budgets/route.ts:135-143` \| Missing compound index \| Add `{ orgId, unitId, department }` \| 🟠 P1 \| | app/api/fm/finance/budgets/route.ts:135-143 |
| CART-001 | P3 | open | Bugs | \| BUG-CART-001 \| `marketplace/cart/route.ts` \| Missing zodValidationError \| P1 \| NEW \| | marketplace/cart/route.ts |
| TEST-001 | P3 | open | Bugs | P3 Pending | docs/PENDING_MASTER.md |
| DOC-110 | P3 | open | Bugs | DOC-110 Ã¢â‚¬â€ Missing deployment checklist for backlog tracker Ã¢â‚¬â€ P3, Effort: XS | docs/PENDING_MASTER.md:7451 |
| BLOCKER-001 | P3 | open | Bugs | **BLOCKER-001:** Vercel build failing (webpack "Module not found") - Needs investigation | docs/PENDING_MASTER.md:4286 |
| TEST-TEST-001 | P3 | open | tests | P3 Pending | docs/PENDING_MASTER.md |
| p3-aqar-souq-bug-docs-pending-master-md | P3 | open | Bugs | P3: Aqar/Souq | docs/PENDING_MASTER.md |
| sourceref-code-review-openapi-yaml-n-a-bugs-openapi-yaml | P3 | open | Bugs | sourceRef: code-review:openapi.yaml:N/A | openapi.yaml |
| if-env-has-openai-key-true-efficiency-env-has | P3 | open | Efficiency | `if: env.HAS_OPENAI_KEY == 'true'` | env.HAS |
| has-openai-key-secrets-openai-key-efficiency-secrets-openai | P3 | open | Efficiency | `HAS_OPENAI_KEY: \${{ secrets.OPENAI_KEY != '' }}` | secrets.OPENAI |
| CRM-001 | P3 | open | Bugs | **cf04061f1** - `fix(crm): Add missing tenant scope to accounts/share route (SEC-CRM-001)` | docs/PENDING_MASTER.md:5713 |
| multi-select-checkboxes-with-counts-e-g-open-12-missing-tests-e-g | P3 | open | Bugs | Multi-select checkboxes with counts (e.g., "Open (12)") | e.g |
| docs-pending-master-md-this-entry-efficiency-docs-pending-master-md | P3 | open | Efficiency | docs/PENDING_MASTER.md (this entry) | docs/PENDING_MASTER.md |
| 13-9-pending-master-update-this-entry-next-steps-13-9 | P3 | open | Bugs | \| 13.9 \| PENDING_MASTER Update \| Ã¢Å“â€¦ This entry \| | 13.9 |
| SERVICE-001 | P3 | open | Bugs | \| SA-SERVICE-001 \| FM Services not in catalog \| Separate Products vs Services tabs \| Ã¢ÂÂ³ PENDING \| | docs/PENDING_MASTER.md:1176 |
| CATALOG-001 | P3 | open | Bugs | \| SA-CATALOG-001 \| Catalog missing businessModel filter \| Add B2B/B2C/B2B2C filter \| Ã¢ÂÂ³ PENDING \| | docs/PENDING_MASTER.md:1175 |
| SCHEDULE-001 | P3 | open | Bugs | \| SA-SCHEDULE-001 \| No scheduled tasks UI \| View/manage cron jobs, scheduled reports \| Ã¢ÂÂ³ PENDING \| | docs/PENDING_MASTER.md:1168 |
| WEBHOOK-001 | P3 | open | Bugs | \| SA-WEBHOOK-001 \| No webhook management UI \| Configure, test, view webhook deliveries \| Ã¢ÂÂ³ PENDING \| | docs/PENDING_MASTER.md:1166 |
| I18N-USER-LOGS-STRINGS | P3 | open | Bugs | Superadmin user logs page has hardcoded UI strings | app/superadmin/user-logs/page.tsx:565 |
| fix-applied-changed-to-require-orgid-and-return-403-when-missing-next-steps-docs-pending-master-md-19578 | P3 | open | Next Steps | **Fix Applied:** Changed to require `orgId` and return 403 when missing. | docs/PENDING_MASTER.md:19578 |
| module-routes-rate-limited-gap-next-steps-docs-pending-master-md-19517 | P3 | open | Next Steps | \| Module \| Routes \| Rate-Limited \| Gap \| | docs/PENDING_MASTER.md:19517 |
| p0-merge-pr-fix-graphql-resolver-todos-5-min-ready-for-review-all-checks-pass-next-steps-docs-pending-master-md-19492 | P3 | open | Next Steps | \| 🔴 P0 \| Merge PR `fix/graphql-resolver-todos` \| 5 min \| Ready for review, all checks pass \| | docs/PENDING_MASTER.md:19492 |
| missing-error-boundary-risk-bugs-docs-pending-master-md-19328 | P3 | open | Bugs | \| Missing Error Boundary \| Risk \| | docs/PENDING_MASTER.md:19328 |
| module-total-routes-validated-gap-priority-efficiency-docs-pending-master-md-19245 | P3 | open | Efficiency | \| Module \| Total Routes \| Validated \| Gap \| Priority \| | docs/PENDING_MASTER.md:19245 |
| missing-error-boundaries-app-ux-20-top-level-routes-lack-error-tsx-bugs-error-tsx | P3 | open | Bugs | \| Missing error boundaries \| `app/*/` \| UX \| 20 top-level routes lack error.tsx \| | error.tsx |
| missing-service-tests-server-services-testing-11-services-lack-unit-tests-efficiency-docs-pending-master-md-19214 | P3 | open | Efficiency | \| Missing service tests \| `server/services/**` \| Testing \| 11 services lack unit tests \| | docs/PENDING_MASTER.md:19214 |
| p2-add-missing-service-tests-3-hrs-11-services-need-tests-next-steps-docs-pending-master-md-19193 | P3 | open | Next Steps | \| 🟡 P2 \| Add missing service tests \| 3 hrs \| 11 services need tests \| | docs/PENDING_MASTER.md:19193 |
| p0-merge-pr-fix-graphql-resolver-todos-5-min-ready-for-review-next-steps-docs-pending-master-md-19190 | P3 | open | Next Steps | \| 🔴 P0 \| Merge PR `fix/graphql-resolver-todos` \| 5 min \| Ready for review \| | docs/PENDING_MASTER.md:19190 |
| services-without-tests-11-gap-see-details-below-missing-tests-docs-pending-master-md-19182 | P3 | open | Missing Tests | \| **Services Without Tests** \| 11 \| 🟡 Gap \| See details below \| | docs/PENDING_MASTER.md:19182 |
| zod-validated-routes-119-352-34-needs-work-233-remaining-missing-tests-docs-pending-master-md-19179 | P3 | open | Missing Tests | \| **Zod-Validated Routes** \| 119/352 (34%) \| 🟡 Needs work \| 233 remaining \| | docs/PENDING_MASTER.md:19179 |
| graphql-security-gaps-1-0-1-missing-tests-docs-pending-master-md-19148 | P3 | open | Missing Tests | \| GraphQL Security Gaps \| 1 \| 0 \| -1 \| | docs/PENDING_MASTER.md:19148 |
| mission-complete-remaining-p3-low-priority-items-from-pending-report-next-steps-docs-pending-master-md-19055 | P3 | open | Next Steps | **Mission**: Complete remaining P3 LOW PRIORITY items from pending report | docs/PENDING_MASTER.md:19055 |
| ux-error-boundaries-core-covered-subpages-pending-bugs-docs-pending-master-md-19034 | P3 | open | Bugs | \| UX - Error Boundaries \| 🟡 \| Core covered, subpages pending \| | docs/PENDING_MASTER.md:19034 |
| security-rate-limiting-14-coverage-needs-work-missing-tests-docs-pending-master-md-19030 | P3 | open | Missing Tests | \| Security - Rate Limiting \| 🔴 \| 14% coverage - needs work \| | docs/PENDING_MASTER.md:19030 |
| service-test-gap-analysis-5-services-need-tests-next-steps-docs-pending-master-md-19004 | P3 | open | Next Steps | \| Service test gap analysis \| 5 services need tests \| ✅ \| | docs/PENDING_MASTER.md:19004 |
| error-boundary-audit-30-core-25-missing-subpages-bugs-docs-pending-master-md-19003 | P3 | open | Bugs | \| Error boundary audit \| 30 core + 25 missing subpages \| ✅ \| | docs/PENDING_MASTER.md:19003 |
| codebase-security-scan-identified-rate-limiting-gaps-next-steps-docs-pending-master-md-19002 | P3 | open | Next Steps | \| Codebase security scan \| Identified rate limiting gaps \| ✅ \| | docs/PENDING_MASTER.md:19002 |
| missing-error-boundaries-high-priority-bugs-docs-pending-master-md-18973 | P3 | open | Bugs | **Missing Error Boundaries** (High Priority): | docs/PENDING_MASTER.md:18973 |
| missing-subpages-25-directories-next-steps-docs-pending-master-md-18971 | P3 | open | Next Steps | **Missing Subpages**: 25+ directories | docs/PENDING_MASTER.md:18971 |
| various-aggregation-pipelines-missing-limit-stage-next-steps-docs-pending-master-md-18956 | P3 | open | Next Steps | Various aggregation pipelines missing $limit stage | docs/PENDING_MASTER.md:18956 |
| souq-fm-mostly-missing-add-immediately-next-steps-docs-pending-master-md-18933 | P3 | open | Next Steps | \| Souq, FM \| Mostly missing \| 🔴 Add immediately \| | docs/PENDING_MASTER.md:18933 |
| status-major-gap-14-coverage-missing-tests-docs-pending-master-md-18925 | P3 | open | Missing Tests | **Status**: 🔴 Major Gap (14% coverage) | docs/PENDING_MASTER.md:18925 |
| total-gap-301-routes-without-rate-limiting-85-next-steps-docs-pending-master-md-18879 | P3 | open | Next Steps | **Total Gap**: 301 routes without rate limiting (85%) | docs/PENDING_MASTER.md:18879 |
| module-total-routes-protected-gap-priority-next-steps-docs-pending-master-md-18869 | P3 | open | Next Steps | \| Module \| Total Routes \| Protected \| Gap \| Priority \| | docs/PENDING_MASTER.md:18869 |
| p3-remaining-service-tests-3-hrs-5-services-todo-next-steps-docs-pending-master-md-18861 | P3 | open | Next Steps | \| 🟢 P3 \| Remaining service tests \| 3 hrs \| 5 services \| 🔲 TODO \| | docs/PENDING_MASTER.md:18861 |
| p3-error-boundaries-for-subpages-2-hrs-25-subpages-todo-bugs-docs-pending-master-md-18860 | P3 | open | Bugs | \| 🟢 P3 \| Error boundaries for subpages \| 2 hrs \| 25+ subpages \| 🔲 TODO \| | docs/PENDING_MASTER.md:18860 |
| p2-zod-validation-expansion-4-hrs-241-routes-need-schemas-todo-next-steps-docs-pending-master-md-18859 | P3 | open | Next Steps | \| 🟡 P2 \| Zod validation expansion \| 4 hrs \| 241 routes need schemas \| 🔲 TODO \| | docs/PENDING_MASTER.md:18859 |
| p1-rate-limiting-admin-module-1-hr-14-routes-need-protection-todo-next-steps-docs-pending-master-md-18858 | P3 | open | Next Steps | \| 🟡 P1 \| Rate limiting: Admin module \| 1 hr \| 14 routes need protection \| 🔲 TODO \| | docs/PENDING_MASTER.md:18858 |
| p1-rate-limiting-fm-module-1-hr-19-routes-need-protection-todo-next-steps-docs-pending-master-md-18857 | P3 | open | Next Steps | \| 🟡 P1 \| Rate limiting: FM module \| 1 hr \| 19 routes need protection \| 🔲 TODO \| | docs/PENDING_MASTER.md:18857 |
| p1-rate-limiting-souq-module-2-hrs-69-routes-need-protection-todo-next-steps-docs-pending-master-md-18856 | P3 | open | Next Steps | \| 🟡 P1 \| Rate limiting: Souq module \| 2 hrs \| 69 routes need protection \| 🔲 TODO \| | docs/PENDING_MASTER.md:18856 |
| p0-close-stale-draft-prs-540-544-10-min-cleanup-todo-next-steps-docs-pending-master-md-18855 | P3 | open | Next Steps | \| 🔴 P0 \| Close stale draft PRs (540-544) \| 10 min \| Cleanup \| 🔲 TODO \| | docs/PENDING_MASTER.md:18855 |
| p0-merge-pr-fix-graphql-resolver-todos-5-min-security-quality-ready-next-steps-docs-pending-master-md-18854 | P3 | open | Next Steps | \| 🔴 P0 \| Merge PR `fix/graphql-resolver-todos` \| 5 min \| Security/Quality \| Ready \| | docs/PENDING_MASTER.md:18854 |
| open-prs-5-all-draft-cleanup-needed-efficiency-docs-pending-master-md-18846 | P3 | open | Efficiency | \| **Open PRs** \| 5 (all draft) \| 🟡 Cleanup needed \| — \| | docs/PENDING_MASTER.md:18846 |
| error-boundaries-30-core-covered-some-subpages-missing-bugs-docs-pending-master-md-18845 | P3 | open | Bugs | \| **Error Boundaries** \| 30 \| ✅ Core covered \| Some subpages missing \| | docs/PENDING_MASTER.md:18845 |
| zod-validated-routes-111-352-32-needs-work-241-remaining-efficiency-docs-pending-master-md-18844 | P3 | open | Efficiency | \| **Zod-Validated Routes** \| 111/352 (32%) \| 🟡 Needs work \| 241 remaining \| | docs/PENDING_MASTER.md:18844 |
| rate-limited-routes-51-352-14-gap-301-unprotected-efficiency-docs-pending-master-md-18843 | P3 | open | Efficiency | \| **Rate-Limited Routes** \| 51/352 (14%) \| 🔴 Gap \| 301 unprotected \| | docs/PENDING_MASTER.md:18843 |
| mission-verify-and-fix-p3-low-priority-items-from-pending-report-next-steps-docs-pending-master-md-18727 | P3 | open | Next Steps | **Mission**: Verify and fix P3 LOW PRIORITY items from pending report | docs/PENDING_MASTER.md:18727 |
| gap-100-deep-subdirectories-low-priority-next-steps-docs-pending-master-md-18649 | P3 | open | Next Steps | **Gap**: ~100 deep subdirectories (low priority) | docs/PENDING_MASTER.md:18649 |
| recommendation-focus-on-admin-16-gaps-and-fm-20-gaps-next-next-steps-docs-pending-master-md-18643 | P3 | open | Next Steps | **Recommendation**: Focus on Admin (16 gaps) and FM (20 gaps) next | docs/PENDING_MASTER.md:18643 |
| missing-error-boundaries-100-deferred-core-routes-covered-30-bugs-docs-pending-master-md-18609 | P3 | open | Bugs | \| Missing error boundaries \| ~100 \| 🟢 Deferred \| Core routes covered (30) \| | docs/PENDING_MASTER.md:18609 |
| module-total-protected-gap-priority-next-steps-docs-pending-master-md-18585 | P3 | open | Next Steps | \| Module \| Total \| Protected \| Gap \| Priority \| | docs/PENDING_MASTER.md:18585 |
| p0-merge-pr-fix-graphql-resolver-todos-5-min-215-rate-limits-security-fixes-ready-next-steps-docs-pending-master-md-18574 | P3 | open | Next Steps | \| 🔴 P0 \| Merge PR `fix/graphql-resolver-todos` \| 5 min \| 215+ rate limits, security fixes \| Ready \| | docs/PENDING_MASTER.md:18574 |
| p0-commit-push-p1-rate-limiting-5-min-44-routes-protected-todo-next-steps-docs-pending-master-md-18573 | P3 | open | Next Steps | \| 🔴 P0 \| Commit & push P1 rate limiting \| 5 min \| 44 routes protected \| 🔲 TODO \| | docs/PENDING_MASTER.md:18573 |
| todo-fixme-comments-29-review-may-contain-valid-work-items-next-steps-docs-pending-master-md-18430 | P3 | open | Next Steps | \| TODO/FIXME comments \| 29 \| 🟡 Review \| May contain valid work items \| | docs/PENDING_MASTER.md:18430 |
| gap-to-target-143-routes-next-steps-docs-pending-master-md-18389 | P3 | open | Next Steps | **Gap to Target**: 143 routes | docs/PENDING_MASTER.md:18389 |
| module-total-protected-gap-priority-action-next-steps-docs-pending-master-md-18369 | P3 | open | Next Steps | \| Module \| Total \| Protected \| Gap \| Priority \| Action \| | docs/PENDING_MASTER.md:18369 |
| p3-review-29-todo-fixme-comments-1-hr-code-quality-deferred-next-steps-docs-pending-master-md-18361 | P3 | open | Next Steps | \| 🟢 P3 \| Review 29 TODO/FIXME comments \| 1 hr \| Code quality \| 🔲 Deferred \| | docs/PENDING_MASTER.md:18361 |
| p2-api-tests-hr-module-7-routes-1-hr-test-coverage-todo-missing-tests-docs-pending-master-md-18359 | P3 | open | Missing Tests | \| 🟡 P2 \| API tests: HR module (7 routes) \| 1 hr \| Test coverage \| 🔲 TODO \| | docs/PENDING_MASTER.md:18359 |
| p2-api-tests-aqar-module-16-routes-2-hrs-test-coverage-todo-missing-tests-docs-pending-master-md-18358 | P3 | open | Missing Tests | \| 🟡 P2 \| API tests: Aqar module (16 routes) \| 2 hrs \| Test coverage \| 🔲 TODO \| | docs/PENDING_MASTER.md:18358 |
| p2-rate-limiting-finance-11-routes-30-min-financial-data-todo-next-steps-docs-pending-master-md-18356 | P3 | open | Next Steps | \| 🟡 P2 \| Rate limiting: Finance (11 routes) \| 30 min \| Financial data \| 🔲 TODO \| | docs/PENDING_MASTER.md:18356 |
| p1-rate-limiting-aqar-15-routes-30-min-high-traffic-module-todo-next-steps-docs-pending-master-md-18355 | P3 | open | Next Steps | \| 🔴 P1 \| Rate limiting: Aqar (15 routes) \| 30 min \| High traffic module \| 🔲 TODO \| | docs/PENDING_MASTER.md:18355 |
| p1-rate-limiting-auth-12-routes-30-min-critical-security-todo-next-steps-docs-pending-master-md-18354 | P3 | open | Next Steps | \| 🔴 P1 \| Rate limiting: Auth (12 routes) \| 30 min \| Critical security \| 🔲 TODO \| | docs/PENDING_MASTER.md:18354 |
| p1-rate-limiting-payments-4-routes-15-min-critical-security-todo-next-steps-docs-pending-master-md-18353 | P3 | open | Next Steps | \| 🔴 P1 \| Rate limiting: Payments (4 routes) \| 15 min \| Critical security \| 🔲 TODO \| | docs/PENDING_MASTER.md:18353 |
| p0-close-stale-draft-prs-539-544-10-min-cleanup-todo-next-steps-docs-pending-master-md-18352 | P3 | open | Next Steps | \| 🔴 P0 \| Close stale draft PRs (539-544) \| 10 min \| Cleanup \| 🔲 TODO \| | docs/PENDING_MASTER.md:18352 |
| p0-merge-pr-fix-graphql-resolver-todos-5-min-139-rate-limits-security-fixes-ready-next-steps-docs-pending-master-md-18351 | P3 | open | Next Steps | \| 🔴 P0 \| Merge PR `fix/graphql-resolver-todos` \| 5 min \| 139 rate limits, security fixes \| ✅ Ready \| | docs/PENDING_MASTER.md:18351 |
| copilot-chat-route-ts-117-medium-needs-try-catch-next-steps-copilot-chat-route-ts | P3 | open | Next Steps | \| `copilot/chat/route.ts` \| 117 \| Medium \| Needs try-catch \| | copilot/chat/route.ts |
| module-api-routes-test-files-gap-priority-next-steps-docs-pending-master-md-18299 | P3 | open | Next Steps | \| Module \| API Routes \| Test Files \| Gap \| Priority \| | docs/PENDING_MASTER.md:18299 |
| todo-fixme-comments-29-review-needed-next-steps-docs-pending-master-md-18267 | P3 | open | Next Steps | \| **TODO/FIXME Comments** \| 29 \| 🟡 Review needed \| — \| | docs/PENDING_MASTER.md:18267 |
| open-draft-prs-6-cleanup-needed-next-steps-docs-pending-master-md-18266 | P3 | open | Next Steps | \| **Open Draft PRs** \| 6 \| 🟡 Cleanup needed \| — \| | docs/PENDING_MASTER.md:18266 |
| unprotected-routes-213-352-61-needs-work-next-steps-docs-pending-master-md-18264 | P3 | open | Next Steps | \| **Unprotected Routes** \| 213/352 (61%) \| 🔴 Needs Work \| — \| | docs/PENDING_MASTER.md:18264 |
| issue-2-todos-in-resolvers-returning-empty-data-next-steps-docs-pending-master-md-18109 | P3 | open | Next Steps | **Issue**: 2 TODOs in resolvers returning empty data | docs/PENDING_MASTER.md:18109 |
| p3-add-rate-limiting-to-remaining-modules-marketplace-copilot-ats-next-steps-docs-pending-master-md-18092 | P3 | open | Next Steps | **P3**: Add rate limiting to remaining modules (marketplace, copilot, ats) | docs/PENDING_MASTER.md:18092 |
| p2-verify-test-imports-in-2-potentially-stale-test-files-next-steps-docs-pending-master-md-18091 | P3 | open | Next Steps | **P2**: Verify test imports in 2 potentially stale test files | docs/PENDING_MASTER.md:18091 |
| p1-add-rate-limiting-to-finance-routes-10-routes-protect-sensitive-data-next-steps-docs-pending-master-md-18089 | P3 | open | Next Steps | **P1**: Add rate limiting to finance routes (10 routes) - Protect sensitive data | docs/PENDING_MASTER.md:18089 |
| p1-add-rate-limiting-to-payments-routes-4-routes-critical-for-billing-next-steps-docs-pending-master-md-18088 | P3 | open | Next Steps | **P1**: Add rate limiting to payments routes (4 routes) - Critical for billing | docs/PENDING_MASTER.md:18088 |
| p1-add-rate-limiting-to-auth-routes-12-routes-prevent-brute-force-next-steps-docs-pending-master-md-18087 | P3 | open | Next Steps | **P1**: Add rate limiting to auth routes (12 routes) - Prevent brute force | docs/PENDING_MASTER.md:18087 |
| p0-review-graphql-todo-stubs-decide-if-full-implementation-needed-or-remove-next-steps-docs-pending-master-md-18086 | P3 | open | Next Steps | **P0**: Review GraphQL TODO stubs - Decide if full implementation needed or remove | docs/PENDING_MASTER.md:18086 |
| rate-limiting-69-42-recalculated-needs-work-missing-tests-docs-pending-master-md-18072 | P3 | open | Missing Tests | \| Rate Limiting \| 69% \| 42% (recalculated) \| 🔴 Needs work \| | docs/PENDING_MASTER.md:18072 |
| app-aqar-filters-page-tsx-121-json-parse-raw-medium-client-side-needs-try-catch-next-steps-app-aqar-filters-page-tsx | P3 | open | Next Steps | \| `app/aqar/filters/page.tsx` \| 121 \| `JSON.parse(raw)` \| 🟡 Medium - Client-side, needs try/catch \| | app/aqar/filters/page.tsx |
| finding-14-e2e-tests-are-conditionally-skipped-when-env-vars-are-missing-missing-tests-docs-pending-master-md-17762 | P3 | open | Missing Tests | **Finding**: 14 E2E tests are conditionally skipped when env vars are missing. | docs/PENDING_MASTER.md:17762 |
| tests-e2e-auth-spec-ts-multiple-missing-env-vars-expected-missing-tests-tests-e2e-auth-spec-ts | P3 | open | Missing Tests | \| `tests/e2e/auth.spec.ts` (multiple) \| Missing env vars \| ✅ Expected \| | tests/e2e/auth.spec.ts |
| app-api-docs-openapi-route-ts-next-steps-app-api-docs-openapi-route-ts | P3 | open | Next Steps | app/api/docs/openapi/route.ts | app/api/docs/openapi/route.ts |
| open-prs-unknown-6-stale-cleanup-needed-next-steps-docs-pending-master-md-17328 | P3 | open | Next Steps | \| **Open PRs** \| Unknown \| 6 \| 🟡 Stale \| Cleanup needed \| | docs/PENDING_MASTER.md:17328 |
| routes-needing-rate-limiting-40-40-pending-next-steps-docs-pending-master-md-17325 | P3 | open | Next Steps | \| **Routes Needing Rate Limiting** \| 40 \| 40 \| 🟡 Pending \| — \| | docs/PENDING_MASTER.md:17325 |
| 2-missing-shared-model-typings-server-models-hr-models-ts-and-server-models-user-ts-both-reference-employeemutable-usermutable-employeedocli | P3 | open | Next Steps | 2) **Missing shared model typings** — `server/models/hr.models.ts` and `server/models/User.ts` both reference `EmployeeMutable`/`UserMutable`/`EmployeeDocLike`/`HydratedDocument` that no longer resolv | server/models/hr.models.ts |
| missing-tests-no-coverage-for-admin-notification-config-test-routes-or-support-impersonation-auth-path-medium-add-unit-tests-validating-auth | P3 | open | Missing Tests | \| Missing Tests \| No coverage for admin notification config/test routes or support impersonation auth path \| 🟡 Medium \| Add unit tests validating auth paths, rate limiting, and happy-path responses f | docs/PENDING_MASTER.md:17299 |
| typescript-errors-36-blocking-session-middleware-typings-missing-model-helper-types-rate-limit-helper-missing-bugs-docs-pending-master-md-17 | P3 | open | Bugs | \| **TypeScript Errors** \| 36 blocking \| Session middleware typings, missing model helper types, rate-limit helper missing \| | docs/PENDING_MASTER.md:17277 |
| branch-fix-graphql-resolver-todos-worktree-active-dirty-do-not-reset-missing-tests-docs-pending-master-md-17275 | P3 | open | Missing Tests | \| **Branch** \| `fix/graphql-resolver-todos` \| Worktree active (dirty, do not reset) \| | docs/PENDING_MASTER.md:17275 |
| auto-monitor-pattern-reused-across-components-triggering-unauthenticated-loops-needs-centralized-guard-missing-tests-docs-pending-master-md- | P3 | open | Missing Tests | Auto-monitor pattern reused across components triggering unauthenticated loops; needs centralized guard. | docs/PENDING_MASTER.md:17266 |
| missing-tests-auth-gated-monitoring-error-handling-otp-forgot-password-flows-qa-reconnect-alert-guard-missing-tests-docs-pending-master-md-1 | P3 | open | Missing Tests | Missing tests: auth-gated monitoring, error handling, OTP/forgot-password flows, QA reconnect/alert guard. | docs/PENDING_MASTER.md:17262 |
| bugs-logic-auto-monitor-unauthorized-calls-otp-send-and-forgot-password-500s-health-monitoring-without-auth-error-handling-gaps-bugs-docs-pe | P3 | open | Bugs | Bugs/logic: auto-monitor unauthorized calls; OTP send and forgot password 500s; health monitoring without auth; error handling gaps. | docs/PENDING_MASTER.md:17261 |
| plan-gate-auto-monitoring-health-checks-on-authenticated-session-ssr-make-monitor-init-a-no-op-when-logged-out-fix-otp-forgot-password-handl | P3 | open | Next Steps | Plan: gate auto-monitoring/health checks on authenticated session/SSR; make monitor init a no-op when logged out; fix OTP/forgot-password handlers and add tests. | docs/PENDING_MASTER.md:17257 |
| post-api-auth-otp-send-returning-500-post-api-auth-forgot-password-returning-500-password-reset-stub-warning-next-steps-docs-pending-master- | P3 | open | Next Steps | `POST /api/auth/otp/send` returning 500; `POST /api/auth/forgot-password` returning 500 (password reset stub warning). | docs/PENDING_MASTER.md:17256 |
| observed-repeated-401-403-spam-from-auto-monitor-health-checks-hitting-api-help-articles-api-notifications-api-qa-health-api-qa-reconnect-ap | P3 | open | Next Steps | Observed repeated 401/403 spam from auto-monitor/health checks hitting `/api/help/articles`, `/api/notifications`, `/api/qa/health`, `/api/qa/reconnect`, `/api/qa/alert` while unauthenticated (client- | docs/PENDING_MASTER.md:17255 |
| auth-flows-failing-together-both-otp-send-and-forgot-password-endpoints-return-500-indicating-a-shared-backend-config-gap-fix-once-and-add-t | P3 | open | Missing Tests | **Auth flows failing together**: Both OTP send and forgot-password endpoints return 500, indicating a shared backend/config gap; fix once and add tests to prevent repeat failures across auth flows. | docs/PENDING_MASTER.md:17250 |
| missing-tests-add-coverage-for-auth-gated-monitoring-start-backoff-alert-posting-and-for-otp-forgot-password-happy-error-paths-missing-tests | P3 | open | Missing Tests | **Missing Tests**: Add coverage for auth-gated monitoring start/backoff/alert posting, and for OTP/forgot-password happy/error paths. | docs/PENDING_MASTER.md:17244 |
| plan-gate-auto-monitor-startup-on-authenticated-session-and-ssr-feature-flag-disable-the-constructor-auto-start-add-exponential-backoff-and- | P3 | open | Next Steps | Plan: gate auto-monitor startup on authenticated session (and SSR/feature flag), disable the constructor auto-start, add exponential backoff and dedupe, and only post QA alerts when auth/session prese | docs/PENDING_MASTER.md:17239 |
| otp-send-and-forgot-password-flows-returning-500-password-reset-also-logs-a-stub-warning-in-the-console-next-steps-docs-pending-master-md-17 | P3 | open | Next Steps | OTP send and forgot-password flows returning 500; password reset also logs a “stub” warning in the console. | docs/PENDING_MASTER.md:17238 |
| confirmed-auto-monitor-health-checks-running-while-logged-out-spamming-api-help-articles-api-notifications-api-qa-health-api-qa-reconnect-ap | P3 | open | Next Steps | Confirmed auto-monitor/health checks running while logged out, spamming `/api/help/articles`, `/api/notifications`, `/api/qa/health`, `/api/qa/reconnect`, `/api/qa/alert` with 401/403 responses. | docs/PENDING_MASTER.md:17237 |
| tenant-context-missing-uniformly-on-reads-unlike-mutations-no-query-resolver-wraps-db-access-with-tenant-audit-context-so-isolation-plugins- | P3 | open | Missing Tests | **Tenant context missing uniformly on reads**: Unlike Mutations, no Query resolver wraps DB access with tenant/audit context, so isolation plugins are skipped everywhere on reads. Apply the same conte | docs/PENDING_MASTER.md:17232 |
| isolation-missing-tenant-audit-context-on-reads-workorders-workorder-dashboardstats-organization-property-properties-and-invoice-resolvers-d | P3 | open | Missing Tests | **Isolation \| Missing tenant/audit context on reads**: workOrders, workOrder, dashboardStats, organization, property/properties, and invoice resolvers do not set tenant/audit context, bypassing tenant | docs/PENDING_MASTER.md:17225 |
| verification-pending-rerun-pnpm-typecheck-pnpm-lint-pnpm-test-after-implementing-changes-next-steps-docs-pending-master-md-17221 | P3 | open | Next Steps | Verification pending: rerun `pnpm typecheck && pnpm lint && pnpm test` after implementing changes. | docs/PENDING_MASTER.md:17221 |
| plan-enforce-required-org-context-for-all-query-resolvers-wrap-reads-with-tenant-audit-context-normalize-org-once-parallelize-workorders-fin | P3 | open | Next Steps | Plan: enforce required org context for all Query resolvers, wrap reads with tenant/audit context, normalize org once, parallelize workOrders find/count; add unit tests for org-less requests, `createGr | app/api/graphql/route.ts |
| identified-graphql-query-resolver-gaps-orgid-fallback-to-userid-missing-tenant-audit-context-on-reads-sequential-db-calls-in-workorders-next | P3 | open | Next Steps | Identified GraphQL Query resolver gaps: orgId fallback to userId, missing tenant/audit context on reads, sequential DB calls in workOrders. | docs/PENDING_MASTER.md:17219 |
| branch-fix-graphql-resolver-todos-planning-only-this-session-no-new-code-committed-next-steps-docs-pending-master-md-17218 | P3 | open | Next Steps | Branch `fix/graphql-resolver-todos`; planning only this session (no new code committed). | docs/PENDING_MASTER.md:17218 |
| docs-openapi-60-req-min-docs-openapi-openapi-spec-missing-tests-docs-pending-master-md-17086 | P3 | open | Missing Tests | \| `docs/openapi` \| 60 req/min \| `docs:openapi` \| OpenAPI spec \| | docs/PENDING_MASTER.md:17086 |
| open-prs-6-6-stale-cleanup-needed-missing-tests-docs-pending-master-md-17056 | P3 | open | Missing Tests | \| **Open PRs** \| 6 \| 6 \| 🟡 Stale \| Cleanup needed \| | docs/PENDING_MASTER.md:17056 |
| latest-commit-717df925c-pending-ready-1-commit-missing-tests-docs-pending-master-md-17046 | P3 | open | Missing Tests | \| **Latest Commit** \| `717df925c` \| Pending \| 🟡 Ready \| +1 commit \| | docs/PENDING_MASTER.md:17046 |
| branch-fix-graphql-resolver-todos-fix-graphql-resolver-todos-active-missing-tests-docs-pending-master-md-17045 | P3 | open | Missing Tests | \| **Branch** \| `fix/graphql-resolver-todos` \| `fix/graphql-resolver-todos` \| ✅ Active \| — \| | docs/PENDING_MASTER.md:17045 |
| 01-25-graphql-review-todo-stubs-identified-missing-tests-docs-pending-master-md-17031 | P3 | open | Missing Tests | \| 01:25 \| GraphQL review \| TODO stubs identified \| | docs/PENDING_MASTER.md:17031 |
| json-parse-safety-80-80-100-gap-20-missing-tests-docs-pending-master-md-17005 | P3 | open | Missing Tests | \| JSON Parse Safety \| 80% \| 80% \| 100% \| 🟡 Gap: 20% \| | docs/PENDING_MASTER.md:17005 |
| error-boundaries-84-84-95-gap-11-bugs-docs-pending-master-md-17002 | P3 | open | Bugs | \| Error Boundaries \| 84% \| 84% \| 95% \| 🟡 Gap: 11% \| | docs/PENDING_MASTER.md:17002 |
| input-validation-zod-33-33-80-gap-47-missing-tests-docs-pending-master-md-17001 | P3 | open | Missing Tests | \| **Input Validation (Zod)** \| 33% \| 33% \| 80% \| 🟡 Gap: 47% \| | docs/PENDING_MASTER.md:17001 |
| action-close-all-6-prs-with-message-superseded-by-fix-graphql-resolver-todos-branch-which-includes-all-fixes-missing-tests-docs-pending-mast | P3 | open | Missing Tests | **Action**: Close all 6 PRs with message: "Superseded by `fix/graphql-resolver-todos` branch which includes all fixes" | docs/PENDING_MASTER.md:16974 |
| 539-docs-pending-report-update-9h-stale-superseded-by-current-branch-missing-tests-docs-pending-master-md-16972 | P3 | open | Missing Tests | \| #539 \| `docs/pending-report-update` \| 9h \| Stale \| Superseded by current branch \| | docs/PENDING_MASTER.md:16972 |
| logger-warn-graphql-resolver-missing-orgid-userid-ctx-userid-missing-tests-logger-warn | P3 | open | Missing Tests | logger.warn("[GraphQL] resolver: Missing orgId", { userId: ctx.userId }); | logger.warn |
| properties-invoice-have-guards-but-todo-stubs-missing-tests-docs-pending-master-md-16951 | P3 | open | Missing Tests | `properties`, `invoice` - 🟡 Have guards but TODO stubs | docs/PENDING_MASTER.md:16951 |
| creategraphqlhandler-disabled-deps-missing-branches-missing-tests-docs-pending-master-md-16917 | P3 | open | Missing Tests | `createGraphQLHandler` disabled/deps-missing branches | docs/PENDING_MASTER.md:16917 |
| missing-test-categories-missing-tests-docs-pending-master-md-16913 | P3 | open | Missing Tests | **Missing Test Categories**: | docs/PENDING_MASTER.md:16913 |
| area-current-target-gap-missing-tests-docs-pending-master-md-16905 | P3 | open | Missing Tests | \| Area \| Current \| Target \| Gap \| | docs/PENDING_MASTER.md:16905 |
| invoice-has-org-guard-but-todo-stub-next-steps-docs-pending-master-md-16876 | P3 | open | Next Steps | `invoice` - 🟡 Has org guard but TODO stub | docs/PENDING_MASTER.md:16876 |
| properties-has-org-guard-but-todo-stub-next-steps-docs-pending-master-md-16875 | P3 | open | Next Steps | `properties` - 🟡 Has org guard but TODO stub | docs/PENDING_MASTER.md:16875 |
| open-prs-stale-6-6-cleanup-needed-next-steps-docs-pending-master-md-16801 | P3 | open | Next Steps | \| **Open PRs (Stale)** \| 6 \| 6 \| 🟡 Cleanup Needed \| — \| | docs/PENDING_MASTER.md:16801 |
| routes-with-zod-validation-116-352-33-116-352-33-needs-work-next-steps-docs-pending-master-md-16799 | P3 | open | Next Steps | \| **Routes With Zod Validation** \| ~116/352 (33%) \| ~116/352 (33%) \| 🟡 Needs Work \| — \| | docs/PENDING_MASTER.md:16799 |
| security-xss-95-1-file-needs-review-next-steps-docs-pending-master-md-16778 | P3 | open | Next Steps | \| **Security (XSS)** \| 95% \| 1 file needs review \| | docs/PENDING_MASTER.md:16778 |
| graphql-completeness-80-100-all-todo-stubs-implemented-next-steps-docs-pending-master-md-16668 | P3 | open | Next Steps | \| **GraphQL Completeness** \| 80% \| **100%** \| All TODO stubs implemented \| | docs/PENDING_MASTER.md:16668 |
| both-resolvers-require-ctx-orgid-returns-empty-null-if-missing-next-steps-ctx-orgid | P3 | open | Next Steps | Both resolvers require `ctx.orgId` (returns empty/null if missing) | ctx.orgId |
| invoice-resolver-was-todo-at-line-987-next-steps-docs-pending-master-md-16610 | P3 | open | Next Steps | **`invoice` resolver** (was TODO at line ~987): | docs/PENDING_MASTER.md:16610 |
| properties-resolver-was-todo-at-line-943-next-steps-docs-pending-master-md-16594 | P3 | open | Next Steps | **`properties` resolver** (was TODO at line ~943): | docs/PENDING_MASTER.md:16594 |
| graphql-todos-2-stubs-0-stubs-complete-improved-next-steps-docs-pending-master-md-16516 | P3 | open | Next Steps | \| **GraphQL TODOs** \| 2 stubs \| 0 stubs \| ✅ **Complete** \| 🟢 Improved \| | docs/PENDING_MASTER.md:16516 |
| overall-score-94-down-from-97-due-to-test-failures-and-rate-limiting-gaps-next-steps-docs-pending-master-md-16498 | P3 | open | Next Steps | **Overall Score: 94%** (down from 97% due to test failures and rate limiting gaps) | docs/PENDING_MASTER.md:16498 |
| recommendation-close-all-6-prs-all-superseded-by-commits-on-fix-graphql-resolver-todos-next-steps-docs-pending-master-md-16416 | P3 | open | Next Steps | **Recommendation**: Close all 6 PRs - all superseded by commits on `fix/graphql-resolver-todos`. | docs/PENDING_MASTER.md:16416 |
| services-4-todos-integration-improvements-next-steps-docs-pending-master-md-16399 | P3 | open | Next Steps | **services/**: 4 TODOs (integration improvements) | docs/PENDING_MASTER.md:16399 |
| app-10-todos-feature-enhancements-next-steps-docs-pending-master-md-16398 | P3 | open | Next Steps | **app/**: 10 TODOs (feature enhancements) | docs/PENDING_MASTER.md:16398 |
| lib-15-todos-mostly-optimization-notes-next-steps-docs-pending-master-md-16397 | P3 | open | Next Steps | **lib/**: 15 TODOs (mostly optimization notes) | docs/PENDING_MASTER.md:16397 |
| note-some-may-be-covered-by-middleware-level-rate-limiting-needs-verification-next-steps-docs-pending-master-md-16299 | P3 | open | Next Steps | **Note**: Some may be covered by middleware-level rate limiting. Needs verification. | docs/PENDING_MASTER.md:16299 |
| status-44-routes-missing-explicit-rate-limiting-87-coverage-missing-tests-docs-pending-master-md-16286 | P3 | open | Missing Tests | **Status**: 44 routes missing explicit rate limiting (87% coverage) | docs/PENDING_MASTER.md:16286 |
| common-root-cause-most-failures-are-due-to-incomplete-mock-setups-for-server-security-headers-specifically-missing-getclientip-export-next-s | P3 | open | Next Steps | **Common Root Cause**: Most failures are due to incomplete mock setups for `@/server/security/headers` - specifically missing `getClientIP` export. | docs/PENDING_MASTER.md:16280 |
| open-prs-stale-6-6-cleanup-bugs-docs-pending-master-md-16234 | P3 | open | Bugs | \| **Open PRs (Stale)** \| 6 \| 6 \| 🔴 Cleanup \| — \| | docs/PENDING_MASTER.md:16234 |
| rate-limiting-100-87-308-352-44-missing-regression-bugs-docs-pending-master-md-16233 | P3 | open | Bugs | \| **Rate Limiting** \| 100% \| 87% (308/352) \| 🟡 44 Missing \| Regression \| | docs/PENDING_MASTER.md:16233 |
| zod-validation-33-34-121-352-needs-work-bugs-docs-pending-master-md-16232 | P3 | open | Bugs | \| **Zod Validation** \| 33% \| 34% (121/352) \| 🟡 Needs Work \| — \| | docs/PENDING_MASTER.md:16232 |
| test-suite-275-284-pass-9-failures-needs-fix-bugs-docs-pending-master-md-16230 | P3 | open | Bugs | \| **Test Suite** \| — \| 275/284 pass \| 🟡 9 Failures \| Needs Fix \| | docs/PENDING_MASTER.md:16230 |
| missing-zod-validation-232-routes-p2-6h-missing-tests-docs-pending-master-md-16094 | P3 | open | Missing Tests | \| Missing Zod Validation \| 232 routes \| P2 \| 6h \| | docs/PENDING_MASTER.md:16094 |
| stale-prs-6-6-needs-cleanup-missing-tests-docs-pending-master-md-16081 | P3 | open | Missing Tests | \| **Stale PRs** \| 6 \| 6 \| 🔴 Needs cleanup \| | docs/PENDING_MASTER.md:16081 |
| action-all-superseded-by-commits-on-fix-graphql-resolver-todos-close-all-missing-tests-docs-pending-master-md-15970 | P3 | open | Missing Tests | **Action**: All superseded by commits on `fix/graphql-resolver-todos`. Close all. | docs/PENDING_MASTER.md:15970 |
| open-prs-stale-6-6-needs-cleanup-efficiency-docs-pending-master-md-15867 | P3 | open | Efficiency | \| **Open PRs (Stale)** \| 6 \| 6 \| 🔴 Needs Cleanup \| — \| | docs/PENDING_MASTER.md:15867 |
| o1-generate-openapi-specs-optional-4h-efficiency-docs-pending-master-md-15847 | P3 | open | Efficiency | \| O1 \| Generate OpenAPI specs \| 🟡 Optional \| 4h \| | docs/PENDING_MASTER.md:15847 |
| p0-fix-9-test-failures-pending-2h-efficiency-docs-pending-master-md-15842 | P3 | open | Efficiency | \| P0 \| Fix 9 test failures \| 🔴 Pending \| 2h \| | docs/PENDING_MASTER.md:15842 |
| api-documentation-75-90-openapi-1-week-next-steps-docs-pending-master-md-15769 | P3 | open | Next Steps | \| **API Documentation** \| 75% \| 90% \| OpenAPI \| 1 week \| | docs/PENDING_MASTER.md:15769 |
| metric-current-target-gap-eta-next-steps-docs-pending-master-md-15763 | P3 | open | Next Steps | \| Metric \| Current \| Target \| Gap \| ETA \| | docs/PENDING_MASTER.md:15763 |
| test-coverage-analysis-complete-285-tests-gaps-identified-missing-tests-docs-pending-master-md-15754 | P3 | open | Missing Tests | \| Test coverage analysis \| ✅ Complete \| 285 tests, gaps identified \| | docs/PENDING_MASTER.md:15754 |
| o4-comprehensive-audit-logging-4h-next-steps-docs-pending-master-md-15677 | P3 | open | Next Steps | **O4**: Comprehensive audit logging - 4h | docs/PENDING_MASTER.md:15677 |
| o3-request-id-correlation-2h-next-steps-docs-pending-master-md-15676 | P3 | open | Next Steps | **O3**: Request ID correlation - 2h | docs/PENDING_MASTER.md:15676 |
| o2-add-sentry-apm-spans-3h-next-steps-docs-pending-master-md-15675 | P3 | open | Next Steps | **O2**: Add Sentry APM spans - 3h | docs/PENDING_MASTER.md:15675 |
| o1-generate-openapi-specs-for-all-routes-4h-next-steps-docs-pending-master-md-15674 | P3 | open | Next Steps | **O1**: Generate OpenAPI specs for all routes - 4h | docs/PENDING_MASTER.md:15674 |
| e4-create-shared-rate-limit-helper-with-decorators-1h-next-steps-docs-pending-master-md-15673 | P3 | open | Next Steps | **E4**: Create shared rate limit helper with decorators - 1h | docs/PENDING_MASTER.md:15673 |
| e3-centralize-session-guard-helper-2h-next-steps-docs-pending-master-md-15672 | P3 | open | Next Steps | **E3**: Centralize session guard helper - 2h | docs/PENDING_MASTER.md:15672 |
| performance-monitoring-add-apm-spans-to-critical-paths-2h-efficiency-docs-pending-master-md-15669 | P3 | open | Efficiency | **Performance monitoring**: Add APM spans to critical paths - 2h | docs/PENDING_MASTER.md:15669 |
| query-optimization-identify-and-fix-n-1-queries-3h-next-steps-docs-pending-master-md-15668 | P3 | open | Next Steps | **Query optimization**: Identify and fix N+1 queries - 3h | docs/PENDING_MASTER.md:15668 |
| add-api-tests-for-assets-cms-6-tests-2h-next-steps-docs-pending-master-md-15667 | P3 | open | Next Steps | **Add API tests for Assets & CMS** (6 tests) - 2h | docs/PENDING_MASTER.md:15667 |
| add-rate-limiting-to-assets-cms-others-90-routes-4h-next-steps-docs-pending-master-md-15666 | P3 | open | Next Steps | **Add rate limiting to Assets, CMS, Others** (90 routes) - 4h | docs/PENDING_MASTER.md:15666 |
| add-zod-validation-to-remaining-191-routes-8h-next-steps-docs-pending-master-md-15665 | P3 | open | Next Steps | **Add Zod validation to remaining 191 routes** - 8h | docs/PENDING_MASTER.md:15665 |
| documentation-75-openapi-partial-inline-docs-good-api-docs-incomplete-efficiency-docs-pending-master-md-15642 | P3 | open | Efficiency | \| **Documentation** \| 75% \| OpenAPI partial, inline docs good, API docs incomplete \| | docs/PENDING_MASTER.md:15642 |
| testing-80-285-tests-good-security-coverage-api-gaps-in-marketplace-assets-missing-tests-docs-pending-master-md-15640 | P3 | open | Missing Tests | \| **Testing** \| 80% \| 285 tests, good security coverage, API gaps in Marketplace/Assets \| | docs/PENDING_MASTER.md:15640 |
| onboarding-flow-partial-coverage-needs-integration-tests-missing-tests-docs-pending-master-md-15626 | P3 | open | Missing Tests | ❌ Onboarding flow: Partial coverage (needs integration tests) | docs/PENDING_MASTER.md:15626 |
| assets-routes-1-test-needs-4-more-efficiency-docs-pending-master-md-15624 | P3 | open | Efficiency | ❌ Assets routes: 1 test (needs 4 more) | docs/PENDING_MASTER.md:15624 |
| coverage-gaps-identified-missing-tests-docs-pending-master-md-15622 | P3 | open | Missing Tests | **Coverage Gaps Identified**: | docs/PENDING_MASTER.md:15622 |
| error-boundaries-38-45-modules-84-missing-only-in-minor-routes-bugs-docs-pending-master-md-15577 | P3 | open | Bugs | \| **Error Boundaries** \| ✅ 38/45 modules (84%) \| Missing only in minor routes \| | docs/PENDING_MASTER.md:15577 |
| security-layer-implemented-missing-coverage-priority-missing-tests-docs-pending-master-md-15473 | P3 | open | Missing Tests | \| Security Layer \| Implemented \| Missing \| Coverage \| Priority \| | docs/PENDING_MASTER.md:15473 |
| verified-pending-items-from-report-all-rate-limiting-and-zod-validation-was-already-complete-missing-tests-docs-pending-master-md-15350 | P3 | open | Missing Tests | Verified pending items from report. All rate limiting and Zod validation was ALREADY COMPLETE. | docs/PENDING_MASTER.md:15350 |
| p1-add-zod-to-remaining-191-routes-pending-8h-missing-tests-docs-pending-master-md-15341 | P3 | open | Missing Tests | \| P1 \| Add Zod to remaining 191 routes \| 🟡 Pending \| 8h \| | docs/PENDING_MASTER.md:15341 |
| pr-agent-yml-openai-key-context-warning-only-secrets-validation-missing-tests-pr-agent-yml | P3 | open | Missing Tests | \| `pr_agent.yml` \| OPENAI_KEY context \| ⚠️ Warning only (secrets validation) \| | pr_agent.yml |
| branch-fix-graphql-resolver-todos-fix-graphql-resolver-todos-active-stable-missing-tests-docs-pending-master-md-15166 | P3 | open | Missing Tests | \| **Branch** \| `fix/graphql-resolver-todos` \| `fix/graphql-resolver-todos` \| ✅ Active \| Stable \| | docs/PENDING_MASTER.md:15166 |
| missing-zod-validation-231-routes-p2-6h-missing-tests-docs-pending-master-md-15153 | P3 | open | Missing Tests | \| Missing Zod Validation \| 231 routes \| P2 \| 6h \| | docs/PENDING_MASTER.md:15153 |
| stale-prs-6-9-needs-cleanup-missing-tests-docs-pending-master-md-15141 | P3 | open | Missing Tests | \| **Stale PRs** \| 6 \| 9 \| 🔴 Needs cleanup \| | docs/PENDING_MASTER.md:15141 |
| common-root-cause-missing-getclientip-export-in-server-security-headers-mock-missing-tests-docs-pending-master-md-15015 | P3 | open | Missing Tests | **Common Root Cause**: Missing `getClientIP` export in `@/server/security/headers` mock. | docs/PENDING_MASTER.md:15015 |
| open-prs-stale-6-9-needs-cleanup-3-next-steps-docs-pending-master-md-14972 | P3 | open | Next Steps | \| **Open PRs (Stale)** \| 6 \| 9 \| 🔴 Needs Cleanup \| +3 \| | docs/PENDING_MASTER.md:14972 |
| branch-fix-graphql-resolver-todos-feat-marketplace-api-tests-active-changed-next-steps-docs-pending-master-md-14964 | P3 | open | Next Steps | \| **Branch** \| `fix/graphql-resolver-todos` \| `feat/marketplace-api-tests` \| ✅ Active \| Changed \| | docs/PENDING_MASTER.md:14964 |
| pending-master-v51-0-this-entry-next-steps-v51-0 | P3 | open | Next Steps | \| PENDING_MASTER v51.0 \| ✅ This entry \| | v51.0 |
| add-audit-logging-for-sensitive-operations-next-steps-docs-pending-master-md-14941 | P3 | open | Next Steps | Add audit logging for sensitive operations | docs/PENDING_MASTER.md:14941 |
| merge-feat-marketplace-api-tests-to-main-next-steps-docs-pending-master-md-14936 | P3 | open | Next Steps | Merge `feat/marketplace-api-tests` to main | docs/PENDING_MASTER.md:14936 |
| add-zod-validation-to-remaining-routes-next-steps-docs-pending-master-md-14934 | P3 | open | Next Steps | Add Zod validation to remaining routes | docs/PENDING_MASTER.md:14934 |
| close-6-stale-draft-prs-539-544-next-steps-docs-pending-master-md-14933 | P3 | open | Next Steps | Close 6 stale draft PRs (#539-544) | docs/PENDING_MASTER.md:14933 |
| push-changes-to-remote-next-steps-docs-pending-master-md-14930 | P3 | open | Next Steps | Push changes to remote | docs/PENDING_MASTER.md:14930 |
| commit-pending-test-files-next-steps-docs-pending-master-md-14929 | P3 | open | Next Steps | Commit pending test files | docs/PENDING_MASTER.md:14929 |
| 539-paytabs-tap-cleanup-docs-pending-report-update-draft-close-superseded-missing-tests-docs-pending-master-md-14903 | P3 | open | Missing Tests | \| #539 \| PayTabs→TAP cleanup \| `docs/pending-report-update` \| Draft \| Close (superseded) \| | docs/PENDING_MASTER.md:14903 |
| api-documentation-partial-openapi-complete-3h-missing-tests-docs-pending-master-md-14889 | P3 | open | Missing Tests | \| API documentation \| Partial \| OpenAPI complete \| 3h \| | docs/PENDING_MASTER.md:14889 |
| no-todo-fixme-in-api-routes-clean-zero-technical-debt-markers-missing-tests-docs-pending-master-md-14878 | P3 | open | Missing Tests | \| **No TODO/FIXME in API routes** \| ✅ Clean \| Zero technical debt markers \| | docs/PENDING_MASTER.md:14878 |
| pending-master-v52-0-this-entry-missing-tests-v52-0 | P3 | open | Missing Tests | \| PENDING_MASTER v52.0 \| ✅ This entry \| | v52.0 |
| add-apm-spans-for-critical-paths-missing-tests-docs-pending-master-md-14785 | P3 | open | Missing Tests | Add APM spans for critical paths | docs/PENDING_MASTER.md:14785 |
| add-request-id-correlation-missing-tests-docs-pending-master-md-14784 | P3 | open | Missing Tests | Add request ID correlation | docs/PENDING_MASTER.md:14784 |
| complete-openapi-documentation-missing-tests-docs-pending-master-md-14783 | P3 | open | Missing Tests | Complete OpenAPI documentation | docs/PENDING_MASTER.md:14783 |
| audit-8-no-explicit-any-eslint-disable-usages-1h-missing-tests-docs-pending-master-md-14780 | P3 | open | Missing Tests | Audit 8 `no-explicit-any` eslint-disable usages — 1h | docs/PENDING_MASTER.md:14780 |
| add-api-tests-for-fm-25-routes-4h-missing-tests-docs-pending-master-md-14779 | P3 | open | Missing Tests | Add API tests for FM (25 routes) — 4h | docs/PENDING_MASTER.md:14779 |
| add-api-tests-for-aqar-16-routes-3h-missing-tests-docs-pending-master-md-14778 | P3 | open | Missing Tests | Add API tests for Aqar (16 routes) — 3h | docs/PENDING_MASTER.md:14778 |
| review-2-json-parse-locations-without-try-catch-30m-missing-tests-json-parse | P3 | open | Missing Tests | Review 2 JSON.parse locations without try-catch — 30m | JSON.parse |
| add-api-tests-for-souq-module-75-routes-8h-missing-tests-docs-pending-master-md-14773 | P3 | open | Missing Tests | Add API tests for Souq module (75 routes) — 8h | docs/PENDING_MASTER.md:14773 |
| close-9-stale-draft-prs-15m-missing-tests-docs-pending-master-md-14769 | P3 | open | Missing Tests | Close 9 stale draft PRs — 15m | docs/PENDING_MASTER.md:14769 |
| issue-10-draft-prs-remain-open-missing-tests-docs-pending-master-md-14717 | P3 | open | Missing Tests | **Issue**: 10 draft PRs remain open | docs/PENDING_MASTER.md:14717 |
| app-api-souq-products-route-ts-e-commerce-needs-protection-missing-tests-app-api-souq-products-route-ts | P3 | open | Missing Tests | `app/api/souq/products/route.ts` — E-commerce, needs protection | app/api/souq/products/route.ts |
| todo-fixme-markers-0-found-clean-codebase-missing-tests-docs-pending-master-md-14677 | P3 | open | Missing Tests | \| ✅ TODO/FIXME markers \| 0 found \| Clean codebase \| | docs/PENDING_MASTER.md:14677 |
| todo-fixme-in-code-0-0-clean-missing-tests-docs-pending-master-md-14545 | P3 | open | Missing Tests | \| **TODO/FIXME in Code** \| 0 \| 0 \| ✅ Clean \| — \| | docs/PENDING_MASTER.md:14545 |
| open-prs-stale-drafts-6-10-cleanup-needed-4-missing-tests-docs-pending-master-md-14544 | P3 | open | Missing Tests | \| **Open PRs (Stale Drafts)** \| 6 \| 10 \| 🔴 Cleanup Needed \| +4 \| | docs/PENDING_MASTER.md:14544 |
| pending-master-v53-0-this-entry-missing-tests-v53-0 | P3 | open | Missing Tests | \| PENDING_MASTER v53.0 \| ✅ This entry \| | v53.0 |
| review-similar-dynamic-require-patterns-30m-missing-tests-docs-pending-master-md-14508 | P3 | open | Missing Tests | Review similar dynamic require patterns — 30m | docs/PENDING_MASTER.md:14508 |
| add-fm-api-tests-4h-missing-tests-docs-pending-master-md-14507 | P3 | open | Missing Tests | Add FM API tests — 4h | docs/PENDING_MASTER.md:14507 |
| add-aqar-api-tests-3h-missing-tests-docs-pending-master-md-14506 | P3 | open | Missing Tests | Add Aqar API tests — 3h | docs/PENDING_MASTER.md:14506 |
| merge-pr-548-after-approval-missing-tests-docs-pending-master-md-14503 | P3 | open | Missing Tests | Merge PR #548 after approval | docs/PENDING_MASTER.md:14503 |
| add-souq-module-tests-21-subdirectories-8h-missing-tests-docs-pending-master-md-14502 | P3 | open | Missing Tests | Add Souq module tests (21 subdirectories) — 8h | docs/PENDING_MASTER.md:14502 |
| check-4-similar-ref-patterns-for-type-errors-30m-bugs-docs-pending-master-md-14501 | P3 | open | Bugs | Check 4 similar ref patterns for type errors — 30m | docs/PENDING_MASTER.md:14501 |
| add-rate-limiting-to-3-legacy-routes-30m-missing-tests-docs-pending-master-md-14498 | P3 | open | Missing Tests | Add rate limiting to 3 legacy routes — 30m | docs/PENDING_MASTER.md:14498 |
| close-9-stale-draft-prs-539-547-15m-missing-tests-docs-pending-master-md-14497 | P3 | open | Missing Tests | Close 9 stale draft PRs (#539-547) — 15m | docs/PENDING_MASTER.md:14497 |
| fix-20-failing-tests-8-files-2h-missing-tests-docs-pending-master-md-14496 | P3 | open | Missing Tests | Fix 20 failing tests (8 files) — 2h | docs/PENDING_MASTER.md:14496 |
| open-prs-stale-drafts-10-10-cleanup-needed-efficiency-docs-pending-master-md-14229 | P3 | open | Efficiency | \| **Open PRs (Stale Drafts)** \| 10 \| 10 \| 🔴 Cleanup Needed \| — \| | docs/PENDING_MASTER.md:14229 |
| pending-master-v54-0-this-entry-efficiency-v54-0 | P3 | open | Efficiency | \| PENDING_MASTER v54.0 \| ✅ This entry \| | v54.0 |
| p3-complete-openapi-documentation-3h-backlog-efficiency-docs-pending-master-md-14197 | P3 | open | Efficiency | \| P3 \| Complete OpenAPI documentation \| 3h \| Backlog \| | docs/PENDING_MASTER.md:14197 |
| remaining-open-pr-efficiency-docs-pending-master-md-14169 | P3 | open | Efficiency | **Remaining Open PR:** | docs/PENDING_MASTER.md:14169 |
| 540-docs-pending-update-pending-master-v18-0-system-wide-scan-efficiency-v18-0 | P3 | open | Efficiency | #540: `docs(pending): Update PENDING_MASTER v18.0 — System-Wide Scan` | v18.0 |
| 539-docs-pending-update-pending-master-v17-0-paytabs-tap-cleanup-efficiency-v17-0 | P3 | open | Efficiency | #539: `docs(pending): Update PENDING_MASTER v17.0 - PayTabs→TAP cleanup` | v17.0 |
| documentation-current-pending-master-v55-0-efficiency-v55-0 | P3 | open | Efficiency | \| **Documentation** \| ✅ Current \| PENDING_MASTER v55.0 \| | v55.0 |
| open-prs-1-1-clean-stable-efficiency-docs-pending-master-md-13979 | P3 | open | Efficiency | \| **Open PRs** \| 1 \| 1 \| ✅ Clean \| Stable \| | docs/PENDING_MASTER.md:13979 |
| missing-tests-config-enforcement-for-hardcoded-sensitive-values-config-s3-souq-rule-config-credential-scripts-add-unit-tests-that-fail-when- | P3 | open | Missing Tests | \| Missing Tests \| Config enforcement for hardcoded-sensitive values \| config/s3, Souq rule config, credential scripts \| Add unit tests that fail when default/fallback values are used in prod builds an | docs/PENDING_MASTER.md:13732 |
| next-parameterize-residual-hardcoded-credentials-config-centralize-souq-rule-windows-enforce-env-driven-storage-config-then-run-pnpm-typeche | P3 | open | Next Steps | Next: parameterize residual hardcoded credentials/config, centralize Souq rule windows, enforce env-driven storage config, then run `pnpm typecheck && pnpm lint && pnpm test`. | docs/PENDING_MASTER.md:13722 |
| branch-feat-marketplace-api-tests-working-tree-already-dirty-from-prior-sessions-app-about-page-tsx-app-api-hr-leaves-route-ts-app-api-hr-pa | P3 | open | Next Steps | Branch: `feat/marketplace-api-tests`; working tree already dirty from prior sessions (`app/about/page.tsx`, `app/api/hr/leaves/route.ts`, `app/api/hr/payroll/runs/route.ts`, `app/api/souq/ads/clicks/r | app/about/page.tsx |
| ran-repo-wide-rg-n-hardcod-sweep-across-app-lib-scripts-docs-to-re-confirm-remaining-hardcoded-risks-no-new-code-changes-applied-next-steps- | P3 | open | Next Steps | Ran repo-wide `rg -n "hardcod"` sweep across app/lib/scripts/docs to re-confirm remaining hardcoded risks; no new code changes applied. | docs/PENDING_MASTER.md:13720 |
| env-enforcement-drift-s3-config-now-throws-in-production-when-missing-ensure-deployment-pipelines-set-aws-region-aws-s3-bucket-explicitly-va | P3 | open | Missing Tests | Env enforcement drift: S3 config now throws in production when missing; ensure deployment pipelines set AWS_REGION/AWS_S3_BUCKET explicitly. `validateAwsConfig` guard prevents silent fallbacks. | docs/PENDING_MASTER.md:13707 |
| next-evaluate-existing-dirty-app-api-changes-user-owned-before-merging-optionally-rerun-playwright-once-environment-stabilizes-next-steps-do | P3 | open | Next Steps | Next: evaluate existing dirty app/api changes (user-owned) before merging; optionally rerun Playwright once environment stabilizes. | docs/PENDING_MASTER.md:13693 |
| verification-pnpm-typecheck-pnpm-lint-pnpm-test-ci-all-passing-full-vitest-suite-playwright-e2e-not-rerun-this-pass-previous-attempts-hit-ti | P3 | open | Next Steps | Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test:ci` all passing (full vitest suite). Playwright e2e not rerun this pass (previous attempts hit timeout). | docs/PENDING_MASTER.md:13692 |
| centralized-souq-fraud-return-windows-in-shared-config-with-tenant-overrides-services-wired-to-the-shared-getter-next-steps-docs-pending-mas | P3 | open | Next Steps | Centralized Souq fraud/return windows in shared config with tenant overrides + services wired to the shared getter. | docs/PENDING_MASTER.md:13690 |
| p2-fm-tests-17-3h-todo-next-steps-docs-pending-master-md-13648 | P3 | open | Next Steps | \| **P2** \| FM tests (+17) \| 3h \| 🟡 TODO \| | docs/PENDING_MASTER.md:13648 |
| p1-aqar-tests-13-3h-todo-next-steps-docs-pending-master-md-13647 | P3 | open | Next Steps | \| **P1** \| Aqar tests (+13) \| 3h \| 🔴 TODO \| | docs/PENDING_MASTER.md:13647 |
| p1-souq-tests-56-6h-todo-next-steps-docs-pending-master-md-13646 | P3 | open | Next Steps | \| **P1** \| Souq tests (+56) \| 6h \| 🔴 TODO \| | docs/PENDING_MASTER.md:13646 |
| aqar-listings-route-ts-extensive-missingstring-invalidnumbers-validpricing-validgeo-false-positive-next-steps-aqar-listings-route-ts | P3 | open | Next Steps | \| `aqar/listings/route.ts` \| Extensive: missingString, invalidNumbers, validPricing, validGeo \| ✅ FALSE POSITIVE \| | aqar/listings/route.ts |
| latest-commit-4cc4726f3-this-session-pending-1-next-steps-docs-pending-master-md-13589 | P3 | open | Next Steps | \| **Latest Commit** \| `4cc4726f3` \| `<this session>` \| 🔄 Pending \| +1 \| | docs/PENDING_MASTER.md:13589 |
| code-quality-100-17-justified-disables-0-todo-fixme-next-steps-docs-pending-master-md-13553 | P3 | open | Next Steps | \| **Code Quality** \| 100% \| ✅ \| 17 justified disables, 0 TODO/FIXME \| | docs/PENDING_MASTER.md:13553 |
| test-gap-summary-86-additional-tests-needed-to-reach-80-target-coverage-missing-tests-docs-pending-master-md-13440 | P3 | open | Missing Tests | **Test Gap Summary:** 86 additional tests needed to reach 80% target coverage. | docs/PENDING_MASTER.md:13440 |
| open-prs-1-1-clean-548-active-bugs-docs-pending-master-md-13410 | P3 | open | Bugs | \| **Open PRs** \| 1 \| 1 \| ✅ Clean \| #548 active \| | docs/PENDING_MASTER.md:13410 |
| latest-commit-5b7e425ac-this-session-pending-1-bugs-docs-pending-master-md-13403 | P3 | open | Bugs | \| **Latest Commit** \| `5b7e425ac` \| `<this session>` \| 🔄 Pending \| +1 \| | docs/PENDING_MASTER.md:13403 |
| CLUSTER-001 | P3 | open | Bugs | \| JSON-CATCH-CLUSTER-001 \| Test Gap/Consistency \| Multiple API routes using `req.json().catch(() => ({}\|null))` (e.g., `app/api/help/escalate/route.ts`, `app/api/billing/quote/route.ts`, `app/api/fm/w | req.json |
| open-prs-1-1-clean-549-active-next-steps-docs-pending-master-md-13271 | P3 | open | Next Steps | \| **Open PRs** \| 1 \| 1 \| ✅ Clean \| #549 active \| | docs/PENDING_MASTER.md:13271 |
| latest-commit-37bd93d69-this-session-pending-1-next-steps-docs-pending-master-md-13264 | P3 | open | Next Steps | \| **Latest Commit** \| `37bd93d69` \| `<this session>` \| 🔄 Pending \| +1 \| | docs/PENDING_MASTER.md:13264 |
| branch-docs-pending-v59-docs-pending-v60-active-1-pr-next-steps-docs-pending-master-md-13263 | P3 | open | Next Steps | \| **Branch** \| `docs/pending-v59` \| `docs/pending-v60` \| ✅ Active \| +1 PR \| | docs/PENDING_MASTER.md:13263 |
| add-tenant-config-caller-tests-to-ensure-503-or-explicit-tenant-missing-is-returned-no-silent-defaults-next-steps-docs-pending-master-md-132 | P3 | open | Next Steps | Add tenant-config caller tests to ensure 503 or explicit tenant-missing is returned (no silent defaults). | docs/PENDING_MASTER.md:13246 |
| defaulting-to-default-tenant-config-on-load-failure-previously-masked-tenant-issues-now-throws-but-callers-must-handle-and-surface-appropria | P3 | open | Next Steps | Defaulting to `DEFAULT_TENANT_CONFIG` on load failure previously masked tenant issues; now throws, but callers must handle and surface appropriate 503/tenant-missing responses. | docs/PENDING_MASTER.md:13240 |
| overall-98-production-ready-2-p0-items-pending-next-steps-docs-pending-master-md-13199 | P3 | open | Next Steps | **Overall:** ✅ **98% Production Ready** (2 P0 items pending) | docs/PENDING_MASTER.md:13199 |
| security-98-orgid-rate-limiting-2-silent-fail-fixes-pending-next-steps-docs-pending-master-md-13193 | P3 | open | Next Steps | \| **Security** \| 98% \| orgId ✅, rate limiting ✅, 2 silent-fail fixes pending \| | docs/PENDING_MASTER.md:13193 |
| p3-003-documentation-api-docs-openapi-spec-updates-backlog-missing-tests-docs-pending-master-md-13119 | P3 | open | Missing Tests | \| P3-003 \| Documentation \| API docs \| OpenAPI spec updates \| 🟢 Backlog \| | docs/PENDING_MASTER.md:13119 |
| p2-002-testing-fm-module-17-routes-missing-tests-backlog-missing-tests-docs-pending-master-md-13110 | P3 | open | Missing Tests | \| P2-002 \| Testing \| FM module \| ~17 routes missing tests \| 🟡 Backlog \| | docs/PENDING_MASTER.md:13110 |
| p2-001-testing-aqar-module-11-routes-missing-tests-backlog-missing-tests-docs-pending-master-md-13109 | P3 | open | Missing Tests | \| P2-001 \| Testing \| Aqar module \| ~11 routes missing tests \| 🟡 Backlog \| | docs/PENDING_MASTER.md:13109 |
| p1-003-testing-souq-module-46-routes-missing-dedicated-tests-planned-missing-tests-docs-pending-master-md-13103 | P3 | open | Missing Tests | \| P1-003 \| Testing \| Souq module \| ~46 routes missing dedicated tests \| 🟠 Planned \| | docs/PENDING_MASTER.md:13103 |
| p0-002-security-lib-config-tenant-server-ts-tenant-load-errors-silently-fall-back-to-defaults-todo-bugs-lib-config-tenant-server-ts | P3 | open | Bugs | \| P0-002 \| Security \| `lib/config/tenant.server.ts` \| Tenant load errors silently fall back to defaults \| 🔴 TODO \| | lib/config/tenant.server.ts |
| pr-550-docs-pending-v60-orgid-audit-complete-test-fixes-missing-tests-docs-pending-master-md-13072 | P3 | open | Missing Tests | PR #550: `docs/pending-v60` — orgId audit complete + test fixes | docs/PENDING_MASTER.md:13072 |
| pr-549-docs-pending-v59-souq-rules-config-5-new-tests-missing-tests-docs-pending-master-md-13071 | P3 | open | Missing Tests | PR #549: `docs/pending-v59` — Souq rules-config + 5 new tests | docs/PENDING_MASTER.md:13071 |
| open-prs-missing-tests-docs-pending-master-md-13070 | P3 | open | Missing Tests | **Open PRs**: | docs/PENDING_MASTER.md:13070 |
| open-prs-1-2-active-549-550-missing-tests-docs-pending-master-md-13060 | P3 | open | Missing Tests | \| **Open PRs** \| 1 \| **2** \| 🔄 Active \| #549, #550 \| | docs/PENDING_MASTER.md:13060 |
| latest-commit-6e3bb4b05-this-session-pending-1-missing-tests-docs-pending-master-md-13053 | P3 | open | Missing Tests | \| **Latest Commit** \| `6e3bb4b05` \| `<this session>` \| 🔄 Pending \| +1 \| | docs/PENDING_MASTER.md:13053 |
| env-enforcement-gaps-s3-now-fails-fast-in-production-similar-guards-should-be-considered-for-email-sms-providers-to-avoid-silent-fallbacks-a | P3 | open | Bugs | Env enforcement gaps: S3 now fails fast in production; similar guards should be considered for email/SMS providers to avoid silent fallbacks and misroutes. | docs/PENDING_MASTER.md:13042 |
| missing-tests-e2e-coverage-playwright-smoke-auth-checkout-returns-claims-rerun-and-stabilize-after-recent-config-changes-add-to-ci-as-a-shor | P3 | open | Missing Tests | \| Missing Tests \| E2E coverage \| Playwright smoke (auth, checkout, returns/claims) \| Rerun and stabilize after recent config changes; add to CI as a short smoke. \| | docs/PENDING_MASTER.md:13037 |
| next-rerun-playwright-smoke-to-validate-auth-checkout-returns-extend-banned-literal-list-if-new-tokens-appear-and-ensure-deployment-pipeline | P3 | open | Next Steps | Next: rerun Playwright smoke to validate auth/checkout/returns, extend banned-literal list if new tokens appear, and ensure deployment pipelines inject AWS + SuperAdmin secrets before rotation. | docs/PENDING_MASTER.md:13028 |
| souq-fraud-return-rule-windows-centralized-with-tenant-overrides-returns-and-claims-flows-are-wired-to-the-shared-config-next-steps-docs-pen | P3 | open | Next Steps | Souq fraud/return rule windows centralized with tenant overrides; returns and claims flows are wired to the shared config. | docs/PENDING_MASTER.md:13026 |
| superadmin-rotation-script-is-now-env-only-username-password-required-credential-echo-removed-and-banned-literal-guard-test-in-place-rotatio | P3 | open | Next Steps | SuperAdmin rotation script is now env-only (username/password required), credential echo removed, and banned-literal guard test in place; rotation ready once secrets are set. | docs/PENDING_MASTER.md:13025 |
| silent-json-coverage-gap-testing-gap-efficiency-app-api-aqar-listings-packages-route-ts-app-api-projects-route-ts-app-api-fm-finance-budgets | P3 | open | Missing Tests | \| SILENT-JSON-COVERAGE-GAP \| Testing Gap/Efficiency \| app/api/aqar/(listings\|packages)/route.ts, app/api/projects/route.ts, app/api/fm/finance/budgets/[id]/route.ts \| Multiple endpoints still use `req | /route.ts |
| DOWNLOAD-001 | P3 | open | Bugs | \| SILENT-RESUME-DOWNLOAD-001 \| Reliability/Observability \| app/api/files/resumes/[file]/route.ts \| Auth retrieval and local file read both use `.catch(() => null)`, mapping infra errors to 401/404 wit | /route.ts |
| silent-upload-auth-cluster-reliability-security-app-api-upload-presigned-url-verify-metadata-scan-scan-status-app-api-settings-logo-route-ts | P3 | open | Missing Tests | \| SILENT-UPLOAD-AUTH-CLUSTER \| Reliability/Security \| app/api/upload/(presigned-url\|verify-metadata\|scan\|scan-status), app/api/settings/logo/route.ts, server/middleware/subscriptionCheck.ts \| `getSess | app/api/settings/logo/route.ts |
| no-commands-executed-documentation-only-update-next-steps-docs-pending-master-md-13003 | P3 | open | Next Steps | No commands executed (documentation-only update). | docs/PENDING_MASTER.md:13003 |
| identified-additional-silent-failure-points-vendor-apply-submissions-upload-auth-session-cluster-otp-org-resolution-resume-download-fm-repor | P3 | open | Next Steps | Identified additional silent-failure points (vendor apply submissions, upload/auth/session cluster, OTP org resolution, resume download, FM report AV scan) not covered in the last audit. | docs/PENDING_MASTER.md:13002 |
| env-enforcement-s3-guard-now-fails-fast-in-prod-consider-similar-guards-for-other-critical-providers-email-sms-if-gaps-surface-bugs-docs-pen | P3 | open | Bugs | Env enforcement: S3 guard now fails fast in prod; consider similar guards for other critical providers (email/SMS) if gaps surface. | docs/PENDING_MASTER.md:12994 |
| missing-tests-souq-rule-overrides-tests-unit-services-souq-rules-config-test-ts-verifies-defaults-and-tenant-override-merge-missing-tests-te | P3 | open | Missing Tests | \| Missing Tests \| Souq rule overrides \| tests/unit/services/souq-rules-config.test.ts \| Verifies defaults and tenant override merge. \| | tests/unit/services/souq-rules-config.test.ts |
| next-rerun-playwright-e2e-when-runtime-allows-extend-banned-literal-list-if-new-sensitive-tokens-appear-ensure-pipelines-set-aws-envs-and-su | P3 | open | Next Steps | Next: rerun Playwright e2e when runtime allows; extend banned-literal list if new sensitive tokens appear; ensure pipelines set AWS envs and SuperAdmin secrets before rotation. | docs/PENDING_MASTER.md:12979 |
| centralized-souq-fraud-return-rule-windows-with-tenant-overrides-returns-claims-investigation-now-consume-the-shared-config-next-steps-docs- | P3 | open | Next Steps | Centralized Souq fraud/return rule windows with tenant overrides; returns + claims investigation now consume the shared config. | docs/PENDING_MASTER.md:12977 |
| overall-98-production-ready-3-orgid-fixes-json-parse-utility-pending-next-steps-docs-pending-master-md-12969 | P3 | open | Next Steps | **Overall:** ✅ **98% Production Ready** (3 orgId fixes + JSON parse utility pending) | docs/PENDING_MASTER.md:12969 |
| p3-003-documentation-openapi-spec-needs-updating-backlog-sync-with-routes-efficiency-docs-pending-master-md-12875 | P3 | open | Efficiency | \| P3-003 \| Documentation \| OpenAPI \| Spec needs updating \| 🟢 Backlog \| Sync with routes \| | docs/PENDING_MASTER.md:12875 |
| p2-005-testing-admin-module-23-routes-missing-tests-backlog-add-test-files-missing-tests-docs-pending-master-md-12867 | P3 | open | Missing Tests | \| P2-005 \| Testing \| Admin module \| 23 routes missing tests \| 🟡 Backlog \| Add test files \| | docs/PENDING_MASTER.md:12867 |
| p2-004-testing-fm-module-17-routes-missing-tests-backlog-add-test-files-missing-tests-docs-pending-master-md-12866 | P3 | open | Missing Tests | \| P2-004 \| Testing \| FM module \| 17 routes missing tests \| 🟡 Backlog \| Add test files \| | docs/PENDING_MASTER.md:12866 |
| p2-003-testing-aqar-module-11-routes-missing-tests-backlog-add-test-files-missing-tests-docs-pending-master-md-12865 | P3 | open | Missing Tests | \| P2-003 \| Testing \| Aqar module \| 11 routes missing tests \| 🟡 Backlog \| Add test files \| | docs/PENDING_MASTER.md:12865 |
| p2-002-validation-118-routes-missing-zod-validation-backlog-add-schemas-efficiency-docs-pending-master-md-12864 | P3 | open | Efficiency | \| P2-002 \| Validation \| ~118 routes \| Missing Zod validation \| 🟡 Backlog \| Add schemas \| | docs/PENDING_MASTER.md:12864 |
| p1-004-testing-souq-module-51-routes-missing-tests-backlog-add-test-files-missing-tests-docs-pending-master-md-12857 | P3 | open | Missing Tests | \| P1-004 \| Testing \| Souq module \| 51 routes missing tests \| 🟠 Backlog \| Add test files \| | docs/PENDING_MASTER.md:12857 |
| p1-003-reliability-multiple-upload-routes-getsessionuser-silent-failures-todo-add-telemetry-wrapper-next-steps-docs-pending-master-md-12856 | P3 | open | Next Steps | \| P1-003 \| Reliability \| Multiple upload routes \| getSessionUser silent failures \| 🔴 TODO \| Add telemetry wrapper \| | docs/PENDING_MASTER.md:12856 |
| p1-002-reliability-vendor-apply-route-ts-silent-db-failure-on-apply-todo-return-503-on-failure-next-steps-vendor-apply-route-ts | P3 | open | Next Steps | \| P1-002 \| Reliability \| vendor/apply/route.ts \| Silent DB failure on apply \| 🔴 TODO \| Return 503 on failure \| | vendor/apply/route.ts |
| p0-003-security-vendors-route-ts-214-218-vendor-find-countdocuments-missing-orgid-verify-check-if-scoped-elsewhere-next-steps-vendors-route- | P3 | open | Next Steps | \| P0-003 \| Security \| `vendors/route.ts:214,218` \| Vendor.find/countDocuments missing orgId \| ⚠️ Verify \| Check if scoped elsewhere \| | vendors/route.ts:214 |
| p0-002-security-pm-plans-route-ts-42-68-189-fmpmplan-find-without-orgid-todo-add-tenant-scoping-logic-errors-pm-plans-route-ts-42 | P3 | open | Logic Errors | \| P0-002 \| Security \| `pm/plans/route.ts:42,68,189` \| FMPMPlan.find without orgId \| 🔴 TODO \| Add tenant scoping \| | pm/plans/route.ts:42 |
| p0-001-security-assistant-query-route-ts-259-workorder-find-without-orgid-todo-add-tenant-scoping-logic-errors-assistant-query-route-ts-259 | P3 | open | Logic Errors | \| P0-001 \| Security \| `assistant/query/route.ts:259` \| WorkOrder.find without orgId \| 🔴 TODO \| Add tenant scoping \| | assistant/query/route.ts:259 |
| add-observability-and-guardrails-for-av-scanning-surface-scanner-outages-short-circuit-processing-and-add-a-health-metric-test-in-fm-reports | P3 | open | Next Steps | Add observability and guardrails for AV scanning: surface scanner outages, short-circuit processing, and add a health metric/test in FM reports worker. | docs/PENDING_MASTER.md:12788 |
| standardize-request-body-parsing-on-a-safe-parser-that-emits-400-422-with-telemetry-replace-req-json-catch-null-in-help-escalation-aqar-pack | P3 | open | Next Steps | Standardize request body parsing on a safe parser that emits 400/422 with telemetry (replace `req.json().catch(() => ({}\|null))` in help escalation, Aqar packages/listings, FM budgets PATCH, projects  | req.json |
| replace-inline-getsessionuser-catch-null-usage-in-upload-help-onboarding-settings-subscription-resume-routes-with-a-shared-helper-that-logs- | P3 | open | Next Steps | Replace inline `getSessionUser(...).catch(() => null)` usage in upload/help/onboarding/settings/subscription/resume routes with a shared helper that logs infra failures and returns 503, preserving 401 | docs/PENDING_MASTER.md:12785 |
| located-and-updated-the-master-pending-report-no-duplicate-file-documented-fresh-findings-from-repo-wide-ripgrep-of-silent-handlers-catch-nu | P3 | open | Logic Errors | Located and updated the Master Pending Report (no duplicate file); documented fresh findings from repo-wide ripgrep of silent handlers (`catch(() => null\|{}\|undefined\|false)`). | docs/PENDING_MASTER.md:12780 |
| error-rate-visibility-is-missing-add-counters-alerts-per-route-group-auth-upload-help-otp-av-and-structured-logs-status-reason-correlation-i | P3 | open | Bugs | Error-rate visibility is missing; add counters/alerts per route group (auth/upload/help/OTP/AV) and structured logs (status, reason, correlation id). | docs/PENDING_MASTER.md:12758 |
| latest-commit-d7c82f309-uncommitted-pending-8-files-missing-tests-docs-pending-master-md-12727 | P3 | open | Missing Tests | \| **Latest Commit** \| `d7c82f309` \| `<uncommitted>` \| 🔄 Pending \| +8 files \| | docs/PENDING_MASTER.md:12727 |
| branch-docs-pending-v60-docs-pending-v60-active-stable-missing-tests-docs-pending-master-md-12726 | P3 | open | Missing Tests | \| **Branch** \| `docs/pending-v60` \| `docs/pending-v60` \| ✅ Active \| Stable \| | docs/PENDING_MASTER.md:12726 |
| observability-opentelemetry-tracing-debugging-efficiency-missing-tests-docs-pending-master-md-12671 | P3 | open | Missing Tests | \| **Observability** \| OpenTelemetry tracing \| Debugging efficiency \| | docs/PENDING_MASTER.md:12671 |
| api-client-generation-manual-openapi-typescript-3-days-missing-tests-docs-pending-master-md-12660 | P3 | open | Missing Tests | \| **API Client Generation** \| Manual \| — \| OpenAPI → TypeScript \| 3 days \| | docs/PENDING_MASTER.md:12660 |
| total-gap-103-routes-need-test-coverage-missing-tests-docs-pending-master-md-12613 | P3 | open | Missing Tests | **Total Gap**: ~103 routes need test coverage | docs/PENDING_MASTER.md:12613 |
| module-routes-tests-coverage-gap-priority-missing-tests-docs-pending-master-md-12603 | P3 | open | Missing Tests | \| Module \| Routes \| Tests \| Coverage \| Gap \| Priority \| | docs/PENDING_MASTER.md:12603 |
| production-readiness-98-2-gap-p0-items-below-next-steps-docs-pending-master-md-12479 | P3 | open | Next Steps | **Production Readiness**: **98%** (2% gap = P0 items below) | docs/PENDING_MASTER.md:12479 |
| alerting-gap-metrics-exist-tenant-config-load-failure-trial-request-persist-failure-dlq-failures-auth-infra-failure-but-dashboards-alerts-ar | P3 | open | Next Steps | **Alerting gap**: Metrics exist (`tenant_config_load_failure`, `trial_request_persist_failure`, DLQ failures, `auth_infra_failure`) but dashboards/alerts are missing; risk of silent degradation. | docs/PENDING_MASTER.md:12419 |
| health-hints-coverage-gap-only-auth-test-session-trial-request-and-upload-scan-config-policy-failures-emit-health-hinted-503s-apply-helper-t | P3 | open | Missing Tests | **Health hints coverage gap**: Only auth test session, trial-request, and upload scan config/policy failures emit health-hinted 503s. Apply helper to other infra-dependent paths (tenant-config consume | docs/PENDING_MASTER.md:12418 |
| none-new-primary-gap-is-missing-health-hints-alerts-on-other-503-surfaces-and-absent-dashboards-for-emitted-metrics-next-steps-docs-pending- | P3 | open | Next Steps | None new; primary gap is missing health-hints/alerts on other 503 surfaces and absent dashboards for emitted metrics. | docs/PENDING_MASTER.md:12406 |
| health-hinted-503s-used-by-auth-test-session-trial-request-and-upload-scan-config-policy-failures-helper-tolerates-missing-nexturl-next-step | P3 | open | Next Steps | Health-hinted 503s used by auth test session, trial-request, and upload scan config/policy failures; helper tolerates missing `nextUrl`. | docs/PENDING_MASTER.md:12385 |
| tenant-config-callers-still-need-to-handle-thrown-errors-ensure-upstream-apis-map-to-503-or-explicit-tenant-missing-bugs-docs-pending-master | P3 | open | Bugs | Tenant-config callers still need to handle thrown errors; ensure upstream APIs map to 503 or explicit tenant-missing. | docs/PENDING_MASTER.md:12356 |
| add-coverage-for-resume-download-storage-failures-in-integration-tests-and-surface-av-scan-health-in-monitoring-dashboards-missing-tests-doc | P3 | open | Missing Tests | Add coverage for resume download storage failures in integration tests and surface AV scan health in monitoring/dashboards. | docs/PENDING_MASTER.md:12314 |
| extend-safe-parser-adoption-to-remaining-upload-scan-verify-metadata-routes-and-ensure-ci-lint-json-fallbacks-stays-clean-next-steps-docs-pe | P3 | open | Next Steps | Extend safe parser adoption to remaining upload/scan/verify-metadata routes and ensure CI `lint:json-fallbacks` stays clean. | docs/PENDING_MASTER.md:12313 |
| roll-the-telemetry-aware-session-helper-to-remaining-upload-help-onboarding-settings-routes-still-showing-silent-auth-fallbacks-in-git-statu | P3 | open | Next Steps | Roll the telemetry-aware session helper to remaining upload/help/onboarding/settings routes still showing silent auth fallbacks in git status. | docs/PENDING_MASTER.md:12312 |
| observability-gaps-av-scan-availability-is-not-reported-to-dashboards-auth-infra-failures-counted-only-in-logs-add-metrics-auth-infra-failur | P3 | open | Next Steps | **Observability gaps**: AV scan availability is not reported to dashboards; auth infra failures counted only in logs. Add metrics (`auth_infra_failure`, `av_scan_unavailable`) and alerts to catch outa | docs/PENDING_MASTER.md:12301 |
| missing-tests-need-integration-tests-for-resume-download-storage-failure-403-503-paths-negative-path-tests-for-auth-infra-failures-on-upload | P3 | open | Missing Tests | **Missing tests**: Need integration tests for resume download storage failure/403/503 paths; negative-path tests for auth infra failures on upload/help/onboarding/settings; parser failure tests on rem | docs/PENDING_MASTER.md:12296 |
| add-integration-coverage-for-resume-download-storage-failures-and-emit-av-scanner-health-metrics-dashboards-wire-alerts-for-auth-infra-failu | P3 | open | Missing Tests | Add integration coverage for resume download storage failures and emit AV scanner health metrics/dashboards; wire alerts for auth infra failures (metric `auth_infra_failure`) and AV outages. | docs/PENDING_MASTER.md:12290 |
| extend-parsebodysafe-parsebody-to-remaining-upload-variants-scan-scan-status-verify-metadata-presign-siblings-and-keep-lint-json-fallbacks-c | P3 | open | Next Steps | Extend `parseBodySafe`/`parseBody` to remaining upload variants (`scan`, `scan-status`, `verify-metadata`, presign siblings) and keep `lint:json-fallbacks` clean. | docs/PENDING_MASTER.md:12289 |
| align-and-merge-local-changes-on-dirty-upload-help-onboarding-settings-files-then-apply-getsessionorerror-to-remove-getsessionuser-catch-nul | P3 | open | Bugs | Align and merge local changes on dirty upload/help/onboarding/settings files, then apply `getSessionOrError` to remove `getSessionUser(...).catch(() => null)` fallbacks. | docs/PENDING_MASTER.md:12288 |
| located-master-pending-report-no-duplicates-and-reviewed-prior-hardening-work-safe-session-parser-rollouts-missing-tests-docs-pending-master | P3 | open | Missing Tests | Located Master Pending Report (no duplicates) and reviewed prior hardening work (safe session/parser rollouts). | docs/PENDING_MASTER.md:12283 |
| module-coverage-51-souq-routes-22-admin-routes-17-fm-routes-need-tests-p1-p2-todo-missing-tests-docs-pending-master-md-12193 | P3 | open | Missing Tests | \| Module coverage \| 51 Souq routes, 22 Admin routes, 17 FM routes need tests \| P1-P2 \| 🔴 TODO \| | docs/PENDING_MASTER.md:12193 |
| auth-infra-auth-store-failure-503-for-routes-with-getsessionorerror-p1-todo-bugs-docs-pending-master-md-12192 | P3 | open | Bugs | \| Auth-infra \| Auth store failure → 503 for routes with `getSessionOrError` \| P1 \| 🔴 TODO \| | docs/PENDING_MASTER.md:12192 |
| pushed-commits-8fcd7df5e-and-696b7bd05-to-docs-pending-v60-branch-missing-tests-docs-pending-master-md-12139 | P3 | open | Missing Tests | ✅ Pushed commits `8fcd7df5e` and `696b7bd05` to `docs/pending-v60` branch | docs/PENDING_MASTER.md:12139 |
| to-run-after-pending-changes-pnpm-typecheck-pnpm-lint-pnpm-test-feat-marketplace-api-tests-pnpm-test-e2e-playwright-smoke-for-auth-checkout- | P3 | open | Missing Tests | ⏳ To run after pending changes: `pnpm typecheck && pnpm lint && pnpm test` (feat/marketplace-api-tests), `pnpm test:e2e` (Playwright smoke for auth/checkout/returns/claims). | docs/PENDING_MASTER.md:12127 |
| env-readiness-enforcement-lib-config-constants-ts-24-47-now-throws-on-missing-aws-region-aws-s3-bucket-but-env-sample-docs-still-show-option | P3 | open | Missing Tests | **Env Readiness Enforcement** — `lib/config/constants.ts:24-47` now throws on missing AWS_REGION/AWS_S3_BUCKET, but env sample/docs still show optional S3 fields; add documentation gating to prevent r | lib/config/constants.ts:24-47 |
| playwright-smoke-auth-checkout-returns-claims-after-rule-ui-config-rollout-p1-pending-missing-tests-docs-pending-master-md-12117 | P3 | open | Missing Tests | \| Playwright smoke \| Auth/checkout/returns/claims after rule UI + config rollout. \| P1 \| 🔴 Pending \| | docs/PENDING_MASTER.md:12117 |
| secrets-gate-in-ci-ensure-banned-literals-test-is-wired-into-ci-and-extended-token-list-verified-p1-missing-missing-tests-docs-pending-maste | P3 | open | Missing Tests | \| Secrets gate in CI \| Ensure banned-literals test is wired into CI and extended token list verified. \| P1 \| 🔴 Missing \| | docs/PENDING_MASTER.md:12116 |
| env-guards-tests-for-aws-region-aws-s3-bucket-fail-fast-and-rotation-script-env-requirements-p1-missing-missing-tests-docs-pending-master-md | P3 | open | Missing Tests | \| Env guards \| Tests for AWS_REGION/AWS_S3_BUCKET fail-fast and rotation script env requirements. \| P1 \| 🔴 Missing \| | docs/PENDING_MASTER.md:12115 |
| souq-rule-overrides-unit-integration-tests-for-override-vs-base-config-across-returns-claims-fulfillment-pricing-assert-telemetry-counters-p | P3 | open | Missing Tests | \| Souq rule overrides \| Unit/integration tests for override vs base config across returns/claims/fulfillment/pricing; assert telemetry counters. \| P0 \| 🔴 Missing \| | docs/PENDING_MASTER.md:12114 |
| hardened-superadmin-rotation-to-env-only-credentials-via-requireenv-with-no-literal-echoes-fails-fast-when-envs-are-missing-scripts-update-s | P3 | open | Bugs | ✅ Hardened SuperAdmin rotation to env-only credentials via `requireEnv` with no literal echoes; fails fast when envs are missing (`scripts/update-superadmin-credentials.ts:21-91`). | scripts/update-superadmin-credentials.ts:21-91 |
| workflow-env-gaps-release-gate-environments-missing-creating-staging-production-approval-production-resolves-all-workflow-warnings-without-c | P3 | open | Missing Tests | **Workflow env gaps**: release-gate environments missing; creating `staging`, `production-approval`, `production` resolves all workflow warnings without code changes. | docs/PENDING_MASTER.md:12063 |
| marketplace-souq-settlements-seller-flow-coverage-high-pending-missing-tests-docs-pending-master-md-12057 | P3 | open | Missing Tests | \| Marketplace/Souq \| Settlements/seller flow coverage \| 🟡 High \| ⏳ Pending \| | docs/PENDING_MASTER.md:12057 |
| auth-api-broaden-coverage-across-14-auth-routes-high-pending-missing-tests-docs-pending-master-md-12056 | P3 | open | Missing Tests | \| Auth/API \| Broaden coverage across 14 auth routes \| 🟡 High \| ⏳ Pending \| | docs/PENDING_MASTER.md:12056 |
| payments-tap-unit-webhook-tests-for-lib-finance-tap-payments-ts-lib-finance-checkout-ts-critical-pending-missing-tests-lib-finance-tap-payme | P3 | open | Missing Tests | \| Payments/TAP \| Unit + webhook tests for `lib/finance/tap-payments.ts`, `lib/finance/checkout.ts` \| 🔴 Critical \| ⏳ Pending \| | lib/finance/tap-payments.ts |
| workflow-diagnostics-confirmed-as-environment-setup-gaps-staging-production-approval-production-rather-than-code-defects-next-steps-docs-pen | P3 | open | Next Steps | Workflow diagnostics confirmed as environment setup gaps (staging / production-approval / production) rather than code defects. | docs/PENDING_MASTER.md:12026 |
| logic-playwright-smoke-timeout-open-diagnose-e2e-hang-run-narrowed-suite-with-debug-timeout-flags-inspect-playwright-hooks-setup-next-steps- | P3 | open | Next Steps | \| Logic \| Playwright smoke timeout \| Open \| Diagnose E2E hang; run narrowed suite with debug/timeout flags; inspect Playwright hooks/setup. \| | docs/PENDING_MASTER.md:12009 |
| bugs-release-gate-environments-missing-open-create-github-environments-staging-production-approval-production-to-silence-workflow-warnings-n | P3 | open | Next Steps | \| Bugs \| Release-gate environments missing \| Open \| Create GitHub environments `staging`, `production-approval`, `production` to silence workflow warnings. \| | docs/PENDING_MASTER.md:12008 |
| logging-replace-remaining-console-usages-with-logger-for-observability-and-pii-safety-next-steps-docs-pending-master-md-12000 | P3 | open | Next Steps | Logging: replace remaining console usages with `logger` for observability and PII safety. | docs/PENDING_MASTER.md:12000 |
| tests-backfill-the-11-service-unit-gaps-keep-lint-typecheck-test-gates-green-after-changes-next-steps-docs-pending-master-md-11999 | P3 | open | Next Steps | Tests: backfill the 11 service/unit gaps; keep lint/typecheck/test gates green after changes. | docs/PENDING_MASTER.md:11999 |
| aqar-listing-package-favorites-tests-failing-when-orgid-absent-and-asserting-correct-tenant-org-persisted-todo-missing-tests-docs-pending-ma | P3 | open | Missing Tests | \| Aqar listing/package/favorites \| Tests failing when orgId absent and asserting correct tenant org persisted \| 🔲 TODO \| | docs/PENDING_MASTER.md:11981 |
| souq-review-post-test-enforcing-session-orgid-and-stored-org-consistency-todo-missing-tests-docs-pending-master-md-11980 | P3 | open | Missing Tests | \| Souq review POST \| Test enforcing session orgId and stored org consistency \| 🔲 TODO \| | docs/PENDING_MASTER.md:11980 |
| graphql-org-enforcement-coverage-for-org-required-orgless-rejection-on-queries-mutations-todo-missing-tests-docs-pending-master-md-11979 | P3 | open | Missing Tests | \| GraphQL org enforcement \| Coverage for org-required + orgless rejection on queries/mutations \| 🔲 TODO \| | docs/PENDING_MASTER.md:11979 |
| short-circuit-graphql-reads-when-orgid-missing-todo-fail-before-db-work-for-dashboard-workorder-properties-invoice-to-prevent-orgless-scans- | P3 | open | Efficiency | \| Short-circuit GraphQL reads when orgId missing \| 🔲 TODO \| Fail before DB work for dashboard/workOrder/properties/invoice to prevent orgless scans. \| | docs/PENDING_MASTER.md:11956 |
| normalize-org-once-per-graphql-request-and-reuse-todo-avoid-repeated-types-objectid-isvalid-calls-set-tenant-audit-context-once-per-request- | P3 | open | Efficiency | \| Normalize org once per GraphQL request and reuse \| 🔲 TODO \| Avoid repeated `Types.ObjectId.isValid` calls; set tenant/audit context once per request. \| | Types.ObjectId.isValid |
| next-steps-enforce-required-orgid-tenant-audit-context-on-graphql-reads-writes-remove-user-id-fallbacks-in-souq-aqar-writes-add-regression-t | P3 | open | Next Steps | Next steps: Enforce required orgId + tenant/audit context on GraphQL reads/writes, remove user-id fallbacks in Souq/Aqar writes, add regression tests, then run `pnpm typecheck && pnpm lint && pnpm tes | docs/PENDING_MASTER.md:11948 |
| progress-located-master-pending-report-and-refreshed-orgid-audit-notes-mapped-user-id-fallbacks-and-missing-tenant-audit-context-across-grap | P3 | open | Next Steps | Progress: Located Master Pending Report and refreshed orgId audit notes; mapped user-id fallbacks and missing tenant/audit context across GraphQL queries/mutations and Souq/Aqar write routes. | docs/PENDING_MASTER.md:11947 |
| scan-token-auth-tests-ensuring-token-based-status-scan-paths-are-tenant-namespaced-and-fail-on-org-mismatch-or-missing-token-todo-missing-te | P3 | open | Missing Tests | \| Scan token auth \| Tests ensuring token-based status/scan paths are tenant-namespaced and fail on org mismatch or missing token. \| 🔲 TODO \| | docs/PENDING_MASTER.md:11928 |
| upload-metadata-scan-integration-tests-that-reject-keys-outside-the-caller-s-org-prefix-and-validate-org-bound-signing-for-scan-metadata-sta | P3 | open | Missing Tests | \| Upload metadata/scan \| Integration tests that reject keys outside the caller’s org prefix and validate org-bound signing for scan/metadata/status routes. \| 🔲 TODO \| | docs/PENDING_MASTER.md:11927 |
| early-reject-unscoped-s3-keys-todo-validate-org-bind-keys-before-hitting-s3-db-in-upload-scan-verify-routes-to-cut-needless-calls-and-noisy- | P3 | open | Efficiency | \| Early reject unscoped S3 keys \| 🔲 TODO \| Validate/org-bind keys before hitting S3/DB in upload scan/verify routes to cut needless calls and noisy logs. \| | docs/PENDING_MASTER.md:11909 |
| next-steps-add-tenant-bound-s3-key-validation-shared-helper-for-upload-routes-namespace-scan-tokens-per-org-backfill-regression-tests-then-r | P3 | open | Next Steps | Next steps: Add tenant-bound S3 key validation + shared helper for upload routes, namespace scan tokens per org, backfill regression tests, then run `pnpm typecheck && pnpm lint && pnpm test`. | docs/PENDING_MASTER.md:11902 |
| progress-located-master-pending-report-reviewed-upload-scan-status-verify-metadata-flows-and-safe-session-adoption-for-tenant-isolation-no-c | P3 | open | Next Steps | Progress: Located Master Pending Report; reviewed upload scan/status/verify-metadata flows and safe-session adoption for tenant isolation; no code changes yet (documentation-only). | docs/PENDING_MASTER.md:11901 |
| typecheck-lint-tests-not-run-docs-only-update-pending-next-steps-docs-pending-master-md-11899 | P3 | open | Next Steps | \| Typecheck/Lint/Tests \| Not run (docs-only update) \| ⏳ Pending \| | docs/PENDING_MASTER.md:11899 |
| typecheck-lint-tests-typecheck-lint-test-models-test-e2e-timed-out-scripts-run-playwright-sh-needs-rerun-or-skip-flag-next-steps-scripts-run | P3 | open | Next Steps | \| Typecheck/Lint/Tests \| typecheck ✅; lint ✅; test:models ✅; test:e2e ⏳ Timed out (scripts/run-playwright.sh) \| ⏳ Needs rerun or skip flag \| | scripts/run-playwright.sh |
| auth-errors-401-token-missing-expired-invalid-credentials-revoked-session-unauthorizederror-bugs-docs-pending-master-md-11834 | P3 | open | Bugs | **Auth errors (401)**: Token missing/expired, invalid credentials, revoked session, UnauthorizedError | docs/PENDING_MASTER.md:11834 |
| next-steps-stage-and-commit-remaining-uncommitted-files-from-previous-sessions-update-pending-master-with-route-fix-summary-consider-adding- | P3 | open | Next Steps | Next steps: Stage and commit remaining uncommitted files from previous sessions; update PENDING_MASTER with route fix summary; consider adding negative-path tests for auth infra failure scenarios. | docs/PENDING_MASTER.md:11786 |
| no-e2e-for-critical-flows-settlements-payouts-kyc-approval-missing-end-to-end-validation-missing-tests-docs-pending-master-md-11758 | P3 | open | Missing Tests | **No E2E for critical flows**: Settlements, payouts, KYC approval missing end-to-end validation | docs/PENDING_MASTER.md:11758 |
| missing-negative-path-tests-no-tests-for-auth-infra-failures-db-outages-rate-limit-hits-missing-tests-docs-pending-master-md-11757 | P3 | open | Missing Tests | **Missing negative-path tests**: No tests for auth infra failures, DB outages, rate limit hits | docs/PENDING_MASTER.md:11757 |
| missing-integration-tests-settlement-flows-kyc-verification-billing-benchmarks-have-no-coverage-missing-tests-docs-pending-master-md-11756 | P3 | open | Missing Tests | **Missing integration tests**: Settlement flows, KYC verification, billing benchmarks have no coverage | docs/PENDING_MASTER.md:11756 |
| app-api-souq-seller-central-kyc-pending-route-ts-missing-tests-app-api-souq-seller-central-kyc-pending-route-ts | P3 | open | Missing Tests | app/api/souq/seller-central/kyc/pending/route.ts | app/api/souq/seller-central/kyc/pending/route.ts |
| module-routes-tests-coverage-priority-missing-tests-missing-tests-docs-pending-master-md-11634 | P3 | open | Missing Tests | \| Module \| Routes \| Tests \| Coverage \| Priority Missing Tests \| | docs/PENDING_MASTER.md:11634 |
| p2-add-negative-path-tests-for-auth-infra-failure-scenarios-next-steps-docs-pending-master-md-11621 | P3 | open | Next Steps | P2: Add negative-path tests for auth infra failure scenarios | docs/PENDING_MASTER.md:11621 |
| p2-split-large-route-files-auth-otp-send-1091-lines-payments-tap-webhook-815-lines-next-steps-docs-pending-master-md-11620 | P3 | open | Next Steps | P2: Split large route files (auth/otp/send 1091 lines, payments/tap/webhook 815 lines) | docs/PENDING_MASTER.md:11620 |
| p1-add-priority-module-tests-souq-settlements-ads-seller-central-admin-notifications-billing-fm-work-orders-next-steps-docs-pending-master-m | P3 | open | Next Steps | P1: Add priority module tests (Souq settlements/ads/seller-central, Admin notifications/billing, FM work-orders) | docs/PENDING_MASTER.md:11619 |
| analyzed-test-coverage-gaps-souq-51-75-missing-admin-26-28-missing-fm-19-25-missing-missing-tests-docs-pending-master-md-11616 | P3 | open | Missing Tests | ✅ Analyzed test coverage gaps: Souq 51/75 missing, Admin 26/28 missing, FM 19/25 missing | docs/PENDING_MASTER.md:11616 |
| pushed-all-commits-to-docs-pending-v60-head-d8aa6a892-next-steps-docs-pending-master-md-11615 | P3 | open | Next Steps | ✅ Pushed all commits to `docs/pending-v60` (HEAD: `d8aa6a892`) | docs/PENDING_MASTER.md:11615 |
| committed-12-commits-utility-files-tests-api-fixes-services-docs-next-steps-docs-pending-master-md-11614 | P3 | open | Next Steps | ✅ Committed 12 commits (utility files, tests, API fixes, services, docs) | docs/PENDING_MASTER.md:11614 |
| applied-auth-infra-aware-helper-to-29-occurrences-across-25-routes-next-steps-docs-pending-master-md-11613 | P3 | open | Next Steps | ✅ Applied auth-infra-aware helper to 29 occurrences across 25 routes | docs/PENDING_MASTER.md:11613 |
| created-lib-auth-safe-session-ts-with-getsessionorerror-getsessionornull-helpers-bugs-lib-auth-safe-session-ts | P3 | open | Bugs | ✅ Created `lib/auth/safe-session.ts` with `getSessionOrError`/`getSessionOrNull` helpers | lib/auth/safe-session.ts |
| scope-test-coverage-gap-analysis-route-size-audit-analyzed-missing-tests-docs-pending-master-md-11608 | P3 | open | Missing Tests | \| Scope \| Test coverage gap analysis + route size audit \| ✅ Analyzed \| | docs/PENDING_MASTER.md:11608 |
| bc5f60662-test-p1-add-critical-module-tests-claims-users-budgets-next-steps-docs-pending-master-md-11494 | P3 | open | Next Steps | `bc5f60662` - test(P1): add critical module tests - claims, users, budgets | docs/PENDING_MASTER.md:11494 |
| a29893220-refactor-p2-extract-helpers-from-large-routes-p1-module-tests-efficiency-docs-pending-master-md-11493 | P3 | open | Efficiency | `a29893220` - refactor(P2): extract helpers from large routes + P1 module tests | docs/PENDING_MASTER.md:11493 |
| payments-tap-webhook-815-lines-extracted-to-lib-finance-tap-webhook-handlers-ts-persistence-ts-next-steps-lib-finance-tap-webhook-handlers-t | P3 | open | Next Steps | `payments/tap/webhook` (815 lines) → extracted to `lib/finance/tap-webhook/handlers.ts` + `persistence.ts` | lib/finance/tap-webhook/handlers.ts |
| auth-otp-send-1091-lines-extracted-to-lib-auth-otp-test-users-ts-lib-auth-otp-helpers-ts-next-steps-lib-auth-otp-test-users-ts | P3 | open | Next Steps | `auth/otp/send` (1091 lines) → extracted to `lib/auth/otp/test-users.ts` + `lib/auth/otp/helpers.ts` | lib/auth/otp/test-users.ts |
| route-refactoring-p2-extracted-helpers-from-2-large-route-files-efficiency-docs-pending-master-md-11482 | P3 | open | Efficiency | ✅ **Route Refactoring (P2)**: Extracted helpers from 2 large route files | docs/PENDING_MASTER.md:11482 |
| settings-route-test-ts-17-souq-repricer-settings-next-steps-settings-route-test-ts | P3 | open | Next Steps | `settings.route.test.ts` (17) - Souq repricer settings | settings.route.test.ts |
| safe-session-test-ts-11-auth-infra-failure-scenarios-next-steps-safe-session-test-ts | P3 | open | Next Steps | `safe-session.test.ts` (11) - Auth infra failure scenarios | safe-session.test.ts |
| fm-work-orders-id-transition-route-ts-extracted-to-lib-fsm-transitions-ts-transition-context-ts-next-steps-transition-route-ts | P3 | open | Next Steps | `fm/work-orders/[id]/transition/route.ts` → extracted to `_lib/fsm-transitions.ts`, `transition-context.ts` | /transition/route.ts |
| souq-orders-route-ts-extracted-to-lib-order-lifecycle-ts-order-validation-ts-next-steps-souq-orders-route-ts | P3 | open | Next Steps | `souq/orders/route.ts` → extracted to `_lib/order-lifecycle.ts`, `order-validation.ts` | souq/orders/route.ts |
| admin-notifications-send-route-ts-extracted-to-lib-channel-handlers-ts-recipient-resolver-ts-next-steps-admin-notifications-send-route-ts | P3 | open | Next Steps | `admin/notifications/send/route.ts` → extracted to `_lib/channel-handlers.ts`, `recipient-resolver.ts` | admin/notifications/send/route.ts |
| search-route-ts-extracted-to-lib-permissions-ts-scoping-ts-entity-builders-ts-logic-errors-search-route-ts | P3 | open | Logic Errors | `search/route.ts` → extracted to `_lib/permissions.ts`, `scoping.ts`, `entity-builders.ts` | search/route.ts |
| returns-503-on-organization-lookup-db-failure-next-steps-docs-pending-master-md-11332 | P3 | open | Next Steps | Returns 503 on organization lookup DB failure | docs/PENDING_MASTER.md:11332 |
| returns-503-on-optional-module-import-failure-next-steps-docs-pending-master-md-11329 | P3 | open | Next Steps | Returns 503 on optional module import failure | docs/PENDING_MASTER.md:11329 |
| admin-notifications-test-route-ts-1-needs-logging-next-steps-admin-notifications-test-route-ts | P3 | open | Next Steps | `admin/notifications/test/route.ts` (1) — needs logging | admin/notifications/test/route.ts |
| 22-accessibility-needs-audit-a11y-review-needed-next-steps-docs-pending-master-md-11169 | P3 | open | Next Steps | \| 22. Accessibility \| ⏳ Needs audit \| a11y review needed \| | docs/PENDING_MASTER.md:11169 |
| 21-i18n-completeness-needs-audit-translation-coverage-varies-missing-tests-docs-pending-master-md-11168 | P3 | open | Missing Tests | \| 21. i18n completeness \| ⏳ Needs audit \| Translation coverage varies \| | docs/PENDING_MASTER.md:11168 |
| 14-bundle-size-needs-build-analysis-run-next-build-analyze-next-steps-docs-pending-master-md-11161 | P3 | open | Next Steps | \| 14. Bundle size \| ⏳ Needs build analysis \| Run `next build --analyze` \| | docs/PENDING_MASTER.md:11161 |
| 13-n-1-queries-needs-review-flag-in-list-endpoints-next-steps-docs-pending-master-md-11160 | P3 | open | Next Steps | \| 13. N+1 queries \| ⏳ Needs review \| Flag in list endpoints \| | docs/PENDING_MASTER.md:11160 |
| 9-index-verification-needs-db-review-requires-mongosh-verification-next-steps-docs-pending-master-md-11156 | P3 | open | Next Steps | \| 9. Index verification \| ⏳ Needs DB review \| Requires mongosh verification \| | docs/PENDING_MASTER.md:11156 |
| requireorgid-session-string-throws-if-missing-next-steps-docs-pending-master-md-11058 | P3 | open | Next Steps | requireOrgId(session): string - throws if missing | docs/PENDING_MASTER.md:11058 |
| deep-dive-analysis-on-similar-patterns-across-codebase-next-steps-docs-pending-master-md-11025 | P3 | open | Next Steps | ✅ **Deep-dive analysis** on similar patterns across codebase | docs/PENDING_MASTER.md:11025 |
| identified-19-remaining-issues-requiring-attention-5-8-6-next-steps-docs-pending-master-md-11023 | P3 | open | Next Steps | ✅ **Identified 19 remaining issues** requiring attention (5 🔴, 8 🟠, 6 🟡) | docs/PENDING_MASTER.md:11023 |
| scanned-entire-codebase-for-23-priority-action-categories-next-steps-docs-pending-master-md-11022 | P3 | open | Next Steps | ✅ **Scanned entire codebase** for 23 priority action categories | docs/PENDING_MASTER.md:11022 |
| playwright-only-branches-still-sparse-across-dashboard-modules-system-page-needed-arabic-h1-finance-hr-already-covered-audit-remaining-dashb | P3 | open | Next Steps | Playwright-only branches still sparse across dashboard modules; system page needed Arabic H1, finance/HR already covered — audit remaining `/dashboard/**` pages for PLAYWRIGHT_TESTS hooks to prevent f | docs/PENDING_MASTER.md:11003 |
| missing-tests-add-regression-smoke-to-assert-playwright-header-has-dashboard-link-and-supportorg-fallback-yields-no-boundary-errors-unit-tes | P3 | open | Missing Tests | Missing tests: add regression smoke to assert Playwright header has Dashboard link and SupportOrg fallback yields no boundary errors; unit test for Playwright PDP stub to ensure button renders without | docs/PENDING_MASTER.md:11000 |
| next-re-run-smoke-after-server-cooldown-address-copilot-strict-layout-tenant-isolation-failures-keep-playwright-flags-set-in-pipeline-ensure | P3 | open | Next Steps | Next: Re-run smoke after server cooldown; address Copilot STRICT layout/tenant isolation failures; keep PLAYWRIGHT flags set in pipeline; ensure marketplace cart flow stays green after stubs. | docs/PENDING_MASTER.md:10994 |
| services-souq-seller-kyc-service-ts-262-282-seller-kycstatus-status-set-to-approved-after-company-info-before-document-bank-verification-pre | P3 | open | Next Steps | `services/souq/seller-kyc-service.ts:262-282` — `seller.kycStatus.status` set to `"approved"` after company_info before document/bank verification; prematurely activates seller. Action: keep status `" | services/souq/seller-kyc-service.ts:262-282 |
| add-deterministic-success-paths-and-coverage-for-rate-limit-cross-tenant-rejection-and-vendor-scoping-in-related-tests-missing-tests-docs-pe | P3 | open | Missing Tests | Add deterministic success paths and coverage for rate-limit, cross-tenant rejection, and vendor scoping in related tests. | docs/PENDING_MASTER.md:10961 |
| add-seller-vendor-rbac-guard-and-vendor-id-scoping-to-souq-kyc-submission-route-service-align-with-marketplace-role-matrix-logic-errors-docs | P3 | open | Logic Errors | Add seller/vendor RBAC guard and vendor_id scoping to Souq KYC submission route + service; align with marketplace role matrix. | docs/PENDING_MASTER.md:10960 |
| add-unit-level-tenant-scoping-org-id-unit-id-across-fm-helpers-and-budgets-queries-backfill-data-to-persist-unitid-logic-errors-docs-pending | P3 | open | Logic Errors | Add unit-level tenant scoping (org_id + unit_id) across FM helpers and budgets queries; backfill data to persist `unitId`. | docs/PENDING_MASTER.md:10959 |
| next-re-run-pnpm-test-e2e-project-smoke-reporter-line-after-cooldown-triage-tests-copilot-copilot-spec-ts-failures-consider-extending-playwr | P3 | open | Next Steps | Next: Re-run `pnpm test:e2e -- --project smoke --reporter=line` after cooldown; triage `tests/copilot/copilot.spec.ts` failures; consider extending Playwright-safe guard to other org guard hooks; alig | tests/copilot/copilot.spec.ts |
| ongoing-playwright-smoke-rerun-required-previous-runs-timed-out-copilot-strict-specs-still-failing-in-full-test-run-layout-preservation-tena | P3 | open | Next Steps | Ongoing: Playwright smoke rerun required (previous runs timed out); copilot STRICT specs still failing in full test run (layout preservation, tenant isolation, intent routing). | docs/PENDING_MASTER.md:10925 |
| test-coverage-gaps-current-unit-tests-allow-200-500-in-souq-kyc-and-lack-unit-scope-assertions-in-fm-budgets-masking-regressions-in-scoping- | P3 | open | Missing Tests | **Test coverage gaps**: Current unit tests allow `[200,500]` in Souq KYC and lack unit-scope assertions in FM budgets, masking regressions in scoping and RBAC. | docs/PENDING_MASTER.md:10917 |
| super-admin-cross-tenant-gap-for-fm-budgets-cross-tenant-marker-yields-query-without-explicit-tenant-unit-selection-a-super-admin-could-list | P3 | open | Next Steps | **Super Admin cross-tenant gap**: For FM budgets, cross-tenant marker yields `{}` query; without explicit tenant+unit selection, a Super Admin could list all budgets. Requires explicit gating or tenan | docs/PENDING_MASTER.md:10916 |
| gate-super-admin-cross-tenant-fm-budgets-listing-currently-empty-filter-when-tenantid-is-cross-marker-next-steps-docs-pending-master-md-1089 | P3 | open | Next Steps | Gate super-admin cross-tenant FM budgets listing (currently empty filter when tenantId is cross marker). | docs/PENDING_MASTER.md:10898 |
| add-compound-index-orgid-1-unitid-1-department-1-updatedat-1-to-budgets-collection-to-avoid-scans-next-steps-docs-pending-master-md-10897 | P3 | open | Next Steps | Add compound index `{ orgId: 1, unitId: 1, department: 1, updatedAt: -1 }` to budgets collection to avoid scans. | docs/PENDING_MASTER.md:10897 |
| add-deterministic-tests-for-fm-budgets-unit-scoping-including-multi-unit-selection-and-souq-kyc-vendor-guard-logic-errors-docs-pending-maste | P3 | open | Logic Errors | Add deterministic tests for FM budgets unit scoping (including multi-unit selection) and Souq KYC vendor guard. | docs/PENDING_MASTER.md:10896 |
| confirmed-souq-kyc-route-uses-rbac-vendor-only-and-service-enforces-vendor-ownership-in-review-status-progression-next-steps-docs-pending-ma | P3 | open | Next Steps | Confirmed Souq KYC route uses RBAC (vendor-only) and service enforces vendor ownership + `in_review` status progression. | docs/PENDING_MASTER.md:10893 |
| confirmed-fm-budgets-get-post-enforce-orgid-unitid-via-resolveunitscope-and-buildtenantfilter-unit-aware-next-steps-docs-pending-master-md-1 | P3 | open | Next Steps | Confirmed FM budgets GET/POST enforce orgId + unitId via `resolveUnitScope` and `buildTenantFilter` (unit-aware). | docs/PENDING_MASTER.md:10892 |
| run-targeted-suites-vitest-for-fm-budgets-and-souq-kyc-on-next-code-change-touching-those-areas-next-steps-docs-pending-master-md-10827 | P3 | open | Next Steps | Run targeted suites (`vitest` for FM budgets and Souq KYC) on next code change touching those areas. | docs/PENDING_MASTER.md:10827 |
| if-any-ambiguity-arises-during-concurrent-edits-record-assumptions-and-coordination-notes-directly-in-this-report-before-proceeding-next-ste | P3 | open | Next Steps | If any ambiguity arises during concurrent edits, record assumptions and coordination notes directly in this report before proceeding. | docs/PENDING_MASTER.md:10826 |
| socialize-the-updated-instructions-with-all-agents-ensure-new-guidance-is-honored-in-upcoming-changes-next-steps-docs-pending-master-md-1082 | P3 | open | Next Steps | Socialize the updated instructions with all agents; ensure new guidance is honored in upcoming changes. | docs/PENDING_MASTER.md:10825 |
| reaffirmed-alignment-to-final-fixizit-system-prompt-v3-1-and-agents-md-invariants-next-steps-v3-1 | P3 | open | Next Steps | Reaffirmed alignment to Final Fixizit System Prompt v3.1 and AGENTS.md invariants. | v3.1 |
| rbac-gaps-on-sensitive-routes-souq-kyc-submit-lacked-seller-role-guard-similar-to-past-marketplace-payout-reviews-routes-pattern-routes-rely | P3 | open | Next Steps | **RBAC gaps on sensitive routes**: Souq KYC submit lacked seller-role guard similar to past marketplace payout/reviews routes. Pattern: routes relying solely on `auth()` without `hasAnyRole`/RBAC cont | docs/PENDING_MASTER.md:10804 |
| kyc-company-info-step-previously-set-status-to-approved-corrected-to-pending-documents-ensure-approval-only-happens-in-verifydocument-approv | P3 | open | Next Steps | KYC company_info step previously set status to approved; corrected to pending/documents. Ensure approval only happens in verifyDocument/approveKYC paths. | docs/PENDING_MASTER.md:10796 |
| backfill-fm-budgets-route-with-unitid-scoping-once-shared-tenant-helper-supports-unit-arrays-add-compound-index-orgid-unitid-department-upda | P3 | open | Logic Errors | Backfill FM budgets route with unitId scoping once shared tenant helper supports unit arrays; add compound index `{ orgId, unitId, department, updatedAt }`. | docs/PENDING_MASTER.md:10784 |
| extend-integration-tests-to-cover-kyc-document-bank-verification-paths-and-super-admin-header-override-behavior-next-steps-docs-pending-mast | P3 | open | Next Steps | Extend integration tests to cover KYC document/bank verification paths and super-admin header override behavior. | docs/PENDING_MASTER.md:10783 |
| audit-souq-kyc-service-for-vendor-ownership-scoping-across-all-steps-and-align-route-to-pass-vendorid-explicitly-if-required-logic-errors-do | P3 | open | Logic Errors | Audit Souq KYC service for vendor ownership scoping across all steps and align route to pass vendorId explicitly if required. | docs/PENDING_MASTER.md:10782 |
| run-pnpm-typecheck-pnpm-lint-to-complete-gates-next-steps-docs-pending-master-md-10781 | P3 | open | Next Steps | Run `pnpm typecheck && pnpm lint` to complete gates. | docs/PENDING_MASTER.md:10781 |
| re-ran-budgets-unit-tests-suite-green-with-existing-tenant-unit-aware-mocks-next-steps-docs-pending-master-md-10778 | P3 | open | Next Steps | Re-ran budgets unit tests; suite green with existing tenant/unit-aware mocks. | docs/PENDING_MASTER.md:10778 |
| tightened-kyc-unit-tests-deterministic-200-expectations-non-seller-negative-case-service-call-assertions-now-match-vendorid-injection-next-s | P3 | open | Next Steps | Tightened KYC unit tests: deterministic 200 expectations, non-seller negative case, service call assertions now match vendorId injection. | docs/PENDING_MASTER.md:10777 |
| typecheck-lint-not-run-this-session-pending-next-steps-docs-pending-master-md-10772 | P3 | open | Next Steps | \| Typecheck/Lint \| Not run this session \| ⏳ Pending \| | docs/PENDING_MASTER.md:10772 |
| validation-typing-gaps-marketplace-routes-construct-zod-errors-from-plain-arrays-similar-pattern-across-cart-rfq-vendor-products-souq-ads-ca | P3 | open | Bugs | **Validation typing gaps**: marketplace routes construct Zod errors from plain arrays; similar pattern across cart/rfq/vendor products/souq ads campaigns leads to TS errors and weak validation. | docs/PENDING_MASTER.md:10759 |
| issue-tracker-scripts-implicit-any-parameters-and-missing-commander-import-break-cli-typing-and-may-fail-at-runtime-next-steps-docs-pending- | P3 | open | Next Steps | issue-tracker scripts: implicit any parameters and missing commander import break CLI typing and may fail at runtime. | docs/PENDING_MASTER.md:10750 |
| issue-tracker-model-virtuals-age-isstale-typings-missing-effort-priority-enums-mismatched-in-model-methods-p0-l-not-allowed-by-types-next-st | P3 | open | Next Steps | issue-tracker model virtuals: `age`/`isStale` typings missing, effort/priority enums mismatched in model methods (P0/L not allowed by types). | docs/PENDING_MASTER.md:10749 |
| souq-ads-campaigns-unknown-values-assigned-to-enums-type-errors-potential-runtime-validation-gaps-bugs-docs-pending-master-md-10746 | P3 | open | Bugs | souq ads campaigns: unknown values assigned to enums (type errors), potential runtime validation gaps. | docs/PENDING_MASTER.md:10746 |
| issue-tracker-routes-missing-modules-models-issue-lib-db-lib-auth-and-outdated-getserversession-import-causes-typecheck-failures-and-potenti | P3 | open | Bugs | issue-tracker routes: missing modules (`@/models/issue`, `@/lib/db`, `@/lib/auth`) and outdated `getServerSession` import; causes typecheck failures and potential runtime crashes. | docs/PENDING_MASTER.md:10744 |
| follow-ups-add-kyc-integration-tests-for-document-bank-verification-and-super-admin-override-add-fm-budgets-compound-index-orgid-unitid-depa | P3 | open | Next Steps | Follow-ups: add KYC integration tests for document/bank verification and super-admin override; add FM budgets compound index `{ orgId, unitId, department, updatedAt: -1 }` and unitId persistence/rejec | docs/PENDING_MASTER.md:10735 |
| lint-cleanup-remove-console-any-unused-vars-across-issue-tracker-app-api-issues-route-ts-and-app-marketplace-page-tsx-re-run-pnpm-lint-next- | P3 | open | Next Steps | Lint cleanup: remove console/any/unused vars across issue-tracker, app/api/issues/route.ts, and app/marketplace/page.tsx; re-run `pnpm lint`. | app/api/issues/route.ts |
| typecheck-pass-2-aqar-marketplace-fix-enum-nullable-handling-in-aqar-listing-route-correct-zod-error-handling-unknown-casting-in-marketplace | P3 | open | Bugs | Typecheck Pass 2 (aqar/marketplace): fix enum/nullable handling in aqar listing route; correct Zod error handling/unknown casting in marketplace cart/rfq/vendor products and souq ads campaigns; re-run | docs/PENDING_MASTER.md:10733 |
| typecheck-pass-1-issue-tracker-issues-api-fix-imports-types-null-guards-getserversession-wiring-virtual-typings-missing-deps-re-run-pnpm-typ | P3 | open | Next Steps | Typecheck Pass 1 (issue-tracker & issues API): fix imports/types, null guards, getServerSession wiring, virtual typings, missing deps; re-run `pnpm typecheck`. | docs/PENDING_MASTER.md:10732 |
| typecheck-lint-triage-identified-failing-files-aqar-listings-issues-api-marketplace-ads-cart-rfq-vendor-products-issue-tracker-app-models-sc | P3 | open | Next Steps | Typecheck/lint triage: identified failing files (aqar listings, issues API, marketplace ads/cart/rfq/vendor products, issue-tracker app/models/scripts). | docs/PENDING_MASTER.md:10729 |
| fm-budgets-route-unitid-scoping-enforced-via-resolveunitscope-and-buildtenantfilter-unit-support-tests-passing-logic-errors-docs-pending-mas | P3 | open | Logic Errors | FM budgets route: unitId scoping enforced via `resolveUnitScope` and `buildTenantFilter` unit support; tests passing. | docs/PENDING_MASTER.md:10728 |
| souq-kyc-submit-seller-only-rbac-guard-company-info-no-longer-auto-approves-vendorid-passed-into-service-unit-tests-tightened-and-passing-ne | P3 | open | Next Steps | Souq KYC submit: seller-only RBAC guard; company_info no longer auto-approves; vendorId passed into service; unit tests tightened and passing. | docs/PENDING_MASTER.md:10727 |
| gates-pnpm-typecheck-50-ts-errors-pnpm-lint-135-errors-pending-fixes-bugs-docs-pending-master-md-10724 | P3 | open | Bugs | \| Gates \| `pnpm typecheck` ❌ (50+ TS errors); `pnpm lint` ❌ (135 errors) \| ⏳ Pending fixes \| | docs/PENDING_MASTER.md:10724 |
| normalize-fm-expenses-tests-to-require-deterministic-200-201-responses-and-assert-response-bodies-enforce-orgid-unitid-expectations-on-inser | P3 | open | Next Steps | Normalize FM expenses tests to require deterministic 200/201 responses and assert response bodies; enforce orgId/unitId expectations on inserts. | docs/PENDING_MASTER.md:10646 |
| apply-rbac-vendor-ownership-guard-to-souq-kyc-submit-route-align-sellerkycservice-with-vendor-id-scoping-and-staged-approvals-logic-errors-d | P3 | open | Logic Errors | Apply RBAC/vendor ownership guard to Souq KYC submit route; align sellerKYCService with vendor_id scoping and staged approvals. | docs/PENDING_MASTER.md:10645 |
| flagged-parallel-lenient-status-assertions-in-fm-expenses-tests-to-close-false-negative-gaps-next-steps-docs-pending-master-md-10629 | P3 | open | Next Steps | Flagged parallel lenient status assertions in FM expenses tests to close false-negative gaps. | docs/PENDING_MASTER.md:10629 |
| test-coverage-add-unit-tests-for-json-parse-rejection-fm-cross-unit-kyc-rbac-missing-tests-docs-pending-master-md-10620 | P3 | open | Missing Tests | **Test Coverage:** Add unit tests for JSON-PARSE rejection, FM cross-unit, KYC RBAC | docs/PENDING_MASTER.md:10620 |
| kyc-workflow-fix-premature-approval-pattern-in-seller-kyc-service-next-steps-docs-pending-master-md-10619 | P3 | open | Next Steps | **KYC Workflow:** Fix premature approval pattern in seller-kyc-service | docs/PENDING_MASTER.md:10619 |
| fm-unit-scoping-extend-buildtenantfilter-to-include-unitid-logic-errors-docs-pending-master-md-10618 | P3 | open | Logic Errors | **FM Unit Scoping:** Extend `buildTenantFilter` to include `unitId` | docs/PENDING_MASTER.md:10618 |
| sprint-1-continuation-apply-parsebodysafe-to-remaining-44-routes-batch-by-module-next-steps-docs-pending-master-md-10616 | P3 | open | Next Steps | **Sprint 1 Continuation:** Apply `parseBodySafe` to remaining 44 routes (batch by module) | docs/PENDING_MASTER.md:10616 |
| recommendation-keep-status-as-pending-in-review-until-all-verification-steps-complete-missing-tests-docs-pending-master-md-10597 | P3 | open | Missing Tests | **Recommendation:** Keep status as "pending"/"in_review" until all verification steps complete. | docs/PENDING_MASTER.md:10597 |
| rbac-tenant-guard-gap-kyc-submit-route-lacks-seller-vendor-rbac-service-lookup-is-org-only-enabling-cross-seller-submission-next-steps-docs- | P3 | open | Next Steps | **RBAC/tenant guard gap** — KYC submit route lacks seller/vendor RBAC; service lookup is org-only, enabling cross-seller submission. | docs/PENDING_MASTER.md:10459 |
| app-api-fm-finance-budgets-route-ts-119-129-org-only-buildtenantfilter-missing-unitid-next-steps-app-api-fm-finance-budgets-route-ts-119-129 | P3 | open | Next Steps | `app/api/fm/finance/budgets/route.ts:119-129` — org-only `buildTenantFilter`; missing `unitId`. | app/api/fm/finance/budgets/route.ts:119-129 |
| extend-fm-tenant-helpers-to-emit-unitid-and-backfill-index-orgid-unitid-department-updatedat-next-steps-docs-pending-master-md-10434 | P3 | open | Next Steps | Extend FM tenant helpers to emit unitId and backfill index `{ orgId, unitId, department, updatedAt }`. | docs/PENDING_MASTER.md:10434 |
| normalize-fm-expenses-tests-to-strict-success-expectations-and-assert-orgid-unitid-on-inserts-next-steps-docs-pending-master-md-10433 | P3 | open | Next Steps | Normalize FM expenses tests to strict success expectations and assert orgId/unitId on inserts. | docs/PENDING_MASTER.md:10433 |
| add-seller-vendor-rbac-guard-and-vendor-id-scoping-to-kyc-submit-sellerkycservice-logic-errors-docs-pending-master-md-10432 | P3 | open | Logic Errors | Add seller/vendor RBAC guard and vendor_id scoping to KYC submit + sellerKYCService. | docs/PENDING_MASTER.md:10432 |
| reconfirmed-route-gaps-missing-seller-rbac-vendor-guard-in-kyc-submit-app-api-souq-seller-central-kyc-submit-route-ts-15-78-org-only-fm-budg | P3 | open | Next Steps | Reconfirmed route gaps: missing seller RBAC/vendor guard in KYC submit (app/api/souq/seller-central/kyc/submit/route.ts:15-78); org-only FM budget filters (app/api/fm/finance/budgets/route.ts:119-129, | app/api/souq/seller-central/kyc/submit/route.ts:15-78 |
| flagged-fm-expenses-happy-path-assertions-tolerating-400-500-status-and-conditional-bodies-tests-unit-api-fm-finance-expenses-test-ts-195-20 | P3 | open | Next Steps | Flagged FM expenses happy-path assertions tolerating 400/500 status and conditional bodies (tests/unit/api/fm/finance/expenses.test.ts:195-201,305-351). | tests/unit/api/fm/finance/expenses.test.ts:195-201 |
| re-ran-pnpm-vitest-tests-unit-api-souq-seller-central-kyc-submit-test-ts-14-passing-18-40-09-03-00-to-confirm-stricter-expectations-next-ste | P3 | open | Next Steps | Re-ran `pnpm vitest tests/unit/api/souq/seller-central/kyc-submit.test.ts` (14 passing, 18:40:09+03:00) to confirm stricter expectations. | tests/unit/api/souq/seller-central/kyc-submit.test.ts |
| tightened-kyc-submit-happy-path-expectations-to-require-200-nextstep-tests-unit-api-souq-seller-central-kyc-submit-test-ts-145-238-run-valid | P3 | open | Next Steps | Tightened KYC submit happy-path expectations to require 200 + `nextStep` (tests/unit/api/souq/seller-central/kyc-submit.test.ts:145-238); run validated. | tests/unit/api/souq/seller-central/kyc-submit.test.ts:145-238 |
| module-test-files-api-routes-coverage-gap-priority-missing-tests-docs-pending-master-md-10357 | P3 | open | Missing Tests | \| Module \| Test Files \| API Routes \| Coverage \| Gap \| Priority \| | docs/PENDING_MASTER.md:10357 |
| root-cause-missing-required-env-vars-in-production-validation-missing-tests-docs-pending-master-md-10335 | P3 | open | Missing Tests | **Root Cause:** Missing required env vars in production validation. | docs/PENDING_MASTER.md:10335 |
| app-api-work-orders-route-ts-needs-review-should-require-auth-missing-tests-app-api-work-orders-route-ts | P3 | open | Missing Tests | \| `app/api/work-orders/route.ts` \| 🔴 Needs review - should require auth \| | app/api/work-orders/route.ts |
| app-api-tenants-route-ts-needs-review-should-require-auth-missing-tests-app-api-tenants-route-ts | P3 | open | Missing Tests | \| `app/api/tenants/route.ts` \| 🔴 Needs review - should require auth \| | app/api/tenants/route.ts |
| app-api-properties-route-ts-needs-review-should-require-auth-missing-tests-app-api-properties-route-ts | P3 | open | Missing Tests | \| `app/api/properties/route.ts` \| 🔴 Needs review - should require auth \| | app/api/properties/route.ts |
| test-aqar-aqar-module-route-coverage-gap-14-routes-p2-missing-tests-docs-pending-master-md-10286 | P3 | open | Missing Tests | \| TEST-AQAR \| Aqar Module \| Route coverage gap \| 14 routes \| 🟡 P2 \| | docs/PENDING_MASTER.md:10286 |
| test-fm-fm-module-route-coverage-gap-19-routes-p1-missing-tests-docs-pending-master-md-10285 | P3 | open | Missing Tests | \| TEST-FM \| FM Module \| Route coverage gap \| 19 routes \| 🟠 P1 \| | docs/PENDING_MASTER.md:10285 |
| test-admin-admin-module-route-coverage-gap-26-routes-p1-missing-tests-docs-pending-master-md-10284 | P3 | open | Missing Tests | \| TEST-ADMIN \| Admin Module \| Route coverage gap \| 26 routes \| 🟠 P1 \| | docs/PENDING_MASTER.md:10284 |
| test-souq-souq-module-route-coverage-gap-51-routes-p1-missing-tests-docs-pending-master-md-10283 | P3 | open | Missing Tests | \| TEST-SOUQ \| Souq Module \| Route coverage gap \| 51 routes \| 🟠 P1 \| | docs/PENDING_MASTER.md:10283 |
| vendor-scoping-gap-route-sets-vendorid-session-user-id-but-does-not-enforce-vendor-membership-service-vendor-filter-depends-on-provided-vend | P3 | open | Logic Errors | **Vendor scoping gap** — Route sets `vendorId: session.user.id` but does not enforce vendor membership; service vendor filter depends on provided vendorId. Aligning route+service is needed to prevent  | session.user.id |
| app-api-fm-finance-budgets-route-ts-191-225-292-306-unit-scoping-present-but-index-missing-risk-of-slow-queries-ensure-unitid-required-on-po | P3 | open | Logic Errors | `app/api/fm/finance/budgets/route.ts:191-225,292-306` — Unit scoping present but index missing; risk of slow queries; ensure unitId required on POST responses. | app/api/fm/finance/budgets/route.ts:191-225 |
| app-api-souq-seller-central-kyc-submit-route-ts-17-100-route-still-sets-vendorid-to-user-id-needs-explicit-vendor-guard-vendorid-propagation | P3 | open | Next Steps | `app/api/souq/seller-central/kyc/submit/route.ts:17-100` — Route still sets vendorId to user.id; needs explicit vendor guard + vendorId propagation from session. | app/api/souq/seller-central/kyc/submit/route.ts:17-100 |
| rerun-wider-vitest-set-budgets-fm-suites-and-update-pending-master-with-outcomes-next-steps-docs-pending-master-md-10117 | P3 | open | Next Steps | Rerun wider vitest set (budgets + FM suites) and update PENDING_MASTER with outcomes. | docs/PENDING_MASTER.md:10117 |
| broaden-regression-tests-cross-tenant-unitid-for-budgets-kyc-rbac-vendor-negatives-fm-expenses-response-payload-and-org-unit-assertions-next | P3 | open | Next Steps | Broaden regression tests: cross-tenant/unitId for budgets; KYC RBAC/vendor negatives; FM expenses response payload and org/unit assertions. | docs/PENDING_MASTER.md:10116 |
| extend-fm-tenant-helpers-and-expenses-budgets-apis-to-enforce-unitid-consistently-add-compound-index-orgid-unitid-department-updatedat-next- | P3 | open | Next Steps | Extend FM tenant helpers and expenses/budgets APIs to enforce unitId consistently; add compound index `{ orgId, unitId, department, updatedAt }`. | docs/PENDING_MASTER.md:10115 |
| apply-vendor-rbac-guard-and-vendorid-scoping-directly-in-kyc-submit-route-service-to-mirror-test-expectations-end-to-end-logic-errors-docs-p | P3 | open | Logic Errors | Apply vendor RBAC guard and vendorId scoping directly in KYC submit route/service to mirror test expectations end-to-end. | docs/PENDING_MASTER.md:10114 |
| one-instance-in-payments-needs-next-public-base-url-to-be-required-next-steps-docs-pending-master-md-9942 | P3 | open | Next Steps | One instance in payments needs NEXT_PUBLIC_BASE_URL to be required | docs/PENDING_MASTER.md:9942 |
| app-api-payments-tap-checkout-route-ts-needs-fix-next-steps-app-api-payments-tap-checkout-route-ts | P3 | open | Next Steps | `app/api/payments/tap/checkout/route.ts` - NEEDS FIX | app/api/payments/tap/checkout/route.ts |
| pending-master-update-complete-comprehensive-findings-next-steps-docs-pending-master-md-9806 | P3 | open | Next Steps | \| PENDING_MASTER Update \| ✅ Complete \| Comprehensive findings \| | docs/PENDING_MASTER.md:9806 |
| status-all-informational-comments-no-actionable-todos-in-api-routes-next-steps-docs-pending-master-md-9653 | P3 | open | Next Steps | **Status**: All informational comments, no actionable TODOs in API routes. | docs/PENDING_MASTER.md:9653 |
| missing-tests-add-client-side-test-covering-autofixinitializer-behavior-for-guest-vs-super-admin-add-integration-test-ensuring-no-network-ca | P3 | open | Missing Tests | Missing tests: add client-side test covering AutoFixInitializer behavior for guest vs SUPER_ADMIN; add integration test ensuring no network calls fire when not authenticated. | docs/PENDING_MASTER.md:9420 |
| logic-errors-avoid-retrying-qa-reconnect-while-unauthenticated-add-early-return-guard-in-autofix-checks-for-missing-session-to-prevent-false | P3 | open | Bugs | Logic errors: avoid retrying QA reconnect while unauthenticated; add early return guard in AutoFix checks for missing session to prevent false degraded statuses. | docs/PENDING_MASTER.md:9419 |
| run-lint-targeted-vitest-for-qa-routes-after-ui-confirmation-to-ensure-no-regressions-next-steps-docs-pending-master-md-9414 | P3 | open | Next Steps | Run lint + targeted vitest for QA routes after UI confirmation to ensure no regressions. | docs/PENDING_MASTER.md:9414 |
| capture-otp-send-failure-evidence-response-json-server-logs-and-triage-root-cause-add-regression-test-once-repro-is-known-next-steps-docs-pe | P3 | open | Next Steps | Capture OTP send failure evidence (response JSON + server logs) and triage root cause; add regression test once repro is known. | docs/PENDING_MASTER.md:9413 |
| verify-in-browser-logged-out-logged-in-non-super-admin-that-no-auto-monitor-network-chatter-occurs-confirm-only-super-admin-can-start-monito | P3 | open | Next Steps | Verify in-browser (logged out + logged in non-super-admin) that no auto-monitor network chatter occurs; confirm only SUPER_ADMIN can start monitoring/SystemVerifier actions. | docs/PENDING_MASTER.md:9412 |
| ongoing-otp-send-endpoint-returning-500-needs-reproduction-details-awaiting-response-payload-logs-to-isolate-root-cause-next-steps-docs-pend | P3 | open | Next Steps | Ongoing: OTP send endpoint returning 500 needs reproduction details; awaiting response payload/logs to isolate root cause. | docs/PENDING_MASTER.md:9409 |
| located-master-pending-report-this-file-and-avoided-duplicates-next-steps-docs-pending-master-md-9406 | P3 | open | Next Steps | Located Master Pending Report (this file) and avoided duplicates. | docs/PENDING_MASTER.md:9406 |
| p3-configure-otp-env-var-or-disable-bypass-5m-needs-owner-action-next-steps-docs-pending-master-md-9381 | P3 | open | Next Steps | \| P3 \| Configure OTP env var or disable bypass \| 5m \| Needs owner action \| | docs/PENDING_MASTER.md:9381 |
| p1-deploy-and-verify-console-is-clean-5m-pending-deploy-next-steps-docs-pending-master-md-9379 | P3 | open | Next Steps | \| P1 \| Deploy and verify console is clean \| 5m \| Pending deploy \| | docs/PENDING_MASTER.md:9379 |
| p3-admin-9-28-routes-19-gap-10h-add-admin-action-tests-missing-tests-docs-pending-master-md-8813 | P3 | open | Missing Tests | \| P3 \| Admin \| 9/28 routes (19 gap) \| 10h \| Add admin action tests \| | docs/PENDING_MASTER.md:8813 |
| p3-support-3-8-routes-5-gap-3h-add-ticket-flow-tests-missing-tests-docs-pending-master-md-8812 | P3 | open | Missing Tests | \| P3 \| Support \| 3/8 routes (5 gap) \| 3h \| Add ticket flow tests \| | docs/PENDING_MASTER.md:8812 |
| p2-souq-31-75-routes-44-gap-22h-focus-on-critical-paths-missing-tests-docs-pending-master-md-8810 | P3 | open | Missing Tests | \| P2 \| Souq \| 31/75 routes (44 gap) \| 22h \| Focus on critical paths \| | docs/PENDING_MASTER.md:8810 |
| priority-module-gap-effort-recommendation-missing-tests-docs-pending-master-md-8807 | P3 | open | Missing Tests | \| Priority \| Module \| Gap \| Effort \| Recommendation \| | docs/PENDING_MASTER.md:8807 |
| app-api-superadmin-logout-route-ts-auth-low-keep-open-next-steps-app-api-superadmin-logout-route-ts | P3 | open | Next Steps | \| `app/api/superadmin/logout/route.ts` \| Auth \| LOW \| Keep open \| | app/api/superadmin/logout/route.ts |
| app-api-healthcheck-route-ts-system-low-keep-open-for-monitoring-next-steps-app-api-healthcheck-route-ts | P3 | open | Next Steps | \| `app/api/healthcheck/route.ts` \| System \| LOW \| Keep open for monitoring \| | app/api/healthcheck/route.ts |
| rate-limiting-audit-16-gaps-see-enhancement-list-below-next-steps-docs-pending-master-md-8708 | P3 | open | Next Steps | \| Rate Limiting Audit \| 🔶 16 gaps \| See enhancement list below \| | docs/PENDING_MASTER.md:8708 |
| support-admin-gaps-5-and-19-routes-respectively-add-impersonation-and-admin-action-flows-to-raise-confidence-next-steps-docs-pending-master- | P3 | open | Next Steps | Support/Admin gaps (5 and 19 routes respectively); add impersonation and admin action flows to raise confidence. | docs/PENDING_MASTER.md:8661 |
| souq-coverage-gaps-remain-on-44-routes-75-total-prioritize-checkout-repricer-fulfillment-edges-missing-tests-docs-pending-master-md-8660 | P3 | open | Missing Tests | Souq coverage gaps remain on 44 routes (75 total); prioritize checkout, repricer, fulfillment edges. | docs/PENDING_MASTER.md:8660 |
| api-billing-history-returns-401-instead-of-400-when-org-context-is-missing-tests-api-billing-history-route-test-ts-pnpm-vitest-run-bail-1-re | P3 | open | Next Steps | `/api/billing/history` returns 401 instead of 400 when org context is missing (`tests/api/billing/history.route.test.ts`, `pnpm vitest run --bail 1 --reporter=dot`). | tests/api/billing/history.route.test.ts |
| review-webhook-open-routes-app-api-payments-callback-route-ts-app-api-healthcheck-route-ts-for-explicit-allowlist-rationale-and-document-exc | P3 | open | Next Steps | Review webhook/open routes (`app/api/payments/callback/route.ts`, `app/api/healthcheck/route.ts`) for explicit allowlist rationale and document exceptions. | app/api/payments/callback/route.ts |
| add-enforceratelimit-to-superadmin-auth-session-routes-app-api-superadmin-login-route-ts-logout-route-ts-session-route-ts-and-tenant-provisi | P3 | open | Next Steps | Add `enforceRateLimit` to superadmin auth/session routes (`app/api/superadmin/login/route.ts`, `.../logout/route.ts`, `.../session/route.ts`) and tenant provisioning (`app/api/tenants/route.ts`) to cl | app/api/superadmin/login/route.ts |
| tenant-rate-limit-audit-pending-same-16-rate-limit-gaps-flagged-in-prior-session-see-enhancements-next-steps-docs-pending-master-md-8640 | P3 | open | Next Steps | \| Tenant/rate-limit audit \| 🔶 Pending \| Same 16 rate-limit gaps flagged in prior session (see enhancements) \| | docs/PENDING_MASTER.md:8640 |
| warning-review-logged-warnings-observed-missing-encryption-key-fallback-in-tests-unit-security-encryption-test-ts-act-warning-from-tests-int | P3 | open | Next Steps | \| Warning review \| 🔶 Logged \| Warnings observed: missing `ENCRYPTION_KEY` fallback in `tests/unit/security/encryption.test.ts`; `act()` warning from `tests/integration/dashboard-hr.integration.test.t | tests/unit/security/encryption.test.ts |
| eslint-errors-not-re-run-last-recorded-0-pending-verify-in-next-pass-bugs-docs-pending-master-md-8627 | P3 | open | Bugs | \| **ESLint Errors** \| Not re-run (last recorded 0) \| ℹ️ Pending \| Verify in next pass \| | docs/PENDING_MASTER.md:8627 |
| build-sourcemaps-yml-53-56-still-attempts-mongo-index-creation-with-a-localhost-fallback-on-forks-this-can-fail-due-to-missing-mongo-recomme | P3 | open | Next Steps | `build-sourcemaps.yml:53-56` still attempts Mongo index creation with a localhost fallback; on forks, this can fail due to missing Mongo. Recommend adding `if: ${{ env.MONGODB_URI != '' }}` and removi | build-sourcemaps.yml:53-56 |
| hardened-pr-agent-to-ignore-bots-require-repo-pr-context-and-skip-when-openai-key-missing-github-workflows-pr-agent-yml-20-47-missing-tests- | P3 | open | Missing Tests | Hardened PR Agent to ignore bots, require repo PR context, and skip when `OPENAI_KEY` missing (`.github/workflows/pr_agent.yml:20-47`). | .github/workflows/pr_agent.yml:20-47 |
| ci-workflow-lint-warnings-cleared-store-path-nextauth-url-openai-key-renovate-token-missing-tests-docs-pending-master-md-8580 | P3 | open | Missing Tests | \| CI workflow lint warnings \| ✅ Cleared \| STORE_PATH, NEXTAUTH_URL, OPENAI_KEY, RENOVATE_TOKEN \| | docs/PENDING_MASTER.md:8580 |
| missing-tracked-model-caused-module-not-found-for-issue-apis-build-breaker-keep-issue-issueevent-models-co-located-and-enforced-via-import-c | P3 | open | Bugs | \| Missing tracked model caused module-not-found for Issue APIs \| Build breaker \| Keep Issue/IssueEvent models co-located and enforced via import check script in CI (`scripts/verify-api.ts` or new guar | scripts/verify-api.ts |
| billing-history-missing-org-returns-401-align-route-to-return-400-without-org-and-rerun-full-vitest-next-steps-docs-pending-master-md-8509 | P3 | open | Next Steps | billing-history-missing-org-returns-401 — align route to return 400 without org and rerun full vitest. | docs/PENDING_MASTER.md:8509 |
| billing-history-missing-org-returns-401-blocker-mongodb-ssot-sync-unavailable-failing-suite-expects-400-got-401-tests-api-billing-history-ro | P3 | open | Next Steps | billing-history-missing-org-returns-401 — blocker: MongoDB SSOT sync unavailable; failing suite expects 400, got 401 (`tests/api/billing/history.route.test.ts:57-65`). | tests/api/billing/history.route.test.ts:57-65 |
| add-rate-limiting-to-issues-api-routes-pending-limiter-hardening-next-steps-docs-pending-master-md-8500 | P3 | open | Next Steps | add-rate-limiting-to-issues-api-routes — pending limiter hardening. | docs/PENDING_MASTER.md:8500 |
| add-rate-limiting-to-superadmin-routes-pending-limiter-hardening-next-steps-docs-pending-master-md-8499 | P3 | open | Next Steps | add-rate-limiting-to-superadmin-routes — pending limiter hardening. | docs/PENDING_MASTER.md:8499 |
| db-sync-created-0-updated-0-skipped-0-errors-1-mongodb-uri-missing-import-not-run-bugs-docs-pending-master-md-8493 | P3 | open | Bugs | **DB Sync:** created=0, updated=0, skipped=0, errors=1 (MONGODB_URI missing; import not run) | docs/PENDING_MASTER.md:8493 |
| recommendation-audit-each-route-and-add-session-based-tenant-filter-add-ci-guard-to-flag-missing-org-id-in-server-queries-missing-tests-docs | P3 | open | Missing Tests | **Recommendation**: Audit each route and add session-based tenant filter. Add CI guard to flag missing `org_id` in server queries. | docs/PENDING_MASTER.md:8450 |
| app-api-pm-plans-route-ts-43-fmpmplan-find-query-needs-org-id-injection-missing-tests-app-api-pm-plans-route-ts-43 | P3 | open | Missing Tests | `app/api/pm/plans/route.ts:43` — `FMPMPlan.find(query)` needs org_id injection | app/api/pm/plans/route.ts:43 |
| latest-commit-53800eee4-pushed-sync-indexes-fix-pending-logic-errors-docs-pending-master-md-8368 | P3 | open | Logic Errors | \| **Latest Commit** \| `53800eee4` \| ✅ Pushed \| Sync-indexes fix pending \| | docs/PENDING_MASTER.md:8368 |
| context-docs-pending-v60-pending-commit-no-pr-missing-tests-docs-pending-master-md-8213 | P3 | open | Missing Tests | **Context:** docs/pending-v60 \| pending commit \| no PR | docs/PENDING_MASTER.md:8213 |
| none-no-new-issues-beyond-pending-master-open-items-missing-tests-docs-pending-master-md-8174 | P3 | open | Missing Tests | None (no new issues beyond PENDING_MASTER open items) | docs/PENDING_MASTER.md:8174 |
| context-docs-pending-v60-a7b722d61-no-pr-missing-tests-docs-pending-master-md-8161 | P3 | open | Missing Tests | **Context:** docs/pending-v60 \| a7b722d61 \| no PR | docs/PENDING_MASTER.md:8161 |
| anomaly-detected-6-items-share-test-coverage-gaps-theme-recommend-dedicated-test-sprint-missing-tests-docs-pending-master-md-8125 | P3 | open | Missing Tests | **Anomaly Detected:** 6 items share "test coverage gaps" theme — recommend dedicated test sprint. | docs/PENDING_MASTER.md:8125 |
| context-docs-pending-v60-53800eee4-no-pr-missing-tests-docs-pending-master-md-8094 | P3 | open | Missing Tests | **Context:** docs/pending-v60 \| 53800eee4 \| no PR | docs/PENDING_MASTER.md:8094 |
| test-2-validates-production-runtime-error-when-both-missing-bugs-docs-pending-master-md-7963 | P3 | open | Bugs | Test 2: Validates production runtime error when both missing | docs/PENDING_MASTER.md:7963 |
| fallback-logic-falls-back-to-auth-secret-when-nextauth-secret-missing-missing-tests-docs-pending-master-md-7958 | P3 | open | Missing Tests | **Fallback Logic:** Falls back to AUTH_SECRET when NEXTAUTH_SECRET missing | docs/PENDING_MASTER.md:7958 |
| context-docs-pending-v60-36a9929c5-no-pr-missing-tests-docs-pending-master-md-7931 | P3 | open | Missing Tests | **Context:** docs/pending-v60 \| 36a9929c5 \| no PR | docs/PENDING_MASTER.md:7931 |
| timingsafeequal-missing-globally-coderabbit-already-implemented-in-server-security-health-token-ts-25-and-lib-security-verify-secret-header- | P3 | open | Missing Tests | \| timingSafeEqual missing globally \| CodeRabbit \| Already implemented in `server/security/health-token.ts:25` and `lib/security/verify-secret-header.ts:29` \| | server/security/health-token.ts:25 |
| branch-docs-pending-v60-deleted-locally-and-remotely-missing-tests-docs-pending-master-md-7892 | P3 | open | Missing Tests | Branch `docs/pending-v60` deleted locally and remotely | docs/PENDING_MASTER.md:7892 |
| db-sync-pending-mongodb-issue-tracker-api-unavailable-missing-tests-docs-pending-master-md-7788 | P3 | open | Missing Tests | **DB Sync:** pending (MongoDB Issue Tracker API unavailable) | docs/PENDING_MASTER.md:7788 |
| code-quality-verified-0-console-log-0-todo-fixme-all-dangerouslysetinnerhtml-safe-bugs-console-log | P3 | open | Bugs | Code quality verified: 0 console.log, 0 TODO/FIXME, all dangerouslySetInnerHTML safe | console.log |
| cross-referenced-pending-master-sessions-with-new-findings-bugs-docs-pending-master-md-7520 | P3 | open | Bugs | Cross-referenced PENDING_MASTER sessions with new findings | docs/PENDING_MASTER.md:7520 |
| ts-expect-error-3-uses-2-have-justifications-1-needs-docs-bugs-docs-pending-master-md-7515 | P3 | open | Bugs | @ts-expect-error: 3 uses, 2 have justifications (1 needs docs) | docs/PENDING_MASTER.md:7515 |
| missing-lean-10-read-only-queries-performance-optimization-efficiency-docs-pending-master-md-7509 | P3 | open | Efficiency | **Missing .lean()** (10+ read-only queries) - Performance optimization | docs/PENDING_MASTER.md:7509 |
| api-discoverability-openapi-spec-missing-new-endpoints-bugs-docs-pending-master-md-7423 | P3 | open | Bugs | **API discoverability:** OpenAPI spec missing new endpoints | docs/PENDING_MASTER.md:7423 |
| critical-gap-51-lib-modules-without-documentation-includes-auth-security-middleware-bugs-docs-pending-master-md-7421 | P3 | open | Bugs | **Critical gap:** 51 lib modules without documentation (includes auth, security, middleware) | docs/PENDING_MASTER.md:7421 |
| DOC-DOC-103 | P3 | open | Bugs | DOC-103 — Missing JSDoc for 124 Mongoose model schemas (server/models) — P2, Effort: L | docs/PENDING_MASTER.md:7385 |
| DOC-DOC-102 | P3 | open | Bugs | DOC-102 — Missing JSDoc for 51 lib utility modules (auth, payments, storage, middleware) — P1, Effort: M | docs/PENDING_MASTER.md:7380 |
| db-sync-pending-json-prepared-docs-backlog-audit-documentation-json-awaiting-dev-server-for-import-bugs-docs-backlog-audit-documentation-jso | P3 | open | Bugs | **DB Sync:** PENDING (JSON prepared: docs/BACKLOG_AUDIT_DOCUMENTATION.json — awaiting dev server for import) | docs/BACKLOG_AUDIT_DOCUMENTATION.json |
| context-feat-mongodb-backlog-tracker-904bc59d8-systematic-documentation-gap-analysis-bugs-docs-pending-master-md-7365 | P3 | open | Bugs | **Context:** feat/mongodb-backlog-tracker \| 904bc59d8 \| Systematic documentation gap analysis | docs/PENDING_MASTER.md:7365 |
| error-enotfound-dns-resolution-failed-for-invalid-missing-redis-url-bugs-docs-pending-master-md-7257 | P3 | open | Bugs | Error: `ENOTFOUND` - DNS resolution failed for invalid/missing REDIS_URL | docs/PENDING_MASTER.md:7257 |
| prevents-missing-index-errors-during-sentry-sourcemap-uploads-bugs-docs-pending-master-md-7226 | P3 | open | Bugs | ✅ Prevents missing index errors during Sentry sourcemap uploads | docs/PENDING_MASTER.md:7226 |
| risk-missing-required-indexes-before-build-deploy-could-cause-runtime-failures-bugs-docs-pending-master-md-7193 | P3 | open | Bugs | Risk: Missing required indexes before build/deploy could cause runtime failures | docs/PENDING_MASTER.md:7193 |
| monitor-for-typescript-regressions-in-queue-infrastructure-bugs-docs-pending-master-md-7100 | P3 | open | Bugs | Monitor for TypeScript regressions in queue infrastructure | docs/PENDING_MASTER.md:7100 |
| state-open-large-divergence-from-main-89-files-1786-890-lines-bugs-docs-pending-master-md-7080 | P3 | open | Bugs | **State**: OPEN - Large divergence from main (89 files, +1786/-890 lines) | docs/PENDING_MASTER.md:7080 |
| consider-setting-up-triggers-for-issue-tracker-sync-automation-bugs-docs-pending-master-md-7061 | P3 | open | Bugs | Consider setting up triggers for Issue Tracker sync automation | docs/PENDING_MASTER.md:7061 |
| document-trigger-function-development-workflow-if-needed-bugs-docs-pending-master-md-7060 | P3 | open | Bugs | Document trigger/function development workflow if needed | docs/PENDING_MASTER.md:7060 |
| rotate-api-keys-in-mongodb-atlas-public-key-qefjbwzu-bugs-docs-pending-master-md-7059 | P3 | open | Bugs | Rotate API keys in MongoDB Atlas (public key: qefjbwzu) | docs/PENDING_MASTER.md:7059 |
| db-sync-pending-localhost-3000-offline-docs-backlog-audit-json-ready-for-import-bugs-docs-backlog-audit-json | P3 | open | Bugs | **DB Sync:** PENDING (localhost:3000 offline) - docs/BACKLOG_AUDIT.json ready for import | docs/BACKLOG_AUDIT.json |
| vulnerability-souqlisting-find-id-in-listingobjectids-missing-orgid-filter-bugs-souqlisting-find | P3 | open | Bugs | **Vulnerability:** `SouqListing.find({ _id: { $in: listingObjectIds } })` missing orgId filter | SouqListing.find |
| vulnerability-product-find-id-in-productids-missing-orgid-filter-bugs-product-find | P3 | open | Bugs | **Vulnerability:** `Product.find({ _id: { $in: productIds } })` missing orgId filter | Product.find |
| stats-get-api-issues-stats-200-totalopen-12-healthscore-94-bugs-docs-pending-master-md-6810 | P3 | open | Bugs | **Stats:** GET /api/issues/stats → 200 (totalOpen=12, healthScore=94) | docs/PENDING_MASTER.md:6810 |
| issue-notification-chains-missing-error-handlers-bugs-docs-pending-master-md-6757 | P3 | open | Bugs | **Issue:** Notification chains missing error handlers | docs/PENDING_MASTER.md:6757 |
| backlog-audit-refreshed-with-12-evidence-backed-open-items-efficiency-docs-pending-master-md-6636 | P3 | open | Efficiency | **BACKLOG_AUDIT:** Refreshed with 12 evidence-backed open items | docs/PENDING_MASTER.md:6636 |
| DOC-DOC-101 | P3 | open | Missing Tests | DOC-101 through DOC-110: Documentation gaps (JSDoc, OpenAPI, READMEs) | docs/PENDING_MASTER.md:6617 |
| validation-rate-limiting-authentication-permissions-missing-tenant-scope-missing-tests-docs-pending-master-md-6567 | P3 | open | Missing Tests | **Validation:** Rate limiting, authentication, permissions, missing tenant scope | docs/PENDING_MASTER.md:6567 |
| rationale-crm-routes-use-resolveuser-which-returns-null-for-both-missing-auth-and-insufficient-role-401-missing-tests-docs-pending-master-md | P3 | open | Missing Tests | **Rationale:** CRM routes use `resolveUser` which returns null for both missing auth and insufficient role → 401 | docs/PENDING_MASTER.md:6504 |
| TEST-REF-001 | P3 | open | Efficiency | **REF-001** — Create CRM route handler unit tests (P2, effort:M, sourceRef:PENDING_MASTER) | docs/PENDING_MASTER.md:6300 |
| token-warnings-2-items-renovate-token-openai-key-context-warnings-valid-usage-patterns-efficiency-docs-pending-master-md-6297 | P3 | open | Efficiency | **Token Warnings (2 items):** RENOVATE_TOKEN/OPENAI_KEY context warnings — valid usage patterns | docs/PENDING_MASTER.md:6297 |
| legacy-repair-unscoped-docs-missing-orgid-auto-repaired-on-update-prevents-silent-query-misses-efficiency-docs-pending-master-md-6242 | P3 | open | Efficiency | **Legacy Repair:** Unscoped docs (missing orgId) auto-repaired on update; prevents silent query misses | docs/PENDING_MASTER.md:6242 |
| statushistory-tracks-status-changes-from-open-baseline-efficiency-docs-pending-master-md-6184 | P3 | open | Efficiency | `statusHistory` → tracks status changes from 'open' baseline | docs/PENDING_MASTER.md:6184 |
| d0a61c01e-fix-tests-add-missing-tenantid-to-mockuser-in-crm-test-efficiency-docs-pending-master-md-5775 | P3 | open | Efficiency | **d0a61c01e** - `fix(tests): Add missing tenantId to mockUser in CRM test` | docs/PENDING_MASTER.md:5775 |
| root-cause-missing-orgid-filters-on-crmlead-and-crmactivity-operations-missing-tests-docs-pending-master-md-5675 | P3 | open | Missing Tests | **Root Cause:** Missing `orgId` filters on CrmLead and CrmActivity operations | docs/PENDING_MASTER.md:5675 |
| merge-ready-for-fixzit-phase-1-mvp-pending-manual-testing-confirmation-missing-tests-docs-pending-master-md-5662 | P3 | open | Missing Tests | **Merge-ready for Fixzit Phase 1 MVP** (pending manual testing confirmation) | docs/PENDING_MASTER.md:5662 |
| investigate-refresh-replay-test-ts-failure-p2-2-hours-missing-tests-refresh-replay-test-ts | P3 | open | Missing Tests | Investigate `refresh.replay.test.ts` failure (P2, 2 hours) | refresh.replay.test.ts |
| when-superadmin-clicks-these-links-middleware-detects-missing-orgid-redirects-to-login-missing-tests-docs-pending-master-md-5613 | P3 | open | Missing Tests | When superadmin clicks these links → middleware detects missing `orgId` → redirects to `/login` | docs/PENDING_MASTER.md:5613 |
| important-mongodb-issue-tracker-is-primary-ssot-master-pending-report-md-at-repo-root-is-derived-log-missing-tests-master-pending-report-md | P3 | open | Missing Tests | **IMPORTANT: MongoDB Issue Tracker is PRIMARY SSOT. MASTER_PENDING_REPORT.md at repo root is DERIVED LOG.** | MASTER_PENDING_REPORT.md |
| f2-aggregate-wrapper-p2-created-1-pending-missing-tests-docs-pending-master-md-5454 | P3 | open | Missing Tests | \| F2 (Aggregate wrapper) \| P2 \| ✅ CREATED \| 1 \| Pending \| | docs/PENDING_MASTER.md:5454 |
| pr-creation-open-pr-for-feat-superadmin-branding-main-missing-tests-docs-pending-master-md-5379 | P3 | open | Missing Tests | PR creation: Open PR for `feat/superadmin-branding` → `main` | docs/PENDING_MASTER.md:5379 |
| const-state-updatestate-resetstate-setparam-ispending-usetablequerystate-work-orders-missing-tests-docs-pending-master-md-4955 | P3 | open | Missing Tests | const { state, updateState, resetState, setParam, isPending } = useTableQueryState('work-orders', { | docs/PENDING_MASTER.md:4955 |
| compact-encoding-filters-status-open-priority-high-not-verbose-json-missing-tests-docs-pending-master-md-4948 | P3 | open | Missing Tests | **Compact Encoding**: `filters=status:["open"],priority:["high"]` (not verbose JSON) | docs/PENDING_MASTER.md:4948 |
| p3-aqar-souq-pending-10h-refactor-existing-filters-to-use-standards-efficiency-docs-pending-master-md-4858 | P3 | open | Efficiency | \| **P3: Aqar/Souq** \| ⏳ PENDING \| 10h \| — \| — \| Refactor existing filters to use standards \| | docs/PENDING_MASTER.md:4858 |
| leaverequestslist-tsx-527-lines-new-status-leave-type-period-quick-stats-pending-approved-total-days-pending-upcoming-chips-missing-tests-le | P3 | open | Missing Tests | **LeaveRequestsList.tsx** (527 lines, NEW): Status, Leave Type, Period + Quick stats (Pending/Approved/Total Days) + Pending/Upcoming chips | LeaveRequestsList.tsx |
| features-quick-chips-open-urgent-overdue-due-today-url-sync-sort-dropdown-row-click-missing-tests-docs-pending-master-md-4809 | P3 | open | Missing Tests | **Features**: Quick chips (Open, Urgent, Overdue, Due Today), URL sync, Sort dropdown, Row click | docs/PENDING_MASTER.md:4809 |
| bug-auditlogs-filters-missing-add-daterange-action-filters-to-query-chips-missing-tests-docs-pending-master-md-4656 | P3 | open | Missing Tests | BUG-AUDITLOGS-FILTERS-MISSING — Add dateRange/action filters to query + chips | docs/PENDING_MASTER.md:4656 |
| bug-invoices-filters-missing-wire-daterange-customer-filters-into-query-chips-missing-tests-docs-pending-master-md-4655 | P3 | open | Missing Tests | BUG-INVOICES-FILTERS-MISSING — Wire dateRange/customer filters into query + chips | docs/PENDING_MASTER.md:4655 |
| bug-employees-filters-missing-add-joiningdate-reviewdue-filters-to-query-chips-missing-tests-docs-pending-master-md-4654 | P3 | open | Missing Tests | BUG-EMPLOYEES-FILTERS-MISSING — Add joiningDate/reviewDue filters to query + chips | docs/PENDING_MASTER.md:4654 |
| bug-users-filters-missing-wire-inactivedays-lastlogin-filters-into-query-chips-missing-tests-docs-pending-master-md-4653 | P3 | open | Missing Tests | BUG-USERS-FILTERS-MISSING — Wire inactiveDays/lastLogin filters into query + chips | docs/PENDING_MASTER.md:4653 |
| bug-wo-filters-missing-include-overdue-assignment-filters-in-api-params-tests-missing-tests-docs-pending-master-md-4652 | P3 | open | Missing Tests | BUG-WO-FILTERS-MISSING — Include overdue/assignment filters in API params + tests | docs/PENDING_MASTER.md:4652 |
| bug-wo-filters-missing-sourceref-code-review-components-fm-workordersviewnew-tsx-124-153-pending-db-import-missing-tests-components-fm-worko | P3 | open | Missing Tests | BUG-WO-FILTERS-MISSING — sourceRef: code-review:components/fm/WorkOrdersViewNew.tsx:124-153 (pending DB import) | components/fm/WorkOrdersViewNew.tsx:124-153 |
| none-backlog-items-already-captured-import-pending-missing-tests-docs-pending-master-md-4620 | P3 | open | Missing Tests | None (backlog items already captured; import pending) | docs/PENDING_MASTER.md:4620 |
| fix-bug-wo-filters-missing-4h-wire-status-overdue-assignedto-filters-to-query-params-missing-tests-docs-pending-master-md-4578 | P3 | open | Missing Tests | Fix BUG-WO-FILTERS-MISSING (4h) — wire status/overdue/assignedTo filters to query params | docs/PENDING_MASTER.md:4578 |
| phase-1-quick-wins-16h-fix-5-filter-bugs-bug-wo-filters-missing-etc-fix-vitest-config-ts-typescript-errors-bugs-vitest-config-ts | P3 | open | Bugs | **Phase 1 Quick Wins (16h)** — Fix 5 filter bugs (BUG-WO-FILTERS-MISSING, etc.) + Fix vitest.config.ts TypeScript errors | vitest.config.ts |
| test-coverage-needs-improvement-24-api-coverage-88-367-routes-tested-missing-tests-docs-pending-master-md-4565 | P3 | open | Missing Tests | Test Coverage: 🟡 NEEDS IMPROVEMENT (24% API coverage: 88/367 routes tested) | docs/PENDING_MASTER.md:4565 |
| test-coverage-gap-p0-api-test-coverage-only-24-88-367-routes-need-206-more-tests-120h-effort-missing-tests-docs-pending-master-md-4546 | P3 | open | Missing Tests | **TEST-COVERAGE-GAP** (P0) — API test coverage only 24% (88/367 routes), need 206 more tests (120h effort) | docs/PENDING_MASTER.md:4546 |
| open-high-priority-issues-new-from-ai-analysis-missing-tests-docs-pending-master-md-4544 | P3 | open | Missing Tests | **🔴 Open High-Priority Issues (NEW from AI Analysis):** | docs/PENDING_MASTER.md:4544 |
| fix-bug-wo-filters-missing-4h-highest-user-impact-missing-tests-docs-pending-master-md-4361 | P3 | open | Missing Tests | Fix BUG-WO-FILTERS-MISSING (4h) - highest user impact | docs/PENDING_MASTER.md:4361 |
| test-coverage-needs-improvement-api-24-component-7-missing-tests-docs-pending-master-md-4329 | P3 | open | Missing Tests | Test Coverage: 🟡 NEEDS IMPROVEMENT (API: 24%, Component: 7%) | docs/PENDING_MASTER.md:4329 |
| component-test-coverage-gap-7-15-217-components-tested-deferred-to-phase-4-missing-tests-docs-pending-master-md-4319 | P3 | open | Missing Tests | Component test coverage gap: 7% (15/217 components tested) - deferred to Phase 4 | docs/PENDING_MASTER.md:4319 |
| bug-auditlogs-filters-missing-sourceref-components-administration-auditlogslist-tsx-108-114-4h-missing-tests-components-administration-audit | P3 | open | Missing Tests | **BUG-AUDITLOGS-FILTERS-MISSING** — sourceRef: components/administration/AuditLogsList.tsx:108-114 (4h) | components/administration/AuditLogsList.tsx:108-114 |
| bug-invoices-filters-missing-sourceref-components-finance-invoiceslist-tsx-111-116-4h-missing-tests-components-finance-invoiceslist-tsx-111- | P3 | open | Missing Tests | **BUG-INVOICES-FILTERS-MISSING** — sourceRef: components/finance/InvoicesList.tsx:111-116 (4h) | components/finance/InvoicesList.tsx:111-116 |
| bug-employees-filters-missing-sourceref-components-hr-employeeslist-tsx-112-116-4h-missing-tests-components-hr-employeeslist-tsx-112-116 | P3 | open | Missing Tests | **BUG-EMPLOYEES-FILTERS-MISSING** — sourceRef: components/hr/EmployeesList.tsx:112-116 (4h) | components/hr/EmployeesList.tsx:112-116 |
| bug-users-filters-missing-sourceref-components-administration-userslist-tsx-107-113-4h-missing-tests-components-administration-userslist-tsx | P3 | open | Missing Tests | **BUG-USERS-FILTERS-MISSING** — sourceRef: components/administration/UsersList.tsx:107-113 (4h) | components/administration/UsersList.tsx:107-113 |
| bug-wo-filters-missing-sourceref-components-fm-workordersviewnew-tsx-149-153-4h-missing-tests-components-fm-workordersviewnew-tsx-149-153 | P3 | open | Missing Tests | **BUG-WO-FILTERS-MISSING** — sourceRef: components/fm/WorkOrdersViewNew.tsx:149-153 (4h) | components/fm/WorkOrdersViewNew.tsx:149-153 |
| test-coverage-gap-api-test-coverage-24-88-367-routes-tested-need-206-more-120h-effort-missing-tests-docs-pending-master-md-4295 | P3 | open | Missing Tests | **TEST-COVERAGE-GAP** — API test coverage 24% (88/367 routes tested, need 206 more) (120h effort) | docs/PENDING_MASTER.md:4295 |
| tests-aggregate-tests-6-6-passing-full-suite-pending-missing-tests-docs-pending-master-md-4251 | P3 | open | Missing Tests | Tests: 🟢 Aggregate tests 6/6 passing (full suite pending) | docs/PENDING_MASTER.md:4251 |
| context-agent-process-efficiency-2025-12-11-commit-pending-pr-534-xss-hardening-missing-tests-docs-pending-master-md-4115 | P3 | open | Missing Tests | **Context:** agent/process-efficiency-2025-12-11 \| Commit pending \| PR #534 (XSS hardening) | docs/PENDING_MASTER.md:4115 |
| expanded-invoice-statusstyles-to-include-pending-and-sent-missing-tests-docs-pending-master-md-4079 | P3 | open | Missing Tests | Expanded Invoice statusStyles to include PENDING and SENT | docs/PENDING_MASTER.md:4079 |
| missing-components-from-concurrent-agents-missing-tests-docs-pending-master-md-4029 | P3 | open | Missing Tests | **Missing Components (from concurrent agents):** | docs/PENDING_MASTER.md:4029 |
| bug-auditlogs-filters-missing-serializefilters-on-line-130-missing-tests-docs-pending-master-md-3874 | P3 | open | Missing Tests | BUG-AUDITLOGS-FILTERS-MISSING: serializeFilters() on line 130 | docs/PENDING_MASTER.md:3874 |
| bug-invoices-filters-missing-serializefilters-on-line-170-missing-tests-docs-pending-master-md-3873 | P3 | open | Missing Tests | BUG-INVOICES-FILTERS-MISSING: serializeFilters() on line 170 | docs/PENDING_MASTER.md:3873 |
| bug-employees-filters-missing-serializefilters-on-line-137-missing-tests-docs-pending-master-md-3872 | P3 | open | Missing Tests | BUG-EMPLOYEES-FILTERS-MISSING: serializeFilters() on line 137 | docs/PENDING_MASTER.md:3872 |
| bug-users-filters-missing-serializefilters-on-line-127-missing-tests-docs-pending-master-md-3871 | P3 | open | Missing Tests | BUG-USERS-FILTERS-MISSING: serializeFilters() on line 127 | docs/PENDING_MASTER.md:3871 |
| bug-wo-filters-missing-serializefilters-on-line-189-missing-tests-docs-pending-master-md-3870 | P3 | open | Missing Tests | BUG-WO-FILTERS-MISSING: serializeFilters() on line 189 | docs/PENDING_MASTER.md:3870 |
| api-route-app-api-superadmin-ssot-route-ts-protected-endpoint-to-read-pending-master-md-missing-tests-app-api-superadmin-ssot-route-ts | P3 | open | Missing Tests | **API Route:** `app/api/superadmin/ssot/route.ts` - Protected endpoint to read PENDING_MASTER.md | app/api/superadmin/ssot/route.ts |
| public-static-routes-app-api-public-app-api-docs-openapi-app-api-help-articles-are-correctly-cached-missing-tests-docs-pending-master-md-384 | P3 | open | Missing Tests | Public/static routes (`app/api/public/*`, `app/api/docs/openapi`, `app/api/help/articles`) are correctly cached | docs/PENDING_MASTER.md:3848 |
| db-sync-all-items-synced-to-backlog-audit-json-mongodb-import-pending-server-start-logic-errors-backlog-audit-json | P3 | open | Logic Errors | **DB Sync:** All items synced to BACKLOG_AUDIT.json (MongoDB import pending server start) | BACKLOG_AUDIT.json |
| infra-sentry-open-deferred-requires-user-action-dsn-logic-errors-docs-pending-master-md-3686 | P3 | open | Logic Errors | \| INFRA-SENTRY \| open \| deferred \| Requires user action (DSN) \| | docs/PENDING_MASTER.md:3686 |
| duration-10-minutes-files-1-changed-pending-master-md-logic-errors-pending-master-md | P3 | open | Logic Errors | **Duration:** 10 minutes \| **Files:** 1 changed (PENDING_MASTER.md) | PENDING_MASTER.md |
| agent-github-copilot-vs-code-pending-items-review-logic-errors-docs-pending-master-md-3513 | P3 | open | Logic Errors | **Agent:** GitHub Copilot (VS Code) - Pending Items Review | docs/PENDING_MASTER.md:3513 |
| infra-sentry-q1-2026-activate-sentry-needs-dsn-logic-errors-docs-pending-master-md-3477 | P3 | open | Logic Errors | INFRA-SENTRY → Q1 2026: Activate Sentry (needs DSN) | docs/PENDING_MASTER.md:3477 |
| context-fix-tenant-scope-and-test-hygiene-commit-pending-next-steps-docs-pending-master-md-2881 | P3 | open | Next Steps | **Context:** fix/tenant-scope-and-test-hygiene \| Commit: pending | docs/PENDING_MASTER.md:2881 |
| status-review-pending-awaiting-new-coderabbit-review-after-fixes-next-steps-docs-pending-master-md-2794 | P3 | open | Next Steps | **Status:** REVIEW_PENDING - Awaiting new CodeRabbit review after fixes | docs/PENDING_MASTER.md:2794 |
| redis-not-configured-missing-redis-url-redis-key-in-ci-add-ci-secrets-for-redis-next-steps-docs-pending-master-md-2754 | P3 | open | Next Steps | \| Redis Not Configured \| Missing REDIS_URL/REDIS_KEY in CI \| Add CI secrets for Redis \| | docs/PENDING_MASTER.md:2754 |
| missing-i18n-keys-218-translation-keys-missing-in-en-json-ar-json-add-translations-next-steps-en-json-ar-json | P3 | open | Next Steps | \| Missing i18n Keys \| 218 translation keys missing in en.json/ar.json \| Add translations \| | en.json/ar.json |
| fixzit-quality-gates-fail-pre-existing-218-missing-i18n-keys-next-steps-docs-pending-master-md-2743 | P3 | open | Next Steps | \| Fixzit Quality Gates \| ❌ FAIL \| Pre-existing: 218 missing i18n keys \| | docs/PENDING_MASTER.md:2743 |
| pnpm-scan-i18n-0-missing-en-0-missing-ar-was-218-next-steps-docs-pending-master-md-2645 | P3 | open | Next Steps | pnpm scan:i18n  # ✅ 0 missing EN, 0 missing AR (was 218) | docs/PENDING_MASTER.md:2645 |
| ci-full-suite-depends-on-above-fixes-pending-ci-next-steps-docs-pending-master-md-2547 | P3 | open | Next Steps | \| CI Full Suite \| Depends on above fixes \| ⏳ PENDING CI \| | docs/PENDING_MASTER.md:2547 |
| ci-fast-lane-changed-flag-local-ai-folder-conflicts-with-ai-npm-package-p2-needs-rename-next-steps-docs-pending-master-md-2546 | P3 | open | Next Steps | \| CI Fast Lane \| `--changed` flag + local `ai/` folder conflicts with `ai` npm package \| 🟠 P2 - needs rename \| | docs/PENDING_MASTER.md:2546 |
| db-sync-pending-issue-tracker-not-running-locally-next-steps-docs-pending-master-md-2429 | P3 | open | Next Steps | **DB Sync:** PENDING (issue-tracker not running locally) | docs/PENDING_MASTER.md:2429 |
| oom-ci-sharded-typecheck-memory-limit-on-runner-needs-investigation-next-steps-docs-pending-master-md-2305 | P3 | open | Next Steps | \| OOM \| CI-Sharded typecheck \| Memory limit on runner \| 🔴 NEEDS INVESTIGATION \| | docs/PENDING_MASTER.md:2305 |
| address-remaining-pr-review-comments-design-tokens-css-question-next-steps-design-tokens-css | P3 | open | Next Steps | Address remaining PR review comments (design-tokens.css question) | design-tokens.css |
| wait-for-ci-to-complete-and-verify-tests-server-4-4-passes-next-steps-docs-pending-master-md-2180 | P3 | open | Next Steps | Wait for CI to complete and verify Tests (Server) 4/4 passes | docs/PENDING_MASTER.md:2180 |
| recommended-action-create-missing-mongoose-models-or-wrap-in-typed-helpers-with-tenant-scoping-estimated-24-hours-logic-errors-docs-pending- | P3 | open | Logic Errors | **Recommended Action:** Create missing Mongoose models or wrap in typed helpers with tenant scoping. Estimated: 24 hours. | docs/PENDING_MASTER.md:1994 |
| db-collection-calls-logged-37-calls-in-25-api-files-bypass-mongoose-estimated-24h-needs-delegation-efficiency-db-collection | P3 | open | Efficiency | \| db.collection() calls \| 📋 LOGGED \| 37 calls in 25 API files bypass Mongoose. Estimated 24h. Needs delegation \| | db.collection |
| verify-system-automated-work-orders-create-correctly-with-null-assignedby-next-steps-docs-pending-master-md-1669 | P3 | open | Next Steps | Verify system-automated work orders create correctly with null assignedBy | docs/PENDING_MASTER.md:1669 |
| monitor-auto-assignment-engine-for-any-runtime-errors-bugs-docs-pending-master-md-1668 | P3 | open | Bugs | Monitor auto-assignment-engine for any runtime errors | docs/PENDING_MASTER.md:1668 |
| 939af4644-fix-test-add-missing-connecttodatabase-mock-to-claims-refund-processor-test-1-next-steps-docs-pending-master-md-1572 | P3 | open | Next Steps | \| 939af4644 \| fix(test): Add missing connectToDatabase mock to claims-refund-processor test \| 1 \| | docs/PENDING_MASTER.md:1572 |
| verify-production-login-flow-works-after-rate-limit-resets-next-steps-docs-pending-master-md-1459 | P3 | open | Next Steps | Verify production login flow works (after rate limit resets) | docs/PENDING_MASTER.md:1459 |
| 611-feat-issue-152-assets-form-validation-open-ready-for-review-missing-tests-docs-pending-master-md-1333 | P3 | open | Missing Tests | \| #611 \| feat/issue-152-assets-form-validation \| Open, ready for review \| | docs/PENDING_MASTER.md:1333 |
| sa-impersonate-001-impersonation-history-not-tracked-need-audit-trail-for-impersonation-sessions-pending-logic-errors-docs-pending-master-md | P3 | open | Logic Errors | \| SA-IMPERSONATE-001 \| Impersonation history not tracked \| Need audit trail for impersonation sessions \| ⏳ PENDING \| | docs/PENDING_MASTER.md:1125 |
| session-summary-comprehensive-audit-of-superadmin-module-identified-theme-inconsistency-missing-features-and-created-action-plan-logic-error | P3 | open | Logic Errors | **Session Summary:** Comprehensive audit of superadmin module. Identified theme inconsistency, missing features, and created action plan. | docs/PENDING_MASTER.md:1106 |
| dashboard-tenant-count-active-users-open-wos-system-health-alerts-logic-errors-docs-pending-master-md-797 | P3 | open | Logic Errors | Dashboard: Tenant count, active users, open WOs, system health, alerts | docs/PENDING_MASTER.md:797 |
| clearance-status-pending-cleared-rejected-logic-errors-docs-pending-master-md-560 | P3 | open | Logic Errors | clearance_status: 'pending' \| 'cleared' \| 'rejected'; | docs/PENDING_MASTER.md:560 |
| invoice-draft-submitted-zatca-pending-cleared-rejected-archived-logic-errors-docs-pending-master-md-229 | P3 | open | Logic Errors | Invoice: DRAFT → SUBMITTED → ZATCA_PENDING → CLEARED/REJECTED → ARCHIVED | docs/PENDING_MASTER.md:229 |
| services-admin-notification-engine-ts-opt-in-defaults-for-missing-preferences-logic-errors-services-admin-notification-engine-ts | P3 | open | Logic Errors | \| `services/admin/notification-engine.ts` \| Opt-in defaults for missing preferences \| | services/admin/notification-engine.ts |
| open-prs-1-537-1-537-no-change-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 1 (#537) \| 1 (#537) \| No change \| | Doc-only |
| open-prs-1-537-1-537-ready-for-merge-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 1 (#537) \| 1 (#537) \| Ready for merge \| | Doc-only |
| id-component-function-file-gap-priority-bugs-doc-only | P3 | open | Bugs | \| ID \| Component/Function \| File \| Gap \| Priority \| | Doc-only |
| open-gaps-bugs-doc-only | P3 | open | Bugs | **Open gaps** | Doc-only |
| id-component-file-lines-gap-priority-bugs-doc-only | P3 | open | Bugs | \| ID \| Component \| File \| Lines \| Gap \| Priority \| | Doc-only |
| open-prs-2-540-this-539-paytabs-cleanup-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 2 \| #540 (this), #539 (PayTabs cleanup) \| | Doc-only |
| total-open-issues-57-57-0-no-change-bugs-doc-only | P3 | open | Bugs | \| Total Open Issues \| 57 \| 57 \| 0 (no change) \| | Doc-only |
| total-pending-57-50-7-bugs-doc-only | P3 | open | Bugs | \| Total Pending \| 57 \| 50 \| -7 \| | Doc-only |
| total-pending-50-41-9-bugs-doc-only | P3 | open | Bugs | \| Total Pending \| 50 \| 41 \| -9 \| | Doc-only |
| missing-tests-prod-readiness-missing-tests-doc-only | P3 | open | Missing Tests | - **Missing Tests (prod readiness)** | Doc-only |
| total-pending-40-36-4-bugs-doc-only | P3 | open | Bugs | \| Total Pending \| 40 \| 36 \| -4 \| | Doc-only |
| fm-work-orders-tests-missing-requirefmability-mock-configuration-missing-tests-d | P3 | open | Missing Tests | - FM work-orders tests: Missing `requireFmAbility` mock configuration | Doc-only |
| tests-api-hr-employees-directory-created-pending-missing-tests-doc-only | P3 | open | Missing Tests | \| `tests/api/hr/employees/` \| (directory created) \| - \| ⏳ Pending \| | Doc-only |
| missing-tests-negative-mutation-cases-todo-add-invalid-id-vendor-status-priority | P3 | open | Missing Tests | \| Missing Tests \| Negative mutation cases \| 🔲 TODO \| Add invalid ID/vendor/status/priority tests mirroring REST coverage. \| | Doc-only |
| missing-tests-integration-feature-flagged-handler-todo-add-handler-tests-for-pag | P3 | open | Missing Tests | \| Missing Tests \| Integration (feature-flagged handler) \| 🔲 TODO \| Add handler tests for pagination cursors, auth failures, and error shapes. \| | Doc-only |
| bugs-validation-parity-gap-todo-apply-rest-zod-schemas-to-graphql-create-update- | P3 | open | Bugs | \| Bugs \| Validation parity gap \| 🔲 TODO \| Apply REST Zod schemas to GraphQL create/update work orders to block unsafe payloads. \| | Doc-only |
| efficiency-shared-mapper-util-module-id-tenant-address-enum-mapping-todo-extract | P3 | open | Logic Errors | \| Efficiency \| Shared mapper/util module (ID, tenant, address, enum mapping) \| 🔲 TODO \| Extract helpers used across GraphQL to avoid duplication. \| | Doc-only |
| progress-tenant-scoped-graphql-resolvers-and-mutations-are-implemented-with-enum | P3 | open | Next Steps | - Progress: Tenant-scoped GraphQL resolvers and mutations are implemented with enum-safe mappings; targeted tests added; report updated without creating duplicates. | Doc-only |
| new-sql-prisma-instrumentation-present-in-lockfile-bugs-doc-only | P3 | open | Bugs | - [ ] **🔴 New SQL/Prisma instrumentation present in lockfile** | Doc-only |
| new-tenant-scope-uses-tenant-id-userid-no-org-unit-enforcement-logic-errors-doc- | P3 | open | Logic Errors | - [ ] **🔴 New Tenant scope uses tenant_id=userId (no org/unit enforcement)** | Doc-only |
| new-hr-payroll-role-bleed-to-finance-bugs-doc-only | P3 | open | Bugs | - [ ] **🔴 New HR payroll role bleed to Finance** | Doc-only |
| pattern-001 | P3 | open | Bugs | \| PATTERN-001 \| Reliability \| 🟨 Moderate \| ⏳ Open \| 138 `req.json()` calls without try-catch wrapper \| | req.js |
| details-todo-fetch-from-database-when-multi-tenant-is-implemented-logic-errors-d | P3 | open | Logic Errors | - **Details:** `// TODO: Fetch from database when multi-tenant is implemented` | Doc-only |
| nature-all-are-graphql-resolver-stubs-with-todo-fetch-from-database-bugs-doc-onl | P3 | open | Bugs | **Nature:** All are GraphQL resolver stubs with `// TODO: Fetch from database` | Doc-only |
| todo-fixme-7-low-well-maintained-bugs-doc-only | P3 | open | Bugs | \| TODO/FIXME \| 7 \| ✅ Low - well maintained \| | Doc-only |
| low-remove-7-todo-comments-in-lib-graphql-1-2-hrs-code-cleanup-next-steps-doc-on | P3 | open | Next Steps | \| 🟨 LOW \| Remove 7 TODO comments in lib/graphql \| 1-2 hrs \| Code cleanup \| | Doc-only |
| 2-tenant-scope-misuse-domain-fm-fm-behavior-ts-1355-1361-sets-tenant-id-ctx-user | P3 | open | Logic Errors | 2) **Tenant scope misuse** — `domain/fm/fm.behavior.ts:1355-1361` sets `tenant_id = ctx.userId`; no unit/org filter. Needs `{ org_id, unit_id }` to align with Golden Rule. | domain/fm/fm.behavior.ts:1355-1361 |
| confirmed-new-stack-drift-sql-prisma-instrumentation-pulled-via-sentry-opentelem | P3 | open | Next Steps | - Confirmed new stack drift: SQL/Prisma instrumentation pulled via `@sentry/opentelemetry` and `@prisma/instrumentation` in `pnpm-lock.yaml`. | pnpm-lock.yaml |
| tests-unit-components-clientlayout-test-tsx-missing-themecontext-mock-added-vi-m | P3 | open | Missing Tests | \| `tests/unit/components/ClientLayout.test.tsx` \| Missing ThemeContext mock \| Added `vi.mock("@/contexts/ThemeContext")` \| | tests/unit/components/ClientLayout.test.ts |
| todo-fixme-7-remaining-low-priority-bugs-doc-only | P3 | open | Bugs | \| **TODO/FIXME** \| 7 remaining \| 🟡 Low priority \| | Doc-only |
| sms-otp-needs-env-vars-yes-login-bugs-doc-only | P3 | open | Bugs | \| SMS/OTP \| 🟡 Needs env vars \| Yes (login) \| | Doc-only |
| app-api-fm-needs-verification-bugs-doc-only | P3 | open | Bugs | - `app/api/fm/` — Needs verification | Doc-only |
| module-api-routes-test-files-coverage-gap-missing-tests-doc-only | P3 | open | Missing Tests | \| Module \| API Routes \| Test Files \| Coverage % \| Gap \| | Doc-only |
| todo-fixme-7-low-priority-in-graphql-stubs-bugs-doc-only | P3 | open | Bugs | \| **TODO/FIXME** \| 7 \| 🟡 \| Low priority, in GraphQL stubs \| | Doc-only |
| bugs-logic-gh-envs-for-release-gate-open-ensure-github-environments-staging-prod | P3 | open | Logic Errors | \| Bugs/Logic \| GH envs for release-gate \| Open \| Ensure GitHub environments `staging`, `production-approval`, `production` exist to silence workflow warnings. \| | Doc-only |
| 539-docs-pending-update-pending-master-v17-0-docs-pending-report-update-open-bug | P3 | open | Bugs | \| #539 \| docs(pending): Update PENDING_MASTER v17.0 \| docs/pending-report-update \| Open \| | Doc-only |
| 540-docs-pending-update-pending-master-v18-0-agent-system-scan-20251212-135700-o | P3 | open | Bugs | \| #540 \| docs(pending): Update PENDING_MASTER v18.0 \| agent/system-scan-20251212-135700 \| Open \| | Doc-only |
| sms-otp-needs-env-vars-yes-bugs-doc-only | P3 | open | Bugs | \| SMS/OTP \| ⏳ Needs env vars \| **Yes** \| | Doc-only |
| missing-tests-added-checkout-happy-quote-error-coverage-still-need-tap-payments- | P3 | open | Missing Tests | - Missing Tests: Added checkout happy/quote/error coverage; still need TAP payments client deeper coverage, checkout edge cases, auth routes, and full Playwright pass to close gate. | Doc-only |
| added-otp-send-fail-fast-when-sms-taqnyat-isn-t-operational-guarded-souq-ad-clic | P3 | open | Next Steps | - Added OTP send fail-fast when SMS/Taqnyat isn’t operational; guarded Souq ad clicks and Taqnyat webhook with JSON parsing + payload limits; created checkout unit tests for TAP subscription flow. | Doc-only |
| added-otp-fail-fast-when-sms-taqnyat-is-not-operational-taqnyat-webhook-now-size | P3 | open | Next Steps | - Added OTP fail-fast when SMS/Taqnyat is not operational; Taqnyat webhook now size-capped and JSON-safe; Souq ad clicks return 400 on bad JSON instead of crashing; checkout unit tests added. | Doc-only |
| 3-investigate-playwright-timeout-issues-unrelated-to-production-code-bugs-doc-on | P3 | open | Bugs | 3. Investigate Playwright timeout issues (unrelated to production code) | Doc-only |
| subscriptionseatservice-ts-server-services-low-0-pending-bugs-subscriptionseatse | P3 | open | Bugs | \| `subscriptionSeatService.ts` \| server/services/ \| 🟢 LOW \| 0 \| 🔲 Pending \| | subscriptionSeatService.ts |
| onboardingkpi-service-ts-server-services-low-0-pending-bugs-onboardingkpi-servic | P3 | open | Bugs | \| `onboardingKpi.service.ts` \| server/services/ \| 🟢 LOW \| 0 \| 🔲 Pending \| | onboardingKpi.service.ts |
| rate-limiting-34-coverage-needs-improvement-missing-tests-doc-only | P3 | open | Missing Tests | \| **Rate limiting** \| ⚠️ 34% coverage \| Needs improvement \| | Doc-only |
| rate-limit-coverage-121-352-34-needs-improvement-missing-tests-doc-only | P3 | open | Missing Tests | \| **Rate Limit Coverage** \| 121/352 (34%) \| ⚠️ Needs improvement \| | Doc-only |
| needs-dompurify-8-content-rendering-bugs-doc-only | P3 | open | Bugs | **Needs DOMPurify:** 8 (content rendering) | Doc-only |
| status-todo-8-need-review-2-are-safe-bugs-doc-only | P3 | open | Bugs | **Status:** 🔲 TODO (8 need review, 2 are safe) | Doc-only |
| status-todo-bugs-doc-only | P3 | open | Bugs | **Status:** 🔲 TODO | Doc-only |
| tests-not-run-this-session-pending-next-steps-doc-only | P3 | open | Next Steps | \| Tests \| Not run this session \| ⏸️ Pending \| | Doc-only |
| lint-not-run-this-session-pending-next-steps-doc-only | P3 | open | Next Steps | \| Lint \| Not run this session \| ⏸️ Pending \| | Doc-only |
| rate-limited-routes-117-352-33-needs-expansion-bugs-doc-only | P3 | open | Bugs | \| **Rate-Limited Routes** \| 117/352 (33%) \| ⚠️ Needs expansion \| | Doc-only |
| missing-tests-aqar-listing-package-favorites-org-enforcement-missing-assert-writ | P3 | open | Missing Tests | \| Missing Tests \| Aqar listing/package/favorites org enforcement \| 🟠 Missing \| Assert writes fail without orgId and persist correct tenant org. \| | Doc-only |
| efficiency-short-circuit-graphql-reads-when-orgid-missing-todo-return-auth-error | P3 | open | Bugs | \| Efficiency \| Short-circuit GraphQL reads when orgId missing \| 🔲 TODO \| Return auth error before DB calls for dashboard/workOrder/properties/invoice. \| | Doc-only |
| efficiency-normalize-org-once-per-graphql-request-and-reuse-across-resolvers-tod | P3 | open | Bugs | \| Efficiency \| Normalize org once per GraphQL request and reuse across resolvers \| 🔲 TODO \| Cut repeated `Types.ObjectId.isValid` checks and duplicate context setup. \| | Doc-only |
| missing-tests-souq-review-creation-org-requirement-missing-api-test-to-enforce-s | P3 | open | Missing Tests | \| Missing Tests \| Souq review creation org requirement \| 🟠 Missing \| API test to enforce session orgId and validate stored org matches tenant. \| | Doc-only |
| missing-tests-graphql-org-enforcement-tenant-audit-context-missing-add-tests-for | P3 | open | Missing Tests | \| Missing Tests \| GraphQL org enforcement + tenant/audit context \| 🟠 Missing \| Add tests for org-required, context set/cleared, and orgless rejections. \| | Doc-only |
| bugs-logic-aqar-favorites-uses-user-id-fallback-for-tenant-scope-open-app-api-aq | P3 | open | Logic Errors | \| Bugs/Logic \| Aqar favorites uses user-id fallback for tenant scope \| 🔴 Open \| app/api/aqar/favorites/route.ts:61-138 — favorites can be stored under user ids. \| | app/api/aqar/favorites/route.ts:61-138 |
| bugs-logic-aqar-package-payment-creation-uses-user-id-fallback-open-app-api-aqar | P3 | open | Logic Errors | \| Bugs/Logic \| Aqar package/payment creation uses user-id fallback \| 🔴 Open \| app/api/aqar/packages/route.ts:102-124 — payments/packages can attach to user ids. \| | app/api/aqar/packages/route.ts:102-124 |
| efficiency-short-circuit-graphql-reads-when-orgid-missing-todo-fail-fast-before- | P3 | open | Bugs | \| Efficiency \| Short-circuit GraphQL reads when orgId missing \| 🔲 TODO \| Fail fast before DB work for dashboard/workOrder/properties/invoice to prevent orgless scans. \| | Doc-only |
| efficiency-normalize-org-once-per-graphql-request-and-reuse-todo-avoid-repeated- | P3 | open | Logic Errors | \| Efficiency \| Normalize org once per GraphQL request and reuse \| 🔲 TODO \| Avoid repeated `Types.ObjectId.isValid`/normalization; set tenant/audit context once to reduce duplicate DB calls. \| | Doc-only |
| total-remaining-effort-16-20-hours-next-steps-doc-only | P3 | open | Next Steps | **Total Remaining Effort:** ~16-20 hours | Doc-only |
| lint-not-yet-run-bugs-doc-only | P3 | open | Bugs | - [ ] Lint: Not yet run | Doc-only |
| area-gap-priority-bugs-doc-only | P3 | open | Bugs | \| Area \| Gap \| Priority \| | Doc-only |
| uncommitted-changes-10-files-staged-unstaged-pending-commit-bugs-doc-only | P3 | open | Bugs | \| **Uncommitted Changes** \| ~10 files (staged + unstaged) \| ⚠️ Pending commit \| | Doc-only |
| missing-tests-aqar-listing-package-favorites-org-enforcement-missing-ensure-writ | P3 | open | Missing Tests | \| Missing Tests \| Aqar listing/package/favorites org enforcement \| 🟠 Missing \| Ensure writes fail without orgId and persist correct tenant org. \| | Doc-only |
| missing-tests-souq-review-post-org-requirement-missing-api-test-to-enforce-sessi | P3 | open | Missing Tests | \| Missing Tests \| Souq review POST org requirement \| 🟠 Missing \| API test to enforce session orgId and stored org matches tenant. \| | Doc-only |
| missing-tests-graphql-org-enforcement-tenant-audit-context-missing-add-org-requi | P3 | open | Missing Tests | \| Missing Tests \| GraphQL org enforcement + tenant/audit context \| 🟠 Missing \| Add org-required + orgless rejection coverage for queries/mutations. \| | Doc-only |
| bugs-logic-aqar-listings-packages-favorites-use-user-id-fallback-open-listings-a | P3 | open | Logic Errors | \| Bugs/Logic \| Aqar listings/packages/favorites use user-id fallback \| 🔴 Open \| listings `app/api/aqar/listings/route.ts:99-138`; packages `app/api/aqar/packages/route.ts:102-124`; favorites `app/api | app/api/aqar/listings/route.ts:99-138 |
| bugs-logic-souq-review-post-falls-back-to-user-id-open-app-api-souq-reviews-rout | P3 | open | Logic Errors | \| Bugs/Logic \| Souq review POST falls back to user id \| 🔴 Open \| app/api/souq/reviews/route.ts:61-108 — unscoped writes; align with GET org requirement. \| | app/api/souq/reviews/route.ts:61-108 |
| bugs-logic-graphql-createworkorder-writes-with-userid-fallback-open-lib-graphql- | P3 | open | Logic Errors | \| Bugs/Logic \| GraphQL `createWorkOrder` writes with userId fallback \| 🔴 Open \| lib/graphql/index.ts:936-1052 — require org before writes; forbid userId-as-org. \| | lib/graphql/index.ts:936-1052 |
| bugs-logic-graphql-workorder-query-lacks-org-filter-open-lib-graphql-index-ts-76 | P3 | open | Logic Errors | \| Bugs/Logic \| GraphQL `workOrder` query lacks org filter \| 🔴 Open \| lib/graphql/index.ts:769-801 — require org + tenant/audit context. \| | lib/graphql/index.ts:769-801 |
| efficiency-short-circuit-graphql-reads-when-orgid-missing-todo-fail-fast-for-das | P3 | open | Bugs | \| Efficiency \| Short-circuit GraphQL reads when orgId missing \| 🔲 TODO \| Fail fast for dashboard/workOrder/properties/invoice to avoid orgless scans. \| | Doc-only |
| missing-required-field-invalid-input-expected-x-received-undefined-bugs-doc-only | P3 | open | Bugs | - Missing required field: `"Invalid input: expected X, received undefined"` | Doc-only |
| pr-ready-to-commit-and-merge-bugs-doc-only | P3 | open | Bugs | - [ ] PR: Ready to commit and merge | Doc-only |
| missing-email-tocontain-invalid-input-bugs-doc-only | P3 | open | Bugs | - Missing email: `toContain("Invalid input")` | Doc-only |
| category-current-target-gap-bugs-doc-only | P3 | open | Bugs | \| Category \| Current \| Target \| Gap \| | Doc-only |
| service-module-path-lines-priority-gap-bugs-doc-only | P3 | open | Bugs | \| Service/Module \| Path \| Lines \| Priority \| Gap \| | Doc-only |
| module-routes-rate-limited-gap-bugs-doc-only | P3 | open | Bugs | \| Module \| Routes \| Rate-Limited \| Gap \| | Doc-only |
| missing-error-boundary-risk-bugs-doc-only | P3 | open | Bugs | \| Missing Error Boundary \| Risk \| | Doc-only |
| module-total-routes-validated-gap-priority-bugs-doc-only | P3 | open | Bugs | \| Module \| Total Routes \| Validated \| Gap \| Priority \| | Doc-only |
| missing-error-boundaries-app-ux-20-top-level-routes-lack-error-tsx-bugs-error-ts | P3 | open | Bugs | \| Missing error boundaries \| `app/*/` \| UX \| 20 top-level routes lack error.tsx \| | error.ts |
| missing-service-tests-server-services-testing-11-services-lack-unit-tests-missin | P3 | open | Missing Tests | \| Missing service tests \| `server/services/**` \| Testing \| 11 services lack unit tests \| | Doc-only |
| services-without-tests-11-gap-see-details-below-missing-tests-doc-only | P3 | open | Missing Tests | \| **Services Without Tests** \| 11 \| 🟡 Gap \| See details below \| | Doc-only |
| zod-validated-routes-119-352-34-needs-work-233-remaining-bugs-doc-only | P3 | open | Bugs | \| **Zod-Validated Routes** \| 119/352 (34%) \| 🟡 Needs work \| 233 remaining \| | Doc-only |
| missing-subpages-25-directories-bugs-doc-only | P3 | open | Bugs | **Missing Subpages**: 25+ directories | Doc-only |
| status-major-gap-14-coverage-missing-tests-doc-only | P3 | open | Missing Tests | **Status**: 🔴 Major Gap (14% coverage) | Doc-only |
| total-gap-301-routes-without-rate-limiting-85-bugs-doc-only | P3 | open | Bugs | **Total Gap**: 301 routes without rate limiting (85%) | Doc-only |
| module-total-routes-protected-gap-priority-bugs-doc-only | P3 | open | Bugs | \| Module \| Total Routes \| Protected \| Gap \| Priority \| | Doc-only |
| p3-remaining-service-tests-3-hrs-5-services-todo-next-steps-doc-only | P3 | open | Next Steps | \| 🟢 P3 \| Remaining service tests \| 3 hrs \| 5 services \| 🔲 TODO \| | Doc-only |
| p3-error-boundaries-for-subpages-2-hrs-25-subpages-todo-next-steps-doc-only | P3 | open | Next Steps | \| 🟢 P3 \| Error boundaries for subpages \| 2 hrs \| 25+ subpages \| 🔲 TODO \| | Doc-only |
| open-prs-5-all-draft-cleanup-needed-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 5 (all draft) \| 🟡 Cleanup needed \| — \| | Doc-only |
| zod-validated-routes-111-352-32-needs-work-241-remaining-bugs-doc-only | P3 | open | Bugs | \| **Zod-Validated Routes** \| 111/352 (32%) \| 🟡 Needs work \| 241 remaining \| | Doc-only |
| rate-limited-routes-51-352-14-gap-301-unprotected-bugs-doc-only | P3 | open | Bugs | \| **Rate-Limited Routes** \| 51/352 (14%) \| 🔴 Gap \| 301 unprotected \| | Doc-only |
| gap-100-deep-subdirectories-low-priority-bugs-doc-only | P3 | open | Bugs | **Gap**: ~100 deep subdirectories (low priority) | Doc-only |
| missing-error-boundaries-100-deferred-core-routes-covered-30-bugs-doc-only | P3 | open | Bugs | \| Missing error boundaries \| ~100 \| 🟢 Deferred \| Core routes covered (30) \| | Doc-only |
| module-total-protected-gap-priority-bugs-doc-only | P3 | open | Bugs | \| Module \| Total \| Protected \| Gap \| Priority \| | Doc-only |
| todo-fixme-comments-29-review-may-contain-valid-work-items-bugs-doc-only | P3 | open | Bugs | \| TODO/FIXME comments \| 29 \| 🟡 Review \| May contain valid work items \| | Doc-only |
| gap-to-target-143-routes-bugs-doc-only | P3 | open | Bugs | **Gap to Target**: 143 routes | Doc-only |
| module-total-protected-gap-priority-action-bugs-doc-only | P3 | open | Bugs | \| Module \| Total \| Protected \| Gap \| Priority \| Action \| | Doc-only |
| p3-review-29-todo-fixme-comments-1-hr-code-quality-deferred-next-steps-doc-only | P3 | open | Next Steps | \| 🟢 P3 \| Review 29 TODO/FIXME comments \| 1 hr \| Code quality \| 🔲 Deferred \| | Doc-only |
| module-api-routes-test-files-gap-priority-missing-tests-doc-only | P3 | open | Missing Tests | \| Module \| API Routes \| Test Files \| Gap \| Priority \| | Doc-only |
| todo-fixme-comments-29-review-needed-bugs-doc-only | P3 | open | Bugs | \| **TODO/FIXME Comments** \| 29 \| 🟡 Review needed \| — \| | Doc-only |
| open-draft-prs-6-cleanup-needed-bugs-doc-only | P3 | open | Bugs | \| **Open Draft PRs** \| 6 \| 🟡 Cleanup needed \| — \| | Doc-only |
| unprotected-routes-213-352-61-needs-work-bugs-doc-only | P3 | open | Bugs | \| **Unprotected Routes** \| 213/352 (61%) \| 🔴 Needs Work \| — \| | Doc-only |
| issue-2-todos-in-resolvers-returning-empty-data-bugs-doc-only | P3 | open | Bugs | - **Issue**: 2 TODOs in resolvers returning empty data | Doc-only |
| rate-limiting-69-42-recalculated-needs-work-bugs-doc-only | P3 | open | Bugs | \| Rate Limiting \| 69% \| 42% (recalculated) \| 🔴 Needs work \| | Doc-only |
| tests-e2e-auth-spec-ts-multiple-missing-env-vars-expected-missing-tests-tests-e2 | P3 | open | Missing Tests | \| `tests/e2e/auth.spec.ts` (multiple) \| Missing env vars \| ✅ Expected \| | tests/e2e/auth.spec.ts |
| open-prs-unknown-6-stale-cleanup-needed-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| Unknown \| 6 \| 🟡 Stale \| Cleanup needed \| | Doc-only |
| routes-needing-rate-limiting-40-40-pending-bugs-doc-only | P3 | open | Bugs | \| **Routes Needing Rate Limiting** \| 40 \| 40 \| 🟡 Pending \| — \| | Doc-only |
| 2-missing-shared-model-typings-server-models-hr-models-ts-and-server-models-user | P3 | open | Bugs | 2) **Missing shared model typings** — `server/models/hr.models.ts` and `server/models/User.ts` both reference `EmployeeMutable`/`UserMutable`/`EmployeeDocLike`/`HydratedDocument` that no longer resolv | server/models/hr.models.ts |
| docs-openapi-60-req-min-docs-openapi-openapi-spec-bugs-doc-only | P3 | open | Bugs | \| `docs/openapi` \| 60 req/min \| `docs:openapi` \| OpenAPI spec \| | Doc-only |
| open-prs-6-6-stale-cleanup-needed-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 6 \| 6 \| 🟡 Stale \| Cleanup needed \| | Doc-only |
| latest-commit-717df925c-pending-ready-1-commit-missing-tests-doc-only | P3 | open | Missing Tests | \| **Latest Commit** \| `717df925c` \| Pending \| 🟡 Ready \| +1 commit \| | Doc-only |
| 01-25-graphql-review-todo-stubs-identified-bugs-doc-only | P3 | open | Bugs | \| 01:25 \| GraphQL review \| TODO stubs identified \| | Doc-only |
| json-parse-safety-80-80-100-gap-20-bugs-doc-only | P3 | open | Bugs | \| JSON Parse Safety \| 80% \| 80% \| 100% \| 🟡 Gap: 20% \| | Doc-only |
| error-boundaries-84-84-95-gap-11-bugs-doc-only | P3 | open | Bugs | \| Error Boundaries \| 84% \| 84% \| 95% \| 🟡 Gap: 11% \| | Doc-only |
| input-validation-zod-33-33-80-gap-47-bugs-doc-only | P3 | open | Bugs | \| **Input Validation (Zod)** \| 33% \| 33% \| 80% \| 🟡 Gap: 47% \| | Doc-only |
| properties-invoice-have-guards-but-todo-stubs-bugs-doc-only | P3 | open | Bugs | - `properties`, `invoice` - 🟡 Have guards but TODO stubs | Doc-only |
| missing-test-categories-missing-tests-doc-only | P3 | open | Missing Tests | **Missing Test Categories**: | Doc-only |
| area-current-target-gap-bugs-doc-only | P3 | open | Bugs | \| Area \| Current \| Target \| Gap \| | Doc-only |
| invoice-has-org-guard-but-todo-stub-bugs-doc-only | P3 | open | Bugs | - `invoice` - 🟡 Has org guard but TODO stub | Doc-only |
| properties-has-org-guard-but-todo-stub-bugs-doc-only | P3 | open | Bugs | - `properties` - 🟡 Has org guard but TODO stub | Doc-only |
| open-prs-stale-6-6-cleanup-needed-bugs-doc-only | P3 | open | Bugs | \| **Open PRs (Stale)** \| 6 \| 6 \| 🟡 Cleanup Needed \| — \| | Doc-only |
| routes-with-zod-validation-116-352-33-116-352-33-needs-work-bugs-doc-only | P3 | open | Bugs | \| **Routes With Zod Validation** \| ~116/352 (33%) \| ~116/352 (33%) \| 🟡 Needs Work \| — \| | Doc-only |
| graphql-completeness-80-100-all-todo-stubs-implemented-bugs-doc-only | P3 | open | Bugs | \| **GraphQL Completeness** \| 80% \| **100%** \| All TODO stubs implemented \| | Doc-only |
| 2-invoice-resolver-was-todo-at-line-987-bugs-doc-only | P3 | open | Bugs | 2. **`invoice` resolver** (was TODO at line ~987): | Doc-only |
| 1-properties-resolver-was-todo-at-line-943-bugs-doc-only | P3 | open | Bugs | 1. **`properties` resolver** (was TODO at line ~943): | Doc-only |
| graphql-todos-2-stubs-0-stubs-complete-improved-bugs-doc-only | P3 | open | Bugs | \| **GraphQL TODOs** \| 2 stubs \| 0 stubs \| ✅ **Complete** \| 🟢 Improved \| | Doc-only |
| services-4-todos-integration-improvements-bugs-doc-only | P3 | open | Bugs | - **services/**: 4 TODOs (integration improvements) | Doc-only |
| app-10-todos-feature-enhancements-bugs-doc-only | P3 | open | Bugs | - **app/**: 10 TODOs (feature enhancements) | Doc-only |
| lib-15-todos-mostly-optimization-notes-efficiency-doc-only | P3 | open | Efficiency | - **lib/**: 15 TODOs (mostly optimization notes) | Doc-only |
| note-some-may-be-covered-by-middleware-level-rate-limiting-needs-verification-bu | P3 | open | Bugs | **Note**: Some may be covered by middleware-level rate limiting. Needs verification. | Doc-only |
| open-prs-stale-6-6-cleanup-bugs-doc-only | P3 | open | Bugs | \| **Open PRs (Stale)** \| 6 \| 6 \| 🔴 Cleanup \| — \| | Doc-only |
| rate-limiting-100-87-308-352-44-missing-regression-bugs-doc-only | P3 | open | Bugs | \| **Rate Limiting** \| 100% \| 87% (308/352) \| 🟡 44 Missing \| Regression \| | Doc-only |
| zod-validation-33-34-121-352-needs-work-bugs-doc-only | P3 | open | Bugs | \| **Zod Validation** \| 33% \| 34% (121/352) \| 🟡 Needs Work \| — \| | Doc-only |
| test-suite-275-284-pass-9-failures-needs-fix-missing-tests-doc-only | P3 | open | Missing Tests | \| **Test Suite** \| — \| 275/284 pass \| 🟡 9 Failures \| Needs Fix \| | Doc-only |
| stale-prs-6-6-needs-cleanup-bugs-doc-only | P3 | open | Bugs | \| **Stale PRs** \| 6 \| 6 \| 🔴 Needs cleanup \| | Doc-only |
| open-prs-stale-6-6-needs-cleanup-bugs-doc-only | P3 | open | Bugs | \| **Open PRs (Stale)** \| 6 \| 6 \| 🔴 Needs Cleanup \| — \| | Doc-only |
| o1-generate-openapi-specs-optional-4h-bugs-doc-only | P3 | open | Bugs | \| O1 \| Generate OpenAPI specs \| 🟡 Optional \| 4h \| | Doc-only |
| api-documentation-75-90-openapi-1-week-bugs-doc-only | P3 | open | Bugs | \| **API Documentation** \| 75% \| 90% \| OpenAPI \| 1 week \| | Doc-only |
| metric-current-target-gap-eta-bugs-doc-only | P3 | open | Bugs | \| Metric \| Current \| Target \| Gap \| ETA \| | Doc-only |
| o4-comprehensive-audit-logging-4h-bugs-doc-only | P3 | open | Bugs | - [ ] **O4**: Comprehensive audit logging - 4h | Doc-only |
| o3-request-id-correlation-2h-bugs-doc-only | P3 | open | Bugs | - [ ] **O3**: Request ID correlation - 2h | Doc-only |
| o2-add-sentry-apm-spans-3h-bugs-doc-only | P3 | open | Bugs | - [ ] **O2**: Add Sentry APM spans - 3h | Doc-only |
| o1-generate-openapi-specs-for-all-routes-4h-bugs-doc-only | P3 | open | Bugs | - [ ] **O1**: Generate OpenAPI specs for all routes - 4h | Doc-only |
| e4-create-shared-rate-limit-helper-with-decorators-1h-bugs-doc-only | P3 | open | Bugs | - [ ] **E4**: Create shared rate limit helper with decorators - 1h | Doc-only |
| e3-centralize-session-guard-helper-2h-bugs-doc-only | P3 | open | Bugs | - [ ] **E3**: Centralize session guard helper - 2h | Doc-only |
| query-optimization-identify-and-fix-n-1-queries-3h-efficiency-doc-only | P3 | open | Efficiency | - [ ] **Query optimization**: Identify and fix N+1 queries - 3h | Doc-only |
| add-api-tests-for-assets-cms-6-tests-2h-missing-tests-doc-only | P3 | open | Missing Tests | - [ ] **Add API tests for Assets & CMS** (6 tests) - 2h | Doc-only |
| add-rate-limiting-to-assets-cms-others-90-routes-4h-bugs-doc-only | P3 | open | Bugs | - [ ] **Add rate limiting to Assets, CMS, Others** (90 routes) - 4h | Doc-only |
| add-zod-validation-to-remaining-191-routes-8h-bugs-doc-only | P3 | open | Bugs | - [ ] **Add Zod validation to remaining 191 routes** - 8h | Doc-only |
| documentation-75-openapi-partial-inline-docs-good-api-docs-incomplete-bugs-doc-o | P3 | open | Bugs | \| **Documentation** \| 75% \| OpenAPI partial, inline docs good, API docs incomplete \| | Doc-only |
| coverage-gaps-identified-missing-tests-doc-only | P3 | open | Missing Tests | **Coverage Gaps Identified**: | Doc-only |
| error-boundaries-38-45-modules-84-missing-only-in-minor-routes-bugs-doc-only | P3 | open | Bugs | \| **Error Boundaries** \| ✅ 38/45 modules (84%) \| Missing only in minor routes \| | Doc-only |
| stale-prs-6-9-needs-cleanup-bugs-doc-only | P3 | open | Bugs | \| **Stale PRs** \| 6 \| 9 \| 🔴 Needs cleanup \| | Doc-only |
| open-prs-stale-6-9-needs-cleanup-3-bugs-doc-only | P3 | open | Bugs | \| **Open PRs (Stale)** \| 6 \| 9 \| 🔴 Needs Cleanup \| +3 \| | Doc-only |
| add-audit-logging-for-sensitive-operations-bugs-doc-only | P3 | open | Bugs | - [ ] Add audit logging for sensitive operations | Doc-only |
| merge-feat-marketplace-api-tests-to-main-missing-tests-doc-only | P3 | open | Missing Tests | - [ ] Merge `feat/marketplace-api-tests` to main | Doc-only |
| add-zod-validation-to-remaining-routes-bugs-doc-only | P3 | open | Bugs | - [ ] Add Zod validation to remaining routes | Doc-only |
| close-6-stale-draft-prs-539-544-bugs-doc-only | P3 | open | Bugs | - [ ] Close 6 stale draft PRs (#539-544) | Doc-only |
| push-changes-to-remote-bugs-doc-only | P3 | open | Bugs | - [ ] Push changes to remote | Doc-only |
| commit-pending-test-files-missing-tests-doc-only | P3 | open | Missing Tests | - [ ] Commit pending test files | Doc-only |
| api-documentation-partial-openapi-complete-3h-bugs-doc-only | P3 | open | Bugs | \| API documentation \| Partial \| OpenAPI complete \| 3h \| | Doc-only |
| no-todo-fixme-in-api-routes-clean-zero-technical-debt-markers-bugs-doc-only | P3 | open | Bugs | \| **No TODO/FIXME in API routes** \| ✅ Clean \| Zero technical debt markers \| | Doc-only |
| add-request-id-correlation-bugs-doc-only | P3 | open | Bugs | - [ ] Add request ID correlation | Doc-only |
| complete-openapi-documentation-bugs-doc-only | P3 | open | Bugs | - [ ] Complete OpenAPI documentation | Doc-only |
| audit-8-no-explicit-any-eslint-disable-usages-1h-bugs-doc-only | P3 | open | Bugs | - [ ] Audit 8 `no-explicit-any` eslint-disable usages — 1h | Doc-only |
| review-2-json-parse-locations-without-try-catch-30m-bugs-doc-only | P3 | open | Bugs | - [ ] Review 2 JSON.parse locations without try-catch — 30m | Doc-only |
| close-9-stale-draft-prs-15m-bugs-doc-only | P3 | open | Bugs | - [ ] Close 9 stale draft PRs — 15m | Doc-only |
| todo-fixme-markers-0-found-clean-codebase-bugs-doc-only | P3 | open | Bugs | \| ✅ TODO/FIXME markers \| 0 found \| Clean codebase \| | Doc-only |
| todo-fixme-in-code-0-0-clean-bugs-doc-only | P3 | open | Bugs | \| **TODO/FIXME in Code** \| 0 \| 0 \| ✅ Clean \| — \| | Doc-only |
| open-prs-stale-drafts-6-10-cleanup-needed-4-bugs-doc-only | P3 | open | Bugs | \| **Open PRs (Stale Drafts)** \| 6 \| 10 \| 🔴 Cleanup Needed \| +4 \| | Doc-only |
| review-similar-dynamic-require-patterns-30m-bugs-doc-only | P3 | open | Bugs | - [ ] Review similar dynamic require patterns — 30m | Doc-only |
| merge-pr-548-after-approval-bugs-doc-only | P3 | open | Bugs | - [ ] Merge PR #548 after approval | Doc-only |
| check-4-similar-ref-patterns-for-type-errors-30m-bugs-doc-only | P3 | open | Bugs | - [ ] Check 4 similar ref patterns for type errors — 30m | Doc-only |
| add-rate-limiting-to-3-legacy-routes-30m-bugs-doc-only | P3 | open | Bugs | - [ ] Add rate limiting to 3 legacy routes — 30m | Doc-only |
| close-9-stale-draft-prs-539-547-15m-bugs-doc-only | P3 | open | Bugs | - [ ] Close 9 stale draft PRs (#539-547) — 15m | Doc-only |
| open-prs-stale-drafts-10-10-cleanup-needed-bugs-doc-only | P3 | open | Bugs | \| **Open PRs (Stale Drafts)** \| 10 \| 10 \| 🔴 Cleanup Needed \| — \| | Doc-only |
| p3-complete-openapi-documentation-3h-backlog-bugs-doc-only | P3 | open | Bugs | \| P3 \| Complete OpenAPI documentation \| 3h \| Backlog \| | Doc-only |
| remaining-open-pr-bugs-doc-only | P3 | open | Bugs | **Remaining Open PR:** | Doc-only |
| support-org-apis-test-ts-missing-rate-limit-mock-added-enforceratelimit-mock-mis | P3 | open | Missing Tests | \| `support-org-apis.test.ts` \| Missing rate limit mock \| Added `enforceRateLimit` mock \| | support-org-apis.test.ts |
| health-test-ts-missing-rate-limit-mock-nextrequest-added-mock-and-createmockrequ | P3 | open | Missing Tests | \| `health.test.ts` \| Missing rate limit mock + NextRequest \| Added mock and `createMockRequest()` helper \| | health.test.ts |
| open-prs-1-1-clean-stable-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 1 \| 1 \| ✅ Clean \| Stable \| | Doc-only |
| missing-tests-config-enforcement-for-hardcoded-sensitive-values-config-s3-souq-r | P3 | open | Missing Tests | \| Missing Tests \| Config enforcement for hardcoded-sensitive values \| config/s3, Souq rule config, credential scripts \| Add unit tests that fail when default/fallback values are used in prod builds an | Doc-only |
| enforced-required-aws-s3-region-bucket-with-production-guard-test-fallbacks-adde | P3 | open | Next Steps | - Enforced required AWS S3 region/bucket with production guard + test fallbacks; added guard tests and doc/env samples updated to reflect no fallbacks. | Doc-only |
| parameterized-superadmin-credential-rotation-script-to-env-only-inputs-username- | P3 | open | Next Steps | - Parameterized SuperAdmin credential rotation script to env-only inputs (username/password now required envs) and removed credential echoes; added banned-literal guard test to prevent reintroduction. | Doc-only |
| latest-commit-4cc4726f3-this-session-pending-1-missing-tests-doc-only | P3 | open | Missing Tests | \| **Latest Commit** \| `4cc4726f3` \| `<this session>` \| 🔄 Pending \| +1 \| | Doc-only |
| code-quality-100-17-justified-disables-0-todo-fixme-bugs-doc-only | P3 | open | Bugs | \| **Code Quality** \| 100% \| ✅ \| 17 justified disables, 0 TODO/FIXME \| | Doc-only |
| test-gap-summary-86-additional-tests-needed-to-reach-80-target-coverage-missing- | P3 | open | Missing Tests | **Test Gap Summary:** 86 additional tests needed to reach 80% target coverage. | Doc-only |
| open-prs-1-1-clean-548-active-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 1 \| 1 \| ✅ Clean \| #548 active \| | Doc-only |
| latest-commit-5b7e425ac-this-session-pending-1-missing-tests-doc-only | P3 | open | Missing Tests | \| **Latest Commit** \| `5b7e425ac` \| `<this session>` \| 🔄 Pending \| +1 \| | Doc-only |
| cluster-001 | P3 | open | Missing Tests | \| JSON-CATCH-CLUSTER-001 \| Test Gap/Consistency \| Multiple API routes using `req.json().catch(() => ({}\|null))` (e.g., `app/api/help/escalate/route.ts`, `app/api/billing/quote/route.ts`, `app/api/fm/w | req.js |
| open-prs-1-1-clean-549-active-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 1 \| 1 \| ✅ Clean \| #549 active \| | Doc-only |
| latest-commit-37bd93d69-this-session-pending-1-missing-tests-doc-only | P3 | open | Missing Tests | \| **Latest Commit** \| `37bd93d69` \| `<this session>` \| 🔄 Pending \| +1 \| | Doc-only |
| p3-003-documentation-api-docs-openapi-spec-updates-backlog-bugs-doc-only | P3 | open | Bugs | \| P3-003 \| Documentation \| API docs \| OpenAPI spec updates \| 🟢 Backlog \| | Doc-only |
| open-prs-1-2-active-549-550-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 1 \| **2** \| 🔄 Active \| #549, #550 \| | Doc-only |
| latest-commit-6e3bb4b05-this-session-pending-1-missing-tests-doc-only | P3 | open | Missing Tests | \| **Latest Commit** \| `6e3bb4b05` \| `<this session>` \| 🔄 Pending \| +1 \| | Doc-only |
| missing-tests-e2e-coverage-playwright-smoke-auth-checkout-returns-claims-rerun-a | P3 | open | Missing Tests | \| Missing Tests \| E2E coverage \| Playwright smoke (auth, checkout, returns/claims) \| Rerun and stabilize after recent config changes; add to CI as a short smoke. \| | Doc-only |
| aws-s3-region-bucket-now-required-in-production-docs-env-samples-updated-guard-t | P3 | open | Next Steps | - AWS S3 region/bucket now required in production; docs/env samples updated; guard tests added. `pnpm typecheck`, `pnpm lint`, and full `pnpm test:ci` are passing; Playwright e2e not rerun this pass ( | Doc-only |
| silent-json-coverage-gap-testing-gap-efficiency-app-api-aqar-listings-packages-r | P3 | open | Missing Tests | \| SILENT-JSON-COVERAGE-GAP \| Testing Gap/Efficiency \| app/api/aqar/(listings\|packages)/route.ts, app/api/projects/route.ts, app/api/fm/finance/budgets/[id]/route.ts \| Multiple endpoints still use `req | /route.ts |
| missing-tests-souq-rule-overrides-tests-unit-services-souq-rules-config-test-ts- | P3 | open | Missing Tests | \| Missing Tests \| Souq rule overrides \| tests/unit/services/souq-rules-config.test.ts \| Verifies defaults and tenant override merge. \| | tests/unit/services/souq-rules-config.test.ts |
| enforced-aws-s3-bucket-region-as-required-in-production-docs-env-samples-updated | P3 | open | Next Steps | - Enforced AWS S3 bucket/region as required in production; docs/env samples updated; guard tests added. All `pnpm typecheck`, `pnpm lint`, and `pnpm test:ci` passing (full Vitest). | Doc-only |
| locked-superadmin-rotation-script-to-env-only-credentials-superadmin-username-su | P3 | open | Next Steps | - Locked SuperAdmin rotation script to env-only credentials (`SUPERADMIN_USERNAME`/`SUPERADMIN_PASSWORD`), removed echoed secrets, and added banned-literal guardrail test. | Doc-only |
| total-gap-102-bugs-doc-only | P3 | open | Bugs | \| **Total Gap** \| — \| — \| — \| **102** \| | Doc-only |
| module-routes-tests-coverage-gap-missing-tests-doc-only | P3 | open | Missing Tests | \| Module \| Routes \| Tests \| Coverage \| Gap \| | Doc-only |
| p3-003-documentation-openapi-spec-needs-updating-backlog-sync-with-routes-bugs-d | P3 | open | Bugs | \| P3-003 \| Documentation \| OpenAPI \| Spec needs updating \| 🟢 Backlog \| Sync with routes \| | Doc-only |
| open-prs-2-2-active-549-550-bugs-doc-only | P3 | open | Bugs | \| **Open PRs** \| 2 \| 2 \| 🔄 Active \| #549, #550 \| | Doc-only |
| latest-commit-d7c82f309-uncommitted-pending-8-files-missing-tests-doc-only | P3 | open | Missing Tests | \| **Latest Commit** \| `d7c82f309` \| `<uncommitted>` \| 🔄 Pending \| +8 files \| | Doc-only |
| observability-opentelemetry-tracing-debugging-efficiency-bugs-doc-only | P3 | open | Bugs | \| **Observability** \| OpenTelemetry tracing \| Debugging efficiency \| | Doc-only |
| api-client-generation-manual-openapi-typescript-3-days-bugs-doc-only | P3 | open | Bugs | \| **API Client Generation** \| Manual \| — \| OpenAPI → TypeScript \| 3 days \| | Doc-only |
| total-gap-103-routes-need-test-coverage-missing-tests-doc-only | P3 | open | Missing Tests | **Total Gap**: ~103 routes need test coverage | Doc-only |
| module-routes-tests-coverage-gap-priority-missing-tests-doc-only | P3 | open | Missing Tests | \| Module \| Routes \| Tests \| Coverage \| Gap \| Priority \| | Doc-only |
| module-routes-estimated-tests-gap-missing-tests-doc-only | P3 | open | Missing Tests | \| Module \| Routes \| Estimated Tests \| Gap \| | Doc-only |
| gaps-by-module-bugs-doc-only | P3 | open | Bugs | **Gaps by Module**: | Doc-only |
| area-gap-priority-status-bugs-doc-only | P3 | open | Bugs | \| Area \| Gap \| Priority \| Status \| | Doc-only |
| logic-playwright-smoke-timeout-open-diagnose-e2e-hang-run-narrowed-suite-with-de | P3 | open | Logic Errors | \| Logic \| Playwright smoke timeout \| Open \| Diagnose E2E hang; run narrowed suite with debug/timeout flags; inspect Playwright hooks/setup. \| | Doc-only |
| bugs-release-gate-environments-missing-open-create-github-environments-staging-p | P3 | open | Bugs | \| Bugs \| Release-gate environments missing \| Open \| Create GitHub environments `staging`, `production-approval`, `production` to silence workflow warnings. \| | Doc-only |
| aqar-listing-package-favorites-tests-failing-when-orgid-absent-and-asserting-cor | P3 | open | Missing Tests | \| Aqar listing/package/favorites \| Tests failing when orgId absent and asserting correct tenant org persisted \| 🔲 TODO \| | Doc-only |
| souq-review-post-test-enforcing-session-orgid-and-stored-org-consistency-todo-mi | P3 | open | Missing Tests | \| Souq review POST \| Test enforcing session orgId and stored org consistency \| 🔲 TODO \| | Doc-only |
| graphql-org-enforcement-coverage-for-org-required-orgless-rejection-on-queries-m | P3 | open | Missing Tests | \| GraphQL org enforcement \| Coverage for org-required + orgless rejection on queries/mutations \| 🔲 TODO \| | Doc-only |
| short-circuit-graphql-reads-when-orgid-missing-todo-fail-before-db-work-for-dash | P3 | open | Bugs | \| Short-circuit GraphQL reads when orgId missing \| 🔲 TODO \| Fail before DB work for dashboard/workOrder/properties/invoice to prevent orgless scans. \| | Doc-only |
| normalize-org-once-per-graphql-request-and-reuse-todo-avoid-repeated-types-objec | P3 | open | Logic Errors | \| Normalize org once per GraphQL request and reuse \| 🔲 TODO \| Avoid repeated `Types.ObjectId.isValid` calls; set tenant/audit context once per request. \| | Doc-only |
| scan-token-auth-tests-ensuring-token-based-status-scan-paths-are-tenant-namespac | P3 | open | Missing Tests | \| Scan token auth \| Tests ensuring token-based status/scan paths are tenant-namespaced and fail on org mismatch or missing token. \| 🔲 TODO \| | Doc-only |
| upload-metadata-scan-integration-tests-that-reject-keys-outside-the-caller-s-org | P3 | open | Missing Tests | \| Upload metadata/scan \| Integration tests that reject keys outside the caller’s org prefix and validate org-bound signing for scan/metadata/status routes. \| 🔲 TODO \| | Doc-only |
| early-reject-unscoped-s3-keys-todo-validate-org-bind-keys-before-hitting-s3-db-i | P3 | open | Logic Errors | \| Early reject unscoped S3 keys \| 🔲 TODO \| Validate/org-bind keys before hitting S3/DB in upload scan/verify routes to cut needless calls and noisy logs. \| | Doc-only |
| typecheck-lint-tests-not-run-docs-only-update-pending-next-steps-doc-only | P3 | open | Next Steps | \| Typecheck/Lint/Tests \| Not run (docs-only update) \| ⏳ Pending \| | Doc-only |
| area-gap-status-bugs-doc-only | P3 | open | Bugs | \| Area \| Gap \| Status \| | Doc-only |
| typecheck-lint-tests-typecheck-lint-test-models-test-e2e-timed-out-scripts-run-p | P3 | open | Next Steps | \| Typecheck/Lint/Tests \| typecheck ✅; lint ✅; test:models ✅; test:e2e ⏳ Timed out (scripts/run-playwright.sh) \| ⏳ Needs rerun or skip flag \| | Doc-only |
| progress-created-lib-auth-safe-session-ts-with-getsessionorerror-and-getsessiono | P3 | open | Next Steps | - Progress: Created `lib/auth/safe-session.ts` with `getSessionOrError` and `getSessionOrNull` helpers that distinguish infrastructure failures (503 + correlationId + logging) from authentication fail | lib/auth/safe-session.ts |
| 3-missing-negative-path-tests-no-tests-for-auth-infra-failures-db-outages-rate-l | P3 | open | Missing Tests | 3. **Missing negative-path tests**: No tests for auth infra failures, DB outages, rate limit hits | Doc-only |
| 2-missing-integration-tests-settlement-flows-kyc-verification-billing-benchmarks | P3 | open | Missing Tests | 2. **Missing integration tests**: Settlement flows, KYC verification, billing benchmarks have no coverage | Doc-only |
| module-routes-tests-coverage-priority-missing-tests-missing-tests-doc-only | P3 | open | Missing Tests | \| Module \| Routes \| Tests \| Coverage \| Priority Missing Tests \| | Doc-only |
| session-progress-next-steps-doc-only | P3 | open | Next Steps | **Session Progress:** | Doc-only |
| commits-this-session-next-steps-doc-only | P3 | open | Next Steps | **Commits This Session:** | Doc-only |
| session-progress-v65-1-next-steps-doc-only | P3 | open | Next Steps | **Session Progress (v65.1):** | Doc-only |
| verification-next-steps-doc-only | P3 | open | Next Steps | **Verification:** | Doc-only |
| added-try-catch-with-proper-infra-error-logging-next-steps-doc-only | P3 | open | Next Steps | - Added try/catch with proper infra error logging | Doc-only |
| added-try-catch-with-proper-infra-error-discrimination-next-steps-doc-only | P3 | open | Next Steps | - Added try/catch with proper infra error discrimination | Doc-only |
| session-progress-v65-2-next-steps-doc-only | P3 | open | Next Steps | **Session Progress (v65.2):** | Doc-only |
| 22-accessibility-needs-audit-a11y-review-needed-bugs-doc-only | P3 | open | Bugs | \| 22. Accessibility \| ⏳ Needs audit \| a11y review needed \| | Doc-only |
| 21-i18n-completeness-needs-audit-translation-coverage-varies-missing-tests-doc-o | P3 | open | Missing Tests | \| 21. i18n completeness \| ⏳ Needs audit \| Translation coverage varies \| | Doc-only |
| 14-bundle-size-needs-build-analysis-run-next-build-analyze-bugs-doc-only | P3 | open | Bugs | \| 14. Bundle size \| ⏳ Needs build analysis \| Run `next build --analyze` \| | Doc-only |
| 13-n-1-queries-needs-review-flag-in-list-endpoints-bugs-doc-only | P3 | open | Bugs | \| 13. N+1 queries \| ⏳ Needs review \| Flag in list endpoints \| | Doc-only |
| 9-index-verification-needs-db-review-requires-mongosh-verification-bugs-doc-only | P3 | open | Bugs | \| 9. Index verification \| ⏳ Needs DB review \| Requires mongosh verification \| | Doc-only |
| session-progress-v65-3-system-wide-audit-next-steps-doc-only | P3 | open | Next Steps | **Session Progress (v65.3) — System-Wide Audit:** | Doc-only |
| planned-next-steps-next-steps-doc-only | P3 | open | Next Steps | **Planned Next Steps** | Doc-only |
| added-section-14-rapid-execution-co-agent-etiquette-to-github-copilot-instructio | P3 | open | Next Steps | - Added Section 14 “Rapid Execution & Co-Agent Etiquette” to `.github/copilot-instructions.md` to enforce one-pass delivery, git-safety with parallel agents, and documented assumptions when ambiguity  | .github/copilot-instructions.md |
| added-seller-only-rbac-guard-to-souq-kyc-submit-route-and-rejected-non-seller-ro | P3 | open | Next Steps | - Added seller-only RBAC guard to Souq KYC submit route and rejected non-seller roles with 403. | Doc-only |
| typecheck-lint-not-run-this-session-pending-next-steps-doc-only | P3 | open | Next Steps | \| Typecheck/Lint \| Not run this session \| ⏳ Pending \| | Doc-only |
| lint-cleanup-remove-console-any-unused-vars-across-issue-tracker-app-api-issues- | P3 | open | Next Steps | - Lint cleanup: remove console/any/unused vars across issue-tracker, app/api/issues/route.ts, and app/marketplace/page.tsx; re-run `pnpm lint`. | app/api/issues/route.ts |
| gates-pnpm-typecheck-50-ts-errors-pnpm-lint-135-errors-pending-fixes-next-steps- | P3 | open | Next Steps | \| Gates \| `pnpm typecheck` ❌ (50+ TS errors); `pnpm lint` ❌ (135 errors) \| ⏳ Pending fixes \| | Doc-only |
| re-ran-pnpm-vitest-tests-unit-api-souq-seller-central-kyc-submit-test-ts-14-pass | P3 | open | Next Steps | - Re-ran `pnpm vitest tests/unit/api/souq/seller-central/kyc-submit.test.ts` (14 passing, 18:40:09+03:00) to confirm stricter expectations. | tests/unit/api/souq/seller-central/kyc-submit.test.ts |
| rbac-119-352-routes-34-bugs-doc-only | P3 | open | Bugs | - [ ] RBAC: 119/352 routes (34%) | Doc-only |
| json-parse-43-routes-remaining-bugs-doc-only | P3 | open | Bugs | - [ ] JSON-PARSE: 43 routes remaining | Doc-only |
| module-test-files-api-routes-coverage-gap-priority-missing-tests-doc-only | P3 | open | Missing Tests | \| Module \| Test Files \| API Routes \| Coverage \| Gap \| Priority \| | Doc-only |
| root-cause-missing-required-env-vars-in-production-validation-bugs-doc-only | P3 | open | Bugs | **Root Cause:** Missing required env vars in production validation. | Doc-only |
| app-api-work-orders-route-ts-needs-review-should-require-auth-bugs-app-api-work- | P3 | open | Bugs | \| `app/api/work-orders/route.ts` \| 🔴 Needs review - should require auth \| | app/api/work-orders/route.ts |
| app-api-tenants-route-ts-needs-review-should-require-auth-logic-errors-app-api-t | P3 | open | Logic Errors | \| `app/api/tenants/route.ts` \| 🔴 Needs review - should require auth \| | app/api/tenants/route.ts |
| app-api-properties-route-ts-needs-review-should-require-auth-bugs-app-api-proper | P3 | open | Bugs | \| `app/api/properties/route.ts` \| 🔴 Needs review - should require auth \| | app/api/properties/route.ts |
| missing-imports-added-createerrorresponse-zodvalidationerror-bugs-doc-only | P3 | open | Bugs | \| Missing imports \| Added `createErrorResponse`, `zodValidationError` \| | Doc-only |
| module-routes-tests-gap-priority-missing-tests-doc-only | P3 | open | Missing Tests | \| Module \| Routes \| Tests \| Gap \| Priority \| | Doc-only |
| area-routes-verified-missing-scope-notes-logic-errors-doc-only | P3 | open | Logic Errors | \| Area \| Routes Verified \| Missing Scope \| Notes \| | Doc-only |
| status-all-informational-comments-no-actionable-todos-in-api-routes-bugs-doc-onl | P3 | open | Bugs | **Status**: All informational comments, no actionable TODOs in API routes. | Doc-only |
| todo-fixme-in-api-0-clean-none-needed-bugs-doc-only | P3 | open | Bugs | \| TODO/FIXME in API \| 0 \| ✅ Clean \| None needed \| | Doc-only |
| new-issue-tests-pending-to-be-added-missing-tests-doc-only | P3 | open | Missing Tests | \| New Issue Tests \| Pending \| — \| To be added \| | Doc-only |
| located-master-pending-report-this-file-and-avoided-duplicates-bugs-doc-only | P3 | open | Bugs | - Located Master Pending Report (this file) and avoided duplicates. | Doc-only |
| p3-configure-otp-env-var-or-disable-bypass-5m-needs-owner-action-next-steps-doc- | P3 | open | Next Steps | \| P3 \| Configure OTP env var or disable bypass \| 5m \| Needs owner action \| | Doc-only |
| todo-fixme-in-api-0-clean-bugs-doc-only | P3 | open | Bugs | \| TODO/FIXME in API \| 0 \| ✅ \| Clean \| | Doc-only |
| todo-fixme-in-api-0-clean-codebase-bugs-doc-only | P3 | open | Bugs | \| TODO/FIXME in API \| 0 \| ✅ \| Clean codebase \| | Doc-only |
| todo-fixme-api-0-clean-bugs-doc-only | P3 | open | Bugs | \| **TODO/FIXME (API)** \| 0 \| ✅ Clean \| | Doc-only |
| priority-module-gap-effort-recommendation-bugs-doc-only | P3 | open | Bugs | \| Priority \| Module \| Gap \| Effort \| Recommendation \| | Doc-only |
| tenant-rate-limit-audit-pending-same-16-rate-limit-gaps-flagged-in-prior-session | P3 | open | Logic Errors | \| Tenant/rate-limit audit \| 🔶 Pending \| Same 16 rate-limit gaps flagged in prior session (see enhancements) \| | Doc-only |
| eslint-errors-not-re-run-last-recorded-0-pending-verify-in-next-pass-bugs-doc-on | P3 | open | Bugs | \| **ESLint Errors** \| Not re-run (last recorded 0) \| ℹ️ Pending \| Verify in next pass \| | Doc-only |
| missing-tests-missing-tests-doc-only | P3 | open | Missing Tests | - **Missing tests** | Doc-only |
| missing-tracked-model-caused-module-not-found-for-issue-apis-build-breaker-keep- | P3 | open | Bugs | \| Missing tracked model caused module-not-found for Issue APIs \| Build breaker \| Keep Issue/IssueEvent models co-located and enforced via import check script in CI (`scripts/verify-api.ts` or new guar | scripts/verify-api.ts |
| id-module-routes-tests-gap-priority-missing-tests-doc-only | P3 | open | Missing Tests | \| ID \| Module \| Routes \| Tests \| Gap \| Priority \| | Doc-only |
| total-pending-10-bugs-doc-only | P3 | open | Bugs | \| Total Pending \| 10 \| | Doc-only |
| total-open-9-was-8-bugs-doc-only | P3 | open | Bugs | \| Total Open \| 9 (was 8) \| | Doc-only |
| pending-9-8-1-bugs-doc-only | P3 | open | Bugs | \| Pending \| 9 \| 8 \| -1 \| | Doc-only |
| remaining-open-items-11-bugs-doc-only | P3 | open | Bugs | **Remaining Open Items (11):** | Doc-only |
| total-open-13-11-2-bugs-doc-only | P3 | open | Bugs | \| Total Open \| 13 \| 11 \| -2 ✅ \| | Doc-only |
| remaining-open-items-10-bugs-doc-only | P3 | open | Bugs | **Remaining Open Items (10):** | Doc-only |
| total-open-13-10-3-bugs-doc-only | P3 | open | Bugs | \| Total Open \| 13 \| 10 \| -3 ✅ \| | Doc-only |
| code-quality-verified-0-console-log-0-todo-fixme-all-dangerouslysetinnerhtml-saf | P3 | open | Bugs | - Code quality verified: 0 console.log, 0 TODO/FIXME, all dangerouslySetInnerHTML safe | Doc-only |
| 3-missing-lean-10-read-only-queries-performance-optimization-efficiency-doc-only | P3 | open | Efficiency | 3. **Missing .lean()** (10+ read-only queries) - Performance optimization | Doc-only |
| stats-get-api-issues-stats-200-totalopen-12-healthscore-94-bugs-doc-only | P3 | open | Bugs | **Stats:** GET /api/issues/stats → 200 (totalOpen=12, healthScore=94) | Doc-only |
| start-api-server-for-db-import-bugs-doc-only | P3 | open | Bugs | - [ ] Start API server for DB import | Doc-only |
| new-issues-added-to-mongodb-backlog-extraction-7-open-items-bugs-doc-only | P3 | open | Bugs | **🆕 NEW ISSUES ADDED TO MONGODB (Backlog Extraction - 7 Open Items):** | Doc-only |
| root-cause-missing-orgid-filters-on-crmlead-and-crmactivity-operations-logic-err | P3 | open | Logic Errors | - **Root Cause:** Missing `orgId` filters on CrmLead and CrmActivity operations | Doc-only |
| pending-user-action-bugs-doc-only | P3 | open | Bugs | **⚠️ Pending User Action:** | Doc-only |
| 3-pr-creation-open-pr-for-feat-superadmin-branding-main-bugs-doc-only | P3 | open | Bugs | 3. PR creation: Open PR for `feat/superadmin-branding` → `main` | Doc-only |
| multi-select-checkboxes-with-counts-e-g-open-12-bugs-doc-only | P3 | open | Bugs | - Multi-select checkboxes with counts (e.g., "Open (12)") | Doc-only |
| missing-components-from-concurrent-agents-bugs-doc-only | P3 | open | Bugs | **Missing Components (from concurrent agents):** | Doc-only |
| open-prs-0-bugs-doc-only | P3 | open | Bugs | \| Open PRs \| 0 ✅ \| | Doc-only |
| 3-remaining-open-items-confirmed-bugs-doc-only | P3 | open | Bugs | **3. Remaining Open Items (Confirmed):** | Doc-only |
| id-area-evidence-gap-bugs-doc-only | P3 | open | Bugs | \| ID \| Area \| Evidence \| Gap \| | Doc-only |
| feature-001 | P3 | open | Bugs | - [ ] FEATURE-001: Decide SSE vs WebSocket per ADR-001 | Doc-only |
| agent-github-copilot-vs-code-pending-items-review-bugs-doc-only | P3 | open | Bugs | **Agent:** GitHub Copilot (VS Code) - Pending Items Review | Doc-only |
| open-0-items-bugs-doc-only | P3 | open | Bugs | - 🔴 Open: 0 items | Doc-only |
| open-0-bugs-doc-only | P3 | open | Bugs | \| 🔴 Open \| **0** \| | Doc-only |
| todo-fixme-inventory-17-items-bugs-doc-only | P3 | open | Bugs | **TODO/FIXME Inventory (17 items):** | Doc-only |
| todos-documented-17-items-bugs-doc-only | P3 | open | Bugs | \| TODOs documented \| 17 items \| | Doc-only |
| redis-not-configured-missing-redis-url-redis-key-in-ci-add-ci-secrets-for-redis- | P3 | open | Bugs | \| Redis Not Configured \| Missing REDIS_URL/REDIS_KEY in CI \| Add CI secrets for Redis \| | Doc-only |
| missing-i18n-keys-218-translation-keys-missing-in-en-json-ar-json-add-translatio | P3 | open | Bugs | \| Missing i18n Keys \| 218 translation keys missing in en.json/ar.json \| Add translations \| | en.json/ar.js |
| 2b6012da7-missing-i18n-keys-218-added-bugs-doc-only | P3 | open | Bugs | \| `2b6012da7` \| Missing i18n keys (218) \| ✅ Added \| | Doc-only |
| vercel-awaiting-needs-project-access-bugs-doc-only | P3 | open | Bugs | \| ⏳ Vercel \| AWAITING \| Needs project access \| | Doc-only |
| address-remaining-pr-review-comments-design-tokens-css-question-next-steps-doc-o | P3 | open | Next Steps | - [ ] Address remaining PR review comments (design-tokens.css question) | Doc-only |
| db-collection-calls-logged-37-calls-in-25-api-files-bypass-mongoose-estimated-24 | P3 | open | Bugs | \| db.collection() calls \| 📋 LOGGED \| 37 calls in 25 API files bypass Mongoose. Estimated 24h. Needs delegation \| | Doc-only |
| zatca-seller-address-pending-user-action-bugs-doc-only | P3 | open | Bugs | \| \| ZATCA_SELLER_ADDRESS \| ⏳ Pending (user action) \| | Doc-only |
| zatca-vat-number-pending-user-action-bugs-doc-only | P3 | open | Bugs | \| \| ZATCA_VAT_NUMBER \| ⏳ Pending (user action) \| | Doc-only |
| zatca-seller-name-pending-user-action-bugs-doc-only | P3 | open | Bugs | \| \| ZATCA_SELLER_NAME \| ⏳ Pending (user action) \| | Doc-only |
| zatca-zatca-api-key-pending-user-action-bugs-doc-only | P3 | open | Bugs | \| **ZATCA** \| ZATCA_API_KEY \| ⏳ Pending (user action) \| | Doc-only |
| zatca-pending-user-configuration-bugs-doc-only | P3 | open | Bugs | \| **ZATCA** \| ⏳ Pending user configuration \| | Doc-only |
| open-prs-none-gh-pr-list-state-open-bugs-doc-only | P3 | open | Bugs | \| Open PRs \| ✅ None \| `gh pr list --state open` \| | Doc-only |
| BUG-TS-VITEST-CONFIG-LOCAL | P3 | open | Bugs | TypeScript errors in vitest.config.ts (poolOptions.threads type mismatch) | vitest.config.ts |
| TEST-0006 | P3 | in_progress | Missing Tests | Add integration tests for 12 list components across roles | tests/integration/list-components.integration.test.ts |
| update-pending-master-in-progress-adding-v65-22-entry-logic-errors-v65-22 | P3 | in_progress | Bugs | \| Update PENDING_MASTER \| Ã¢Å“â€¦ In Progress \| Adding v65.22 entry \| | v65.22 |
| rate-limited-routes-139-352-39-in-progress-44-this-branch-next-steps-docs-pending-master-md-18263 | P3 | in_progress | Next Steps | \| **Rate-Limited Routes** \| 139/352 (39%) \| 🟡 In Progress \| +44 this branch \| | docs/PENDING_MASTER.md:18263 |
| routes-with-rate-limiting-147-352-42-in-progress-next-steps-docs-pending-master-md-17867 | P3 | in_progress | Next Steps | \| **Routes With Rate Limiting** \| 147/352 (42%) \| 🟡 In Progress \| — \| | docs/PENDING_MASTER.md:17867 |
| in-progress-smoke-suite-rerun-pnpm-test-e2e-project-smoke-attempts-timed-out-copilot-strict-specs-still-failing-in-full-pnpm-test-run-see-co | P3 | in_progress | Next Steps | In Progress: Smoke suite rerun (pnpm test:e2e -- --project smoke) — attempts timed out; Copilot STRICT specs still failing in full `pnpm test` run (see console for copilot.spec failures). | copilot.spec |
| scope-souq-kyc-rbac-tests-fm-budgets-unit-scope-typecheck-lint-triage-started-in-progress-next-steps-docs-pending-master-md-10722 | P3 | in_progress | Next Steps | \| Scope \| Souq KYC RBAC+tests; FM budgets unit scope; typecheck/lint triage started \| ✅ In progress \| | docs/PENDING_MASTER.md:10722 |
| scope-souq-kyc-submit-tests-fm-finance-expenses-tests-in-progress-next-steps-docs-pending-master-md-10635 | P3 | in_progress | Next Steps | \| Scope \| Souq KYC submit tests; FM finance expenses tests \| ✅ In progress \| | docs/PENDING_MASTER.md:10635 |
| json-parse-43-routes-unprotected-request-json-calls-p0-in-progress-bugs-request-json | P3 | in_progress | Bugs | \| JSON-PARSE \| 43 routes \| Unprotected `request.json()` calls \| 🔴 P0 \| 🔄 In Progress \| | request.json |
| latest-commit-tbd-in-progress-23-test-files-next-steps-docs-pending-master-md-10030 | P3 | in_progress | Next Steps | \| **Latest Commit** \| TBD \| ✅ In Progress \| +23 test files \| | docs/PENDING_MASTER.md:10030 |
| components-fm-workordersview-tsx-refactoring-in-progress-by-other-agent-efficiency-components-fm-workordersview-tsx | P3 | in_progress | Efficiency | `components/fm/WorkOrdersView.tsx` (refactoring in progress by other agent) | components/fm/WorkOrdersView.tsx |
| context-feat-superadmin-branding-commit-pending-pr-558-in-progress-missing-tests-docs-pending-master-md-4214 | P3 | in_progress | Missing Tests | **Context:** feat/superadmin-branding \| Commit pending \| PR #558 (in progress) | docs/PENDING_MASTER.md:4214 |
| p3-souq-products-p3-in-progress-m-souq-products-migration-missing-tests-docs-pending-master-md-3886 | P3 | in_progress | Missing Tests | \| P3-SOUQ-PRODUCTS \| P3 \| In Progress \| M \| Souq Products migration \| | docs/PENDING_MASTER.md:3886 |
| p3-aqar-filters-p3-in-progress-m-aqar-searchfilters-refactor-efficiency-docs-pending-master-md-3885 | P3 | in_progress | Efficiency | \| P3-AQAR-FILTERS \| P3 \| In Progress \| M \| Aqar SearchFilters refactor \| | docs/PENDING_MASTER.md:3885 |
| rate-limited-routes-139-352-39-in-progress-44-this-branch-bugs-doc-only | P3 | in_progress | Bugs | \| **Rate-Limited Routes** \| 139/352 (39%) \| 🟡 In Progress \| +44 this branch \| | Doc-only |
| routes-with-rate-limiting-147-352-42-in-progress-bugs-doc-only | P3 | in_progress | Bugs | \| **Routes With Rate Limiting** \| 147/352 (42%) \| 🟡 In Progress \| — \| | Doc-only |
| latest-commit-tbd-in-progress-23-test-files-missing-tests-doc-only | P3 | in_progress | Missing Tests | \| **Latest Commit** \| TBD \| ✅ In Progress \| +23 test files \| | Doc-only |
| update-pending-master-in-progress-adding-v65-22-entry-bugs-doc-only | P3 | in_progress | Bugs | \| Update PENDING_MASTER \| ✅ In Progress \| Adding v65.22 entry \| | Doc-only |
| in-progress-bugs-doc-only | P3 | in_progress | Bugs | **🟠 In Progress:** | Doc-only |
| p3-souq-products-p3-in-progress-m-souq-products-migration-bugs-doc-only | P3 | in_progress | Bugs | \| P3-SOUQ-PRODUCTS \| P3 \| In Progress \| M \| Souq Products migration \| | Doc-only |
| p3-aqar-filters-p3-in-progress-m-aqar-searchfilters-refactor-efficiency-doc-only | P3 | in_progress | Efficiency | \| P3-AQAR-FILTERS \| P3 \| In Progress \| M \| Aqar SearchFilters refactor \| | Doc-only |
| REFAC-0002 | P3 | in_progress | Refactor | Migrate Souq Products list to DataTableStandard with filters | components/marketplace/ProductsList.tsx |
| REFAC-0001 | P3 | in_progress | Refactor | Refactor Aqar SearchFilters to standard filter components | components/aqar/SearchFilters.tsx |
| production-readiness-baseline-99-8-blocked-pending-billing-history-fix-rerun-next-steps-99-8 | P3 | blocked | Next Steps | \| **Production Readiness** \| Baseline 99.8% \| 🔶 Blocked \| Pending billing/history fix + rerun \| | 99.8 |
| none-db-sync-blocked-create-billing-history-missing-org-returns-401-when-mongo-available-next-steps-docs-pending-master-md-8506 | P3 | blocked | Next Steps | None (DB sync blocked; create `billing-history-missing-org-returns-401` when Mongo available). | docs/PENDING_MASTER.md:8506 |
| db-sync-pending-mongodb-offline-blocked-missing-tests-docs-pending-master-md-4397 | P3 | blocked | Missing Tests | ⚠️ DB sync pending (MongoDB offline - blocked) | docs/PENDING_MASTER.md:4397 |
| github-ci-blocked-blocked-increase-spending-limit-or-resolve-account-payments-missing-tests-docs-pending-master-md-1385 | P3 | blocked | Missing Tests | \| GitHub CI blocked \| ❌ Blocked \| Increase spending limit or resolve account payments \| | docs/PENDING_MASTER.md:1385 |
| build-lint-blocked-pnpm-typecheck-and-pnpm-lint-failing-see-below-bugs-doc-only | P3 | blocked | Bugs | \| **Build/Lint** \| ⏳ Blocked \| `pnpm typecheck` and `pnpm lint` failing (see below) \| | Doc-only |
| production-readiness-baseline-99-8-blocked-pending-billing-history-fix-rerun-bug | P3 | blocked | Bugs | \| **Production Readiness** \| Baseline 99.8% \| 🔶 Blocked \| Pending billing/history fix + rerun \| | Doc-only |
| db-import-blocked-dev-server-port-conflicts-prevented-import-execution-bugs-doc- | P3 | blocked | Bugs | - ⏳ **DB Import:** BLOCKED (dev server port conflicts prevented import execution) | Doc-only |
| pr-556 | P3 | blocked | Bugs | - **PR-556-BLOCKED** — PR #556 (Add Vercel Speed Insights) mergeable but blocked by BUILD-TS-001 | Doc-only |
| blocked-failures-bugs-doc-only | P3 | blocked | Bugs | **🔴 Blocked / Failures:** | Doc-only |
| db-blocked-atlas-ip-bugs-doc-only | P3 | blocked | Bugs | - DB: 🔴 BLOCKED (Atlas IP) | Doc-only |
| build-blocked-vercel-bugs-doc-only | P3 | blocked | Bugs | - Build: 🔴 BLOCKED (Vercel) | Doc-only |
| blocked-bugs-doc-only | P3 | blocked | Bugs | **🔴 Blocked:** | Doc-only |
| order-id-action-effort-blocked-bugs-doc-only | P3 | blocked | Bugs | \| Order \| ID \| Action \| Effort \| Blocked \| | Doc-only |
| github-ci-blocked-blocked-increase-spending-limit-or-resolve-account-payments-bu | P3 | blocked | Bugs | \| GitHub CI blocked \| ❌ Blocked \| Increase spending limit or resolve account payments \| | Doc-only |
| BUG-005 | unspecified | open | Bugs | Aqar listing userId fallback | app/api/aqar/listings/route.ts |
| BUG-003 | unspecified | open | Bugs | createWorkOrder userId as org | lib/graphql/index.ts |
| BUG-002 | unspecified | open | Bugs | Bugs | lib/graphql/index.ts |
| EFF-002 | unspecified | open | Bugs | Efficiency | app/privacy/page.ts |
| LOGIC-123 | unspecified | open | logic | Aqar writes | docs/PENDING_MASTER.md |
| LOGIC-122 | unspecified | open | logic | Souq review flow | docs/PENDING_MASTER.md |
| LOGIC-121 | unspecified | open | logic | GraphQL read resolvers | docs/PENDING_MASTER.md |
| BUG-1707 | unspecified | open | Bugs | app/api/aqar/favorites/route.ts:61-138 | app/api/aqar/favorites/route.ts |
| BUG-1706 | unspecified | open | Bugs | app/api/aqar/packages/route.ts:102-124 | app/api/aqar/packages/route.ts |
| BUG-1705 | unspecified | open | Bugs | app/api/aqar/listings/route.ts:99-138 | app/api/aqar/listings/route.ts |
| BUG-1704 | unspecified | open | Bugs | app/api/souq/reviews/route.ts:61-108 | app/api/souq/reviews/route.ts |
| BUG-1703 | unspecified | open | Bugs | lib/graphql/index.ts:936-1052 | lib/graphql/index.ts |
| BUG-1701 | unspecified | open | Bugs | lib/graphql/index.ts:769-801 | lib/graphql/index.ts |
| LOGIC-125 | unspecified | open | logic | app/api/upload/verify-metadata/route.ts:46-119 | app/api/upload/verify-metadata/route.ts |
| LOGIC-124 | unspecified | open | logic | app/api/upload/scan-status/route.ts:83-210 | app/api/upload/scan-status/route.ts |
| BUG-1710 | unspecified | open | Bugs | app/api/upload/scan-status/route.ts:106-209 | app/api/upload/scan-status/route.ts |
| BUG-1709 | unspecified | open | Bugs | app/api/upload/scan/route.ts:44-92 | app/api/upload/scan/route.ts |
| BUG-1708 | unspecified | open | Bugs | app/api/upload/verify-metadata/route.ts:37-119 | app/api/upload/verify-metadata/route.ts |
| playwright-e2e-bug-docs-pending-master-md | unspecified | open | Bugs | Playwright e2e | docs/PENDING_MASTER.md |
| taqnyatsendername-bug-docs-pending-master-md | unspecified | open | Bugs | TAQNYATSENDERNAME | docs/PENDING_MASTER.md |
| d-1-bug-docs-pending-master-md | unspecified | open | Bugs | D.1 | docs/PENDING_MASTER.md |
| medium-bug-docs-pending-master-md | unspecified | open | Bugs | 🟡 MEDIUM | docs/PENDING_MASTER.md |
| user-actions-bug-docs-pending-master-md | unspecified | open | Bugs | User Actions | docs/PENDING_MASTER.md |
| bug-docs-pending-master-md | unspecified | open | Bugs | ⏳ | docs/PENDING_MASTER.md |
| high-bug-docs-pending-master-md | unspecified | open | Bugs | 🔴 HIGH | docs/PENDING_MASTER.md |
| total-open-issues-bug-docs-pending-master-md | unspecified | open | Bugs | Total Open Issues | docs/PENDING_MASTER.md |
| tests-api-hr-employees-tests-docs-pending-master-md | unspecified | open | tests | tests/api/hr/employees/ | docs/PENDING_MASTER.md |
| pr-541-bug-docs-pending-master-md | unspecified | open | Bugs | PR #541 | docs/PENDING_MASTER.md |
| bugs-logic-bug-docs-pending-master-md | unspecified | open | Bugs | Bugs/Logic | docs/PENDING_MASTER.md |
| subscriptionseatservice-ts-bug-subscriptionseatservice-ts | unspecified | open | Bugs | subscriptionSeatService.ts | subscriptionSeatService.ts |
| onboardingkpi-service-ts-bug-onboardingkpi-service-ts | unspecified | open | Bugs | onboardingKpi.service.ts | onboardingKpi.service.ts |
| onboardingentities-ts-bug-onboardingentities-ts | unspecified | open | Bugs | onboardingEntities.ts | onboardingEntities.ts |
| provision-ts-bug-provision-ts | unspecified | open | Bugs | provision.ts | provision.ts |
| decimal-ts-bug-decimal-ts | unspecified | open | Bugs | decimal.ts | decimal.ts |
| recommendation-ts-bug-recommendation-ts | unspecified | open | Bugs | recommendation.ts | recommendation.ts |
| pricinginsights-ts-bug-pricinginsights-ts | unspecified | open | Bugs | pricingInsights.ts | pricingInsights.ts |
| lint-bug-docs-pending-master-md | unspecified | open | Bugs | Lint | docs/PENDING_MASTER.md |
| bugs-logic-bug-app-api-aqar-favorites-route-ts | unspecified | open | Bugs | Bugs/Logic | app/api/aqar/favorites/route.ts |
| bugs-logic-bug-app-api-aqar-packages-route-ts | unspecified | open | Bugs | Bugs/Logic | app/api/aqar/packages/route.ts |
| tests-tests-docs-pending-master-md | unspecified | open | tests | Tests | docs/PENDING_MASTER.md |
| uncommitted-changes-bug-docs-pending-master-md | unspecified | open | Bugs | Uncommitted Changes | docs/PENDING_MASTER.md |
| bugs-logic-bug-app-api-aqar-listings-route-ts | unspecified | open | Bugs | Bugs/Logic | app/api/aqar/listings/route.ts |
| bugs-logic-bug-app-api-souq-reviews-route-ts | unspecified | open | Bugs | Bugs/Logic | app/api/souq/reviews/route.ts |
| bugs-logic-bug-lib-graphql-index-ts | unspecified | open | Bugs | Bugs/Logic | lib/graphql/index.ts |
| ux-error-boundaries-bug-docs-pending-master-md | unspecified | open | Bugs | UX - Error Boundaries | docs/PENDING_MASTER.md |
| open-draft-prs-bug-docs-pending-master-md | unspecified | open | Bugs | Open Draft PRs | docs/PENDING_MASTER.md |
| routes-needing-rate-limiting-bug-docs-pending-master-md | unspecified | open | Bugs | Routes Needing Rate Limiting | docs/PENDING_MASTER.md |
| open-prs-stale-bug-docs-pending-master-md | unspecified | open | Bugs | Open PRs (Stale) | docs/PENDING_MASTER.md |
| open-prs-stale-drafts-bug-docs-pending-master-md | unspecified | open | Bugs | Open PRs (Stale Drafts) | docs/PENDING_MASTER.md |
| SEC-0003 | unspecified | open | Security | Security | docs/PENDING_MASTER.md |
| marketplace-souq-bug-docs-pending-master-md | unspecified | open | Bugs | Marketplace/Souq | docs/PENDING_MASTER.md |
| auth-api-bug-docs-pending-master-md | unspecified | open | Bugs | Auth/API | docs/PENDING_MASTER.md |
| payments-tap-bug-lib-finance-tap-payments-ts | unspecified | open | Bugs | Payments/TAP | lib/finance/tap-payments.ts |
| json-parse-bug-request-js | unspecified | open | Bugs | JSON-PARSE | request.js |
| logic-bug-docs-pending-master-md | unspecified | open | Bugs | Logic | docs/PENDING_MASTER.md |
| bugs-bug-docs-pending-master-md | unspecified | open | Bugs | Bugs | docs/PENDING_MASTER.md |
| typecheck-lint-tests-tests-docs-pending-master-md | unspecified | open | tests | Typecheck/Lint/Tests | docs/PENDING_MASTER.md |
| typecheck-lint-bug-docs-pending-master-md | unspecified | open | Bugs | Typecheck/Lint | docs/PENDING_MASTER.md |
| gates-bug-docs-pending-master-md | unspecified | open | Bugs | Gates | docs/PENDING_MASTER.md |
| new-issue-tests-tests-docs-pending-master-md | unspecified | open | tests | New Issue Tests | docs/PENDING_MASTER.md |
| app-api-superadmin-logout-route-ts-bug-app-api-superadmin-logout-route-ts | unspecified | open | Bugs | app/api/superadmin/logout/route.ts | app/api/superadmin/logout/route.ts |
| app-api-healthcheck-route-ts-bug-app-api-healthcheck-route-ts | unspecified | open | Bugs | app/api/healthcheck/route.ts | app/api/healthcheck/route.ts |
| app-api-payments-callback-route-ts-bug-app-api-payments-callback-route-ts | unspecified | open | Bugs | app/api/payments/callback/route.ts | app/api/payments/callback/route.ts |
| tenant-rate-limit-audit-bug-docs-pending-master-md | unspecified | open | Bugs | Tenant/rate-limit audit | docs/PENDING_MASTER.md |
| production-readiness-bug-docs-pending-master-md | unspecified | open | Bugs | Production Readiness | docs/PENDING_MASTER.md |
| eslint-errors-bug-docs-pending-master-md | unspecified | open | Bugs | ESLint Errors | docs/PENDING_MASTER.md |
| latest-commit-tests-docs-pending-master-md | unspecified | open | tests | Latest Commit | docs/PENDING_MASTER.md |
| branch-bug-docs-pending-master-md | unspecified | open | Bugs | Branch | docs/PENDING_MASTER.md |
| total-pending-bug-docs-pending-master-md | unspecified | open | Bugs | Total Pending | docs/PENDING_MASTER.md |
| pending-bug-docs-pending-master-md | unspecified | open | Bugs | Pending | docs/PENDING_MASTER.md |
| total-open-bug-docs-pending-master-md | unspecified | open | Bugs | Total Open | docs/PENDING_MASTER.md |
| TEST-TEST-005 | unspecified | open | tests | TEST-005 — Aqar test coverage (5 new files pending commit) | docs/PENDING_MASTER.md |
| dependabot-alerts-bug-docs-pending-master-md | unspecified | open | Bugs | Dependabot Alerts | docs/PENDING_MASTER.md |
| infra-sentry-bug-docs-pending-master-md | unspecified | open | Bugs | INFRA-SENTRY | docs/PENDING_MASTER.md |
| backlog-bug-docs-pending-master-md | unspecified | open | Bugs | Backlog | docs/PENDING_MASTER.md |
| open-bug-docs-pending-master-md | unspecified | open | Bugs | 🔴 Open | docs/PENDING_MASTER.md |
| ci-full-suite-bug-docs-pending-master-md | unspecified | open | Bugs | CI Full Suite | docs/PENDING_MASTER.md |
| zatcaselleraddress-bug-docs-pending-master-md | unspecified | open | Bugs | ZATCASELLERADDRESS | docs/PENDING_MASTER.md |
| zatcavatnumber-bug-docs-pending-master-md | unspecified | open | Bugs | ZATCAVATNUMBER | docs/PENDING_MASTER.md |
| zatcasellername-bug-docs-pending-master-md | unspecified | open | Bugs | ZATCASELLERNAME | docs/PENDING_MASTER.md |
| zatca-bug-docs-pending-master-md | unspecified | open | Bugs | ZATCA | docs/PENDING_MASTER.md |
| open-prs-bug-docs-pending-master-md | unspecified | open | Bugs | Open PRs | docs/PENDING_MASTER.md |
| pr-611-bug-docs-pending-master-md | unspecified | open | Bugs | PR #611 | docs/PENDING_MASTER.md |
| sa-impersonate-001-bug-docs-pending-master-md | unspecified | open | Bugs | SA-IMPERSONATE-001 | docs/PENDING_MASTER.md |

## Resolved Issues (Count Only)
Total resolved/closed/wont_fix: 22
