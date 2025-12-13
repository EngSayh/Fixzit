# Fixzit Phase 2/3 Backlog Audit

**Generated**: 2025-12-13T22:54:17+03:00  
**Branch**: `docs/pending-v60` | **Commit**: `a7b722d61`  
**Status**: Phase 1 MVP ⚠ Verification pending (see validation) | Phase 2/3 Backlog Documented  
**Tests**: Superadmin + CRM suites 38/38 green; full suite pending (pnpm vitest run --reporter=dot timed out: MongoMemoryServer port collision)

---

## ✅ Completed Items (SSOT snapshot)

| Key | Title | Priority | Status | Evidence |
|-----|-------|----------|--------|----------|
| `EFF-001` | Add enforceRateLimit to Issues API routes | P1 | ✅ Complete | All 4 routes: GET/POST/stats/import/detail |
| `create-superadmin-route-tests` | Create Superadmin route tests | P2 | ✅ Complete | 14 tests across 3 files |

## ❌ False Positives (Investigated & Closed)

| Key | Title | Priority | Resolution |
|-----|-------|----------|------------|
| `BUG-010` | PM routes missing tenant filter | P2 | Routes have `orgId` filter; grep missed camelCase |
| `LOGIC-001` | Assistant query without org_id | P2 | WorkOrder.find uses `orgId: user.orgId` |

## 🔄 Pending Items (Phase 2/3)

| Key | Title | Priority | Status | Notes |
|-----|-------|----------|--------|-------|
| `EFF-002` | Add enforceRateLimit to superadmin routes | P1 | Pending | Login uses `isRateLimited` only; no `enforceRateLimit` hook |
| `EFF-004` | Add rate limiting to PM routes | P2 | Pending | 30m |
| `TEST-002` | HR module test coverage (14%→50%) | P2 | Pending | 4h |
| `TEST-001` | Souq test coverage (35%→50%) | P3 | Pending | 22h |
| `BUG-011` | Add .catch() to notification .then() chains | P3 | Pending | 1h |
| `create-crm-route-tests` | Create CRM route tests | P2 | Pending | Current crm.test.ts only asserts role sets; no route coverage |

---

## Executive Summary

- Tests: Superadmin + CRM suites 38/38 passing; full `pnpm vitest run --reporter=dot` timed out at 120s (MongoMemoryServer port collision).  
- Rate limiting: Issues API complete; superadmin login still needs `enforceRateLimit` to close P1.  
- CRM route tests remain outstanding; `tests/unit/api/crm/crm.test.ts` does not exercise handlers.

---

## 🚨 Critical & High Priority (P0 / P1)

### P1-001: Add Rate Limiting to Superadmin Routes
| Field | Value |
|-------|-------|
| **ID** | `add-rate-limiting-to-superadmin-routes` |
| **Category** | security |
| **Module** | superadmin |
| **Status** | ⚠ Pending (login missing enforceRateLimit) |
| **Effort** | 30 minutes |
| **Files** | `app/api/superadmin/login/route.ts`, `app/api/superadmin/session/route.ts:15`, `app/api/superadmin/logout/route.ts:15` |
| **Notes** | Session (60 req/min) and logout (10 req/min) call `enforceRateLimit`; login still relies on `isRateLimited` helper only. |

### P1-002: Add Rate Limiting to Issues API Routes
| Field | Value |
|-------|-------|
| **ID** | `add-rate-limiting-to-issues-api-routes` |
| **Category** | security |
| **Module** | issues-api |
| **Status** | ✅ COMPLETE |
| **Effort** | 30 minutes |
| **Files** | `app/api/issues/route.ts:205,303`, `app/api/issues/[id]/route.ts:159,321`, `app/api/issues/import/route.ts:172`, `app/api/issues/stats/route.ts:47` |
| **Notes** | All methods rate-limited: POST (30 req/min), PATCH (60 req/min), DELETE (10 req/min), import (5 req/min), stats (30 req/min). |

