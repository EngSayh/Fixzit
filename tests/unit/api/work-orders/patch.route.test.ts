import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn(),
  getDatabase: vi.fn(),
}));

vi.mock('@/server/models/WorkOrder', () => ({
  WorkOrder: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('@/server/middleware/withAuthRbac', () => ({
  requireAbility: vi.fn(),
}));

vi.mock('@/lib/sla', () => ({
  resolveSlaTarget: vi.fn((priority) => ({
    slaMinutes: priority === 'CRITICAL' ? 240 : 1440,
    dueAt: new Date(Date.now() + 86400000),
  })),
  WorkOrderPriority: {},
}));

vi.mock('@/lib/storage/s3', () => ({
  deleteObject: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { PATCH } from '@/app/api/work-orders/[id]/route';
import { WorkOrder } from '@/server/models/WorkOrder';
import { requireAbility } from '@/server/middleware/withAuthRbac';
import { getDatabase } from '@/lib/mongodb-unified';
import { deleteObject } from '@/lib/storage/s3';
import { logger } from '@/lib/logger';

describe('PATCH /api/work-orders/[id]', () => {
  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-1',
    role: 'MANAGER',
  };

  const mockWorkOrder = {
    _id: new ObjectId('507f1f77bcf86cd799439011'),
    title: 'Fix AC',
    priority: 'MEDIUM',
    tenantId: 'tenant-1',
    attachments: [{ key: 'old-file.jpg' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (requireAbility as vi.Mock).mockImplementation(() => async () => mockUser);
    
    // Mock WorkOrder.findOne to return chainable methods
    const mockFindOne = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockWorkOrder),
    };
    (WorkOrder.findOne as vi.Mock).mockReturnValue(mockFindOne);
    
    (WorkOrder.findOneAndUpdate as vi.Mock).mockResolvedValue({
      ...mockWorkOrder,
      title: 'Updated Title',
    });
  });

  describe('Property validation', () => {
    it('validates propertyId exists before updating', async () => {
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          countDocuments: vi.fn().mockResolvedValue(0), // Property not found
        }),
      };
      (getDatabase as vi.Mock).mockResolvedValue(mockDb);

      const req = createRequest({
        title: 'Updated',
        propertyId: '507f1f77bcf86cd799439012',
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toContain('Invalid propertyId');
      expect(WorkOrder.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('allows valid propertyId', async () => {
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          countDocuments: vi.fn().mockResolvedValue(1), // Property exists
        }),
      };
      (getDatabase as vi.Mock).mockResolvedValue(mockDb);

      const req = createRequest({
        title: 'Updated',
        propertyId: '507f1f77bcf86cd799439012',
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(200);
      expect(WorkOrder.findOneAndUpdate).toHaveBeenCalled();
      const updateCall = (WorkOrder.findOneAndUpdate as vi.Mock).mock.calls[0];
      expect(updateCall[1].$set.location).toEqual({
        propertyId: '507f1f77bcf86cd799439012',
      });
    });

    it('combines propertyId and unitNumber into location', async () => {
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          countDocuments: vi.fn().mockResolvedValue(1),
        }),
      };
      (getDatabase as vi.Mock).mockResolvedValue(mockDb);

      const req = createRequest({
        propertyId: '507f1f77bcf86cd799439012',
        unitNumber: '3B',
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(200);
      const updateCall = (WorkOrder.findOneAndUpdate as vi.Mock).mock.calls[0];
      expect(updateCall[1].$set.location).toEqual({
        propertyId: '507f1f77bcf86cd799439012',
        unitNumber: '3B',
      });
    });
  });

  describe('Assignment validation', () => {
    it('validates assignee exists before updating', async () => {
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          countDocuments: vi.fn().mockResolvedValue(0), // User not found
        }),
      };
      (getDatabase as vi.Mock).mockResolvedValue(mockDb);

      const req = createRequest({
        assignment: {
          assignedTo: { userId: '507f1f77bcf86cd799439013' },
        },
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toContain('Invalid assignee');
      expect(WorkOrder.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('allows valid assignee and adds timestamp', async () => {
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          countDocuments: vi.fn().mockResolvedValue(1), // User exists
        }),
      };
      (getDatabase as vi.Mock).mockResolvedValue(mockDb);

      const req = createRequest({
        assignment: {
          assignedTo: { userId: '507f1f77bcf86cd799439013' },
        },
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(200);
      const updateCall = (WorkOrder.findOneAndUpdate as vi.Mock).mock.calls[0];
      expect(updateCall[1].$set.assignment).toMatchObject({
        assignedTo: { userId: '507f1f77bcf86cd799439013' },
        assignedAt: expect.any(Date),
      });
    });
  });

  describe('SLA recalculation', () => {
    it('recalculates SLA when priority changes', async () => {
      const req = createRequest({
        priority: 'CRITICAL',
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(200);
      const updateCall = (WorkOrder.findOneAndUpdate as vi.Mock).mock.calls[0];
      expect(updateCall[1].$set.slaMinutes).toBe(240);
      expect(updateCall[1].$set.dueAt).toBeInstanceOf(Date);
    });

    it('preserves custom dueAt when provided with priority', async () => {
      const customDue = new Date('2025-12-31');
      const req = createRequest({
        priority: 'HIGH',
        dueAt: customDue.toISOString(),
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(200);
      const updateCall = (WorkOrder.findOneAndUpdate as vi.Mock).mock.calls[0];
      expect(updateCall[1].$set.dueAt).toEqual(customDue);
    });
  });

  describe('S3 cleanup observability', () => {
    it('logs S3 delete failures for monitoring', async () => {
      const mockFindOneWithAttachments = {
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          ...mockWorkOrder,
          attachments: [{ key: 'old-1.jpg' }, { key: 'old-2.jpg' }],
        }),
      };
      (WorkOrder.findOne as vi.Mock).mockReturnValue(mockFindOneWithAttachments);

      (deleteObject as vi.Mock)
        .mockRejectedValueOnce(new Error('S3 error'))
        .mockResolvedValueOnce(undefined);

      const req = createRequest({
        attachments: [{ key: 'new-1.jpg', url: 'https://s3/new-1.jpg' }],
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async cleanup

      expect(logger.error).toHaveBeenCalledWith(
        '[WorkOrder PATCH] S3 cleanup failed',
        expect.objectContaining({
          workOrderId: '507f1f77bcf86cd799439011',
          key: 'old-1.jpg',
          error: expect.any(Error),
        })
      );

      expect(logger.warn).toHaveBeenCalledWith(
        '[WorkOrder PATCH] S3 cleanup partial failure',
        expect.objectContaining({
          workOrderId: '507f1f77bcf86cd799439011',
          total: 2,
          failed: 1,
        })
      );
    });

    it('cleans up removed attachments successfully', async () => {
      const mockFindOneWithAttachments = {
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          ...mockWorkOrder,
          attachments: [{ key: 'remove-me.jpg' }],
        }),
      };
      (WorkOrder.findOne as vi.Mock).mockReturnValue(mockFindOneWithAttachments);

      (deleteObject as vi.Mock).mockResolvedValue(undefined);

      const req = createRequest({
        attachments: [{ key: 'keep-me.jpg', url: 'https://s3/keep.jpg' }],
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(deleteObject).toHaveBeenCalledWith('remove-me.jpg');
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Combined updates', () => {
    it('handles property + assignment + priority update together', async () => {
      const mockDb = {
        collection: vi.fn((name: string) => ({
          countDocuments: vi.fn().mockResolvedValue(1), // All valid
        })),
      };
      (getDatabase as vi.Mock).mockResolvedValue(mockDb);

      const req = createRequest({
        title: 'Emergency Repair',
        priority: 'CRITICAL',
        propertyId: '507f1f77bcf86cd799439012',
        unitNumber: '5A',
        assignment: {
          assignedTo: { userId: '507f1f77bcf86cd799439013' },
        },
      });

      const res = await PATCH(req, {
        params: { id: '' },
      });

      expect(res.status).toBe(200);
      const updateCall = (WorkOrder.findOneAndUpdate as vi.Mock).mock.calls[0];
      const update = updateCall[1].$set;

      expect(update.title).toBe('Emergency Repair');
      expect(update.priority).toBe('CRITICAL');
      expect(update.location).toEqual({
        propertyId: '507f1f77bcf86cd799439012',
        unitNumber: '5A',
      });
      expect(update.assignment).toMatchObject({
        assignedTo: { userId: '507f1f77bcf86cd799439013' },
        assignedAt: expect.any(Date),
      });
      expect(update.slaMinutes).toBe(240);
    });
  });
});

// Helper to create mock request
function createRequest(body: Record<string, unknown>) {
  return new Request('https://test.com/api/work-orders/507f1f77bcf86cd799439011', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
