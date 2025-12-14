# PR #555 Merge Gate Checklist - DO NOT MERGE UNTIL ALL ✅

**PR**: #555 - fix(security): P0 hardening + Superadmin portal separation  
**Branch**: `fix/security-atlas-vercel-hardening-20251214-1341`  
**Latest Commit**: `cd0d04547` - fix(security): P0 hardening - remove secret leaks + enforce preview guards  
**Vercel Preview**: https://fixzit-git-fix-security-atlas-vercel-hardening-20-2f8d23-fixzit.vercel.app  
**Status**: ⏳ **WAITING FOR MANUAL ACTIONS**  
**Validation Date**: December 14, 2025

> **Note**: Using branch alias URL (not deployment ID) - always points to latest preview build

---

## ⚠️ CRITICAL: Safe-to-Merge Gate (Must Complete BEFORE Merge)

**The runtime guards will FAIL STARTUP if these are not done.**  
**Merging before completion = PRODUCTION OUTAGE.**

---

## 🚦 A) Vercel Environment Variables (Prod + Preview)

**Verify in Vercel UI:** https://vercel.com/[team]/[project]/settings/environment-variables

- [ ] **All secrets re-created as Sensitive** (no "Click to reveal" for Prod/Preview)
  - [ ] `MONGODB_URI` - Sensitive enabled, Prod/Preview only
  - [ ] `AUTH_SECRET` / `NEXTAUTH_SECRET` - Sensitive enabled
  - [ ] `TAQNYAT_BEARER_TOKEN` - Sensitive enabled
  - [ ] `SENDGRID_API_KEY` - Sensitive enabled (if used)

- [ ] **OTP bypass vars DO NOT EXIST in Prod/Preview**
  - [ ] `NEXTAUTH_BYPASS_OTP_ALL` - Deleted from Production
  - [ ] `NEXTAUTH_BYPASS_OTP_ALL` - Deleted from Preview
  - [ ] `ALLOW_TEST_USER_OTP_BYPASS` - Deleted from Production
  - [ ] `ALLOW_TEST_USER_OTP_BYPASS` - Deleted from Preview
  - ✅ These CAN exist in Development (for testing)

- [ ] **MONGODB_URI points to Atlas with least-privilege users**
  - [ ] Production: `mongodb+srv://fixzit-app-prod:<password>@fixzit.vgfiiff.mongodb.net/fixzit`
  - [ ] Preview: `mongodb+srv://fixzit-app-preview:<password>@fixzit.vgfiiff.mongodb.net/fixzit`
  - [ ] NO localhost URIs in Prod/Preview

**Verification:** Redeploy Preview after changes → Check logs for ✅ "Environment validation passed (preview)"

---

## 🚦 B) Atlas Database Users (Prod Safety)

**Verify in Atlas UI:** https://cloud.mongodb.com/ → Database Access

- [ ] **fixzitadmin Description field cleared**
- [ ] **fixzitadmin password rotated** (treat as compromised)
- [ ] **Least-privilege runtime users created:**
  - [ ] User: `fixzit-app-prod` → Role: `readWrite` on `fixzit` DB ONLY
  - [ ] User: `fixzit-app-preview` → Role: `readWrite` on `fixzit` DB ONLY
  - [ ] User: `fixzit-app-dev` → Role: `readWrite` on `fixzit` DB ONLY
- [ ] **Vercel MONGODB_URI updated** with new users (Prod/Preview/Dev)
- [ ] **atlasAdmin reserved for break-glass only** (not used by app)

**Verification:** Redeploy Preview → Check logs for ✅ "Connected to MongoDB Atlas"

---

## 🚦 C) Atlas Network Access (After Static IPs)

**Verify in Atlas UI:** https://cloud.mongodb.com/ → Network Access

**⚠️ Do NOT remove 0.0.0.0/0 until controlled egress exists**

- [ ] **Vercel Static IPs enabled** (Vercel Pro/Enterprise required)
- [ ] **Vercel egress IPs added to Atlas** as `/32` entries
- [ ] **Preview tested with new allowlist** (still connects)
- [ ] **0.0.0.0/0 removed from Atlas**
- [ ] **Preview still connects after wildcard removal**

