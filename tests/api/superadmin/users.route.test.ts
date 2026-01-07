/**
 * @fileoverview Tests for SuperAdmin Users List API
 * @module tests/api/superadmin/users.route.test
 * 
 * Tests GET /api/superadmin/users with pagination, filters, and search.
 * [AGENT-0007] Created as part of superadmin users improvement initiative.
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Use vi.hoisted() to make mocks available in vi.mock() factory
const { mockGetSuperadminSession, mockUserAggregate, mockUserCountDocuments } = vi.hoisted(() => {
  const usersWithOrgs = [
    {
      _id: "user_1",
      email: "john@acme.com",
      status: "ACTIVE",
      professional: { role: "ADMIN" },
      personal: { firstName: "John", lastName: "Doe" },
      orgId: "org_1",
      orgName: "Acme Corp",
      createdAt: new Date("2025-01-01"),
    },
    {
      _id: "user_2",
      email: "jane@beta.com",
      status: "ACTIVE",
      professional: { role: "STAFF" },
      personal: { firstName: "Jane", lastName: "Smith" },
      orgId: "org_2",
      orgName: "Beta Inc",
      createdAt: new Date("2025-01-02"),
    },
  ];
  
  const userAggregateMock = vi.fn().mockReturnValue({
    exec: vi.fn().mockResolvedValue(usersWithOrgs),
  });
  
  const userCountMock = vi.fn().mockReturnValue({
    exec: vi.fn().mockResolvedValue(2),
  });
  
  return {
    mockGetSuperadminSession: vi.fn(),
    mockUserAggregate: userAggregateMock,
    mockUserCountDocuments: userCountMock,
  };
});

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: (...args: unknown[]) => mockGetSuperadminSession(...args),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    aggregate: mockUserAggregate,
    countDocuments: mockUserCountDocuments,
  },
}));

vi.mock("mongoose", () => ({
  default: {
    Types: {
      ObjectId: Object.assign(
        vi.fn((id?: string) => id ?? "mock-id"),
        { isValid: vi.fn(() => true) },
      ),
    },
    isValidObjectId: vi.fn(() => true),
  },
  Types: {
    ObjectId: Object.assign(
      vi.fn((id?: string) => id ?? "mock-id"),
      { isValid: vi.fn(() => true) },
    ),
  },
  isValidObjectId: vi.fn(() => true),
}));

// Import route after all mocks are set up
import { GET } from "@/app/api/superadmin/users/route";

function createRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/users");
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url, { method: "GET" });
}

describe("SuperAdmin Users List API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSuperadminSession.mockReset();
    mockUserAggregate.mockReset();
    mockUserCountDocuments.mockReset();
  });
  
  // Note: vi.resetModules() removed - can cause cross-suite side effects

  describe("GET /api/superadmin/users", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("should return users list when authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(Array.isArray(data.users)).toBe(true);
    });

    it("should return pagination metadata", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest({ page: "1", limit: "10" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
      expect(typeof data.pagination.total).toBe("number");
      expect(typeof data.pagination.totalPages).toBe("number");
    });

    it("should apply status filter", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest({ status: "ACTIVE" });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockUserAggregate).toHaveBeenCalled();
    });

    it("should apply organization filter", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest({ orgId: "507f1f77bcf86cd799439011" });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockUserAggregate).toHaveBeenCalled();
    });

    it("should apply search filter", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest({ search: "john" });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockUserAggregate).toHaveBeenCalled();
    });

    it("should escape regex special characters in search (SEC-001)", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      // This should not cause ReDoS - special chars should be escaped
      const request = createRequest({ search: "test.*+?^${}()|[]\\dangerous" });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should apply role filter", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest({ role: "ADMIN" });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockUserAggregate).toHaveBeenCalled();
    });

    it("should apply sorting", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest({ sortBy: "email", sortOrder: "asc" });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should return 400 for limit exceeding MAX_LIMIT", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      // Request more than MAX_LIMIT (100) - Zod validation rejects this
      const request = createRequest({ limit: "500" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should return 400 for invalid query parameters", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest({ status: "INVALID_STATUS" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should enhance users with organization names", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Users should have orgName field populated
      expect(data.users.length).toBeGreaterThan(0);
      expect(data.users[0].orgId).toBeDefined();
      expect(data.users[0]).toHaveProperty("orgName");
    });
  });
});
