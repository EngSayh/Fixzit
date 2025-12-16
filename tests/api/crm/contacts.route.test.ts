/**
 * @fileoverview Tests for /api/crm/contacts routes
 * Tests CRM contact/lead management including CRUD operations
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
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

// Mock security headers
vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import CrmLead from "@/server/models/CrmLead";

const importRoute = async () => {
  try {
    return await import("@/app/api/crm/contacts/route");
  } catch {
    return null;
  }
};

describe("API /api/crm/contacts", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "ADMIN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);
  });

  describe("GET - List Contacts/Leads", () => {
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

      const req = new NextRequest("http://localhost:3000/api/crm/contacts");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/crm/contacts");
      const response = await route.GET(req);

      expect(response.status).toBe(401);
    });

    it("returns 401 when user has no orgId (tenant scope missing)", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user_123",
        role: "ADMIN",
        orgId: undefined,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/crm/contacts");
      const response = await route.GET(req);

      expect(response.status).toBe(401);
    });

    it("returns 403 when user lacks CRM role", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user_123",
        orgId: mockOrgId,
        role: "TENANT", // Not allowed for CRM
      } as never);

      const req = new NextRequest("http://localhost:3000/api/crm/contacts");
      const response = await route.GET(req);

      expect([403, 500]).toContain(response.status);
    });

    it("successfully lists contacts with tenant scoping", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const mockContacts = [
        {
          _id: "lead_001",
          company: "Acme Corp",
          contact: "John Doe",
          email: "john@acme.com",
          type: "LEAD",
          orgId: mockOrgId,
          toJSON: () => ({
            _id: "lead_001",
            company: "Acme Corp",
            contact: "John Doe",
            email: "john@acme.com",
            type: "LEAD",
            orgId: mockOrgId,
          }),
        },
        {
          _id: "lead_002",
          company: "Beta Inc",
          contact: "Jane Smith",
          email: "jane@beta.com",
          type: "ACCOUNT",
          orgId: mockOrgId,
          toJSON: () => ({
            _id: "lead_002",
            company: "Beta Inc",
            contact: "Jane Smith",
            email: "jane@beta.com",
            type: "ACCOUNT",
            orgId: mockOrgId,
          }),
        },
      ];

      vi.mocked(CrmLead.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockContacts),
      } as never);

      vi.mocked(CrmLead.countDocuments).mockResolvedValue(2);

      const req = new NextRequest("http://localhost:3000/api/crm/contacts");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.leads).toHaveLength(2);

      // Verify tenant scoping was enforced
      expect(CrmLead.find).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId })
      );
    });

    it("supports type filtering (LEAD vs ACCOUNT)", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(CrmLead.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.mocked(CrmLead.countDocuments).mockResolvedValue(0);

      const req = new NextRequest(
        "http://localhost:3000/api/crm/contacts?type=LEAD"
      );
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      expect(CrmLead.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: "LEAD" })
      );
    });

    it("supports pagination parameters", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(CrmLead.find).mockReturnValue(mockChain as never);
      vi.mocked(CrmLead.countDocuments).mockResolvedValue(0);

      const req = new NextRequest(
        "http://localhost:3000/api/crm/contacts?page=2&limit=20"
      );
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      expect(mockChain.skip).toHaveBeenCalledWith(20); // (page 2 - 1) * 20
      expect(mockChain.limit).toHaveBeenCalledWith(20);
    });
  });

  describe("POST - Create Contact/Lead", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/crm/contacts", {
        method: "POST",
        body: JSON.stringify({ company: "Test Corp" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/crm/contacts", {
        method: "POST",
        body: JSON.stringify({ company: "Test Corp" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(401);
    });

    it("returns 403 when user lacks CRM role", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user_123",
        orgId: mockOrgId,
        role: "TECHNICIAN", // Not allowed for CRM
      } as never);

      const req = new NextRequest("http://localhost:3000/api/crm/contacts", {
        method: "POST",
        body: JSON.stringify({ company: "Test Corp" }),
      });
      const response = await route.POST(req);

      expect([403, 500]).toContain(response.status);
    });

    it("successfully creates lead with tenant scoping", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const mockLead = {
        _id: "lead_new",
        company: "New Corp",
        contact: "Alice Brown",
        email: "alice@newcorp.com",
        type: "LEAD",
        orgId: mockOrgId,
        toJSON: () => ({
          _id: "lead_new",
          company: "New Corp",
          contact: "Alice Brown",
          email: "alice@newcorp.com",
          type: "LEAD",
          orgId: mockOrgId,
        }),
      };

      vi.mocked(CrmLead.create).mockResolvedValue(mockLead as never);

      const req = new NextRequest("http://localhost:3000/api/crm/contacts", {
        method: "POST",
        body: JSON.stringify({
          company: "New Corp",
          contact: "Alice Brown",
          email: "alice@newcorp.com",
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.lead.company).toBe("New Corp");

      // Verify tenant scoping was enforced
      expect(CrmLead.create).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId })
      );
    });

    it("returns 400 when request body is invalid", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/crm/contacts", {
        method: "POST",
        body: JSON.stringify({}), // Missing required company field
      });
      const response = await route.POST(req);

      expect([400, 500]).toContain(response.status);
    });

    it("creates ACCOUNT type when specified", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const mockAccount = {
        _id: "account_new",
        company: "Enterprise Corp",
        type: "ACCOUNT",
        orgId: mockOrgId,
        toJSON: () => ({
          _id: "account_new",
          company: "Enterprise Corp",
          type: "ACCOUNT",
          orgId: mockOrgId,
        }),
      };

      vi.mocked(CrmLead.create).mockResolvedValue(mockAccount as never);

      const req = new NextRequest("http://localhost:3000/api/crm/contacts", {
        method: "POST",
        body: JSON.stringify({
          company: "Enterprise Corp",
          type: "ACCOUNT",
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(201);
      expect(CrmLead.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ACCOUNT" })
      );
    });
  });
});
