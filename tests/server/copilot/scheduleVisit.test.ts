import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWorkOrder = {
  findOne: vi.fn(),
  findByIdAndUpdate: vi.fn(),
};

vi.mock('@/lib/mongo', () => ({ db: Promise.resolve() }));
vi.mock('@/server/models/WorkOrder', () => ({ WorkOrder: mockWorkOrder }));

const baseSession = {
  tenantId: 'org-123',
  userId: 'user-123',
  role: 'ADMIN' as const,
  locale: 'en' as const,
  email: 'admin@test.local',
  name: 'Admin User',
};

describe('Copilot scheduleVisit tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not extend resolution deadline when scheduling later than existing SLA', async () => {
    const { executeTool } = await import('@/server/copilot/tools');
    const existingDeadline = new Date('2025-01-01T00:00:00Z');
    const requestedDate = new Date('2025-02-01T00:00:00Z');

    mockWorkOrder.findOne.mockResolvedValue({
      _id: 'wo-10',
      orgId: baseSession.tenantId,
      status: 'SUBMITTED',
      workOrderNumber: 'WO-10',
      assignment: {},
      sla: { resolutionDeadline: existingDeadline },
    });
    mockWorkOrder.findByIdAndUpdate.mockResolvedValue({
      _id: 'wo-10',
      workOrderNumber: 'WO-10',
      status: 'SUBMITTED',
      sla: { resolutionDeadline: existingDeadline },
    });

    const result = await executeTool(
      'scheduleVisit',
      { workOrderId: 'wo-10', scheduledFor: requestedDate },
      baseSession
    );

    expect(result.success).toBe(true);
    expect(mockWorkOrder.findByIdAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          'assignment.scheduledDate': requestedDate,
          'sla.resolutionDeadline': existingDeadline,
        }),
      }),
      expect.objectContaining({ new: true })
    );
  });

  it('returns early when schedule and SLA already match requested date', async () => {
    const { executeTool } = await import('@/server/copilot/tools');
    const requestedDate = new Date('2025-03-03T10:00:00Z');

    mockWorkOrder.findOne.mockResolvedValue({
      _id: 'wo-11',
      orgId: baseSession.tenantId,
      status: 'ASSIGNED',
      workOrderNumber: 'WO-11',
      assignment: { scheduledDate: requestedDate },
      sla: { resolutionDeadline: requestedDate },
    });

    const result = await executeTool(
      'scheduleVisit',
      { workOrderId: 'wo-11', scheduledFor: requestedDate },
      baseSession
    );

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/already up to date/i);
    expect(mockWorkOrder.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
