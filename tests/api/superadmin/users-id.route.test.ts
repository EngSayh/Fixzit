/**
 * @fileoverview Tests for SuperAdmin Single User API
 * @module tests/api/superadmin/users-id.route.test
 * 
 * Tests GET/PATCH/DELETE /api/superadmin/users/[id]
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
  mockUserFindById, 
  mockUserFindByIdAndUpdate,
  mockUserFindByIdAndDelete,
  mockOrgFindById 
} = vi.hoisted(() => {
  const mockUser = {
    _id: "507f1f77bcf86cd799439011",
    email: "john@acme.com",
    status: "ACTIVE",
    professional: { role: "ADMIN" },
    personal: { firstName: "John", lastName: "Doe" },
    employment: { orgId: "org_1" },
    createdAt: new Date("2025-01-01"),
    isSuperAdmin: false,
  };
  
  return {
    mockGetSuperadminSession: vi.fn(),
    mockUserFindById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockUser),
      }),
    }),
    mockUserFindByIdAndUpdate: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ ...mockUser, status: "SUSPENDED" }),
      }),
    }),
    mockUserFindByIdAndDelete: vi.fn().mockResolvedValue(mockUser),
    mockOrgFindById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "org_1", name: "Acme Corp" }),
      }),
    }),
  };
});

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: (...args: unknown[]) => mockGetSuperadminSession(...args),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findByIdAndDelete: mockUserFindByIdAndDelete,
  },
}));

vi.mock("@/server/models/Organization", () => ({
  Organization: {
    findById: mockOrgFindById,
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
    isValidObjectId: vi.fn((id: string) => /^[a-f\d]{24}$/i.test(id)),
  },
  Types: {
    ObjectId: Object.assign(
      vi.fn((id?: string) => id ?? "mock-id"),
      { isValid: vi.fn(() => true) },
    ),
  },
  isValidObjectId: vi.fn((id: string) => /^[a-f\d]{24}$/i.test(id)),
}));

// Import route after all mocks are set up
import { GET, PATCH, DELETE } from "@/app/api/superadmin/users/[id]/route";

const validUserId = "507f1f77bcf86cd799439011";

function createRequest(method: string, body?: unknown): NextRequest {
  const url = new URL(`http://localhost:3000/api/superadmin/users/${validUserId}`);
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, init);
}

function createParams(id: string = validUserId) {
  return { params: Promise.resolve({ id }) };
}

describe("SuperAdmin Single User API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSuperadminSession.mockReset();
  });
  
  afterAll(() => {
    vi.resetModules();
  });

  describe("GET /api/superadmin/users/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const request = createRequest("GET");
      const response = await GET(request, createParams());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("should return user details when authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest("GET");
      const response = await GET(request, createParams());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("john@acme.com");
    });

    it("should return 400 for invalid user ID format", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest("GET");
      const response = await GET(request, createParams("invalid-id"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid");
    });

    it("should return 404 when user not found", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });
      mockUserFindById.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      const request = createRequest("GET");
      const response = await GET(request, createParams());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });
  });

  describe("PATCH /api/superadmin/users/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const request = createRequest("PATCH", { status: "SUSPENDED" });
      const response = await PATCH(request, createParams());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("should update user status", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest("PATCH", { status: "SUSPENDED" });
      const response = await PATCH(request, createParams());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });

    it("should return 400 for invalid status value", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const request = createRequest("PATCH", { status: "INVALID_STATUS" });
      const response = await PATCH(request, createParams());

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid JSON body", async () => {
      mockGetSuperadminSession.mockResolvedValue({ username: "superadmin", email: "admin@fixzit.sa" });

      const url = new URL(`http://localhost:3000/api/superadmin/users/${validUserId}`);
      const request = new NextRequest(url, { 
        method: "PATCH",
        body: "invalid json{",
        headers: { "Content-Type": "application/json" },
      });
      const response = await PATCH(request, createParams());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid JSON");
    });
  });

  describe("DELETE /api/superadmin/users/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const request = createRequest("DELETE");
      const response = await DELETE(request, createParams());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });
  });
});
