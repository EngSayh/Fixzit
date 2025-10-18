# E2E Testing Plan - All 14 User Roles

**Branch**: `feat/batch2-code-improvements`  
**Date**: October 15, 2025  
**Status**: Starting Phase 5

---

## 🎯 Objective

Test all 14 user roles systematically across the Fixzit platform to verify:

- Authentication and authorization
- Role-specific access controls
- Feature availability by role
- UI/UX for each user type
- Permission enforcement

---

## 👥 14 User Roles to Test

Based on `/scripts/seed-auth-14users.mjs`, all users share password: `Password123`

### 1. Platform Admin

- **Email**: `superadmin@fixzit.co`
- **Role**: `super_admin`
- **Employee ID**: SA001
- **Expected Access**: ALL systems, ALL modules, full platform control

### 2. Corporate Admin  

- **Email**: `corp.admin@fixzit.co`
- **Role**: `corporate_admin`
- **Employee ID**: CA001
- **Expected Access**: Organization-wide management, user provisioning, settings

### 3. Property Manager

- **Email**: `property.manager@fixzit.co`
- **Role**: `property_manager`
- **Employee ID**: PM001
- **Expected Access**: Properties, units, leases, work orders, tenants

### 4. Operations Dispatcher

- **Email**: `dispatcher@fixzit.co`
- **Role**: `operations_dispatcher`
- **Employee ID**: DISP001
- **Expected Access**: Work order dispatch, assignment, routing, scheduling

### 5. Supervisor

- **Email**: `supervisor@fixzit.co`
- **Role**: `supervisor`
- **Employee ID**: SUP001
- **Expected Access**: Field operations oversight, work orders, asset management

### 6. Technician (Internal)

- **Email**: `technician@fixzit.co`
- **Role**: `technician_internal`
- **Employee ID**: TECH001
- **Expected Access**: Assigned work orders, mobile tools, status updates

### 7. Vendor Admin

- **Email**: `vendor.admin@fixzit.co`
- **Role**: `vendor_admin`
- **Employee ID**: VEND001
- **Expected Access**: Vendor portal, marketplace, catalog management, orders

### 8. Vendor Technician

- **Email**: `vendor.tech@fixzit.co`
- **Role**: `vendor_technician`
- **Employee ID**: VTECH001
- **Expected Access**: Assigned vendor work orders, mobile interface

### 9. Tenant / Resident

- **Email**: `tenant@fixzit.co`
- **Role**: `tenant_resident`
- **Employee ID**: None
- **Expected Access**: Tenant portal, maintenance requests, rent payments, documents

### 10. Owner / Landlord

- **Email**: `owner@fixzit.co`
- **Role**: `owner_landlord`
- **Employee ID**: OWN001
- **Expected Access**: Property portfolio, financials, tenant management, reports

### 11. Finance Manager

- **Email**: `finance@fixzit.co`
- **Role**: `finance_manager`
- **Employee ID**: FIN001
- **Expected Access**: Invoicing, payments, ZATCA compliance, financial reports

### 12. HR Manager

- **Email**: `hr@fixzit.co`
- **Role**: `hr_manager`
- **Employee ID**: HR001
- **Expected Access**: Employee management, attendance, payroll, recruitment

### 13. Helpdesk Agent

- **Email**: `helpdesk@fixzit.co`
- **Role**: `helpdesk_agent`
- **Employee ID**: HELP001
- **Expected Access**: Support tickets, CRM, customer queries, knowledge base

### 14. Auditor / Compliance

- **Email**: `auditor@fixzit.co`
- **Role**: `auditor_compliance`
- **Employee ID**: AUD001
- **Expected Access**: Read-only access, audit logs, compliance reports

---

## 🧪 Testing Checklist (Per User)

For EACH of the 14 users:

### Phase A: Authentication (5 min)

- [ ] Navigate to `/login`
- [ ] Enter email and password
- [ ] Verify successful login
- [ ] Verify redirect to appropriate dashboard
- [ ] Check user profile displays correct role

### Phase B: Dashboard (5 min)

