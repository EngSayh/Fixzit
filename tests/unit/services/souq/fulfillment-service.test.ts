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
 * Helper to check if an orgId matches using the same logic as buildOrgFilter.
 * buildOrgFilter creates a $in query with both string and ObjectId variants.
 */
function matchesOrgQuery(targetOrgId: string, queryOrg: unknown): boolean {
  if (!queryOrg) return true;
  // If it's an $in array, check if targetOrgId matches any candidate (as string)
  if (typeof queryOrg === "object" && queryOrg !== null) {
    const inArr = (queryOrg as { $in?: unknown[] }).$in;
    if (Array.isArray(inArr)) {
      return inArr.some((cand) => String(cand) === targetOrgId);
    }
  }
  // Direct string match
  return String(queryOrg) === targetOrgId;
}

vi.mock("@/server/models/souq/Listing", () => ({
  SouqListing: {
    findOne: vi.fn(async (query: Record<string, unknown>) => {
      return listings.find(
        (l) =>
          l.listingId === query.listingId &&
          matchesOrgQuery(l.orgId, query.orgId),
      ) || null;
    }),
  },
}));

vi.mock("@/server/models/souq/Inventory", () => ({
  SouqInventory: {
    findOne: vi.fn(async (query: Record<string, unknown>) => {
      return inventories.find(
        (inv) =>
          inv.listingId === query.listingId &&
          matchesOrgQuery(inv.orgId, query.orgId),
      ) || null;
    }),
  },
}));

import { fulfillmentService } from "@/services/souq/fulfillment-service";

describe("fulfillmentService.assignFastBadge", () => {
  beforeEach(() => {
    listings.length = 0;
    inventories.length = 0;
    vi.clearAllMocks();
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
