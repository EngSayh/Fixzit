import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const statements: any[] = [];
const payouts: any[] = [];
const withdrawalIndexes = vi.fn(async () => undefined);

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => ({
    connection: {
      db: {
        collection: (name: string) => {
          if (name === "souq_settlements") {
            return {
              findOne: vi.fn(async (query: Record<string, unknown>) =>
                statements.find(
                  (s) =>
                    s.statementId === query.statementId &&
                    s.sellerId.toString() === query.sellerId.toString() &&
                    query.orgId.$in.some((candidate: unknown) => candidate.toString() === s.orgId.toString()),
                ) ?? null,
              ),
            };
          }
          if (name === "souq_payouts") {
            return {
              insertOne: vi.fn(async (doc: unknown) => {
                payouts.push(doc);
                return { insertedId: (doc as { _id?: ObjectId })._id ?? new ObjectId() };
              }),
            };
          }
          if (name === "souq_withdrawal_requests") {
            return {
              createIndexes: withdrawalIndexes,
            };
          }
          return { createIndexes: vi.fn() };
        },
      },
    },
  })),
}));

vi.mock("@/services/souq/settlements/escrow-service", () => ({
  escrowService: {
    releaseFunds: vi.fn(),
  },
}));

vi.mock("@/services/souq/settlements/settlement-config", () => ({
  PAYOUT_CONFIG: {
    minimumAmount: 100,
    holdPeriodDays: 7,
  },
}));

vi.mock("@/lib/id-generator", () => ({
  generatePayoutId: () => "PAYOUT-1",
  generateTransactionId: () => "TX-1",
  generateBatchId: () => "BATCH-1",
}));

import { PayoutProcessorService } from "@/services/souq/settlements/payout-processor";

describe("PayoutProcessorService.requestPayout", () => {
  beforeEach(() => {
    statements.length = 0;
    payouts.length = 0;
    withdrawalIndexes.mockClear();
    process.env.ENABLE_SADAD_PAYOUTS = "false";
  });

  it("requires orgId to request payout", async () => {
    await expect(
      PayoutProcessorService.requestPayout(
        new ObjectId().toString(),
        "stmt-1",
        "",
        {
          bankName: "Bank",
          accountNumber: "123",
          iban: "SA000",
          accountHolderName: "Holder",
        },
      ),
    ).rejects.toThrow("orgId is required");
  });

  it("rejects payouts when statement is not approved", async () => {
    const sellerId = new ObjectId();
    const orgId = new ObjectId();
    statements.push({
      statementId: "stmt-1",
      sellerId,
      orgId,
      status: "pending",
      summary: { netPayout: 500 },
    });

    await expect(
      PayoutProcessorService.requestPayout(sellerId.toString(), "stmt-1", orgId.toString(), {
        bankName: "Bank",
        accountNumber: "123",
        iban: "SA000",
        accountHolderName: "Holder",
      }),
    ).rejects.toThrow("Statement must be approved before requesting payout");
  });

  it("enforces post-delivery hold period before payout", async () => {
    const sellerId = new ObjectId();
    const orgId = new ObjectId();
    const recentEnd = new Date();
    recentEnd.setDate(recentEnd.getDate() - 3);

    statements.push({
      statementId: "stmt-2",
      sellerId,
      orgId,
      status: "approved",
      period: { end: recentEnd },
      summary: { netPayout: 500 },
    });

    await expect(
      PayoutProcessorService.requestPayout(sellerId.toString(), "stmt-2", orgId.toString(), {
        bankName: "Bank",
        accountNumber: "123",
        iban: "SA000",
        accountHolderName: "Holder",
      }),
    ).rejects.toThrow(/hold period/i);
  });
});
