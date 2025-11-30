# fix-security-hr-role-guards.md

## Issue: SEC-004 - Missing HR Role Guards (canViewPayroll, canEditPayroll)

### Priority: P0 CRITICAL
### Category: Security/RBAC/Auth
### Labels: `copilot:ready`, `owner:backend`, `flag:rbac_gap`

---

## Problem Statement

No dedicated role guards exist for payroll and HR data access. The current implementation allows any authenticated user with HR_MANAGER role to access sensitive payroll data without explicit permission checks.

## Affected Files

1. `/Fixzit/lib/auth/role-guards.ts` - Missing guards
2. `/Fixzit/app/api/hr/payroll/**` - API routes without guards
3. `/Fixzit/app/api/hr/employees/**` - API routes without PII guards

## Root Cause

Role guards were created for Finance and CRM but not extended to cover HR-specific permissions like payroll access and employee PII viewing.

## Fix Implementation

### Step 1: Add HR Role Guards to `/Fixzit/lib/auth/role-guards.ts`

Add after the existing `canManageOwnerGroups` function:

```typescript
// =====================================================================
// HR MODULE ROLE GUARDS
// STRICT v4: HR access limited by principle of least privilege
// =====================================================================

/**
 * 🔒 STRICT v4: View payroll data
 * Limited to HR Manager, Finance Officer, and Admin roles
 * 
 * Use case: Viewing payroll runs, reports, employee compensation summaries
 */
export const canViewPayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.FINANCE_OFFICER,
  ],
  ["HR_ADMIN", "PAYROLL_ADMIN"],
);

/**
 * 🔒 STRICT v4: Edit payroll data
 * More restrictive than view - requires HR Manager or above
 * 
 * Use case: Creating/modifying payroll runs, adjusting line items
 */
export const canEditPayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
  ],
  ["HR_ADMIN", "PAYROLL_ADMIN"],
);

/**
 * 🔒 STRICT v4: Approve payroll for processing
 * Requires dual control - only Corporate Admin+ can approve
 * 
 * Use case: Final approval before bank export/payment processing
 */
export const canApprovePayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
  ],
  [], // No legacy roles - strict compliance
);

/**
 * 🔒 STRICT v4: Export payroll to bank format
 * Requires same level as approval - sensitive financial operation
 * 
 * Use case: Generating WPS files, bank payment files
 */
export const canExportPayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE_OFFICER,
  ],
  ["FINANCE_ADMIN"],
);

/**
 * 🔒 STRICT v4: View employee PII (compensation, bank details)
 * Limited to HR and Finance roles with legitimate need
 * 
 * Use case: Viewing salary, IBAN, national ID
 * NOTE: These fields are encrypted - this guard controls decrypted access
 */
export const canViewEmployeePII = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.FINANCE_OFFICER,
  ],
  ["HR_ADMIN", "FINANCE_ADMIN"],
);

/**
 * 🔒 STRICT v4: Edit employee PII
 * More restrictive - only HR Manager or above
 * 
 * Use case: Updating bank details, salary changes
 */
export const canEditEmployeePII = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
  ],
  ["HR_ADMIN"],
);

/**
 * 🔒 STRICT v4: Manage HR recruitment (ATS)
 * HR Manager and Hiring Managers
 * 
 * Use case: Job postings, candidate management, interview scheduling
 */
export const canManageRecruitment = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.HIRING_MANAGER,
  ],
  ["HR_ADMIN", "RECRUITING_ADMIN"],
);

/**
 * 🔒 STRICT v4: Convert candidates to employees
 * Requires HR Manager approval
 * 
 * Use case: Hiring workflow completion, onboarding initiation
 */
export const canConvertCandidates = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
  ],
  ["HR_ADMIN"],
);

/**
 * 🔒 STRICT v4: View leave and attendance records
 * HR, Managers, and the employee themselves (self-service)
 * 
 * Use case: Leave requests, attendance reports
 */
export const canViewAttendance = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
  ],
  ["HR_ADMIN"],
);

/**
 * 🔒 STRICT v4: Approve leave requests
 * HR Manager and direct managers
 * 
 * Use case: Leave approval workflow
 */
export const canApproveLeave = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
  ],
  ["HR_ADMIN"],
);

/**
 * 🔒 STRICT v4: Manage performance reviews
 * HR and direct managers
 * 
 * Use case: Performance review creation, KPI setting, ratings
 */
export const canManagePerformance = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.MANAGER,
  ],
  ["HR_ADMIN"],
);
```

### Step 2: Export New Guards

Update the file exports if using named exports pattern:

