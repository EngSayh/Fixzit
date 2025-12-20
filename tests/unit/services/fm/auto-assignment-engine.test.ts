import { describe, it, expect, beforeEach, vi } from "vitest";
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
    debug: vi.fn(),
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

  afterEach(() => {
    process.env = originalEnv;
  });

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

  it("returns an error when work order is already assigned", async () => {
    vi.mocked(WorkOrder.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(workOrderId),
        assignment: { assignedTo: { userId: new Types.ObjectId() } },
      }),
    } as unknown as ReturnType<typeof WorkOrder.findOne>);

    const result = await autoAssignWorkOrder(orgId, workOrderId, "assigner", {
      businessHoursOnly: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Work order already assigned");
  });

  it("auto-assigns using ML scoring that favors skill match", async () => {
    const skilledId = new Types.ObjectId();
    const unskilledId = new Types.ObjectId();

    vi.mocked(WorkOrder.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(workOrderId),
        category: "ELECTRICAL",
      }),
    } as unknown as ReturnType<typeof WorkOrder.findOne>);

    vi.mocked(User.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([
        {
          _id: skilledId,
          personal: { firstName: "A", lastName: "Tech" },
          professional: {
            role: "TECHNICIAN",
            skills: [{ category: "ELECTRICAL", skill: "WIRING" }],
          },
          workload: { maxAssignments: 5 },
          performance: { rating: 3.5 },
        },
        {
          _id: unskilledId,
          personal: { firstName: "B", lastName: "Tech" },
          professional: {
            role: "TECHNICIAN",
            skills: [{ category: "PLUMBING", skill: "PIPES" }],
          },
          workload: { maxAssignments: 5 },
          performance: { rating: 5 },
        },
      ]),
    } as unknown as ReturnType<typeof User.find>);

    vi.mocked(Vendor.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof Vendor.find>);

    const result = await autoAssignWorkOrder(orgId, workOrderId, "assigner", {
      businessHoursOnly: false,
      scoringMode: "ml",
      mlWeights: { skillMatch: 2, workload: 0, rating: 0, roundRobin: 0, propertyMatch: 0, availability: 0 },
    });

    expect(result.success).toBe(true);
    expect(result.assignee?.id).toBe(skilledId.toString());
    expect(WorkOrder.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: expect.anything() }),
      expect.objectContaining({
        $set: expect.objectContaining({
          "assignment.assignedTo": expect.objectContaining({
            userId: skilledId.toString(),
          }),
        }),
      }),
    );
  });
});
