# Org-Guard Implementation Status

**Last Updated:** November 18, 2025  
**Total FM Pages:** 75  
**Pages with Org Guard:** 47 (63%)  
**Pages Missing Guard:** 28 (37%)

---

## Snapshot - Module Coverage

| Module | Total Pages | Guarded | Coverage | Notes |
|--------|-------------|---------|----------|-------|
| Finance | 9 | 9 | **100%** | ✅ All creation/report flows guarded. |
| Properties | 8 | 2 | 25% | Creation + document/detail views still open. |
| Compliance | 4 | 2 | 50% | Need guards for creation flows. |
| CRM | 3 | 1 | 33% | Accounts + leads creation missing guard. |
| Support | 3 | 3 | **100%** | ✅ Guard in place for tickets list/new + escalations. |
| System | 3 | 2 | 67% | Users invite + roles guarded; system dashboard still open. |
| Work Orders | 6 | 6 | **100%** | ✅ Complete. |
| HR | 8 | 8 | **100%** | ✅ Completed (all HR screens guarded). |
| Marketplace | 4 | 4 | **100%** | ✅ Completed (support marketplace ready). |
| Tenants | 2 | 2 | **100%** | ✅ Tenant list + onboarding protected. |
| Vendors | 3 | 3 | **100%** | ✅ Vendor list/detail/edit protected. |
| Global (Dash/Admin/etc.) | 4 | 0 | 0% | `/fm/dashboard`, `/fm/admin`, etc. |

---

## ✅ Pages with useSupportOrg() Implemented

### Finance Module (9/9 = 100%)
- ✅ `/fm/finance/budgets`
- ✅ `/fm/finance/budgets/new`
- ✅ `/fm/finance/expenses`
- ✅ `/fm/finance/expenses/new`
- ✅ `/fm/finance/payments`
- ✅ `/fm/finance/payments/new`
- ✅ `/fm/finance/invoices`
- ✅ `/fm/finance/invoices/new`
- ✅ `/fm/finance/reports`

### Properties Module (2/8 = 25%)
- ✅ `/fm/properties` - Has guard
- ✅ `/fm/properties/units/new` - Has guard
- ❌ `/fm/properties/new` - **Missing guard**
- ❌ `/fm/properties/units` - **Missing guard**
- ❌ `/fm/properties/leases` - **Missing guard**
- ❌ `/fm/properties/inspections` - **Missing guard**
- ❌ `/fm/properties/inspections/new` - **Missing guard**
- ❌ `/fm/properties/documents` - **Missing guard**

### Compliance Module (2/4 = 50%)
- ✅ `/fm/compliance/audits` - Has guard
- ✅ `/fm/compliance/policies` - Has guard
- ❌ `/fm/compliance/audits/new` - **Missing guard**
- ❌ `/fm/compliance/contracts/new` - **Missing guard**

### CRM Module (1/3 = 33%)
- ✅ `/fm/crm` - Has guard
- ❌ `/fm/crm/accounts/new` - **Missing guard**
- ❌ `/fm/crm/leads/new` - **Missing guard**

### Support Module (1/3 = 33%)
- ✅ `/fm/support/tickets/new` - Has guard
- ❌ `/fm/support/tickets` - **Missing guard**
- ❌ `/fm/support/escalations/new` - **Missing guard**

### System Module (1/3 = 33%)
- ✅ `/fm/system/integrations` - Has guard
- ❌ `/fm/system/users/invite` - **Missing guard**
- ❌ `/fm/system/roles/new` - **Missing guard**

### HR Module (8/8 = 100%)
- ✅ `/fm/hr/page`
- ✅ `/fm/hr/directory`
- ✅ `/fm/hr/directory/new`
- ✅ `/fm/hr/employees`
- ✅ `/fm/hr/leave`
- ✅ `/fm/hr/leave/approvals`
- ✅ `/fm/hr/payroll`
- ✅ `/fm/hr/payroll/run`

