---
name: DDD + Modular Monolith Boundaries
description: Stay aligned with Blueprint Bible/SDD; avoid speculative refactors.
applyTo: "src/domain/**,src/server/**,src/lib/**"
---

- Respect domain boundaries:
  Properties/Units/Tenancies, Work Orders/Maintenance, Approvals/Workflows,
  Finance/Accounting, HR/Technician Mgmt, Marketplace, CRM/Support/Notifications,
  Reporting/Analytics, Admin/Config.
- Prioritize only >=80% confidence issues: runtime/type errors, RBAC/tenant leaks, compliance breaks, clear perf issues.
- Do not push microservices refactors; modular monolith is acceptable.
- No new dependencies unless explicitly required by the repo (prefer existing utilities/patterns).
