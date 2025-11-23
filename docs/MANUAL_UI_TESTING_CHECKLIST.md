# Manual UI Testing Checklist

**Status:** Ready for Execution  
**Prerequisites:** `pnpm dev` server running on http://localhost:3000  
**Date:** November 18, 2025

---

## Quick Status Dashboard
| Suite | Status | Last Run | Owner | Notes |
|-------|--------|----------|-------|-------|
| FM Workflow Navigation | 🚧 Pending | _TBD_ | QA Team | Requires seeded demo data for dashboards + KPIs. |
| Navigation & Sidebar (RBAC) | 🚧 Pending | _TBD_ | QA Team | Needs four role fixtures (Superadmin + three manager variants). |
| Support Organization Switcher | 🔴 Blocked | _TBD_ | Support QA | Blocked until support user + org records exist in DB. |
| Translation & i18n | 🟡 Partial | _TBD_ | Localization QA | Keys available; still validating finance + toast flows. |
| New Features Smoke Tests | 🟡 Partial | _TBD_ | Feature QA | Compliance + CRM forms ready; PM to confirm required data seeds. |
| Performance & Memory | 🟢 Ready | _Not Run_ | Platform QA | Scripts ready; safe to execute after suites 1-5 pass. |

---

## Prerequisites Verification

Before starting manual tests:

```bash
# 1. Start development server
# From the project root, run:
pnpm dev

# 2. Verify server is responding
curl -I http://localhost:3000/login

# 3. Check MongoDB connection
# Should see connection logs in terminal without errors
```

**Expected:** Server starts on port 3000, MongoDB connects successfully

---

## Test Data & Safety Notes
- **Superadmin login:** `admin@fixzit.com` / `<admin-password>` stored in 1Password → \"Fixzit Superadmin (Dev)\".
- **Manager - Standard plan:** `manager.standard@fixzit.com` / password per vault.
- **Manager - Premium plan:** `manager.premium@fixzit.com` / password per vault.
- **Support user:** `support@fixzit.com` – ensure `canImpersonate=true` and at least two organizations exist for switcher tests.
- **Org fixtures:** Run `pnpm tsx scripts/seed-demo-users.ts` followed by `node scripts/create-test-data.js` to ensure org, property, and work-order data exist before suites 3 & 4.
- **Cleanup:** After impersonation, hit `/api/support/impersonation` `DELETE` to avoid polluting other suites. **Note:** For manual cookie clearing, see `/app/logout/page.tsx` for proper implementation (requires clearing Secure variants: `__Secure-*`, `__Host-*`).

---

## Test Suite 1: FM Workflow Navigation

### Objective
Verify all FM (Facilities Management) module pages load correctly with proper translations and navigation.

### Test Cases

#### TC-1.1: FM Dashboard Access
- [ ] Navigate to `/fm/dashboard`
- [ ] Verify dashboard loads without errors
- [ ] Check that KPI cards display (work orders, properties, tenants)
- [ ] Verify quick actions are visible
- [ ] **Language Toggle:** Switch to Arabic (AR), verify RTL layout
- [ ] Switch back to English (EN)

**Expected:** Dashboard loads with proper data structure, translations work

#### TC-1.2: FM Finance Module
- [ ] Navigate to `/fm/finance/budgets`
- [ ] Verify budget list page loads
- [ ] Check table headers display in current language
- [ ] Click "Create Budget" button → should navigate to `/fm/finance/budgets/new`
- [ ] Verify form fields are translated
- [ ] Check validation messages appear in correct language
- [ ] Test form submission (can use dummy data)
- [ ] Navigate to `/fm/finance/expenses`
- [ ] Navigate to `/fm/finance/payments`
- [ ] Navigate to `/fm/finance/invoices`

**Expected:** All finance pages load, translations display correctly

#### TC-1.3: FM Properties Module
- [ ] Navigate to `/fm/properties`
- [ ] Verify property list loads
- [ ] Click "Add Property" → navigate to `/fm/properties/new`
- [ ] Test property form validation
- [ ] Navigate to `/fm/properties/units`
- [ ] Navigate to `/fm/properties/inspections`
- [ ] Navigate to `/fm/properties/leases`
- [ ] Navigate to `/fm/properties/documents`

**Expected:** Property management flows work end-to-end

#### TC-1.4: FM Work Orders
- [ ] Navigate to `/fm/work-orders/board`
- [ ] Verify Kanban board displays
- [ ] Check work order cards render
- [ ] Navigate to `/fm/work-orders/new`
- [ ] Test work order creation form
- [ ] Navigate to `/fm/work-orders/approvals`
- [ ] Navigate to `/fm/work-orders/history`
- [ ] Navigate to `/fm/work-orders/pm` (preventive maintenance)

**Expected:** Work order management system functional

