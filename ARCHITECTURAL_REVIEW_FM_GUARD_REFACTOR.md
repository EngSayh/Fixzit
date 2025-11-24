# FM Guard Pattern: Current Status & Next Steps

**Scope:** Facility Management (FM) pages guarded by organization context  
**Status:** Hooks waivers eliminated across all FM pages; guard wrapper standardized  
**Last Updated:** Nov 22, 2025 (post full rollout)

## What We Fixed This Round

- Removed all remaining `react-hooks/rules-of-hooks` waivers by wrapping org-dependent pages with `FmGuardedPage`.
- Refactored pages to render content only after org context is available; latest batch included:
  - `app/fm/dashboard/page.tsx`
  - `app/fm/vendors/page.tsx`
  - `app/fm/vendors/[id]/page.tsx`
  - `app/fm/projects/page.tsx`
  - `app/fm/rfqs/page.tsx`
  - `app/fm/tenants/page.tsx`
  - `app/fm/finance/invoices/new/page.tsx`
  - `app/fm/support/escalations/new/page.tsx`
- Verified no FM pages still contain hook rule disables (`rg "eslint-disable react-hooks/rules-of-hooks" app/fm` → 0 matches).

## Current Metrics

- `FmGuardedPage` usages in FM: 45 files (all org-gated FM pages covered).
- `useFmOrgGuard` direct usages: 100+ (legit in shared hooks/components).
- Hook waivers in FM pages: **0**.

## Risks / Follow-ups

- Ensure new FM pages follow the wrapper pattern to avoid reintroducing hook rule waivers.
- Basic smoke run passed previously; re-run targeted smoke after any major FM UI changes.
- Consider adding a small unit test suite for `FmGuardedPage` to lock behavior.

## Action Items

1. Keep `FmGuardedPage` as the default for org-gated FM pages (no inline guard checks with hooks).
2. Add a pre-commit check to flag `eslint-disable react-hooks/rules-of-hooks` inside `app/fm/**`.
3. Optional: add unit tests for the wrapper (guard renders fallback when no org, renders children when org exists, passes through banner/context).
