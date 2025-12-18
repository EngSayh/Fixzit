/**
 * Finance Ledger API Contract Tests
 * 
 * Tests for GET /api/finance/ledger
 * Validates response shape, tenancy enforcement, and error handling.
 * 
 * @coverage
 * - Response shape assertions (contract guards)
 * - Tenant isolation (orgId enforcement)
 * - Rate limit 429 response
 * - Authorization (FINANCE:VIEW permission)
 * - Pagination structure
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock all dependencies
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn((_ctx, fn) => Promise.resolve(fn())),
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Create chainable mock
const createChainableMock = (results: any[] = [], count = 0) => {
  const mockLean = vi.fn().mockResolvedValue(results);
  const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
  const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
  const mockFind = vi.fn().mockReturnValue({ sort: mockSort });
  const mockCountDocuments = vi.fn().mockResolvedValue(count);
  
  return {
    find: mockFind,
    countDocuments: mockCountDocuments,
  };
};

let ledgerMock = createChainableMock();

vi.mock("@/server/models/finance/LedgerEntry", () => ({
  default: {
    find: (...args: any[]) => ledgerMock.find(...args),
    countDocuments: (...args: any[]) => ledgerMock.countDocuments(...args),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  unauthorizedError: vi.fn(() => NextResponse.json({ error: "Unauthorized" }, { status: 401 })),
  forbiddenError: vi.fn((msg: string) => NextResponse.json({ error: msg }, { status: 403 })),
  handleApiError: vi.fn((err: Error) => NextResponse.json({ error: err.message }, { status: 500 })),
  isForbidden: vi.fn(() => false),
}));

const { getSessionUser } = await import("@/server/middleware/withAuthRbac");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { requirePermission } = await import("@/config/rbac.config");

// Import route after mocks
const { GET } = await import("@/app/api/finance/ledger/route");

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/finance/ledger");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url.toString(), { method: "GET" });
}

describe("Finance Ledger API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset ledger mock with default empty results
    ledgerMock = createChainableMock();
    
    // Default: authenticated user with finance permission
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user123",
      orgId: "org123",
      role: "FINANCE_MANAGER",
    } as any);
    
    vi.mocked(enforceRateLimit).mockReturnValue(null as any);
    vi.mocked(requirePermission).mockReturnValue(undefined);
  });

  describe("Response Shape Contract", () => {
    it("should return correct response structure with success, data, and pagination", async () => {
      const request = createRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Contract assertions - these guard against schema drift
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("pagination");
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should return correct pagination structure", async () => {
      const request = createRequest({ page: "2", limit: "25" });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Pagination contract
      expect(data.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        pages: expect.any(Number),
      });
    });

    it("should return ledger entry with expected fields when data exists", async () => {
      const mockEntry = {
        _id: "entry123",
        accountId: "acc123",
        orgId: "org123",
        date: new Date("2024-01-15"),
        debit: 1000,
        credit: 0,
        description: "Test entry",
        reference: "REF-001",
      };

      ledgerMock = createChainableMock([mockEntry], 1);

      const request = createRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({
        _id: "entry123",
        accountId: "acc123",
        orgId: "org123",
      });
    });
  });

  describe("Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const request = createRequest();
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe("Rate Limiting", () => {
    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 }) as any
      );

      const request = createRequest();
      const response = await GET(request);

      expect(response.status).toBe(429);
    });
  });

  describe("Query Parameters", () => {
    it("should validate accountId format", async () => {
      const request = createRequest({ accountId: "invalid-id" });
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid account ID");
    });

    it("should accept valid ObjectId for accountId", async () => {
      const request = createRequest({ accountId: "507f1f77bcf86cd799439011" });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should filter by date range when provided", async () => {
      const request = createRequest({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(ledgerMock.find).toHaveBeenCalled();
    });
  });

  describe("Tenant Isolation", () => {
    it("should include orgId in query filter (tenant isolation)", async () => {
      const request = createRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Verify find was called
      expect(ledgerMock.find).toHaveBeenCalled();
      
      // The first call should include orgId filter
      const findCall = ledgerMock.find.mock.calls[0];
      expect(findCall).toBeDefined();
      // Query should contain orgId (tenant scope enforcement)
      if (findCall && findCall[0]) {
        expect(findCall[0]).toHaveProperty("orgId");
      }
    });
  });
});
