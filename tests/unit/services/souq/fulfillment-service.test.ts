import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Simple in-memory fixtures for souq listing/inventory queries
type ListingRecord = { listingId: string; orgId: string; badges?: string[]; save: () => Promise<void> };
const listings: Array<ListingRecord> = [];
const inventories: Array<{ listingId: string; orgId: string; fulfillmentType: string; availableQuantity: number }> = [];

/**
 * Helper to check if an orgId matches using the same logic as buildSouqOrgFilter.
 * buildSouqOrgFilter creates a $or query with [{ orgId: { $in: [...] } }, { org_id: { $in: [...] } }].
 */
function matchesOrgFilter(targetOrgId: string, query: Record<string, unknown>): boolean {
  // Handle $or: [{ orgId: { $in: [...] } }, { org_id: { $in: [...] } }]
  if (query.$or && Array.isArray(query.$or)) {
    for (const clause of query.$or) {
      const orgIdField = (clause as Record<string, unknown>).orgId ?? (clause as Record<string, unknown>).org_id;
      if (orgIdField && typeof orgIdField === "object" && orgIdField !== null) {
        const inArr = (orgIdField as { $in?: unknown[] }).$in;
        if (Array.isArray(inArr)) {
          if (inArr.some((cand) => String(cand) === targetOrgId)) {
            return true;
          }
        }
      }
    }
    return false;
  }
  // Fallback: direct orgId field
  if (query.orgId) {
    if (typeof query.orgId === "object" && query.orgId !== null) {
      const inArr = (query.orgId as { $in?: unknown[] }).$in;
      if (Array.isArray(inArr)) {
        return inArr.some((cand) => String(cand) === targetOrgId);
      }
    }
    return String(query.orgId) === targetOrgId;
  }
  return true;
}

const bulkWriteMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/models/souq/Listing", () => ({
  SouqListing: {
    findOne: vi.fn(async (query: Record<string, unknown>) => {
      return listings.find(
        (l) =>
          l.listingId === query.listingId &&
          matchesOrgFilter(l.orgId, query),
      ) || null;
    }),
    find: vi.fn((query: Record<string, unknown>) => ({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn(async () => {
        const listingIds =
          (query.listingId as { $in?: string[] })?.$in || [];
        return listings.filter(
          (listing) =>
            listingIds.includes(listing.listingId) &&
            matchesOrgFilter(listing.orgId, query),
        );
      }),
    })),
    bulkWrite: (...args: unknown[]) => bulkWriteMock(...args),
  },
}));

vi.mock("@/server/models/souq/Inventory", () => ({
  SouqInventory: {
    findOne: vi.fn(async (query: Record<string, unknown>) => {
      return inventories.find(
        (inv) =>
          inv.listingId === query.listingId &&
          matchesOrgFilter(inv.orgId, query),
      ) || null;
    }),
    find: vi.fn((query: Record<string, unknown>) => ({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn(async () => {
        const listingIds =
          (query.listingId as { $in?: string[] })?.$in || [];
        return inventories.filter(
          (inventory) =>
            listingIds.includes(inventory.listingId) &&
            matchesOrgFilter(inventory.orgId, query),
        );
      }),
    })),
  },
}));

import { fulfillmentService } from "@/services/souq/fulfillment-service";

describe("fulfillmentService.assignFastBadge", () => {
  beforeEach(() => {
    listings.length = 0;
    inventories.length = 0;
    vi.clearAllMocks();
    bulkWriteMock.mockImplementation(async (ops: Array<{ updateOne: { filter: { listingId: string }; update: { $set: { badges: string[] } } } }>) => {
      for (const op of ops) {
        const target = listings.find((listing) => listing.listingId === op.updateOne.filter.listingId);
        if (target) {
          target.badges = op.updateOne.update.$set.badges;
        }
      }
      return { modifiedCount: ops.length };
    });
  });

  it("rejects when orgId is missing", async () => {
    const result = await fulfillmentService.assignFastBadge("L1", "" as unknown as string);
    expect(result).toBe(false);
  });

  it("returns false when listing not in org", async () => {
    listings.push({ listingId: "L1", orgId: "org-2", badges: [], save: vi.fn(async () => undefined) });
    inventories.push({ listingId: "L1", orgId: "org-2", fulfillmentType: "FBF", availableQuantity: 10 });

    const result = await fulfillmentService.assignFastBadge("L1", "org-1");
    expect(result).toBe(false);
  });

  it("assigns fast badge only within the same org", async () => {
    const save = vi.fn(async () => undefined);
    listings.push({ listingId: "L1", orgId: "org-1", badges: [], save });
    inventories.push({ listingId: "L1", orgId: "org-1", fulfillmentType: "FBF", availableQuantity: 10 });

    const result = await fulfillmentService.assignFastBadge("L1", "org-1");
    expect(result).toBe(true);
    expect(listings[0].badges).toContain("fast");
    expect(save).toHaveBeenCalled();
  });
});

describe("fulfillmentService.assignFastBadges", () => {
  beforeEach(() => {
    listings.length = 0;
    inventories.length = 0;
    vi.clearAllMocks();
  });

  it("returns zero counts when orgId is missing", async () => {
    const result = await fulfillmentService.assignFastBadges(["L1"], "" as unknown as string);
    expect(result).toEqual({ eligible: 0, updated: 0 });
  });

  it("bulk-assigns fast badges within org scope", async () => {
    listings.push({ listingId: "L1", orgId: "org-1", badges: [], save: vi.fn(async () => undefined) });
    listings.push({ listingId: "L2", orgId: "org-1", badges: ["fast"], save: vi.fn(async () => undefined) });
    inventories.push({ listingId: "L1", orgId: "org-1", fulfillmentType: "FBF", availableQuantity: 10 });
    inventories.push({ listingId: "L2", orgId: "org-1", fulfillmentType: "FBM", availableQuantity: 2 });

    const result = await fulfillmentService.assignFastBadges(["L1", "L2"], "org-1");

    expect(result.eligible).toBe(1);
    // L1: add badge (qualifies), L2: remove badge (no longer qualifies) = 2 updates
    expect(result.updated).toBe(2);
    expect(listings[0].badges).toContain("fast");
    expect(listings[1].badges).not.toContain("fast");
    expect(bulkWriteMock).toHaveBeenCalled();
  });
});