### Work Orders Module (6/6 = 100%)
- ✅ `/fm/work-orders`
- ✅ `/fm/work-orders/new`
- ✅ `/fm/work-orders/board`
- ✅ `/fm/work-orders/approvals`
- ✅ `/fm/work-orders/history`
- ✅ `/fm/work-orders/pm`

### Marketplace Module (4/4 = 100%)
- ✅ `/fm/marketplace`
- ✅ `/fm/marketplace/listings/new`
- ✅ `/fm/marketplace/orders/new`
- ✅ `/fm/marketplace/vendors/new`

### Tenants Module (2/2 = 100%)
- ✅ `/fm/tenants`
- ✅ `/fm/tenants/new`

### Vendors Module (3/3 = 100%)
- ✅ `/fm/vendors`
- ✅ `/fm/vendors/[id]`
- ✅ `/fm/vendors/[id]/edit`

---

## ❌ Modules Completely Missing Org Guards

### Invoices Module (0/2 = 0%)
- ❌ `/fm/invoices`
- ❌ `/fm/invoices/new`

### Reports Module (3/3 = 100%)
- ✅ `/fm/reports`
- ✅ `/fm/reports/new`
- ✅ `/fm/reports/schedules/new`

### Dashboard & Admin (3/4 = 75%)
- ✅ `/fm/dashboard`
- ✅ `/fm/admin`
- ✅ `/fm/page` (main FM page)
- ❌ `/fm/orders`

### Other (0/6 = 0%)
- ❌ `/fm/assets`
- ❌ `/fm/administration`
- ❌ `/fm/administration/assets/new`
- ❌ `/fm/administration/policies/new`
- ❌ `/fm/maintenance`
- ❌ `/fm/projects`
- ❌ `/fm/rfqs`

---

## 🎯 Priority Implementation Plan

### Phase 1: High-Traffic Pages (Priority 🔴)
**Estimate:** 2-3 hours

1. **Work Orders Module** (6 pages)
   - Most used FM feature
   - Critical for daily operations
   
2. **HR Module** (8 pages)
   - Sensitive employee data
   - Multi-tenant isolation critical

3. **Marketplace Module** (4 pages)
   - Transaction handling
   - Vendor relationships

### Phase 2: Data Management Pages (Priority 🟡)
**Estimate:** 1-2 hours

4. **Tenants Module** (✅ Complete)
5. **Vendors Module** (✅ Complete)
6. **Invoices Module** (2 pages)

### Phase 3: Supporting Pages (Priority 🟢)
**Estimate:** 1 hour

7. **Reports Module** (3 pages)
8. **Dashboard & Admin** (4 pages)
9. **Remaining Finance "new" pages** (3 pages)

---

## Implementation Pattern

For each page, follow this pattern (`useFmOrgGuard()` is a thin wrapper around `useSupportOrg()` that adds loading + module metadata, so using either hook satisfies guard requirements):

```typescript
// app/fm/MODULE/page.tsx

'use client';

import { useSupportOrg } from '@/contexts/SupportOrgContext';
import { useTranslation } from '@/contexts/TranslationContext';

export default function ModulePage() {
  const { t } = useTranslation();
  const { effectiveOrgId, canImpersonate, supportOrg } = useSupportOrg();

  // ⚡ GUARD: Require organization context
  if (!effectiveOrgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            {t('fm.org.required')}
          </h2>
          <p className="text-gray-600">
            {canImpersonate 
              ? t('fm.org.selectPrompt')
              : t('fm.org.contactAdmin')
            }
          </p>
        </div>
      </div>
    );
  }

  // ✅ Org context available - proceed with page logic
  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

---

## Translation Keys Required

Add to `i18n/sources/fm.translations.json`:

```json
{
  "fm": {
    "org": {
      "required": {
        "en": "Organization Required",
        "ar": "المؤسسة مطلوبة"
      },
      "selectPrompt": {
        "en": "Please select an organization from the top bar to continue.",
        "ar": "يرجى اختيار مؤسسة من الشريط العلوي للمتابعة."
      },
      "contactAdmin": {
        "en": "Please contact your administrator to be assigned to an organization.",
        "ar": "يرجى الاتصال بالمسؤول لتعيينك في مؤسسة."
      }
    }
  }
}
```

---

## Verification Checklist

After implementing org guards:

### Manual Testing
- [ ] Navigate to page without org context → See prompt ✓
- [ ] Select organization → Page loads data ✓
- [ ] Switch organization → Data updates ✓
- [ ] Test EN/AR translations ✓

### Automated Testing
```bash
# Run verification script
./scripts/run-deployment-check.sh

