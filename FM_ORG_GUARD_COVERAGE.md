# FM Module Org Guard Coverage Report
**Generated:** November 18, 2025  
**Purpose:** Track org guard implementation across all FM pages  
**Priority:** P0 - Security Critical

---

## Coverage Summary

**Total FM Pages:** ~30 pages  
**Pages With Guards:** ~10 pages (33%)  
**Pages Missing Guards:** 20+ pages (67%)  
**Target:** 100% coverage before production deployment

---

## ✅ Pages WITH Org Guards (User Added)

### Finance Module
```
✅ app/fm/finance/payments/page.tsx
✅ app/fm/finance/invoices/page.tsx
✅ app/fm/finance/budgets/page.tsx
✅ app/fm/finance/expenses/page.tsx
```

### Properties Module
```
✅ app/fm/properties/page.tsx
✅ app/fm/properties/[id]/page.tsx
✅ app/fm/properties/units/page.tsx
✅ app/fm/properties/leases/page.tsx
```

### System Module
```
✅ app/fm/system/integrations/page.tsx
✅ app/fm/system/*/page.tsx (multiple)
```

### Support Module
```
✅ app/fm/support/tickets/page.tsx
✅ app/fm/support/tickets/new/page.tsx
```

### Marketplace Module (Partial)
```
✅ app/fm/marketplace/listings/page.tsx
✅ app/fm/marketplace/orders/page.tsx
```

### HR Module
```
✅ app/fm/hr/directory/page.tsx
```

---

## ❌ Pages MISSING Org Guards (Require Implementation)

### Work Orders Module (6 pages) - CRITICAL
**ModuleId to use:** `'work_orders'`

```
❌ app/fm/work-orders/page.tsx
❌ app/fm/work-orders/pm/page.tsx
❌ app/fm/work-orders/board/page.tsx
❌ app/fm/work-orders/new/page.tsx
❌ app/fm/work-orders/history/page.tsx
❌ app/fm/work-orders/approvals/page.tsx
```

**Implementation Pattern:**
```typescript
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

export default function WorkOrdersPage() {
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ 
    moduleId: 'work_orders' 
  });
  
  if (guard) return guard;
  
  // Existing page code...
}
```

---

### Vendors Module (3 pages) - CRITICAL
**ModuleId to use:** `'vendors'`

```
❌ app/fm/vendors/page.tsx
❌ app/fm/vendors/[id]/page.tsx
❌ app/fm/vendors/[id]/edit/page.tsx
```

**Implementation Pattern:**
```typescript
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

export default function VendorsPage() {
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ 
    moduleId: 'vendors' 
  });
  
  if (guard) return guard;
  
  // Existing page code...
}
```

---

### Invoices Module (2 pages) - HIGH PRIORITY
**ModuleId to use:** `'finance'` (invoices are part of finance)

```
❌ app/fm/invoices/page.tsx
❌ app/fm/invoices/new/page.tsx
```

**Implementation Pattern:**
```typescript
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

export default function InvoicesPage() {
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ 
    moduleId: 'finance' 
  });
  
  if (guard) return guard;
  
  // Existing page code...
}
```

---

### CRM Module (3 pages) - HIGH PRIORITY
**ModuleId to use:** `'crm'`

```
❌ app/fm/crm/page.tsx
❌ app/fm/crm/leads/new/page.tsx
❌ app/fm/crm/accounts/new/page.tsx
```

**Implementation Pattern:**
```typescript
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

export default function CRMPage() {
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ 
    moduleId: 'crm' 
  });
  
  if (guard) return guard;
  
  // Existing page code...
}
```

---

### Marketplace Module - Additional Pages (4 pages) - MEDIUM PRIORITY
**ModuleId to use:** `'marketplace'`

```
❌ app/fm/marketplace/page.tsx
❌ app/fm/marketplace/vendors/new/page.tsx
❌ app/fm/marketplace/listings/new/page.tsx
❌ app/fm/marketplace/orders/new/page.tsx
```

**Note:** Some marketplace pages already have guards (listings, orders). These are the remaining ones.

**Implementation Pattern:**
```typescript
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

export default function MarketplacePage() {
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ 
    moduleId: 'marketplace' 
  });
  
  if (guard) return guard;
  
  // Existing page code...
}
```

---

### Tenants Module (2 pages) - MEDIUM PRIORITY
**ModuleId to use:** `'tenants'`

