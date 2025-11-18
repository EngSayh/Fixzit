# FM Routes Refactoring Plan

**Date:** November 16, 2025  
**Issue:** 47 identical FM route stub files with re-export pattern  
**Impact:** Code duplication, maintenance overhead  

---

## 🔍 Problem

### Current Architecture

There are **47 route files** in `app/fm/` that consist of only 2 lines:

```typescript
export { default } from '@/app/fm/dashboard/page';
export { metadata } from '@/app/fm/dashboard/page';
```

**Examples:**
- `app/fm/finance/payments/page.tsx`
- `app/fm/finance/expenses/page.tsx`
- `app/fm/finance/budgets/page.tsx`
- `app/fm/reports/new/page.tsx`
- `app/fm/hr/directory/page.tsx`
- `app/fm/hr/leave/page.tsx`
- `app/fm/marketplace/orders/new/page.tsx`
- ...and 40 more files

### Why This Is Problematic

1. **Code Duplication**: 47 identical files doing the same thing
2. **Maintenance Overhead**: Adding/removing routes requires touching many files
3. **Confusion**: Developers don't know which file is the "real" implementation
4. **Bundle Size**: Next.js processes each file separately
5. **Cognitive Load**: Makes route structure harder to understand

---

## ✅ Recommended Solution

### Option 1: Catch-All Route (Recommended)

Replace all 47 stub files with a single catch-all route:

**File:** `app/fm/[[...slug]]/page.tsx`

```typescript
import { notFound } from 'next/navigation';
import FMDashboard from '@/app/fm/dashboard/page';

// Define valid FM routes
const FM_ROUTES = new Set([
  'finance/payments',
  'finance/expenses',
  'finance/budgets',
  'reports/new',
  'reports/schedules/new',
  'hr/directory',
  'hr/directory/new',
  'hr/leave',
  'hr/leave/approvals',
  'system/integrations',
  'system/users/invite',
  'administration/policies/new',
  'marketplace/orders/new',
  'marketplace/listings/new',
  'marketplace/vendors/new',
  'work-orders/new',
  'work-orders/pm',
  'work-orders/board',
  'work-orders/history',
  'work-orders/approvals',
  'invoices/new',
  'crm/leads/new',
  'crm/accounts/new',
  'tenants/new',
  'compliance/audits/new',
  'compliance/contracts/new',
  'properties/inspections/new',
  'properties/inspections',
  // ... add remaining routes
]);

export const metadata = {
  title: 'Facility Management',
  description: 'Fixzit FM Module - All-in-one facility management',
};

export default function FMRouter({ params }: { params: { slug?: string[] } }) {
  const slug = params.slug?.join('/') || '';
  
  // Check if route is valid
  if (slug && !FM_ROUTES.has(slug)) {
    notFound();
  }
  
  // All valid routes render the same dashboard
  return <FMDashboard />;
}
```

**Benefits:**
- ✅ Reduces 47 files to 1 file
- ✅ Centralized route validation
- ✅ Easy to add/remove routes (just edit the Set)
- ✅ Clear single source of truth
- ✅ Better performance (single module to process)

---

### Option 2: Middleware Route Aliasing

Use Next.js middleware to alias routes:

