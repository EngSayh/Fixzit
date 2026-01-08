/**
 * @fileoverview Tests for /api/souq/seller-central/kyc/status route
 * @description KYC verification status for sellers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockKYCStatus: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/seller-kyc-service", () => ({
  sellerKYCService: {
    getKYCStatus: vi.fn(async () => mockKYCStatus),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import route after mocks
import { GET } from "@/app/api/souq/seller-central/kyc/status/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Seller KYC Status API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockKYCStatus = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/souq/seller-central/kyc/status", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = new NextRequest("http://localhost/api/souq/seller-central/kyc/status");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = new NextRequest("http://localhost/api/souq/seller-central/kyc/status");
      const res = await GET(req);
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "seller" } };
      const req = new NextRequest("http://localhost/api/souq/seller-central/kyc/status");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should return pending status for new seller", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockKYCStatus = {
        status: "pending",
        documents: [],
        issues: [],
        submittedAt: null,
      };
      const req = new NextRequest("http://localhost/api/souq/seller-central/kyc/status");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe("pending");
    });

    it("should return verified status for approved seller", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockKYCStatus = {
        status: "verified",
        documents: [
          { type: "cr", status: "approved" },
          { type: "vat", status: "approved" },
        ],
        issues: [],
        verifiedAt: new Date().toISOString(),
      };
      const req = new NextRequest("http://localhost/api/souq/seller-central/kyc/status");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe("verified");
      expect(data.documents).toHaveLength(2);
    });

    it("should return rejected status with issues", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockKYCStatus = {
        status: "rejected",
        documents: [
          { type: "cr", status: "rejected" },
        ],
        issues: ["Invalid CR document", "Expired registration"],
        rejectedAt: new Date().toISOString(),
      };
      const req = new NextRequest("http://localhost/api/souq/seller-central/kyc/status");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe("rejected");
      expect(data.issues).toHaveLength(2);
    });
  });
});
