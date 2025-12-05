import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addJob } from "@/lib/queues/setup";
import { ObjectId } from "mongodb";

vi.mock("@/lib/queues/setup", () => {
  return {
    addJob: vi.fn(async () => undefined),
    QUEUE_NAMES: { NOTIFICATIONS: "notifications" },
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
import { RefundProcessor } from "@/services/souq/claims/refund-processor";

const mockedAddJob = addJob as unknown as ReturnType<typeof vi.fn>;

describe("RefundProcessor notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends orgId in notification payload", async () => {
    await RefundProcessor["notifyRefundStatus"](
      "buyer-1",
      "seller-1",
      {
        refundId: "REF-1",
        status: "completed",
        amount: 10,
        transactionId: "TX-1",
      },
      "org-123",
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
});
