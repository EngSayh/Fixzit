/**
 * @fileoverview Tests for Souq Seller KYC Pending API
 * @route GET /api/souq/seller-central/kyc/pending
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetPending = vi.fn();
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
    getPendingKYCSubmissions: (...args: unknown[]) => mockGetPending(...args),
  },
}));

const ORG_ID = "507f1f77bcf86cd799439011";

function createRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/souq/seller-central/kyc/pending");
}

describe("/api/souq/seller-central/kyc/pending", () => {
  let GET: typeof import("@/app/api/souq/seller-central/kyc/pending/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    currentSession = null;
    mockGetPending.mockResolvedValue([]);

    const mod = await import("@/app/api/souq/seller-central/kyc/pending/route");
    GET = mod.GET;
  });

  it("returns 401 when session is missing", async () => {
    currentSession = null;

    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is not admin", async () => {
    currentSession = {
      user: { id: "user-1", orgId: ORG_ID, role: "VENDOR" },
    };

    const res = await GET(createRequest());
    expect(res.status).toBe(403);
  });

  it("returns 403 when orgId is missing", async () => {
    currentSession = {
      user: { id: "admin-1", role: "ADMIN" },
    };

    const res = await GET(createRequest());
    expect(res.status).toBe(403);
  });

  it("returns pending submissions for admin", async () => {
    currentSession = {
      user: { id: "admin-1", orgId: ORG_ID, role: "ADMIN" },
    };

    const res = await GET(createRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.total).toBe(0);
    expect(mockGetPending).toHaveBeenCalledWith(ORG_ID);
  });

  it("returns 500 when service throws", async () => {
    currentSession = {
      user: { id: "admin-1", orgId: ORG_ID, role: "ADMIN" },
    };
    mockGetPending.mockRejectedValueOnce(new Error("Service unavailable"));

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });
});
