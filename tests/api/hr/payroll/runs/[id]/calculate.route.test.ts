/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/hr/payroll/runs/[id]/calculate/route';

// Mock dependencies
vi.mock('@/lib/auth/authGuard', () => ({
  withAuth: (handler: any) => handler,
}));

vi.mock('@/lib/auth/rbacGuard', () => ({
  enforceRole: () => (handler: any) => handler,
}));

vi.mock('@/lib/api/rate-limit', () => ({
  enforceRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock('@/lib/db/mongoose', () => ({
  default: {
    connection: { readyState: 1 },
    startSession: vi.fn(() => ({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    })),
  },
}));

vi.mock('@/models/hr/PayrollRun', () => ({
  default: {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('@/models/hr/Employee', () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock('@/models/hr/PayrollEntry', () => ({
  default: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

const mockSession = {
  user: {
    id: 'user-123',
    email: 'hr@fixzit.com',
    role: 'hr_manager',
    orgId: 'org-123',
  },
};

describe('HR Payroll Calculate API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/hr/payroll/runs/[id]/calculate', () => {
    it('should calculate payroll for all employees', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      const Employee = (await import('@/models/hr/Employee')).default;
      const PayrollEntry = (await import('@/models/hr/PayrollEntry')).default;
      
      const mockPayrollRun = {
        _id: 'run-1',
        period: '2024-12',
        status: 'draft',
        orgId: 'org-123',
      };

      const mockEmployees = [
        {
          _id: 'emp-1',
          name: 'John Doe',
          basicSalary: 10000,
          allowances: { housing: 2000, transport: 1000 },
          deductions: { gosi: 950 },
          orgId: 'org-123',
        },
        {
          _id: 'emp-2',
          name: 'Jane Smith',
          basicSalary: 8000,
          allowances: { housing: 1600, transport: 800 },
          deductions: { gosi: 760 },
          orgId: 'org-123',
        },
      ];

      const mockPayrollEntries = [
        {
          payrollRunId: 'run-1',
          employeeId: 'emp-1',
          basicSalary: 10000,
          totalAllowances: 3000,
          totalDeductions: 950,
          netSalary: 12050,
          orgId: 'org-123',
        },
        {
          payrollRunId: 'run-1',
          employeeId: 'emp-2',
          basicSalary: 8000,
          totalAllowances: 2400,
          totalDeductions: 760,
          netSalary: 9640,
          orgId: 'org-123',
        },
      ];

      vi.mocked(PayrollRun.findOne).mockResolvedValue(mockPayrollRun as any);
      vi.mocked(Employee.find).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockEmployees),
      } as any);
      vi.mocked(PayrollEntry.deleteMany).mockResolvedValue({ deletedCount: 0 } as any);
      vi.mocked(PayrollEntry.create).mockResolvedValue(mockPayrollEntries as any);
      vi.mocked(PayrollRun.findByIdAndUpdate).mockResolvedValue({
        ...mockPayrollRun,
        totalEmployees: 2,
        totalGrossPay: 20000,
        totalNetPay: 21690,
        calculatedAt: new Date(),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/calculate', {
        method: 'POST',
      });
      (request as any).auth = mockSession;

      const response = await POST(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.payrollRun.totalEmployees).toBe(2);
      expect(data.entries).toHaveLength(2);
    });

    it('should reject calculation for non-draft payroll runs', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue({
        _id: 'run-1',
        status: 'finalized',
        orgId: 'org-123',
      } as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/calculate', {
        method: 'POST',
      });
      (request as any).auth = mockSession;

      const response = await POST(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('draft');
    });

    it('should return 404 for non-existent payroll run', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/non-existent/calculate', {
        method: 'POST',
      });
      (request as any).auth = mockSession;

      const response = await POST(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/calculate', {
        method: 'POST',
      });
      (request as any).auth = mockSession;

      await POST(request, { params: { id: 'run-1' } });

      expect(PayrollRun.findOne).toHaveBeenCalledWith({
        _id: 'run-1',
        orgId: 'org-123',
      });
    });

    it('should calculate GOSI deductions correctly', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      const Employee = (await import('@/models/hr/Employee')).default;
      const PayrollEntry = (await import('@/models/hr/PayrollEntry')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue({
        _id: 'run-1',
        status: 'draft',
        orgId: 'org-123',
      } as any);

      vi.mocked(Employee.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([
          {
            _id: 'emp-1',
            basicSalary: 10000,
            allowances: { housing: 2000 },
            deductions: {},
            gosiContribution: 'employee', // 9.5% of basic
            orgId: 'org-123',
          },
        ]),
      } as any);

      vi.mocked(PayrollEntry.deleteMany).mockResolvedValue({ deletedCount: 0 } as any);
      vi.mocked(PayrollEntry.create).mockResolvedValue([
        {
          employeeId: 'emp-1',
          basicSalary: 10000,
          totalDeductions: 950, // 9.5% of 10000
          orgId: 'org-123',
        },
      ] as any);
      vi.mocked(PayrollRun.findByIdAndUpdate).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/calculate', {
        method: 'POST',
      });
      (request as any).auth = mockSession;

      const response = await POST(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(200);

      expect(PayrollEntry.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            totalDeductions: 950,
          }),
        ])
      );
    });

    it('should handle overtime calculations', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      const Employee = (await import('@/models/hr/Employee')).default;
      const PayrollEntry = (await import('@/models/hr/PayrollEntry')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue({
        _id: 'run-1',
        status: 'draft',
        orgId: 'org-123',
      } as any);

      vi.mocked(Employee.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([
          {
            _id: 'emp-1',
            basicSalary: 10000,
            allowances: { housing: 2000 },
            overtime: { hours: 20, rate: 50 }, // 20 hours @ SAR 50/hr
            orgId: 'org-123',
          },
        ]),
      } as any);

      vi.mocked(PayrollEntry.deleteMany).mockResolvedValue({ deletedCount: 0 } as any);
      vi.mocked(PayrollEntry.create).mockResolvedValue([
        {
          employeeId: 'emp-1',
          basicSalary: 10000,
          totalAllowances: 3000, // housing + overtime (1000)
          orgId: 'org-123',
        },
      ] as any);
      vi.mocked(PayrollRun.findByIdAndUpdate).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/calculate', {
        method: 'POST',
      });
      (request as any).auth = mockSession;

      await POST(request, { params: { id: 'run-1' } });

      expect(PayrollEntry.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            totalAllowances: expect.any(Number),
          }),
        ])
      );
    });

    it('should rollback on entry creation failure', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      const Employee = (await import('@/models/hr/Employee')).default;
      const PayrollEntry = (await import('@/models/hr/PayrollEntry')).default;
      const mongoose = (await import('@/lib/db/mongoose')).default;
      
      const mockMongooseSession = {
        startTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
      };

      vi.mocked(mongoose.startSession).mockResolvedValue(mockMongooseSession as any);
      vi.mocked(PayrollRun.findOne).mockResolvedValue({
        _id: 'run-1',
        status: 'draft',
        orgId: 'org-123',
      } as any);
      vi.mocked(Employee.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: 'emp-1', basicSalary: 10000 }]),
      } as any);
      vi.mocked(PayrollEntry.deleteMany).mockResolvedValue({ deletedCount: 0 } as any);
      vi.mocked(PayrollEntry.create).mockRejectedValue(new Error('Entry creation failed'));

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/calculate', {
        method: 'POST',
      });
      (request as any).auth = mockSession;

      const response = await POST(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(500);
      expect(mockMongooseSession.abortTransaction).toHaveBeenCalled();
    });
  });
});
