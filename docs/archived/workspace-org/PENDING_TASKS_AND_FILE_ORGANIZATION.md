# 📋 PENDING TASKS & FILE ORGANIZATION PLAN

**Date**: November 6, 2025  
**Generated**: Post PR Merge Cleanup Session

---

## 🎯 INCOMPLETE TASKS FROM PAST 5 DAYS

### 🔴 HIGH PRIORITY - CRITICAL

#### 1. Test Failures (143 failing tests)

- **Status**: ⚠️ INCOMPLETE
- **Location**: Test suite
- **Issues**:
  - RBAC tests failing
  - Secret scan issues
  - Some relocated tests may need path updates
- **Action Required**: Run `pnpm test` and fix all failures
- **Estimated Time**: 4-6 hours

#### 2. Category 5 Phase 3 - Console Statements (~50 app pages)

- **Status**: ⚠️ INCOMPLETE
- **Completed**: API routes (47 files) ✅, Components (19 files) ✅
- **Remaining**: ~50 app page files
- **Pattern**: Replace console.log/error/warn with logger utility
- **Estimated Time**: 3-4 hours

#### 3. Category 6 - Navigation Accessibility (17 files)

- **Status**: ⚠️ INCOMPLETE
- **Files**: nav/\*.ts files
- **Requirements**:
  - Keyboard navigation support
  - ARIA attributes
  - Screen reader compatibility
- **Estimated Time**: 2-3 hours

### 🟡 MEDIUM PRIORITY

#### 4. TODO Comments Resolution (27+ instances)

- **Status**: ⚠️ INCOMPLETE
- **Critical TODOs**:
  - `lib/logger.ts`: Monitoring service integration (Sentry/DataDog)
  - `lib/fm-auth-middleware.ts`: Real subscription plan queries (4 TODOs)
  - `lib/fm-approval-engine.ts`: User role queries (3 TODOs)
  - `lib/fm-notifications.ts`: Email/SMS/WhatsApp integration (4 TODOs)
  - `components/SystemVerifier.tsx`: Dynamic API integration
- **Estimated Time**: 6-8 hours

#### 5. Misplaced Test Files (10+ files)

- **Status**: ⚠️ INCOMPLETE
- **Files**:
  - `app/product/[slug]/__tests__/page.spec.tsx`
  - `app/fm/marketplace/page.test.tsx`
  - `app/marketplace/*.test.tsx` (2 files)
  - `app/api/marketplace/**/*.test.ts` (3 files)
  - `app/api/public/rfqs/route.test.ts`
  - `app/test/*.test.tsx` (2 files)
- **Action**: Move to `tests/unit/` structure
- **Estimated Time**: 30 minutes

#### 6. Legacy File Cleanup (17+ markdown files in root)

- **Status**: ⚠️ INCOMPLETE
- **Files to Archive**:
  - COMPREHENSIVE_SYSTEM_AUDIT_REPORT.md
  - CRITICAL_AUTH_FIXES_SUMMARY.md
  - CRITICAL_TECHNICAL_DEBT_AUDIT.md
  - DUPLICATE_FILES_REPORT\*.md (3 files)
  - FINAL_DUPLICATE_REPORT.md
  - PROJECT_ORGANIZATION_COMPLETE.md
  - SYSTEM_AUDIT_FINDINGS.md
  - SYSTEM_WIDE_FIXES_PROGRESS.md
  - TEST_FAILURES_REPORT.md
  - TEST_PROGRESS_SUMMARY.md
  - THEME_VIOLATIONS_AUDIT.md
