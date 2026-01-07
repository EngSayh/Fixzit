/**
 * @fileoverview Tests for SuperAdmin Bulk Users Operations API
 * @module tests/api/superadmin/users-bulk.route.test
 * 
 * Tests POST /api/superadmin/users/bulk-delete and bulk-update
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
const { 
  mockGetSuperadminSession, 
  mockSmartRateLimit,
  mockUserFind,
  mockUserUpdateMany,
  mockAuditLogCreate,
} = vi.hoisted(() => {
  const users = [
    {
      _id: "507f1f77bcf86cd799439011",
      email: "john@acme.com",
      status: "ACTIVE",
      professional: { role: "ADMIN" },
      personal: { firstName: "John", lastName: "Doe" },
      orgId: "org_1",
      isSuperAdmin: false,
    },
    {
      _id: "507f1f77bcf86cd799439012",
      email: "jane@acme.com",
      status: "ACTIVE",
      professional: { role: "STAFF" },
      personal: { firstName: "Jane", lastName: "Smith" },
      orgId: "org_1",
      isSuperAdmin: false,
    },
  ];
  
  return {
    mockGetSuperadminSession: vi.fn(),
    mockSmartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    mockUserFind: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(users),
      }),
    }),
    mockUserUpdateMany: vi.fn().mockResolvedValue({ modifiedCount: 2 }),
    mockAuditLogCreate: vi.fn().mockResolvedValue({}),
  };
});

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: (...args: unknown[]) => mockGetSuperadminSession(...args),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    find: mockUserFind,
    updateMany: mockUserUpdateMany,
  },
}));

vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: {
    create: mockAuditLogCreate,
  },
}));

vi.mock("mongoose", () => ({
  default: {
    Types: {
      ObjectId: Object.assign(
        vi.fn((id?: string) => id ?? "mock-id"),
        { isValid: vi.fn((id: string) => /^[a-f\d]{24}$/i.test(id)) },
      ),
    },
    isValidObjectId: vi.fn((id: string) => /^[a-f\d]{24}$/i.test(id)),
  },
  Types: {
    ObjectId: Object.assign(
      vi.fn((id?: string) => id ?? "mock-id"),
      { isValid: vi.fn((id: string) => /^[a-f\d]{24}$/i.test(id)) },
    ),
  },
  isValidObjectId: vi.fn((id: string) => /^[a-f\d]{24}$/i.test(id)),
}));

// Import routes after all mocks are set up
import { POST as bulkDelete } from "@/app/api/superadmin/users/bulk-delete/route";
import { POST as bulkUpdate } from "@/app/api/superadmin/users/bulk-update/route";

const validUserIds = [
  "507f1f77bcf86cd799439011",
  "507f1f77bcf86cd799439012",
];

function createDeleteRequest(body: unknown): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/users/bulk-delete");
  return new NextRequest(url, { 
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createUpdateRequest(body: unknown): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/users/bulk-update");
  return new NextRequest(url, { 
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("SuperAdmin Bulk Users Operations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSuperadminSession.mockReset();
    mockSmartRateLimit.mockResolvedValue({ allowed: true });
  });
  
  afterAll(() => {
    vi.resetModules();
  });

  describe("POST /api/superadmin/users/bulk-delete", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const request = createDeleteRequest({ userIds: validUserIds });
      const response = await bulkDelete(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 429 when rate limited", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });
      mockSmartRateLimit.mockResolvedValueOnce({ allowed: false });

      const request = createDeleteRequest({ userIds: validUserIds });
      const response = await bulkDelete(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toMatch(/rate/i);
    });

    it("should return 400 when userIds is empty", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createDeleteRequest({ userIds: [] });
      const response = await bulkDelete(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should return 400 when userIds contains invalid IDs", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createDeleteRequest({ userIds: ["invalid-id"] });
      const response = await bulkDelete(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should prevent deletion of superadmin users", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });
      
      // Mock finding a superadmin user
      mockUserFind.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: "507f1f77bcf86cd799439011", isSuperAdmin: true, email: "super@admin.com", orgId: "507f1f77bcf86cd799439099" },
          ]),
        }),
      });

      const request = createDeleteRequest({ userIds: ["507f1f77bcf86cd799439011"] });
      const response = await bulkDelete(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/superadmin/i);
    });
  });

  describe("POST /api/superadmin/users/bulk-update", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const request = createUpdateRequest({ userIds: validUserIds, updates: { status: "SUSPENDED" } });
      const response = await bulkUpdate(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 429 when rate limited", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });
      mockSmartRateLimit.mockResolvedValueOnce({ allowed: false });

      const request = createUpdateRequest({ userIds: validUserIds, updates: { status: "SUSPENDED" } });
      const response = await bulkUpdate(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toMatch(/rate/i);
    });

    it("should return 400 when status is invalid", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createUpdateRequest({ userIds: validUserIds, updates: { status: "INVALID" } });
      const response = await bulkUpdate(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should prevent status update of superadmin users", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });
      
      // Mock finding a superadmin user
      mockUserFind.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: "507f1f77bcf86cd799439011", isSuperAdmin: true, email: "super@admin.com", orgId: "org_1" },
          ]),
        }),
      });

      const request = createUpdateRequest({ userIds: ["507f1f77bcf86cd799439011"], updates: { status: "SUSPENDED" } });
      const response = await bulkUpdate(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.toLowerCase()).toMatch(/superadmin/i);
    });
  });
});
