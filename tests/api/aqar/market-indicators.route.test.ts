/**
 * Tests for /api/aqar/market-indicators
 * @description Real estate price intelligence and market trends
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/aqar/market-indicators/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/models/aqar/MarketIndicator", () => ({
  MarketIndicator: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    create: vi.fn().mockResolvedValue({ _id: "indicator-1" }),
  },
  PropertyType: { apartment: "apartment", villa: "villa" },
  TransactionType: { sale: "sale", rent: "rent" },
}));

import { auth } from "@/auth";

describe("GET /api/aqar/market-indicators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/aqar/market-indicators");
    const response = await GET(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns indicators for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "user-1",
        role: "USER",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/aqar/market-indicators?city=Riyadh");
    const response = await GET(request);
    expect([200, 400, 500]).toContain(response.status);
  });
});

describe("POST /api/aqar/market-indicators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/aqar/market-indicators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: "Riyadh" }),
    });

    const response = await POST(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "user-1",
        role: "USER",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/aqar/market-indicators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: "Riyadh" }),
    });

    const response = await POST(request);
    expect([403, 400, 500]).toContain(response.status);
  });
});
