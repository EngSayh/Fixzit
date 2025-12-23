/**
 * @fileoverview Tests for Work Order Auto-Assignment Engine
 * @module tests/services/fm/auto-assignment-engine
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("@/server/models/User", () => ({
  User: {
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("@/server/models/Vendor", () => ({
  Vendor: {
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { AutoAssignmentEngine, autoAssignWorkOrder } from "@/services/fm/auto-assignment-engine";
import { WorkOrder } from "@/server/models/WorkOrder";
import { User } from "@/server/models/User";
import { Vendor } from "@/server/models/Vendor";

const originalEnv = { ...process.env };

describe("AutoAssignmentEngine", () => {
  const orgId = "org-test-123";
  const workOrderId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    vi.mocked(WorkOrder.aggregate).mockResolvedValue([]);
    vi.mocked(WorkOrder.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof WorkOrder.find>);
    vi.mocked(WorkOrder.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);
    vi.mocked(User.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);
    vi.mocked(Vendor.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);
  });

  it("returns null when work order is not found", async () => {
    vi.mocked(WorkOrder.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof WorkOrder.findOne>);

    const engine = new AutoAssignmentEngine(orgId, { businessHoursOnly: false });
    const result = await engine.findBestAssignee(workOrderId);

    expect(result).toBeNull();
  });

  it("returns a failure when no candidates are available", async () => {
    vi.mocked(WorkOrder.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(workOrderId),
        category: "MAINTENANCE",
      }),
    } as unknown as ReturnType<typeof WorkOrder.findOne>);
    vi.mocked(User.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof User.find>);
    vi.mocked(Vendor.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof Vendor.find>);

    const result = await autoAssignWorkOrder(orgId, workOrderId, "assigner", {
      businessHoursOnly: false,
      preferInternal: true,
      preferVendors: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No suitable assignee found");
  });

  it("auto-assigns to the best internal technician", async () => {
    vi.mocked(WorkOrder.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(workOrderId),
        category: "MAINTENANCE",
        scheduledDate: new Date("2025-01-01T00:00:00Z"),
        scheduledTimeSlot: { start: "09:00", end: "10:00" },
      }),
    } as unknown as ReturnType<typeof WorkOrder.findOne>);
    vi.mocked(User.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          name: "Tech One",
          skills: ["MAINTENANCE"],
          averageRating: 4.8,
        },
      ]),
    } as unknown as ReturnType<typeof User.find>);
    vi.mocked(WorkOrder.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof WorkOrder.find>);
    vi.mocked(WorkOrder.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

    const result = await autoAssignWorkOrder(orgId, workOrderId, "assigner", {
      businessHoursOnly: false,
      preferInternal: true,
      preferVendors: false,
    });

    expect(result.success).toBe(true);
    expect(result.assignee?.type).toBe("user");
    expect(WorkOrder.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ orgId }),
      expect.objectContaining({
        $set: expect.objectContaining({
          "assignment.assignedTo": expect.objectContaining({ userId: expect.any(String) }),
        }),
      })
    );
  });

  it("returns an error when work order update fails", async () => {
    vi.mocked(WorkOrder.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(workOrderId),
        category: "MAINTENANCE",
        scheduledDate: new Date("2025-01-01T00:00:00Z"),
        scheduledTimeSlot: { start: "09:00", end: "10:00" },
      }),
    } as unknown as ReturnType<typeof WorkOrder.findOne>);
    vi.mocked(User.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          name: "Tech One",
          skills: ["MAINTENANCE"],
        },
      ]),
    } as unknown as ReturnType<typeof User.find>);
    vi.mocked(WorkOrder.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof WorkOrder.find>);
    vi.mocked(WorkOrder.updateOne).mockResolvedValue({ modifiedCount: 0 } as never);

    const result = await autoAssignWorkOrder(orgId, workOrderId, "assigner", {
      businessHoursOnly: false,
      preferInternal: true,
      preferVendors: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to update work order");
  });

  it("skips technicians with overlapping scheduled slots", async () => {
    vi.mocked(WorkOrder.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(workOrderId),
        category: "MAINTENANCE",
        scheduledDate: new Date("2025-01-01T00:00:00Z"),
        scheduledTimeSlot: { start: "09:00", end: "10:00" },
      }),
    } as unknown as ReturnType<typeof WorkOrder.findOne>);
    vi.mocked(User.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          name: "Tech One",
          skills: ["MAINTENANCE"],
        },
      ]),
    } as unknown as ReturnType<typeof User.find>);
    vi.mocked(WorkOrder.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([
        {
          scheduledTimeSlot: { start: "09:30", end: "10:30" },
        },
      ]),
    } as unknown as ReturnType<typeof WorkOrder.find>);

    const result = await autoAssignWorkOrder(orgId, workOrderId, "assigner", {
      businessHoursOnly: false,
      preferInternal: true,
      preferVendors: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No suitable assignee found");
  });
});
