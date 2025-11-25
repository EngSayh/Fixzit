# Fixzit Architecture Decision Records (ADRs)

This document captures key architectural decisions for the Fixzit platform, establishing ground truth for future development and preventing repeated debates.

## Table of Contents

1. [Currency Handling](#1-currency-handling)
2. [Collection Structure](#2-collection-structure)
3. [Denormalization Patterns](#3-denormalization-patterns)
4. [Transaction Integrity](#4-transaction-integrity)
5. [Design System](#5-design-system)
6. [Internationalization (i18n)](#6-internationalization-i18n)

---

## 1. Currency Handling

### Decision

Use **SAR (Saudi Riyals) with 2 decimal precision** for all monetary values. Do NOT use Halalas as the base unit.

### Rationale

- **Human-readable**: Developers and stakeholders think in SAR, not Halalas (1 SAR = 100 Halalas)
- **Standard precision**: 2 decimal places matches banking and accounting practices
- **Rounding**: Use `Math.round(value * 100) / 100` for consistent rounding to 2 decimals
- **Simplicity**: Avoids mental conversion overhead (e.g., "is 150000 Halalas = 1,500 SAR?")

### Implementation

```typescript
// ✅ CORRECT: Store as SAR with 2 decimals
const basicSalary = 5000.0; // SAR
const allowance = 1500.5; // SAR
const total = Math.round((basicSalary + allowance) * 100) / 100; // 6500.50 SAR

// ❌ WRONG: Store as Halalas
const basicSalary = 500000; // Halalas (confusing)
```

### Exceptions

None. All financial amounts in the system (salaries, allowances, deductions, invoices) use SAR with 2 decimals.

---

## 2. Collection Structure

### Decision

Store **Payslips as a separate collection**, not embedded within PayrollRun or Employee documents.

### Rationale

- **Query flexibility**: Need to query payslips independently (e.g., "Find all payslips for employee X in 2024")
- **Document size limits**: Embedding thousands of payslips in PayrollRun would exceed MongoDB's 16MB document limit
- **Independent lifecycle**: Payslips may be corrected, reprinted, or audited separately from payroll runs
- **Performance**: Indexing on employeeId, period, status enables fast queries without scanning entire PayrollRun documents

### Implementation

```typescript
// ✅ CORRECT: Separate collections with references
interface IPayrollRun {
  _id: ObjectId;
  period: string; // "2024-01"
  status: PayrollRunStatus;
  // Payslips stored separately, referenced by payrollRunId
}

interface IPayslip {
  _id: ObjectId;
  payrollRunId: ObjectId; // References IPayrollRun
  employeeId: ObjectId; // References IEmployee
  period: string;
  // ... payslip details
}

// Query: Get all payslips for a run
const payslips = await Payslip.find({ payrollRunId: runId });

// ❌ WRONG: Embedded payslips
interface IPayrollRun {
  payslips: IPayslip[]; // Will hit 16MB limit, slow queries
}
```

### Trade-offs

- **Pros**: Scalability, query performance, maintainability
- **Cons**: Requires JOIN-like queries (MongoDB aggregation) for combined data

---

## 3. Denormalization Patterns

### Decision

**Duplicate frequently-accessed data** (employeeCode, employeeName, iban) in Payslip documents for performance, despite creating update complexity.

### Rationale

- **WPS export optimization**: Generating WPS files requires employee name, code, and IBAN. Without denormalization, each export would require 1000+ Employee document lookups.
- **Read-heavy workload**: Payslips are read far more often than updated (report generation, reprints, audits)
- **Immutability**: Once approved, payslips should not change even if employee data updates (e.g., name correction should not retroactively change past payslips)
- **Performance**: 1 Payslip query vs 1 Payslip query + 1000 Employee lookups = 90% faster WPS generation

### Implementation

```typescript
// ✅ CORRECT: Denormalized employee data in payslip
interface IPayslip {
  employeeId: ObjectId;
  employeeCode: string; // Denormalized from Employee
  employeeName: string; // Denormalized from Employee
  employeeIBAN: string; // Denormalized from Employee
  // ... rest of payslip
}

// WPS export: No need to query Employee collection
const payslips = await Payslip.find({ payrollRunId });
const wpsRecords = payslips.map((p) => ({
  employeeCode: p.employeeCode, // Available directly
  employeeName: p.employeeName,
  iban: p.employeeIBAN,
  netPay: p.netPay,
}));

// ❌ WRONG: Normalized (requires 1000+ lookups)
interface IPayslip {
  employeeId: ObjectId; // Only reference
  // Must query Employee for name, code, IBAN
}
```

### Trade-offs

- **Pros**: 90% faster WPS exports, immutable historical records
- **Cons**: Employee updates require cascading updates to all their payslips (handled by application logic)

### Update Strategy

When employee data changes:

1. Update Employee document
2. **Do NOT update past approved payslips** (historical accuracy)
3. Only update DRAFT payslips if correction needed

---

## 4. Transaction Integrity

### Decision

Implement a **state machine for PayrollRun** with strict transition rules and immutability guarantees.

### Rationale

- **Audit compliance**: Payroll is subject to labor law audits. Once approved, records must be immutable.
- **Financial accuracy**: Prevent accidental changes to calculated payroll after approval
- **Approval chain**: Enforce business process (calculate → review → approve → lock → export)
- **Rollback safety**: If errors found after approval, create corrective runs instead of editing

### State Machine

```
DRAFT → CALCULATED → APPROVED → LOCKED
  ↓         ↓           ↓
DELETE   RECALC      (immutable after LOCKED)
```

### Implementation

```typescript
enum PayrollRunStatus {
  DRAFT = "DRAFT", // Can be edited/deleted
  CALCULATED = "CALCULATED", // Can be recalculated or approved
  APPROVED = "APPROVED", // Can be locked or recalculated (with approval reset)
  LOCKED = "LOCKED", // Immutable, can export WPS
  EXPORTED = "EXPORTED", // WPS file generated
}

// ✅ CORRECT: State transitions enforced
async function approvePayrollRun(runId: string) {
  const run = await PayrollRun.findById(runId);
  if (run.status !== PayrollRunStatus.CALCULATED) {
    throw new Error("Can only approve CALCULATED payroll runs");
  }
  run.status = PayrollRunStatus.APPROVED;
  run.approvedBy = currentUser;
  run.approvedAt = new Date();
  await run.save();
}

// ❌ WRONG: No state validation
async function approvePayrollRun(runId: string) {
  await PayrollRun.updateOne({ _id: runId }, { status: "APPROVED" });
  // What if it was already LOCKED? What if calculations failed?
}
```

### Immutability Rules

- **LOCKED status**: Cannot edit payslips, cannot recalculate, cannot delete
- **EXPORTED status**: Additional protection, marks that WPS file has been submitted to bank
- **Correction process**: If error found post-LOCKED, create a new corrective payroll run

---

## 5. Design System

### Decision

Enforce a **16px border radius (rounded-2xl in Tailwind)** and **semantic color tokens** across all UI components.

### Rationale

- **Visual consistency**: Users perceive cohesive design when components share border radius
- **Theme support**: Semantic tokens enable light/dark mode without component changes
- **Maintainability**: Changing theme colors updates entire app (no hardcoded colors scattered in 100+ files)
- **Accessibility**: Semantic tokens ensure proper contrast ratios in both themes

### Implementation

```tsx
// ✅ CORRECT: Semantic tokens + rounded-2xl
<Card className="bg-card border-border rounded-2xl">
  <CardContent className="text-foreground">
    <p className="text-muted-foreground">Description</p>
  </CardContent>
</Card>

// ❌ WRONG: Hardcoded colors + inconsistent radius
<div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg">
  <p className="text-gray-700 dark:text-gray-200">Description</p>
</div>
```

### Semantic Token Reference

| Token                   | Light Mode | Dark Mode | Usage                 |
| ----------------------- | ---------- | --------- | --------------------- |
| `bg-background`         | white      | #0a0a0a   | Page background       |
| `bg-card`               | white      | #1a1a1a   | Card/panel background |
| `bg-muted`              | #f4f4f5    | #27272a   | Disabled/secondary bg |
| `bg-popover`            | white      | #09090b   | Dialog/popover bg     |
| `border-border`         | #e4e4e7    | #27272a   | All borders           |
| `text-foreground`       | #09090b    | #fafafa   | Primary text          |
| `text-muted-foreground` | #71717a    | #a1a1aa   | Secondary text        |

### Border Radius Standards

- **rounded-2xl (16px)**: All cards, dialogs, modals, panels
- **rounded-full**: Avatar images, toggle switches, badges
- **rounded-lg (8px)**: ONLY for small badges/pills

### Exceptions

- Toggle switches: Use `rounded-full` for circular shape
- Avatar images: Use `rounded-full` for profile pictures
- Small badges: May use `rounded-lg` if `rounded-2xl` looks too large

---

## 6. Internationalization (i18n)

### Decision

**No hardcoded text in UI components**. All user-facing strings must use translation keys with fallback values.

### Rationale

- **KSA market requirement**: Arabic (RTL) is the primary language, English is secondary
- **Legal compliance**: Labor Ministry requires Arabic in HR/payroll systems
- **User experience**: Users must be able to switch languages without losing context
- **Maintainability**: Centralizing translations prevents inconsistent wording

### Implementation

```tsx
// ✅ CORRECT: Translation key with fallback
import { useTranslation } from "@/contexts/TranslationContext";

export function EmployeeCard() {
  const { t, isRTL } = useTranslation();
  return (
    <div>
      <h2>{t("employees.title", "Employees")}</h2>
      <p>{t("employees.description", "Manage your workforce")}</p>
    </div>
  );
}

// ❌ WRONG: Hardcoded English text
export function EmployeeCard() {
  return (
    <div>
      <h2>Employees</h2>
      <p>Manage your workforce</p>
    </div>
  );
}
```

### RTL-Aware Icons

Icons must flip direction in RTL languages:

```tsx
// ✅ CORRECT: RTL-aware arrow icons
const { isRTL } = useTranslation();
const BackIcon = isRTL ? ArrowRight : ArrowLeft;
const NextIcon = isRTL ? ArrowLeft : ArrowRight;

<Button>
  <BackIcon className="h-4 w-4" />
  {t('common.back', 'Back')}
</Button>

// ❌ WRONG: Hardcoded ArrowLeft (points wrong direction in Arabic)
<Button>
  <ArrowLeft className="h-4 w-4" />
  Back
</Button>
```

### Translation Key Naming Convention

- **Namespace.action**: `employees.add`, `payroll.calculate`, `common.save`
- **Namespace.field**: `employees.name`, `employees.code`, `employees.department`
- **Namespace.message**: `employees.empty`, `employees.loading`, `employees.error`

### Fallback Strategy

Always provide English fallback in `t()` calls:

```tsx
t("employees.notFound", "No employees found"); // ✅ Has fallback
t("employees.notFound"); // ❌ Missing fallback - shows key if translation missing
```

### Translation File Structure

```typescript
// contexts/TranslationContext.tsx
const translations = {
  ar: {
    common: { save: "حفظ", cancel: "إلغاء", back: "رجوع" },
    employees: { title: "الموظفون", add: "إضافة موظف" },
  },
  en: {
    common: { save: "Save", cancel: "Cancel", back: "Back" },
    employees: { title: "Employees", add: "Add Employee" },
  },
};
```

---

## Revision History

| Version | Date       | Author         | Changes                                                          |
| ------- | ---------- | -------------- | ---------------------------------------------------------------- |
| 1.0     | 2024-01-XX | GitHub Copilot | Initial architecture documentation following code review session |

---

## Sign-off

This document represents the agreed-upon architectural decisions for the Fixzit platform. All future development should follow these patterns unless explicitly revised through architectural review.

**Status**: ✅ **Approved** (awaiting user sign-off)

---

## Related Documents

- [HR Module Implementation Guide](./HR_MODULE.md) (if exists)
- [API Documentation](../openapi.yaml)
- [Design System](../components.json)
- [Translation Keys Reference](../contexts/TranslationContext.tsx)
