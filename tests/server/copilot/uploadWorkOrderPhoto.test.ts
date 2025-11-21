import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFs = {
  mkdir: vi.fn(),
  writeFile: vi.fn(),
};
const mockWorkOrder = {
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
};
const leanResult = <T,>(data: T) => ({
  select: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(data),
});

vi.mock('fs', () => ({ promises: mockFs }));
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

const validBuffer = Buffer.from('test');

describe('Copilot uploadWorkOrderPhoto tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockWorkOrder.findOne.mockReturnValue(
      leanResult({
        _id: 'wo-1',
        workOrderNumber: 'WO-1',
        attachments: [],
      })
    );
    mockWorkOrder.findOneAndUpdate.mockResolvedValue({
      _id: 'wo-1',
      workOrderNumber: 'WO-1',
      attachments: [{ name: 'file.png' }],
    });
  });

  it('rejects unsupported mime types', async () => {
    const { executeTool } = await import('@/server/copilot/tools');

    await expect(
      executeTool(
        'uploadWorkOrderPhoto',
        { workOrderId: 'wo-1', fileName: 'file.exe', mimeType: 'application/x-msdownload', buffer: validBuffer },
        baseSession
      )
    ).rejects.toThrow(/unsupported file type/i);
    expect(mockWorkOrder.findOne).not.toHaveBeenCalled();
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it('rejects uploads over the size limit', async () => {
    const { executeTool } = await import('@/server/copilot/tools');
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

    await expect(
      executeTool(
        'uploadWorkOrderPhoto',
        { workOrderId: 'wo-1', fileName: 'big.png', mimeType: 'image/png', buffer: largeBuffer },
        baseSession
      )
    ).rejects.toThrow(/too large/i);
    expect(mockWorkOrder.findOne).not.toHaveBeenCalled();
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it('enforces an attachment count limit', async () => {
    const { executeTool } = await import('@/server/copilot/tools');
    mockWorkOrder.findOne.mockReturnValue(
      leanResult({
        _id: 'wo-1',
        workOrderNumber: 'WO-1',
        attachments: new Array(20).fill({}),
      })
    );

    await expect(
      executeTool(
        'uploadWorkOrderPhoto',
        { workOrderId: 'wo-1', fileName: 'file.png', mimeType: 'image/png', buffer: validBuffer },
        baseSession
      )
    ).rejects.toThrow(/attachment limit/i);
    expect(mockFs.writeFile).not.toHaveBeenCalled();
    expect(mockWorkOrder.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('stores a valid attachment and updates the work order', async () => {
    const { executeTool } = await import('@/server/copilot/tools');

    const result = await executeTool(
      'uploadWorkOrderPhoto',
      { workOrderId: 'wo-1', fileName: 'file.png', mimeType: 'image/png', buffer: validBuffer },
      baseSession
    );

    expect(result.success).toBe(true);
    expect(mockFs.mkdir).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalled();
    expect(mockWorkOrder.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'wo-1', orgId: baseSession.tenantId }),
      expect.objectContaining({ $push: expect.any(Object) }),
      expect.objectContaining({ new: true })
    );
  });
});
