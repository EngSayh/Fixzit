# Sub-batch 1.2b Progress Report

**Date:** October 14, 2025, 20:23  
**Branch:** `fix/standardize-test-framework-vitest`  
**Objective:** Fix component test failures using real SWR instead of mocks

## Summary

Successfully transitioned from mocked SWR to **real SWR testing** with controlled fetch responses. This validates actual SWR behavior including caching, revalidation, and loading states.

### Test Results

| File | Before | After | Status |
|------|--------|-------|--------|
| **WorkOrdersView.test.tsx** | 0/13 passing | 5/13 passing | 🟡 Partial |
| **SupportPopup.test.tsx** | 5/13 passing | 8/13 passing | 🟢 Improved |
| **CatalogView.test.tsx** | Not tested yet | Pending | ⏳ Next |

**Total Progress:**  

- Before: 5/26 tests passing (19%)
- After: 13/26 tests passing (50%)
- **+8 tests fixed** ✅

## Changes Made

### 1. WorkOrdersView Tests - Real SWR Implementation

**File:** `components/fm/__tests__/WorkOrdersView.test.tsx`

**Changes:**

- ❌ **Removed:** Jest-specific SWR mock with `__set()` and `__reset()` methods
- ✅ **Added:** Real SWR with `SWRConfig` test wrapper
- ✅ **Added:** `TestWrapper` component providing isolated SWR cache per test
- ✅ **Changed:** Mock only `fetch()` calls instead of SWR library
- ✅ **Updated:** All tests to use `async/await` with `waitFor()`
- ✅ **Added:** Proper fetch response mocking for controlled test data

**Why This Matters:**

- Tests now validate **actual SWR behavior**
- Catches real-world issues with caching, deduplication, and revalidation
- More maintainable - no custom mock infrastructure
- Aligns with user request: "test on the real system not mock"

**Passing Tests (5/13):**

```text
✅ renders default heading and description
✅ renders custom heading and description via props  
✅ shows loading card when isLoading and no data
✅ shows error card when error is present
✅ shows empty state when no work orders and no error
```

**Failing Tests (8/13):**

```text
❌ renders list items with badges - Multiple "Submitted" text (test selector issue)
❌ pagination controls - Timeout (test logic issue, not SWR)
❌ refresh button calls mutate - Timeout (test logic issue)
❌ status and priority filters - Can't find combobox (selector issue)
❌ search input debounces - Timeout (test logic issue)
❌ POST create success - Can't find "New Work Order" button (selector issue)
❌ POST create failure - Can't find button (same selector issue)
❌ fetch headers include Authorization - Can't find button (same selector issue)
```

**Root Cause of Failures:**  
Not SWR-related. Issues are:

1. **Selector problems** - Tests looking for elements that don't exist or use wrong selectors
2. **Timeout issues** - Tests waiting for events that won't happen with current logic
3. **Test logic** - Need to adjust how tests interact with UI

### 2. SupportPopup Component Fix

**File:** `components/SupportPopup.tsx` (line 285-295)

**Changes:**

```tsx
// BEFORE:
<label className="...">
  Description *
</label>
<textarea placeholder="..." />

// AFTER:
<label htmlFor="description" className="...">
  Description *
</label>
<textarea id="description" placeholder="..." />
```

**Impact:**  
✅ **+3 tests now passing** (8/13, was 5/13)

**Passing Tests (8/13):**

```text
✅ disables Submit Ticket when fields empty
✅ enables Copy details when subject provided
✅ enables Submit Ticket when both fields provided  ← NEW
✅ hides guest-only fields when x-user exists
✅ copies subject when description empty
✅ copies description when provided
✅ silently ignores clipboard errors
✅ does not include requester for logged-in users  ← NEW
```

**Still Failing (5/13):**

- Other form fields missing htmlFor/id associations
- Will fix in next iteration

### 3. WorkOrdersView Component Fix

**File:** `components/fm/WorkOrdersView.tsx` (line 3)

**Change:**

```tsx
// BEFORE:
import { useEffect, useMemo, useState } from 'react';

// AFTER:
import React, { useEffect, useMemo, useState } from 'react';
```

