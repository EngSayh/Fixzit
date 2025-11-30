# Fixzit Domain Logic (`domain/`)

> **Version:** 2.0.26  
> **Last Updated:** November 27, 2025

This directory contains domain-driven design (DDD) modules that encapsulate core business rules, behaviors, and invariants.

---

## Architecture Overview

```
domain/
└── fm/                      # Facility Management Domain
    └── fm.behavior.ts       # FM business rules & behaviors
```

The `domain/` directory follows Domain-Driven Design principles:
- **Behaviors**: Business rules and invariants
- **Entities**: Core domain objects
- **Value Objects**: Immutable domain values
- **Domain Events**: Event-driven state changes

---

## Facility Management Domain (`fm/`)

### FM Behavior (`fm/fm.behavior.ts`)

Contains core FM business rules (STRICT v4.1-aligned RBAC + tenancy guards):

```typescript
import { canTransition, Role, WOStatus } from "@/domain/fm/fm.behavior";

const canMove = canTransition(
  WOStatus.ESTIMATE_PENDING,
  WOStatus.QUOTATION_REVIEW,
  Role.TECHNICIAN,
  {
    orgId: user.org_id,
    role: Role.TECHNICIAN,
    userId: user._id,
    isTechnicianAssigned: true,
    uploadedMedia: ["BEFORE"],
  },
);
```

### Key Business Rules

#### Work Order FSM (STRICT v4.1)

```
NEW
  └─► ASSESSMENT (requires BEFORE media)
        └─► ESTIMATE_PENDING
              └─► QUOTATION_REVIEW
                    └─► PENDING_APPROVAL
                          └─► APPROVED
                                └─► IN_PROGRESS
                                      └─► WORK_COMPLETE (requires AFTER media)
                                              ├─► QUALITY_CHECK (optional)
                                              └─► FINANCIAL_POSTING
                                                    └─► CLOSED
```

**Transition Rules (mirrors `WORK_ORDER_FSM` in `fm.behavior.ts`):**

| From | To | Allowed Roles/Sub-roles (STRICT v4.1) | Guards / Media | Action |
|------|----|---------------------------------------|----------------|--------|
| NEW | ASSESSMENT | Admin (Role.ADMIN / Corporate Admin), Team Member (Ops via EMPLOYEE alias), Management (TEAM_MEMBER), HR Officer (TEAM_MEMBER + HR) | None | — |
| ASSESSMENT | ESTIMATE_PENDING | Technician (org + assigned) | BEFORE media required | — |
| ESTIMATE_PENDING | QUOTATION_REVIEW | Technician (org + assigned) | — | attach_quote |
| QUOTATION_REVIEW | PENDING_APPROVAL | Admin (Role.ADMIN), Team Member (Ops via EMPLOYEE alias) | — | request_approval |
| PENDING_APPROVAL | APPROVED | Property Owner, Owner Deputy, Management, Finance Officer | — | approve |
| APPROVED | IN_PROGRESS | Technician (org + assigned) | — | start_work |
| IN_PROGRESS | WORK_COMPLETE | Technician (org + assigned) | AFTER media required | complete_work |
| WORK_COMPLETE | QUALITY_CHECK (optional) | Management, Property Owner | — | — |
| QUALITY_CHECK | FINANCIAL_POSTING | Admin, Team Member (Ops/Finance) | — | — |
| WORK_COMPLETE | FINANCIAL_POSTING | Admin, Team Member (Ops/Finance) | — | — |
| FINANCIAL_POSTING | CLOSED | Admin, Team Member (Finance) | — | post_finance |

Role mapping to STRICT v4.1 canonical set:
- SUPER_ADMIN: cross-org, all actions audited.
- ADMIN: corporate admin, org-scoped full access.
- TEAM_MEMBER: org-scoped staff; use sub-roles (Finance Officer, HR Officer, Support Agent, Operations Manager) to unlock module access.
- PROPERTY_OWNER / OWNER_DEPUTY: org-scoped with property filters.
- TECHNICIAN: org-scoped, assignment-locked to `assigned_to_user_id`.
- TENANT, VENDOR, GUEST: least-privilege roles; not used in FSM above.
- **Full 14-role matrix → FM canonical roles:** SUPER_ADMIN → SUPER_ADMIN; CORPORATE_ADMIN/ADMIN → ADMIN; MANAGEMENT/FM_MANAGER/PROPERTY_MANAGER → PROPERTY_MANAGER; CORPORATE_EMPLOYEE/TEAM_MEMBER/OPERATIONS_MANAGER/SUPPORT_AGENT/PROCUREMENT → TEAM_MEMBER (sub-roles required); FINANCE/FINANCE_OFFICER → TEAM_MEMBER + SubRole.FINANCE_OFFICER; HR/HR_OFFICER → TEAM_MEMBER + SubRole.HR_OFFICER; TECHNICIAN/FIELD_ENGINEER/CONTRACTOR_TECHNICIAN → TECHNICIAN; PROPERTY_OWNER/OWNER_DEPUTY → CORPORATE_OWNER/PROPERTY_MANAGER; TENANT/END_USER/RESIDENT → TENANT; VENDOR/MARKETPLACE_PARTNER → VENDOR; AUDITOR/VIEWER → GUEST (read-only).

