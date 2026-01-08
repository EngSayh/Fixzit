/**
 * @fileoverview Tests for /api/souq/sellers/[id]/dashboard route
 * @description Seller dashboard metrics and statistics
 * @sprint 72
 * @coverage
 * - GET /api/souq/sellers/[id]/dashboard - Get seller dashboard stats
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
  subRole?: string;
  isSuperAdmin?: boolean;
} | null;

let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockSeller: Record<string, unknown> | null = null;
let mockIsValidObjectId = true;
let mockCountListings = 0;
let mockActiveListings = 0;
let mockCountOrders = 0;
let mockRecentOrders = 0;
let mockTotalRevenue: unknown[] = [];
let mockRecentRevenue: unknown[] = [];
let mockAverageRating: unknown[] = [];
let mockProductIds: string[] = [];
let mockTotalReviews = 0;
let mockPendingReviews = 0;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("mongoose", () => ({
  default: {
    isValidObjectId: vi.fn(() => mockIsValidObjectId),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// RBAC mock
vi.mock("@/lib/rbac/client-roles", () => ({
  Role: {
    SUPER_ADMIN: "SUPER_ADMIN",
    CORPORATE_ADMIN: "CORPORATE_ADMIN",
    CORPORATE_OWNER: "CORPORATE_OWNER",
    ADMIN: "ADMIN",
    TEAM_MEMBER: "TEAM_MEMBER",
    USER: "USER",
  },
  SubRole: {
    OPERATIONS_MANAGER: "OPERATIONS_MANAGER",
    SUPPORT_AGENT: "SUPPORT_AGENT",
  },
  normalizeRole: vi.fn((role) => role),
  normalizeSubRole: vi.fn((subRole) => subRole),
  inferSubRoleFromRole: vi.fn(() => null),
}));

// Mock Seller model
vi.mock("@/server/models/souq/Seller", () => ({
  SouqSeller: {
    findOne: vi.fn(async () => mockSeller),
  },
}));

// Mock Listing model
vi.mock("@/server/models/souq/Listing", () => ({
  SouqListing: {
    countDocuments: vi.fn((query) => {
      if (query.status === "active") return Promise.resolve(mockActiveListings);
      return Promise.resolve(mockCountListings);
    }),
    distinct: vi.fn(async () => mockProductIds),
  },
}));

// Mock Order model
vi.mock("@/server/models/souq/Order", () => ({
  SouqOrder: {
    countDocuments: vi.fn((query) => {
      if (query.createdAt) return Promise.resolve(mockRecentOrders);
      return Promise.resolve(mockCountOrders);
    }),
    aggregate: vi.fn((pipeline) => {
      // Check for recent revenue (has createdAt match)
      const matchStage = pipeline.find((s: Record<string, unknown>) => s.$match);
      if (matchStage?.$match?.createdAt) {
        return Promise.resolve(mockRecentRevenue);
      }
      return Promise.resolve(mockTotalRevenue);
    }),
  },
}));

// Mock Review model
vi.mock("@/server/models/souq/Review", () => ({
  SouqReview: {
    countDocuments: vi.fn((query) => {
      if (query.sellerResponse) return Promise.resolve(mockPendingReviews);
      return Promise.resolve(mockTotalReviews);
    }),
    aggregate: vi.fn(async () => mockAverageRating),
  },
}));

// Import route after mocks
import { GET } from "@/app/api/souq/sellers/[id]/dashboard/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Sellers Dashboard API", () => {
  const validOrgId = "507f1f77bcf86cd799439011";
  const validSellerId = "507f1f77bcf86cd799439012";
  const validUserId = "507f1f77bcf86cd799439013";

  const createDefaultSeller = () => ({
    _id: validSellerId,
    userId: validUserId,
    orgId: validOrgId,
    accountHealth: {
      score: 85,
      status: "healthy",
      orderDefectRate: 0.01,
      lateShipmentRate: 0.02,
      cancellationRate: 0.01,
      validTrackingRate: 0.98,
      onTimeDeliveryRate: 0.95,
      lastCalculated: new Date().toISOString(),
    },
    tier: "GOLD",
    kycStatus: "verified",
    isActive: true,
    isSuspended: false,
    violations: [],
    features: { freeShipping: true },
  });

  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockSeller = null;
    mockIsValidObjectId = true;
    mockCountListings = 0;
    mockActiveListings = 0;
    mockCountOrders = 0;
    mockRecentOrders = 0;
    mockTotalRevenue = [];
    mockRecentRevenue = [];
    mockAverageRating = [];
    mockProductIds = [];
    mockTotalReviews = 0;
    mockPendingReviews = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (
    sellerId: string,
    queryParams?: Record<string, string>
  ) => {
    const url = new URL(
      `http://localhost/api/souq/sellers/${sellerId}/dashboard`
    );
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return new NextRequest(url.toString(), { method: "GET" });
  };

  const createContext = (sellerId: string) => ({
    params: { id: sellerId },
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

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(429);
    });

    it("returns 401 for unauthenticated user", async () => {
      mockSession = null;

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 for invalid seller ID format", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "ADMIN" },
      };
      mockIsValidObjectId = false;

      const req = createRequest("invalid-id");
      const ctx = createContext("invalid-id");
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid seller ID");
    });

    it("returns 403 when orgId is missing for non-super admin", async () => {
      mockSession = {
        user: { id: validUserId, role: "ADMIN" },
      };

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Organization context required");
    });

    it("returns 400 when super admin lacks targetOrgId", async () => {
      mockSession = {
        user: { id: validUserId, role: "SUPER_ADMIN", isSuperAdmin: true },
      };

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("targetOrgId is required");
    });

    it("returns 404 when seller not found", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "ADMIN" },
      };
      mockSeller = null;

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Seller not found");
    });

    it("returns 403 when user is not seller owner and not admin", async () => {
      const otherUserId = "507f1f77bcf86cd799439099";
      mockSession = {
        user: { id: otherUserId, orgId: validOrgId, role: "USER" },
      };
      mockSeller = createDefaultSeller();

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });
  });

  // ==========================================================================
  // Successful Dashboard Access
  // ==========================================================================
  describe("Successful Dashboard Access", () => {
    it("allows seller owner to access their dashboard", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSeller = createDefaultSeller();
      mockCountListings = 10;
      mockActiveListings = 8;
      mockCountOrders = 50;
      mockRecentOrders = 12;
      mockTotalRevenue = [{ total: 5000 }];
      mockRecentRevenue = [{ total: 1200 }];
      mockAverageRating = [{ avgRating: 4.5 }];
      mockProductIds = ["prod1", "prod2"];
      mockTotalReviews = 25;
      mockPendingReviews = 3;

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.listings.total).toBe(10);
      expect(data.data.listings.active).toBe(8);
      expect(data.data.orders.total).toBe(50);
      expect(data.data.revenue.total).toBe(5000);
      expect(data.data.reviews.averageRating).toBe(4.5);
      expect(data.data.tier).toBe("GOLD");
    });

    it("allows admin to access seller dashboard", async () => {
      mockSession = {
        user: { id: "adminUserId123", orgId: validOrgId, role: "ADMIN" },
      };
      mockSeller = createDefaultSeller();
      mockCountListings = 5;
      mockActiveListings = 5;

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("allows super admin with targetOrgId", async () => {
      mockSession = {
        user: { id: "superAdminId", role: "SUPER_ADMIN", isSuperAdmin: true },
      };
      mockSeller = createDefaultSeller();

      const req = createRequest(validSellerId, { targetOrgId: validOrgId });
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("returns zero stats when no data exists", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSeller = createDefaultSeller();
      mockCountListings = 0;
      mockActiveListings = 0;
      mockCountOrders = 0;
      mockRecentOrders = 0;
      mockTotalRevenue = [];
      mockRecentRevenue = [];
      mockAverageRating = [];
      mockProductIds = [];
      mockTotalReviews = 0;
      mockPendingReviews = 0;

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.listings.total).toBe(0);
      expect(data.data.orders.total).toBe(0);
      expect(data.data.revenue.total).toBe(0);
      expect(data.data.reviews.averageRating).toBe(0);
    });

    it("includes account health metrics in response", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSeller = createDefaultSeller();

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.accountHealth).toBeDefined();
      expect(data.data.accountHealth.score).toBe(85);
      expect(data.data.accountHealth.status).toBe("healthy");
      expect(data.data.accountHealth.orderDefectRate).toBe(0.01);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe("Edge Cases", () => {
    it("handles missing revenue aggregation gracefully", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSeller = createDefaultSeller();
      mockTotalRevenue = [];
      mockRecentRevenue = [];

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.revenue.total).toBe(0);
      expect(data.data.revenue.recent).toBe(0);
    });

    it("handles missing average rating gracefully", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSeller = createDefaultSeller();
      mockAverageRating = [];

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.reviews.averageRating).toBe(0);
    });

    it("calculates growth percentage correctly", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSeller = createDefaultSeller();
      mockCountOrders = 100;
      mockRecentOrders = 25;

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.orders.growth).toBe("25.0");
    });

    it("handles zero total orders for growth calculation", async () => {
      mockSession = {
        user: { id: validUserId, orgId: validOrgId, role: "VENDOR" },
      };
      mockSeller = createDefaultSeller();
      mockCountOrders = 0;
      mockRecentOrders = 0;

      const req = createRequest(validSellerId);
      const ctx = createContext(validSellerId);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.orders.growth).toBe("0.0");
    });
  });
});