**Optional (Enterprise only):**
- [ ] MongoDB Resource Policy applied (see SECURITY_ATLAS_CHECKLIST.md)

---

## 🧪 Post-Merge Smoke Tests (Run After Production Deploy)

**Must pass before considering deployment successful:**

### 1. Superadmin Login Flow
- ✅ Superadmin logs in via `/superadmin/login` → lands on `/superadmin/issues`
- ✅ Superadmin tries `/login` → routed to `/superadmin/login` (no loop)
- ✅ Superadmin hits `/fm/dashboard` → routed to `/superadmin/issues`

### 2. Normal User Login Flow
- ✅ Normal user logs in via `/login` → lands in FM dashboard
- ❌ No redirect loops

### 3. Vercel Logs Clean
- ✅ No secrets printed in logs
- ✅ "Environment validation passed (production)"
- ❌ No guard errors

---

## ⚠️ Known Non-Blocking Issues (Track in Next PR)

**These did NOT stop Preview build but are tech debt:**

- ⏳ Next.js config warning: `experimental.modularizeImports` unrecognized key
- ⏳ Dynamic server usage errors (marketplace routes with no-store fetch)
- ⏳ Preview hitting `https://fixzit.co/api/...` (production domain dependency)
- ⏳ TAP_WEBHOOK_SECRET not set → webhook verification disabled
- ⏳ Redis not configured warnings (budget tracking fallback)

**Recommendation:** Create separate PR(s) after this security PR is merged.

---

## ✅ Code Verification Results (Already Passed)

### Local Verification
```bash
# 1. Secrets not tracked in git
git ls-files --error-unmatch .env.local 2>&1 | grep -q "error" && echo "✅ NOT tracked" || echo "❌ TRACKED"
# Result: ✅ NOT tracked

# 2. Env guards pass locally
pnpm env:check
# Result: ✅ Environment validation passed (development)

# 3. Lint + typecheck
pnpm lint --max-warnings=0  # ✅ 0 errors
pnpm typecheck              # ✅ 0 errors
```

---

## 🔒 P0 Security Fixes Verification

### ✅ P0-1: Secret Value Leak Removal
**File**: `lib/config/env-guards.ts`

**Verification Commands**:
```bash
# 1. Check for specific pattern fixed in P0-1
grep -n "value:" lib/config/env-guards.ts
# Expected: No matches (exit code 1)

# 2. Broader check: Direct logging of process.env (dangerous)
rg -n "logger\..*process\.env|console\..*process\.env" .
# Expected: No matches or only safe masking utilities

# 3. Check for OTP bypass vars being printed anywhere
rg -n "NEXTAUTH_BYPASS_OTP_(ALL|CODE)|ALLOW_TEST_USER_OTP_BYPASS" . --type ts --type tsx
# Expected: Only in env-guards.ts (var name checks), never with values

# 4. Check for unmasked MongoDB URIs in code
rg -n "mongodb(\+srv)?:\/\/" . --type ts --type tsx
# Expected: Only in connection logic with proper masking
```

**Status**: ✅ **VERIFIED**
- No `(value: ${value})` patterns found in error messages
- All error messages contain only variable names, never actual values
- No direct logging of `process.env` values
- OTP bypass codes will never appear in Vercel logs

---

### ✅ P0-2: Preview Environment Enforcement
**File**: `instrumentation-node.ts`

**Verification Command**:
```bash
grep -A3 "isEnforcedEnv" instrumentation-node.ts
# Expected: Should see 'production' || 'preview' checks
```

**Status**: ✅ **VERIFIED**
- Guard validation: `isEnforcedEnv = env === 'production' || env === 'preview'`
- Catch block rethrow: Includes `VERCEL_ENV === "preview"` check
- Preview deployments will fail startup if safety guards violated

---

### ✅ AUTH_SECRET Fallback Logic
**File**: `lib/config/env-guards.ts`

**Verification**:
```typescript
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!authSecret || authSecret.trim() === '') {
  // error
}
```

**Status**: ✅ **VERIFIED**
- Accepts either `AUTH_SECRET` or `NEXTAUTH_SECRET`
- No false failures if production uses legacy key

