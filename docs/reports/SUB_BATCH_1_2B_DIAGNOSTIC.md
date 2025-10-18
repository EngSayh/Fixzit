# Sub-batch 1.2b Diagnostic Report

**Date:** October 14, 2025, 20:05 UTC  
**Task:** Diagnose 26+ component test failures (WorkOrdersView, CatalogView, SupportPopup)  
**Status:** 🔍 DIAGNOSTIC COMPLETE - Ready to fix

## Test Failure Summary

### Actual Failures Identified: 31 tests (not 26 as estimated)

| Test File | Total Tests | Failures | Pass Rate |
|-----------|-------------|----------|-----------|
| `components/fm/__tests__/WorkOrdersView.test.tsx` | 13 | 13 | 0% |
| `components/marketplace/CatalogView.test.tsx` | 14 | 10 | 29% |
| `tests/unit/components/SupportPopup.test.tsx` | 13 | 8 | 38% |
| **TOTAL** | **40** | **31** | **23%** |

## Root Causes Identified

### 1. WorkOrdersView.test.tsx - All 13 Tests Failing

**Error:** `TypeError: require(...).__reset is not a function`

**Location:** Line 38 in `beforeEach()` hook:

```typescript
(require('swr') as any).__reset();
```

**Root Cause:**  

- Jest-specific mock reset method
- `__reset()` doesn't exist in Vitest's module system
- All tests fail in beforeEach before they even run

**Solution:**  
Replace with Vitest's `vi.resetModules()` or remove entirely (SWR doesn't need manual reset in Vitest)

```typescript
// OLD (Jest):
(require('swr') as any).__reset();

// NEW (Vitest):
// Remove this line - Vitest handles module cleanup automatically
// OR use: vi.resetModules() if needed
```

**Estimated Fix Time:** 5-10 minutes (single line change + verification)

---

### 2. CatalogView.test.tsx - 10 of 14 Tests Failing

**Error Types:**

1. `Unable to find an accessible element with the role "button" and name /Request quote/i` (5 tests)
2. `Unable to find an accessible element with the role "button" and name /Add to cart/i` (4 tests)
3. `expected false to be true` - SWR key doesn't contain expected query params (1 test)

**Root Causes:**

#### 2a. Missing Product Buttons (9 tests)

- Tests expect product cards with "Request quote" and "Add to cart" buttons
- Component shows loading spinner instead
- Mock data not being properly passed to SWR

**Visual Evidence:**

```html
<div class="flex items-center justify-center py-16">
  <svg class="lucide lucide-loader2 w-6 h-6 animate-spin...">
    <!-- Loading spinner showing, no products rendered -->
  </svg>
</div>
```

**Solution:**  
Fix SWR mock setup to properly return product data:

```typescript
// Current (not working):
setSWRProducts({ data: makeCatalog([product]) })

// Needs investigation of setSWRProducts function
// Likely needs await or proper mock configuration
```

#### 2b. SWR Key Missing Query Params (1 test)

- Test expects tenantId, search query, and filters in SWR key
- SWR calls aren't capturing the expected parameters

**Solution:**  
Debug SWR key generation and ensure filters are properly encoded in the URL

**Estimated Fix Time:** 30-45 minutes (investigate SWR mocking, fix mock setup)

---

### 3. SupportPopup.test.tsx - 8 of 13 Tests Failing

**Error:** `Found a label with the text of: Description *, however no form control was found associated to that label`

**Location:** All tests using `typeInto('Description *', value)`

**Root Cause:**  
The `<label>` for "Description *" is missing the `for` attribute:

```tsx
// Current (WRONG):
<label class="block text-sm font-medium...">
  Description *
</label>
<textarea placeholder="Please provide detailed information..." />

// Should be (CORRECT):
<label for="description" class="block text-sm font-medium...">
  Description *
</label>
<textarea id="description" placeholder="Please provide detailed information..." />
```

**Solution:**  
Add `htmlFor="description"` to the label and `id="description"` to the textarea in the SupportPopup component source code

**Files to Fix:**

1. Find SupportPopup component source file
2. Update label: `<label htmlFor="description">`
3. Update textarea: `<textarea id="description">`