#### TC-1.5: FM HR Module
- [ ] Navigate to `/fm/hr/directory`
- [ ] Verify employee directory loads
- [ ] Navigate to `/fm/hr/employees`
- [ ] Navigate to `/fm/hr/recruitment`
- [ ] Navigate to `/fm/hr/leave`
- [ ] Navigate to `/fm/hr/leave/approvals`
- [ ] Navigate to `/fm/hr/payroll`
- [ ] Navigate to `/fm/hr/payroll/run`

**Expected:** HR module pages accessible and functional

#### TC-1.6: FM Compliance Module
- [ ] Navigate to `/fm/compliance`
- [ ] Verify compliance dashboard loads
- [ ] Navigate to `/fm/compliance/audits` (NEW PAGE)
- [ ] Navigate to `/fm/compliance/policies` (NEW PAGE)
- [ ] Navigate to `/fm/compliance/contracts/new`
- [ ] Test contract form

**Expected:** New compliance pages load correctly

#### TC-1.7: FM CRM Module
- [ ] Navigate to `/fm/crm`
- [ ] Verify CRM dashboard loads with overview metrics
- [ ] Navigate to `/fm/crm/accounts/new`
- [ ] Test account creation form
- [ ] Navigate to `/fm/crm/leads/new`
- [ ] Test lead creation form

**Expected:** CRM integration works

---

## Test Suite 2: Navigation & Sidebar (RBAC)

### Objective
Verify sidebar navigation adapts correctly based on user role and subscription plan.

### Setup
```typescript
// Test with different user roles:
// 1. Superadmin (can see everything)
// 2. Manager (Standard plan)
// 3. Manager (Premium plan)
// 4. Standard user
```

#### TC-2.1: Superadmin Navigation
- [ ] Login as Superadmin
- [ ] Verify sidebar shows all modules:
  - Dashboard
  - FM (all submodules)
  - Marketplace
  - Finance
  - HR
  - System
  - CRM
  - Compliance
- [ ] Click each top-level menu item
- [ ] Verify all sub-items expand correctly

**Expected:** Superadmin sees complete navigation tree

#### TC-2.2: Manager (Standard Plan) Navigation
- [ ] Login as Manager with Standard plan
- [ ] Verify sidebar shows limited modules:
  - Dashboard
  - FM (basic modules only)
  - Properties
  - Work Orders
  - Tenants
- [ ] Verify Premium features are hidden:
  - Advanced Finance reports
  - CRM modules
  - Compliance modules
- [ ] Attempt to navigate to `/fm/crm` directly via URL
- [ ] **Expected:** Should redirect to unauthorized page or dashboard

**Expected:** Navigation restricted to Standard plan features

#### TC-2.3: Manager (Premium Plan) Navigation
- [ ] Login as Manager with Premium plan
- [ ] Verify sidebar shows extended modules:
  - Dashboard
  - FM (all submodules)
  - Finance (full access)
  - CRM
  - Compliance
  - Advanced Reports
- [ ] Navigate to `/fm/finance/reports`
- [ ] Navigate to `/fm/crm/accounts`
- [ ] Navigate to `/fm/compliance/audits`

**Expected:** Premium features accessible, navigation complete

#### TC-2.4: TopBar Module Switching
- [ ] Verify TopBar shows available modules
- [ ] Click "Facilities" → should stay in FM context
- [ ] Click "Marketplace" → should navigate to `/marketplace`
- [ ] Click "Finance" → should navigate to `/finance`
- [ ] Verify breadcrumbs update correctly
- [ ] Test module switcher dropdown

**Expected:** TopBar module switching works seamlessly

---

## Test Suite 3: Support Organization Switcher

### Objective
Verify the new SupportOrgSwitcher component allows support staff to impersonate organizations.

### Setup
```bash
# Must have support role user in database
# Test organization IDs should exist
```

#### TC-3.1: Organization Search
- [ ] Login as Support user
- [ ] Locate SupportOrgSwitcher in TopBar or Settings
- [ ] Click "Switch Organization"
- [ ] Search for organization by name
- [ ] Verify search results display

**Expected:** Organization search API returns results

#### TC-3.2: Organization Impersonation
- [ ] Select an organization from search results
- [ ] Click "Impersonate"
- [ ] Verify session switches to selected organization
- [ ] Check that sidebar updates to show org's accessible modules
- [ ] Navigate to `/fm/properties`
- [ ] Verify properties belong to impersonated organization

**Expected:** Impersonation works, data scoped correctly

#### TC-3.3: Exit Impersonation
- [ ] While impersonating, locate "Exit Impersonation" button
- [ ] Click to exit
- [ ] Verify session returns to support user's context
- [ ] Check sidebar returns to support user's permissions

**Expected:** Can safely exit impersonation mode

---

## Test Suite 4: Translation & i18n

### Objective
Verify translation system works across all new pages, especially FM finance module.

