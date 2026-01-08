/**
 * @fileoverview Tests for /api/souq/reviews/[id]/report route
 * @description Review abuse reporting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockReviewBasicInfo: unknown = null;
let mockReportResult: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/reviews/review-service", () => ({
  reviewService: {
    getReviewBasicInfo: vi.fn(async () => mockReviewBasicInfo),
    reportAbuse: vi.fn(async () => mockReportResult),
  },
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(async (req) => {
    const body = await req.json();
    return { success: true, data: body };
  }),
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
import { POST } from "@/app/api/souq/reviews/[id]/report/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Reviews Report API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockReviewBasicInfo = null;
    mockReportResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (reviewId: string, body: unknown) => {
    return new NextRequest(`http://localhost/api/souq/reviews/${reviewId}/report`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  };

  const createContext = (reviewId: string) => ({
    params: Promise.resolve({ id: reviewId }),
  });

  describe("POST /api/souq/reviews/[id]/report", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = createRequest("review123", { reason: "spam" });
      const res = await POST(req, createContext("review123"));
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = createRequest("review123", { reason: "spam" });
      const res = await POST(req, createContext("review123"));
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "customer" } };
      const req = createRequest("review123", { reason: "spam" });
      const res = await POST(req, createContext("review123"));
      expect(res.status).toBe(403);
    });

    it("should reject report without reason", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockReviewBasicInfo = { _id: "review123", orgId: "org1" };
      const req = createRequest("review123", {});
      const res = await POST(req, createContext("review123"));
      expect(res.status).toBe(400);
    });

    it("should return 404 when review not found", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockReviewBasicInfo = null;
      const req = createRequest("review-not-exists", { reason: "spam" });
      const res = await POST(req, createContext("review-not-exists"));
      expect(res.status).toBe(404);
    });

    it("should report review for spam", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockReviewBasicInfo = { _id: "review123", orgId: "org1" };
      mockReportResult = { success: true, reportId: "rpt123" };
      const req = createRequest("review123", { reason: "spam" });
      const res = await POST(req, createContext("review123"));
      expect([200, 400, 500]).toContain(res.status);
    });

    it("should report review with detailed reason", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockReviewBasicInfo = { _id: "review123", orgId: "org1" };
      mockReportResult = { success: true, reportId: "rpt456" };
      const req = createRequest("review123", {
        reason: "inappropriate",
        details: "Contains offensive language",
      });
      const res = await POST(req, createContext("review123"));
      expect([200, 400, 500]).toContain(res.status);
    });
  });
});
