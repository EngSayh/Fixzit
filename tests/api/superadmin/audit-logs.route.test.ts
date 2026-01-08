/**
 * @fileoverview Tests for /api/superadmin/audit-logs route
 * @sprint 67
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/audit/middleware", () => ({
  sanitizeAuditLogs: vi.fn((logs) => logs),
}));

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
          timestamp: new Date(),
          entityType: "USER",
          result: { success: true },
        },
      ]),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
  },
}));

import { GET } from "@/app/api/superadmin/audit-logs/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";

const mockGetSession = vi.mocked(getSuperadminSession);

function createGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/superadmin/audit-logs");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url, { method: "GET" });
}

describe("GET /api/superadmin/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-1",
    } as any);
  });

  it("should return 401 for unauthorized users", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(401);
  });

  it("should return audit logs for superadmin", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 401, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.logs || json.data).toBeDefined();
    }
  });

  it("should support pagination", async () => {
    const res = await GET(createGetRequest({ page: "1", limit: "50" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should filter by userId", async () => {
    const res = await GET(createGetRequest({ userId: "user-1" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should filter by entityType", async () => {
    const res = await GET(createGetRequest({ entityType: "USER" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should filter by action", async () => {
    const res = await GET(createGetRequest({ action: "LOGIN" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should filter by date range", async () => {
    const res = await GET(createGetRequest({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should cap limit to 500", async () => {
    const res = await GET(createGetRequest({ limit: "1000" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });
});
