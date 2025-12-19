/**
 * @fileoverview Tests for /api/souq/reviews routes
 * Tests product review listing and creation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: SessionUser | null = null;

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock review service
vi.mock("@/services/souq/reviews/review-service", () => ({
  reviewService: {
    listReviews: vi.fn(),
    submitReview: vi.fn(),
    getProductStats: vi.fn(),
  },
}));

// Mock SouqReview model
vi.mock("@/server/models/souq/Review", () => ({
  SouqReview: {
    find: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { reviewService } from "@/services/souq/reviews/review-service";
import type { SessionUser } from "@/types/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/souq/reviews/route");
  } catch {
    return null;
  }
};

describe("API /api/souq/reviews", () => {
  const mockOrgId = "org_123456789";
  const mockUser: SessionUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "TEAM_MEMBER",
    subRole: null,
    email: "buyer@test.com",
    isSuperAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    sessionUser = mockUser;
    vi.mocked(reviewService.listReviews).mockResolvedValue({
      reviews: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    });
    vi.mocked(reviewService.submitReview).mockResolvedValue({
      _id: "review_123",
      productId: "product_123",
      rating: 5,
      title: "Great product",
      content: "Very satisfied with purchase",
      status: "pending",
    });
  });

  describe("GET /api/souq/reviews", () => {
    it("should return reviews list", async () => {
      vi.mocked(reviewService.listReviews).mockResolvedValue({
        reviews: [
          {
            _id: "review_1",
            rating: 5,
            title: "Excellent",
            status: "published",
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/souq/reviews");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(200);
    });

    it("should support rating filter", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest(
        "http://localhost/api/souq/reviews?rating=5"
      );
      const response = await routeModule.GET(request);
      expect(response.status).toBe(200);
    });

    it("should support status filter", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest(
        "http://localhost/api/souq/reviews?status=published"
      );
      const response = await routeModule.GET(request);
      expect(response.status).toBe(200);
    });

    it("should support verifiedOnly filter", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest(
        "http://localhost/api/souq/reviews?verifiedOnly=true"
      );
      const response = await routeModule.GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/souq/reviews", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/souq/reviews", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when orgId is missing", async () => {
      sessionUser = { ...mockUser, orgId: undefined };
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/souq/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId: "product_123",
          rating: 5,
          title: "Great",
          content: "Very good product",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 400 for invalid request body", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/souq/reviews", {
        method: "POST",
        body: JSON.stringify({ invalidField: true }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(400);
    });

    it("should create review with valid data", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const validReviewData = {
        productId: "product_123",
        rating: 5,
        title: "Excellent product",
        content: "Very satisfied with this purchase. Highly recommend!",
      };

      const request = new NextRequest("http://localhost/api/souq/reviews", {
        method: "POST",
        body: JSON.stringify(validReviewData),
        headers: { "Content-Type": "application/json" },
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(201);
    });

    it("should enforce rate limiting on POST", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
        }) as unknown as null
      );
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/souq/reviews", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(429);
    });
  });
});
