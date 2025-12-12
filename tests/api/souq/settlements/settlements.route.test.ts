/**
 * @fileoverview Tests for Souq Settlements API
 * @description Comprehensive tests for seller settlement endpoints with RBAC
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Mock services
const mockFindSettlements = vi.fn();
const mockFindOneSettlement = vi.fn();
const mockCreateSettlement = vi.fn();
const mockCountDocuments = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/souq/Settlement", () => ({
  SouqSettlement: {
    find: () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => mockFindSettlements(),
          }),
        }),
      }),
    }),
    findById: (id: string) => ({
      lean: () => mockFindOneSettlement(id),
    }),
    create: (data: unknown) => mockCreateSettlement(data),
    countDocuments: (query: unknown) => mockCountDocuments(query),
  },
}));

vi.mock("@/server/models/AgentAuditLog", () => ({
  AgentAuditLog: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import routes after mocks
import { GET } from "@/app/api/souq/settlements/route";

const makeRequest = (url: string, method = "GET"): NextRequest =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;

describe("Souq Settlements API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindSettlements.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
  });

  describe("GET /api/souq/settlements", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeRequest("https://example.com/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 401 when session has no user", async () => {
      mockAuth.mockResolvedValue({ user: null });

      const req = makeRequest("https://example.com/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns settlements for authenticated vendor", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "seller_123",
          orgId: "org_456",
          role: "VENDOR",
        },
      });
      mockFindSettlements.mockResolvedValue([
        {
          _id: "settlement_1",
          sellerId: "seller_123",
          amount: 1000,
          status: "pending",
        },
      ]);
      mockCountDocuments.mockResolvedValue(1);

      const req = makeRequest("https://example.com/api/souq/settlements?sellerId=seller_123");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
    });

    it("filters by status when provided", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "seller_123",
          orgId: "org_456",
          role: "VENDOR",
        },
      });
      mockFindSettlements.mockResolvedValue([]);

      const req = makeRequest("https://example.com/api/souq/settlements?sellerId=seller_123&status=completed");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("allows SUPER_ADMIN to query any org with targetOrgId", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "admin_1",
          orgId: "admin_org",
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
        },
      });
      mockFindSettlements.mockResolvedValue([]);

      const req = makeRequest("https://example.com/api/souq/settlements?sellerId=seller_123&targetOrgId=other_org");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("requires targetOrgId for SUPER_ADMIN without orgId", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "admin_1",
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
          // No orgId
        },
      });

      const req = makeRequest("https://example.com/api/souq/settlements?sellerId=seller_123");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("targetOrgId");
    });

    it("returns empty array when no settlements exist", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "seller_new",
          orgId: "org_789",
          role: "VENDOR",
        },
      });
      mockFindSettlements.mockResolvedValue([]);
      mockCountDocuments.mockResolvedValue(0);

      const req = makeRequest("https://example.com/api/souq/settlements?sellerId=seller_new");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
      expect(json.pagination.total).toBe(0);
    });

    it("returns 400 when sellerId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "seller_123",
          orgId: "org_456",
          role: "VENDOR",
        },
      });

      const req = makeRequest("https://example.com/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Seller ID");
    });
  });
});
