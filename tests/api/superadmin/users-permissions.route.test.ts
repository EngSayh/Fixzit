/**
 * @fileoverview Tests for SuperAdmin User Permissions API
 * @module tests/api/superadmin/users-permissions.route.test
 * 
 * Tests GET/PUT/DELETE /api/superadmin/users/[id]/permissions
 * [AGENT-0018] Created as part of superadmin users improvement initiative.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
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
const { mockGetSuperadminSession, mockUserFindById, mockUserFindByIdAndUpdate } = vi.hoisted(() => {
  return {
    mockGetSuperadminSession: vi.fn(),
    mockUserFindById: vi.fn(),
    mockUserFindByIdAndUpdate: vi.fn(),
  };
});

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: (...args: unknown[]) => mockGetSuperadminSession(...args),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
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
    isValidObjectId: vi.fn((id: string) => id.length === 24 || id.startsWith("user_")),
  },
  Types: {
    ObjectId: Object.assign(
      vi.fn((id?: string) => id ?? "mock-id"),
      { isValid: vi.fn(() => true) },
    ),
  },
  isValidObjectId: vi.fn((id: string) => id.length === 24 || id.startsWith("user_")),
}));

// Import route after all mocks are set up
import { GET, PUT, DELETE } from "@/app/api/superadmin/users/[id]/permissions/route";

function createRequest(method: string, body?: unknown): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/users/user_123456789012345678901234/permissions");
  
  if (body) {
    return new NextRequest(url, {
      method,
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }
  
  return new NextRequest(url, { method });
}

const mockParams = { params: { id: "user_123456789012345678901234" } };
const mockInvalidParams = { params: { id: "invalid" } };

describe("API /api/superadmin/users/[id]/permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: authenticated superadmin
    mockGetSuperadminSession.mockResolvedValue({
      username: "superadmin@test.com",
      isSuperadmin: true,
    });
    
    // Default: user exists
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "user_123456789012345678901234",
          email: "user@test.com",
          professional: { role: "STAFF" },
          permissionOverrides: [],
        }),
      }),
    });
    
    mockUserFindByIdAndUpdate.mockResolvedValue({
      _id: "user_123456789012345678901234",
    });
  });

  describe("GET - Retrieve Permissions", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);
      
      const req = createRequest("GET");
      const response = await GET(req, mockParams);
      
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toContain("Unauthorized");
    });

    it("returns 400 for invalid user ID", async () => {
      const req = createRequest("GET");
      const response = await GET(req, mockInvalidParams);
      
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Invalid user ID");
    });

    it("returns 404 when user not found", async () => {
      mockUserFindById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });
      
      const req = createRequest("GET");
      const response = await GET(req, mockParams);
      
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toContain("User not found");
    });

    it("returns user permissions with modules for valid request", async () => {
      const req = createRequest("GET");
      const response = await GET(req, mockParams);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("userId");
      expect(json).toHaveProperty("email");
      expect(json).toHaveProperty("role");
      expect(json).toHaveProperty("modules");
      expect(Array.isArray(json.modules)).toBe(true);
    });

    it("includes override count in response", async () => {
      const req = createRequest("GET");
      const response = await GET(req, mockParams);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("overrideCount");
      expect(typeof json.overrideCount).toBe("number");
    });
  });

  describe("PUT - Update Permissions", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);
      
      const req = createRequest("PUT", {
        overrides: [],
        reason: "Test reason for updating permissions",
      });
      const response = await PUT(req, mockParams);
      
      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid JSON body", async () => {
      const url = new URL("http://localhost:3000/api/superadmin/users/user_123456789012345678901234/permissions");
      const req = new NextRequest(url, {
        method: "PUT",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      });
      
      const response = await PUT(req, mockParams);
      expect(response.status).toBe(400);
    });

    it("returns 400 when reason is too short", async () => {
      const req = createRequest("PUT", {
        overrides: [],
        reason: "Short",
      });
      const response = await PUT(req, mockParams);
      
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Validation failed");
    });

    it("returns 400 for invalid module ID", async () => {
      const req = createRequest("PUT", {
        overrides: [
          {
            moduleId: "INVALID_MODULE",
            permissions: { view: true },
          },
        ],
        reason: "Test reason for updating permissions",
      });
      const response = await PUT(req, mockParams);
      
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Invalid module ID");
    });

    it("returns 404 when user not found", async () => {
      mockUserFindById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });
      
      const req = createRequest("PUT", {
        overrides: [],
        reason: "Test reason for updating permissions",
      });
      const response = await PUT(req, mockParams);
      
      expect(response.status).toBe(404);
    });

    it("successfully updates permissions with valid data", async () => {
      const req = createRequest("PUT", {
        overrides: [],
        reason: "Test reason for updating permissions",
      });
      const response = await PUT(req, mockParams);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json).toHaveProperty("overrideCount");
    });
  });

  describe("DELETE - Clear Permissions", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);
      
      const req = createRequest("DELETE");
      const response = await DELETE(req, mockParams);
      
      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid user ID", async () => {
      const req = createRequest("DELETE");
      const response = await DELETE(req, mockInvalidParams);
      
      expect(response.status).toBe(400);
    });

    it("returns 404 when user not found", async () => {
      mockUserFindById.mockResolvedValue(null);
      
      const req = createRequest("DELETE");
      const response = await DELETE(req, mockParams);
      
      expect(response.status).toBe(404);
    });

    it("successfully clears permissions", async () => {
      const req = createRequest("DELETE");
      const response = await DELETE(req, mockParams);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("cleared");
    });

    it("calls findByIdAndUpdate with empty overrides", async () => {
      const req = createRequest("DELETE");
      await DELETE(req, mockParams);
      
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "user_123456789012345678901234",
        expect.objectContaining({
          $set: expect.objectContaining({
            permissionOverrides: [],
          }),
        })
      );
    });
  });

  describe("Security", () => {
    it("requires superadmin session for all operations", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);
      
      const getResponse = await GET(createRequest("GET"), mockParams);
      const putResponse = await PUT(createRequest("PUT", { overrides: [], reason: "test reason long enough" }), mockParams);
      const deleteResponse = await DELETE(createRequest("DELETE"), mockParams);
      
      expect(getResponse.status).toBe(401);
      expect(putResponse.status).toBe(401);
      expect(deleteResponse.status).toBe(401);
    });

    it("validates ObjectId format", async () => {
      const invalidParams = { params: Promise.resolve({ id: "not-valid-id" }) };
      
      const response = await GET(createRequest("GET"), invalidParams);
      expect(response.status).toBe(400);
    });
  });
});
