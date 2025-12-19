import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock mongoose
vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  return {
    ...actual,
    default: {
      ...(actual as Record<string, unknown>).default,
      startSession: vi.fn().mockResolvedValue({
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
      }),
    },
  };
});

// Mock models
vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("@/server/models/owner/MoveInOutInspection", () => ({
  MoveInOutInspectionModel: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/server/models/owner/UtilityBill", () => ({
  UtilityBillModel: {
    findOne: vi.fn(),
  },
}));

import { postFinanceOnClose } from "@/server/services/owner/financeIntegration";

describe("financeIntegration service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("postFinanceOnClose", () => {
    it("should skip posting if already posted (idempotency)", async () => {
      const { WorkOrder } = await import("@/server/models/WorkOrder");
      const workOrderId = new (await import("mongoose")).Types.ObjectId();

      vi.mocked(WorkOrder.findById).mockResolvedValue({
        _id: workOrderId,
        financePosted: true,
        journalEntryId: "journal-1",
        journalNumber: "JE-001",
      } as never);

      const result = await postFinanceOnClose({
        workOrderId,
        workOrderNumber: "WO-001",
        totalCost: 500,
        propertyId: workOrderId,
        ownerId: workOrderId,
        userId: workOrderId,
        orgId: workOrderId,
      });

      expect(result.alreadyPosted).toBe(true);
    });

    it("should reject when work order not found", async () => {
      const { WorkOrder } = await import("@/server/models/WorkOrder");
      const workOrderId = new (await import("mongoose")).Types.ObjectId();
      vi.mocked(WorkOrder.findById).mockResolvedValue(null as never);

      await expect(
        postFinanceOnClose({
          workOrderId,
          workOrderNumber: "WO-404",
          totalCost: 500,
          propertyId: workOrderId,
          ownerId: workOrderId,
          userId: workOrderId,
          orgId: workOrderId,
        })
      ).rejects.toThrow("Work order WO-404 not found");
    });

    it("should enforce AFTER photos for move-out inspections", async () => {
      const { WorkOrder } = await import("@/server/models/WorkOrder");
      const { MoveInOutInspectionModel } = await import(
        "@/server/models/owner/MoveInOutInspection"
      );
      const workOrderId = new (await import("mongoose")).Types.ObjectId();

      vi.mocked(WorkOrder.findById).mockResolvedValue({
        _id: workOrderId,
        financePosted: false,
      } as never);

      vi.mocked(MoveInOutInspectionModel.findOne).mockResolvedValue({
        type: "MOVE_OUT",
        rooms: [],
        issues: [],
      } as never);

      await expect(
        postFinanceOnClose({
          workOrderId,
          workOrderNumber: "WO-002",
          totalCost: 500,
          propertyId: workOrderId,
          ownerId: workOrderId,
          userId: workOrderId,
          orgId: workOrderId,
        })
      ).rejects.toThrow("requires AFTER photos");
    });
  });
});
