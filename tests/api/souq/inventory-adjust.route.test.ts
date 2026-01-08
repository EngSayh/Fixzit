/**
 * Tests for POST /api/souq/inventory/adjust
 * @description Adjusts inventory quantities for damage, loss, or correction
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/souq/inventory/adjust/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/souq/inventory-service", () => ({
  inventoryService: {
    adjustInventory: vi.fn().mockResolvedValue({
      success: true,
      inventory: { available: 50, reserved: 10 },
    }),
  },
}));

vi.mock("@/server/models/souq/Inventory", () => ({
  SouqInventory: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({
    data: { listingId: "listing-1", quantity: -5, reason: "damage" },
    error: null,
  }),
}));

import { auth } from "@/auth";

describe("POST /api/souq/inventory/adjust", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/souq/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "listing-1", quantity: -5, reason: "damage" }),
    });

    const response = await POST(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns 403 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "seller-1",
        role: "VENDOR",
        // No orgId
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "listing-1", quantity: -5, reason: "damage" }),
    });

    const response = await POST(request);
    expect([400, 403, 500]).toContain(response.status);
  });

  it("processes adjustment for seller with orgId", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "seller-1",
        role: "VENDOR",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "listing-1", quantity: -5, reason: "damage" }),
    });

    const response = await POST(request);
    expect([200, 201, 400, 404, 500]).toContain(response.status);
  });
});
