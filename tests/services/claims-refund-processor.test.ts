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
const mockRefundFindOne = vi.fn(async () => null);

vi.mock("@/lib/mongodb-unified", () => {
  return {
    connectToDatabase: vi.fn(async () => undefined),
    getDatabase: async () => ({
      collection: (name: string) => {
        if (name === "souq_orders") {
          return { updateOne: mockOrderUpdate };
        }
        if (name === "souq_refunds") {
          return { updateOne: mockRefundUpdate, findOne: mockRefundFindOne, insertOne: vi.fn() };
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
    mockOrderUpdate.mockReset();
    mockRefundUpdate.mockReset();
    mockRefundFindOne.mockReset();
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

    // buildSouqOrgFilter returns $or structure - verify updateOne invoked with scoped filter
    expect(mockOrderUpdate).toHaveBeenCalled();
  });

  it("updates order status with ObjectId orgId and includes dual $or scope", async () => {
    const orgObjectId = new ObjectId("60f5f06d2f9f1c3b2a1d4e5f");
    await RefundProcessor["updateOrderStatus"]({
      orderId: "ORD-OBJ",
      orgId: orgObjectId.toString(),
      status: "refunded",
    });

    expect(mockOrderUpdate).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = mockOrderUpdate.mock.calls.at(-1) as any[] | undefined;
    expect(callArgs).toBeTruthy();
    const filter = callArgs?.[0] as Record<string, unknown> | undefined;
    expect(filter).toHaveProperty("$and");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andArray = (filter as any)?.$and as Array<Record<string, unknown>> | undefined;
    const orgScope = andArray?.[0] as Record<string, unknown> | undefined;
    expect(orgScope).toHaveProperty("$or");
    // Org scope should include both string and ObjectId candidates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((orgScope as any)?.$or).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ orgId: expect.objectContaining({ $in: expect.arrayContaining([orgObjectId.toString(), orgObjectId]) }) }),
        expect.objectContaining({ org_id: expect.objectContaining({ $in: expect.arrayContaining([orgObjectId.toString(), orgObjectId]) }) }),
      ]),
    );
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

  it("processes manual retry jobs and persists status/order updates", async () => {
    const refund = {
      refundId: "REF-3",
      claimId: "CL-3",
      orderId: "ORD-3",
      buyerId: "buyer-3",
      sellerId: "seller-3",
      orgId: "org-789",
      amount: 30,
      reason: "retry-manual",
      paymentMethod: "card",
      status: "processing" as const,
      retryCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRefundFindOne.mockResolvedValueOnce(refund as any);

    const executeSpy = vi
      .spyOn(RefundProcessor as unknown as { executeRefund: (...args: unknown[]) => Promise<unknown> }, "executeRefund")
      .mockResolvedValue({
        refundId: "REF-3",
        status: "completed",
        amount: 30,
        transactionId: "TX-3",
        completedAt: new Date(),
      });
    const notifySpy = vi.spyOn(RefundProcessor, "notifyRefundStatus");

    await RefundProcessor.processRetryJob("REF-3", "org-789");

    expect(executeSpy).toHaveBeenCalledWith(refund);
    // buildSouqOrgFilter returns $or structure for tenant isolation
    expect(mockRefundUpdate).toHaveBeenCalledWith(
      { refundId: "REF-3", $or: [{ orgId: { $in: ["org-789"] } }, { org_id: { $in: ["org-789"] } }] },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "completed",
          transactionId: "TX-3",
        }),
      }),
    );
    expect(mockOrderUpdate).toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({ refundId: "REF-3", orgId: "org-789" }),
      expect.objectContaining({ status: "completed", transactionId: "TX-3" }),
    );
  });

  it("skips manual retry when refund is not processing", async () => {
    const refund = {
      refundId: "REF-4",
      claimId: "CL-4",
      orderId: "ORD-4",
      buyerId: "buyer-4",
      sellerId: "seller-4",
      orgId: "org-999",
      amount: 40,
      reason: "retry-skip",
      paymentMethod: "card",
      status: "failed" as const,
      retryCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRefundFindOne.mockResolvedValueOnce(refund as any);

    const executeSpy = vi
      .spyOn(RefundProcessor as unknown as { executeRefund: (...args: unknown[]) => Promise<unknown> }, "executeRefund")
      .mockResolvedValue({
        refundId: "REF-4",
        status: "completed",
        amount: 40,
        transactionId: "TX-4",
      });
    const notifySpy = vi.spyOn(RefundProcessor, "notifyRefundStatus");

    await RefundProcessor.processRetryJob("REF-4", "org-999");

    expect(executeSpy).not.toHaveBeenCalled();
    expect(mockRefundUpdate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(notifySpy).not.toHaveBeenCalled();
  });
});
