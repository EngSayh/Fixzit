/**
 * @fileoverview Tests for /api/souq/repricer/analysis/[fsin] route
 * @description Competitor price analysis for repricer
 * @sprint 73
 * @coverage
 * - GET /api/souq/repricer/analysis/[fsin] - Get competitor analysis
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
let mockAnalysisResult: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/auto-repricer-service", () => ({
  AutoRepricerService: {
    getCompetitorAnalysis: vi.fn(async () => mockAnalysisResult),
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
import { GET } from "@/app/api/souq/repricer/analysis/[fsin]/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Repricer Analysis API", () => {
  const validOrgId = "507f1f77bcf86cd799439011";
  const validUserId = "507f1f77bcf86cd799439012";
  const validFsin = "FSIN-12345-ABCDE";

  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockAnalysisResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (fsin: string) => {
    return new NextRequest(
      `http://localhost/api/souq/repricer/analysis/${fsin}`,
      { method: "GET" }
    );
  };

  const createContext = (fsin: string) => ({
    params: Promise.resolve({ fsin }),
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

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(429);
    });

    it("returns 401 for unauthenticated user", async () => {
      mockSession = null;

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when orgId is missing", async () => {
      mockSession = {
        user: { id: validUserId, role: "VENDOR" },
      };

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Organization context required");
    });

    it("returns 400 when FSIN is missing", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };

      const req = createRequest("");
      const ctx = createContext("");
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("FSIN is required");
    });
  });

  // ==========================================================================
  // Successful Analysis
  // ==========================================================================
  describe("Successful Analysis", () => {
    it("returns competitor analysis successfully", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockAnalysisResult = {
        fsin: validFsin,
        competitorPrices: [99.99, 105.00, 110.50],
        marketAverage: 105.16,
        lowestPrice: 99.99,
        highestPrice: 110.50,
        recommendedPrice: 104.99,
        pricePosition: "competitive",
        competitorCount: 3,
      };

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.fsin).toBe(validFsin);
      expect(data.analysis.competitorCount).toBe(3);
    });

    it("returns empty analysis when no competitors", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockAnalysisResult = {
        fsin: validFsin,
        competitorPrices: [],
        marketAverage: 0,
        lowestPrice: null,
        highestPrice: null,
        recommendedPrice: null,
        pricePosition: "no_data",
        competitorCount: 0,
      };

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.analysis.competitorCount).toBe(0);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe("Error Handling", () => {
    it("handles service errors gracefully", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      
      // Simulate service throwing error
      const { AutoRepricerService } = await import(
        "@/services/souq/auto-repricer-service"
      );
      vi.mocked(AutoRepricerService.getCompetitorAnalysis).mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Failed to get competitor analysis");
    });
  });
});
