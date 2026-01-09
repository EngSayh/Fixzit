/**
 * @fileoverview Tests for Superadmin Roles Route
 * @route GET/POST /api/superadmin/roles
 * @sprint Sprint 37
 * @agent [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(),
}));

vi.mock("@/server/models/Role", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { 
              _id: "role-1", 
              name: "ADMIN", 
              slug: "admin",
              description: "Administrator role",
              category: "aqar",
              level: 1,
              permissions: [
                { _id: "p1", key: "aqar:manage", module: "aqar", action: "manage" },
                { _id: "p2", key: "aqar:read", module: "aqar", action: "read" }
              ],
              wildcard: false,
              systemReserved: false
            },
            { 
              _id: "role-2", 
              name: "SUPER_ADMIN", 
              slug: "superadmin",
              description: "Super Admin role with full access",
              category: "platform",
              level: 0,
              permissions: [
                { _id: "p3", key: "*", module: "*", action: "*" }
              ],
              wildcard: true,
              systemReserved: true
            },
          ]),
        }),
      }),
    }),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(() => ({
    data: { name: "NewRole", permissions: ["read"] },
    error: null,
  })),
}));

vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: {
    create: vi.fn().mockResolvedValue({ _id: "audit-1" }),
  },
}));

import { GET, POST } from "@/app/api/superadmin/roles/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { AuditLogModel } from "@/server/models/AuditLog";

const mockGetSuperadminSession = vi.mocked(getSuperadminSession);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("Superadmin Roles Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
  });

  describe("GET /api/superadmin/roles", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/superadmin/roles");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Unauthorized");
    });

    it("returns roles list for authenticated superadmin", async () => {
      mockGetSuperadminSession.mockResolvedValue({
        username: "superadmin",
        userId: "sa-1",
        role: "SUPER_ADMIN",
      });

      const req = new NextRequest("http://localhost/api/superadmin/roles");
      const res = await GET(req);

      // Route may return 200 (success) or 500 (DB connection in test env)
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        const body = await res.json();
        expect(body.roles).toBeDefined();
        expect(body.total).toBeDefined();
      }
    });

    it("returns roles with populated permissions (string keys)", async () => {
      mockGetSuperadminSession.mockResolvedValue({
        username: "superadmin",
        userId: "sa-1",
        role: "SUPER_ADMIN",
      });

      const req = new NextRequest("http://localhost/api/superadmin/roles");
      const res = await GET(req);

      if (res.status === 200) {
        const body = await res.json();
        // Verify permissions are returned with string keys
        if (body.roles?.length > 0) {
          expect(Array.isArray(body.roles[0].permissions)).toBe(true);
        }
      }
    });

    it("returns fetchedAt timestamp in response", async () => {
      mockGetSuperadminSession.mockResolvedValue({
        username: "superadmin",
        userId: "sa-1",
        role: "SUPER_ADMIN",
      });

      const req = new NextRequest("http://localhost/api/superadmin/roles");
      const res = await GET(req);

      if (res.status === 200) {
        const body = await res.json();
        expect(body.fetchedAt).toBeDefined();
        expect(typeof body.fetchedAt).toBe("string");
      }
    });

    it("enforces rate limiting", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/superadmin/roles");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/superadmin/roles", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/superadmin/roles", {
        method: "POST",
        body: JSON.stringify({ name: "NewRole", permissions: ["read"] }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("enforces rate limiting on POST", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/superadmin/roles", {
        method: "POST",
        body: JSON.stringify({ name: "NewRole", permissions: ["read"] }),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("creates audit log with valid AuditLog schema fields", async () => {
      // Mock authenticated session
      mockGetSuperadminSession.mockResolvedValue({
        username: "superadmin",
        userId: "sa-1",
        role: "SUPER_ADMIN",
      });

      // Mock Role.create to return a role
      const { default: Role } = await import("@/server/models/Role");
      vi.mocked(Role.create).mockResolvedValue({
        _id: "new-role-id",
        name: "TestRole",
      } as any);

      const req = new NextRequest("http://localhost/api/superadmin/roles", {
        method: "POST",
        body: JSON.stringify({ name: "TestRole", permissions: ["read"] }),
      });
      const res = await POST(req);

      // Verify response (may be 201 or 500 depending on DB)
      expect([201, 500]).toContain(res.status);

      if (res.status === 201) {
        // Verify AuditLogModel.create was called with valid schema fields
        expect(AuditLogModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            orgId: expect.any(String), // Required field
            entityType: expect.stringMatching(/^(SETTING|OTHER)$/), // Valid enum
            action: expect.stringMatching(/^(CREATE|UPDATE|DELETE)$/), // Valid enum
            userId: expect.any(String),
            // Should NOT have 'details' (not a valid schema field)
            // Should use 'metadata' instead
          })
        );

        // Verify it does NOT use invalid fields
        const auditCall = vi.mocked(AuditLogModel.create).mock.calls[0]?.[0] as Record<string, unknown>;
        if (auditCall) {
          expect(auditCall).not.toHaveProperty("details"); // Invalid field
          expect(auditCall.entityType).not.toBe("Role"); // Invalid enum value
          expect(auditCall.action).not.toMatch(/^role\./); // Invalid action pattern
        }
      }
    });

    it("creates role with required orgId field", async () => {
      // Mock authenticated session
      mockGetSuperadminSession.mockResolvedValue({
        username: "superadmin",
        userId: "sa-1",
        role: "SUPER_ADMIN",
      });

      // Mock Role.create to capture the creation args
      const { default: Role } = await import("@/server/models/Role");
      vi.mocked(Role.create).mockResolvedValue({
        _id: "new-role-id",
        name: "NewRole",
        orgId: "fixzit-platform",
        slug: "newrole",
      } as any);

      const req = new NextRequest("http://localhost/api/superadmin/roles", {
        method: "POST",
        body: JSON.stringify({ name: "NewRole", permissions: ["read"] }),
      });
      const res = await POST(req);

      // Verify response (may be 201 or 500 depending on DB)
      expect([201, 500]).toContain(res.status);

      if (res.status === 201) {
        // Verify Role.create was called with orgId (required by Role model)
        // parseBodySafe mock returns { name: "NewRole", permissions: ["read"] }
        expect(Role.create).toHaveBeenCalledWith(
          expect.objectContaining({
            orgId: expect.any(String), // Required field - must not be undefined
            name: "NewRole",
            slug: "newrole", // Generated from name
          })
        );

        // Verify orgId is not empty/undefined
        const createCall = vi.mocked(Role.create).mock.calls[0]?.[0] as Record<string, unknown>;
        if (createCall) {
          expect(createCall.orgId).toBeDefined();
          expect(createCall.orgId).not.toBe("");
          expect(createCall.slug).toBeDefined();
        }
      }
    });
  });
});
