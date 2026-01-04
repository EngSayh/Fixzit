import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AttendanceStatus } from "@/server/models/hr.models";

const addJobMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queues/setup", () => ({
  addJob: addJobMock,
  QUEUE_NAMES: {
    NOTIFICATIONS: "notifications-queue",
  },
}));

import { HrNotificationService } from "@/server/services/hr/hr-notification.service";

describe("HrNotificationService", () => {
  beforeEach(() => {
    addJobMock.mockReset();
  });

  it("queues leave status change jobs on the notifications queue", async () => {
    await HrNotificationService.queueLeaveStatusChange({
      orgId: "org-123",
      leaveRequestId: "leave-555",
      employeeId: "emp-9",
      status: "APPROVED",
      approverId: "approver-1",
      reason: "Family leave",
    });

    expect(addJobMock).toHaveBeenCalledWith(
      "notifications-queue",
      "hr.leave.status_changed",
      expect.objectContaining({
        leaveRequestId: "leave-555",
        status: "APPROVED",
        approverId: "approver-1",
      }),
    );
  });

  it("swallows queue errors when emitting attendance alerts", async () => {
    addJobMock.mockRejectedValueOnce(new Error("queue offline"));

    await expect(
      HrNotificationService.queueAttendanceAlert({
        orgId: "org-1",
        employeeId: "emp-7",
        status: "ABSENT" as AttendanceStatus,
        date: new Date("2025-05-15"),
      }),
    ).resolves.toBeUndefined();

    expect(addJobMock).toHaveBeenCalledTimes(1);
  });
});
