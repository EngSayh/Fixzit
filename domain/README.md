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

Contains core FM business rules:

```typescript
import { FMBehavior } from '@/domain/fm/fm.behavior';

// Work order state machine
const canTransition = FMBehavior.canTransitionWorkOrder({
  currentStatus: 'pending',
  targetStatus: 'in_progress',
  userRole: 'TECHNICIAN',
});

// SLA calculations
const slaDeadline = FMBehavior.calculateSLADeadline({
  priority: 'high',
  createdAt: new Date(),
  slaPolicy: orgSLAPolicy,
});

// Assignment rules
const eligibleTechnicians = FMBehavior.getEligibleAssignees({
  workOrderType: 'hvac',
  location: propertyId,
  skills: ['hvac-certified'],
});
```

### Key Business Rules

#### Work Order State Machine

```
┌──────────┐     ┌─────────────┐     ┌────────────┐     ┌───────────┐
│  DRAFT   │ ──► │   PENDING   │ ──► │ IN_PROGRESS│ ──► │ COMPLETED │
└──────────┘     └─────────────┘     └────────────┘     └───────────┘
                       │                   │
                       ▼                   ▼
                 ┌───────────┐      ┌────────────┐
                 │ CANCELLED │      │  ON_HOLD   │
                 └───────────┘      └────────────┘
```

**Transition Rules:**
| From | To | Allowed Roles |
|------|-----|---------------|
| DRAFT | PENDING | OWNER, ADMIN |
| PENDING | IN_PROGRESS | TECHNICIAN, ADMIN |
| PENDING | CANCELLED | OWNER, ADMIN |
| IN_PROGRESS | COMPLETED | TECHNICIAN |
| IN_PROGRESS | ON_HOLD | TECHNICIAN, ADMIN |
| ON_HOLD | IN_PROGRESS | TECHNICIAN |

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
  const invoice = await db.collection('invoices').findOne({ _id: invoiceId });
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
  current: Status,
  target: Status,
  role: Role
): Result<void, TransitionError> {
  // Rule 1: Only certain roles can cancel
  if (target === 'CANCELLED' && !['OWNER', 'ADMIN'].includes(role)) {
    return err(new TransitionError('Only owners/admins can cancel'));
  }
  
  // Rule 2: Cannot skip states
  if (current === 'DRAFT' && target === 'COMPLETED') {
    return err(new TransitionError('Cannot skip from draft to completed'));
  }
  
  return ok(undefined);
}
```

---

## Testing Domain Logic

Domain logic is tested in isolation without mocks:

```typescript
// tests/domain/fm/fm.behavior.test.ts
import { describe, it, expect } from 'vitest';
import { FMBehavior } from '@/domain/fm/fm.behavior';

describe('FMBehavior', () => {
  describe('canTransitionWorkOrder', () => {
    it('should allow technician to complete in_progress work order', () => {
      const result = FMBehavior.canTransitionWorkOrder({
        currentStatus: 'in_progress',
        targetStatus: 'completed',
        userRole: 'TECHNICIAN',
      });
      expect(result).toBe(true);
    });

    it('should prevent technician from cancelling work order', () => {
      const result = FMBehavior.canTransitionWorkOrder({
        currentStatus: 'pending',
        targetStatus: 'cancelled',
        userRole: 'TECHNICIAN',
      });
      expect(result).toBe(false);
    });
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
- [API Routes](../app/api/README.md)
- [RBAC & Permissions](../lib/rbac.ts)
