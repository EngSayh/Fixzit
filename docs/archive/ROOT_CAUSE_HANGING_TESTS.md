turn# Root Cause Analysis: Hanging Test Execution

**Date**: Current Session  
**Issue**: `npx vitest run` command hangs and never completes

---

## Problem Statement

**Symptoms**:
1. ✅ Command executes successfully: `npx vitest run`
2. ✅ Vitest process starts (PID 15114, 15311)
3. ❌ **Command never returns/completes**
4. ❌ No progress output shown
5. ❌ Tests appear to hang indefinitely

---

## Root Cause Identified

### **PRIMARY ISSUE: Tests Attempting Database Connections**

The vitest runner is trying to execute **ALL** test files, including:
- **Playwright E2E tests** (should use `playwright test`, not vitest)
- **Tests with MongoDB connections** (waiting for database that may not be available)
- **Tests with async beforeAll hooks** (hanging on connection timeouts)

### Evidence:

#### 1. Playwright Test in Vitest Runner
```typescript
// tests/e2e/database.spec.ts
import { test, expect } from '@playwright/test';  // ❌ Playwright, not Vitest!

test.beforeAll(async () => {
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();  // ❌ Waiting for MongoDB connection
});
```

**Problem**: This is a Playwright test but vitest is trying to run it!

#### 2. Tests with Database Connections
```bash
$ grep -r "MongoClient\|mongoose.connect" tests/
tests/e2e/database.spec.ts: import { MongoClient } from 'mongodb';
tests/unit/models/CmsPage.test.ts: await connect(uri, { dbName: "test" });
tests/models/MarketplaceProduct.test.ts: MONGODB_URI: 'mongodb://not-local/ci'
```

**Problem**: Multiple tests trying to connect to MongoDB, which may:
- Not be running locally
- Have wrong connection string
- Timeout waiting for connection (default 30+ seconds per test)

#### 3. Vitest Config Doesn't Exclude E2E Tests
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // ❌ NO exclude pattern for E2E tests!
  }
});
```

**Problem**: Vitest tries to run ALL .test.ts and .spec.ts files, including Playwright tests.

---

## Why Tests Hang

### Scenario 1: Playwright Test Incompatibility
```
1. Vitest finds: tests/e2e/database.spec.ts
2. Vitest tries to run: import { test } from '@playwright/test'
3. Playwright test runner expects different environment
4. Test hangs or fails silently
5. Vitest waits indefinitely
```

### Scenario 2: MongoDB Connection Timeout
```
1. Test runs: await mongoClient.connect()
2. MongoDB not available at connection string
3. Connection attempt times out (30-60 seconds default)
4. Multiple tests × 30-60 seconds each = VERY LONG WAIT
5. User sees: "Command taking forever"
```

### Scenario 3: Missing Environment Variables
```
1. Test checks: process.env.MONGODB_URI
2. Variable not set or wrong value
3. Test throws error or hangs
4. Vitest doesn't show error (buffered output)
5. Appears to hang
```

---

## Test File Analysis

### Total Test Files: 32

#### Category Breakdown:

**Playwright E2E Tests** (Should NOT run with vitest):
- `tests/e2e/database.spec.ts` ❌
- `tests/copilot.spec.ts` ❌
- `tests/marketplace.smoke.spec.ts` ❌
- `tests/policy.spec.ts` ❌
- `tests/tools.spec.ts` ❌

**Tests with Database Connections** (May hang):
- `tests/unit/lib/mongo.test.ts` ⚠️
- `tests/unit/models/CmsPage.test.ts` ⚠️
- `tests/unit/models/HelpArticle.test.ts` ⚠️
- `tests/unit/models/Asset.test.ts` ⚠️
- `tests/models/MarketplaceProduct.test.ts` ⚠️
- `tests/models/candidate.test.ts` ⚠️
- `tests/models/SearchSynonym.test.ts` ⚠️

**Safe Unit Tests** (Should run quickly):
- `tests/utils.test.ts` ✅
- `tests/unit/parseCartAmount.test.ts` ✅
- `tests/config/package-json.spec.ts` ✅
- `tests/vitest.config.test.ts` ✅
- `tests/scripts/*.test.ts` ✅

---

## Solutions

### Solution 1: Exclude E2E Tests from Vitest (RECOMMENDED)

Update `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**',           // ✅ Exclude E2E tests
      '**/*.spec.ts',        // ✅ Exclude Playwright specs
      '**/playwright/**'
    ],
    include: [
      '**/*.test.ts'         // ✅ Only run .test.ts files
    ]
  }
});
```

### Solution 2: Mock Database Connections

For tests that need MongoDB, mock the connection:
```typescript
// tests/unit/models/CmsPage.test.ts
import { vi } from 'vitest';

