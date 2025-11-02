# Phase 6: Module Architecture Refactoring Plan
**Date**: 2025-01-02  
**Agent**: GitHub Copilot  
**Session**: Architectural Compliance - Module Reorganization

---

## Executive Summary

**Issue**: FM module has **duplicate standalone pages** that violate the blueprint's tabbed architecture.

**Current State**:
- ✅ `app/fm/marketplace/page.tsx` - Proper tabbed layout (Catalog, Vendors, RFQs, Orders)
- ❌ `app/fm/vendors/page.tsx` - Duplicate standalone page (12.9 KB)
- ❌ `app/fm/rfqs/page.tsx` - Duplicate standalone page (20.3 KB)
- ❌ `app/fm/orders/page.tsx` - Duplicate standalone page (18.8 KB)
- ❌ `app/fm/page.tsx` - Mock FM dashboard with inline data (565 lines)

**Decision**: **DELETE** obsolete standalone pages (marketplace tabs already exist).

---

## 1. Analysis: Marketplace Structure

### ✅ **CORRECT**: `app/fm/marketplace/page.tsx`

**Structure**:
```typescript
const tabs = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'rfqs', label: 'RFQs & Bids' },
  { id: 'orders', label: 'Orders & POs' },
];
```

**Status**: **Blueprint-compliant** tabbed layout

**Action**: ✅ **KEEP** (no changes needed)

---

## 2. Analysis: Obsolete Standalone Pages

### ❌ Issue 1: `app/fm/vendors/page.tsx` (12,917 bytes)

**Problem**: Full vendor management page outside marketplace structure

**Routes Affected**:
- `/fm/vendors` - Standalone vendor list
- Should be: `/fm/marketplace?tab=vendors` (already exists)

**Action**: 🔴 **DELETE** (functionality duplicated in marketplace tab)

**Verification Needed**:
- Check if any direct links to `/fm/vendors` exist
- Check if vendor edit pages (`/fm/vendors/[id]/edit`) still needed

---

### ❌ Issue 2: `app/fm/rfqs/page.tsx` (20,280 bytes)

**Problem**: Full RFQ management page outside marketplace structure

**Routes Affected**:
- `/fm/rfqs` - Standalone RFQ list
- Should be: `/fm/marketplace?tab=rfqs` (already exists)

**Action**: 🔴 **DELETE** (functionality duplicated in marketplace tab)

---

### ❌ Issue 3: `app/fm/orders/page.tsx` (18,786 bytes)

**Problem**: Full orders management page outside marketplace structure

**Routes Affected**:
- `/fm/orders` - Standalone orders list
- Should be: `/fm/marketplace?tab=orders` (already exists)

**Action**: 🔴 **DELETE** (functionality duplicated in marketplace tab)

---

### ❌ Issue 4: `app/fm/page.tsx` (565 lines)

**Problem**: Mock FM dashboard with inline vendor/RFQ/order data

**Sample Content** (Line 1-30):
```typescript
interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: string;
  status: 'Active' | 'Pending' | 'Inactive';
  // ... 200+ lines of mock data
}

interface RFQ {
  // ... more mock data
}
```

**Routes Affected**:
- `/fm` - Root FM page
- Should be: Dashboard or redirect to `/fm/dashboard`

**Action**: ⚠️ **DECISION REQUIRED**
1. **Option A**: Delete entirely (redirect to `/fm/dashboard`)
2. **Option B**: Keep as landing page with nav tiles only
3. **Option C**: Convert to real dashboard with widgets

**Recommendation**: **Option A** (delete, use `/fm/dashboard` as entry point)

---

## 3. Analysis: Support Structure

### Check: `app/fm/support/page.tsx`

**Current State**: Standalone support page exists

**Blueprint**: Should have tabbed layout (Tickets, Knowledge Base, etc.)

**Action**: ⏸️ **DEFER** to separate phase (low priority)

Reason: Support structure may be intentionally different from marketplace

---

## 4. Verification: Dynamic Routes

### ✅ Vendor Detail Pages

