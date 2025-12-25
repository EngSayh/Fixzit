# Complete Issue Analysis - 24 Problems + Session Fixes

**Date:** October 14, 2025, 21:10  
**Branch:** `fix/standardize-test-framework-vitest`  
**Analysis:** Complete codebase scan for all TypeScript/test issues

---

## Summary

| Category                         | Count | Status                           |
| -------------------------------- | ----- | -------------------------------- |
| **Already Fixed (This Session)** | 42+   | ✅ Complete                      |
| **Path Resolution Issues**       | 6     | 🔴 P0 - TypeScript editor errors |
| **Syntax/Import Errors**         | 18    | 🔴 P0 - candidate.test.ts broken |
| **Deprecation Warnings**         | 1     | 🟡 P1 - Low priority             |
| **Missing Mocks**                | 2     | 🔴 P0 - Tests timeout/fail       |
| **TOTAL ISSUES**                 | 66+   | -                                |

---

## ✅ Issues Already Fixed This Session (42+)

### 1. vi.importMock Deprecation ✅

**Fixed:** 6 occurrences in 2 files

- `tests/unit/api/support/incidents.route.test.ts` (3)
- `tests/api/marketplace/products/route.test.ts` (3)
- **Commit:** `7b3a6c9c`

### 2. jest.Mock Type Assertions ✅

**Fixed:** 31+ occurrences in 12+ files

- Automated replacement with script
- Pattern: `as jest.Mock` → `as ReturnType<typeof vi.fn>`
- **Commit:** `f229143f`

### 3. Control Character Regex ✅

**Fixed:** 2 occurrences in 1 file

- `data/language-options.test.ts`
- Replaced with `hasControlChars()` helper
- **Commit:** `59357ab3`

### 4. Markdown Linting ✅

**Fixed:** 2 issues in PR_119_FIXES_APPLIED.md

- Bare URL wrapped in markdown link
- Undefined variable comments clarified
- **Commit:** `9105a772`

---

## 🔴 P0: TypeScript Path Resolution in Test Files (6 errors)

### Problem

TypeScript editor cannot resolve `@/` path aliases in dynamic imports within test files. These are **editor-only errors** - tests actually run fine with Vitest's path resolution, but they prevent proper IDE type checking and autocomplete.

### Root Cause

The `tsconfig.json` doesn't include test files in its compilation context, so TypeScript can't apply the `paths` configuration to resolve `@/` aliases in `.ts` test files.

### Affected Files

#### 1. tests/api/marketplace/products/route.test.ts (3 errors)

```typescript
// Line 62: Cannot find module '@/lib/marketplace/context'
({ resolveMarketplaceContext } = await import("@/lib/marketplace/context"));

// Line 63: Cannot find module '@/lib/marketplace/search'
({ findProductBySlug } = await import("@/lib/marketplace/search"));

// Line 64: Cannot find module '@/server/models/marketplace/Category'
const CategoryMod = await import("@/server/models/marketplace/Category");
```

#### 2. tests/unit/api/support/incidents.route.test.ts (3 errors)

```typescript
// Line 58: Cannot find module '@/app/api/support/incidents/route'
({ POST } = await import("@/app/api/support/incidents/route"));

// Line 62: Cannot find module '@/lib/mongo'
({ getNativeDb } = await import("@/lib/mongo"));

// Line 63: Cannot find module '@/server/models/SupportTicket'
({ SupportTicket } = await import("@/server/models/SupportTicket"));
```

### Solutions (Choose One)

**Option A: Update tsconfig.json to include test files** (Recommended)

```json
{
  "compilerOptions": {
    // ...existing options...
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "tests/**/*" // Add this line
  ]
}
```

**Option B: Create test-specific tsconfig.test.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["tests/**/*", "app/**/test/**/*", "**/*.ts", "**/*.tsx"]
}
```

Then configure your editor to use `tsconfig.test.json` for test files.

**Option C: Use relative imports instead of @/ aliases**

```typescript
// Not recommended - breaks consistency with rest of codebase
const CategoryMod = await import(
  "../../../../server/models/marketplace/Category"
);
```

**Note:** `skipLibCheck: true` does NOT fix this issue. That option only suppresses diagnostics in `.d.ts` declaration files, not module resolution errors in `.ts` source files.

**Recommendation:** Option A - Add `"tests/**/*"` to the `include` array in `tsconfig.json`. This enables proper type checking and path resolution for all test files.

---

## 🔴 P0: tests/models/candidate.test.ts Syntax Errors (18 errors)

### Problem

File has critical syntax and import errors preventing it from loading.

### Errors Found

#### Missing Vitest Imports (12 occurrences)

```typescript
// Lines 14, 47, 82, 92, 127, 134, 144, 145, 162, 163, 176, 194
// Error: Cannot find name 'vi'

