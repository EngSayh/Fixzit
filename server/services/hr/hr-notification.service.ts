import { addJob, QUEUE_NAMES } from '@/lib/queues/setup';
import { logger } from '@/lib/logger';
import type { AttendanceStatus } from '@/server/models/hr.models';

interface LeaveStatusPayload {
  orgId: string;
  leaveRequestId: string;
  employeeId: string;
  status: string;
  approverId?: string;
  reason?: string;
  startDate?: Date;
  endDate?: Date;
}

interface AttendanceAlertPayload {
  orgId: string;
  employeeId: string;
  status: AttendanceStatus;
  date: Date;
  shiftTemplateId?: string;
  notes?: string;
  overtimeMinutes?: number;
}

export class HrNotificationService {
  static async queueLeaveStatusChange(payload: LeaveStatusPayload) {
    try {
      await addJob(
        QUEUE_NAMES.NOTIFICATIONS,
        'hr.leave.status_changed',
        payload
      );
    } catch (error) {
      logger.error('Failed to queue leave status notification', { error, payload });
    }
  }

  static async queueAttendanceAlert(payload: AttendanceAlertPayload) {
    try {
      await addJob(
        QUEUE_NAMES.NOTIFICATIONS,
        'hr.attendance.alert',
        payload
      );
    } catch (error) {
      logger.error('Failed to queue attendance alert notification', { error, payload });
    }
  }
}