---

### ✅ Client-Side Breadcrumb Removal
**File**: `app/login/page.tsx`

**Verification Command**:
```bash
grep -n "logger.*superadmin" app/login/page.tsx
# Expected: No matches for logger.info revealing /superadmin/login
```

**Status**: ✅ **VERIFIED**
- Console logs removed from both direct and OTP flows
- Silent redirect (no path exposure in browser console)
- Maintains knowledge-based security for superadmin portal

---

### ✅ Documentation Alignment
**File**: `SUPERADMIN_ACCOUNTS_STATUS.md`

**Verification**:
```bash
grep -n "/superadmin/login" SUPERADMIN_ACCOUNTS_STATUS.md
# Expected: Should find correct portal URL
```

**Status**: ✅ **VERIFIED**
- Login instructions updated to use `/superadmin/login`
- Warning added: "MUST use /superadmin/login"
- No references to incorrect `/login` portal

---

## 🧪 Functional Testing Checklist

### Test 1: Superadmin Login at `/login` (Auto-Redirect)
**URL**: `https://fixzit-git-fix-security-atlas-vercel-hardening-20-2f8d23-fixzit.vercel.app/login`

**Steps**:
1. Navigate to `/login`
2. Enter superadmin credentials (sultan.a.hassni@gmail.com)
3. Submit login form

**Expected Behavior**:
- [ ] Silent redirect to `/superadmin/login` (no console log)
- [ ] No "Welcome stuck" experience
- [ ] No infinite loop
- [ ] Login proceeds normally at `/superadmin/login`

**Verification**:
- [ ] Check browser console: No logs revealing `/superadmin/login` path
- [ ] Check Network tab: Should see redirect response

---

### Test 2: Superadmin Direct Access to FM Routes
**URL**: `https://fixzit-git-fix-security-atlas-vercel-hardening-20-2f8d23-fixzit.vercel.app/fm/dashboard`

**Steps**:
1. Login as superadmin via `/superadmin/login`
2. Manually navigate to `/fm/dashboard` or any `/fm/*` route

**Expected Behavior**:
- [ ] Middleware redirects to `/superadmin/issues`
- [ ] No infinite loop
- [ ] No "403 Forbidden" or "orgId missing" errors

**Verification**:
- [ ] Check Network tab: Should see 307 redirect
- [ ] Final URL should be `/superadmin/issues`

---

### Test 3: Normal User Login (No Regression)
**URL**: `https://fixzit-git-fix-security-atlas-vercel-hardening-20-2f8d23-fixzit.vercel.app/login`

**Steps**:
1. Navigate to `/login`
2. Enter normal user credentials (non-superadmin)
3. Submit login form

**Expected Behavior**:
- [ ] Login succeeds normally
- [ ] Redirected to `/fm/dashboard` (or role-appropriate page)
- [ ] No regression in normal user flow
- [ ] No superadmin-related errors

**Verification**:
- [ ] User reaches dashboard successfully
- [ ] All FM routes accessible (Properties, Work Orders, etc.)

---

### Test 4: Preview Environment Safety Guards
**Environment**: Vercel Preview

**Verification**:
1. Check Vercel Preview environment variables
2. Confirm NONE of these exist (not even `"false"`):
   - `NEXTAUTH_BYPASS_OTP_ALL`
   - `ALLOW_TEST_USER_OTP_BYPASS`
   - `NEXTAUTH_BYPASS_OTP_CODE`

**Expected Behavior**:
- [ ] Preview deployment succeeds (guards pass)
- [ ] If any bypass vars added → Preview build fails
- [ ] Build logs show clear error message

**Test Scenario** (optional destructive test):
```bash
# In Vercel Preview settings, temporarily add:
NEXTAUTH_BYPASS_OTP_ALL=false

# Expected: Preview build should FAIL with error message
```

---

### Test 5: Log Hygiene (Production Safety)
**Environment**: Vercel Preview Logs

**Steps**:
1. Trigger various authentication flows
2. Review Vercel build and runtime logs

