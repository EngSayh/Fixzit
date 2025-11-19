# SupportOrgSwitcher & Org-Guarded Pages - Smoke Test Plan

**Status:** Ready for Manual Execution / Automated guard coverage available (`pnpm vitest run tests/unit/components/support/SupportOrgSwitcher.test.tsx`)  
**Priority:** 🔴 CRITICAL - Blocks Deployment  
**Prerequisites:** Dev server running at http://localhost:3001

---

## Overview

This smoke test validates that:
1. **SupportOrgSwitcher** correctly impersonates organizations
2. **Org-guarded pages** require organization context (show prompt when missing)
3. **Tenant context** flows correctly through all FM modules
4. **Translation keys** exist for all org-selection prompts

---

## Test Environment Setup

### 1. Database Preparation
```bash
# Ensure test users exist with proper roles
pnpm tsx scripts/seed-demo-users.ts
node scripts/create-test-data.js

# Verify users in database
# - superadmin@fixzit.com (role: superadmin)
# - support@fixzit.com (role: support)
# - manager@fixzit.com (role: manager, has organizationId)
```

### 2. Test Organizations
You need at least 2 test organizations:
- **Org A:** Primary test organization (ID: `org_test_001`)
- **Org B:** Secondary for switcher testing (ID: `org_test_002`)

### 3. Browser Setup
- Open browser to: http://localhost:3001
- Open DevTools (F12) → Console tab
- Keep Network tab visible for API calls

---

## Critical Test 1: SupportOrgSwitcher E2E Flow

### Objective
Verify support users can impersonate organizations and context flows correctly.

> **Automation Shortcut:** `pnpm vitest run tests/unit/components/support/SupportOrgSwitcher.test.tsx` exercises the SupportOrgSwitcher search + selection flow with mocked APIs so we can validate the regression without a seeded environment. Run the manual steps below when you need full-stack assurance.

### Steps

#### 1.1 Login as Support User
- [ ] Navigate to http://localhost:3001/login
- [ ] Login with: `support@fixzit.com`
- [ ] Verify successful login → redirects to dashboard

**Expected:** Support user logged in, no organization context yet

#### 1.2 Verify SupportOrgSwitcher Appears
- [ ] Check TopBar for "Organization Switcher" component
- [ ] Should show: "No Organization Selected" or similar prompt
- [ ] Click the switcher dropdown

**Expected:** Dropdown opens, shows search input

**Screenshot:** TopBar with org switcher visible

#### 1.3 Search for Organization
- [ ] Type organization name in search input (e.g., "Test Org A")
- [ ] Verify API call in Network tab: `GET /api/support/organizations/search?q=Test`
- [ ] Check response has organizations array
- [ ] Verify dropdown shows search results

**Expected:** Organizations appear in dropdown

**If fails:** Check:
- Console errors?
- API returns 404/500?
- `components/support/SupportOrgSwitcher.tsx` rendering?

#### 1.4 Select Organization
- [ ] Click on "Test Org A" from results
- [ ] Verify API call: `POST /api/support/impersonation`
- [ ] Check response: `{ success: true, organizationId: "org_test_001" }`
- [ ] Verify TopBar updates to show: "Test Org A" (selected org name)

**Expected:** Organization context set, TopBar reflects selection

**If fails:** Check:
- `contexts/SupportOrgContext.tsx` → `selectOrganization()` function
- Session/cookie updated?
- Console errors from context provider?

#### 1.5 Navigate to Org-Guarded Page
- [ ] Navigate to `/fm/finance/budgets`
- [ ] Page should load normally (no org prompt)
- [ ] Check page title displays correctly
- [ ] Verify budgets table attempts to load (may be empty)

**Expected:** Page loads, uses organization context for data fetching

**If fails:** Page shows "Please select organization" prompt

---

## Critical Test 2: Org-Guard Without Context

### Objective
Verify pages correctly prompt for organization when context is missing.

### Steps

#### 2.1 Exit Impersonation (or login as user without org)
- [ ] If still impersonating, click "Exit Impersonation" button
- [ ] OR logout and login as: `user@example.com` (no organizationId)
- [ ] Verify TopBar shows no organization selected

**Expected:** Organization context cleared

