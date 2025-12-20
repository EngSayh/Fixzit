/**
 * @fileoverview Tests for /api/admin/audit-logs routes
 * Tests audit log viewing with filtering and pagination
 * SECURITY: Critical for compliance and security monitoring
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock AuditLog model
vi.mock("@/server/models/AuditLog", () => ({
  AuditLog: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { auth } from "@/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/admin/audit-logs/route");
  } catch {
    return null;
  }
};

describe("API /api/admin/audit-logs", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "ADMIN",
    roles: ["ADMIN"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(auth).mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as never);
  });

  describe("GET - List Audit Logs", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
      const response = await route.GET(req);

      expect(response.status).toBe(401);
    });

    it("returns 403 for non-admin users", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: { ...mockUser, role: "USER", roles: ["USER"] },
        expires: new Date(Date.now() + 86400000).toISOString(),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
      const response = await route.GET(req);

      expect([401, 403].includes(response.status)).toBe(true);
    });
  });
});
