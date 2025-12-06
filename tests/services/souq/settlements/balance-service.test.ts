import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

let transactions: any[] = [];
let orders: any[] = [];

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => ({
    connection: {
      db: {
        collection: (name: string) => {
          if (name === "souq_transactions") {
            return {
              aggregate: vi.fn((pipeline: any[]) => ({
                toArray: async () => {
                  const salesTotal = transactions
                    .filter((t) => t.type === "sale")
                    .reduce((sum, t) => sum + t.amount, 0);
                  return salesTotal
                    ? [{ _id: "sale", total: salesTotal, count: 1 }]
                    : [];
                },
              })),
            };
          }
          if (name === "souq_orders") {
            return {
              find: () => ({
                toArray: async () => orders.slice(),
              }),
            };
          }
          if (name === "souq_seller_balances") {
            return {
              findOneAndUpdate: vi.fn(async () => ({ value: null })),
              findOne: vi.fn(async () => null),
              updateOne: vi.fn(async () => ({})),
            };
          }
          throw new Error(`Unexpected collection ${name}`);
        },
      },
    },
  })),
}));

vi.mock("@/lib/redis", () => ({ getCache: vi.fn(async () => null), setCache: vi.fn(async () => {}), invalidateCacheKey: vi.fn(async () => {}), CacheTTL: { FIVE_MINUTES: 300 } }));

import { SellerBalanceService } from "@/services/souq/settlements/balance-service";

const orgId = new ObjectId();
const sellerObj = new ObjectId();
const sellerStr = sellerObj.toString();

describe("SellerBalanceService.getBalance", () => {
  beforeEach(() => {
    transactions = [];
    orders = [];
  });

  it("computes pending with ObjectId sellerId", async () => {
    transactions.push({ sellerId: sellerObj, orgId, type: "sale", amount: 100 });
    orders.push({ orgId, items: [{ sellerId: sellerObj, pricePerUnit: 20, quantity: 2 }], status: "pending", pricing: {} });
    const balance = await SellerBalanceService.getBalance(sellerObj.toString(), orgId.toString());
    expect(balance.available).toBe(100);
    expect(balance.pending).toBe(40);
  });

  it("computes pending with string sellerId", async () => {
    transactions.push({ sellerId: sellerStr, orgId, type: "sale", amount: 50 });
    orders.push({ orgId, items: [{ sellerId: sellerStr, pricePerUnit: 10, quantity: 1 }], status: "processing", pricing: {} });
    const balance = await SellerBalanceService.getBalance(sellerStr, orgId.toString());
    expect(balance.available).toBe(50);
    expect(balance.pending).toBe(10);
  });
});