#### 2.2 Attempt to Access Guarded Page
- [ ] Navigate directly to: `/fm/finance/budgets`
- [ ] Page should NOT load data
- [ ] Should show prompt: "Please select your organization to continue"
- [ ] Prompt should have translation key visible in source

**Expected:** Org selection prompt appears

**Screenshot:** Org prompt modal/banner

**If fails:** Check:
- `useSupportOrg()` hook in page component
- Early return with org prompt rendering
- Translation key exists in `i18n/sources/fm.translations.json`

#### 2.3 Verify Other Guarded Pages
Test the same flow for:
- [ ] `/fm/finance/expenses` → Shows org prompt ✓
- [ ] `/fm/finance/payments` → Shows org prompt ✓
- [ ] `/fm/finance/invoices` → Shows org prompt ✓
- [ ] `/fm/properties` → Shows org prompt ✓
- [ ] `/fm/system/integrations` → Shows org prompt ✓

**Expected:** ALL pages show org prompt when context missing

---

## Critical Test 3: Tenant Context Data Scoping

### Objective
Verify data fetched is scoped to selected organization.

### Prerequisites
- Support user impersonating "Test Org A"
- At least 1 budget/expense exists for Org A
- At least 1 budget/expense exists for Org B (different org)

### Steps

#### 3.1 Verify Data for Org A
- [ ] Select "Test Org A" via SupportOrgSwitcher
- [ ] Navigate to `/fm/finance/budgets`
- [ ] Note the budgets displayed (should be Org A's budgets only)
- [ ] Check API call in Network: `GET /api/fm/finance/budgets?organizationId=org_test_001`
- [ ] Verify query param includes organizationId

**Expected:** Only Org A's budgets appear

#### 3.2 Switch to Org B
- [ ] Open SupportOrgSwitcher
- [ ] Search for and select "Test Org B"
- [ ] Still on `/fm/finance/budgets`
- [ ] Page should refresh/refetch data
- [ ] Verify NEW budgets appear (Org B's budgets)
- [ ] Check API call: `GET /api/fm/finance/budgets?organizationId=org_test_002`

**Expected:** Budgets list updates to Org B's data

**If fails:** Check:
- Context change triggers re-render?
- `useEffect` dependencies include `currentOrganization`?
- API correctly filters by organizationId?

#### 3.3 Test Other FM Modules
Repeat org switching test for:
- [ ] `/fm/finance/expenses`
- [ ] `/fm/properties`
- [ ] `/fm/work-orders/board`

**Expected:** Data scopes correctly across all modules

---

## Test 4: Translation Keys Verification

### Objective
Verify all org-selection prompts have proper translations (EN/AR).

### Steps

#### 4.1 Check English Prompts
- [ ] Language set to: English (EN)
- [ ] Clear organization context
- [ ] Visit `/fm/finance/budgets`
- [ ] Read org prompt message
- [ ] Should be clear English text (not translation key like `fm.org.required`)

**Expected:** Human-readable English prompt

#### 4.2 Check Arabic Translations
- [ ] Switch language to: Arabic (AR)
- [ ] Verify RTL layout applies
- [ ] Read org prompt message in Arabic
- [ ] Should be translated Arabic text
- [ ] UI should maintain proper RTL alignment

**Expected:** Arabic translation exists and displays correctly

**If fails:** Check:
- `i18n/sources/fm.translations.json` has `org.required` key
- Translation dictionaries rebuilt: `pnpm build:i18n`
- Component uses `t('fm.org.required')` not hardcoded text

#### 4.3 Verify Translation Keys Exist
```bash
# Check translation files
grep -r "org.required\|org.select\|org.prompt" i18n/sources/

# Should find entries in:
# - fm.translations.json
# - common.translations.json
```

---

## Test 5: Extend to Uncovered FM Modules

### Modules Still Needing Org Guards

#### 5.1 Marketplace Module
- [ ] Navigate to `/fm/marketplace/listings/new`
- [ ] Should show org prompt if no context
- [ ] After selecting org, page should load

**Status:** ⚠️ Needs implementation
**Files to update:** `app/fm/marketplace/**/*.tsx`

#### 5.2 HR Module
- [ ] Navigate to `/fm/hr/directory`
- [ ] Should show org prompt if no context
- [ ] Navigate to `/fm/hr/employees`
- [ ] Navigate to `/fm/hr/payroll`

**Status:** ⚠️ Needs implementation
**Files to update:** `app/fm/hr/**/*.tsx`

#### 5.3 CRM Module
- [ ] Navigate to `/fm/crm`
- [ ] Should show org prompt if no context
- [ ] Navigate to `/fm/crm/accounts/new`
- [ ] Navigate to `/fm/crm/leads/new`

**Status:** ⚠️ Needs implementation
**Files to update:** `app/fm/crm/**/*.tsx`

#### 5.4 Support Dashboard
- [ ] Navigate to `/fm/support/tickets/new`
- [ ] Should show org prompt if no context

**Status:** ⚠️ Needs implementation
**Files to update:** `app/fm/support/**/*.tsx`

---

## Test 6: Edge Cases & Error Handling

### 6.1 Invalid Organization ID
- [ ] Manually set invalid org in SupportOrgSwitcher
- [ ] Navigate to guarded page
- [ ] Should show error or fallback to prompt

**Expected:** Graceful error handling

### 6.2 API Failures
- [ ] Disconnect network temporarily
- [ ] Try to search organizations in switcher
- [ ] Should show error message

**Expected:** User-friendly error, no crash

### 6.3 Session Expiry
- [ ] Clear cookies/session
- [ ] Try to access guarded page
- [ ] Should redirect to login

**Expected:** Auth guard triggers before org guard

---

## Results Documentation

### Test Execution Log

| Test | Status | Notes | Issues Found |
|------|--------|-------|--------------|
| 1. SupportOrgSwitcher E2E | ☐ Pass / ☐ Fail | | |
| 2. Org-Guard Without Context | ☐ Pass / ☐ Fail | | |
| 3. Tenant Context Data Scoping | ☐ Pass / ☐ Fail | | |
| 4. Translation Keys | ☐ Pass / ☐ Fail | | |
| 5. Extend to Uncovered Modules | ☐ Pass / ☐ Fail | | |
| 6. Edge Cases | ☐ Pass / ☐ Fail | | |

### Issues Found

| ID | Severity | Component | Description | Fix Required |
|----|----------|-----------|-------------|--------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### Screenshots Required
- [ ] SupportOrgSwitcher in TopBar
- [ ] Organization search dropdown
- [ ] Org selection prompt (EN)
- [ ] Org selection prompt (AR)
- [ ] Data scoping before/after org switch

---

## Follow-up Actions

### After Manual Testing

1. **If Tests Pass:**
   ```bash
   # Re-run deployment verification
   ./scripts/run-deployment-check.sh --skip-tests
   
   # Update CI documentation
   # Document verified flows in DEPLOYMENT_NEXT_STEPS.md
   ```

2. **If Tests Fail:**
   - Document exact failure in Issues table above
   - Create GitHub issue with reproduction steps
   - Fix implementation before proceeding

3. **Extend to Remaining Modules:**
   ```typescript
   // Pattern to apply to all uncovered pages:
   // 1. Import useSupportOrg hook
   // 2. Add org guard at top of component
   // 3. Add translation keys
   // 4. Test manually
   ```

---

## Verification Script Updates Needed

✅ **Done.** Run the automated checks anytime via:

```bash
# Static guard coverage + translation + API verification + smoke tests
pnpm verify:org-context
```

This command runs `scripts/verify-org-context.ts` (guard coverage, translation keys, API exports) and executes the Vitest smoke tests located in:

- `tests/smoke/org-context-flow.test.tsx`
- `tests/server/support/support-org-apis.test.ts`

These are now wired into both `scripts/verify-deployment-readiness.sh` (Step 4) and `.github/workflows/route-quality.yml`, so CI will fail if either the static guard checks or the SupportOrgSwitcher smoke tests regress.

---

## Success Criteria

✅ SupportOrgSwitcher loads and searches organizations  
✅ Organization selection persists in session/context  
✅ All FM finance pages show org prompt when context missing  
✅ Data correctly scopes to selected organization  
✅ Translation keys exist for EN/AR  
✅ Remaining FM modules extended with org guards  
✅ Verification scripts updated with new checks  
✅ CI workflow includes org guard smoke tests

---

**Current Status:** 🔴 Manual testing required before deployment

**Next Step:** Execute tests above, document results, fix any failures

**Estimated Time:** 30-45 minutes for complete smoke test
