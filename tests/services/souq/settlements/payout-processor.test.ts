import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

// Mock db wiring
const mockPayouts: any[] = [];
const mockBatches: any[] = [];
const appliedUpdates: any[] = [];

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => ({
    connection: {
      db: {
        collection: (name: string) => {
          if (name === "souq_payouts") {
            return {
              findOne: vi.fn(async (filter: any) =>
                mockPayouts.find(
                  (p) =>
                    p.payoutId === filter.payoutId &&
                    String(p.orgId) === String(filter.orgId),
                ) || null,
              ),
              find: vi.fn((filter: any) => ({
                toArray: vi.fn(async () => mockPayouts.filter((p) => p.payoutId === "P1")),
              })),
              updateOne: vi.fn(async (filter: any, update: any) => {
                const idx = mockPayouts.findIndex(
                  (p) =>
                    p.payoutId === filter.payoutId &&
                    String(p.orgId) === String(filter.orgId),
                );
                if (idx >= 0) {
                  mockPayouts[idx] = { ...mockPayouts[idx], ...update.$set };
                  appliedUpdates.push({ filter, update });
                }
              }),
            };
          }
          if (name === "souq_payout_batches") {
            return {
              insertOne: vi.fn(async (doc: any) => {
                mockBatches.push(doc);
              }),
              updateOne: vi.fn(async (filter: any, update: any) => {
                const idx = mockBatches.findIndex(
                  (b) =>
                    b.batchId === filter.batchId &&
                    String(b.orgId) === String(filter.orgId),
                );
                if (idx >= 0) {
                  mockBatches[idx] = { ...mockBatches[idx], ...update.$set };
                }
              }),
            };
          }
          throw new Error(`Unexpected collection: ${name}`);
        },
      },
    },
  })),
  // Backwards-compat exports used in ensureMongoConnection paths
  connectToDatabase: vi.fn(async () => ({})),
  ensureMongoConnection: vi.fn(() => {}),
}));

// Keep mocking minimal; actual service imported below
import { PayoutProcessorService } from "@/services/souq/settlements/payout-processor";

const orgA = new ObjectId();
const orgB = new ObjectId();

describe("PayoutProcessorService.processBatchPayouts", () => {
  beforeEach(() => {
    mockPayouts.length = 0;
    mockBatches.length = 0;
    appliedUpdates.length = 0;
    vi.spyOn(PayoutProcessorService as any, "executeBankTransfer").mockResolvedValue({
      success: true,
      transactionId: "TXN-TEST",
    });
    mockPayouts.push(
      { payoutId: "P1", orgId: orgA, status: "pending", retryCount: 0, amount: 100 },
      { payoutId: "P2", orgId: orgB, status: "pending", retryCount: 0, amount: 200 },
      { payoutId: "P3", orgId: orgA, status: "processing", retryCount: 0, amount: 50 },
    );
  });

  it("returns empty batch when no pending payouts exist for org", async () => {
    mockPayouts.length = 0;
    const batch = await PayoutProcessorService.processBatchPayouts(String(orgA), new Date());
    expect(batch.totalPayouts).toBe(0);
    expect(batch.payouts).toEqual([]);
  });

  it("processes only payouts for the requested org and stamps batch with orgId", async () => {
    const processSpy = vi
      .spyOn(PayoutProcessorService, "processPayout")
      .mockImplementation(async (payoutId: string, orgId: string) => {
        const target = mockPayouts.find(
          (p) => p.payoutId === payoutId && String(p.orgId) === String(orgId),
        );
        if (target) {
          target.status = "completed";
        }
        return target as any;
      });

    const batch = await PayoutProcessorService.processBatchPayouts(String(orgA), new Date());

    expect(batch.orgId.toString()).toBe(orgA.toString());
    expect(batch.totalPayouts).toBe(1);
    expect(batch.payouts).toEqual(["P1"]);
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith("P1", expect.anything());

    // Ensure batch record stored orgId
    expect(mockBatches[0].orgId.toString()).toBe(orgA.toString());
  });
});
