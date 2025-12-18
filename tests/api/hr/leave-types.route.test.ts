/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '@/app/api/hr/leave-types/route';

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

vi.mock('@/models/hr/LeaveType', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
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

describe('HR Leave Types API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/hr/leave-types', () => {
    it('should list all leave types', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      const mockLeaveTypes = [
        {
          _id: 'type-1',
          name: 'Annual Leave',
          code: 'ANNUAL',
          daysPerYear: 30,
          requiresApproval: true,
          isPaid: true,
          orgId: 'org-123',
        },
        {
          _id: 'type-2',
          name: 'Sick Leave',
          code: 'SICK',
          daysPerYear: 15,
          requiresApproval: true,
          isPaid: true,
          orgId: 'org-123',
        },
      ];

      vi.mocked(LeaveType.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockLeaveTypes),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/leave-types');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.leaveTypes).toHaveLength(2);
      expect(data.leaveTypes[0].code).toBe('ANNUAL');
    });

    it('should enforce tenant scope', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(LeaveType.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      } as any);

      const request = new NextRequest('http://localhost/api/hr/leave-types');
      (request as any).auth = mockSession;

      await GET(request);

      expect(LeaveType.find).toHaveBeenCalledWith({ orgId: 'org-123' });
    });
  });

  describe('POST /api/hr/leave-types', () => {
    it('should create new leave type', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      const newLeaveType = {
        _id: 'type-new',
        name: 'Maternity Leave',
        code: 'MATERNITY',
        daysPerYear: 60,
        requiresApproval: true,
        isPaid: true,
        orgId: 'org-123',
      };

      vi.mocked(LeaveType.findOne).mockResolvedValue(null);
      vi.mocked(LeaveType.create).mockResolvedValue(newLeaveType as any);

      const request = new NextRequest('http://localhost/api/hr/leave-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Maternity Leave',
          code: 'MATERNITY',
          daysPerYear: 60,
          requiresApproval: true,
          isPaid: true,
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.leaveType.code).toBe('MATERNITY');
    });

    it('should reject duplicate leave type code', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(LeaveType.findOne).mockResolvedValue({ code: 'ANNUAL' } as any);

      const request = new NextRequest('http://localhost/api/hr/leave-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Annual Leave',
          code: 'ANNUAL',
          daysPerYear: 30,
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/hr/leave-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Leave Type',
          // Missing code and daysPerYear
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should inject orgId from session', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(LeaveType.findOne).mockResolvedValue(null);
      vi.mocked(LeaveType.create).mockResolvedValue({ _id: 'new' } as any);

      const request = new NextRequest('http://localhost/api/hr/leave-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Unpaid Leave',
          code: 'UNPAID',
          daysPerYear: 10,
        }),
      });
      (request as any).auth = mockSession;

      await POST(request);

      expect(LeaveType.create).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123' })
      );
    });
  });

  describe('PATCH /api/hr/leave-types', () => {
    it('should update leave type successfully', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      const updatedLeaveType = {
        _id: 'type-1',
        name: 'Annual Leave - Updated',
        code: 'ANNUAL',
        daysPerYear: 35,
        orgId: 'org-123',
      };

      vi.mocked(LeaveType.findByIdAndUpdate).mockResolvedValue(updatedLeaveType as any);

      const request = new NextRequest('http://localhost/api/hr/leave-types', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'type-1',
          name: 'Annual Leave - Updated',
          daysPerYear: 35,
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.leaveType.daysPerYear).toBe(35);
    });

    it('should return 404 for non-existent leave type', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(LeaveType.findByIdAndUpdate).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/hr/leave-types', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'non-existent',
          name: 'Updated',
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request);
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/hr/leave-types', () => {
    it('should delete leave type successfully', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(LeaveType.findByIdAndDelete).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/hr/leave-types', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'type-1' }),
      });
      (request as any).auth = mockSession;

      const response = await DELETE(request);
      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent leave type', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(LeaveType.findByIdAndDelete).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/hr/leave-types', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'non-existent' }),
      });
      (request as any).auth = mockSession;

      const response = await DELETE(request);
      expect(response.status).toBe(404);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const LeaveType = (await import('@/models/hr/LeaveType')).default;
      
      vi.mocked(LeaveType.find).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost/api/hr/leave-types');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(500);
    });
  });
});