# Check for missing guards
grep -r "export default function" app/fm/ | while read line; do
  FILE=$(echo "$line" | cut -d: -f1)
  if ! grep -q "useSupportOrg" "$FILE"; then
    echo "❌ Missing guard: $FILE"
  fi
done
```

---

## CI/CD Integration

Update `.github/workflows/route-quality.yml`:

```yaml
- name: Verify Org Guards
  run: |
    # Check all FM pages have org guard
    MISSING=$(find app/fm -name "page.tsx" -exec grep -L "useSupportOrg" {} \;)
    if [ -n "$MISSING" ]; then
      echo "❌ Pages missing org guard:"
      echo "$MISSING"
      exit 1
    fi
    echo "✅ All FM pages have org guards"
```

---

## Current Blockers

1. **Manual Testing Not Complete**
   - SupportOrgSwitcher E2E flow not exercised
   - Tenant context scoping not verified
   - Translation keys not confirmed in UI

2. **28 Pages Missing Implementation**
   - ~37% of FM pages still lack org guards
   - Focus shifts to invoices, reports, dashboard/admin, and support/system tooling

3. **Verification Scripts Not Updated**
   - `scripts/verify-deployment-readiness.sh` doesn't check org guards
   - CI workflow has no org guard validation

---

## Next Steps

1. **Complete Smoke Test** (30-45 min)
   - Follow `docs/SMOKE_TEST_ORG_GUARDS.md`
   - Document results
   - Fix any failures

2. **Implement Remaining Guards** (4-6 hours)
   - Prioritize invoices, reports, dashboard/admin, support, and system modules
   - Use the shared guard hook/prompt for consistency
   - Fill in any missing translation keys

3. **Update Verification Scripts** (30 min)
   - Add org guard checks to deployment script
   - Update CI workflow

4. **Re-run Full Verification** (10 min)
   - `./scripts/run-deployment-check.sh`
   - Fix any failures
   - Push to trigger CI

---

**Estimated Total Time:** 6-8 hours for complete implementation

**Recommended Approach:** 
1. Do smoke test NOW (45 min)
2. Fix any immediate issues found
3. Then implement missing guards in phases
4. Test after each phase

_Org guard rollout progress is mirrored in `CODE_QUALITY_IMPROVEMENTS_REPORT.md` (Outstanding Backlog row #3)._

---

## Dependencies & Verification

- **Support Org Context:** Ensure `contexts/SupportOrgContext.tsx` is initialized globally (TopBar + layout). Guard pattern assumes `effectiveOrgId` is supplied there.
- **Translations:** Keys listed in _Translation Keys Required_ must be added to `i18n/sources/fm.translations.json` and pushed through `pnpm i18n:extract`.
- **Scripts:** Run `./scripts/check-org-guards.sh` for a fast static sweep, and layer `pnpm run verify:org-context` when you need the full context + smoke coverage.
- **Smoke Tests:** Coordinate with `SMOKE_TEST_EXECUTION_LOG.md` to confirm SupportOrg switcher + prompts behave before closing tracker items.
- **Reporting:** Update `docs/operations/DOCUMENTATION_ORG_ACTION_PLAN.md` once a phase completes; include archive + guard counts so leadership can trace progress.
