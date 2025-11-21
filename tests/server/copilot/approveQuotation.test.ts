import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const mockRecordAudit = vi.fn();
const mockFMQuotation = {
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
};
const mockFMApproval = {
  findOne: vi.fn(),
  findByIdAndUpdate: vi.fn(),
};
const mockUser = {
  findById: vi.fn(),
};
const mockWorkOrder = {
  findById: vi.fn(),
};
const mockJobQueue = {
  enqueue: vi.fn(),
};

const leanResult = <T>(data: T) => ({
  lean: vi.fn().mockResolvedValue(data),
});

// Lightweight mocks to avoid real DB connections or networking in the tool handler
vi.mock('@/lib/mongo', () => ({ db: Promise.resolve() }));
vi.mock('@/server/copilot/audit', () => ({ recordAudit: mockRecordAudit }));
vi.mock('@/domain/fm/fm.behavior', () => ({ FMQuotation: mockFMQuotation }));
vi.mock('@/server/models/FMApproval', () => ({ FMApproval: mockFMApproval }));
vi.mock('@/server/models/User', () => ({ User: mockUser }));
vi.mock('@/server/models/WorkOrder', () => ({ WorkOrder: mockWorkOrder }));
vi.mock('@/lib/jobs/queue', () => ({ JobQueue: mockJobQueue }));

const baseSession = {
  tenantId: 'org-123',
  userId: '507f1f77bcf86cd799439011',
  role: 'FINANCE' as const,
  locale: 'en' as const,
  email: 'finance@test.local',
  name: 'Finance User',
};

describe('Copilot approveQuotation tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid quotation IDs and records audit', async () => {
    const { executeTool } = await import('@/server/copilot/tools');
    const result = await executeTool('approveQuotation', { quotationId: 'not-an-id' }, baseSession);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/valid quotation/i);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DENIED', intent: 'approveQuotation' })
    );
    expect(mockFMQuotation.findOne).not.toHaveBeenCalled();
  });

  it('approves a quotation, updates status, and audits success', async () => {
    const quotationId = new Types.ObjectId().toString();
    const { executeTool } = await import('@/server/copilot/tools');

    mockFMQuotation.findOne.mockReturnValue(
      leanResult({
        _id: new Types.ObjectId(quotationId),
        org_id: baseSession.tenantId,
        status: 'PENDING',
      })
    );
    mockFMQuotation.findOneAndUpdate.mockReturnValue(
      leanResult({
        _id: new Types.ObjectId(quotationId),
        org_id: baseSession.tenantId,
        status: 'APPROVED',
      })
    );
    mockFMApproval.findOne.mockReturnValue(leanResult(null));

    const result = await executeTool('approveQuotation', { quotationId }, baseSession);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ quotationId, status: 'approved' });
    expect(mockFMQuotation.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.any(Types.ObjectId), org_id: baseSession.tenantId })
    );
    expect(mockFMQuotation.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.any(Types.ObjectId), org_id: baseSession.tenantId }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'APPROVED' }) }),
      expect.objectContaining({ new: true })
    );
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SUCCESS', intent: 'approveQuotation' })
    );
  });
});
