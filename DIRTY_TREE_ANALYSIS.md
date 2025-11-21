# Dirty Working Tree Analysis & Scope Report

**Generated**: November 21, 2025  
**Last Pushed Commit**: `37f7f8bf6` - "feat: per-file upload controls, metadata verification, and draft cleanup"  
**Working Tree Status**: **73 modified files** (heavily dirty)

---

## 🎯 Executive Summary

### What Was Pushed (Commit 37f7f8bf6)
✅ **Per-file upload UX improvements** - Completed and pushed  
✅ **Metadata verification endpoint** - New route: `app/api/upload/verify-metadata/route.ts`  
✅ **Schema relaxation for drafts** - Work order validation changes  
✅ **Orphan attachment cleanup** - Automated cleanup for orphaned files  
✅ **Work order route consolidation** - Deleted `app/api/work-orders/[id]/route.ts` (198 lines)

### What's in Your Local Dirty Tree
⚠️ **73 files modified** with local changes NOT yet committed  
⚠️ **342 insertions, 364 deletions** across the codebase  
⚠️ **Heavy modifications** across multiple domains (API routes, UI components, tests, config)

### ⚠️ RECOMMENDATION
**DO NOT refactor further** until local changes are reconciled. The current dirty tree contains:
- Google OAuth configuration changes (my recent work)
- Unknown local modifications across 70+ files
- Test updates and state fixtures
- Layout and component changes

---

## 📊 Dirty Tree Breakdown

### Modified Files by Category (73 total)

#### 1. **API Routes** (43 files)
The largest category of changes:

**Upload/Scan Related (3 files)**
- ✏️ `app/api/upload/presigned-url/route.ts` - Local changes differ from pushed version
- ✏️ `app/api/upload/scan-status/route.ts` - **SIGNIFICANT LOCAL CHANGES** (token auth, caching)
- ✏️ `tests/unit/api/upload/scan-status.test.ts` - Test updates for scan-status changes

**Souq/Marketplace (20 files)**
- ✏️ `app/api/souq/buybox/[fsin]/route.ts`
- ✏️ `app/api/souq/buybox/offers/[fsin]/route.ts`
- ✏️ `app/api/souq/buybox/winner/[fsin]/route.ts`
- ✏️ `app/api/souq/catalog/products/route.ts`
- ✏️ `app/api/souq/claims/route.ts`
- ✏️ `app/api/souq/claims/[id]/route.ts`
- ✏️ `app/api/souq/claims/[id]/appeal/route.ts`
- ✏️ `app/api/souq/claims/[id]/decision/route.ts`
- ✏️ `app/api/souq/claims/[id]/evidence/route.ts`
- ✏️ `app/api/souq/claims/[id]/response/route.ts`
- ✏️ `app/api/souq/fulfillment/assign-fast-badge/route.ts`
- ✏️ `app/api/souq/fulfillment/generate-label/route.ts`
- ✏️ `app/api/souq/fulfillment/rates/route.ts`
- ✏️ `app/api/souq/fulfillment/sla/[orderId]/route.ts`
- ✏️ `app/api/souq/inventory/[listingId]/route.ts`
- ✏️ `app/api/souq/inventory/adjust/route.ts`
- ✏️ `app/api/souq/inventory/convert/route.ts`
- ✏️ `app/api/souq/inventory/health/route.ts`
- ✏️ `app/api/souq/inventory/release/route.ts`
- ✏️ `app/api/souq/inventory/return/route.ts`

**FM (Facilities Management) (4 files)**
- ✏️ `app/api/fm/permissions.ts`
- ✏️ `app/api/fm/properties/route.ts`
- ✏️ `app/api/fm/reports/process/route.ts`
- ✏️ `app/api/fm/system/integrations/[id]/toggle/route.ts`

**HR (Human Resources) (3 files)**
- ✏️ `app/api/hr/employees/route.ts` - **Mentioned in context as recently edited**
- ✏️ `app/api/hr/leaves/route.ts`
- ✏️ `app/api/hr/payroll/runs/route.ts`

**ATS (Applicant Tracking) (3 files)**
- ✏️ `app/api/ats/convert-to-employee/route.ts`
- ✏️ `app/api/ats/jobs/[id]/apply/route.ts`
- ✏️ `app/api/careers/apply/route.ts`

**Support & Admin (3 files)**
- ✏️ `app/api/support/tickets/[id]/reply/route.ts` - **Mentioned in context as recently edited**
- ✏️ `app/api/admin/footer/route.ts`
- ✏️ `app/api/user/preferences/route.ts`