**Estimated Fix Time:** 10-15 minutes (locate component, add IDs, verify)

---

## Fix Strategy & Order

### Phase 1: Quick Wins (15-20 minutes)

1. ✅ **WorkOrdersView.test.tsx** - Remove `__reset()` line (1 line change → 13 tests fixed)
2. ✅ **SupportPopup** - Add label `for` attribute (2 line changes → 8 tests fixed)

**Impact:** 21/31 tests fixed (68%) in ~20 minutes

### Phase 2: Investigation & Fix (30-45 minutes)

3. 🔍 **CatalogView.test.tsx** - Fix SWR mocking (requires investigation)
   - Debug why products aren't rendering
   - Fix setSWRProducts mock function
   - Ensure product data flows to component

**Impact:** 10/31 tests fixed (32%)

### Total Estimated Time: 50-65 minutes for all 31 tests

---

## Test Failure Details

### WorkOrdersView Failures (13/13)

```text
✗ renders default heading and description
✗ renders custom heading and description via props
✗ shows loading card when isLoading and no data
✗ shows error card when error is present
✗ shows empty state when no work orders and no error
✗ renders list items with badges and computed meta including overdue styling
✗ pagination controls reflect page and total pages; enabling/disabling works
✗ refresh button calls mutate
✗ status and priority filters update query (via SWR key) when changed
✗ search input debounces and updates query only after 350ms
✗ POST create: success closes dialog, resets form, and calls onCreated (via mutate)
✗ POST create: failure shows alert with error message
✗ fetch headers include Authorization when token present and x-user is set
```

**All fail with:** `TypeError: require(...).__reset is not a function`

---

### CatalogView Failures (10/14)

```text
✗ opens LoginPrompt when clicking "Request quote" (can't find button)
✗ unauthenticated "Add to cart" opens LoginPrompt and does not call fetch (can't find button)
✗ authenticated "Add to cart" calls API, shows success feedback, and calls mutate (can't find button)
✗ authenticated "Add to cart" shows failure feedback when API not ok (can't find button)
✗ recomputes SWR key when filters change (query string contains filters) (assertion failure)
```

**Pattern:** Products not rendering, only loading spinner visible

---

### SupportPopup Failures (8/13)

```text
✗ enables Submit Ticket when both subject and description are provided
✗ Copy details includes subject and description
✗ Cancel button clears form and calls onClose
✗ Submit Ticket happy path: user fills form, submits, success response closes modal
✗ Submit Ticket error path: user submits, server returns error, error message shown
✗ API receives correctly formatted multipart/form-data with all fields
✗ Screenshot upload: selecting file updates state and shows preview
✗ Screenshot upload: removing file clears state and hides preview
```

**All fail with:** `Found a label with the text of: Description *, however no form control was found associated to that label`

---

## Files Requiring Changes

### Test Files (No changes needed - they're testing correctly)

- ✅ `components/fm/__tests__/WorkOrdersView.test.tsx` (remove 1 line)
- ⚠️ `components/marketplace/CatalogView.test.tsx` (may need mock fixes)
- ✅ `tests/unit/components/SupportPopup.test.tsx` (tests are correct)

### Component Source Files (Need fixes)

1. **SupportPopup** component - Add `htmlFor` and `id` attributes
   - Search for: `<label>Description *</label>`
   - Location: Unknown (needs `file_search`)

2. **CatalogView** - Investigate why products aren't rendering
   - May be test setup issue, not component issue

---

## Next Steps

1. **Start Session:** Mark Sub-batch 1.2b as in-progress
2. **Quick Fix #1:** Remove `__reset()` from WorkOrdersView test
3. **Quick Fix #2:** Add label IDs to SupportPopup component
4. **Run Tests:** Verify 21/31 tests now passing
5. **Investigation:** Debug CatalogView SWR mocking
6. **Final Fix:** Fix CatalogView product rendering
7. **Verification:** Run all component tests, confirm 31/31 passing
8. **Commit & Push:** Document completion

---

**Agent:** GitHub Copilot  
**Session:** October 14, 2025  
**Branch:** `fix/standardize-test-framework-vitest`  
**Status:** Sub-batch 1.2b DIAGNOSED 🔍 - Ready to fix (estimated 50-65 minutes)
