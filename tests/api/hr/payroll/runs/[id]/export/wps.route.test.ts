/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/hr/payroll/runs/[id]/export/wps/route';

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
  },
}));

vi.mock('@/models/hr/PayrollRun', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/hr/PayrollEntry', () => ({
  default: {
    find: vi.fn(),
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

describe('HR Payroll WPS Export API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/hr/payroll/runs/[id]/export/wps', () => {
    it('should export payroll in WPS format', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      const PayrollEntry = (await import('@/models/hr/PayrollEntry')).default;
      
      const mockPayrollRun = {
        _id: 'run-1',
        period: '2024-12',
        status: 'finalized',
        employerCode: 'EMP123',
        bankCode: '80',
        orgId: 'org-123',
      };

      const mockEntries = [
        {
          _id: 'entry-1',
          employeeId: 'emp-1',
          employeeName: 'John Doe',
          employeeIdNumber: '1234567890',
          bankAccount: '1234567890123',
          netSalary: 12050,
          basicSalary: 10000,
          totalAllowances: 3000,
          totalDeductions: 950,
          orgId: 'org-123',
        },
        {
          _id: 'entry-2',
          employeeId: 'emp-2',
          employeeName: 'Jane Smith',
          employeeIdNumber: '0987654321',
          bankAccount: '9876543210987',
          netSalary: 9640,
          basicSalary: 8000,
          totalAllowances: 2400,
          totalDeductions: 760,
          orgId: 'org-123',
        },
      ];

      vi.mocked(PayrollRun.findOne).mockResolvedValue(mockPayrollRun as any);
      vi.mocked(PayrollEntry.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockEntries),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/export/wps');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('wps-2024-12.txt');
    });

    it('should reject export for non-finalized payroll', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue({
        _id: 'run-1',
        status: 'draft',
        orgId: 'org-123',
      } as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/export/wps');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('finalized');
    });

    it('should return 404 for non-existent payroll run', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/non-existent/export/wps');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/export/wps');
      (request as any).auth = mockSession;

      await GET(request, { params: { id: 'run-1' } });

      expect(PayrollRun.findOne).toHaveBeenCalledWith({
        _id: 'run-1',
        orgId: 'org-123',
      });
    });

    it('should format WPS file correctly', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      const PayrollEntry = (await import('@/models/hr/PayrollEntry')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue({
        _id: 'run-1',
        period: '2024-12',
        status: 'finalized',
        employerCode: 'EMP123',
        bankCode: '80',
        orgId: 'org-123',
      } as any);

      vi.mocked(PayrollEntry.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          {
            employeeName: 'John Doe',
            employeeIdNumber: '1234567890',
            bankAccount: '1234567890123',
            netSalary: 12050.50,
            basicSalary: 10000,
            totalAllowances: 3000,
            totalDeductions: 950,
          },
        ]),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/export/wps');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(200);

      const text = await response.text();
      
      // WPS format validation (Saudi Wage Protection System)
      expect(text).toContain('EMP123'); // Employer code
      expect(text).toContain('1234567890'); // Employee ID
      expect(text).toContain('1234567890123'); // Bank account
      expect(text).toContain('12050.50'); // Net salary (2 decimals)
    });

    it('should handle empty payroll runs', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      const PayrollEntry = (await import('@/models/hr/PayrollEntry')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue({
        _id: 'run-1',
        status: 'finalized',
        orgId: 'org-123',
      } as any);

      vi.mocked(PayrollEntry.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([]),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/export/wps');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('entries');
    });

    it('should validate required employee fields', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      const PayrollEntry = (await import('@/models/hr/PayrollEntry')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue({
        _id: 'run-1',
        status: 'finalized',
        orgId: 'org-123',
      } as any);

      vi.mocked(PayrollEntry.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          {
            employeeName: 'John Doe',
            // Missing employeeIdNumber and bankAccount
            netSalary: 12050,
          },
        ]),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/export/wps');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('missing');
    });

    it('should round net salary to 2 decimals', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      const PayrollEntry = (await import('@/models/hr/PayrollEntry')).default;
      
      vi.mocked(PayrollRun.findOne).mockResolvedValue({
        _id: 'run-1',
        status: 'finalized',
        employerCode: 'EMP123',
        bankCode: '80',
        orgId: 'org-123',
      } as any);

      vi.mocked(PayrollEntry.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          {
            employeeName: 'John Doe',
            employeeIdNumber: '1234567890',
            bankAccount: '1234567890123',
            netSalary: 12050.555, // Should round to 12050.56
          },
        ]),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/export/wps');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(200);

      const text = await response.text();
      expect(text).toContain('12050.56'); // Rounded to 2 decimals
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const PayrollRun = (await import('@/models/hr/PayrollRun')).default;
      
      vi.mocked(PayrollRun.findOne).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost/api/hr/payroll/runs/run-1/export/wps');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'run-1' } });
      expect(response.status).toBe(500);
    });
  });
});
