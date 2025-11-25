# Role-Based Access Control Requirements

Fixzit supports multiple personas with scoped permissions across web and mobile applications.

## Personas

- **Resident**: end user requesting service for a property.
- **Pro**: verified service provider fulfilling work orders.
- **Coordinator**: internal operator managing assignments and escalations.
- **Admin**: platform owner with full system access.

## Authorization Matrix (Must-Pass)

| Capability           | Resident | Pro      | Coordinator | Admin    |
| -------------------- | -------- | -------- | ----------- | -------- |
| Create work order    | ✅       | ❌       | ✅          | ✅       |
| Accept work order    | ❌       | ✅       | ✅          | ✅       |
| Reassign work order  | ❌       | ❌       | ✅          | ✅       |
| View billing reports | ✅ (own) | ✅ (own) | ✅ (team)   | ✅ (all) |
| Manage users         | ❌       | ❌       | ❌          | ✅       |

## Enforcement Rules

- API checks occur server-side using middleware that evaluates JWT claims and feature flags.
- UI must hide actions that the current role cannot perform; disable with tooltip if context matters.
- Role changes trigger cache invalidation for navigation, task lists, and permissions-aware components.

## Auditing & Logging

- Record every role change with actor, target, reason, and timestamp.
- Maintain 1-year retention for access logs in compliance storage.
- Generate weekly diffs of permission changes for security review.

## QA Must-Pass

- Automated tests cover each capability per role.
- Penetration tests validate no privilege escalation via API parameters.
- Staging smoke test ensures navigation and dashboards respect role-specific visibility.
