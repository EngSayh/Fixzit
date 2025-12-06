import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

let transactions: any[] = [];
let orders: any[] = [];
const balances = new Map<string, any>();
let orderMatch: any = {};

const keyFor = (sellerId: any, orgId: any) =>
  `${sellerId?.toString?.() ?? sellerId}-${orgId?.toString?.() ?? orgId}`;

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => ({
    connection: {
      db: {
        collection: (name: string) => {
          if (name === "souq_transactions") {
            return {
              insertOne: vi.fn(async (doc: any) => {
                transactions.push({ ...doc });
                return { acknowledged: true };
              }),
              aggregate: vi.fn((pipeline: any[]) => ({
                toArray: async () => {
                  const match = pipeline.find((p) => p.$match)?.$match ?? {};
                  const filtered = transactions.filter((t) => {
                    const sellerMatches =
                      !match.sellerId ||
                      t.sellerId?.toString?.() === match.sellerId?.toString?.();
                    const orgMatches =
                      !match.orgId ||
                      t.orgId?.toString?.() === match.orgId?.toString?.();
                    return sellerMatches && orgMatches;
                  });
                  const totals = filtered.reduce<Record<string, number>>((acc, txn) => {
                    acc[txn.type] = (acc[txn.type] ?? 0) + (txn.amount ?? 0);
                    return acc;
                  }, {});
                  return Object.entries(totals).map(([type, total]) => ({
                    _id: type,
                    total,
                    count: filtered.filter((f) => f.type === type).length,
                  }));
                },
              })),
              find: (query: any) => {
                const filtered = transactions.filter((t) => {
                  const sellerMatches =
                    !query.sellerId ||
                    t.sellerId?.toString?.() === query.sellerId?.toString?.();
                  const orgMatches =
                    !query.orgId ||
                    t.orgId?.toString?.() === query.orgId?.toString?.();
                  return sellerMatches && orgMatches;
                });
                return {
                  sort: () => ({
                    toArray: async () => filtered,
                  }),
                };
              },
              countDocuments: vi.fn(async (query: any) => {
                return transactions.filter(
                  (t) =>
                    (!query.sellerId || t.sellerId?.toString?.() === query.sellerId?.toString?.()) &&
                    (!query.orgId || t.orgId?.toString?.() === query.orgId?.toString?.()),
                ).length;
              }),
            };
          }
          if (name === "souq_orders") {
            const aggregatePending = () => ({
              toArray: async () => {
                const pendingStatuses = ["pending", "processing", "shipped"];
                const total = orders.reduce((sum, order) => {
                  if (!pendingStatuses.includes(order.status)) return sum;
                  const items = Array.isArray(order.items) ? order.items : [];
                  const sellerItems = items.filter((item: any) =>
                    orderMatch.sellerId
                      ? item.sellerId?.toString?.() === orderMatch.sellerId?.toString?.()
                      : true,
                  );
                  const subtotal = sellerItems.reduce((s: number, item: any) => {
                    if (typeof item.subtotal === "number") return s + item.subtotal;
                    const price = typeof item.pricePerUnit === "number" ? item.pricePerUnit : 0;
                    const qty = typeof item.quantity === "number" ? item.quantity : 1;
                    return s + price * qty;
                  }, 0);
                  return sum + subtotal;
                }, 0);
                return total ? [{ _id: null, total }] : [];
              },
            });
            return {
              aggregate: vi.fn((pipeline: any[]) => {
                orderMatch = pipeline.find((p) => p.$match)?.$match ?? {};
                return aggregatePending();
              }),
              find: () => ({
                toArray: async () => orders.slice(),
              }),
            };
          }
          if (name === "souq_seller_balances") {
            return {
              createIndex: vi.fn(async () => ({})),
              findOne: vi.fn(async (query: any) => {
                const direct = balances.get(keyFor(query.sellerId, query.orgId));
                if (direct) return direct;
                for (const value of balances.values()) {
                  if (
                    value.sellerId?.toString?.() === query.sellerId?.toString?.() &&
                    value.orgId?.toString?.() === query.orgId?.toString?.()
                  ) {
                    return value;
                  }
                }
                // If any balance exists, return first to emulate fallback doc read (tests only)
                if (balances.size > 0) {
                  return balances.values().next().value;
                }
                return null;
              }),
              insertOne: vi.fn(async (doc: any) => {
                balances.set(keyFor(doc.sellerId, doc.orgId), { ...doc });
                return { acknowledged: true };
              }),
              updateOne: vi.fn(async (filter: any, update: any) => {
                const key = keyFor(filter.sellerId, filter.orgId);
                const current = balances.get(key);
                if (!current) return { modifiedCount: 0 };
                if (
                  (filter.available !== undefined && current.available !== filter.available) ||
                  (filter.reserved !== undefined && current.reserved !== filter.reserved)
                ) {
                  return { modifiedCount: 0 };
                }
                const next = { ...current };
                if (update.$set) {
                  Object.assign(next, update.$set);
                }
                if (update.$inc) {
                  for (const [k, v] of Object.entries(update.$inc)) {
                    // @ts-ignore
                    next[k] = (next[k] ?? 0) + (v as number);
                  }
                }
                balances.set(key, next);
                return { modifiedCount: 1 };
              }),
            };
          }
          throw new Error(`Unexpected collection ${name}`);
        },
      },
      getClient: () => ({
        startSession: () => ({
          withTransaction: async (cb: () => Promise<void>) => cb(),
          endSession: async () => {},
        }),
      }),
    },
  })),
}));

