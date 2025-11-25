import {
  AttendanceRecord,
  type AttendanceRecordDoc,
  type AttendanceStatus,
} from "@/server/models/hr.models";
import { HrNotificationService } from "@/server/services/hr/hr-notification.service";

export interface LogAttendancePayload {
  orgId: string;
  employeeId: string;
  date: Date;
  shiftTemplateId?: string;
  status: AttendanceStatus;
  clockIn?: Date;
  clockOut?: Date;
  source?: AttendanceRecordDoc["source"];
  notes?: string;
}

export class AttendanceService {
  static async logEntry(payload: LogAttendancePayload) {
    const entry = await AttendanceRecord.findOneAndUpdate(
      {
        orgId: payload.orgId,
        employeeId: payload.employeeId,
        date: payload.date,
      },
      {
        ...payload,
        shiftTemplateId: payload.shiftTemplateId,
        source: payload.source ?? "MANUAL",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    if (entry && (entry.status === "ABSENT" || entry.status === "LATE")) {
      await HrNotificationService.queueAttendanceAlert({
        orgId: payload.orgId,
        employeeId: entry.employeeId.toString(),
        status: entry.status,
        date: entry.date,
        shiftTemplateId: entry.shiftTemplateId?.toString(),
        notes: entry.notes,
        overtimeMinutes: entry.overtimeMinutes,
      });
    }

    return entry;
  }

  static async list(orgId: string, employeeId: string, from?: Date, to?: Date) {
    const query: {
      orgId: string;
      employeeId: string;
      isDeleted: boolean;
      date?: { $gte?: Date; $lte?: Date };
    } = { orgId, employeeId, isDeleted: false };

    if (from || to) {
      query.date = {};
      if (from) {
        query.date.$gte = from;
      }
      if (to) {
        query.date.$lte = to;
      }
    }
    return AttendanceRecord.find(query).lean<AttendanceRecordDoc>().exec();
  }

  static async delete(orgId: string, employeeId: string, date: Date) {
    return AttendanceRecord.findOneAndUpdate(
      { orgId, employeeId, date },
      { isDeleted: true },
      { new: true },
    ).exec();
  }
}
