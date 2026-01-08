/**
 * @fileoverview Tests for /api/souq/reviews/[id] route
 * @description Review CRUD operations (GET/PUT/DELETE)
 * @sprint 72
 * @coverage
 * - GET /api/souq/reviews/[id] - Get review by ID
 * - PUT /api/souq/reviews/[id] - Update review
 * - DELETE /api/souq/reviews/[id] - Delete review
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = {
  id: string;
  orgId: string;
  role: string;
  isSuperAdmin?: boolean;
} | null;

let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockReviewBasicInfo: { orgId: string } | null = null;
let mockReviewById: unknown = null;
let mockUpdateResult: unknown = null;
let mockIsValidObjectId = true;

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
    getReviewById: vi.fn(async () => mockReviewById),
    updateReview: vi.fn(async () => mockUpdateResult),
    deleteReview: vi.fn(async () => ({ success: true })),
  },
}));

vi.mock("mongoose", () => ({
  default: {
    isValidObjectId: vi.fn(() => mockIsValidObjectId),
  },
}));

vi.mock("mongodb", () => ({
  ObjectId: {
    isValid: vi.fn(() => true),
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
import { GET, PUT, DELETE } from "@/app/api/souq/reviews/[id]/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Reviews [id] API", () => {
  const validOrgId = "507f1f77bcf86cd799439011";
  const validReviewId = "507f1f77bcf86cd799439012";
  const validUserId = "507f1f77bcf86cd799439013";

  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockReviewBasicInfo = null;
    mockReviewById = null;
    mockUpdateResult = null;
    mockIsValidObjectId = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (
    reviewId: string,
    method: "GET" | "PUT" | "DELETE" = "GET",
    body?: unknown,
    queryParams?: Record<string, string>
  ) => {
    const url = new URL(`http://localhost/api/souq/reviews/${reviewId}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return new NextRequest(url.toString(), {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  };

  const createContext = (reviewId: string) => ({
    params: Promise.resolve({ id: reviewId }),
  });

  // ==========================================================================
  // GET /api/souq/reviews/[id]
  // ==========================================================================
  describe("GET /api/souq/reviews/[id]", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = createRequest(validReviewId);
      const ctx = createContext(validReviewId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(429);
    });

    it("returns 400 for invalid review ID format", async () => {
      mockIsValidObjectId = false;

      const req = createRequest("invalid-id");
      const ctx = createContext("invalid-id");
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid review ID");
    });

    it("returns 400 when orgId is missing", async () => {
      mockSession = null;

      const req = createRequest(validReviewId);
      const ctx = createContext(validReviewId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Organization context required");
    });

    it("returns 404 when review not found", async () => {
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = null;

      const req = createRequest(validReviewId, "GET", undefined, { orgId: validOrgId });
      const ctx = createContext(validReviewId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Review not found");
    });

    it("returns 404 for cross-tenant access attempt", async () => {
      const differentOrgId = "507f1f77bcf86cd799439099";
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = { orgId: differentOrgId };

      const req = createRequest(validReviewId, "GET", undefined, { orgId: differentOrgId });
      const ctx = createContext(validReviewId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Review not found");
    });

    it("returns 403 for unpublished review accessed by non-owner", async () => {
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = { orgId: validOrgId };
      mockReviewById = {
        _id: validReviewId,
        status: "pending",
        customerId: "differentUser123",
        orgId: validOrgId,
      };

      const req = createRequest(validReviewId, "GET", undefined, { orgId: validOrgId });
      const ctx = createContext(validReviewId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });

    it("returns review successfully for published review", async () => {
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = { orgId: validOrgId };
      mockReviewById = {
        _id: validReviewId,
        title: "Great product",
        content: "Very satisfied with this purchase",
        rating: 5,
        status: "published",
        customerId: "anotherUser",
        orgId: validOrgId,
      };

      const req = createRequest(validReviewId, "GET", undefined, { orgId: validOrgId });
      const ctx = createContext(validReviewId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe("Great product");
      expect(data.rating).toBe(5);
    });

    it("allows owner to view their unpublished review", async () => {
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = { orgId: validOrgId };
      mockReviewById = {
        _id: validReviewId,
        title: "My review",
        status: "pending",
        customerId: validUserId,
        orgId: validOrgId,
      };

      const req = createRequest(validReviewId, "GET", undefined, { orgId: validOrgId });
      const ctx = createContext(validReviewId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe("My review");
    });
  });

  // ==========================================================================
  // PUT /api/souq/reviews/[id]
  // ==========================================================================
  describe("PUT /api/souq/reviews/[id]", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = createRequest(validReviewId, "PUT", { title: "Updated" });
      const ctx = createContext(validReviewId);
      const response = await PUT(req, ctx);

      expect(response.status).toBe(429);
    });

    it("returns 401 for unauthenticated user", async () => {
      mockSession = null;

      const req = createRequest(validReviewId, "PUT", { title: "Updated title" });
      const ctx = createContext(validReviewId);
      const response = await PUT(req, ctx);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when orgId is missing", async () => {
      mockSession = { user: { id: validUserId, orgId: "", role: "USER" } };

      const req = createRequest(validReviewId, "PUT", { title: "Updated" });
      const ctx = createContext(validReviewId);
      const response = await PUT(req, ctx);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Organization context required");
    });

    it("returns 404 when review not found", async () => {
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = null;

      const req = createRequest(validReviewId, "PUT", { title: "Updated" }, { orgId: validOrgId });
      const ctx = createContext(validReviewId);
      const response = await PUT(req, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Review not found");
    });

    it("returns 403 for cross-tenant update attempt", async () => {
      const differentOrgId = "507f1f77bcf86cd799439099";
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = { orgId: differentOrgId };

      const req = createRequest(validReviewId, "PUT", { title: "Updated" });
      const ctx = createContext(validReviewId);
      const response = await PUT(req, ctx);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });

    it("returns 400 for invalid update payload", async () => {
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = { orgId: validOrgId };

      // Empty object - no updates provided
      const req = createRequest(validReviewId, "PUT", {}, { orgId: validOrgId });
      const ctx = createContext(validReviewId);
      const response = await PUT(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
    });

    it("updates review successfully with valid payload", async () => {
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = { orgId: validOrgId };
      mockUpdateResult = {
        _id: validReviewId,
        title: "Updated title here",
        content: "Updated content with enough characters",
        rating: 4,
        updatedAt: new Date().toISOString(),
      };

      const req = createRequest(
        validReviewId,
        "PUT",
        { title: "Updated title here", content: "Updated content with enough characters" },
        { orgId: validOrgId }
      );
      const ctx = createContext(validReviewId);
      const response = await PUT(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe("Updated title here");
    });
  });

  // ==========================================================================
  // DELETE /api/souq/reviews/[id]
  // ==========================================================================
  describe("DELETE /api/souq/reviews/[id]", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = createRequest(validReviewId, "DELETE");
      const ctx = createContext(validReviewId);
      const response = await DELETE(req, ctx);

      expect(response.status).toBe(429);
    });

    it("returns 401 for unauthenticated user", async () => {
      mockSession = null;

      const req = createRequest(validReviewId, "DELETE");
      const ctx = createContext(validReviewId);
      const response = await DELETE(req, ctx);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when orgId is missing", async () => {
      mockSession = { user: { id: validUserId, orgId: "", role: "USER" } };

      const req = createRequest(validReviewId, "DELETE");
      const ctx = createContext(validReviewId);
      const response = await DELETE(req, ctx);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Organization context required");
    });

    it("returns 404 when review not found", async () => {
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = null;

      const req = createRequest(validReviewId, "DELETE", undefined, { orgId: validOrgId });
      const ctx = createContext(validReviewId);
      const response = await DELETE(req, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Review not found");
    });

    it("returns 403 for cross-tenant delete attempt", async () => {
      const differentOrgId = "507f1f77bcf86cd799439099";
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = { orgId: differentOrgId };

      const req = createRequest(validReviewId, "DELETE");
      const ctx = createContext(validReviewId);
      const response = await DELETE(req, ctx);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });

    it("deletes review successfully", async () => {
      mockSession = { user: { id: validUserId, orgId: validOrgId, role: "USER" } };
      mockReviewBasicInfo = { orgId: validOrgId };

      const req = createRequest(validReviewId, "DELETE", undefined, { orgId: validOrgId });
      const ctx = createContext(validReviewId);
      const response = await DELETE(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
