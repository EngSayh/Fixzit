/**
 * @fileoverview Tests for /api/souq/returns/eligibility/[orderId]/[listingId] route
 * @description Return eligibility check for order items
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockEligibility: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    checkEligibility: vi.fn(async () => mockEligibility),
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
import { GET } from "@/app/api/souq/returns/eligibility/[orderId]/[listingId]/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Returns Eligibility API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockEligibility = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (orderId: string, listingId: string) => {
    return new NextRequest(`http://localhost/api/souq/returns/eligibility/${orderId}/${listingId}`);
  };

  const createContext = (orderId: string, listingId: string) => ({
    params: { orderId, listingId },
  });

  describe("GET /api/souq/returns/eligibility/[orderId]/[listingId]", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = createRequest("ORD-001", "LST-001");
      const res = await GET(req, createContext("ORD-001", "LST-001"));
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = createRequest("ORD-001", "LST-001");
      const res = await GET(req, createContext("ORD-001", "LST-001"));
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "customer" } };
      const req = createRequest("ORD-001", "LST-001");
      const res = await GET(req, createContext("ORD-001", "LST-001"));
      expect(res.status).toBe(403);
    });

    it("should return eligible for valid return window", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockEligibility = {
        eligible: true,
        reason: null,
        returnWindow: 15,
        daysRemaining: 10,
        policy: "standard",
      };
      const req = createRequest("ORD-001", "LST-001");
      const res = await GET(req, createContext("ORD-001", "LST-001"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.eligible).toBe(true);
      expect(data.daysRemaining).toBe(10);
    });

    it("should return not eligible for expired window", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockEligibility = {
        eligible: false,
        reason: "Return window expired",
        returnWindow: 15,
        daysRemaining: 0,
        policy: "standard",
      };
      const req = createRequest("ORD-002", "LST-002");
      const res = await GET(req, createContext("ORD-002", "LST-002"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.eligible).toBe(false);
      expect(data.reason).toBe("Return window expired");
    });

    it("should return not eligible for non-returnable items", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockEligibility = {
        eligible: false,
        reason: "Item is marked as non-returnable",
        returnWindow: 0,
        daysRemaining: 0,
        policy: "non-returnable",
      };
      const req = createRequest("ORD-003", "LST-003");
      const res = await GET(req, createContext("ORD-003", "LST-003"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.eligible).toBe(false);
      expect(data.policy).toBe("non-returnable");
    });
  });
});
