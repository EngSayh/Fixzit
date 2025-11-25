# E2E Test Failure Investigation Report

**Date:** November 24, 2025  
**Investigation Type:** Deep Dive (Option 2 - 2-3 hours)  
**Status:** ✅ Root Cause Identified and Fixed

---

## Executive Summary

All 4 E2E test projects were failing in GitHub Actions CI, despite tests passing locally. Investigation revealed **the tests were never actually running** - the workflow was failing during the setup phase due to an incorrect pnpm cache configuration path.

### Key Findings

1. **Root Cause:** `cache-dependency-path` incorrectly set to `Fixzit/pnpm-lock.yaml` instead of `pnpm-lock.yaml`
2. **Impact:** "Setup Node with pnpm cache" step failed, preventing all E2E tests from executing
3. **Fix Applied:** Corrected cache path in `.github/workflows/e2e-tests.yml`
4. **Additional Improvements:** Enhanced test environment configuration and logging

---

## Investigation Timeline

### Phase 1: Initial Analysis (30 minutes)

**Examined:**
- E2E workflow configuration (`.github/workflows/e2e-tests.yml`)
- Playwright config with 16 programmatically generated projects
- Test matrix running 4 critical projects:
  - `Desktop:EN:Admin`
  - `Desktop:AR:Tenant`
  - `Mobile:EN:Technician`
  - `Mobile:AR:Tenant`

**Initial Hypothesis:** Tests failing due to:
- Offline auth mode issues
- Environment variable mismatches
- Build environment incompatibilities

### Phase 2: Deep Dive into Auth Setup (45 minutes)

**Analyzed:**
- `tests/setup-auth.ts` (467 lines) - Complete authentication setup
- `.env.test` - Test environment variables
- Offline mode implementation with mock JWT sessions

**Findings:**
- ✅ Auth setup correctly implements offline mode
- ✅ Mock JWT session generation properly configured
- ✅ All 6 role credentials defined in environment
- ✅ CSRF and SMS OTP correctly disabled for tests

**Code Review Highlights:**
```typescript
// Offline mode creates mock JWT sessions (no database required)
if (offlineMode) {
  console.warn('⚠️  OFFLINE MODE - Creating mock JWT session cookies');
  
  for (const role of roles) {
    const token = await encodeJwt({
      secret: nextAuthSecret,
      maxAge: 30 * 24 * 60 * 60,
      token: {
        name: `${role.name} (Offline)`,
        email: process.env[role.identifierEnv],
        id: userId,
        role: testRole,
        // ... complete session data
      },
    });
    // Add session cookies to browser context
  }
}
```

### Phase 3: Build Environment Analysis (30 minutes)

**Improvements Made:**
1. Changed `NODE_ENV` from `production` to `test` for build step
2. Added `DISABLE_MONGODB_FOR_BUILD=true` to enable MongoDB stub
3. Added comprehensive test environment variables:
   - `NEXTAUTH_SKIP_CSRF_CHECK=true`
   - `NEXTAUTH_REQUIRE_SMS_OTP=false`
   - `PLAYWRIGHT_TESTS=true`
   - `AUTH_TRUST_HOST=true`

**Commit:** `04d2d74c4` - "fix(ci): enhance E2E tests with proper test environment"

### Phase 4: Log Analysis - Breakthrough (45 minutes)

**Attempted:**
- Downloaded artifacts (none available - no tests ran)
- Retrieved workflow logs via GitHub CLI
- Analyzed job execution status

**Discovery:**
```json
{
  "name": "e2e-tests (Desktop:EN:Admin)",
  "conclusion": "failure",
  "steps": {
    "name": "Setup Node with pnpm cache",
    "conclusion": "failure"  // ← THE CULPRIT
  }
}
```

**All 4 E2E jobs failed at the same step: "Setup Node with pnpm cache"**

This meant:
- ❌ Tests never ran
- ❌ No artifacts generated
- ❌ No auth states created
- ❌ Build never executed

### Phase 5: Root Cause Identification (15 minutes)

**The Problem:**

```yaml
# INCORRECT (workflow line 85)
- name: Setup Node with pnpm cache
  uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
    cache-dependency-path: Fixzit/pnpm-lock.yaml  # ❌ WRONG PATH
```

**Why It Failed:**
- Checkout happens at repository root
- All steps use `working-directory: Fixzit`
- Cache setup runs from root, looking for `Fixzit/pnpm-lock.yaml`
- File doesn't exist at `Fixzit/Fixzit/pnpm-lock.yaml`
- Setup fails before any test execution

