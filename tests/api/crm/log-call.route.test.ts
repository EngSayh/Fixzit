/**
 * @fileoverview Tests for /api/crm/leads/log-call routes
 * Tests CRM call logging functionality
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
  UnauthorizedError: class UnauthorizedError extends Error {},
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
    findOneAndUpdate: vi.fn(),
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

const importRoute = async () => {
  try {
    return await import("@/app/api/crm/leads/log-call/route");
  } catch {
    return null;
  }
};

describe("API /api/crm/leads/log-call", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "MANAGER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);
  });

  describe("POST - Log Call Activity", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest(
        "http://localhost:3000/api/crm/leads/log-call",
        {
          method: "POST",
          body: JSON.stringify({
            contact: "John",
            company: "Test",
            notes: "Call notes",
          }),
        }
      );
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest(
        "http://localhost:3000/api/crm/leads/log-call",
        {
          method: "POST",
          body: JSON.stringify({
            contact: "John",
            company: "Test",
            notes: "Call notes",
          }),
        }
      );
      const response = await route.POST(req);

      expect(response.status).toBe(401);
    });

    it("returns 401 when user lacks CRM role", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user_123",
        orgId: mockOrgId,
        role: "TENANT", // Not allowed for CRM
      } as never);

      const req = new NextRequest(
        "http://localhost:3000/api/crm/leads/log-call",
        {
          method: "POST",
          body: JSON.stringify({
            contact: "John",
            company: "Test",
            notes: "Call notes",
          }),
        }
      );
      const response = await route.POST(req);

      expect(response.status).toBe(401);
    });

    it("successfully logs call for existing lead with tenant scoping", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      const mockLead = {
        _id: "lead_001",
        company: "Acme Corp",
        contact: "John Doe",
        orgId: mockOrgId,
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(CrmLead.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockLead),
      } as never);
      vi.mocked(CrmActivity.create).mockResolvedValue({
        _id: "activity_001",
        type: "CALL",
        notes: "Discussed pricing",
      } as never);

      const req = new NextRequest(
        "http://localhost:3000/api/crm/leads/log-call",
        {
          method: "POST",
          body: JSON.stringify({
            contact: "John Doe",
            company: "Acme Corp",
            email: "john@acme.com",
            notes: "Discussed pricing",
          }),
        }
      );
      const response = await route.POST(req);

      expect(response.status).toBe(200);

      // Verify tenant scoping in lead query
      expect(CrmLead.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId, company: "Acme Corp" })
      );

      // Verify activity was created
      expect(CrmActivity.create).toHaveBeenCalled();
      expect(mockLead.save).toHaveBeenCalled();
    });

    it("creates new lead when company not found", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      // Lead not found
      vi.mocked(CrmLead.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      } as never);

      // New lead created
      const mockNewLead = {
        _id: "lead_new",
        company: "New Corp",
        contact: "Alice",
        orgId: mockOrgId,
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(CrmLead.create).mockResolvedValue(mockNewLead as never);
      vi.mocked(CrmActivity.create).mockResolvedValue({
        _id: "activity_002",
      } as never);

      const req = new NextRequest(
        "http://localhost:3000/api/crm/leads/log-call",
        {
          method: "POST",
          body: JSON.stringify({
            contact: "Alice",
            company: "New Corp",
            email: "alice@newcorp.com",
            notes: "First contact",
          }),
        }
      );
      const response = await route.POST(req);

      expect(response.status).toBe(200);

      // Verify new lead was created with tenant scoping
      expect(CrmLead.create).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId, company: "New Corp" })
      );

      // Verify activity was created
      expect(CrmActivity.create).toHaveBeenCalled();
      expect(mockNewLead.save).toHaveBeenCalled();
    });

    it("returns 400 when request body is invalid", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      const req = new NextRequest(
        "http://localhost:3000/api/crm/leads/log-call",
        {
          method: "POST",
          body: JSON.stringify({}), // Missing required fields
        }
      );
      const response = await route.POST(req);

      expect([400, 422]).toContain(response.status);
    });

    it("requires all mandatory fields (contact, company, notes)", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      // Missing notes
      const req = new NextRequest(
        "http://localhost:3000/api/crm/leads/log-call",
        {
          method: "POST",
          body: JSON.stringify({
            contact: "John",
            company: "Test Corp",
            // notes missing
          }),
        }
      );
      const response = await route.POST(req);

      expect([400, 422]).toContain(response.status);
    });
  });
});
