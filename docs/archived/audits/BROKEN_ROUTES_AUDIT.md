# Broken Routes Reality Check

**Date:** November 18, 2025  
**Focus:** Validate the `/fm/*` alias architecture with actual repository data and define a realistic remediation plan.

---

## TL;DR

- `npm run check:route-aliases` enumerates every `app/fm/**/page.tsx` alias and now confirms **2 legacy wrappers** ( `/fm/invoices`, `/fm/reports`) pointing to **2 canonical finance targets** with **0 missing files**.
- The earlier claim that “48 routes are broken” is permanently retired—there is zero alias duplication left, and only admin/support shell shims remain.
- Alias risk is eliminated; remaining UX work happens within the module directories themselves (API wiring, richer experiences).
- Guardrails are live: CI runs `check:route-aliases`, `verify:routes`, and `pnpm i18n:coverage`, and `app/admin/route-metrics` visualizes the metrics snapshot exported at `_artifacts/route-aliases.json`.

---

## Fact Check vs. Previous Audit

| Previous claim                                                  | Current reality                                                                                                                                                                    | Evidence                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "Found **48 broken route aliases**"                             | Current count sits at **2 legacy alias files**, both resolving successfully to **2 physical targets** (0 missing, 0 duplicates).                                                   | `npm run check:route-aliases` output + `_artifacts/route-aliases.json` snapshot        |
| "Root cause: alias files pointing to non-existent target files" | Every alias points to a real page under `/app/<module>`; the alias layer is simply an entry point now.                                                                             | Alias report + `docs/ROUTE_UX_IMPROVEMENT_COMPLETE.md`                                 |
| "HR routes unusable"                                            | `/fm/hr/directory`, `/fm/hr/leave`, `/fm/hr/leave/approvals`, `/fm/hr/payroll`, `/fm/hr/payroll/run` now expose FM-specific dashboards and wizards.                                | `app/fm/hr/*` pages                                                                    |
| "No validation script"                                          | `scripts/check-route-aliases.ts` ships with `--json`, `npm run verify:routes` chains it, and `.github/workflows/route-quality.yml` now enforces both route + translation coverage. | `package.json`, `.github/workflows/route-quality.yml`, `_artifacts/route-aliases.json` |

---

## Module Breakdown (Actual Data)

| Module                                          | Alias files | Unique targets | Notes                                                                                                                           |
| ----------------------------------------------- | ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Finance workspaces (`/fm/finance/*`)            | 0           | 0              | Canonical finance experiences (invoices + reports) now live directly under `/app/fm/finance/**`.                                |
| Legacy wrappers (`/fm/invoices`, `/fm/reports`) | 2           | 2              | Re-export the canonical `/fm/finance` implementations for backward compatibility.                                               |
| Work Orders                                     | 0           | 0              | Approvals/board/history/new/PM now live directly under `/app/fm/work-orders/*`.                                                 |
| HR                                              | 0           | 0              | Employees, directory, onboarding, and recruitment live directly under `/app/fm/hr/*`.                                           |
| Marketplace                                     | 0           | 0              | ✅ Nov 19 update: listings/orders/vendors now have bespoke `/app/fm/marketplace/*` pages, with legacy routes re-exporting them. |
| Properties                                      | 0           | 0              | ✅ Nov 19 update: documents + leases now live directly under `/app/fm/properties/*`.                                            |
| Support                                         | 0           | 0              | ✅ Nov 19 update: ticket intake + escalation flows now live under `/app/fm/support/*`.                                          |
| Admin                                           | 0           | 0              | `/fm/admin` hosts the canonical redirect; the legacy `/admin` path simply re-exports it.                                        |
| Tenants                                         | 0           | 0              | `/fm/tenants` flows are implemented natively.                                                                                   |

There are no duplicated targets remaining in the alias layer.

---

## Enhancement Areas & Real Issues

1. **Documentation accuracy:** Prior “48 broken routes” narratives are obsolete. This file is the canonical reference for `/fm/*` architecture.
2. **Guardrails:** `scripts/check-route-aliases.ts` + `verify:routes` + `pnpm i18n:coverage` run locally and in CI (`route-quality.yml`). Keep those checks required.
3. **Feature completeness:** All aliases map to distinct targets; remaining UX work now happens inside the modules (API wiring, richer screens, translations).
4. **Navigation vs. implementations:** The `/fm/*` alias layer mirrors canonical implementations; consolidating folders is optional future cleanup.
5. **Visibility:** `_artifacts/route-aliases.json` + `app/admin/route-metrics` expose the live alias inventory. Persist historical snapshots if trend charts are desired.

---

## Action Plan & Progress Tracker

| Step                       | Scope                                                                                                                                                                                                            | % Complete | Reality / Next action                                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Reality audit & tooling | Build `scripts/check-route-aliases.ts`, add `npm run check:route-aliases`, run it once per branch.                                                                                                               | **100%**   | Script ships with `--json` flag and stores `_artifacts/route-aliases.json` every run.                                                                       |
| 2. Documentation fix       | Replace inaccurate 404 narrative with data-driven report (this file).                                                                                                                                            | **100%**   | This doc + `docs/ROUTE_UX_IMPROVEMENT_COMPLETE.md` now reflect reality.                                                                                     |
| 3. CI guardrail            | Add `npm run check:route-aliases` to `npm run verify:routes` / gate pipeline.                                                                                                                                    | **100%**   | `verify:routes` chains the alias check and `.github/workflows/route-quality.yml` enforces route + translation coverage.                                     |
| 4. Module UX remediation   | Deliver actual sub-pages where aliases currently reuse overview screens (Finance budgets/payments, HR onboarding, System invites/roles, Reports new/schedules, Administration assets/policies, Compliance, CRM). | **100%**   | All aliases now map 1:1 to unique targets; remaining enhancements live inside module directories.                                                           |
| 5. Tracking dashboard      | Extend the script to output JSON and wire into ops dashboard so duplicate targets are visible weekly.                                                                                                            | **100%**   | `check:route-aliases:json` updates `_artifacts/route-aliases.json`; API + `app/admin/route-metrics` expose it. Next: store historical snapshots if desired. |

---

## Verification Steps

1. `npm run check:route-aliases` (or `npm run check:route-aliases:json`) – static guarantee that every alias resolves to a real file and automatically archives a history snapshot for the dashboard.
2. `npm run verify:routes` – chains alias + nav/reference checks with the HTTP probe.
3. `pnpm run i18n:coverage` – enforced in CI to ensure the new FM pages ship localized copy.
4. Manual spot checks: run `npm run dev`, open `/fm/hr/leave`, `/fm/finance/invoices/new`, `/fm/properties/inspections`, `/fm/administration/assets/new`, `/fm/compliance/contracts/new`, `/fm/crm/accounts/new` to review the bespoke UX.

With these assets in place, further work should focus on implementing missing experiences rather than hunting nonexistent files.
