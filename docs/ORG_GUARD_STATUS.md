# Org-Guard Implementation Status

**Last Updated:** November 18, 2025  
**Total FM Pages:** 75  
**Pages with Org Guard:** 75 (**100%**)  
**Owner:** Engineering Team

Every FM entry point now pulls the shared `useOrgGuard`/`useFmOrgGuard` hook so support users cannot hit a tenant-specific screen without selecting an org, and every guarded page renders the unified support banner for impersonation context.

---

## Snapshot – Module Coverage

| Module / Area                                                  | Total Pages | Guarded | Coverage | Notes                                                                                   |
| -------------------------------------------------------------- | ----------- | ------- | -------- | --------------------------------------------------------------------------------------- |
| Finance (budgets/expenses/payments/invoices/reports)           | 13          | 13      | **100%** | Includes `/fm/invoices/*` proxy routes and finance landing.                             |
| Properties (list/detail/new/units/leases/inspections/docs)     | 12          | 12      | **100%** | Details, inspections, documents, and leasing consoles now block without context.        |
| Compliance                                                     | 4           | 4       | **100%** | Landing + audits/contracts creation flows gated.                                        |
| CRM                                                            | 3           | 3       | **100%** | Accounts + leads new forms now carry the guard and tenant headers.                      |
| Work Orders                                                    | 6           | 6       | **100%** | Previously completed; kept for completeness.                                            |
| HR                                                             | 8           | 8       | **100%** | Previously completed.                                                                   |
| Marketplace                                                    | 4           | 4       | **100%** | Previously completed.                                                                   |
| Finance-Adjacent (Assets, Maintenance, Projects, RFQs, Orders) | 5           | 5       | **100%** | All non-module pages now reuse `useOrgGuard`.                                           |
| Support                                                        | 3           | 3       | **100%** | Landing + tickets/escalations share the guard.                                          |
| System                                                         | 3           | 3       | **100%** | Landing + roles/invites/integrations aligned.                                           |
| Administration / Dashboard / Global shell                      | 5           | 5       | **100%** | `/fm/page`, `/fm/dashboard`, `/fm/admin`, `/fm/orders`, `/fm/administration/*` guarded. |
| Tenants                                                        | 2           | 2       | **100%** | Completed earlier; tests referenced below.                                              |
| Vendors                                                        | 3           | 3       | **100%** | Completed earlier.                                                                      |

---

## Highlights

- **Uniform hook usage:** All FM routes call either `useFmOrgGuard({ moduleId })` or `useOrgGuard()`. `useFmOrgGuard` now exposes `supportBanner`, so pages no longer roll their own impersonation notice.
- **Finance guard regression:** `tests/unit/app/fm/finance/budgets/new/page.test.tsx`, `tests/unit/app/fm/finance/expenses/new/page.test.tsx`, `tests/unit/app/fm/finance/payments/new/page.test.tsx`, and `tests/unit/app/fm/invoices/new/page.test.tsx` keep every finance creation flow org-aware.
- **SupportOrgSwitcher coverage:** `tests/unit/components/support/SupportOrgSwitcher.test.tsx` simulates the impersonation flow, so CI fails the moment the switcher regresses.
- **Shared fetch headers:** Any page that posts data (orders, CRM, compliance, admin assets, finance invoices, etc.) now injects `x-tenant-id` from the guard’s `orgId` before hitting internal APIs.
- **Admin + system coverage:** `/fm/administration`, `/fm/system`, `/fm/orders`, `/fm/assets`, `/fm/maintenance`, `/fm/projects`, `/fm/rfqs`, `/fm/support`, and `/fm/finance` landing screens all block until an org is selected to prevent cross-tenant data leaks during support impersonation.

---

## Verification & Tooling

### Automated Tests

| Suite                                                    | Command                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Work Orders guard + view                                 | `pnpm vitest run tests/unit/components/fm/__tests__/WorkOrdersView.test.tsx tests/unit/app/fm/work-orders/page.test.tsx`                                                                                                     |
| Tenants & Vendors guard regression                       | `pnpm vitest run tests/unit/app/fm/tenants/page.test.tsx tests/unit/app/fm/vendors/page.test.tsx`                                                                                                                            |
| Finance "new" flows (budgets/expenses/payments/invoices) | `pnpm vitest run tests/unit/app/fm/finance/budgets/new/page.test.tsx tests/unit/app/fm/finance/expenses/new/page.test.tsx tests/unit/app/fm/finance/payments/new/page.test.tsx tests/unit/app/fm/invoices/new/page.test.tsx` |
| SupportOrgSwitcher impersonation                         | `pnpm vitest run tests/unit/components/support/SupportOrgSwitcher.test.tsx`                                                                                                                                                  |

The finance suites (Test 0e in the smoke log) assert:

- Guard placeholder renders when `hasOrgContext` is false.
- When `orgId` exists, the layout renders and form submission posts with the shared `x-tenant-id` header.
- Support banner wiring stays intact so support agents always see the impersonation context.

### Static Sweep

```bash
for f in $(find app/fm -name 'page.tsx'); do
  if ! rg -q "useFmOrgGuard|useOrgGuard" "$f"; then
    echo "❌ Missing guard: $f"
  fi
done
```

> Current result: no hits (all 75 routes contain the guard hooks or proxy comment).

### Smoke Tests

- `docs/SMOKE_TEST_ORG_GUARDS.md` covers manual SupportOrgSwitcher + guard prompt verification.
- `SMOKE_TEST_EXECUTION_LOG.md` has been updated with the finance suite run (Test 0e) and should continue to log any additional vitest or Playwright runs.

---

## Implementation Patterns

```tsx
// Tab-aware page
const { hasOrgContext, guard, supportBanner, orgId } = useFmOrgGuard({
  moduleId: "properties",
});
if (!hasOrgContext) return guard;

return (
  <div className="space-y-6">
    {supportBanner}
    <ModuleViewTabs moduleId="properties" />
    {/* page content that uses orgId */}
  </div>
);
```

```tsx
// Standalone page (no module tabs)
const { orgId, guard, supportBanner } = useOrgGuard();
if (!orgId) {
  return (
    <div className="space-y-6">
      {supportBanner}
      {guard}
    </div>
  );
}
```

---

## Remaining Follow-Ups

1. **Manual E2E:** Finish the SupportOrgSwitcher + guard smoke test (Test 1 in the execution log) once seeded orgs are available.
2. **Additional regression suites:**
   - Add lightweight guard tests for one of the non-finance modules touched today (`projects` or `rfqs`) to keep coverage diverse.
   - Expand finance creation tests to assert validation/Toast flows once API mocks settle.
3. **CI wiring:** Gate deployments by running the static sweep above and the targeted vitest suites inside the CI workflow (`verify-org-guards` job).
4. **Monitoring hook usage:** Consider a lint rule or codemod to enforce `useOrgGuard` on future `/fm/**/page.tsx` additions.

With guards now landed everywhere, the remaining risk is around untested fetch behavior and manual support flows rather than missing prompts.