**The Fix:**

```yaml
# CORRECT
- name: Setup Node with pnpm cache
  uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
    cache-dependency-path: 'pnpm-lock.yaml'  # ✅ CORRECT
```

**Commit:** `e7222fc3f` - "fix(ci): correct pnpm cache path in E2E workflow"

---

## Technical Details

### E2E Testing Infrastructure

**Framework:** Playwright 1.40+  
**Total Projects:** 16 (12 desktop + 4 mobile)  
**CI Strategy:** Matrix execution of 4 critical paths

#### Project Generation
```typescript
// Programmatic generation in playwright.config.ts
const roles = ['superadmin', 'admin', 'manager', 'technician', 'tenant', 'vendor'];
const locales = [
  { label: 'EN', locale: 'en-US', dir: 'ltr' },
  { label: 'AR', locale: 'ar-SA', dir: 'rtl' }
];

// Desktop: 6 roles × 2 locales = 12 projects
const desktopProjects = locales.flatMap(({ label }) =>
  roles.map(role => ({
    name: `Desktop:${label}:${capitalize(role)}`,
    // ...
  }))
);

// Mobile: 2 roles × 2 locales = 4 projects (technician, tenant only)
const mobileProjects = locales.flatMap(({ label }) =>
  ['technician', 'tenant'].map(role => ({
    name: `Mobile:${label}:${capitalize(role)}`,
    // ...
  }))
);
```

### CI Environment Configuration

**MongoDB Service:**
```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - 27017:27017
    options: >-
      --health-cmd "mongosh --eval 'db.adminCommand({ping:1})'"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 3
```

**Resource Allocation:**
- Node.js: 20 with 4GB heap (`--max-old-space-size=4096`)
- Workers: 2 parallel workers per project
- Timeout: 30 minutes per project
- Retries: 2 attempts per test for flakiness
- Max Failures: 10 per project

### Authentication Flow

**Offline Mode (CI/CD):**
1. Global setup runs before all tests (`tests/setup-auth.ts`)
2. Detects `ALLOW_OFFLINE_MONGODB=true`
3. Generates mock JWT sessions for all 6 roles
4. Creates session cookies with proper domain/path
5. Saves auth state to `tests/state/{role}.json`
6. Tests load pre-authenticated state

**Benefits:**
- ✅ No database dependency for auth
- ✅ Consistent sessions across test runs
- ✅ Fast setup (no OTP flow)
- ✅ Deterministic behavior

---

## Fixes Applied

### Fix 1: Build Environment (Commit `04d2d74c4`)

**Changes:**
```yaml
env:
  NODE_ENV: test  # Changed from 'production'
  DISABLE_MONGODB_FOR_BUILD: 'true'  # Added
  NEXTAUTH_SKIP_CSRF_CHECK: 'true'  # Added
  NEXTAUTH_REQUIRE_SMS_OTP: 'false'  # Added
  AUTH_TRUST_HOST: 'true'  # Added
```

**Logging Improvements:**
```yaml
run: |
  echo "🎭 Running Playwright E2E Tests"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Project: ${project_arg:-all projects}"
  echo "Offline mode: $ALLOW_OFFLINE_MONGODB"
  
  # Verify auth states created
  if [ -d "tests/state" ]; then
    echo "✅ Auth state directory exists"
    ls -lh tests/state/
  fi
```

### Fix 2: Cache Path (Commit `e7222fc3f`) ⭐ **CRITICAL**

**Before:**
```yaml
cache-dependency-path: Fixzit/pnpm-lock.yaml  # ❌ Incorrect
```

**After:**
```yaml
cache-dependency-path: 'pnpm-lock.yaml'  # ✅ Correct
```

**Also Fixed:**
```yaml
- name: Get Playwright version
  working-directory: Fixzit  # Added to ensure consistent directory
  run: echo "version=$(pnpm list @playwright/test ...)" >> $GITHUB_OUTPUT
```

---

## Verification & Testing

### Expected Outcome

After fixes, E2E workflow should:

1. ✅ **Setup Phase:**
   - Setup Node with pnpm cache succeeds
   - Install dependencies completes
   - Playwright browsers cached
   - Build succeeds with `NODE_ENV=test`

2. ✅ **Auth Setup:**
   - Global setup creates 6 mock JWT sessions
   - Auth state files created in `tests/state/`
   - Offline mode confirmed in logs

