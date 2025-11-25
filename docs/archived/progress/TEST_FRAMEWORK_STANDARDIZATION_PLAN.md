# Test Framework Standardization Plan

**Date:** October 14, 2025  
**Priority:** 🔴 HIGH (Blocking E2E & Unit Tests)  
**Status:** Planning Complete - Ready for Implementation  
**Estimated Time:** 2-3 hours

---

## 🎯 Problem Statement

The test suite is currently failing due to **mixed test framework APIs** (Jest and Vitest) being used in the same files. This is causing:

- ❌ All unit tests failing with module resolution errors
- ❌ MongoDB mock not being recognized
- ❌ Framework confusion preventing test execution

### Example of the Problem

**File:** `tests/unit/api/qa/alert.route.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';  // ✅ Vitest imports

vi.mock('@/lib/mongodb-unified', () => { ... });  // ✅ Vitest mock

beforeEach(() => {
  jest.resetModules();     // ❌ Jest API
  jest.clearAllMocks();    // ❌ Jest API
  // ...
});
```

**Result:** Tests cannot run because `jest` is undefined in Vitest environment.

---

## 🎯 Decision: Standardize to Vitest

**Chosen Framework:** **Vitest** ✅

### Rationale

1. ✅ **Modern & Fast:** Built on Vite, faster than Jest
2. ✅ **Better Next.js Integration:** Native ESM support
3. ✅ **Already Configured:** `vitest.config.ts` exists and working
4. ✅ **Active Development:** Latest tooling from Vite team
5. ✅ **Compatible API:** Similar to Jest with improvements
6. ✅ **Native TypeScript:** Better TypeScript support out of the box

### Why Not Jest

- ❌ Older tooling (CJS-focused)
- ❌ Slower execution
- ❌ More configuration needed for ESM/Next.js
- ❌ Would require installing additional packages

---

## 📋 Implementation Plan

### Phase 1: Find All Mixed API Usage (15 min)

**Action:** Scan all test files for Jest API usage

```bash
# Find Jest API calls
grep -r "jest\." tests/ --include="*.test.ts" --include="*.spec.ts"

# Expected issues:
# - jest.resetModules()
# - jest.clearAllMocks()
# - jest.requireMock()
# - jest.fn()
# - jest.spyOn()
```

**Files to Check:**

- `tests/unit/api/qa/alert.route.test.ts` ✅ (Confirmed issue: lines 57-58)
- `tests/unit/api/qa/log.route.test.ts`
- All other `tests/**/*.test.ts` files

---

### Phase 2: Create Vitest API Mapping (10 min)

**Conversion Reference:**

| Jest API                       | Vitest Equivalent                        | Notes                |
| ------------------------------ | ---------------------------------------- | -------------------- |
| `jest.resetModules()`          | `vi.resetModules()`                      | Clear module cache   |
| `jest.clearAllMocks()`         | `vi.clearAllMocks()`                     | Clear all mock state |
| `jest.fn()`                    | `vi.fn()`                                | Create mock function |
| `jest.spyOn(obj, 'method')`    | `vi.spyOn(obj, 'method')`                | Spy on method        |
| `jest.mock('module')`          | `vi.mock('module')`                      | Mock module          |
| `jest.requireMock('module')`   | `await import('module')` + `vi.mocked()` | Dynamic import       |
| `jest.useFakeTimers()`         | `vi.useFakeTimers()`                     | Fake timers          |
| `jest.advanceTimersByTime(ms)` | `vi.advanceTimersByTime(ms)`             | Advance timers       |

---

### Phase 3: Fix Individual Test Files (60-90 min)

**For Each Test File:**

1. **Check imports** - Ensure importing from `vitest`:

   ```typescript
   import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
   ```

2. **Replace Jest API calls** with Vitest equivalents:

   ```typescript
   // Before
   beforeEach(() => {
     jest.resetModules();
     jest.clearAllMocks();
   });

   // After
   beforeEach(() => {
     vi.resetModules();
     vi.clearAllMocks();
   });
   ```

3. **Update mock imports** if using `jest.requireMock`:

   ```typescript
   // Before
   const mockModule = jest.requireMock('@/lib/some-module');

   // After
   const mockModule = await import('@/lib/some-module');
   vi.mocked(mockModule.someFunction).mockReturnValue(...);
   ```

4. **Test each file** after changes:

   ```bash
   npm test -- path/to/file.test.ts
   ```

---

### Phase 4: Create MongoDB Unified Mock (30 min)

**Problem:** Tests failing with `Cannot find module '@/lib/mongodb-unified'`

**Solution:** Create centralized mock in test setup

**File to Create:** `tests/mocks/mongodb-unified.ts`

```typescript
import { vi } from "vitest";
import type { Db, Collection, MongoClient } from "mongodb";

// Mock MongoDB collection methods
const createMockCollection = <T = any>(): Partial<Collection<T>> => ({
  insertOne: vi.fn().mockResolvedValue({ insertedId: "mock-id" }),
  find: vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
  }),
  findOne: vi.fn().mockResolvedValue(null),
  updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
  countDocuments: vi.fn().mockResolvedValue(0),
});

// Mock MongoDB database
const createMockDatabase = (): Partial<Db> => ({
  collection: vi.fn((name: string) => createMockCollection()),
  command: vi.fn().mockResolvedValue({ ok: 1 }),
});

// Mock MongoDB client
const createMockClient = (): Partial<MongoClient> => ({
  db: vi.fn((name?: string) => createMockDatabase() as Db),
  close: vi.fn().mockResolvedValue(undefined),
  connect: vi.fn().mockResolvedValue(undefined as any),
});

// Export mock functions
export const mockDb = createMockDatabase();
export const mockClient = createMockClient();

export const getDatabase = vi.fn(() => mockDb as Db);
export const connectToDatabase = vi.fn(async () => mockClient as MongoClient);

// Reset function for beforeEach
export const resetMongoMocks = () => {
  vi.clearAllMocks();
};
```

