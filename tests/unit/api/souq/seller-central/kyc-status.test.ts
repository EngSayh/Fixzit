/**
 * @fileoverview Tests for Souq Seller KYC Status API
 * @route GET /api/souq/seller-central/kyc/status
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetKYCStatus = vi.fn();
let currentSession: Record<string, unknown> | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => currentSession),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/services/souq/seller-kyc-service", () => ({
  sellerKYCService: {
    getKYCStatus: (...args: unknown[]) => mockGetKYCStatus(...args),
  },
}));

const ORG_ID = "507f1f77bcf86cd799439011";
const SELLER_ID = "507f1f77bcf86cd799439012";

function createRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/souq/seller-central/kyc/status");
}

describe("/api/souq/seller-central/kyc/status", () => {
  let GET: typeof import("@/app/api/souq/seller-central/kyc/status/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    currentSession = null;
    mockGetKYCStatus.mockResolvedValue({ status: "pending" });

    const mod = await import("@/app/api/souq/seller-central/kyc/status/route");
    GET = mod.GET;
  });

  it("returns 401 when session is missing", async () => {
    currentSession = null;

    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when orgId is missing", async () => {
    currentSession = {
      user: { id: SELLER_ID, role: "VENDOR" },
    };

    const res = await GET(createRequest());
    expect(res.status).toBe(403);
  });

  it("returns status for authenticated seller", async () => {
    currentSession = {
      user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
    };

    const res = await GET(createRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockGetKYCStatus).toHaveBeenCalledWith(SELLER_ID, ORG_ID);
  });

  it("returns 500 when service throws", async () => {
    currentSession = {
      user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
    };
    mockGetKYCStatus.mockRejectedValueOnce(new Error("Service unavailable"));

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });
});
