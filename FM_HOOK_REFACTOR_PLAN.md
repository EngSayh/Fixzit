# FM Hook Refactor Plan (Optional, 8–12h)
**Goal:** Remove conditional hook ordering from FM pages by restructuring so hooks are unconditional. Current behavior works; this is an architectural improvement only.

## Phases
1) **Inventory & Pattern Selection** (✅ done)
   - Confirm target pages (14) using `FmGuardedPage` with conditional hooks:  
     `app/fm/dashboard`, `app/fm/finance/invoices`, `app/fm/finance/invoices/new`, `app/fm/finance/reports`, `app/fm/projects`, `app/fm/properties/[id]`, `app/fm/reports/new`, `app/fm/rfqs`, `app/fm/support/tickets`, `app/fm/support/escalations/new`, `app/fm/tenants`, `app/fm/vendors`, `app/fm/vendors/[id]`, `app/fm/support/dashboard` (if present).
   - Adopt pattern: split into wrapper (guard/render gating) + inner component where hooks are unconditional; move early returns to wrapper.

2) **Scaffold Shared Utilities** (est. 1–1.5h)
   - Create a lightweight `FmPageShell` helper (or reuse `FmGuardedPage`) to pass `orgId`, `supportBanner`, and render the inner component without conditional hooks.
   - Add a checklist for hook placement (state, SWR, effects all inside inner component).

3) **Refactor High-Traffic Pages First** (est. 3–4h)
   - Refactor 4 priority pages: `dashboard`, `projects`, `rfqs`, `tenants`.
   - Validate with `pnpm typecheck` + `pnpm lint:prod`.

4) **Refactor Remaining Pages** (est. 3–4h)
   - Finish the remaining 10 pages listed above.
   - Run targeted page-level sanity checks (SWR/render smoke where possible).

5) **Stabilize & Document** (est. 1–2h)
   - Update docs with the final pattern and note removal of conditional hooks.
   - Final `pnpm lint:prod` + `pnpm typecheck`.
   - Mark legacy “complete” reports as historical; keep `SYSTEM_WIDE_AUDIT_COMPLETE.md` and `CODERABBIT_CURRENT_STATUS.md` as canonical.

## Notes
- Risk level: low-to-medium (render structure changes only); no API changes.
- Deployment impact: optional; current production is stable. Refactor improves hook-order correctness and future maintainability.
