if # PR 85 Review Comments - Fix Tracking

## Critical Issues (P1)

### 1. Invoice Schema - Tenant Scoping Issue
**File:** `server/models/Invoice.ts`
**Issue:** Invoice schema has `number` set to `unique: true` globally, but also has a `{ tenantId, number }` compound index. This will cause duplicate key errors for multi-tenant usage.
**Fix:** Remove the global unique constraint on `number` field, keep only the compound index.
**Status:** 🔴 TO FIX

### 2. Missing SubscriptionInvoice Module
**Files:** 
- `app/api/billing/callback/paytabs/route.ts`
- `app/api/billing/charge-recurring/route.ts`
**Issue:** Import references `@/server/models/SubscriptionInvoice` which doesn't exist
**Fix:** Create the module or correct import paths
**Status:** 🔴 TO FIX

## High Priority Issues

### 3. generateSlug Runtime Error
**File:** `lib/utils.ts` (lines 8-26)
**Issue:** Function fails when undefined is passed, causing `TypeError: src.replace is not a function`
**Fix:** Add default parameter or explicit null check
**Status:** 🔴 TO FIX

### 4. Missing Error Handling in LinkedIn Feed
**File:** `app/api/feeds/linkedin/route.ts` (lines 12-15)
**Issue:** No try-catch for database operations
**Fix:** Wrap database calls in try-catch
**Status:** 🔴 TO FIX

### 5. Security - Missing rel="noopener noreferrer"
**File:** `app/marketplace/product/[slug]/page.tsx` (line 103)
**Issue:** External links with target="_blank" missing security attributes
**Fix:** Add `rel="noopener noreferrer"`
**Status:** 🔴 TO FIX

### 6. Incorrect SessionUser Properties
**File:** `app/api/kb/ingest/route.ts` (line 8)
**Issue:** Using `(user as any).role` casts and `user.tenantId` instead of `user.orgId`
**Fix:** Remove type casts, use correct property names
**Status:** 🔴 TO FIX

### 7. Misleading Index Setup Script
**File:** `scripts/setup-indexes.ts` (lines 1-16)
**Issue:** Script is disabled but prints success message
**Fix:** Update messages to reflect disabled state
**Status:** 🔴 TO FIX

### 8. Missing Error Handling in Python Script
**File:** `fix_convert.py` (lines 1-12)
**Issue:** No error handling for file I/O
**Fix:** Add try-catch and validation
**Status:** 🔴 TO FIX

### 9. Missing Language Specifiers in Markdown
**File:** `FIX_COMMAND_FAILURES.md`
**Issue:** Code blocks lack language identifiers (markdownlint MD040)
**Fix:** Add language specifiers to all code blocks
**Status:** 🔴 TO FIX

## Progress
- Total Issues: 9
- Fixed: 9 ✅
- Remaining: 0

## Fixes Applied

### ✅ Issue #1: Invoice Schema - Tenant Scoping
- **File:** `server/models/Invoice.ts`
- **Fix:** Removed global `unique: true` constraint on `number` field
- **Status:** FIXED

### ✅ Issue #2: Missing SubscriptionInvoice Module
- **File:** `server/models/SubscriptionInvoice.ts`
- **Fix:** Created the missing model file with proper schema
- **Status:** FIXED

### ✅ Issue #3: generateSlug Runtime Error
- **File:** `lib/utils.ts`
- **Fix:** Added default parameter and null check
- **Status:** FIXED

### ✅ Issue #4: LinkedIn Feed Error Handling
- **File:** `app/api/feeds/linkedin/route.ts`
- **Fix:** Added try-catch block for database operations
- **Status:** FIXED

### ✅ Issue #5: Security - External Links
- **File:** `app/marketplace/product/[slug]/page.tsx`
- **Fix:** Added `rel="noopener noreferrer"` to external links
- **Status:** FIXED

### ✅ Issue #6: SessionUser Properties
- **File:** `app/api/kb/ingest/route.ts`
- **Fix:** Removed type casts, used correct `user.role` and `user.orgId`
- **Status:** FIXED

### ✅ Issue #7: Index Setup Script
- **File:** `scripts/setup-indexes.ts`
- **Fix:** Updated messages to reflect disabled state with TODO comment
- **Status:** FIXED

### ✅ Issue #8: Python Script Error Handling
- **File:** `fix_convert.py`
- **Fix:** Added comprehensive error handling and validation
- **Status:** FIXED

### ✅ Issue #9: Markdown Language Specifiers
- **File:** `FIX_COMMAND_FAILURES.md`
- **Fix:** Already has all language specifiers - no changes needed
- **Status:** VERIFIED (No fix needed)

## All PR 85 Review Comments Addressed! 🎉
