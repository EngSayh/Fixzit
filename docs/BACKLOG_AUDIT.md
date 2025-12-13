# BACKLOG_AUDIT.md — Fixzit Pending Backlog Report

> **Extracted At**: 2025-12-14T00:00:00+03:00  
> **Source File**: PENDING_MASTER.md  
> **Format**: v2.5 Pending Backlog Extractor

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Pending** | 10 |
| **P0 (Critical)** | 0 |
| **P1 (High)** | 0 |
| **P2 (Medium)** | 6 |
| **P3 (Low)** | 4 |
| **Quick Wins** | 3 (XS/S effort) |
| **Anomalies** | 1 |

### By Category

| Category | Count |
|----------|-------|
| Missing Tests | 6 |
| Efficiency | 3 |
| Bugs | 1 |
| Logic Errors | 0 |
| Next Steps | 0 |

---

## 🔥 File Heat Map

| Rank | File/Path | Issues | Category |
|------|-----------|--------|----------|
| 1 | tests/api/souq/* | 1 | Missing Tests |
| 2 | tests/api/hr/* | 1 | Missing Tests |
| 3 | tests/api/finance/* | 1 | Missing Tests |
| 4 | app/api/pm/* | 1 | Efficiency |
| 5 | lib/notifications/* | 1 | Bugs |

---

## 🗓️ Sprint Buckets

### Next Sprint (P2 Priority)

| Key | Title | Effort | Impact |
|-----|-------|--------|--------|
| EFF-004 | Add rate limiting to PM routes (plans/[id]) | S | 7 |
| TEST-002 | Increase HR module test coverage (14% → 50%) | M | 6 |
| TEST-003 | Increase Finance module test coverage | L | 7 |
| REF-001 | Create CRM route handler tests | M | 6 |
| REF-002 | Add fork-safe Mongo guard to build-sourcemaps.yml | XS | 5 |

### Backlog (P3 Priority)

| Key | Title | Effort | Impact |
|-----|-------|--------|--------|
| TEST-001 | Increase Souq test coverage (35% → 50%) | XL | 4 |
| TEST-004 | Increase CRM module test coverage | M | 4 |
| TEST-005 | Increase Aqar module test coverage | S | 4 |
| BUG-011 | Add .catch() to notification .then() chains | S | 3 |
| REF-003 | Add actionlint/workflow validation job | S | 3 |

---

## ⚠️ Anomalies Detected

| Type | Pattern | Affected Keys |
|------|---------|---------------|
| Repeated theme | test coverage gaps | TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, create-crm-route-tests |

**Recommendation**: Consider a dedicated test coverage sprint to address all 6 test gap items together.

---

## 📋 Full Issue Table — Efficiency (3 items)

| Key | Priority | Status | Title | Effort | Impact | Location |
|-----|----------|--------|-------|--------|--------|----------|
| EFF-004 | P2 | pending | Add rate limiting to PM routes (plans/[id]) | S | 7 | app/api/pm/plans/[id]/route.ts |
| REF-002 | P2 | pending | Add fork-safe Mongo guard to build-sourcemaps.yml | XS | 5 | .github/workflows/build-sourcemaps.yml:53-56 |
| REF-003 | P3 | pending | Add actionlint/workflow validation job | S | 3 | .github/workflows/* |

### Details — EFF-004
- **Issue**: PM routes at 60% rate limit coverage; plans/[id] missing enforceRateLimit
- **Action**: Add enforceRateLimit to PM routes
- **Risk Tags**: SECURITY
- **Source**: v65.23 Remaining Priority Items
- **Evidence**: `Add rate limiting to PM routes (plans/[id]) | Pending`

### Details — REF-002
- **Issue**: build-sourcemaps.yml:53-56 attempts Mongo index creation with localhost fallback; can fail on forks
- **Action**: Add if: env.MONGODB_URI != '' and remove localhost fallback
- **Risk Tags**: INTEGRATION
- **Source**: v65.21 CI Lint Hardening
- **Evidence**: `Add fork-safe Mongo guard to build-sourcemaps.yml | Mirror Agent Governor gating`

### Details — REF-003
- **Issue**: No automated checks enforce fork-safety/secret guards in workflows
- **Action**: Add actionlint or a reusable composite check for workflows touching secrets
- **Risk Tags**: INTEGRATION
- **Source**: v65.21 CI Lint Hardening
- **Evidence**: `Add actionlint/workflow validation job | Backlog | Prevent future schema warnings`

---

## 📋 Full Issue Table — Missing Tests (6 items)

| Key | Priority | Status | Title | Effort | Impact | Location |
|-----|----------|--------|-------|--------|--------|----------|
| TEST-002 | P2 | pending | Increase HR module test coverage (14% → 50%) | M | 6 | tests/api/hr/* |
| TEST-003 | P2 | pending | Increase Finance module test coverage | L | 7 | tests/api/finance/* |
| REF-001 | P2 | pending | Create CRM route handler tests | M | 6 | tests/unit/api/crm/* |
| TEST-001 | P3 | pending | Increase Souq test coverage (35% → 50%) | XL | 4 | tests/api/souq/* |
| TEST-004 | P3 | pending | Increase CRM module test coverage | M | 4 | tests/api/crm/* |
| TEST-005 | P3 | pending | Increase Aqar module test coverage | S | 4 | tests/api/aqar/* |

### Details — TEST-002
- **Issue**: HR module has 7 routes, 1 test file; employees CRUD, payroll need coverage
- **Action**: Create HR module tests for employees CRUD, payroll
- **Risk Tags**: TEST-GAP
- **Source**: v65.22 Missing Tests table
- **Evidence**: `hr | 7 | 1 | 6 | P2 — employees CRUD, payroll`

### Details — TEST-003
- **Issue**: Finance module has 19 routes, 4 tests; invoices, payments, billing need coverage
- **Action**: Create tests for invoices, payments, billing routes
- **Risk Tags**: TEST-GAP, FINANCIAL
- **Source**: v65.22 Missing Tests table
- **Evidence**: `finance | 19 | 4 | 15 | P2 — invoices, payments, billing`

### Details — REF-001
- **Issue**: tests/unit/api/crm/crm.test.ts only asserts role sets; CRM route handlers still untested
- **Action**: Add actual handler tests (current tests only assert role sets)
- **Risk Tags**: TEST-GAP
- **Source**: v65.25 Next Steps
- **Evidence**: `create-crm-route-tests — Add actual handler tests (current tests only assert role sets)`

### Details — TEST-001
- **Issue**: Souq has 75 routes, 26 tests; checkout, fulfillment, repricer need coverage
- **Action**: Create tests for checkout, fulfillment, repricer routes
- **Risk Tags**: TEST-GAP
- **Source**: v65.22 Missing Tests table
- **Evidence**: `souq | 75 | 26 | 49 | P2 — checkout, fulfillment, repricer`

### Details — TEST-004
- **Issue**: CRM module has 4 routes, 1 test; leads, contacts, activities need coverage
- **Action**: Create tests for leads, contacts, activities routes
- **Risk Tags**: TEST-GAP
- **Source**: v65.22 Missing Tests table
- **Evidence**: `crm | 4 | 1 | 3 | P3 — leads, contacts, activities`

### Details — TEST-005
- **Issue**: Aqar module has 16 routes, 12 tests; property listings need coverage
- **Action**: Create tests for remaining property listing routes
- **Risk Tags**: TEST-GAP
- **Source**: v65.22 Missing Tests table
- **Evidence**: `aqar | 16 | 12 | 4 | P3 — property listings`

---

## 📋 Full Issue Table — Bugs (1 item)

| Key | Priority | Status | Title | Effort | Impact | Location |
|-----|----------|--------|-------|--------|--------|----------|
| BUG-011 | P3 | pending | Add .catch() to notification .then() chains | S | 3 | lib/notifications/* |

### Details — BUG-011
- **Issue**: Unhandled .then() chains in notification handlers cause silent failures
- **Action**: Add .catch() to notification handlers
- **Risk Tags**: (none)
- **Source**: v65.22 Identified Bugs table
- **Evidence**: `Unhandled .then() chains | Silent failures | Add .catch()`

---

## ❓ Open Questions

None currently.

---

## 🔄 Quick Wins (≤ S Effort)

These items can be completed quickly with minimal effort:

1. **REF-002** (XS) — Add fork-safe Mongo guard to build-sourcemaps.yml
2. **EFF-004** (S) — Add rate limiting to PM routes (plans/[id])
3. **BUG-011** (S) — Add .catch() to notification .then() chains
4. **TEST-005** (S) — Increase Aqar module test coverage
5. **REF-003** (S) — Add actionlint/workflow validation job

---

## ✅ Validation Commands

```bash
# Verify JSON validity
cat docs/BACKLOG_AUDIT.json | jq .counts

# Check issue count
cat docs/BACKLOG_AUDIT.json | jq '.issues | length'

# List P2 items
cat docs/BACKLOG_AUDIT.json | jq '.issues[] | select(.priority == "P2") | .key'
```

---

*Generated by Pending Backlog Extractor v2.5*