```
❌ app/fm/tenants/page.tsx
❌ app/fm/tenants/new/page.tsx
```

**Implementation Pattern:**
```typescript
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

export default function TenantsPage() {
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ 
    moduleId: 'tenants' 
  });
  
  if (guard) return guard;
  
  // Existing page code...
}
```

---

### Single-Page Modules (3+ pages) - VARIOUS PRIORITIES

#### Projects Page - HIGH PRIORITY
**ModuleId to use:** `'administration'` (or add 'projects' to ModuleId if needed)

```
❌ app/fm/projects/page.tsx
```

#### RFQs Page - MEDIUM PRIORITY
**ModuleId to use:** `'administration'` (or add 'rfqs' to ModuleId if needed)

```
❌ app/fm/rfqs/page.tsx
```

#### Admin Page - MEDIUM PRIORITY
**ModuleId to use:** `'administration'`

```
❌ app/fm/admin/page.tsx
```

#### Compliance Page - MEDIUM PRIORITY
**ModuleId to use:** `'compliance'`

```
❌ app/fm/compliance/page.tsx
```

#### Dashboard Page - LOW PRIORITY (if applicable)
**ModuleId to use:** `'dashboard'`

```
❌ app/fm/dashboard/page.tsx (if missing guard)
```

---

## ModuleId Type Reference

**Location:** `config/navigation.ts` line 272

**Current Definition (Confirmed):**
```typescript
export type ModuleId =
  | 'dashboard'
  | 'work_orders'        // ✅ Available
  | 'properties'         // ✅ Available
  | 'tenants'            // ✅ Available
  | 'finance'            // ✅ Available (use for invoices)
  | 'hr'                 // ✅ Available
  | 'administration'     // ✅ Available (use for admin/projects/rfqs)
  | 'crm'                // ✅ Available
  | 'marketplace'        // ✅ Available
  | 'vendors'            // ✅ Available
  | 'support'            // ✅ Available
  | 'compliance'         // ✅ Available
  | 'reports'            // ✅ Available
  | 'system';            // ✅ Available
```

**Good News:** All needed ModuleId values already exist! No type extensions required.

---

## Implementation Priority Matrix

### Priority 0: CRITICAL (Security Risk)
**Estimated Time:** 1.5 hours  
**Pages:** 12 pages

- Work Orders (6 pages) - 45 min
- Vendors (3 pages) - 20 min
- CRM (3 pages) - 25 min

**Risk:** Unauthorized access to tenant-specific work orders, vendor data, CRM records

---

### Priority 1: HIGH (Important Data)
**Estimated Time:** 30 min  
**Pages:** 4 pages

- Invoices (2 pages) - 15 min
- Projects (1 page) - 5 min
- Tenants (2 pages) - 10 min

**Risk:** Unauthorized access to financial data, project information, tenant records

---

### Priority 2: MEDIUM (Less Sensitive)
**Estimated Time:** 30 min  
**Pages:** 5+ pages

- Marketplace additional pages (4 pages) - 20 min
- RFQs (1 page) - 5 min
- Admin (1 page) - 5 min
- Compliance (1 page) - 5 min

**Risk:** Moderate - less sensitive data but still needs protection

---

## Verification Commands

### Find All Missing Guards
```bash
find app/fm -name "page.tsx" -type f | while read file; do 
  grep -L "useFmOrgGuard\|useSupportOrg" "$file" && echo "$file"
done
```

### Check Specific Module
```bash
grep -r "useFmOrgGuard" app/fm/work-orders/
# Should show imports and usage in all work-orders pages
```

### Verify ModuleId Type
```bash
grep -A 15 "^export type ModuleId" config/navigation.ts
```

### Run Official Verification Script (if exists)
```bash
./scripts/check-org-guards.sh
```

---

## Testing Checklist

After implementing guards on each page, test:

### Automated Testing
- [ ] Run TypeScript compilation: `pnpm exec tsc --noEmit`
- [ ] No new errors introduced
- [ ] Verify guard script: `./scripts/check-org-guards.sh`
- [ ] Confirm 0 missing guards reported

