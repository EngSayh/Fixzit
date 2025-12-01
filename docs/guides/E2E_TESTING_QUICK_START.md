# 🚀 E2E Testing Quick Start Guide

## Ready to Test? Start Here! 👇

### 1. Start the Dev Server

```bash
cd /workspaces/Fixzit
pnpm dev
```

**Server URL:** <http://localhost:3000> (or 3001/3002 if port in use)

---

### 2. Verify Authentication Works

Test Super Admin login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@fixzit.co","password":"admin123"}'
```

**Expected Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "superadmin@fixzit.co",
    "role": "super_admin",
    "orgId": "..."
  }
}
```

---

### 3. Test All 14 Users (Quick Verification)

Copy and paste this entire block:

```bash
# Test all 14 users
for email in \
  "superadmin@fixzit.co" \
  "corp.admin@fixzit.co" \
  "property.manager@fixzit.co" \
  "ops.dispatcher@fixzit.co" \
  "supervisor@fixzit.co" \
  "tech.internal@fixzit.co" \
  "vendor.admin@fixzit.co" \
  "vendor.tech@fixzit.co" \
  "tenant.resident@fixzit.co" \
  "owner.landlord@fixzit.co" \
  "finance.manager@fixzit.co" \
  "hr.manager@fixzit.co" \
  "helpdesk.agent@fixzit.co" \
  "auditor.compliance@fixzit.co"
do
  echo "Testing: $email"
  curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Password123\"}" | \
    jq -r 'if .token then "✅ SUCCESS" else "❌ FAILED: " + .error end'
  echo ""
done
```

**Expected:** All users should show ✅ SUCCESS

---

### 4. Begin Browser E2E Testing

#### Open Browser

Navigate to: **<http://localhost:3000/login>**

#### Testing Checklist (50 minutes per user)

**📋 For Each User:**

1. **Login** (5 min)
   - [ ] Enter credentials
   - [ ] Click login button
   - [ ] Verify successful redirect to dashboard
   - [ ] Screenshot: Login success

2. **Dashboard** (10 min)
   - [ ] Page loads without errors
   - [ ] Role-specific widgets visible
   - [ ] Data displays correctly
   - [ ] Screenshot: Dashboard view

3. **Navigation** (10 min)
   - [ ] All menu items accessible
   - [ ] Sidebar navigation works
   - [ ] TopBar links functional
   - [ ] No 404 or 403 errors
   - [ ] Screenshot: Navigation menu

4. **Core Features** (20 min)
   - [ ] Role-specific actions available
   - [ ] Forms submit successfully
   - [ ] Data CRUD operations work
   - [ ] Permissions enforced
   - [ ] Screenshot: Key feature pages

5. **Permissions** (3 min)
   - [ ] Can access allowed pages
   - [ ] Cannot access restricted pages
   - [ ] Proper error messages shown
   - [ ] Screenshot: Permission denied (if applicable)

6. **Logout** (2 min)
   - [ ] Logout button works
   - [ ] Redirected to login
   - [ ] Session cleared
   - [ ] Cannot access protected pages

#### Document Results

After each user, update `docs/testing/E2E_TEST_RESULTS.md`:

```markdown
### [User Role] - [Email]

- **Status:** ✅ Pass / ⚠️ Issues Found / ❌ Failed
- **Issues:**
  1. [Severity] Brief description
  2. [Severity] Brief description
- **Screenshots:** [Folder/User-Role/]
- **Notes:** Any observations
```

---

### 5. Testing Order (Recommended)

#### Session 1 (4 hours) - Admin & Management

1. Super Admin (<superadmin@fixzit.co>)
2. Corporate Admin (<corp.admin@fixzit.co>)
3. Property Manager (<property.manager@fixzit.co>)
4. Operations Dispatcher (<ops.dispatcher@fixzit.co>)
5. Supervisor (<supervisor@fixzit.co>)

#### Session 2 (4 hours) - Operational Roles

6. Internal Technician (<tech.internal@fixzit.co>)
7. Vendor Admin (<vendor.admin@fixzit.co>)
8. Vendor Technician (<vendor.tech@fixzit.co>)
9. Tenant/Resident (<tenant.resident@fixzit.co>)
10. Owner/Landlord (<owner.landlord@fixzit.co>)

#### Session 3 (3.5 hours) - Support & Compliance

