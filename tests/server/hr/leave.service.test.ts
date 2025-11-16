import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeaveService } from '@/server/services/hr/leave.service';
import { LeaveRequest, LeaveBalance } from '@/server/models/hr.models';
import { HrNotificationService } from '@/server/services/hr/hr-notification.service';
vi.mock('bullmq', () => ({}));

describe('LeaveService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns populated leave requests', async () => {
    const execMock = vi.fn().mockResolvedValue([{ _id: 'leave-1' }]);
    const populateMock = vi.fn().mockReturnValue({ lean: vi.fn().mockReturnValue({ exec: execMock }) });
    vi.spyOn(LeaveRequest, 'find').mockReturnValue({
      sort: vi.fn().mockReturnValue({ populate: populateMock }),
    } as any);

    const results = await LeaveService.list('org-1', 'PENDING');

    expect(LeaveRequest.find).toHaveBeenCalledWith({ orgId: 'org-1', isDeleted: false, status: 'PENDING' });
    expect(results).toHaveLength(1);
  });

  it('queues notification when updating status', async () => {
    const execMock = vi.fn().mockResolvedValue({
      employeeId: { toString: () => 'emp-1' },
      status: 'APPROVED',
      startDate: new Date(),
      endDate: new Date(),
    });
    vi.spyOn(LeaveRequest, 'findOneAndUpdate').mockReturnValue({ exec: execMock } as any);
    const queueMock = vi.spyOn(HrNotificationService, 'queueLeaveStatusChange').mockResolvedValue(undefined);

    await LeaveService.updateStatus('org-1', 'leave-1', 'APPROVED', 'approver-1');

    expect(queueMock).toHaveBeenCalledWith(expect.objectContaining({ leaveRequestId: 'leave-1', status: 'APPROVED' }));
  });

  it('adjusts leave balance with upsert', async () => {
    const execMock = vi.fn().mockResolvedValue({ _id: 'balance-1' });
    vi.spyOn(LeaveBalance, 'findOneAndUpdate').mockReturnValue({ exec: execMock } as any);

    await LeaveService.adjustBalance('org-1', 'emp-1', 'lt-1', 2025, { accrued: 2, taken: 1 });

    expect(LeaveBalance.findOneAndUpdate).toHaveBeenCalledWith(
      { orgId: 'org-1', employeeId: 'emp-1', leaveTypeId: 'lt-1', year: 2025 },
      { $inc: { accrued: 2, taken: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });
});
