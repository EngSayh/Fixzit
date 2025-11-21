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

describe('Copilot dispatchWorkOrder tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks dispatch for terminal statuses', async () => {
    const { executeTool } = await import('@/server/copilot/tools');
    mockWorkOrder.findOne.mockResolvedValue({
      _id: 'wo-1',
      orgId: baseSession.tenantId,
      status: 'CLOSED',
      workOrderNumber: 'WO-1',
    });

    await expect(
      executeTool('dispatchWorkOrder', { workOrderId: 'wo-1' }, baseSession)
    ).rejects.toThrow(/status/i);
    expect(mockWorkOrder.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('returns early when no assignment change is requested', async () => {
    const { executeTool } = await import('@/server/copilot/tools');
    mockWorkOrder.findOne.mockResolvedValue({
      _id: 'wo-2',
      orgId: baseSession.tenantId,
      status: 'ASSIGNED',
      workOrderNumber: 'WO-2',
      assignment: { assignedTo: { userId: 'tech-1' } },
    });

    const result = await executeTool(
      'dispatchWorkOrder',
      { workOrderId: 'wo-2', assigneeUserId: 'tech-1' },
      baseSession
    );

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/no assignment changes/i);
    expect(mockWorkOrder.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('assigns and promotes SUBMITTED to ASSIGNED when a new assignee is provided', async () => {
    const { executeTool } = await import('@/server/copilot/tools');
    mockWorkOrder.findOne.mockResolvedValue({
      _id: 'wo-3',
      orgId: baseSession.tenantId,
      status: 'SUBMITTED',
      workOrderNumber: 'WO-3',
      assignment: { assignedTo: {} },
    });
    mockWorkOrder.findByIdAndUpdate.mockResolvedValue({
      _id: 'wo-3',
      workOrderNumber: 'WO-3',
      status: 'ASSIGNED',
      assignment: { assignedTo: { userId: 'tech-9' } },
    });

    const result = await executeTool(
      'dispatchWorkOrder',
      { workOrderId: 'wo-3', assigneeUserId: 'tech-9' },
      baseSession
    );

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      status: 'ASSIGNED',
      assigneeUserId: 'tech-9',
    });
    expect(mockWorkOrder.findByIdAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          'assignment.assignedTo.userId': 'tech-9',
          status: 'ASSIGNED',
          'assignment.assignedBy': baseSession.userId,
          'assignment.assignedAt': expect.any(Date),
        }),
      }),
      expect.objectContaining({ new: true })
    );
  });
});
