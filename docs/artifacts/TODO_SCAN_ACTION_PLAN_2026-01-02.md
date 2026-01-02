# TODO Scan Action Plan - 2026-01-02

## Session Info
- **Agent Token:** `[AGENT-001-A]`  
- **Date:** 2026-01-02T10:00:00+03:00  
- **Scan Source:** Comprehensive TODO/FIXME/stub scan  
- **SSOT Status:** All findings logged to MongoDB Issue Tracker

---

## Executive Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 Critical | 1 | SEC-0002 - PII Encryption |
| P1 High | 2 | FEAT-0027, FEAT-0028 |
| P2 Medium | 47 | Various modules |
| P3 Low | ~50 | Docs, refactors |

**Total Open Issues:** 100+

---

## P0 Critical Issues (Blocking Production)

### SEC-0002: PII Encryption NOT IMPLEMENTED
- **File:** `server/models/Employee.ts:38`
- **Risk:** PDPL/GDPR compliance violation
- **Action:** Implement field-level encryption for PII fields (nationalId, bankAccount, etc.)
- **Effort:** L (2-3 days)
- **Dependencies:** Key management infrastructure

### PDPL Erasure (needs issue update)
- **File:** `services/compliance/pdpl-service.ts:337,353`
- **Risk:** Legal compliance - 30 day erasure requirement
- **Action:** Implement cascade deletion with audit trail
- **Effort:** L

### SADAD/SPAN Live Payouts (needs issue update)
- **File:** `services/finance/payout-processor.ts:599,611`
- **Risk:** Production payouts blocked
- **Action:** Integrate with Saudi payment rails
- **Effort:** XL (1+ week)
- **Dependencies:** Bank API credentials, sandbox testing

---

## P1 High Priority Issues

### FEAT-0027: Vendor Fraud Detection Stubs ✅ CLOSED
- **Module:** souq
- **File:** `services/souq/vendor-intelligence.ts:817-864`
- **Status:** CLOSED - PR #640, commit 8d54ff790
- **Implemented:** 
  - `checkActivitySpike()` - Order volume spike detection (3x threshold)
  - `checkDuplicateListings()` - N-gram fingerprinting for duplicates
  - `checkPriceManipulation()` - 50% price swing detection in 24h
  - `checkFakeReviews()` - Review velocity and pattern detection

### FEAT-0028: Ejar API Integration ✅ CLOSED
- **Module:** aqar
- **File:** `services/aqar/lease-service.ts:1028`
- **Status:** CLOSED - PR #640, commit 8d54ff790
- **Implemented:** `callEjarApi()` helper with EJAR_API_URL, EJAR_API_KEY, EJAR_ENABLED config

### OTP Bypass Blocking Disabled ✅ FIXED
- **File:** `instrumentation-node.ts:66`
- **Status:** FIXED - Commit 3e7bcf3e4 on main
- **Resolution:** Re-enabled blocking in production

### Runtime 501 Stubs ✅ ANALYZED - FALSE POSITIVE
- **Analysis Date:** 2026-01-02
- **Result:** 11 of 12 routes are **valid feature guards** (S3/feature flags)
- **Categories:**
  - S3 Guards (5): `upload/presigned-url`, `upload/verify-metadata`, `upload/scan`, `work-orders/.../presign`, `onboarding/.../request-upload`
  - Feature Flags (5): `marketplace/products`, `marketplace/categories`, `integrations/linkedin/apply`, `fm/inspections/vendor-assignments`, `support/welcome-email`
  - Unimplemented (1): `owner/statements` PDF/Excel export → Moved to P2
- **Action:** No changes needed - these are proper infrastructure guards
- **Status:** CLOSED (not a bug)

---

## P2 Medium Priority Issues (11 New)

| Issue ID | Title | Module | Effort | Status |
|----------|-------|--------|--------|--------|
| FEAT-0029 | Subscription plan change flow (FIXZIT-SUB-001) | billing | L | ✅ CLOSED |
| FEAT-0030 | Subscription cancellation flow (FIXZIT-SUB-002) | billing | M | ✅ CLOSED |
| FEAT-0031 | Inspection tenant notification | fm | S | ✅ CLOSED |
| FEAT-0032 | Session termination | auth | M | ✅ CLOSED |
| FEAT-0033 | MFA approval system integration | auth | M | ✅ CLOSED |
| BI-KPI-* | BI Dashboard hardcoded KPIs (4 items) | reports | M | ✅ CLOSED |
| CRM-TREND | Customer NPS trend calculation | crm | S | ✅ CLOSED |
| - | Mock data replacement (FM Providers) | api | L | DEFERRED (8-16h) |
| - | Comments API not implemented | ui | M | N/A (i18n placeholder) |
| TG-005 | Test mock setup batch (8 files) | tests | L | ✅ CLOSED |

---

## P3 Low Priority / Deferred

