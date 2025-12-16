/**
 * @fileoverview Tests for /api/crm/accounts/share route
 * Tests CRM account sharing functionality, RBAC, tenant isolation
 * @module tests/api/crm/accounts-share.route.test
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock tenant context
vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: vi.fn(),
  clearTenantContext: vi.fn(),
}));

// Mock audit context
vi.mock("@/server/plugins/auditPlugin", () => ({
  setAuditContext: vi.fn(),
  clearAuditContext: vi.fn(),
}));

// Mock CRM models
vi.mock("@/server/models/CrmLead", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/server/models/CrmActivity", () => ({
  default: {
    create: vi.fn(),
  },
}));

// Mock security headers
vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import CrmLead from "@/server/models/CrmLead";
import CrmActivity from "@/server/models/CrmActivity";
import { setTenantContext, clearTenantContext } from "@/server/plugins/tenantIsolation";
import { setAuditContext, clearAuditContext } from "@/server/plugins/auditPlugin";

const importRoute = async () => {
  try {
    return await import("@/app/api/crm/accounts/share/route");
  } catch {
    return null;
  }
};

describe("API /api/crm/accounts/share", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_admin_123",
    orgId: mockOrgId,
    tenantId: mockOrgId,
    role: "ADMIN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(mockUser);
  });

  describe("POST /api/crm/accounts/share", () => {
    it("should create new account when company does not exist", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect.fail("Route handler not found");
        return;
      }

      const mockCreatedAccount = {
        _id: "lead_new_123",
        company: "New Corp",
        kind: "ACCOUNT",
      };

      vi.mocked(CrmLead.findOne).mockResolvedValueOnce(null);
      vi.mocked(CrmLead.create).mockResolvedValueOnce(mockCreatedAccount as any);
      vi.mocked(CrmActivity.create).mockResolvedValueOnce({} as any);

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "New Corp",
          segment: "enterprise",
        }),
      });

      const res = await route.POST(req);
      
      expect(res.status).toBe(200);
      expect(CrmLead.create).toHaveBeenCalled();
      expect(CrmActivity.create).toHaveBeenCalled();
      expect(setTenantContext).toHaveBeenCalledWith({ orgId: mockOrgId });
      expect(clearTenantContext).toHaveBeenCalled();
    });

    it("should share existing account without recreation", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect.fail("Route handler not found");
        return;
      }

      const mockExistingAccount = {
        _id: "lead_existing_456",
        company: "Existing Corp",
        kind: "ACCOUNT",
      };

      vi.mocked(CrmLead.findOne).mockResolvedValueOnce(mockExistingAccount as any);
      vi.mocked(CrmActivity.create).mockResolvedValueOnce({} as any);

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Existing Corp",
        }),
      });

      const res = await route.POST(req);
      
      expect(res.status).toBe(200);
      expect(CrmLead.create).not.toHaveBeenCalled();
      expect(CrmActivity.create).toHaveBeenCalled();
    });

    it("should reject request without authentication", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect.fail("Route handler not found");
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValueOnce(null as any);

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Test Corp",
        }),
      });

      const res = await route.POST(req);
      
      expect(res.status).toBe(401);
    });

    it("should validate required company field", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect.fail("Route handler not found");
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          // Missing company field
          notes: "Invalid",
        }),
      });

      const res = await route.POST(req);
      
      expect(res.status).toBe(422);
    });

    it("should enforce rate limiting", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect.fail("Route handler not found");
        return;
      }

      const rateLimitResponse = Response.json(
        { error: "Rate limit exceeded" }, 
        { status: 429 }
      );
      vi.mocked(enforceRateLimit).mockReturnValueOnce(rateLimitResponse);

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Rate Test Corp",
        }),
      });

      const res = await route.POST(req);
      
      expect(res.status).toBe(429);
    });

    it("should handle database errors gracefully", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect.fail("Route handler not found");
        return;
      }

      vi.mocked(CrmLead.findOne).mockRejectedValueOnce(new Error("DB error"));

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Error Corp",
        }),
      });

      const res = await route.POST(req);
      
      expect(res.status).toBe(500);
    });

    it("should set tenant and audit context", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect.fail("Route handler not found");
        return;
      }

      vi.mocked(CrmLead.findOne).mockResolvedValueOnce(null);
      vi.mocked(CrmLead.create).mockResolvedValueOnce({ _id: "lead_123", kind: "ACCOUNT" } as any);
      vi.mocked(CrmActivity.create).mockResolvedValueOnce({} as any);

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Context Test Corp",
        }),
      });

      await route.POST(req);

      expect(setTenantContext).toHaveBeenCalledWith({ orgId: mockOrgId });
      expect(setAuditContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          ipAddress: "127.0.0.1",
        })
      );
      expect(clearTenantContext).toHaveBeenCalled();
      expect(clearAuditContext).toHaveBeenCalled();
    });
  });
});
