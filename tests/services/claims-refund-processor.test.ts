import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addJob } from "@/lib/queues/setup";

vi.mock("@/lib/queues/setup", () => {
  return {
    addJob: vi.fn(async () => undefined),
    QUEUE_NAMES: { NOTIFICATIONS: "notifications" },
  };
});

vi.mock("@/lib/mongodb-unified", () => {
  return {
    getDatabase: async () => ({
      collection: () => ({
        updateOne: vi.fn(async () => ({})),
      }),
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
});