#### TC-4.1: Language Toggle
- [ ] Navigate to `/fm/finance/budgets`
- [ ] Current language: English
- [ ] Verify page title: "Budgets"
- [ ] Verify table headers: "Name", "Amount", "Period", "Status"
- [ ] Click language toggle → Switch to Arabic
- [ ] Verify page title changes to: "الميزانيات"
- [ ] Verify table headers translate
- [ ] Verify RTL layout applies

**Expected:** Complete translation coverage in finance module

#### TC-4.2: Form Validation Messages
- [ ] Navigate to `/fm/finance/expenses/new`
- [ ] Submit form without filling required fields
- [ ] Verify validation errors display in current language
- [ ] Switch language to Arabic
- [ ] Submit form again
- [ ] Verify validation errors now in Arabic

**Expected:** Validation messages are translated

#### TC-4.3: Toast Notifications
- [ ] Create a new budget (success scenario)
- [ ] Verify success toast displays in current language
- [ ] Switch to Arabic
- [ ] Create another budget
- [ ] Verify toast message in Arabic

**Expected:** Runtime notifications are translated

---

## Test Suite 5: New Features Smoke Tests

### TC-5.1: Route Metrics Dashboard
- [ ] Navigate to `/admin/route-metrics`
- [ ] Verify dashboard loads
- [ ] Check that route statistics display
- [ ] Verify charts render (if using Recharts)
- [ ] Check for any console errors

**Expected:** New admin dashboard functional

#### TC-5.2: Compliance Audit APIs
- [ ] Navigate to `/fm/compliance/audits`
- [ ] Click "Create Audit"
- [ ] Fill audit form
- [ ] Submit
- [ ] Verify audit appears in list
- [ ] Check API call in Network tab: `/api/compliance/audits`

**Expected:** Compliance audit CRUD works

#### TC-5.3: CRM Lead Management
- [ ] Navigate to `/fm/crm/leads/new`
- [ ] Fill lead form with test data
- [ ] Submit
- [ ] Verify API call: `/api/crm/leads`
- [ ] Check lead activity logging: `/api/crm/leads/log-call`

**Expected:** CRM lead creation successful

---

## Test Suite 6: Performance & Memory

### Objective
Verify system stability after VS Code memory optimization.

#### TC-6.1: Memory Baseline
```bash
# Before testing
ps aux | grep -E "Code|node" | awk '{sum+=$6} END {print "Memory: " sum/1024 " MB"}'
```

#### TC-6.2: Heavy Navigation Test
- [ ] Rapidly navigate between 10 different pages
- [ ] `/fm/dashboard` → `/fm/finance` → `/fm/properties` → `/fm/work-orders` → `/fm/hr` → `/fm/crm` → `/fm/compliance` → `/marketplace` → `/admin` → `/dashboard`
- [ ] Check for memory leaks in browser DevTools
- [ ] Monitor VS Code memory usage

#### TC-6.3: Memory After Testing
```bash
# After testing
ps aux | grep -E "Code|node" | awk '{sum+=$6} END {print "Memory: " sum/1024 " MB"}'
```

**Expected:** Memory stays under 12GB, no significant leaks

---

## Test Execution Log

### Session Information
- **Date:** _____________
- **Tester:** _____________
- **Environment:** Local Dev (`pnpm dev`)
- **Browser:** _____________
- **Node Version:** `node --version` → _____________

### Test Results Summary

| Test Suite | Pass | Fail | Skip | Notes |
|------------|------|------|------|-------|
| FM Workflow Navigation | ☐ | ☐ | ☐ | |
| Navigation & Sidebar (RBAC) | ☐ | ☐ | ☐ | |
| Support Org Switcher | ☐ | ☐ | ☐ | |
| Translation & i18n | ☐ | ☐ | ☐ | |
| New Features Smoke Tests | ☐ | ☐ | ☐ | |
| Performance & Memory | ☐ | ☐ | ☐ | |

### Issues Found

| ID | Severity | Page/Component | Description | Status |
|----|----------|----------------|-------------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### Screenshots

Attach screenshots for:
- [ ] FM Finance module (EN & AR)
- [ ] Sidebar with different roles
- [ ] Support org switcher
- [ ] Any errors encountered

---

## Automated Follow-up

After manual testing, run:

```bash
# 1. Generate route health report
pnpm verify:routes:http

# 2. Check test coverage
pnpm test:coverage

# 3. Review memory optimization results
./scripts/emergency-memory-cleanup.sh --report
```

---

## Sign-off

- [ ] All critical paths tested
- [ ] Translations verified for EN/AR
- [ ] RBAC working correctly
- [ ] No blocking issues found
- [ ] Ready for deployment

**Tester Signature:** _____________  
**Date:** _____________

---

**Next Steps After Testing:**
1. Push changes to trigger `.github/workflows/route-quality.yml`
2. Update status table in `DEPLOYMENT_NEXT_STEPS.md`
3. Document any issues in GitHub Issues
4. Schedule deployment window
