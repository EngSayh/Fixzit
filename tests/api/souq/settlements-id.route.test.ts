/**
 * @fileoverview Tests for /api/souq/settlements/[id] route
 * @description Settlement details retrieval
 * @sprint 73
 * @coverage
 * - GET /api/souq/settlements/[id] - Get settlement statement details
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = {
  id: string;
  orgId?: string;
  role?: string;
} | null;

let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockSettlement: Record<string, unknown> | null = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/server/models/souq/Settlement", () => ({
  SouqSettlement: {
    findOne: vi.fn(() => ({
      lean: vi.fn(async () => mockSettlement),
    })),
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
import { GET } from "@/app/api/souq/settlements/[id]/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Settlements [id] API", () => {
  const validOrgId = "507f1f77bcf86cd799439011";
  const validUserId = "507f1f77bcf86cd799439012";
  const validSettlementId = "SETTLE-2026-001";

  const createDefaultSettlement = () => ({
    _id: "507f1f77bcf86cd799439099",
    settlementId: validSettlementId,
    sellerId: validUserId,
    orgId: validOrgId,
    amount: 5000.00,
    currency: "SAR",
    status: "completed",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-07",
    itemCount: 25,
    createdAt: new Date().toISOString(),
  });

  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockSettlement = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (settlementId: string) => {
    return new NextRequest(
      `http://localhost/api/souq/settlements/${settlementId}`,
      { method: "GET" }
    );
  };

  const createContext = (settlementId: string) => ({
    params: { id: settlementId },
  });

  // ==========================================================================
  // Authentication & Authorization
  // ==========================================================================
  describe("Authentication & Authorization", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(429);
    });

    it("returns 401 for unauthenticated user", async () => {
      mockSession = null;

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when settlement ID is missing", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };

      const req = createRequest("");
      const ctx = createContext("");
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Settlement ID required");
    });

    it("returns 404 when settlement not found", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSettlement = null;

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("Settlement statement not found");
    });

    it("returns 404 for cross-tenant access (non-owner, non-admin)", async () => {
      const otherUserId = "507f1f77bcf86cd799439999";
      mockSession = {
        user: { id: otherUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSettlement = createDefaultSettlement();

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("Settlement statement not found");
    });
  });

  // ==========================================================================
  // Successful Settlement Retrieval
  // ==========================================================================
  describe("Successful Settlement Retrieval", () => {
    it("allows seller to view their own settlement", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSettlement = createDefaultSettlement();

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.statement).toBeDefined();
      expect(data.statement.settlementId).toBe(validSettlementId);
      expect(data.statement.amount).toBe(5000.00);
    });

    it("allows admin to view any settlement", async () => {
      const adminId = "507f1f77bcf86cd799430000";
      mockSession = {
        user: { id: adminId, orgId: validOrgId, role: "ADMIN" },
      };
      mockSettlement = createDefaultSettlement();

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.statement).toBeDefined();
    });

    it("allows SUPER_ADMIN to view any settlement", async () => {
      const superAdminId = "507f1f77bcf86cd799430001";
      mockSession = {
        user: { id: superAdminId, orgId: validOrgId, role: "SUPER_ADMIN" },
      };
      mockSettlement = createDefaultSettlement();

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.statement).toBeDefined();
    });

    it("allows FINANCE role to view any settlement", async () => {
      const financeId = "507f1f77bcf86cd799430002";
      mockSession = {
        user: { id: financeId, orgId: validOrgId, role: "FINANCE" },
      };
      mockSettlement = createDefaultSettlement();

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.statement).toBeDefined();
    });

    it("allows FINANCE_OFFICER role to view any settlement", async () => {
      const financeOfficerId = "507f1f77bcf86cd799430003";
      mockSession = {
        user: { id: financeOfficerId, orgId: validOrgId, role: "FINANCE_OFFICER" },
      };
      mockSettlement = createDefaultSettlement();

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.statement).toBeDefined();
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe("Error Handling", () => {
    it("handles database errors gracefully", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };

      const { SouqSettlement } = await import(
        "@/server/models/souq/Settlement"
      );
      vi.mocked(SouqSettlement.findOne).mockReturnValueOnce({
        lean: vi.fn().mockRejectedValueOnce(new Error("Database error")),
      } as unknown as ReturnType<typeof SouqSettlement.findOne>);

      const req = createRequest(validSettlementId);
      const ctx = createContext(validSettlementId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Failed to fetch settlement");
    });
  });
});
