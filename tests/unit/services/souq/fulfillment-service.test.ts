// @vitest-environment node
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

vi.mock("@/server/models/souq/Listing", () => ({
  SouqListing: {
    findOne: vi.fn(async (query: Record<string, unknown>) => {
      return listings.find(
        (l) =>
          l.listingId === query.listingId &&
          matchesOrgFilter(l.orgId, query),
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
          matchesOrgFilter(inv.orgId, query),
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
