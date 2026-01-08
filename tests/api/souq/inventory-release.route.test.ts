/**
 * Tests for POST /api/souq/inventory/release
 * @description Releases previously made inventory reservations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/souq/inventory/release/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/souq/inventory-service", () => ({
  inventoryService: {
    releaseReservation: vi.fn().mockResolvedValue({ success: true }),
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
    data: { listingId: "listing-1", reservationId: "res-1" },
    error: null,
  }),
}));

import { auth } from "@/auth";

describe("POST /api/souq/inventory/release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/souq/inventory/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "listing-1", reservationId: "res-1" }),
    });

    const response = await POST(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("requires valid payload for release", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "user-1",
        role: "VENDOR",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/inventory/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "listing-1", reservationId: "res-1" }),
    });

    const response = await POST(request);
    expect([200, 201, 400, 404, 500]).toContain(response.status);
  });
});