11. Finance Manager (<finance.manager@fixzit.co>)
12. HR Manager (<hr.manager@fixzit.co>)
13. Helpdesk Agent (<helpdesk.agent@fixzit.co>)
14. Auditor/Compliance (<auditor.compliance@fixzit.co>)

---

### 6. Issue Tracking Template

When you find an issue:

```markdown
#### Issue #[N]: [Brief Title]

- **Severity:** Critical / High / Medium / Low
- **User Role:** [Role that encountered issue]
- **Location:** [Page/Component]
- **Description:** [Detailed description]
- **Steps to Reproduce:**
  1. Step 1
  2. Step 2
  3. Step 3
- **Expected:** [What should happen]
- **Actual:** [What actually happened]
- **Screenshot:** [Path to screenshot]
- **Error Message:** [If any]
```

---

### 7. Useful Commands

```bash
# Check MongoDB
docker ps | grep mongo

# View dev server logs
tail -f /tmp/nextjs-dev.log

# Check server health
curl http://localhost:3000/api/qa/health

# Restart dev server
pkill -f "next dev" && pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

### 8. Credentials Reference

**All users:** Password `Password123`

| #   | Email                          | Role                  | Organization     |
| --- | ------------------------------ | --------------------- | ---------------- |
| 1   | <superadmin@fixzit.co>         | super_admin           | platform-org-001 |
| 2   | <corp.admin@fixzit.co>         | corporate_admin       | acme-corp-001    |
| 3   | <property.manager@fixzit.co>   | property_manager      | acme-corp-001    |
| 4   | <ops.dispatcher@fixzit.co>     | operations_dispatcher | acme-corp-001    |
| 5   | <supervisor@fixzit.co>         | supervisor            | acme-corp-001    |
| 6   | <tech.internal@fixzit.co>      | technician_internal   | acme-corp-001    |
| 7   | <vendor.admin@fixzit.co>       | vendor_admin          | acme-corp-001    |
| 8   | <vendor.tech@fixzit.co>        | vendor_technician     | acme-corp-001    |
| 9   | <tenant.resident@fixzit.co>    | tenant_resident       | acme-corp-001    |
| 10  | <owner.landlord@fixzit.co>     | owner_landlord        | acme-corp-001    |
| 11  | <finance.manager@fixzit.co>    | finance_manager       | acme-corp-001    |
| 12  | <hr.manager@fixzit.co>         | hr_manager            | acme-corp-001    |
| 13  | <helpdesk.agent@fixzit.co>     | helpdesk_agent        | acme-corp-001    |
| 14  | <auditor.compliance@fixzit.co> | auditor_compliance    | acme-corp-001    |

---

### 9. Success Criteria

**Before declaring Phase 5 complete:**

- [ ] All 14 users can successfully login
- [ ] All 14 users can access their dashboards
- [ ] Role-specific features work for each user
- [ ] Permissions properly enforced
- [ ] No critical or high severity blocking bugs
- [ ] All results documented in docs/testing/E2E_TEST_RESULTS.md
- [ ] Screenshots captured for each user
- [ ] Issues categorized and prioritized

---

### 10. Documentation Files

- **Testing Plan:** `docs/guides/E2E_TESTING_PLAN.md`
- **Test Results:** `docs/testing/E2E_TEST_RESULTS.md`
- **Blockers Fixed:** `docs/archived/E2E_TESTING_BLOCKERS_RESOLVED.md`
- **Session Report:** `docs/archived/progress/PHASE5_AUTH_DEBUG_SESSION.md`
- **Session Summary:** `/PHASE5_SESSION_SUMMARY.md`
- **This Guide:** `/E2E_TESTING_QUICK_START.md`

---

## 🎯 You Are Here

✅ Phase 1-4: Complete (File org, console cleanup, type safety, error elimination)  
✅ Phase 5 Infrastructure: Complete (MongoDB, users, docs)  
✅ Phase 5 Authentication: Complete (5 critical bugs fixed)  
🔄 Phase 5 E2E Testing: **READY TO BEGIN** ⬅️ YOU ARE HERE  
⏳ Phase 6: Final Verification (Pending)

---

## 🚦 Ready? Let's Go

**Start with Step 1 above** ☝️

Good luck with the testing! 🚀

---

**Need Help?**

- All authentication bugs are fixed ✅
- Test users are seeded and ready ✅
- Documentation is comprehensive ✅
- You've got this! 💪
