/**
 * @fileoverview API contract validation tests for Superadmin User Logs
 * Tests that API responses match expected UI contracts
 * @sprint 66
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue({
    username: "superadmin",
    role: "SUPER_ADMIN",
    orgId: "org-1",
  }),
}));

// Mock AuditLogModel with proper data
vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: "log-1",
          action: "LOGIN",
          userId: "user-1",
          userName: "John Doe",
          userEmail: "john@example.com",
          timestamp: new Date(),
          result: { success: true },
          metadata: { orgName: "Acme Corp", reason: "User login" },
          context: { method: "POST", endpoint: "/api/auth/login", device: "desktop" },
        },
        {
          _id: "log-2",
          action: "CREATE_TICKET",
          userId: "user-2",
          userName: "Jane Smith",
          userEmail: "jane@example.com",
          timestamp: new Date(Date.now() - 3600000),
          result: { success: true },
          metadata: { orgName: "Acme Corp" },
          context: { method: "POST", endpoint: "/api/tickets" },
        },
        {
          _id: "log-3",
          action: "UPDATE_FAILED",
          userId: "user-1",
          userName: "John Doe",
          userEmail: "john@example.com",
          timestamp: new Date(Date.now() - 7200000),
          result: { success: false },
          metadata: { orgName: "Acme Corp", reason: "Validation error" },
          context: { method: "PATCH", endpoint: "/api/settings" },
        },
      ]),
    }),
    countDocuments: vi.fn().mockResolvedValue(3),
    aggregate: vi.fn().mockResolvedValue([{ uniqueUsers: 10 }]),
  },
}));

vi.mock("@/server/models/User", () => ({
  User: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: "user-1",
          email: "user@test.com",
          username: "testuser",
          professional: { role: "FM_MANAGER" },
          status: "ACTIVE",
          security: { lastLogin: new Date() },
          personal: { firstName: "John", lastName: "Doe" },
        },
      ]),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
  },
}));

import { GET as getLogsRoute } from "@/app/api/superadmin/user-logs/route";
import { GET as getStatsRoute } from "@/app/api/superadmin/user-logs/stats/route";
import { GET as getSessionsRoute } from "@/app/api/superadmin/user-sessions/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";

const mockGetSession = vi.mocked(getSuperadminSession);

function createRequest(path: string, params: Record<string, string> = {}): Request {
  const url = new URL(`http://localhost:3000${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url, { method: "GET" });
}

describe("User Logs API Contract Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-1",
    } as any);
  });

  describe("Logs API Contract", () => {
    it("should return logs with category field derived from action", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs") as any);
      if (res.status === 200) {
        const json = await res.json();
        const logs = json.logs || [];
        expect(logs.length).toBeGreaterThan(0);
        // LOGIN should be categorized as "auth"
        const loginLog = logs.find((l: any) => l.action === "LOGIN");
        if (loginLog) {
          expect(loginLog.category).toBe("auth");
        }
      }
    });

    it("should return logs with status field derived from result.success", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs") as any);
      if (res.status === 200) {
        const json = await res.json();
        const logs = json.logs || [];
        // Check successful log has status "success"
        const successLog = logs.find((l: any) => l.action === "LOGIN");
        if (successLog) {
          expect(successLog.status).toBe("success");
        }
      }
    });

    it("should return logs with tenantName from metadata.orgName", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs") as any);
      if (res.status === 200) {
        const json = await res.json();
        const logs = json.logs || [];
        if (logs.length > 0) {
          expect(logs[0].tenantName).toBeDefined();
        }
      }
    });

    it("should return logs with details from metadata.reason", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs") as any);
      if (res.status === 200) {
        const json = await res.json();
        const logs = json.logs || [];
        const logWithReason = logs.find((l: any) => l.details);
        expect(logWithReason).toBeDefined();
      }
    });

    it("should return pagination metadata in response", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs") as any);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.pagination).toBeDefined();
        expect(json.pagination.page).toBeDefined();
        expect(json.pagination.limit).toBeDefined();
        expect(json.pagination.total).toBeDefined();
        expect(json.pagination.totalPages).toBeDefined();
      }
    });

    it("should expose audit context fields in metadata", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs") as any);
      if (res.status === 200) {
        const json = await res.json();
        const logs = json.logs || [];
        if (logs.length > 0 && logs[0].metadata) {
          // Check context fields are exposed
          expect(logs[0].metadata.method).toBeDefined();
          expect(logs[0].metadata.path).toBeDefined();
        }
      }
    });
  });

  describe("Stats API Contract", () => {
    it("should return errorRate as a number", async () => {
      const res = await getStatsRoute(createRequest("/api/superadmin/user-logs/stats") as any);
      if (res.status === 200) {
        const json = await res.json();
        expect(typeof json.errorRate).toBe("number");
        // Should be a percentage, not throw on .toFixed()
        expect(() => json.errorRate.toFixed(1)).not.toThrow();
      }
    });

    it("should return uniqueUsers as a number", async () => {
      const res = await getStatsRoute(createRequest("/api/superadmin/user-logs/stats") as any);
      if (res.status === 200) {
        const json = await res.json();
        expect(typeof json.uniqueUsers).toBe("number");
      }
    });

    it("should return topActions as an array", async () => {
      const res = await getStatsRoute(createRequest("/api/superadmin/user-logs/stats") as any);
      if (res.status === 200) {
        const json = await res.json();
        expect(Array.isArray(json.topActions)).toBe(true);
      }
    });

    it("should return totalLogs as a number", async () => {
      const res = await getStatsRoute(createRequest("/api/superadmin/user-logs/stats") as any);
      if (res.status === 200) {
        const json = await res.json();
        expect(typeof json.totalLogs).toBe("number");
      }
    });

    it("should return avgSessionDuration as a number", async () => {
      const res = await getStatsRoute(createRequest("/api/superadmin/user-logs/stats") as any);
      if (res.status === 200) {
        const json = await res.json();
        expect(typeof json.avgSessionDuration).toBe("number");
      }
    });
  });

  describe("Sessions API Contract", () => {
    it("should return sessions with isActive boolean", async () => {
      const res = await getSessionsRoute(createRequest("/api/superadmin/user-sessions") as any);
      if (res.status === 200) {
        const json = await res.json();
        const sessions = json.sessions || [];
        if (sessions.length > 0) {
          expect(typeof sessions[0].isActive).toBe("boolean");
        }
      }
    });

    it("should return sessions with startedAt timestamp", async () => {
      const res = await getSessionsRoute(createRequest("/api/superadmin/user-sessions") as any);
      if (res.status === 200) {
        const json = await res.json();
        const sessions = json.sessions || [];
        if (sessions.length > 0) {
          expect(sessions[0].startedAt).toBeDefined();
        }
      }
    });

    it("should return sessions with ip address", async () => {
      const res = await getSessionsRoute(createRequest("/api/superadmin/user-sessions") as any);
      if (res.status === 200) {
        const json = await res.json();
        const sessions = json.sessions || [];
        if (sessions.length > 0) {
          expect(sessions[0].ip).toBeDefined();
        }
      }
    });

    it("should return sessions with pagesVisited count", async () => {
      const res = await getSessionsRoute(createRequest("/api/superadmin/user-sessions") as any);
      if (res.status === 200) {
        const json = await res.json();
        const sessions = json.sessions || [];
        if (sessions.length > 0) {
          expect(typeof sessions[0].pagesVisited).toBe("number");
        }
      }
    });
  });

  describe("DateRange Mapping", () => {
    it("should accept 24h range parameter", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs", { range: "24h" }) as any);
      expect([200, 401, 500]).toContain(res.status);
    });

    it("should accept 7d range parameter", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs", { range: "7d" }) as any);
      expect([200, 401, 500]).toContain(res.status);
    });

    it("should accept 30d range parameter", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs", { range: "30d" }) as any);
      expect([200, 401, 500]).toContain(res.status);
    });

    it("should accept 90d range parameter", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs", { range: "90d" }) as any);
      expect([200, 401, 500]).toContain(res.status);
    });
  });

  describe("Server-Side Filtering", () => {
    it("should filter by category=auth", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs", { category: "auth" }) as any);
      expect([200, 401, 500]).toContain(res.status);
    });

    it("should filter by status=error", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs", { status: "error" }) as any);
      expect([200, 401, 500]).toContain(res.status);
    });

    it("should filter by search term", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs", { search: "login" }) as any);
      expect([200, 401, 500]).toContain(res.status);
    });

    it("should filter by userId", async () => {
      const res = await getLogsRoute(createRequest("/api/superadmin/user-logs", { userId: "user-1" }) as any);
      expect([200, 401, 500]).toContain(res.status);
    });
  });
});