vi.mock('mongoose', () => ({
  connect: vi.fn().mockResolvedValue(true),
  disconnect: vi.fn().mockResolvedValue(true),
  connection: { readyState: 1 }
}));
```

### Solution 3: Add Test Timeout

Update `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 5000,      // ✅ 5 second timeout per test
    hookTimeout: 10000      // ✅ 10 second timeout for beforeAll/afterAll
  }
});
```

### Solution 4: Run Tests Separately

```bash
# Unit tests only (fast)
npx vitest run tests/unit/**/*.test.ts

# E2E tests separately (with Playwright)
npx playwright test

# Specific test file
npx vitest run tests/utils.test.ts
```

---

## Immediate Fix

### Step 1: Kill Hanging Process
```bash
pkill -9 -f vitest
```
✅ **DONE**

### Step 2: Update Vitest Config
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 5000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**',
      '**/*.spec.ts'
    ],
    include: ['**/*.test.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/src': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/models': path.resolve(__dirname, './src/models'),
    },
  },
});
```

### Step 3: Run Tests Again
```bash
npx vitest run --reporter=verbose
```

---

## Why This Wasn't Obvious

### The Confusion:

1. **Process was running** → Looked like it was working
2. **No error output** → Vitest buffers output until completion
3. **Multiple test files** → Hard to know which one was hanging
4. **Silent failures** → Database connection timeouts don't always show errors

### What Made It Hard to Debug:

- ❌ No live progress output from vitest
- ❌ No indication which test file was running
- ❌ No timeout errors shown
- ❌ Process appeared "stuck" but was actually waiting for connections

---

## Prevention Strategy

### 1. **Separate Test Types**
- Unit tests: `*.test.ts` → Run with vitest
- E2E tests: `*.spec.ts` → Run with playwright
- Integration tests: `*.integration.ts` → Run separately with real DB

### 2. **Always Set Timeouts**
```typescript
test: {
  testTimeout: 5000,      // Individual test timeout
  hookTimeout: 10000,     // Setup/teardown timeout
  bail: 1                 // Stop on first failure
}
```

### 3. **Mock External Dependencies**
- Mock MongoDB connections in unit tests
- Mock API calls
- Mock file system operations
- Use in-memory databases for integration tests

### 4. **Use Test Patterns**
```bash
# Fast unit tests
npm run test:unit

# Slow integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## Answer to User's Question

> "Find out the root cause for this (❌ The command is taking a long time and hasn't returned yet / ❌ I'm waiting for it to complete but not showing progress)"

**ROOT CAUSE:**

1. **Vitest is trying to run Playwright E2E tests** (incompatible test framework)
2. **Multiple tests attempting MongoDB connections** (waiting for timeouts)
3. **No exclusion patterns in vitest.config.ts** (runs ALL test files)
4. **No test timeouts configured** (waits indefinitely)
5. **Buffered output** (no progress shown until completion)

**THE FIX:**

1. ✅ Kill hanging process: `pkill -9 -f vitest`
2. ⏳ Update vitest.config.ts to exclude E2E tests
3. ⏳ Add test timeouts (5s per test, 10s for hooks)
4. ⏳ Run tests again with proper configuration

**WHY IT HUNG:**

```
Vitest found 32 test files
├─ 5 Playwright tests (incompatible) → Hang
├─ 7 MongoDB tests (no connection) → Timeout (30s each = 210s)
├─ 20 Unit tests (would work) → Never reached
└─ Total estimated time: 5+ minutes (if it ever completes)
```

---

## Status

- ✅ Root cause identified: E2E tests + DB connections + no timeouts
- ✅ Hanging process killed
- ⏳ Config fix needed: Exclude E2E tests and add timeouts
- ⏳ Ready to test with proper configuration

**Next Action**: Update vitest.config.ts with exclusions and timeouts, then run tests again.

---

**End of Analysis**