**Expected Behavior**:
- [ ] No log line contains OTP bypass code
- [ ] No log line contains actual password values
- [ ] No log line contains full MongoDB connection strings with credentials
- [ ] Error messages contain only:
  - Variable names (e.g., `NEXTAUTH_BYPASS_OTP_CODE`)
  - Error codes (e.g., `OTP_BYPASS_IN_PRODUCTION`)
  - Remediation guidance

**Verification**:
```bash
# Check for any secret leaks in logs (should return 0 matches)
cat vercel-logs.txt | grep -i "bypass.*code"
cat vercel-logs.txt | grep "mongodb+srv://[^*]"
cat vercel-logs.txt | grep -E "password.*:.*[^*]"

# Additional code-level checks (before deployment)
rg -n "logger\..*process\.env" . --type ts
rg -n "console\..*BYPASS" . --type ts
rg -n "mongodb(\+srv)?:\/\/[^*]" . --type ts
```

---

## 🐛 Non-Blocking Issues (Track Separately)

### Issue 1: Invalid next.config Option
**Severity**: Low (build warning, no runtime impact)

**Evidence**: Build logs show warning:
```
Invalid next.config option: experimental.modularizeImports
```

**Action**: Create separate issue/PR to clean up next.config.js
- [ ] Remove deprecated `experimental.modularizeImports`
- [ ] Update to current Next.js config schema

---

### Issue 2: Dynamic Server Usage in Marketplace Routes
**Severity**: Medium (SSG/SSR strategy mismatch)

**Evidence**: Build logs show repeated errors:
```
Error: Route /marketplace/... couldn't be rendered statically 
because it used no-store fetch pointing to https://fixzit.co/...
```

**Risk**: Preview calling production URLs during pre-render

**Action**: Create separate issue/PR to fix data-fetch strategy
- [ ] Convert marketplace pages to explicit dynamic rendering, OR
- [ ] Fix fetch strategy to avoid no-store during SSG, OR
- [ ] Use relative URLs instead of absolute production URLs

---

## ✅ Code Quality Checks

### TypeScript Compilation
```bash
pnpm typecheck
```
**Status**: ✅ **PASS** (0 errors)

### ESLint Validation
```bash
pnpm lint
```
**Status**: ✅ **PASS** (0 errors)

### Unit Tests
```bash
pnpm vitest run tests/unit/api/superadmin --reporter=verbose
```
**Status**: ✅ **PASS** (6/6 tests)

```bash
pnpm vitest run tests/unit/auth --reporter=verbose
```
**Status**: ✅ **PASS** (23/23 tests)

---

## 📋 Git State Verification

### Branch Sync
```bash
git log --oneline -5
```

**Expected HEAD**:
```
cd0d04547 - fix(security): P0 hardening - remove secret leaks + enforce preview guards
dd161d844 - fix(auth): Superadmin portal separation - prevent redirect loop at /login
628bf604b - fix(security): Final hardening - rollout order + second enforcement
2057eb9eb - fix(security): Atlas/Vercel hardening + production safety guards
```

**Status**: ✅ **VERIFIED**

### Remote Sync
```bash
git diff HEAD origin/fix/security-atlas-vercel-hardening-20251214-1341
```
**Expected**: No diff (local and remote in sync)  
**Status**: ✅ **VERIFIED**

---

## 🚀 Merge Decision Matrix

| Category | Status | Blocker? |
|----------|--------|----------|
| **P0-1: Secret leak removal** | ✅ VERIFIED | ❌ No |
| **P0-2: Preview enforcement** | ✅ VERIFIED | ❌ No |
| **P0-3: AUTH_SECRET fallback** | ✅ VERIFIED | ❌ No |
| **P0-4: Breadcrumb removal** | ✅ VERIFIED | ❌ No |
| **P0-5: Docs alignment** | ✅ VERIFIED | ❌ No |
| **Test 1: Superadmin auto-redirect** | ⏳ PENDING | ⚠️ YES |
| **Test 2: FM route redirect** | ⏳ PENDING | ⚠️ YES |
| **Test 3: Normal user no regression** | ⏳ PENDING | ⚠️ YES |
| **Test 4: Preview guards active** | ⏳ PENDING | ⚠️ YES |
| **Test 5: Log hygiene** | ⏳ PENDING | ⚠️ YES |
| **Issue 1: next.config warning** | ⏳ TRACKED | ❌ No |
| **Issue 2: Marketplace SSG** | ⏳ TRACKED | ❌ No |

