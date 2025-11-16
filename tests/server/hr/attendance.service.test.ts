import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttendanceService } from '@/server/services/hr/attendance.service';
import { AttendanceRecord } from '@/server/models/hr.models';
import { HrNotificationService } from '@/server/services/hr/hr-notification.service';
vi.mock('bullmq', () => ({}));

describe('AttendanceService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('filters attendance list by date range', async () => {
    const findMock = vi.spyOn(AttendanceRecord, 'find').mockReturnValue({
      lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([{ _id: 'a1' }]) }),
    } as any);

    const results = await AttendanceService.list(
      'org-1',
      'emp-1',
      new Date('2025-05-01'),
      new Date('2025-05-31')
    );

    expect(findMock).toHaveBeenCalledWith({
      orgId: 'org-1',
      employeeId: 'emp-1',
      isDeleted: false,
      date: { $gte: new Date('2025-05-01'), $lte: new Date('2025-05-31') },
    });
    expect(results).toHaveLength(1);
  });

  it('queues notifications when status is ABSENT', async () => {
    const execMock = vi.fn().mockResolvedValue({
      employeeId: { toString: () => 'emp-1' },
      status: 'ABSENT',
      date: new Date('2025-05-12'),
    });
    vi.spyOn(AttendanceRecord, 'findOneAndUpdate').mockReturnValue({ exec: execMock } as any);

    const queueMock = vi
      .spyOn(HrNotificationService, 'queueAttendanceAlert')
      .mockResolvedValue(undefined);

    await AttendanceService.logEntry({
      orgId: 'org-1',
      employeeId: 'emp-1',
      date: new Date('2025-05-12'),
      status: 'ABSENT',
    });

    expect(queueMock).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'emp-1', status: 'ABSENT' })
    );
  });
});
