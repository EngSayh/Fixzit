---
name: Tenant Isolation + RBAC (Fixizit)
description: Prevent cross-tenant leaks and RBAC bypasses; flag only when provable.
applyTo: "src/app/api/**,src/middleware.ts,src/lib/auth/**,src/server/**"
---

- Multi-tenant isolation: every read/write must be scoped by org_id (and property_owner_id where applicable).
- Only call something a "tenant leak" if you can quote the exact unscoped query/mutation path.
- RBAC roles are fixed (14):
  Super Admin, Corporate Admin, Management, Finance, HR, Corporate Employee,
  Property Owner, Technician, Tenant/End-User,
  Vendor, Support Agent, Compliance Officer, Reports Viewer, System Auditor.
- Never invent role names; use repo enums/constants if present.
- RBAC must be enforced at boundary (middleware/route/service). If missing, propose the minimal guard consistent with existing patterns.