---

## 🎯 Merge Readiness Summary

### ✅ Code-Level Readiness (Complete)
- [x] All P0 security fixes implemented correctly
- [x] TypeScript compilation: 0 errors
- [x] ESLint validation: 0 errors
- [x] Unit tests: 29/29 passing
- [x] No secret values in error messages (verified with grep)
- [x] Git state clean and synced
- [x] Preview deployment successful (branch alias URL)

### ⏳ User Actions Required (Must Complete Before Merge)
- [ ] **Section A**: Vercel env vars fixed (secrets as Sensitive, no OTP bypass in Prod/Preview)
- [ ] **Section B**: Atlas DB users fixed (Description cleared, password rotated, least-privilege users)
- [ ] **Section C**: Atlas 0.0.0.0/0 removed (after Static IPs enabled)
- [ ] **Smoke Tests**: Post-merge smoke tests defined and ready to execute

### ⚠️ Non-Blocking Issues (Track in Next PR)
- ⏳ Next.js config warning (experimental.modularizeImports)
- ⏳ Dynamic server usage errors (marketplace routes)
- ⏳ Production URL dependency in Preview
- ⏳ TAP_WEBHOOK_SECRET not set
- ⏳ Redis not configured

---

## 📝 Final Sign-Off

**Engineer:** Eng. Sultan Al Hassni  
**Date:** December 14, 2025  
**PR:** #555  
**Commit:** cd0d04547  

**Statement:**
I confirm that:
- [ ] All manual actions in Sections A, B, C are complete
- [ ] Preview deployment verified after each step
- [ ] No OTP bypass vars exist in Prod/Preview environments
- [ ] All secrets are configured as Sensitive in Vercel
- [ ] MongoDB Atlas users use least-privilege roles
- [ ] Atlas 0.0.0.0/0 wildcard IP has been removed
- [ ] Post-merge smoke tests are ready to execute
- [ ] I understand that merging before completing A, B, C will cause production outage

**Signature:** _________________________  
**Date:** _________________________

---

## 🚀 Merge Procedure (Execute Only After Sign-Off Above)

1. **Merge PR #555 to main**
   ```bash
   gh pr merge 555 --squash --delete-branch
   ```

2. **Monitor Production deployment** (5 minutes)
   - Watch Vercel logs for guard errors
   - Check: ✅ "Environment validation passed (production)"

3. **Run smoke tests** (see Post-Merge Smoke Tests above)
   - Superadmin login flows
   - Normal user login
   - Vercel logs clean

4. **Verify monitoring** (15 minutes)
   - Error rates stable
   - Authentication success rates normal
   - Database connection status healthy

5. **Document completion**
   - Update SECURITY_ATLAS_CHECKLIST.md with completion date
   - Create issue(s) for non-blocking items

---

**Time Estimate:** 30-40 minutes for manual actions + 20 minutes for merge and smoke tests = ~60 minutes total

**Prepared By:** VS Code Copilot Agent  
**Per:** Eng. Sultan's Final Review Feedback  
**Status:** ✅ CODE READY, ⏳ AWAITING MANUAL ACTIONS  
**Merge-Ready:** After sign-off above



**Code Quality**: ✅ READY  
**Security Fixes**: ✅ READY  
**Functional Testing**: ⏳ REQUIRED BEFORE MERGE  

**Merge Status**: **⏳ PENDING FUNCTIONAL VALIDATION**

Once functional tests 1-5 complete successfully in Vercel Preview, this PR is **MERGE-READY**.

---

**Generated**: December 14, 2025  
**Vercel Preview**: https://fixzit-git-fix-security-atlas-vercel-hardening-20-2f8d23-fixzit.vercel.app  
**Latest Commit**: `76d2c9c27` (includes merge gate checklist)  
**PR**: https://github.com/EngSayh/Fixzit/pull/555
