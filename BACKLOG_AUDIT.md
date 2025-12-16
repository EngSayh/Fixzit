# BACKLOG Audit Snapshot (2025-12-16 12:08 UTC)
- Source: docs/PENDING_MASTER.md (derived) | branch: main | commit: 9d9e0b9f2
- Open items include sourceRef + evidenceSnippet (<=25 words). Resolved items kept for continuity.

## Open Issues (7)
- SEC-002 (P1, security) — location: app/api/**/route.ts — sourceRef: code-review:MASTER_PENDING_REPORT.md:47-48 — evidence: "50+ database queries detected without explicit tenant scope validation - potential cross-tenant data leaks"
- BUG-001 (P1, bug) — location: app/login/page.tsx:25-30, app/marketplace/page.tsx:45-46, app/error.tsx:26 — sourceRef: code-review:MASTER_PENDING_REPORT.md:53-54 — evidence: "process.env accessed directly in 40+ client components - breaks SSR/hydration, exposes server vars to client"
- PERF-001 (P2, efficiency) — location: issue-tracker/app/api/issues/stats/route.ts:51-181, app/api/aqar/map/route.ts:128 — sourceRef: code-review:MASTER_PENDING_REPORT.md:61-62 — evidence: "20+ Mongoose aggregate operations without .limit() or pagination - potential memory exhaustion"
- TEST-004 (P2, missing_test) — location: app/api/**/route.ts — sourceRef: code-review:MASTER_PENDING_REPORT.md:71-72 — evidence: "Missing JSON.parse error handling in 20+ POST routes (unguarded request.json())"
- TEST-002 (P2, missing_test) — location: tests/api/hr/* — sourceRef: code-review:MASTER_PENDING_REPORT.md:70 — evidence: "14% coverage (1/7 routes) - missing employees CRUD, payroll tests"
- TEST-003 (P2, missing_test) — location: tests/api/finance/* — sourceRef: code-review:MASTER_PENDING_REPORT.md:71 — evidence: "21% coverage (4/19 routes) - missing invoices, payments, billing tests"
- PERF-002 (P3, efficiency) — location: app/api/onboarding/documents/[id]/review/route.ts:107-108 — sourceRef: code-review:MASTER_PENDING_REPORT.md:63-64 — evidence: "Missing .lean() on 10+ read-only Mongoose queries - fetches full Mongoose documents unnecessarily"

## Resolved Items (7)
- SEC-001 — NEXTAUTH_SECRET fallback insufficient — resolved via resolveAuthSecret() | sourceRef: code-review:lib/config/constants.ts:148-218
- SEC-TAP-001 — TAP Payments credentials hardcoded — resolved 2025-12-13
- CONFIG-001 — Configuration validation missing — resolved 2025-12-13
- TEST-SAFE-FETCH — Safe fetch wrapper coverage — resolved 2025-12-13
- EFF-004 — Efficiency improvements in data fetching — resolved 2025-12-13
- REF-002 — Refactoring technical debt — resolved 2025-12-13
- CONFIG-003 — AWS_REGION missing causes production crash — resolved 2025-12-14 (fallbacks added)
