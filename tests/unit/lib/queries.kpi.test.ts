import { beforeEach, describe, expect, it, vi } from "vitest";
import { COLLECTIONS } from "@/lib/db/collections";

// Mock Mongo connection
const mockCollections: Record<string, any> = {};
const collectionMock = vi.fn((name: string) => mockCollections[name]);

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(async () => ({
    collection: collectionMock,
  })),
}));

import {
  getInvoiceCounters,
  getRevenueStats,
  getWorkOrderStats,
} from "@/lib/queries";

describe("lib/queries KPI correctness", () => {
  beforeEach(() => {
    Object.keys(mockCollections).forEach((k) => delete mockCollections[k]);
    collectionMock.mockReset();
  });

  it("getWorkOrderStats uses canonical statuses/fields", async () => {
    const woCollection = {
      countDocuments: vi
        .fn()
        // total
        .mockResolvedValueOnce(10)
        // open (SUBMITTED/ASSIGNED)
        .mockResolvedValueOnce(3)
        // in progress
        .mockResolvedValueOnce(4)
        // overdue
        .mockResolvedValueOnce(2)
        // completed/verified/closed
        .mockResolvedValueOnce(1),
    };
    mockCollections[COLLECTIONS.WORK_ORDERS] = woCollection;

    const stats = await getWorkOrderStats("org1");

    expect(woCollection.countDocuments).toHaveBeenCalledWith({
      orgId: "org1",
      isDeleted: { $ne: true },
    });
    expect(stats).toEqual({
      total: 10,
      open: 3,
      inProgress: 4,
      overdue: 2,
      completed: 1,
      completionRate: "10.0",
    });
  });

  it("getInvoiceCounters uses canonical statuses/fields", async () => {
    const invoicesCollection = {
      countDocuments: vi
        .fn()
        .mockResolvedValueOnce(5) // unpaid (ISSUED/OVERDUE)
        .mockResolvedValueOnce(2) // overdue with dueDate
        .mockResolvedValueOnce(7) // paid
        .mockResolvedValueOnce(12), // total
    };
    mockCollections[COLLECTIONS.INVOICES] = invoicesCollection;

    const counters = await getInvoiceCounters("org1");

    expect(invoicesCollection.countDocuments).toHaveBeenNthCalledWith(1, {
      orgId: "org1",
      status: { $in: ["ISSUED", "OVERDUE"] },
    });
    expect(invoicesCollection.countDocuments).toHaveBeenNthCalledWith(2, {
      orgId: "org1",
      status: { $in: ["ISSUED", "OVERDUE"] },
      dueDate: { $lt: expect.any(Date) },
    });
    expect(invoicesCollection.countDocuments).toHaveBeenNthCalledWith(3, {
      orgId: "org1",
      status: "PAID",
    });
    expect(counters).toEqual({ unpaid: 5, overdue: 2, paid: 7, total: 12 });
  });

  it("getRevenueStats aggregates by paidAt and total/total_amount", async () => {
    const toArrayMock = vi.fn().mockResolvedValue([{ _id: null, total: 120, count: 3 }]);
    const aggregateMock = vi.fn(() => ({ toArray: toArrayMock }));
    mockCollections[COLLECTIONS.INVOICES] = {
      aggregate: aggregateMock,
    };

    const res = await getRevenueStats("org1", 30);

    expect(aggregateMock).toHaveBeenCalled();
    const matchStage = aggregateMock.mock.calls[0][0][0].$match;
    expect(matchStage).toMatchObject({
      orgId: "org1",
      status: "PAID",
    });
    expect(matchStage.paidAt).toBeDefined();
    expect(res).toEqual({ total: 120, count: 3, currency: "SAR" });
  });
});