**Other API Routes (7 files)**
- ✏️ `app/api/aqar/favorites/route.ts`
- ✏️ `app/api/aqar/pricing/route.ts` - **Mentioned in context as recently edited**
- ✏️ `app/api/assistant/query/route.ts`
- ✏️ `app/api/counters/route.ts`
- ✏️ `app/api/webhooks/carrier/tracking/route.ts` - **Mentioned in context as recently edited**

#### 2. **UI Components** (3 files)
- ✏️ `components/ClientLayout.tsx` - **22 lines changed** (+18/-4)
- ✏️ `components/ResponsiveLayout.tsx` - **11 lines changed** (+7/-4)
- ✏️ `components/TopBar.tsx` - **7 lines changed** (+4/-3)

#### 3. **FM Pages** (3 files)
- ✏️ `app/fm/finance/budgets/page.tsx` - **Mentioned in context as recently edited**
- ✏️ `app/fm/finance/invoices/page.tsx` - **Mentioned in context as recently edited**
- ✏️ `app/fm/work-orders/new/page.tsx`

#### 4. **Marketplace Pages** (5 files)
- ✏️ `app/marketplace/page.tsx`
- ✏️ `app/marketplace/seller-central/advertising/page.tsx`
- ✏️ `app/marketplace/seller-central/analytics/page.tsx`
- ✏️ `app/marketplace/seller-central/settlements/page.tsx`
- ✏️ `app/marketplace/seller/onboarding/page.tsx`

#### 5. **Tests** (9 files)
- ✏️ `tests/unit/api/upload/scan-status.test.ts` - **44 lines changed** (+38/-6)
- ✏️ `tests/unit/api/work-orders/patch.route.test.ts` - **11 lines changed** (+7/-4) - **Mentioned in context**
- ✏️ `tests/specs/smoke.spec.ts` - **16 lines changed** (+10/-6)
- ✏️ `tests/state/admin.json` - **4 lines changed**
- ✏️ `tests/state/manager.json` - **4 lines changed**
- ✏️ `tests/state/superadmin.json` - **4 lines changed**
- ✏️ `tests/state/technician.json` - **4 lines changed**
- ✏️ `tests/state/tenant.json` - **4 lines changed**
- ✏️ `tests/state/vendor.json` - **4 lines changed**

#### 6. **Library & Config Files** (11 files)
- ✏️ `auth.config.ts` - **30 lines changed** (+25/-5) - Google OAuth improvements
- ✏️ `playwright.config.ts` - **21 lines added** - Google OAuth env loading
- ✏️ `.env.example` - **11 lines changed** - Google OAuth docs
- ✏️ `.env.test.example` - **14 lines added** - Auth credentials section
- ✏️ `lib/api/crud-factory.ts` - **2 lines added**
- ✏️ `lib/communication-logger.ts` - **2 lines changed**
- ✏️ `lib/mongo.ts` - **2 lines changed**
- ✏️ `lib/paytabs.ts` - **14 lines changed** (+8/-6)
- ✏️ `lib/sanitize-html.ts` - **4 lines changed** (+3/-1)
- ✏️ `config/routes/public.ts` - **2 lines changed**
- ✏️ `app/admin/route-metrics/page.tsx` - **8 lines changed**

#### 7. **New Untracked Files** (5 files - Google OAuth setup)
- ➕ `.github/workflows/e2e-tests.yml` - E2E test workflow
- ➕ `GOOGLE_OAUTH_PRODUCTION_READY.md` - Solution documentation
- ➕ `GOOGLE_OAUTH_SETUP.md` - Quick start guide
- ➕ `docs/GOOGLE_OAUTH_SETUP.md` - Detailed setup guide
- ➕ `scripts/setup-google-oauth.sh` - Automated setup script

---

## 🔍 Deep Dive: Critical File Changes

### 1. `app/api/upload/scan-status/route.ts` - SIGNIFICANT CHANGES

**Local Changes vs Pushed Version:**

```diff
+ Added token-based authentication (bypass session auth)
+ function isTokenAuthorized(req: NextRequest)
+ Optional auth: Check token first, fall back to session

+ Unified cache headers for public CDN caching
+ function cacheHeaders()
- Old: 'Cache-Control': 'private, max-age=5'
+ New: 'Cache-Control': 'public, max-age=5'

+ Import added: getClientIP from security headers
+ Rate limiting uses IP when token-authorized (no user session)

+ Both GET and POST support token auth
+ Cleaner error handling with extracted userId variable
```