**Routes**:
- `/fm/vendors/[id]/page.tsx` - Vendor detail view
- `/fm/vendors/[id]/edit/page.tsx` - Vendor edit form

**Status**: **KEEP** (detail pages are acceptable, only list views should be in tabs)

---

## 5. Implementation Plan

### Step 1: Check for Direct Links

**Command**:
```bash
grep -r "href=.*\/fm\/(vendors|rfqs|orders)" app/ components/ --include="*.tsx"
```

**Action**: If links found, update to `/fm/marketplace?tab=<name>`

---

### Step 2: Check for useRouter Redirects

**Command**:
```bash
grep -r "router.push.*\/fm\/(vendors|rfqs|orders)" app/ components/ --include="*.tsx"
```

**Action**: If redirects found, update to marketplace tabs

---

### Step 3: Delete Obsolete Files

**Files to Delete**:
1. `app/fm/vendors/page.tsx` (keep `/[id]/` subdirs)
2. `app/fm/rfqs/page.tsx`
3. `app/fm/orders/page.tsx`
4. `app/fm/page.tsx` (if Option A chosen)

**Caution**: DO NOT delete:
- `app/fm/vendors/[id]/page.tsx` (detail view)
- `app/fm/vendors/[id]/edit/page.tsx` (edit form)

---

### Step 4: Update Navigation Registry

**File**: `nav/registry.ts`

**Check**: Ensure nav links point to:
- ✅ `/fm/marketplace` (NOT `/fm/vendors`, `/fm/rfqs`, `/fm/orders`)

---

### Step 5: Create Redirects (Optional)

**File**: `middleware.ts`

**Add Redirects**:
```typescript
if (pathname === '/fm/vendors') {
  return NextResponse.redirect('/fm/marketplace?tab=vendors');
}
if (pathname === '/fm/rfqs') {
  return NextResponse.redirect('/fm/marketplace?tab=rfqs');
}
if (pathname === '/fm/orders') {
  return NextResponse.redirect('/fm/marketplace?tab=orders');
}
```

**Purpose**: Prevent 404s if external links exist

---

## 6. Risk Assessment

### 🔴 HIGH RISK: Delete Without Checking Links

**Mitigation**: Run Step 1 & 2 BEFORE deleting any files

---

### 🟡 MEDIUM RISK: Broken Navigation

**Mitigation**: Update `nav/registry.ts` immediately after deletions

---

### 🟢 LOW RISK: Detail Pages

**Status**: Detail pages (`/fm/vendors/[id]`) are separate routes, won't be affected

---

## 7. Testing Plan

After refactoring:

1. **Manual Navigation Test**:
   - Visit `/fm/marketplace`
   - Click each tab (Vendors, RFQs, Orders)
   - Verify content loads

2. **Direct URL Test**:
   - Try `/fm/vendors` → should redirect or 404
   - Try `/fm/rfqs` → should redirect or 404
   - Try `/fm/orders` → should redirect or 404
   - Try `/fm/vendors/123` → should still work (detail page)

3. **TypeScript Check**:
   - Run `pnpm typecheck`
   - Ensure no broken imports

4. **Build Test**:
   - Run `pnpm build`
   - Ensure static pages generate successfully

---

## 8. Completion Criteria

✅ **Success Metrics**:
1. Only `/fm/marketplace/page.tsx` exists for marketplace functionality
2. Standalone `/fm/{vendors,rfqs,orders}/page.tsx` deleted
3. Detail pages `/fm/vendors/[id]/` still functional
4. No broken links in navigation
5. TypeScript compilation clean
6. Production build successful

---

## Phase 6 Decision: PROCEED with Deletion

**Justification**:
- Marketplace tab structure already exists and is complete
- Standalone pages are redundant and violate blueprint
- Detail pages (dynamic routes) are unaffected
- Low risk with proper verification steps

**Next Action**: Execute Steps 1-5, then test and commit

---

**Generated**: 2025-01-02  
**Agent**: GitHub Copilot  
**Status**: Phase 6 plan complete, ready for execution