vi.mock("@/lib/redis", () => ({
  getCache: vi.fn(async () => null),
  setCache: vi.fn(async () => {}),
  invalidateCacheKey: vi.fn(async () => {}),
  CacheTTL: { FIVE_MINUTES: 300 },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { SellerBalanceService } from "@/services/souq/settlements/balance-service";

const orgId = new ObjectId();
const sellerObj = new ObjectId();
const sellerStr = sellerObj.toString();

describe("SellerBalanceService.getBalance", () => {
  beforeEach(() => {
    transactions = [];
    orders = [];
    balances.clear();
    orderMatch = {};
  });

  it("computes pending with ObjectId sellerId", async () => {
    transactions.push({ sellerId: sellerObj, orgId, type: "sale", amount: 100 });
    orders.push({ orgId, items: [{ sellerId: sellerObj, pricePerUnit: 20, quantity: 2 }], status: "pending", pricing: {} });
    balances.set(keyFor(sellerObj.toString(), orgId.toString()), {
      sellerId: sellerObj.toString(),
      orgId: orgId.toString(),
      available: 100,
      reserved: 0,
      totalEarnings: 100,
      updatedAt: new Date(),
    });
    const balance = await SellerBalanceService.getBalance(sellerObj.toString(), orgId.toString());
    expect(balance.available).toBe(100);
    expect(balance.pending).toBe(40);
  });

  it("computes pending with string sellerId", async () => {
    transactions.push({ sellerId: sellerStr, orgId, type: "sale", amount: 50 });
    orders.push({ orgId, items: [{ sellerId: sellerStr, pricePerUnit: 10, quantity: 1 }], status: "processing", pricing: {} });
    balances.set(keyFor(sellerStr, orgId.toString()), {
      sellerId: sellerStr,
      orgId: orgId.toString(),
      available: 50,
      reserved: 0,
      totalEarnings: 50,
      updatedAt: new Date(),
    });
    const balance = await SellerBalanceService.getBalance(sellerStr, orgId.toString());
    expect(balance.available).toBe(50);
    expect(balance.pending).toBe(10);
  });
});

describe("SellerBalanceService.recordTransaction validation", () => {
  beforeEach(() => {
    transactions = [];
    orders = [];
    balances.clear();
    orderMatch = {};
    balances.set(keyFor(sellerStr, orgId.toString()), {
      sellerId: sellerStr,
      orgId: orgId.toString(),
      available: 100,
      reserved: 20,
      totalEarnings: 100,
      updatedAt: new Date(),
    });
  });

  it("rejects reserve_release that exceeds reserved", async () => {
    await expect(
      SellerBalanceService.recordTransaction({
        sellerId: sellerStr,
        orgId: orgId.toString(),
        type: "reserve_release",
        amount: 30, // exceeds reserved 20
        description: "over release",
      }),
    ).rejects.toThrow(/Cannot release more than reserved/);
  });

  it("rejects positive withdrawal/fees", async () => {
    await expect(
      SellerBalanceService.recordTransaction({
        sellerId: sellerStr,
        orgId: orgId.toString(),
        type: "withdrawal",
        amount: 10, // must be negative
        description: "bad sign",
      }),
    ).rejects.toThrow(/withdrawal amount must be negative/i);
  });

  it("nets refunds against earnings", async () => {
    await SellerBalanceService.recordTransaction({
      sellerId: sellerStr,
      orgId: orgId.toString(),
      type: "refund",
      amount: -40,
      description: "order refund",
    });
    const balanceAfter = balances.get(keyFor(sellerStr, orgId.toString()));
    expect(balanceAfter.available).toBe(60); // 100 - 40
    expect(balanceAfter.totalEarnings).toBe(60); // 100 - 40
  });
});
