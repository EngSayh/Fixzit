import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addJob } from "@/lib/queues/setup";
import { ObjectId } from "mongodb";

vi.mock("@/lib/queues/setup", () => {
  return {
    addJob: vi.fn(async () => undefined),
    QUEUE_NAMES: { NOTIFICATIONS: "notifications", REFUNDS: "refunds" },
  };
});

const mockOrderUpdate = vi.fn(async () => ({}));
const mockRefundUpdate = vi.fn(async () => ({}));

vi.mock("@/lib/mongodb-unified", () => {
  return {
    getDatabase: async () => ({
      collection: (name: string) => {
        if (name === "souq_orders") {
          return { updateOne: mockOrderUpdate };
        }
        if (name === "souq_refunds") {
          return { updateOne: mockRefundUpdate, findOne: vi.fn(), insertOne: vi.fn() };
        }
        return { updateOne: vi.fn(async () => ({})) };
      },
    }),
  };
});

// Import after mocks
import {
  RefundProcessor,
  __setQueueModuleForTests,
} from "@/services/souq/claims/refund-processor";

const mockedAddJob = addJob as unknown as ReturnType<typeof vi.fn>;

describe("RefundProcessor notifications", () => {
  beforeEach(() => {
    __setQueueModuleForTests({
      addJob: mockedAddJob,
      QUEUE_NAMES: { NOTIFICATIONS: "notifications", REFUNDS: "refunds" },
    } as unknown as typeof import("@/lib/queues/setup"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    __setQueueModuleForTests(null);
    vi.clearAllMocks();
  });

  it("sends orgId in notification payload", async () => {
    await RefundProcessor["notifyRefundStatus"](
      {
        refundId: "REF-1",
        claimId: "CL-1",
        orderId: "ORD-1",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        orgId: "org-123",
        amount: 10,
        reason: "test",
        paymentMethod: "card",
        status: "initiated",
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        refundId: "REF-1",
        status: "completed",
        amount: 10,
        transactionId: "TX-1",
      },
    );

    expect(mockedAddJob).toHaveBeenCalled();
    const payload = mockedAddJob.mock.calls[0][2];
    expect(payload.orgId).toBe("org-123");
  });

  it("updates order status scoped by orgId", async () => {
    await RefundProcessor["updateOrderStatus"]({
      orderId: "ORD-1",
      orgId: "org-abc",
      status: "refunded",
    });

    expect(mockOrderUpdate.mock.calls[0]?.[0]).toEqual({
      orgId: { $in: ["org-abc"] },
      $or: [{ orderId: "ORD-1" }],
    });
  });

  it("queues retry job with orgId", async () => {
    const refund = {
      refundId: "REF-2",
      claimId: "CL-2",
      orderId: "ORD-2",
      buyerId: "buyer-2",
      sellerId: "seller-2",
      orgId: "org-456",
      amount: 20,
      reason: "retry",
      paymentMethod: "card",
      status: "processing" as const,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await RefundProcessor["scheduleRetry"](refund as unknown as any);

    expect(mockedAddJob).toHaveBeenCalled();
    const args = mockedAddJob.mock.calls[0];
    expect(args[0]).toBe("refunds");
    expect(args[1]).toBe("souq-claim-refund-retry");
    expect(args[2]).toMatchObject({ refundId: "REF-2", orgId: "org-456" });
  });
});