### Manual Testing (Per Module)
- [ ] Start dev server: `pnpm dev`
- [ ] Login as superadmin@fixzit.com
- [ ] Navigate to guarded page (e.g., `/fm/work-orders`)
- [ ] Verify org selection prompt appears
- [ ] Select test organization
- [ ] Verify page content loads
- [ ] Verify context banner displays
- [ ] Navigate to another page in same module
- [ ] Verify org context persists (no re-prompt)
- [ ] Clear org selection
- [ ] Navigate back to page
- [ ] Verify prompt reappears

---

## Known Issues & Considerations

### Issue 1: Org Context Clearing
**Description:** Need to verify clearing behavior works across all pages  
**Test:** Clear org → navigate to guarded page → verify prompt appears  
**Status:** Pending manual testing

### Issue 2: Non-Superadmin Users
**Description:** Regular FM users should not see org switcher  
**Test:** Login as non-superadmin → verify auto-assignment or "contact admin" message  
**Status:** Pending manual testing

### Issue 3: API Request Headers
**Description:** Verify `x-org-id` header sent with API calls  
**Test:** DevTools Network tab → select org → make API call → check headers  
**Status:** Pending manual testing

---

## Implementation Workflow

### Step 1: Work Orders Module (45 min)
1. Open `app/fm/work-orders/page.tsx`
2. Add useFmOrgGuard import
3. Add guard logic at component start
4. Test locally
5. Repeat for 5 remaining work-orders pages
6. Verify: `grep -r "useFmOrgGuard" app/fm/work-orders/`

### Step 2: Vendors Module (20 min)
1. Open `app/fm/vendors/page.tsx`
2. Add useFmOrgGuard import
3. Add guard logic at component start
4. Test locally
5. Repeat for 2 remaining vendor pages
6. Verify: `grep -r "useFmOrgGuard" app/fm/vendors/`

### Step 3: CRM Module (25 min)
1. Open `app/fm/crm/page.tsx`
2. Add useFmOrgGuard import
3. Add guard logic at component start
4. Test locally
5. Repeat for 2 remaining CRM pages
6. Verify: `grep -r "useFmOrgGuard" app/fm/crm/`

### Step 4: Remaining Pages (1 hour)
1. Follow same pattern for invoices, marketplace, tenants, projects, rfqs, admin, compliance
2. Test each module after implementation
3. Run full verification at end

### Step 5: Final Validation (15 min)
```bash
# Check for missing guards:
find app/fm -name "page.tsx" -type f | while read file; do 
  grep -L "useFmOrgGuard\|useSupportOrg" "$file" && echo "$file"
done

# Expected output: (empty - all pages have guards)

# Run deployment check:
./scripts/verify-deployment-readiness.sh

# Expected: Org guard check passes ✅
```

---

## Rollout Plan

### Phase 1: Critical Pages (Day 1 - 1.5 hours)
- Work Orders (6 pages)
- Vendors (3 pages)
- CRM (3 pages)
- **Coverage:** 12/20 pages (60% → 90%)

### Phase 2: High Priority Pages (Day 1 - 30 min)
- Invoices (2 pages)
- Projects (1 page)
- Tenants (2 pages)
- **Coverage:** 17/20 pages (85% → 95%)

### Phase 3: Remaining Pages (Day 2 - 30 min)
- Marketplace additional (4 pages)
- RFQs, Admin, Compliance (3 pages)
- **Coverage:** 20/20 pages (100%)

### Phase 4: Testing & Validation (Day 2 - 1 hour)
- Manual smoke tests
- Verification scripts
- Documentation updates
- **Deployment:** READY ✅

---

## Success Metrics

### Code Coverage
- **Current:** 33% (10/30 pages)
- **Target:** 100% (30/30 pages)
- **Critical Path:** 90% (27/30 pages)

### Security Posture
- **Current:** VULNERABLE (20 pages unprotected)
- **After Phase 1:** IMPROVED (12 pages protected)
- **After Phase 3:** SECURE (all pages protected)

### Deployment Readiness
- **Current:** NOT READY (missing guards block deployment)
- **After Implementation:** READY (with TypeScript fixes)

---

## Contact & Support

**Implementation Questions:** engineering@fixzit.sa  
**Guard Pattern Reference:** `components/fm/useFmOrgGuard.tsx`  
**ModuleId Type:** `config/navigation.ts` line 272  
**Documentation:** `CODE_QUALITY_IMPROVEMENTS_REPORT.md`

---

**Report Generated:** November 18, 2025  
**Next Update:** After Phase 1 completion  
**Target Completion:** Before production deployment