- [ ] Verify dashboard loads without errors
- [ ] Check role-specific widgets visible
- [ ] Verify statistics/metrics displayed
- [ ] Test quick action buttons
- [ ] Screenshot dashboard

### Phase C: Navigation (10 min)

- [ ] Check sidebar menu items
- [ ] Verify only authorized modules visible
- [ ] Test navigation to each accessible page
- [ ] Confirm unauthorized pages blocked (403/redirect)
- [ ] Test breadcrumbs work correctly

### Phase D: Core Features (15 min)

- [ ] Test primary user workflow
- [ ] Create/view/edit operations (if permitted)
- [ ] Verify data isolation (see only own org data)
- [ ] Test search functionality
- [ ] Test filters/sorting

### Phase E: Permissions (10 min)

- [ ] Attempt unauthorized action → expect error
- [ ] Verify role-specific buttons visible/hidden
- [ ] Check API calls return appropriate data
- [ ] Test cross-module permissions

### Phase F: Documentation (5 min)

- [ ] Screenshot critical pages
- [ ] Note any errors or issues
- [ ] Document unexpected behavior
- [ ] Log any missing features

**Total per user**: ~50 minutes  
**Total for 14 users**: ~12 hours

---

## 📋 Test Execution Plan

### Day 1 (Session 1): Platform & Core Admin

1. Super Admin (<superadmin@fixzit.co>)
2. Corporate Admin (<corp.admin@fixzit.co>)  
3. Property Manager (<property.manager@fixzit.co>)
4. Operations Dispatcher (<dispatcher@fixzit.co>)

### Day 1 (Session 2): Operations Team

5. Supervisor (<supervisor@fixzit.co>)
6. Technician Internal (<technician@fixzit.co>)
7. Vendor Admin (<vendor.admin@fixzit.co>)
8. Vendor Technician (<vendor.tech@fixzit.co>)

### Day 2: Customers & Support

9. Tenant/Resident (<tenant@fixzit.co>)
10. Owner/Landlord (<owner@fixzit.co>)
11. Finance Manager (<finance@fixzit.co>)
12. HR Manager (<hr@fixzit.co>)

### Day 2 (Final): Support & Compliance

13. Helpdesk Agent (<helpdesk@fixzit.co>)
14. Auditor/Compliance (<auditor@fixzit.co>)

---

## 🛠️ Prerequisites

### Environment Setup

```bash
# 1. Ensure MongoDB is running
docker-compose up -d mongodb

# 2. Seed test users
export SEED_PASSWORD="Password123"
node scripts/seed-auth-14users.mjs

# 3. Start dev server
pnpm dev
```

### Browser Setup

- Use incognito/private mode for each user test
- Clear cookies between user tests
- Chrome DevTools open to monitor console/network

### Documentation Tools

- Screenshot tool ready
- Issue tracking doc open
- Browser dev tools accessible

---

## 📊 Expected Outcomes

### Success Criteria

- ✅ All 14 users can log in successfully
- ✅ Each user sees only authorized modules
- ✅ Role-specific dashboards display correctly
- ✅ Permissions enforced at UI and API level
- ✅ No console errors during normal operation
- ✅ Data isolation works (users see only own org)

### Issues to Track

- Authentication failures
- Permission bypass vulnerabilities
- UI/UX inconsistencies by role
- Missing features for specific roles
- Console errors or warnings
- Performance issues

---

## 📝 Testing Documentation

Results will be recorded in:

- `/docs/E2E_TEST_RESULTS.md` - Detailed test results per user
- `/docs/E2E_ISSUES_FOUND.md` - Issues categorized by severity
- `/screenshots/e2e/` - Visual evidence directory

---

## 🚀 Next Steps After E2E

1. **Phase 5 Report**: Compile all E2E findings
2. **Issue Prioritization**: Categorize by severity
3. **Fix Critical Issues**: Address blockers immediately
4. **Phase 6**: Final verification and deployment prep

---

**Status**: Ready to begin E2E testing  
**Start Time**: TBD  
**Estimated Completion**: 12-16 hours
