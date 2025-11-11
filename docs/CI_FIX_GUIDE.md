# CI/CD Fix Guide - Get All 10 Checks Passing

**Status**: Currently 5/9 passing  
**Goal**: 10/10 green checks ✅  
**Branch**: `fix/unhandled-promises-batch1`  
**PR**: #273

---

## Current Status Summary

### ✅ Passing (5)
1. ✅ **verify** - TypeScript compilation check
2. ✅ **check** - Code quality checks
3. ✅ **build (20.x)** - Next.js production build
4. ✅ **Scan for exposed secrets** - Secret scanning
5. ✅ **Secret Scanning** - Advanced secret detection

### ❌ Failing (4)
1. ❌ **gates** - Quality gates (unit tests)
2. ❌ **Analyze Code (javascript)** - CodeQL analysis
3. ❌ **npm Security Audit** - Dependency vulnerabilities
4. ❌ **Dependency Review** - Advanced Security not enabled

---

## Fix #1: Quality Gates (gates) ⚠️ CRITICAL

**Root Cause**: Missing test environment variables in GitHub secrets.

**Error Message**:
```
Error: Missing required environment variables: TEST_SUPERADMIN_EMAIL, TEST_SUPERADMIN_PASSWORD, 
TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_MANAGER_EMAIL, TEST_MANAGER_PASSWORD, 
TEST_TECHNICIAN_EMAIL, TEST_TECHNICIAN_PASSWORD, TEST_TENANT_EMAIL, TEST_TENANT_PASSWORD, 
TEST_VENDOR_EMAIL, TEST_VENDOR_PASSWORD
```

**Solution**: Add GitHub repository secrets

### Step-by-Step Fix:

1. Go to: https://github.com/EngSayh/Fixzit/settings/secrets/actions

2. Click "New repository secret" and add each variable:

```bash
# SUPER ADMIN TEST ACCOUNT
TEST_SUPERADMIN_EMAIL=test-superadmin@fixzit.local
TEST_SUPERADMIN_PASSWORD=TestSuperAdmin@2025!

# ADMIN TEST ACCOUNT
TEST_ADMIN_EMAIL=test-admin@fixzit.local
TEST_ADMIN_PASSWORD=TestAdmin@2025!

# MANAGER TEST ACCOUNT
TEST_MANAGER_EMAIL=test-manager@fixzit.local
TEST_MANAGER_PASSWORD=TestManager@2025!

# TECHNICIAN TEST ACCOUNT
TEST_TECHNICIAN_EMAIL=test-technician@fixzit.local
TEST_TECHNICIAN_PASSWORD=TestTechnician@2025!

# TENANT TEST ACCOUNT
TEST_TENANT_EMAIL=test-tenant@fixzit.local
TEST_TENANT_PASSWORD=TestTenant@2025!

# VENDOR TEST ACCOUNT
TEST_VENDOR_EMAIL=test-vendor@fixzit.local
TEST_VENDOR_PASSWORD=TestVendor@2025!
```

**Total**: 12 secrets to add

**Expected Result**: ✅ gates check will pass after re-running workflow

---

## Fix #2: npm Security Audit ⚠️ BLOCKER

**Root Cause**: pnpm not installed in CI runner

**Error Message**:
```
##[error]Unable to locate executable file: pnpm. Please verify either the file path exists 
or the file can be found within a directory specified by the PATH environment variable.
```

**Solution**: Update `.github/workflows/security-audit.yml`

### Required Changes:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'  # ❌ This expects pnpm to exist

# ADD THIS STEP BEFORE Setup Node.js:
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9
```

**File to edit**: `.github/workflows/security-audit.yml`

**Expected Result**: ✅ npm Security Audit check will pass

---

## Fix #3: Dependency Review ℹ️ REPOSITORY SETTING

**Root Cause**: GitHub Advanced Security not enabled

**Error Message**:
```
##[error]Dependency review is not supported on this repository. 
Please ensure that Dependency graph is enabled along with GitHub Advanced Security
```

**Solution**: Enable in repository settings

### Step-by-Step Fix:

1. Go to: https://github.com/EngSayh/Fixzit/settings/security_analysis

2. Under "Dependency graph":
   - ✅ Enable "Dependency graph"

3. Under "GitHub Advanced Security" (requires GitHub Enterprise or public repo):
   - ✅ Enable "Dependency review"

**Alternative**: If Advanced Security is not available, **disable this check** in the workflow:

Edit `.github/workflows/dependency-review.yml`:
```yaml
# Comment out or remove the workflow trigger, OR:
on:
  pull_request:
    branches: [ main ]
  # Only run on specific labels if needed
  # types: [labeled]
```

**Expected Result**: ✅ Dependency Review check will pass (or be skipped)

---

## Fix #4: CodeQL Analysis (JavaScript) ⚠️ CODE ISSUE

**Root Cause**: Code quality issues detected by CodeQL

**Solution**: Review and fix flagged issues

### Step-by-Step Fix:

1. View CodeQL results:
   ```bash
   gh run view 19269453413 --log-failed | grep -A 30 "Error"
   ```

2. Common issues:
   - SQL injection vulnerabilities
   - XSS vulnerabilities
   - Path traversal issues
   - Prototype pollution
   - Unvalidated redirects

3. Fix each issue and re-run CI

**Expected Result**: ✅ CodeQL check will pass after fixes

---

## Quick Fix Commands (Run from repository root)

### 1. Check current CI status
```bash
gh pr view 273 --json statusCheckRollup --jq '.statusCheckRollup[] | {name: .name, status: .status, conclusion: .conclusion}'
```

### 2. Re-run failed checks (after adding secrets)
```bash
gh run rerun 19269453394  # Quality Gates
gh run rerun 19269453447  # Security Audit
gh run rerun 19269453413  # CodeQL
```

### 3. Monitor all checks
```bash
gh run watch
```

---

## Expected Final State

After all fixes:

```
✅ verify                    - TypeScript compilation
✅ check                     - Code quality
✅ build (20.x)             - Production build
✅ gates                     - Unit tests (after secrets added)
✅ Analyze Code (javascript) - CodeQL (after code fixes)
✅ npm Security Audit        - Dependencies (after pnpm fix)
✅ Dependency Review         - Advanced Security (after enabling)
✅ Scan for exposed secrets  - Secret scanning
✅ Secret Scanning           - Advanced detection
✅ Consolidation Guardrails  - Merge safety
```

**Target**: 10/10 green checks ✅

---

## Priority Order

1. **CRITICAL** - Add GitHub secrets (Fix #1) - 5 minutes
2. **HIGH** - Fix pnpm in Security Audit (Fix #2) - 2 minutes
3. **MEDIUM** - Enable Dependency Review (Fix #3) - 1 minute (or disable check)
4. **MEDIUM** - Fix CodeQL issues (Fix #4) - Variable time

---

## Verification

After all fixes:

```bash
# Check PR status
gh pr checks 273

# View detailed status
gh pr view 273 --json statusCheckRollup --jq '.statusCheckRollup[] | select(.conclusion == "FAILURE")'

# Should return empty if all passing!
```

---

**Last Updated**: 2025-11-11  
**Author**: Engineering Team  
**Related PR**: #273
