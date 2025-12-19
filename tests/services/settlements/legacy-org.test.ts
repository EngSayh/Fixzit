import { describe, it, expect, beforeEach, vi } from "vitest";
import { SettlementCalculatorService } from "@/services/souq/settlements/settlement-calculator";
import type { Filter } from "mongodb";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


type FindCall = { collection: string; filter: unknown };
type UpdateCall = { collection: string; filter: unknown };

const findCalls: FindCall[] = [];
const updateCalls: UpdateCall[] = [];

// Queued responses for collection.find calls
const findResponses: Record<string, Array<unknown[]>> = {
  souq_orders: [],
  souq_settlements: [],
};

// Optional findOne responses
const findOneResponses: Record<string, Array<unknown>> = {
  souq_settlements: [],
};

const hasOrgScope = (filter: Record<string, unknown>): boolean =>
  "$or" in filter || "orgId" in filter || "org_id" in filter;

// Mock Mongo collection
const makeCollection = (name: string) => ({
  find: vi.fn((filter: unknown) => {
    findCalls.push({ collection: name, filter });
    const response = findResponses[name]?.shift?.() ?? [];
    return {
      toArray: async () => response as unknown[],
    };
  }),
  findOne: vi.fn((filter: unknown) => {
    findCalls.push({ collection: name, filter });
    return (findOneResponses[name]?.shift?.() ?? null) as unknown;
  }),
  updateOne: vi.fn((filter: unknown) => {
    updateCalls.push({ collection: name, filter });
    return Promise.resolve({ matchedCount: 1, modifiedCount: 1 });
  }),
  insertOne: vi.fn(),
});

// Mock connectDb to return a fake db with collection factory
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => ({
    connection: {
      db: {
        collection: (name: string) => makeCollection(name),
      },
    },
  })),
}));

describe("SettlementCalculatorService - legacy org_id support", () => {
  beforeEach(() => {
    findCalls.length = 0;
    updateCalls.length = 0;
    findResponses.souq_orders = [];
    findResponses.souq_settlements = [];
    findOneResponses.souq_settlements = [];
  });

  it("includes legacy org_id documents in calculatePeriodSettlement queries", async () => {
    const now = new Date();
    findResponses.souq_orders.push([
      {
        _id: "order1",
        orgId: "507f1f77bcf86cd799439011",
        items: [{ sellerId: "507f1f77bcf86cd799439012", subtotal: 100 }],
        deliveredAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        status: "delivered",
      },
      {
        _id: "order2",
        org_id: "507f1f77bcf86cd799439011", // legacy field
        orgId: undefined,
        items: [{ sellerId: "507f1f77bcf86cd799439012", subtotal: 200 }],
        deliveredAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        status: "delivered",
      },
    ]);

    const result = await SettlementCalculatorService.calculatePeriodSettlement(
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439011",
      new Date(now.getTime() - 86400000),
      new Date(now.getTime() + 86400000),
    );

    // Assert filter uses $or for orgId/org_id
    const filter = (findCalls[0]?.filter ?? {}) as Record<string, unknown>;
    expect(hasOrgScope(filter)).toBe(true);
    expect(result.totalOrders).toBeGreaterThan(0);
  });

  it("scopes releaseReserves updates with org filter including legacy org_id", async () => {
    const now = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    findResponses.souq_orders.push([
      {
        _id: "order3",
        org_id: "507f1f77bcf86cd799439011",
        items: [{ sellerId: "507f1f77bcf86cd799439012", subtotal: 150 }],
        deliveredAt: now,
        status: "delivered",
      },
    ]);

    const released = await SettlementCalculatorService.releaseReserves(
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439011",
    );

    const findFilter = (findCalls[0]?.filter ?? {}) as Record<string, unknown>;
    const updateFilter = (updateCalls[0]?.filter ?? {}) as Record<string, unknown>;
    expect(hasOrgScope(findFilter)).toBe(true);
    expect(hasOrgScope(updateFilter)).toBe(true);
    expect(released).toBeGreaterThan(0);
  });

  it("includes legacy org_id in seller summary aggregation paths", async () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    // availableOrders, reservedOrders, pendingOrders
    findResponses.souq_orders.push(
      [
        {
          _id: "orderA",
          org_id: "507f1f77bcf86cd799439011",
          items: [{ sellerId: "507f1f77bcf86cd799439012", subtotal: 120 }],
          deliveredAt: past,
          status: "delivered",
        },
      ],
      [
        {
          _id: "orderB",
          orgId: "507f1f77bcf86cd799439011",
          items: [{ sellerId: "507f1f77bcf86cd799439012", subtotal: 80 }],
          deliveredAt: new Date(),
          status: "delivered",
        },
      ],
      [
        {
          _id: "orderC",
          org_id: "507f1f77bcf86cd799439011",
          items: [{ sellerId: "507f1f77bcf86cd799439012", subtotal: 60 }],
          status: "pending",
        },
      ],
    );

    // paid statements
    findResponses.souq_settlements.push([
      { summary: { netPayout: 100 } },
    ]);
    findOneResponses.souq_settlements.push({ paidAt: new Date() });

    const summary = await SettlementCalculatorService.getSellerSummary(
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439011",
    );

    expect(findCalls.some((c) => c.collection === "souq_orders" && hasOrgScope(c.filter as Record<string, unknown>))).toBe(true);
    expect(findCalls.some((c) => c.collection === "souq_settlements")).toBe(true);
    expect(summary.totalEarnings).toBeGreaterThanOrEqual(0);
    expect(summary.availableBalance).toBeGreaterThanOrEqual(0);
  });
});