**File to Update:** `vitest.setup.ts`

```typescript
import { vi } from "vitest";

// Mock MongoDB unified module globally
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(),
  connectToDatabase: vi.fn(),
}));

// Add other global mocks as needed
```

**Update Test Files:**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDatabase } from "@/lib/mongodb-unified";

// Mock is already set up globally via vitest.setup.ts
// Just use vi.mocked() to configure per-test behavior

describe("Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Configure mock behavior for this test
    vi.mocked(getDatabase).mockReturnValue({
      collection: vi.fn().mockReturnValue({
        insertOne: vi.fn().mockResolvedValue({ insertedId: "123" }),
      }),
    } as any);
  });

  it("should work", async () => {
    // Test code here
  });
});
```

---

### Phase 5: Verify All Tests Pass (20 min)

**Run Test Suite:**

```bash
# Run all unit tests
npm test tests/unit/

# Run all E2E tests (if any use same pattern)
npm test tests/e2e/

# Run full test suite
npm test
```

**Expected Results:**

- ✅ All unit tests pass
- ✅ No "jest is not defined" errors
- ✅ No "Cannot find module @/lib/mongodb-unified" errors
- ✅ Proper test coverage reporting

---

## 📁 Files to Modify

### Test Files with Mixed APIs

1. `tests/unit/api/qa/alert.route.test.ts` ✅ (Confirmed)
2. `tests/unit/api/qa/log.route.test.ts` (Needs checking)
3. Search results from Phase 1 (TBD)

### Configuration Files

1. `vitest.setup.ts` - Add global MongoDB mock
2. `vitest.config.ts` - Verify setup file is imported
3. `package.json` - Verify test script uses vitest

### New Files to Create

1. `tests/mocks/mongodb-unified.ts` - Centralized MongoDB mock
2. (Optional) `tests/helpers/test-utils.ts` - Common test utilities

---

## ✅ Success Criteria

### Must Have

- ✅ Zero references to `jest.` in test files (except comments)
- ✅ All test files import from `vitest`
- ✅ All tests use `vi.` API consistently
- ✅ MongoDB mock working across all tests
- ✅ All unit tests passing
- ✅ No framework confusion errors

### Quality Checks

```bash
# 1. No Jest API usage in test files
grep -r "jest\." tests/ --include="*.test.ts" --include="*.spec.ts" || echo "✅ No Jest API found"

# 2. All imports from vitest
grep -r "from 'vitest'" tests/ --include="*.test.ts" --include="*.spec.ts" | wc -l

# 3. Tests pass
npm test

# 4. TypeScript check
npx tsc --noEmit
```

---

## 🚀 Execution Steps (Ready to Run)

### Step 1: Create branch

```bash
git checkout main
git pull origin main
git checkout -b fix/standardize-test-framework-vitest
```

### Step 2: Scan for issues

```bash
grep -r "jest\." tests/ --include="*.test.ts" --include="*.spec.ts" > /tmp/jest-usage.txt
cat /tmp/jest-usage.txt
```

### Step 3: Create MongoDB mock

```bash
mkdir -p tests/mocks
# Create tests/mocks/mongodb-unified.ts with content above
```

### Step 4: Update vitest.setup.ts

```bash
# Add MongoDB mock configuration
```

### Step 5: Fix each test file

```bash
# For each file in jest-usage.txt:
# 1. Replace jest.* with vi.*
# 2. Verify imports
# 3. Run test: npm test -- path/to/file.test.ts
```

### Step 6: Verify all tests

```bash
npm test
npx tsc --noEmit
```

### Step 7: Commit and create PR

```bash
git add -A
git commit -m "test: standardize all tests to Vitest, add MongoDB mock"
git push -u origin fix/standardize-test-framework-vitest
gh pr create --title "test: standardize test framework to Vitest" \
  --body "Fixes mixed Jest/Vitest API usage and adds MongoDB mock.

Resolves test framework issues documented in SESSION_PROGRESS_REPORT_20251014.md

## Changes
- Replaced all jest.* calls with vi.* (Vitest API)
- Created centralized MongoDB mock in tests/mocks/
- Updated vitest.setup.ts with global mocks
- All unit tests now passing

## Testing
- ✅ All unit tests pass
- ✅ TypeScript compilation succeeds
- ✅ No framework confusion errors" \
  --draft
```

---

## 🔗 Related Documentation

- Previous Report: `SESSION_PROGRESS_REPORT_20251014.md`
- Pending Work: `PENDING_WORK_INVENTORY.md` (Phase 1-2 items)
- Current Work: `ESLINT_ANY_ELIMINATION_REPORT_20251014.md`

---

## 📝 Notes

### Why This Wasn't Done Earlier

- Focus was on ESLint 'any' warnings (Issue #100)
- Test framework issues were pre-existing
- Non-blocking for production deployment
- Required dedicated session for proper fix

### Impact on Timeline

- **ESLint Fix:** ✅ Complete (PR #118)
- **Test Framework:** 🔄 Next session (2-3 hours)
- **E2E Tests:** 🔄 After framework fix
- **Production Deployment:** ✅ Not blocked

### Recommendation

**Do this next session** before starting any other work. Clean test suite is essential for:

- Validating future changes
- Catching regressions
- Maintaining code quality
- Developer confidence

---

**Plan Status:** ✅ Complete - Ready for Implementation  
**Next Action:** Execute Phase 1-6 in dedicated session  
**Expected Result:** 100% test framework consistency  
**Branch Name:** `fix/standardize-test-framework-vitest`