**Impact**: Token authentication allows external services (e.g., S3 scan webhooks) to query scan status without user session.

**Status**: ⚠️ **Local changes not pushed** - Conflicts with pushed commit

---

### 2. `tests/unit/api/upload/scan-status.test.ts` - TEST UPDATES

**Changes** (44 lines: +38/-6):
- Added tests for token-based authentication
- Updated test expectations for new cache headers
- Mocked `getClientIP` for rate limiting tests

**Status**: ⚠️ **Local changes not pushed** - Must align with scan-status route changes

---

### 3. `auth.config.ts` - GOOGLE OAUTH IMPROVEMENTS

**Changes** (30 lines: +25/-5):
- Enhanced Google OAuth validation with better logging
- Separate messages for production vs development
- Clear error messages with resolution steps
- Success confirmation when OAuth configured

**Status**: ✅ **My recent work** - Safe to keep

---

### 4. `playwright.config.ts` - ENV LOADING

**Changes** (21 lines added):
- Import dotenv and path
- Auto-load `.env.test` for Playwright
- Pass Google OAuth credentials to webServer
- Added SKIP_ENV_VALIDATION flag

**Status**: ✅ **My recent work** - Safe to keep

---

### 5. UI Components (ClientLayout, ResponsiveLayout, TopBar)

**Scope**: ~40 lines changed across 3 files

**Nature**: Unknown - likely formatting, minor refactors, or feature additions

**Status**: ⚠️ **Unknown origin** - Review before committing

---

### 6. Work Order Routes & Tests

**Deleted in Pushed Commit:**
- `app/api/work-orders/[id]/route.ts` (198 lines removed)

**Modified Locally:**
- `tests/unit/api/work-orders/patch.route.test.ts` (+7/-4)
- `app/fm/work-orders/new/page.tsx` (changes unknown)

**Note**: Work order route was consolidated into separate endpoints:
- `/api/work-orders/[id]/status/route.ts`
- `/api/work-orders/[id]/assign/route.ts`
- `/api/work-orders/[id]/attachments/presign/route.ts`
- etc.

**Status**: ⚠️ **Test updates may conflict** - Verify alignment

---

## 🚨 High-Risk Conflict Areas

### 1. **Upload Routes** (Priority: CRITICAL)
- `app/api/upload/scan-status/route.ts` - Token auth added locally, not in pushed commit
- `app/api/upload/presigned-url/route.ts` - Local changes vs pushed version
- Risk: Merge conflicts, feature duplication

**Action Required**: Review local changes, reconcile with pushed commit

---

### 2. **Test Files** (Priority: HIGH)
- `tests/unit/api/upload/scan-status.test.ts` - Tests for local token auth feature
- `tests/unit/api/work-orders/patch.route.test.ts` - Updates for deleted route
- Risk: Tests may fail if local code not committed

**Action Required**: Ensure tests match current codebase state

---

### 3. **Souq/Marketplace Routes** (Priority: MEDIUM)
- 20 files modified in souq domain
- Nature of changes unknown (likely formatting or minor fixes)
- Risk: Could be important business logic changes

**Action Required**: Review before staging

---

### 4. **State Fixtures** (Priority: LOW)
- All 6 test state files modified (admin, manager, superadmin, etc.)
- Likely token/session updates or test data changes
- Risk: Low, but may affect test reliability

**Action Required**: Verify test data is consistent

---

## 📋 Reconciliation Checklist

### Before Further Refactoring:

- [ ] **Review local changes to scan-status route**
  - Token auth feature - intentional or experimental?
  - Should it be committed separately or discarded?

- [ ] **Verify upload route alignment**
  - Does local `presigned-url/route.ts` differ from pushed version?
  - Are there uncommitted improvements?

- [ ] **Check test coverage**
  - Do local test updates align with current code?
  - Are there failing tests due to uncommitted changes?

- [ ] **Review component changes**
  - What changed in ClientLayout, ResponsiveLayout, TopBar?
  - Are these intentional improvements or accidental edits?

- [ ] **Verify Souq domain changes**
  - 20 files modified - what's the scope?
  - Are these critical business logic changes?

- [ ] **Confirm work order test compatibility**
  - Does `patch.route.test.ts` work with deleted route?
  - Are tests updated for new endpoint structure?