**Guards & invariants:**
- Technician transitions require `isTechnicianAssigned === true` in context.
- Media gates: BEFORE for ASSESSMENT entry; AFTER for completion.
- All actions are org-scoped; SUPER_ADMIN bypasses org filter but is always audited.

#### SLA Priority Mapping

| Priority | Response Time | Resolution Time |
|----------|---------------|-----------------|
| CRITICAL | 1 hour | 4 hours |
| HIGH | 4 hours | 24 hours |
| MEDIUM | 8 hours | 48 hours |
| LOW | 24 hours | 72 hours |

---

## Design Principles

### 1. Pure Business Logic

Domain modules contain only business rules, no infrastructure:

```typescript
// ✅ Good - pure business logic
export function calculateLateFee(
  dueDate: Date,
  paidDate: Date,
  amount: number,
  rate: number
): number {
  const daysLate = differenceInDays(paidDate, dueDate);
  if (daysLate <= 0) return 0;
  return amount * rate * daysLate;
}

// ❌ Bad - infrastructure mixed in
export async function calculateLateFee(invoiceId: string) {
  const invoice = await db.collection("invoices").findOne({ _id: invoiceId });
  // ...
}
```

### 2. Immutability

Domain objects should be immutable:

```typescript
// ✅ Good - returns new object
export function updateWorkOrderStatus(
  workOrder: WorkOrder,
  newStatus: Status
): WorkOrder {
  return {
    ...workOrder,
    status: newStatus,
    updatedAt: new Date(),
  };
}

// ❌ Bad - mutates input
export function updateWorkOrderStatus(workOrder: WorkOrder, newStatus: Status) {
  workOrder.status = newStatus;
  workOrder.updatedAt = new Date();
}
```

### 3. Explicit Invariants

Business rules should be explicit and validated:

```typescript
export function validateWorkOrderTransition(
  current: WOStatus,
  target: WOStatus,
  role: Role
): Result<void, TransitionError> {
  // Rule 1: Only certain roles can approve
  if (
    target === WOStatus.APPROVED &&
    ![
      Role.PROPERTY_OWNER,
      Role.OWNER_DEPUTY,
      Role.MANAGEMENT,
      Role.FINANCE,
    ].includes(role)
  ) {
    return err(new TransitionError("Only finance/owner roles can approve"));
  }
  
  // Rule 2: Cannot skip states
  if (current === WOStatus.NEW && target === WOStatus.CLOSED) {
    return err(new TransitionError("Cannot skip from new to closed"));
  }
  
  return ok(undefined);
}
```

### 4. Multi-tenancy & RBAC Invariants (STRICT v4.1)
- Every domain operation must include `org_id` scoping; SUPER_ADMIN is the only cross-org role and must be audited.
- Tenants: `unit_id ∈ user.units` and `org_id` required.
- Technicians: `org_id` and `assigned_to_user_id === user._id`; FSM transitions must set `isTechnicianAssigned`.
- Property Managers: `org_id` and `property_id ∈ user.assigned_properties`.
- Vendors: `vendor_id === user.vendor_id`.
- PII (HR/Finance) only accessible to Super Admin, Admin, HR Officer (Team Member + HR sub-role), and Finance Officer where applicable.

---

## Testing Domain Logic

Domain logic should be tested in isolation without infrastructure mocks. Recommended path: `tests/domain/fm/fm.behavior.test.ts`.

```typescript
import { describe, it, expect } from "vitest";
import { canTransition, Role, WOStatus } from "@/domain/fm/fm.behavior";

describe("canTransition", () => {
  it("allows assigned technician to move to QUOTATION_REVIEW when media provided", () => {
    const ok = canTransition(
      WOStatus.ESTIMATE_PENDING,
      WOStatus.QUOTATION_REVIEW,
      Role.TECHNICIAN,
      {
        orgId: "org-1",
        role: Role.TECHNICIAN,
        userId: "tech-1",
        isTechnicianAssigned: true,
        uploadedMedia: ["BEFORE"],
      },
    );
    expect(ok).toBe(true);
  });
});
```

---

## Future Domain Modules

Planned domain modules:

| Domain | Description | Status |
|--------|-------------|--------|
| `aqar/` | Real estate domain rules | Planned |
| `souq/` | E-commerce domain rules | Planned |
| `hr/` | HR & payroll domain rules | Planned |
| `finance/` | Financial domain rules | Planned |

---

## Relationship to Services

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  API Route  │ ──► │   Service   │ ──► │   Domain    │
│  (app/api)  │     │ (services/) │     │  (domain/)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
  HTTP Layer          Orchestration       Business Rules
  Validation          DB Operations       Pure Logic
  Auth/AuthZ          External APIs       Invariants
```

- **API Routes**: Handle HTTP, validation, auth
- **Services**: Orchestrate operations, manage transactions
- **Domain**: Pure business rules, no I/O

---

## Related Documentation

- [Services Documentation](../services/README.md)
- [RBAC & Permissions](../lib/rbac.ts)
- [Architecture Overview](../docs/architecture/ARCHITECTURE.md)
- [OpenAPI Contract](../openapi.yaml)
