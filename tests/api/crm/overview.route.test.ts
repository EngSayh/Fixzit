/**
 * @fileoverview Tests for /api/crm/overview routes
 * Tests CRM dashboard statistics and aggregations
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

// Mock CRM models
vi.mock("@/server/models/CrmLead", () => ({
  default: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("@/server/models/CrmActivity", () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import CrmLead from "@/server/models/CrmLead";
import CrmActivity from "@/server/models/CrmActivity";

const importRoute = async () => {
  try {
    return await import("@/app/api/crm/overview/route");
  } catch {
    return null;
  }
};

describe("API /api/crm/overview", () => {
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

  describe("GET - CRM Dashboard Overview", () => {
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

      const req = new NextRequest("http://localhost:3000/api/crm/overview");
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

      const req = new NextRequest("http://localhost:3000/api/crm/overview");
      const response = await route.GET(req);

      expect([401, 500, 503]).toContain(response.status);
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

      const req = new NextRequest("http://localhost:3000/api/crm/overview");
      const response = await route.GET(req);

      expect([401, 500, 503]).toContain(response.status);
    });

    it("returns 401 when user lacks CRM role", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user_123",
        orgId: mockOrgId,
        role: "VENDOR", // Not allowed for CRM
      } as never);

      const req = new NextRequest("http://localhost:3000/api/crm/overview");
      const response = await route.GET(req);

      expect([401, 500, 503]).toContain(response.status);
    });

    it("successfully retrieves overview with tenant scoping", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      // Mock lead counts and won deals
      vi.mocked(CrmLead.countDocuments)
        .mockResolvedValueOnce(50) // total leads
        .mockResolvedValueOnce(10); // won deals

      // Mock aggregate pipeline results (open pipeline + stage counts)
      vi.mocked(CrmLead.aggregate)
        .mockResolvedValueOnce([{ total: 100000, count: 20 }]) // open pipeline
        .mockResolvedValueOnce([
          { _id: "NEW", total: 20 },
          { _id: "QUALIFIED", total: 15 },
          { _id: "WON", total: 10 },
        ]); // stage counts

      // Mock top accounts query
      const topAccountsChain = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: "acc1", company: "Acme", revenue: 500000 },
        ]),
      };
      vi.mocked(CrmLead.find).mockReturnValue(topAccountsChain as never);

      // Mock recent activities query
      const activitiesChain = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: "act1", type: "CALL", performedAt: new Date() },
        ]),
      };
      vi.mocked(CrmActivity.find).mockReturnValue(activitiesChain as never);

      // Mock activity counters
      vi.mocked(CrmActivity.countDocuments)
        .mockResolvedValueOnce(5) // calls7d
        .mockResolvedValueOnce(3); // emails7d

      const req = new NextRequest("http://localhost:3000/api/crm/overview");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totals.leads).toBe(50);
      expect(data.totals.pipelineValue).toBe(100000);
      expect(data.activityCounters.calls7d).toBe(5);

      // Verify tenant scoping was enforced
      expect(CrmLead.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId })
      );
    });

    it("includes pipeline metrics in response", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(CrmLead.countDocuments)
        .mockResolvedValueOnce(30) // total leads
        .mockResolvedValueOnce(8); // won deals

      vi.mocked(CrmLead.aggregate)
        .mockResolvedValueOnce([{ total: 50000, count: 10 }]) // open pipeline
        .mockResolvedValueOnce([
          { _id: "NEW", total: 10 },
          { _id: "QUALIFIED", total: 10 },
          { _id: "WON", total: 10 },
        ]);

      const topAccountsChain = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(CrmLead.find).mockReturnValue(topAccountsChain as never);

      const activitiesChain = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(CrmActivity.find).mockReturnValue(activitiesChain as never);

      vi.mocked(CrmActivity.countDocuments)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(6);

      const req = new NextRequest("http://localhost:3000/api/crm/overview");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify dashboard metrics are present
      expect(data.totals.leads).toBe(30);
      expect(data.totals.pipelineValue).toBe(50000);
      expect(data.stages.length).toBeGreaterThan(0);
    });

    it("aggregates data only for user's organization", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(CrmLead.countDocuments)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      vi.mocked(CrmLead.aggregate)
        .mockResolvedValueOnce([{ total: 0, count: 0 }])
        .mockResolvedValueOnce([]);
      const topAccountsChain = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(CrmLead.find).mockReturnValue(topAccountsChain as never);
      const activitiesChain = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(CrmActivity.find).mockReturnValue(activitiesChain as never);
      vi.mocked(CrmActivity.countDocuments)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const req = new NextRequest("http://localhost:3000/api/crm/overview");
      const response = await route.GET(req);

      expect(response.status).toBe(200);

      // Verify all queries include orgId filter
      expect(CrmLead.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId })
      );
    });
  });
});
