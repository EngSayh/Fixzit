import { describe, it, expect, beforeEach, vi } from "vitest";
import { ObjectId } from "mongodb";

const claimsStore: Record<string, unknown>[] = [];
const findOneCalls: Record<string, unknown>[] = [];

const { mockAddJob } = vi.hoisted(() => ({
  mockAddJob: vi.fn(async () => undefined),
}));

// Type guard to check if value is a record object
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Minimal matcher supporting $or, $in, and $lt for our claim filters
const matches = (doc: Record<string, unknown>, filter: Record<string, unknown>): boolean => {
  const entries = Object.entries(filter || {});
  for (const [key, value] of entries) {
    if (key === "$or") {
      return Array.isArray(value) && value.some((sub) => isRecord(sub) && matches(doc, sub));
    }

    const docVal = doc[key];

    if (isRecord(value)) {
      const inList = Array.isArray(value["$in"]) ? value["$in"] : null;
      if (inList && !inList.some((candidate) => String(candidate) === String(docVal))) {
        return false;
      }
      if (inList) continue;

      if ("$lt" in value || "$lte" in value || "$gt" in value || "$gte" in value) {
        const docNum =
          docVal instanceof Date ? docVal.getTime() : Number(docVal);
        const lt = value["$lt"];
        const lte = value["$lte"];
        const gt = value["$gt"];
        const gte = value["$gte"];
        const ltNum = lt instanceof Date ? lt.getTime() : Number(lt);
        const lteNum = lte instanceof Date ? lte.getTime() : Number(lte);
        const gtNum = gt instanceof Date ? gt.getTime() : Number(gt);
        const gteNum = gte instanceof Date ? gte.getTime() : Number(gte);
        if (lt !== undefined && !(docNum < ltNum)) return false;
        if (lte !== undefined && !(docNum <= lteNum)) return false;
        if (gt !== undefined && !(docNum > gtNum)) return false;
        if (gte !== undefined && !(docNum >= gteNum)) return false;
        continue;
      }
    }

    if (value !== undefined && String(docVal) !== String(value)) {
      return false;
    }
  }
  return true;
};

const collection = {
  insertOne: async (doc: Record<string, unknown>) => {
    claimsStore.push(doc);
    return { insertedId: doc._id ?? new ObjectId() };
  },
  findOne: async (filter: Record<string, unknown>) => {
    findOneCalls.push(filter);
    return claimsStore.find((c) => matches(c, filter)) ?? null;
  },
  find: (filter: Record<string, unknown>) => {
    const data = claimsStore.filter((c) => matches(c, filter));
    const chain = {
      sort: () => chain,
      skip: () => chain,
      limit: () => chain,
      toArray: async () => data,
    };
    return chain;
  },
  updateOne: async (
    filter: Record<string, unknown>,
    update: { $set?: Record<string, unknown>; $push?: Record<string, unknown> },
  ) => {
    const doc = claimsStore.find((c) => matches(c, filter));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    if (update.$push) {
      Object.entries(update.$push).forEach(([key, val]) => {
        const docArray = doc[key];
        if (!Array.isArray(docArray)) doc[key] = [];
        const arr = doc[key] as unknown[];
        if (isRecord(val) && Array.isArray(val["$each"])) {
          arr.push(...val["$each"]);
        } else {
          arr.push(val);
        }
      });
    }
    return { matchedCount: 1, modifiedCount: 1 };
  },
  countDocuments: async (filter: Record<string, unknown>) =>
    claimsStore.filter((c) => matches(c, filter)).length,
};

vi.mock("@/lib/queues/setup", () => ({
  addJob: mockAddJob,
  QUEUE_NAMES: { NOTIFICATIONS: "notifications" },
}));

vi.mock("@/lib/mongodb-unified", () => {
  return {
    connectToDatabase: vi.fn().mockResolvedValue(undefined),
    getDatabase: async () => ({
      collection: () => collection,
    }),
    connectToDatabase: async () => undefined,
    connectDb: async () => undefined,
    dbConnect: async () => undefined,
    connectMongo: async () => undefined,
    default: async () => undefined,
  };
});

