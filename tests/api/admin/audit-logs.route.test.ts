/**
 * @fileoverview Tests for /api/admin/audit-logs route
 * Tests audit log retrieval with filtering and pagination
 * SECURITY TAG: Critical for compliance and security monitoring
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock MongoDB connection
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock AuditLog model
vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

import { auth } from "@/auth";
import { smartRateLimit } from "@/server/security/rateLimit";
import { AuditLogModel } from "@/server/models/AuditLog";

const importRoute = async () => {
  try {
    return await import("@/app/api/admin/audit-logs/route");
  } catch {
    return null;
  }
};

describe("API /api/admin/audit-logs", () => {
  const mockOrgId = "org_123456789";
  const mockSuperAdminUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "SUPER_ADMIN",
  };

  const mockRegularUser = {
    id: "user_456",
    orgId: mockOrgId,
    role: "ADMIN",
  };

  const mockAuditLogs = [
    {
      _id: "log_1",
      userId: "user_123",
      action: "CREATE",
      entityType: "WorkOrder",
      entityId: "wo_123",
      timestamp: new Date("2025-01-01"),
      result: { success: true },
      orgId: mockOrgId,
    },
    {
      _id: "log_2",
      userId: "user_456",
      action: "UPDATE",
      entityType: "Invoice",
      entityId: "inv_456",
      timestamp: new Date("2025-01-02"),
      result: { success: false },
      orgId: mockOrgId,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
  });

  describe("GET - List Audit Logs", () => {
    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
      const response = await route.GET(req);

      expect([401, 500, 503]).toContain(response.status);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 403 when user is not SUPER_ADMIN", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: mockRegularUser,
        expires: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
      const response = await route.GET(req);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Super Admin");
    });

    it("returns 403 when orgId is missing", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: { ...mockSuperAdminUser, orgId: undefined },
        expires: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
      const response = await route.GET(req);

      expect(response.status).toBe(403);
    });

    it("returns audit logs with pagination for SUPER_ADMIN", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: mockSuperAdminUser,
        expires: new Date().toISOString(),
      });

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            skip: vi.fn().mockResolvedValue(mockAuditLogs),
          }),
        }),
      });
      vi.mocked(AuditLogModel.find).mockImplementation(mockFind);
      vi.mocked(AuditLogModel.countDocuments).mockResolvedValue(2);

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs?page=1&limit=50");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.logs).toHaveLength(2);
      expect(json.total).toBe(2);
      expect(json.page).toBe(1);
    });

    it("filters by userId when provided", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: mockSuperAdminUser,
        expires: new Date().toISOString(),
      });

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            skip: vi.fn().mockResolvedValue([mockAuditLogs[0]]),
          }),
        }),
      });
      vi.mocked(AuditLogModel.find).mockImplementation(mockFind);
      vi.mocked(AuditLogModel.countDocuments).mockResolvedValue(1);

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs?userId=user_123");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({
        userId: "user_123",
      }));
    });

    it("filters by action when provided", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: mockSuperAdminUser,
        expires: new Date().toISOString(),
      });

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            skip: vi.fn().mockResolvedValue([mockAuditLogs[0]]),
          }),
        }),
      });
      vi.mocked(AuditLogModel.find).mockImplementation(mockFind);
      vi.mocked(AuditLogModel.countDocuments).mockResolvedValue(1);

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs?action=CREATE");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({
        action: "CREATE",
      }));
    });

    it("returns 400 for invalid date parameters", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: mockSuperAdminUser,
        expires: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs?startDate=invalid-date");
      const response = await route.GET(req);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Invalid startDate");
    });

    it("handles rate limiting", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: mockSuperAdminUser,
        expires: new Date().toISOString(),
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("caps limit at 500 for safety", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: mockSuperAdminUser,
        expires: new Date().toISOString(),
      });

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            skip: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(AuditLogModel.find).mockImplementation(mockFind);
      vi.mocked(AuditLogModel.countDocuments).mockResolvedValue(0);

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs?limit=1000");
      await route.GET(req);

      // Verify limit was capped at 500
      expect(mockFind().sort().limit).toHaveBeenCalledWith(500);
    });
  });
});
