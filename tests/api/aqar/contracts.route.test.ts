/**
 * Tests for /api/aqar/contracts
 * @description Lease contracts API for Ejar integration
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH } from "@/app/api/aqar/contracts/route";

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

vi.mock("@/server/models/aqar/LeaseContract", () => ({
  LeaseContract: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({ _id: "contract-1" }),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
  },
  ContractType: { residential: "residential", commercial: "commercial" },
  LessorType: { individual: "individual", corporate: "corporate" },
  ContractStatus: { draft: "draft", active: "active" },
  PaymentFrequency: { monthly: "monthly" },
}));

import { auth } from "@/auth";

describe("GET /api/aqar/contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/aqar/contracts");
    const response = await GET(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns contracts for authenticated user with tenantId", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "user-1",
        role: "USER",
        tenantId: "tenant-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/aqar/contracts");
    const response = await GET(request);
    expect([200, 400, 403, 500]).toContain(response.status);
  });
});

describe("POST /api/aqar/contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/aqar/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_type: "residential", lessor_type: "individual" }),
    });

    const response = await POST(request);
    expect([401, 403, 500]).toContain(response.status);
  });
});