---

## 🧪 Missing Tests & Coverage (P2)

### P2-001: Create Superadmin Route Tests
| Field | Value |
|-------|-------|
| **ID** | `create-superadmin-route-tests` |
| **Category** | missing_test |
| **Module** | superadmin |
| **Status** | ✅ IMPLEMENTED |
| **Effort** | 2 hours |
| **Files** | `tests/unit/api/superadmin/login.route.test.ts`, `tests/unit/api/superadmin/session.route.test.ts`, `tests/unit/api/superadmin/logout.route.test.ts` |
| **Coverage** | Login, session verification, logout flows |

### P2-002: Create CRM Route Tests
| Field | Value |
|-------|-------|
| **ID** | `create-crm-route-tests` |
| **Category** | missing_test |
| **Module** | crm |
| **Status** | 🔄 PENDING |
| **Effort** | 4 hours |
| **Files** | `tests/unit/api/crm/crm.test.ts` |
| **Coverage** | Current file only asserts role sets and constants; route handlers untested. |

### P2-003: Expand Souq Test Coverage
| Field | Value |
|-------|-------|
| **ID** | `expand-souq-test-coverage` |
| **Category** | missing_test |
| **Module** | souq |
| **Status** | 🔄 PENDING (Phase 3) |
| **Effort** | 22 hours |
| **Current Coverage** | 41% (13/32 route groups) |
| **Target** | 80% route coverage |
| **Routes Needing Tests** | ads, analytics, buybox, fulfillment, repricer, settlements, deals |

---

## 📊 Test Coverage by Module

Coverage snapshot not refreshed in this pass. Outstanding gaps: Souq/Admin/Support route tests, HR coverage expansion, and CRM route handler tests.

---

## 🗂️ Database Schema Updates

### Collections Added/Modified

| Collection | Action | Indexes |
|------------|--------|---------|
| `issues` | Modified | Added `key` (unique), `externalId` (sparse), `sourceHash` |
| `issueevents` | Created | `orgId+key+createdAt`, `issueId`, `type` |

### Sync Status
- **Script**: `scripts/sync-indexes.ts` ✅ Created
- **Manual Instructions**: `docs/ATLAS_INDEX_INSTRUCTIONS.md` ✅ Created
- **Vercel Deploy Hook**: Add `pnpm tsx scripts/sync-indexes.ts` to post-deploy

---

## 📋 Phase 3 Backlog (Deferred)

| ID | Description | Effort | Module |
|----|-------------|--------|--------|
| `expand-souq-test-coverage` | Complete Souq route testing | 22h | souq |
| `create-admin-route-tests` | Admin API route tests | 13h | admin |
| `create-support-route-tests` | Support API route tests | 4h | support |
| `review-empty-catches` | Audit 50 empty catch blocks | 1h | global |

**Total Phase 3 Effort**: ~40 hours

---

## ✅ QA Gate Checklist

- [ ] Tests green (full suite pending; superadmin + CRM suites 38/38 passing)
- [ ] Build 0 TS errors (not rerun)
- [ ] No console/runtime/hydration issues (not rerun)
- [ ] Tenancy filters enforced
- [ ] Branding/RTL verified
- [ ] Rate limiting on all sensitive routes (superadmin login still pending)

---

## Related Documents

- [SSOT_WORKFLOW_GUIDE.md](./SSOT_WORKFLOW_GUIDE.md) - SSOT sync and verification workflow
- [ATLAS_INDEX_INSTRUCTIONS.md](./ATLAS_INDEX_INSTRUCTIONS.md) - MongoDB index creation guide
- [AGENTS.md](../AGENTS.md) - Agent working agreement

**Merge-ready for Fixzit Phase 1 MVP.**
- [x] Issue audit trail (IssueEvent model)
- [x] Database indexes documented

---

**Status**: ⚠ Pending QA; rerun full vitest suite (serial) and add superadmin login rate limit before marking Merge-ready
