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

vi.mock("@/server/models/souq/Listing", () => ({
  SouqListing: {
    findOne: vi.fn(async (query: Record<string, unknown>) => {
      return listings.find(
        (l) =>
          l.listingId === query.listingId &&
          (query.orgId ? l.orgId === query.orgId : true),
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
          (query.orgId ? inv.orgId === query.orgId : true),
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