| Issue ID | Title | Module | Effort |
|----------|-------|--------|--------|
| FEAT-0034 | Redis pub/sub scaling | infrastructure | M |
| FEAT-0035 | Health monitoring integration | monitoring | M |
| FEAT-0036 | AI building model generation | aqar | XL |
| REFAC-0003 | FM Properties schema mismatch (TODO-002) | fm | L |
| - | Vitest multi-project migration | tests | M |
| - | Ticketing system integration | support | M |
| - | Superadmin notification badge | ui | S |
| - | BLOCKED: Souq Orders mismatch (TODO-001) | souq | M |

---

## Recommended Execution Order

### Sprint 1 (Immediate - This Week) ✅ COMPLETE
1. **SEC-0002** - PII Encryption ✅ CLOSED (commit 3e7bcf3e4)
2. **PDPL Erasure** - Compliance ✅ IMPLEMENTED (commit 3e7bcf3e4)
3. **OTP Bypass** - Security fix ✅ FIXED (commit 3e7bcf3e4)

### Sprint 2 (This Week) ✅ COMPLETE
4. **501 Stubs** - ✅ ANALYZED - FALSE POSITIVE (valid guards)
5. **FEAT-0027** - Fraud detection ✅ IMPLEMENTED (PR #640)
6. **FEAT-0028** - Ejar integration ✅ IMPLEMENTED (PR #640)

### Sprint 3 ✅ COMPLETE
- **FEAT-0027** - Fraud detection ✅ CLOSED (PR #640)
- **FEAT-0028** - Ejar integration ✅ CLOSED (PR #640)
- **SADAD/SPAN** - Payment rails (DEFERRED - requires bank credentials)

### Sprint 4 ✅ COMPLETE
- **FEAT-0029** - Subscription plan change ✅ CLOSED (PR #641)
- **FEAT-0030** - Subscription cancellation ✅ CLOSED (PR #641)
- **FEAT-0031** - Inspection notification ✅ CLOSED (PR #641)
- **FEAT-0032** - Session termination ✅ CLOSED (PR #641)
- **FEAT-0033** - MFA approval ✅ CLOSED (PR #641)

### Sprint 5 ✅ COMPLETE
- **BI-KPI-001/002/003/004** - BI Dashboard KPIs ✅ CLOSED (PR #642)
- **CRM-TREND** - NPS trend calculation ✅ CLOSED (PR #642)
- **TG-005** - Test mock setup (35 tests) ✅ CLOSED (PR #642)

### Sprint 6 (Current) - P3 Infrastructure
| ID | Title | Status | Notes |
|---|---|---|---|
| FEAT-0034 | Redis pub/sub scaling | ⏳ REVIEW | Redis module exists with fallback |
| FEAT-0035 | Health monitoring integration | ⏳ REVIEW | Health endpoints exist |
| REFAC-0003 | FM Properties schema mismatch | DEFERRED | Marked in code (TODO-002) |
| FEAT-0036 | AI building model generation | NOT STARTED | XL effort |

### Backlog (Updated)
- FM Providers mock data (8-16h) - DEFERRED
- Vitest multi-project migration (M)
- Ticketing system integration (M)
- Superadmin notification badge (S)

---

## Blocked Items Requiring External Action

| Item | Blocker | Owner |
|------|---------|-------|
| SADAD/SPAN Live Mode | Bank API credentials | Ops/Finance |
| Ejar Integration | Ejar API credentials | Legal/Ops |
| TODO-001 Souq Orders | Schema alignment decision | Architecture |

---

## Evidence

### SSOT Import Results
```
[AGENT-001-A] SSOT TODO Scan Import
Issues to import: 17
────────────────────────────────────────────────────────────
📝 Exists: PDPL data erasure implementation required
📝 Exists: SADAD/SPAN live payout mode not implemented
✅ Created: FEAT-0027 - Vendor fraud detection stubs
✅ Created: FEAT-0028 - Ejar API integration not implemented
📝 Exists: OTP bypass blocking disabled
📝 Exists: Runtime 501 stubs in API routes
📝 Exists: BI Dashboard hardcoded KPIs
✅ Created: FEAT-0029 - Subscription plan change flow
✅ Created: FEAT-0030 - Subscription cancellation flow
✅ Created: FEAT-0031 - Inspection tenant notification
✅ Created: FEAT-0032 - Session termination
✅ Created: FEAT-0033 - MFA approval system integration
📝 Exists: Test mock setup incomplete - TG-005 batch
✅ Created: FEAT-0034 - Redis pub/sub scaling
✅ Created: FEAT-0035 - Health monitoring integration
✅ Created: FEAT-0036 - AI building model generation
✅ Created: REFAC-0003 - FM Properties schema mismatch
────────────────────────────────────────────────────────────
Summary: 11 created, 6 updated/exists, 0 errors
```

### Scan Summary
- **Total TODO/FIXME markers found:** 50+
- **Runtime stubs (501/not implemented):** 15+
- **Test TODOs (TG-005):** 10
- **Placeholder tokens (TBD/CHANGEME):** 10

---

## Next Steps

1. ✅ SSOT updated with all findings
2. ⏳ Begin Sprint 1 items (PII encryption first)
3. Create PRs for each fix with proper agent tokens
4. Update SSOT status as items are resolved

---

*Generated by [AGENT-001-A] per AGENTS.md v7.0 protocol*