**Why:** Vitest with jsdom requires React in scope for JSX, unlike Next.js 13+ auto-import

### 4. Configuration Fixes

**File:** `tsconfig.json` (line 33)

**Change:**

```json
// BEFORE:
"types": ["node", "react", "react-dom", "next", "google.maps", "jest"]

// AFTER:
"types": ["node", "react", "react-dom", "next", "google.maps"]
```

**Why:** Removed `"jest"` since migration to Vitest is complete

**File:** `SUB_BATCH_1_2B_DIAGNOSTIC.md` (lines 154, 176, 190)

**Change:** Added `text` language specifier to code blocks to fix markdown lint

## Architectural Decision: Real SWR vs Mocked

### Previous Approach (Mocked SWR)

```typescript
jest.mock('swr', () => {
  let current = { data: undefined, error: undefined };
  const useSWR = () => current;
  useSWR.__set = (next) => { current = { ...current, ...next }; };
  return useSWR;
});
```

**Problems:**

- Jest-specific APIs (`__set`, `__reset`) don't exist in Vitest
- Doesn't test real SWR behavior (caching, deduplication, revalidation)
- Brittle - breaks when SWR internals change
- Misses edge cases in real SWR library

### New Approach (Real SWR with Mocked Fetch)

```typescript
const TestWrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

// Mock only fetch, not SWR
(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ items: [], page: 1, total: 0 }),
});
```

**Benefits:**

- ✅ Tests real SWR behavior (user's request: "test on the real system")
- ✅ Catches real-world caching/revalidation issues
- ✅ More maintainable - no custom mock infrastructure
- ✅ Framework-agnostic - works with Jest or Vitest
- ✅ Each test gets isolated SWR cache via `provider: () => new Map()`

## Next Steps

### Immediate (Sub-batch 1.2b completion)

1. **Fix WorkOrdersView Selectors** (30 minutes)
   - Update button/combobox selectors to match actual DOM
   - Fix "Multiple Submitted" text matching
   - Add proper test IDs if needed

2. **Fix WorkOrdersView Test Logic** (30 minutes)
   - Resolve timeout issues in pagination/refresh tests
   - Adjust waitFor conditions
   - Fix debounce timing expectations

3. **Fix CatalogView Tests** (45 minutes)
   - Apply same real SWR pattern
   - Mock fetch for product data
   - Verify all 14 tests

4. **Fix Remaining SupportPopup Tests** (15 minutes)
   - Add htmlFor/id to remaining form fields
   - Guest-only fields need label associations

**Estimated Time to Complete 1.2b:** 2 hours

### After 1.2b

- **Sub-batch 1.2c:** Fix 29 API route tests
- **Sub-batch 1.2d:** Fix 22 unit tests
- **Batch 2:** Cleanup 590 workflow runs
- **Batch 3:** Verification and monitoring

## Commits Made

1. `93b6da26` - fix: remove jest types from tsconfig and add markdown language specifiers
2. `1614f3b6` - feat: use real SWR in WorkOrdersView tests instead of mocking

## Test Commands

```bash
# WorkOrdersView tests
pnpm test components/fm/__tests__/WorkOrdersView.test.tsx --run

# SupportPopup tests
pnpm test tests/unit/components/SupportPopup.test.tsx --run

# CatalogView tests (not yet run)
pnpm test components/marketplace/CatalogView.test.tsx --run

# All component tests
pnpm test "**/components/**/*.test.tsx" --run
```

## Key Learnings

1. **Real > Mocked:** Testing with real libraries catches more bugs
2. **Isolation Matters:** Each test needs its own SWR cache (`provider: () => new Map()`)
3. **React Imports:** Vitest+jsdom needs explicit React import for JSX
4. **Label Associations:** Accessibility tests require proper htmlFor/id linkage
5. **Fetch Mocking:** Control test data at the network boundary, not the library level

---

**Status:** 🟢 **Making Good Progress**  
**Next Action:** Fix remaining WorkOrdersView test selectors and logic issues
