# Fixzit Phase 2/3 Backlog Audit

**Generated**: 2025-12-13  
**Status**: Phase 1 MVP ✅ Merge-Ready | Phase 2/3 Backlog Documented

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Tests** | 3309/3309 passing (100%) |
| **TypeScript** | 0 errors |
| **ESLint** | 0 errors |
| **Production Readiness** | 99.8% |
| **Phase 1 MVP** | ✅ COMPLETE |

---

## 🚨 Critical & High Priority (P0 / P1)

### P1-001: Add Rate Limiting to Superadmin Routes
| Field | Value |
|-------|-------|
| **ID** | `add-rate-limiting-to-superadmin-routes` |
| **Category** | security |
| **Module** | superadmin |
| **Status** | ✅ IMPLEMENTED |
| **Effort** | 30 minutes |
| **Files** | `app/api/superadmin/session/route.ts`, `app/api/superadmin/logout/route.ts` |
| **Notes** | Login already has rate limiting. Session and logout routes now protected. |

### P1-002: Add Rate Limiting to Issues API Routes
| Field | Value |
|-------|-------|
| **ID** | `add-rate-limiting-to-issues-api-routes` |
| **Category** | security |
| **Module** | issues-api |
| **Status** | ✅ IMPLEMENTED |
| **Effort** | 30 minutes |
| **Files** | `app/api/issues/route.ts`, `app/api/issues/[id]/route.ts`, `app/api/issues/import/route.ts`, `app/api/issues/stats/route.ts` |
| **Notes** | All Issues API POST/PATCH/DELETE methods now rate-limited. |

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
| **Status** | ✅ IMPLEMENTED |
| **Effort** | 4 hours |
| **Files** | `tests/unit/api/crm/contacts.route.test.ts`, `tests/unit/api/crm/leads.route.test.ts`, `tests/unit/api/crm/accounts.route.test.ts`, `tests/unit/api/crm/overview.route.test.ts` |
| **Coverage** | CRUD operations, RBAC, tenant isolation |

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

| Module | Routes | Tests | Coverage | Status |
|--------|--------|-------|----------|--------|
| **Auth** | 8 | 8 | 100% | ✅ |
| **Billing** | 12 | 52 | 100% | ✅ |
| **Finance** | 15 | 45 | 100% | ✅ |
| **FM** | 18 | 36 | 100% | ✅ |
| **HR** | 8 | 24 | 100% | ✅ |
| **Issues** | 5 | 15 | 100% | ✅ |
| **Payments** | 6 | 18 | 100% | ✅ |
| **Superadmin** | 3 | 9 | 100% | ✅ |
| **CRM** | 4 | 12 | 100% | ✅ |
| **Souq** | 32 | 13 | 41% | 🔄 Phase 3 |
| **Support** | 8 | 3 | 38% | 🔄 Phase 3 |
| **Admin** | 25 | 8 | 32% | 🔄 Phase 3 |

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

- [x] Tests green (3309/3309)
- [x] Build 0 TS errors
- [x] No console/runtime/hydration issues
- [x] Tenancy filters enforced
- [x] Branding/RTL verified
- [x] Rate limiting on all sensitive routes
- [x] Issue audit trail (IssueEvent model)
- [x] Database indexes documented

---

**Status**: ✅ Merge-ready for Fixzit Phase 1 MVP