import { ClaimService, type Claim } from "@/services/souq/claims/claim-service";

let claimAId: string;
let claimBId: string;

describe("ClaimService tenant isolation", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    claimsStore.length = 0;
    findOneCalls.length = 0;
    // Force ClaimService to use the in-memory collection to ensure tests don't hit real DB
    // @ts-expect-error overriding for test
    ClaimService.collection = async () => collection;
    const now = new Date();
    const overdue = new Date(Date.now() - 10_000);
    const baseClaim = (overrides: Partial<Claim>): Claim => ({
      _id: new ObjectId(),
      orgId: "org-a",
      claimId: `CLM-${Math.random().toString(36).slice(2, 8)}`,
      orderId: "ORD-A",
      buyerId: "BUY-A",
      sellerId: "SEL-A",
      productId: "PRD-A",
      type: "item_not_received",
      status: "pending_review",
      reason: "not delivered",
      description: "Package missing",
      evidence: [],
      filedAt: now,
      responseDeadline: overdue,
      orderAmount: 100,
      isAutoResolvable: false,
      isFraudulent: false,
      priority: "medium",
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });

    const claimA = baseClaim({ orgId: "org-a", claimId: "CLM-ORG-A" });
    const claimB = baseClaim({
      orgId: "org-b",
      claimId: "CLM-ORG-B",
      sellerId: "SEL-B",
      buyerId: "BUY-B",
      productId: "PRD-B",
      orderId: "ORD-B",
    });
    claimsStore.push(claimA, claimB);
    claimAId = claimA.claimId;
    claimBId = claimB.claimId;
    mockAddJob.mockClear();
  });

  it("returns claim only for matching orgId", async () => {
    const foundA = await ClaimService.getClaim(claimAId, "org-a");
    expect(findOneCalls.length).toBeGreaterThan(0);
    expect(foundA?.claimId).toBe(claimAId);

    const cross = await ClaimService.getClaim(claimAId, "org-b");
    expect(cross).toBeNull();
  });

  it("does not update status when orgId does not match", async () => {
    await ClaimService.updateStatus(claimAId, "org-b", "closed");
    const claimAfterWrongOrg = await ClaimService.getClaim(claimAId, "org-a");
    expect(claimAfterWrongOrg?.status).toBe("pending_review");

    await ClaimService.updateStatus(claimAId, "org-a", "closed");
    const claimAfterCorrectOrg = await ClaimService.getClaim(claimAId, "org-a");
    expect(claimAfterCorrectOrg?.status).toBe("closed");
  });

  it("does not make decision across tenants", async () => {
    await expect(
      ClaimService.makeDecision({
        claimId: claimAId,
        orgId: "org-b",
        decidedBy: "admin",
        outcome: "reject",
        reason: "invalid",
      }),
    ).rejects.toThrow(/Claim not found/);

    await ClaimService.makeDecision({
      claimId: claimAId,
      orgId: "org-a",
      decidedBy: "admin",
      outcome: "reject",
      reason: "invalid",
    });
    const claimA = await ClaimService.getClaim(claimAId, "org-a");
    expect(claimA?.decision?.outcome).toBe("reject");
  });

  it("escalates only overdue claims in the same tenant", async () => {
    expect(claimsStore.length).toBe(2);
    const manualOverdue = claimsStore.filter((c) =>
      matches(c, {
        status: { $in: ["pending_review", "pending_seller_response"] },
        responseDeadline: { $lt: new Date() },
        orgId: "org-a",
      }),
    );
    expect(manualOverdue.length).toBe(1);

    const escalatedCount = await ClaimService.escalateOverdueClaims("org-a");
    expect(escalatedCount).toBe(1);

    const claimA = await ClaimService.getClaim(claimAId, "org-a");
    const claimB = await ClaimService.getClaim(claimBId, "org-b");

    expect(claimA?.status).toBe("escalated");
    expect(claimB?.status).toBe("pending_review");
  });
});