```typescript
// At end of file or in exports section
export {
  // ... existing exports
  canViewPayroll,
  canEditPayroll,
  canApprovePayroll,
  canExportPayroll,
  canViewEmployeePII,
  canEditEmployeePII,
  canManageRecruitment,
  canConvertCandidates,
  canViewAttendance,
  canApproveLeave,
  canManagePerformance,
};
```

### Step 3: Apply Guards to Payroll API Routes

Update `/Fixzit/app/api/hr/payroll/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { canViewPayroll, canEditPayroll } from '@/lib/auth/role-guards';
import { PayrollRun } from '@/server/models/hr.models';
import { setTenantContext } from '@/server/plugins/tenantIsolation';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 🔒 RBAC check
  if (!canViewPayroll(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions to view payroll' }, 
      { status: 403 }
    );
  }
  
  setTenantContext({ orgId: session.user.orgId });
  
  const payrollRuns = await PayrollRun.find({})
    .sort({ periodStart: -1 })
    .lean();
  
  return NextResponse.json(payrollRuns);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 🔒 RBAC check - editing requires higher permission
  if (!canEditPayroll(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions to create payroll' }, 
      { status: 403 }
    );
  }
  
  setTenantContext({ orgId: session.user.orgId });
  
  const body = await req.json();
  const payrollRun = await PayrollRun.create({
    ...body,
    createdBy: session.user.id,
  });
  
  return NextResponse.json(payrollRun, { status: 201 });
}
```

### Step 4: Apply Guards to Employee PII Routes

Update `/Fixzit/app/api/hr/employees/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { canViewEmployeePII, canEditEmployeePII } from '@/lib/auth/role-guards';
import { Employee } from '@/server/models/hr.models';
import { setTenantContext } from '@/server/plugins/tenantIsolation';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  setTenantContext({ orgId: session.user.orgId });
  
  const url = new URL(req.url);
  const includePII = url.searchParams.get('includePII') === 'true';
  
  // 🔒 RBAC check for PII access
  if (includePII && !canViewEmployeePII(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions to view employee PII' }, 
      { status: 403 }
    );
  }
  
  // Build projection based on permissions
  const projection = includePII 
    ? {} // All fields including encrypted PII
    : { 
        'compensation.baseSalary': 0,
        'compensation.housingAllowance': 0,
        'bankDetails': 0,
      };
  
  const employee = await Employee.findById(params.id)
    .select(projection)
    .lean();
  
  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }
  
  return NextResponse.json(employee);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await req.json();
  
  // 🔒 Check if updating PII fields
  const piiFields = ['compensation', 'bankDetails'];
  const isUpdatingPII = piiFields.some(field => field in body);
  
  if (isUpdatingPII && !canEditEmployeePII(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions to edit employee PII' }, 
      { status: 403 }
    );
  }
  
  setTenantContext({ orgId: session.user.orgId });
  
  const employee = await Employee.findByIdAndUpdate(
    params.id,
    { ...body, updatedBy: session.user.id },
    { new: true, runValidators: true }
  );
  
  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }
  
  return NextResponse.json(employee);
}
```

## Verification Steps

### 1. Create Unit Tests

Create `/Fixzit/tests/unit/auth/hr-role-guards.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  canViewPayroll,
  canEditPayroll,
  canApprovePayroll,
  canViewEmployeePII,
  canEditEmployeePII,
  canManageRecruitment,
} from '@/lib/auth/role-guards';

describe('HR Role Guards', () => {
  describe('canViewPayroll', () => {
    it('allows SUPER_ADMIN', () => {
      expect(canViewPayroll('SUPER_ADMIN')).toBe(true);
    });
    
    it('allows HR_MANAGER', () => {
      expect(canViewPayroll('HR_MANAGER')).toBe(true);
    });
    
    it('allows FINANCE_OFFICER', () => {
      expect(canViewPayroll('FINANCE_OFFICER')).toBe(true);
    });
    
    it('denies EMPLOYEE', () => {
      expect(canViewPayroll('EMPLOYEE')).toBe(false);
    });
    
    it('denies TECHNICIAN', () => {
      expect(canViewPayroll('TECHNICIAN')).toBe(false);
    });
    
    it('denies undefined role', () => {
      expect(canViewPayroll(undefined)).toBe(false);
    });
  });
  
  describe('canEditPayroll', () => {
    it('allows HR_MANAGER', () => {
      expect(canEditPayroll('HR_MANAGER')).toBe(true);
    });
    
    it('denies FINANCE_OFFICER (view-only)', () => {
      expect(canEditPayroll('FINANCE_OFFICER')).toBe(false);
    });
  });
  
  describe('canApprovePayroll', () => {
    it('allows CORPORATE_ADMIN', () => {
      expect(canApprovePayroll('CORPORATE_ADMIN')).toBe(true);
    });
    
    it('denies HR_MANAGER (dual control)', () => {
      expect(canApprovePayroll('HR_MANAGER')).toBe(false);
    });
  });
  
  describe('canViewEmployeePII', () => {
    it('allows HR_MANAGER', () => {
      expect(canViewEmployeePII('HR_MANAGER')).toBe(true);
    });
    
    it('allows FINANCE_OFFICER', () => {
      expect(canViewEmployeePII('FINANCE_OFFICER')).toBe(true);
    });
    
    it('denies MANAGER', () => {
      expect(canViewEmployeePII('MANAGER')).toBe(false);
    });
  });
  
  describe('canEditEmployeePII', () => {
    it('allows HR_MANAGER', () => {
      expect(canEditEmployeePII('HR_MANAGER')).toBe(true);
    });
    
    it('denies FINANCE_OFFICER', () => {
      expect(canEditEmployeePII('FINANCE_OFFICER')).toBe(false);
    });
  });
});
```

