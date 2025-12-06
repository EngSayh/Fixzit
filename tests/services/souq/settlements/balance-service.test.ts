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
              find: (query: any) => ({
                sort: () => ({
                  toArray: async () =>
                    transactions.filter(
                      (t) =>
                        String(t.orgId) === String(query.orgId) &&
                        String(t.sellerId) === String(query.sellerId),
                    ),
                }),
              }),
            };
          }
          if (name === "souq_orders") {
            return {
              find: (query: any) => ({
                toArray: async () =>
                  orders.filter(
                    (o) =>
                      String(o.orgId) === String(query.orgId) &&
                      o.items.some(
                        (i: any) =>
                          String(i.sellerId) ===
                          String(query["items.sellerId"]),
                      ),
                  ),
              }),
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