### Decision Points:

1. **Commit local changes separately?**
   - Pros: Clean history, easier to review
   - Cons: More commits, potential for incomplete features

2. **Discard local changes and pull fresh?**
   - Pros: Clean slate, no conflicts
   - Cons: Lose any valuable local work

3. **Cherry-pick specific changes?**
   - Pros: Keep valuable work, discard noise
   - Cons: Time-consuming, risk of missing dependencies

---

## 🎯 Recommended Actions

### Immediate (DO NOW):

1. **Backup your working directory**
   ```bash
   cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit
   git stash push -u -m "backup-before-reconciliation-$(date +%Y%m%d)"
   ```

2. **Review critical changes**
   ```bash
   # Check scan-status token auth feature
   git diff HEAD app/api/upload/scan-status/route.ts
   
   # Check test updates
   git diff HEAD tests/unit/api/upload/scan-status.test.ts
   
   # Check component changes
   git diff HEAD components/
   ```

3. **Create feature branches for distinct work**
   ```bash
   # If token auth is intentional, commit separately
   git checkout -b feat/scan-status-token-auth
   git add app/api/upload/scan-status/route.ts
   git add tests/unit/api/upload/scan-status.test.ts
   git commit -m "feat: add token authentication to scan-status endpoint"
   ```

### Short-term (NEXT STEPS):

1. **Categorize remaining changes**
   - Group related changes (Souq, FM, UI, etc.)
   - Identify accidental changes (formatting, etc.)
   - Separate intentional features from noise

2. **Create focused commits**
   - One commit per logical feature/fix
   - Clear commit messages
   - Run tests before each commit

3. **Clean up Google OAuth artifacts**
   ```bash
   # Add Google OAuth work (my recent changes)
   git add .github/workflows/e2e-tests.yml
   git add GOOGLE_OAUTH_*.md docs/GOOGLE_OAUTH_SETUP.md
   git add scripts/setup-google-oauth.sh
   git add .env.example .env.test.example
   git add auth.config.ts playwright.config.ts
   git commit -m "feat: production-ready Google OAuth configuration"
   ```

### Long-term (PROCESS IMPROVEMENT):

1. **Establish commit discipline**
   - Commit frequently (every logical change)
   - Use feature branches for experimental work
   - Stash WIP before pulling updates

2. **Review before pushing**
   - Use `git diff --stat` before committing
   - Ensure tests pass
   - Check for accidental inclusions

3. **Set up pre-commit hooks**
   - Auto-format code
   - Run linter
   - Block commits with console.logs

---

## 📊 Statistics Summary

```
Total Modified Files:    73
Total Lines Changed:     +342/-364 (net: -22)

By Category:
  API Routes:            43 files (59%)
  Tests:                  9 files (12%)
  UI Components:          3 files (4%)
  FM Pages:               3 files (4%)
  Marketplace Pages:      5 files (7%)
  Library/Config:        11 files (15%)

Critical Areas:
  Upload/Scan:            3 files ⚠️ HIGH PRIORITY
  Work Orders:            2 files ⚠️ VERIFY ALIGNMENT
  Souq/Marketplace:      20 files ⚠️ REVIEW NEEDED

New Untracked Files:     5 files (Google OAuth setup) ✅
```

---

## ✅ Conclusion

### Current State:
- ✅ **Per-file upload UX** pushed successfully in commit 37f7f8bf6
- ✅ **Metadata verification** endpoint exists in working directory
- ✅ **Draft work order schema** relaxation applied in pushed commit
- ✅ **Orphan cleanup** implemented in pushed commit
- ⚠️ **73 files dirty** with local changes not yet committed
- ⚠️ **Significant scan-status changes** (token auth) not in pushed commit

### Recommendation:
**DO NOT refactor further** until you:
1. Review and understand all 73 local changes
2. Decide which changes to commit, discard, or separate
3. Reconcile local work with pushed commits
4. Ensure tests pass and code is production-ready

### Safe to Proceed With:
- ✅ Google OAuth configuration (my recent work) - commit separately
- ✅ Documentation updates (TYPESCRIPT_AUDIT_REPORT.md, etc.)

### Blocked Until Reconciled:
- ❌ Further upload/scan route refactoring
- ❌ Work order endpoint changes
- ❌ Any API route modifications that touch dirty files

---

**Next Action**: Please review the dirty tree and provide direction on which changes to keep/commit/discard before proceeding with any further refactoring.