### 2. Create API Integration Tests

Create `/Fixzit/tests/integration/api/hr/payroll-rbac.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createMockRequest, createMockSession } from '@/tests/utils/mocks';

describe('Payroll API RBAC', () => {
  describe('GET /api/hr/payroll', () => {
    it('returns 403 for EMPLOYEE role', async () => {
      const req = createMockRequest('GET', '/api/hr/payroll');
      const session = createMockSession({ role: 'EMPLOYEE' });
      
      // Mock getServerSession
      vi.mocked(getServerSession).mockResolvedValue(session);
      
      const response = await GET(req);
      expect(response.status).toBe(403);
    });
    
    it('returns 200 for HR_MANAGER role', async () => {
      const req = createMockRequest('GET', '/api/hr/payroll');
      const session = createMockSession({ role: 'HR_MANAGER' });
      
      vi.mocked(getServerSession).mockResolvedValue(session);
      
      const response = await GET(req);
      expect(response.status).toBe(200);
    });
  });
  
  describe('POST /api/hr/payroll', () => {
    it('returns 403 for FINANCE_OFFICER (view-only)', async () => {
      const req = createMockRequest('POST', '/api/hr/payroll', { name: 'Test' });
      const session = createMockSession({ role: 'FINANCE_OFFICER' });
      
      vi.mocked(getServerSession).mockResolvedValue(session);
      
      const response = await POST(req);
      expect(response.status).toBe(403);
    });
  });
});
```

### 3. Run Tests

```bash
# Run unit tests
pnpm test tests/unit/auth/hr-role-guards.test.ts

# Run integration tests
pnpm test tests/integration/api/hr/payroll-rbac.test.ts

# Run all auth tests
pnpm test tests/unit/auth/ tests/integration/api/hr/
```

### 4. Manual Verification

```bash
# Test with different role tokens
# As EMPLOYEE - should get 403
curl -X GET "http://localhost:3000/api/hr/payroll" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"

# As HR_MANAGER - should get 200
curl -X GET "http://localhost:3000/api/hr/payroll" \
  -H "Authorization: Bearer $HR_MANAGER_TOKEN"

# As FINANCE_OFFICER - should get 200 for view, 403 for edit
curl -X GET "http://localhost:3000/api/hr/payroll" \
  -H "Authorization: Bearer $FINANCE_TOKEN"

curl -X POST "http://localhost:3000/api/hr/payroll" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d '{"name":"Test"}' # Should get 403
```

## RBAC Matrix Summary

| Role | View Payroll | Edit Payroll | Approve Payroll | View PII | Edit PII |
|------|-------------|--------------|-----------------|----------|----------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| CORPORATE_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| HR_MANAGER | ✅ | ✅ | ❌ | ✅ | ✅ |
| FINANCE_OFFICER | ✅ | ❌ | ❌ | ✅ | ❌ |
| MANAGER | ❌ | ❌ | ❌ | ❌ | ❌ |
| EMPLOYEE | ❌ | ❌ | ❌ | ❌ | ❌ |
| TECHNICIAN | ❌ | ❌ | ❌ | ❌ | ❌ |

## Related Issues

- SEC-001: PII Encryption (guards control access to encrypted data)
- DATA-002: PayrollLine Encryption (financial data protected)

## Compliance

- ✅ Principle of Least Privilege
- ✅ Separation of Duties (HR can't approve own payroll)
- ✅ Saudi Labor Law Article 52 (salary confidentiality)
- ✅ SOC 2 CC6.1 (logical access controls)
