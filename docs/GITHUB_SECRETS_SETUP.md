# GitHub Secrets Setup Guide

**URGENT ACTION REQUIRED** - Complete this to enable CI tests

---

## 📋 What You Need to Do

Add 12 test account secrets to GitHub repository settings. This takes **5 minutes**.

---

## 🔗 Direct Link

👉 **Go here now**: https://github.com/EngSayh/Fixzit/settings/secrets/actions

---

## 📝 Step-by-Step Instructions

### 1. Navigate to Secrets Page

- Click the link above, OR
- Go to your repository → Settings → Secrets and variables → Actions

### 2. Add Each Secret

Click **"New repository secret"** button and add the following:

---

### Secret #1: TEST_SUPERADMIN_EMAIL

```
Name: TEST_SUPERADMIN_EMAIL
Value: test-superadmin@fixzit.local
```

### Secret #2: TEST_SUPERADMIN_PASSWORD

```
Name: TEST_SUPERADMIN_PASSWORD
Value: TestSuperAdmin@2025!
```

---

### Secret #3: TEST_ADMIN_EMAIL

```
Name: TEST_ADMIN_EMAIL
Value: test-admin@fixzit.local
```

### Secret #4: TEST_ADMIN_PASSWORD

```
Name: TEST_ADMIN_PASSWORD
Value: TestAdmin@2025!
```

---

### Secret #5: TEST_MANAGER_EMAIL

```
Name: TEST_MANAGER_EMAIL
Value: test-manager@fixzit.local
```

### Secret #6: TEST_MANAGER_PASSWORD

```
Name: TEST_MANAGER_PASSWORD
Value: TestManager@2025!
```

---

### Secret #7: TEST_TECHNICIAN_EMAIL

```
Name: TEST_TECHNICIAN_EMAIL
Value: test-technician@fixzit.local
```

### Secret #8: TEST_TECHNICIAN_PASSWORD

```
Name: TEST_TECHNICIAN_PASSWORD
Value: TestTechnician@2025!
```

---

### Secret #9: TEST_TENANT_EMAIL

```
Name: TEST_TENANT_EMAIL
Value: test-tenant@fixzit.local
```

### Secret #10: TEST_TENANT_PASSWORD

```
Name: TEST_TENANT_PASSWORD
Value: TestTenant@2025!
```

---

### Secret #11: TEST_VENDOR_EMAIL

```
Name: TEST_VENDOR_EMAIL
Value: test-vendor@fixzit.local
```

### Secret #12: TEST_VENDOR_PASSWORD

```
Name: TEST_VENDOR_PASSWORD
Value: TestVendor@2025!
```

---

## ✅ Verification

After adding all 12 secrets, you should see them listed (values will be hidden):

```
TEST_SUPERADMIN_EMAIL     ****  Updated now
TEST_SUPERADMIN_PASSWORD  ****  Updated now
TEST_ADMIN_EMAIL          ****  Updated now
TEST_ADMIN_PASSWORD       ****  Updated now
TEST_MANAGER_EMAIL        ****  Updated now
TEST_MANAGER_PASSWORD     ****  Updated now
TEST_TECHNICIAN_EMAIL     ****  Updated now
TEST_TECHNICIAN_PASSWORD  ****  Updated now
TEST_TENANT_EMAIL         ****  Updated now
TEST_TENANT_PASSWORD      ****  Updated now
TEST_VENDOR_EMAIL         ****  Updated now
TEST_VENDOR_PASSWORD      ****  Updated now
```

---

## 🚀 After Setup

1. **Re-run the failed workflows**:

   ```bash
   gh run rerun --failed
   ```

2. **Monitor the CI checks**:
   - Go to PR #273: https://github.com/EngSayh/Fixzit/pull/273
   - Wait for checks to complete (~3-5 minutes)
   - All checks should turn green ✅

3. **Expected Result**:
   - Quality Gates: ✅ PASS (was failing due to missing secrets)
   - Security Audit: ✅ PASS (fixed pnpm installation)
   - All other checks: ✅ PASS

---

## 🔒 Security Notes

- These test accounts are for **CI/CD only**
- Passwords use strong format (uppercase, lowercase, number, special char)
- Update passwords regularly in production environments
- Never commit `.env.test` file to git (it's gitignored)

---

## ❓ Troubleshooting

### If CI still fails after adding secrets:

1. **Check secret names are exact** (case-sensitive, no typos)
2. **Ensure no extra spaces** in secret values
3. **Re-run workflows** from GitHub Actions tab
4. **Check workflow logs** for detailed error messages

### Get help:

```bash
gh run view --log-failed  # View failed workflow logs
gh pr checks 273          # Check PR status
```

---

**Status**: ⏳ Waiting for you to add secrets  
**Time Required**: 5 minutes  
**Impact**: Enables all CI tests to run successfully