**File:** `middleware.ts` (existing file, add to it)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Redirect FM sub-routes to dashboard
  if (pathname.startsWith('/fm/') && pathname !== '/fm' && pathname !== '/fm/dashboard') {
    const validFMRoutes = [
      '/fm/finance/',
      '/fm/reports/',
      '/fm/hr/',
      '/fm/system/',
      '/fm/administration/',
      '/fm/marketplace/',
      '/fm/work-orders/',
      '/fm/invoices/',
      '/fm/crm/',
      '/fm/tenants/',
      '/fm/compliance/',
      '/fm/properties/',
    ];
    
    if (validFMRoutes.some(route => pathname.startsWith(route))) {
      // Rewrite to dashboard while keeping URL visible
      return NextResponse.rewrite(new URL('/fm/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/fm/:path*',
};
```

**Benefits:**
- ✅ URL stays the same in browser
- ✅ No need for catch-all routes
- ✅ Can delete all 47 stub files
- ✅ Centralized routing logic

**Trade-offs:**
- ⚠️ Middleware runs on every request (minimal overhead)
- ⚠️ Harder to debug (rewriting happens transparently)

---

### Option 3: Route Groups (Next.js 13+)

Use route groups to organize without affecting URLs:

**Structure:**
```
app/
  fm/
    (dashboard)/
      page.tsx          # Main FM dashboard
      layout.tsx
    (routes)/           # Route group (doesn't affect URL)
      finance/
      reports/
      hr/
      ...
```

**Problem:** Still requires individual page files, doesn't solve duplication.

**Verdict:** ❌ Not suitable for this use case

---

## 🎯 Implementation Plan

### Phase 1: Analysis (30 min)
1. ✅ **DONE**: Identify all 47 stub routes
2. List which routes are actually used in production
3. Check if any routes have custom metadata or props

### Phase 2: Implementation (2-3 hours)
1. **Create catch-all route** (`app/fm/[[...slug]]/page.tsx`)
2. **Test thoroughly**:
   ```bash
   # Test each route still works
   curl http://localhost:3000/fm/finance/payments
   curl http://localhost:3000/fm/hr/directory
   curl http://localhost:3000/fm/marketplace/orders/new
   ```
3. **Update navigation** (if needed):
   - Ensure `nav/` components still work
   - Update any hardcoded links
4. **Delete stub files**:
   ```bash
   # Backup first
   mkdir -p .archive/fm-stubs
   find app/fm -name "page.tsx" -exec grep -l "export { default } from" {} \; \
     | xargs -I {} cp {} .archive/fm-stubs/
   
   # Delete stubs (after verification)
   find app/fm -name "page.tsx" -exec grep -l "export { default } from" {} \; \
     | xargs rm
   ```

### Phase 3: Verification (1 hour)
1. **E2E Tests**: Verify all FM routes still work
2. **Performance Check**: Compare bundle sizes before/after
3. **Navigation Test**: Click through all FM sections
4. **SEO Check**: Verify metadata is still correct

### Phase 4: Documentation (30 min)
1. Update README with new routing architecture
2. Document how to add new FM routes
3. Add comments in catch-all route explaining pattern

---

## 📊 Expected Impact

### Before Refactoring
- **Files**: 47 stub routes + 1 dashboard = 48 files
- **Lines of Code**: ~94 lines (2 per stub) + dashboard
- **Maintenance**: Adding a route = create new file + add to nav

### After Refactoring
- **Files**: 1 catch-all route + 1 dashboard = 2 files
- **Lines of Code**: ~50 lines (single catch-all) + dashboard
- **Maintenance**: Adding a route = add to FM_ROUTES Set

### Savings
- ✅ **46 fewer files** (96% reduction)
- ✅ **~44 fewer lines** of duplicated code
- ✅ **Faster builds** (fewer modules to process)
- ✅ **Easier onboarding** (clearer architecture)
- ✅ **Reduced git noise** (fewer files to track)

---

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Navigation
- **Mitigation**: Comprehensive E2E tests before deployment
- **Rollback**: Keep stub files in `.archive/` for 1 sprint

### Risk 2: Custom Metadata Lost
- **Mitigation**: Audit each stub for custom metadata first
- **Solution**: Pass metadata via FM_ROUTES if needed:
  ```typescript
  const FM_ROUTES = new Map([
    ['finance/payments', { title: 'Payments', description: '...' }],
    ['hr/directory', { title: 'Employee Directory', description: '...' }],
  ]);
  ```

### Risk 3: SEO Impact
- **Mitigation**: Verify robots.txt and sitemap.xml still work
- **Monitoring**: Track Google Search Console for 404 errors

---

## 🚦 Current Status

- ✅ **Problem identified** (47 duplicate stub routes)
- ✅ **Solution designed** (catch-all route pattern)
- ⏸️ **Implementation pending** (requires testing window)
- ⏸️ **E2E tests needed** (ensure no regression)

**Recommendation:** Implement in **Sprint 3** after Phase 2 stabilizes.

---

## 📝 Files to Refactor (Complete List)

<details>
<summary>Click to expand all 47 stub routes</summary>

```
app/fm/work-orders/pm/page.tsx
app/fm/work-orders/board/page.tsx
app/fm/work-orders/new/page.tsx
app/fm/work-orders/history/page.tsx
app/fm/work-orders/approvals/page.tsx
app/fm/invoices/new/page.tsx
app/fm/marketplace/vendors/new/page.tsx
app/fm/marketplace/listings/new/page.tsx
app/fm/marketplace/orders/new/page.tsx
app/fm/crm/leads/new/page.tsx
app/fm/crm/accounts/new/page.tsx
app/fm/admin/page.tsx
app/fm/tenants/new/page.tsx
app/fm/compliance/audits/new/page.tsx
app/fm/compliance/contracts/new/page.tsx
app/fm/system/roles/new/page.tsx
app/fm/system/integrations/page.tsx
app/fm/system/users/invite/page.tsx
app/fm/properties/inspections/new/page.tsx
app/fm/properties/inspections/page.tsx
app/fm/finance/payments/page.tsx
app/fm/finance/expenses/page.tsx
app/fm/finance/budgets/page.tsx
app/fm/reports/new/page.tsx
app/fm/reports/schedules/new/page.tsx
app/fm/hr/directory/page.tsx
app/fm/hr/directory/new/page.tsx
app/fm/hr/leave/page.tsx
app/fm/hr/leave/approvals/page.tsx
app/fm/administration/policies/new/page.tsx
... (and 17 more)
```

</details>

---

## 🔗 Related Documentation

- Next.js Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- Route Groups: https://nextjs.org/docs/app/building-your-application/routing/route-groups

---

**Priority:** Medium (Technical Debt)  
**Effort:** 3-4 hours  
**Risk:** Low (with proper testing)  
**Value:** High (cleaner codebase, easier maintenance)