- **Files to Move to docs/guides/**:
  - README_START_HERE.md (if not already moved)
  - READY_TO_START.md (if not already moved)
  - START_3_HOUR_TESTING.md (if not already moved)
- **Action**: Move to `docs/archive/`
- **Estimated Time**: 15 minutes

### 🟢 LOW PRIORITY

#### 7. Tasks 2-15 from Implementation Guide

- **Status**: ⏸️ PAUSED
- **Completed**: Task 1 (Auto-restart with PM2) ✅
- **Remaining**: 14 tasks
- **Note**: User to decide if continuation needed
- **Tasks Include**:
  - Task 2: PayTabs integration (NOT Stripe)
  - Task 3: Referral system
  - Task 4: Testing framework setup
  - Task 5-15: Various features and optimizations

#### 8. E2E Test Script Organization

- **Status**: ⚠️ INCOMPLETE
- **File**: `start-e2e-testing.sh` (loose in root)
- **Action**: Move to `scripts/` or `tests/e2e/`
- **Estimated Time**: 2 minutes

#### 9. Legacy Components Cleanup

- **Status**: ⚠️ INCOMPLETE
- **Files Found**:
  - `components/SupportPopup.OLD.tsx`
- **Action**: Review and remove if not needed
- **Estimated Time**: 5 minutes

---

## 📁 FILE ORGANIZATION PLAN

### Phase 1: Archive Historical Documents ✅ READY TO EXECUTE

```bash
# Move audit reports
mv COMPREHENSIVE_SYSTEM_AUDIT_REPORT.md docs/archive/audits/
mv CRITICAL_AUTH_FIXES_SUMMARY.md docs/archive/audits/
mv CRITICAL_TECHNICAL_DEBT_AUDIT.md docs/archive/audits/
mv SYSTEM_AUDIT_FINDINGS.md docs/archive/audits/
mv THEME_VIOLATIONS_AUDIT.md docs/archive/audits/

# Move duplicate reports
mv DUPLICATE_FILES_REPORT.md docs/archive/duplicates/
mv DUPLICATE_FILES_REPORT_ROUND2.md docs/archive/duplicates/
mv FINAL_DUPLICATE_REPORT.md docs/archive/duplicates/

# Move completion/status reports
mv PROJECT_ORGANIZATION_COMPLETE.md docs/archive/
mv SYSTEM_WIDE_FIXES_PROGRESS.md docs/archive/
mv TEST_FAILURES_REPORT.md docs/archive/
mv TEST_PROGRESS_SUMMARY.md docs/archive/

# Move planning documents
mv THEME_UPGRADE_PLAN.md docs/planning/

# Move phase completion docs
mv PHASE_2_3_4_COMPLETE.md docs/archive/

# Move all progress reports from DAILY_PROGRESS_REPORTS/
mv DAILY_PROGRESS_REPORTS/*.md docs/archive/progress-reports/
```

### Phase 2: Relocate Misplaced Test Files ✅ READY TO EXECUTE

```bash
# Create test directories
mkdir -p tests/unit/app/product
mkdir -p tests/unit/app/fm/marketplace
mkdir -p tests/unit/app/marketplace
mkdir -p tests/unit/app/test
mkdir -p tests/unit/api/marketplace/categories
mkdir -p tests/unit/api/marketplace/products
mkdir -p tests/unit/api/public/rfqs

# Move app tests
mv app/product/[slug]/__tests__/page.spec.tsx tests/unit/app/product/product-page.spec.tsx
mv app/fm/marketplace/page.test.tsx tests/unit/app/fm/marketplace/marketplace-page.test.tsx
mv app/marketplace/page.test.tsx tests/unit/app/marketplace/marketplace-page.test.tsx
mv app/marketplace/rfq/page.test.tsx tests/unit/app/marketplace/rfq-page.test.tsx

# Move API tests
mv app/api/marketplace/search/route.test.ts tests/unit/api/marketplace/search-route.test.ts
mv app/api/marketplace/categories/route.test.ts tests/unit/api/marketplace/categories/route.test.ts
mv app/api/marketplace/products/[slug]/route.test.ts tests/unit/api/marketplace/products/product-route.test.ts
mv app/api/public/rfqs/route.test.ts tests/unit/api/public/rfqs/route.test.ts

# Move test page tests
mv app/test/help_support_ticket_page.test.tsx tests/unit/app/test/help-support-ticket-page.test.tsx
mv app/test/api_help_articles_route.test.ts tests/unit/app/test/api-help-articles-route.test.ts
```

### Phase 3: Organize Scripts ✅ READY TO EXECUTE

```bash
# Move E2E script
mv start-e2e-testing.sh tests/e2e/start-e2e-testing.sh

# Mark as executable
chmod +x tests/e2e/start-e2e-testing.sh
```

### Phase 4: Remove Legacy Files ✅ READY TO EXECUTE

```bash
# Remove old backup components
rm -f components/SupportPopup.OLD.tsx

# Remove empty directories if any
find . -type d -empty -delete 2>/dev/null || true
```

---

## 📊 PROGRESS TRACKING

### Completed in Past 5 Days ✅

- ✅ PR #237: Accessibility improvements
- ✅ PR #238: Theme compliance (20 fixes)
- ✅ PR #239/263: Critical security fixes (GUEST role, format.ts, ErrorBoundary)
- ✅ PR #240: Type safety improvements
- ✅ PR #241: Console statements in API routes (47 files)
- ✅ PR #242: Console statements in components (19 files)
- ✅ PR #257: Auto-restart mechanism (PM2)
- ✅ PR #261: Initial file organization (partial)
- ✅ 10 WIP/draft PRs closed
- ✅ All branches cleaned up
- ✅ 42 new tests added (100% passing)

### In Progress 🔄

- 🔄 File organization (this session)
- 🔄 Test file relocation

### Pending ⏸️

- ⏸️ Test failures fix (143 tests)
- ⏸️ Category 5 Phase 3 (~50 app pages)
- ⏸️ Category 6 (17 nav files)
- ⏸️ TODO comments resolution
- ⏸️ Tasks 2-15 (user decision needed)

---

## 🎯 RECOMMENDED NEXT ACTIONS

### Immediate (Today)

1. **Execute file organization** (Phases 1-4 above) - 30 min
2. **Fix test failures** - Priority #1 - 4-6 hours
3. **Relocate remaining test files** - 30 min

### This Week

4. **Category 5 Phase 3** - Console statements in app pages - 3-4 hours
5. **Category 6** - Navigation accessibility - 2-3 hours
6. **Resolve critical TODOs** - Monitoring, auth queries - 4-6 hours

### Next Week

7. **Review Tasks 2-15** - Decide continuation
8. **Production readiness** - Final checks
9. **Documentation update** - README and guides

---

## 📈 ESTIMATED TIME TO COMPLETION

- **File Organization**: 30 minutes ⚡
- **Test Fixes**: 4-6 hours 🔴
- **Console Statements Phase 3**: 3-4 hours 🟡
- **Navigation Accessibility**: 2-3 hours 🟡
- **TODO Resolution**: 6-8 hours 🟡

**Total Remaining Work**: ~16-22 hours

---

## 🔍 VERIFICATION CHECKLIST

Before marking complete:

- [ ] All markdown files moved from root
- [ ] All test files in tests/unit/ structure
- [ ] All scripts in scripts/ directory
- [ ] Legacy files removed
- [ ] Empty directories cleaned
- [ ] Git status clean
- [ ] All tests passing
- [ ] No console statements in app pages
- [ ] Navigation accessibility complete
- [ ] Critical TODOs resolved

---

_Generated: November 6, 2025_  
_Next Review: After file organization execution_