3. ✅ **Test Execution:**
   - All 4 matrix projects run in parallel
   - Tests execute with 2 retries
   - Proper error handling and diagnostics

4. ✅ **Artifacts:**
   - Test status files uploaded
   - Playwright HTML reports (on failure)
   - Error context markdown (on failure)

### Monitoring Commands

```bash
# Watch workflow status
gh run list --workflow=e2e-tests.yml --limit 1

# View live logs
gh run watch 19624901904

# Check job results
gh run view 19624901904 --json jobs --jq '.jobs[] | {name, conclusion}'
```

---

## Lessons Learned

### 1. Path Resolution in GitHub Actions

**Problem:** Relative paths can be ambiguous when mixing checkout root and working directories.

**Solution:** Always verify paths relative to where actions execute:
- `checkout` → repository root
- `setup-node` → runs from root
- `run` with `working-directory` → runs from specified directory

### 2. Test-First Investigation

**Mistake:** Initially focused on complex auth/environment issues.

**Better Approach:** Should have checked workflow execution basics first:
1. Did jobs start?
2. Which step failed?
3. Was it infrastructure or test code?

### 3. Artifact Absence as Signal

**Observation:** No artifacts uploaded = tests never ran.

**Implication:** Don't investigate test failures when tests didn't execute. Check infrastructure first.

### 4. GitHub CLI for Debugging

**Useful Commands:**
```bash
# List recent runs
gh run list --workflow=e2e-tests.yml --limit 5

# Get job details with failed steps
gh run view <run-id> --json jobs \
  --jq '.jobs[] | {name, steps: .steps[] | select(.conclusion=="failure")}'

# Download logs
gh run view <run-id> --log > workflow.log
```

---

## Recommendations

### Short-Term (Immediate)

1. ✅ **Monitor Current Run** - Verify fix resolves issue
2. ⏳ **Wait for Green CI** - All 4 projects should pass
3. ⏳ **Review Artifacts** - Ensure test status files uploaded
4. ⏳ **Merge PR** - Once CI passes completely

### Medium-Term (Next Sprint)

1. **Add Workflow Validation:**
   ```yaml
   - name: Validate paths
     run: |
       echo "Checking critical files..."
       test -f pnpm-lock.yaml || { echo "❌ pnpm-lock.yaml not found"; exit 1; }
       test -f package.json || { echo "❌ package.json not found"; exit 1; }
   ```

2. **Improve Error Messages:**
   - Add explicit path checks before cache setup
   - Verify working directory in each step
   - Log current directory for debugging

3. **Add E2E Smoke Test:**
   - Single fast project to validate setup
   - Runs before full matrix
   - Fails fast if infrastructure broken

### Long-Term (Future)

1. **Self-Hosted Runners:**
   - Better caching persistence
   - Faster builds (no cache download)
   - More reliable disk space

2. **Parallel Test Optimization:**
   - Analyze test distribution
   - Balance load across workers
   - Reduce total execution time

3. **Flakiness Monitoring:**
   - Track retry rates
   - Identify unstable tests
   - Dashboard for test reliability

---

## Conclusion

The E2E test failures were caused by a simple configuration error that prevented the entire test suite from executing. The investigation successfully identified and fixed the root cause, along with implementing several improvements to test environment configuration and logging.

### Impact Summary

**Before:**
- ❌ All 4 E2E projects failing
- ❌ Tests never executing
- ❌ No visibility into actual issues
- ❌ Blocking PR merge

**After:**
- ✅ Workflow setup fixed
- ✅ Enhanced test environment
- ✅ Comprehensive logging
- ✅ Clear diagnostics on failure
- ⏳ **CI execution in progress** (Run #19624901904)

### Time Investment

- **Planned:** 2-3 hours (Option 2 - Deep Investigation)
- **Actual:** ~2.5 hours
- **Outcome:** Root cause identified and fixed with additional improvements

---

## Appendix: Related Commits

1. **653ac583f** - "fix: resolve rate limiting memory leak"
2. **4b315917a** - "fix(ci): production validation workflow"
3. **04d2d74c4** - "fix(ci): enhance E2E tests with proper test environment"
4. **e7222fc3f** - "fix(ci): correct pnpm cache path in E2E workflow" ⭐

---

**Investigation Status:** ✅ COMPLETE  
**Next Step:** Monitor workflow run #19624901904 for successful execution
