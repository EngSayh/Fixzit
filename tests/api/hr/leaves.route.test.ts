/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/hr/leaves/route';

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

vi.mock('@/models/hr/Leave', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('@/models/hr/Employee', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/hr/LeaveType', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

const mockSession = {
  user: {
    id: 'user-123',
    email: 'employee@fixzit.com',
    role: 'employee',
    orgId: 'org-123',
  },
};

describe('HR Leaves API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/hr/leaves', () => {
    it('should list leave requests with pagination', async () => {
      const Leave = (await import('@/models/hr/Leave')).default;
      
      const mockLeaves = [
        {
          _id: 'leave-1',
          employeeId: 'emp-1',
          employeeName: 'John Doe',
          leaveTypeId: 'type-1',
          leaveTypeName: 'Annual Leave',
          startDate: new Date('2024-12-20'),
          endDate: new Date('2024-12-25'),
          days: 5,
          status: 'approved',
          orgId: 'org-123',
        },
      ];

      vi.mocked(Leave.find).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockLeaves),
      } as any);

      vi.mocked(Leave.countDocuments).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/hr/leaves?page=1&limit=20');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.leaves).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
    });

    it('should filter leaves by status', async () => {
      const Leave = (await import('@/models/hr/Leave')).default;
      
      vi.mocked(Leave.find).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any);

      vi.mocked(Leave.countDocuments).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/hr/leaves?status=approved');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      expect(Leave.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' })
      );
    });

    it('should filter leaves by employee', async () => {
      const Leave = (await import('@/models/hr/Leave')).default;
      
      vi.mocked(Leave.find).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/leaves?employeeId=emp-1');
      (request as any).auth = mockSession;

      await GET(request);

      expect(Leave.find).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 'emp-1' })
      );
    });

    it('should enforce tenant scope', async () => {
      const Leave = (await import('@/models/hr/Leave')).default;
      
      vi.mocked(Leave.find).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/leaves');
      (request as any).auth = mockSession;

      await GET(request);

      expect(Leave.find).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123' })
      );
    });
  });

  describe('POST /api/hr/leaves', () => {
    it('should create new leave request', async () => {
      const Leave = (await import('@/models/hr/Leave')).default;
      const Employee = (await import('@/models/hr/Employee')).default;
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(Employee.findOne).mockResolvedValue({
        _id: 'emp-1',
        orgId: 'org-123',
      } as any);

      vi.mocked(LeaveType.findOne).mockResolvedValue({
        _id: 'type-1',
        name: 'Annual Leave',
        daysPerYear: 30,
        orgId: 'org-123',
      } as any);

      const newLeave = {
        _id: 'leave-new',
        employeeId: 'emp-1',
        leaveTypeId: 'type-1',
        startDate: new Date('2024-12-20'),
        endDate: new Date('2024-12-25'),
        days: 5,
        status: 'pending',
        orgId: 'org-123',
      };

      vi.mocked(Leave.create).mockResolvedValue(newLeave as any);

      const request = new NextRequest('http://localhost/api/hr/leaves', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: 'emp-1',
          leaveTypeId: 'type-1',
          startDate: '2024-12-20',
          endDate: '2024-12-25',
          reason: 'Family vacation',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.leave.status).toBe('pending');
      expect(data.leave.days).toBe(5);
    });

    it('should validate date range (end >= start)', async () => {
      const request = new NextRequest('http://localhost/api/hr/leaves', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: 'emp-1',
          leaveTypeId: 'type-1',
          startDate: '2024-12-25',
          endDate: '2024-12-20', // Invalid: end before start
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('date');
    });

    it('should check for overlapping leave requests', async () => {
      const Leave = (await import('@/models/hr/Leave')).default;
      const Employee = (await import('@/models/hr/Employee')).default;
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(Employee.findOne).mockResolvedValue({ _id: 'emp-1' } as any);
      vi.mocked(LeaveType.findOne).mockResolvedValue({ _id: 'type-1' } as any);
      vi.mocked(Leave.findOne).mockResolvedValue({
        _id: 'leave-existing',
        employeeId: 'emp-1',
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-12-22'),
        status: 'approved',
      } as any);

      const request = new NextRequest('http://localhost/api/hr/leaves', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: 'emp-1',
          leaveTypeId: 'type-1',
          startDate: '2024-12-20',
          endDate: '2024-12-25',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toContain('overlap');
    });

    it('should validate employee exists and belongs to org', async () => {
      const Employee = (await import('@/models/hr/Employee')).default;
      
      vi.mocked(Employee.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/hr/leaves', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: 'non-existent',
          leaveTypeId: 'type-1',
          startDate: '2024-12-20',
          endDate: '2024-12-25',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toContain('Employee');
    });

    it('should validate leave type exists and belongs to org', async () => {
      const Employee = (await import('@/models/hr/Employee')).default;
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(Employee.findOne).mockResolvedValue({ _id: 'emp-1' } as any);
      vi.mocked(LeaveType.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/hr/leaves', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: 'emp-1',
          leaveTypeId: 'non-existent',
          startDate: '2024-12-20',
          endDate: '2024-12-25',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toContain('Leave type');
    });

    it('should inject orgId from session', async () => {
      const Leave = (await import('@/models/hr/Leave')).default;
      const Employee = (await import('@/models/hr/Employee')).default;
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(Employee.findOne).mockResolvedValue({ _id: 'emp-1' } as any);
      vi.mocked(LeaveType.findOne).mockResolvedValue({ _id: 'type-1' } as any);
      vi.mocked(Leave.findOne).mockResolvedValue(null);
      vi.mocked(Leave.create).mockResolvedValue({ _id: 'new' } as any);

      const request = new NextRequest('http://localhost/api/hr/leaves', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: 'emp-1',
          leaveTypeId: 'type-1',
          startDate: '2024-12-20',
          endDate: '2024-12-25',
        }),
      });
      (request as any).auth = mockSession;

      await POST(request);

      expect(Leave.create).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123' })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const Leave = (await import('@/models/hr/Leave')).default;
      
      vi.mocked(Leave.find).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost/api/hr/leaves');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(500);
    });
  });
});