// MISSING:
import { vi, describe, it, expect, beforeAll, afterEach } from "vitest";
```

#### Module Resolution Failure (1 error)

```typescript
// Line 19: Cannot find module '@/models/candidate'
const mod = await import("@/models/candidate");
```

#### Syntax Errors (3 errors)

```typescript
// Lines 120-121: Declaration or statement expected
  });  // Line 120
});    // Line 121
```

**Cause:** Mismatched braces or missing function wrapper

### Fix Required

1. Add vitest imports at top of file
2. Fix syntax errors at lines 120-121 (likely extra closing braces)
3. Verify module path `@/models/candidate` exists (may be `@/server/models/Candidate`)

---

## 🟡 P1: tsconfig.json baseUrl Deprecation (1 warning)

### Problem

```
Line 35: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
```

### Current Config

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "ignoreDeprecations": "5.0" // Currently set to 5.0
  }
}
```

### Solutions

**Option A: Silence Warning (Quick Fix)**

```json
{
  "compilerOptions": {
    "ignoreDeprecations": "6.0" // Change from 5.0 to 6.0
  }
}
```

**Option B: Migrate to Modern Module Resolution (Proper Fix)**

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"],
      "@/server/*": ["server/*"]
    }
    // Remove baseUrl
  }
}
```

**Recommendation:** Option A for now (doesn't affect builds), Option B in separate PR.

---

## 🔴 P0: Missing Test Mocks (2 files)

### 1. tests/unit/api/support/incidents.route.test.ts

**Problem:** All 6 tests timeout after 5000ms  
**Cause:** Missing Redis mock for `rateLimit()` function

**Fix:**

```typescript
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 10,
    reset: Date.now() + 60000,
  })),
}));
```

**Impact:** Tests load successfully but hang waiting for Redis connection

---

### 2. tests/api/marketplace/products/route.test.ts

**Problem:** Tests fail with "Cannot read properties of undefined (reading 'get')"  
**Cause:**

1. Mock request missing `.headers` property
2. MongoDB connection attempts (ECONNREFUSED)

**Fix:**

```typescript
// 1. Fix mock request object
const callGET = async (slug: string) => {
  const req = {
    headers: new Headers([
      ["origin", "http://localhost"],
      ["user-agent", "test"],
    ]),
  } as unknown as NextRequest;
  return await GET(req, { params: { slug } });
};

// 2. Ensure dbConnect mock works
vi.mock("@/db/mongoose", () => ({
  dbConnect: vi.fn().mockResolvedValue(true),
}));
```

**Impact:** 2 tests fail, 0 pass

---

## Action Plan

### Immediate (Next 30 minutes) 🔴

1. **Fix candidate.test.ts syntax errors** (18 errors)
   - Add vitest imports
   - Fix lines 120-121 syntax
   - Verify module paths
   - Est: 30 min

2. **Add missing mocks** (2 files)
   - Redis mock for incidents.route.test.ts
   - Request headers + dbConnect for products/route.test.ts
   - Est: 15 min

3. **Add skipLibCheck to tsconfig** (6 errors)
   - Single line change
   - Silences editor-only errors
   - Est: 2 min

### Optional (Later) 🟡

4. **Fix baseUrl deprecation** (1 warning)
   - Change ignoreDeprecations to "6.0"
   - Est: 2 min

### Total Remaining Issues: 27

- **P0 Critical:** 26 errors (18 syntax + 6 path + 2 mocks)
- **P1 Low Priority:** 1 warning (baseUrl deprecation)

---

## Verification Commands

### Check TypeScript Errors

```bash
pnpm tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
```

### Test Fixed Files

```bash
# After fixing candidate.test.ts
pnpm test tests/models/candidate.test.ts --run

# After adding Redis mock
pnpm test tests/unit/api/support/incidents.route.test.ts --run

# After fixing products mock
pnpm test tests/api/marketplace/products/route.test.ts --run
```

### Verify All Fixes

```bash
# Should show 0 errors (or only baseUrl warning)
pnpm tsc --noEmit
```

---

## Session Metrics

### Fixes Applied This Session ✅

- **vi.importMock:** 6 removed
- **jest.Mock:** 31+ replaced
- **Control char regex:** 2 fixed
- **Markdown lint:** 2 fixed
- **Math.random spy:** 1 improved
- **Total Fixed:** 42+ issues

### Remaining Work 🔴

- **Syntax errors:** 18
- **Path resolution:** 6
- **Missing mocks:** 2
- **Deprecation:** 1
- **Total Remaining:** 27 issues

### Time Estimates

- **P0 Critical Fixes:** 47 minutes
- **P1 Optional:** 2 minutes
- **Total:** ~50 minutes to complete

---

## Related Documents

- `VI_IMPORTMOCK_FIXES_COMPLETE.md` - vi.importMock detailed report
- `P0_P1_CRITICAL_FIXES_COMPLETE.md` - Session summary
- `SYSTEM_WIDE_JEST_VITEST_FIXES.md` - Original issue catalog
- `PR_119_FIXES_APPLIED.md` - CI fixes documentation

---

**Status:** 42+ issues fixed, 27 remaining  
**Next:** Fix candidate.test.ts syntax errors (P0, 30 min)  
**Ready for:** Immediate continuation
