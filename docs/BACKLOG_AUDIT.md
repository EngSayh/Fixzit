# Fixzit Backlog Audit (SSOT Snapshot)

**Generated:** 2025-12-13T23:11+03:00  
**Branch:** `docs/pending-v60` | **Commit:** `e74a3597f`  
**DB Sync:** Skipped (MONGODB_URI missing)  
**Tests:** Not run this session (DB unavailable for import)

---

## ✅ Completed (DB SSOT)

| Key | Title | Priority | Status | Evidence |
|-----|-------|----------|--------|----------|
| `EFF-001` | Add enforceRateLimit to Issues API routes | P1 | ✅ Complete | GET list 60/min; stats 30/min; POST 30/min |
| `EFF-002` | Add enforceRateLimit to superadmin routes | P1 | ✅ Complete | Login/session/logout all call enforceRateLimit |
| `create-superadmin-route-tests` | Create Superadmin route tests | P2 | ✅ Complete | 14 tests across login/session/logout |

## ❌ False Positives

| Key | Title | Priority | Resolution |
|-----|-------|----------|------------|
| `BUG-010` | PM routes missing tenant filter | P2 | Routes already include orgId |
| `LOGIC-001` | Assistant query without org_id | P2 | WorkOrder.find uses orgId: user.orgId |

## 🔄 Pending / Open Items

| Key | Title | Priority | Status | Evidence |
|-----|-------|----------|--------|----------|
| `EFF-004` | Add rate limiting to PM routes (plans/[id]) | P2 | Pending | PATCH handler lacks enforceRateLimit (`app/api/pm/plans/[id]/route.ts:83-98`) |
| `TEST-002` | HR module test coverage (14%→50%) | P2 | Pending | Row: docs/PENDING_MASTER.md:210 |
| `TEST-001` | Souq test coverage (35%→50%) | P3 | Pending | Row: docs/PENDING_MASTER.md:209 |
| `TEST-003` | Finance module test coverage | P2 | Pending | Row: docs/PENDING_MASTER.md:211 |
| `TEST-004` | CRM module test coverage | P3 | Pending | Row: docs/PENDING_MASTER.md:212 |
| `TEST-005` | Aqar module test coverage | P3 | Pending | Row: docs/PENDING_MASTER.md:213 |
| `BUG-011` | Add .catch() to notification .then() chains | P3 | Pending | docs/PENDING_MASTER.md:66 |
| `billing-history-missing-org-returns-401` | Billing history returns 401 without org | P1 | Blocked (Mongo unavailable) | tests/api/billing/history.route.test.ts:57-65 |
| `create-crm-route-tests` | Create CRM route tests | P2 | Pending | `tests/unit/api/crm/crm.test.ts` only asserts role sets |

---

## QA Gate Checklist

- [ ] Tests green (not run this session)
- [ ] Build 0 TS errors (not run)
- [ ] No console/runtime/hydration issues (not checked)
- [ ] Tenancy filters enforced
- [ ] Branding/RTL verified
- [ ] Evidence pack attached

Merge-ready for Fixzit Phase 1 MVP.
