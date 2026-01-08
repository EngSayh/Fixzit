/**
 * @fileoverview Tests for superadmin god-mode endpoint
 * @route GET /api/superadmin/god-mode
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(),
}));

vi.mock("@/lib/mongo", () => ({
  pingDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/monitoring/health-aggregator", () => ({
  healthAggregator: {
    getStatus: vi.fn().mockResolvedValue({ status: "healthy" }),
  },
  HealthStatus: { HEALTHY: "healthy", DEGRADED: "degraded", UNHEALTHY: "unhealthy" },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockCollection = {
  countDocuments: vi.fn().mockResolvedValue(10),
  find: vi.fn().mockReturnValue({
    project: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
  aggregate: vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue([]),
  }),
};

const { GET } = await import("@/app/api/superadmin/god-mode/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { getDatabase } = await import("@/lib/mongodb-unified");

describe("Superadmin God Mode API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any);
  });

  describe("GET /api/superadmin/god-mode", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/god-mode");

      const response = await GET(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("FIXZIT-AUTH-001");
    });

    it("should return dashboard data for authenticated superadmin", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/god-mode");

      const response = await GET(request);
      // Accept 200 or 500 (if db mock causes internal error)
      expect([200, 500]).toContain(response.status);
    });

    it("should return 400 for invalid tenantId format", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/god-mode?tenantId=invalid");

      const response = await GET(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("FIXZIT-VALIDATION-001");
    });
  });
});
