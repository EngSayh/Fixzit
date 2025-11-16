import { LeaveRequest, LeaveBalance, type LeaveRequestDoc } from '@/server/models/hr.models';
import { HrNotificationService } from '@/server/services/hr/hr-notification.service';

export class LeaveService {
  static async request(payload: Omit<LeaveRequestDoc, 'createdAt' | 'updatedAt' | 'isDeleted'>) {
    return LeaveRequest.create(payload);
  }

  static async updateStatus(orgId: string, leaveRequestId: string, status: LeaveRequestDoc['status'], approverId: string, comment?: string) {
    const updated = await LeaveRequest.findOneAndUpdate(
      { orgId, _id: leaveRequestId },
      {
        status,
        approverId,
        $push: {
          approvalHistory: {
            approverId,
            action: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
            comment,
            at: new Date(),
          },
        },
      },
      { new: true }
    ).exec();

    if (updated) {
      await HrNotificationService.queueLeaveStatusChange({
        orgId,
        leaveRequestId,
        employeeId: updated.employeeId.toString(),
        status,
        approverId,
        reason: updated.reason,
        startDate: updated.startDate,
        endDate: updated.endDate,
      });
    }

    return updated;
  }

  static async adjustBalance(orgId: string, employeeId: string, leaveTypeId: string, year: number, diff: { accrued?: number; taken?: number }) {
    return LeaveBalance.findOneAndUpdate(
      { orgId, employeeId, leaveTypeId, year },
      {
        $inc: {
          accrued: diff.accrued ?? 0,
          taken: diff.taken ?? 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  static async list(orgId: string, status?: LeaveRequestDoc['status']) {
    const query: Record<string, unknown> = { orgId, isDeleted: false };
    if (status) {
      query.status = status;
    }
    return LeaveRequest.find(query)
      .sort({ startDate: -1 })
      .populate('employeeId', 'firstName lastName employeeCode')
      .lean<LeaveRequestDoc & { employeeId: { _id: string; firstName: string; lastName: string; employeeCode: string } }>()
      .exec();
  }
}
