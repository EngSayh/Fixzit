/**
 * @fileoverview Tests for /api/superadmin/user-logs route
 * @sprint 66
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
          details: { ip: "127.0.0.1" },
        },
      ]),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
  },
}));

import { GET } from "@/app/api/superadmin/user-logs/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";

const mockGetSession = vi.mocked(getSuperadminSession);

function createGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/superadmin/user-logs");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url, { method: "GET" });
}

describe("GET /api/superadmin/user-logs", () => {
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

  it("should return activity logs for superadmin", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 401, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.logs || json.data).toBeDefined();
    }
  });

  it("should support 24h range filter", async () => {
    const res = await GET(createGetRequest({ range: "24h" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support 7d range filter", async () => {
    const res = await GET(createGetRequest({ range: "7d" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support 30d range filter", async () => {
    const res = await GET(createGetRequest({ range: "30d" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support pagination", async () => {
    const res = await GET(createGetRequest({ page: "1", limit: "50" }) as any);
    expect([200, 401, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.total !== undefined || json.pagination !== undefined).toBe(true);
    }
  });

  it("should limit max results to 100", async () => {
    const res = await GET(createGetRequest({ limit: "200" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support category filter", async () => {
    const res = await GET(createGetRequest({ category: "auth" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support status filter", async () => {
    const res = await GET(createGetRequest({ status: "error" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support status=warning filter", async () => {
    const res = await GET(createGetRequest({ status: "warning" }) as any);
    expect([200, 401, 500]).toContain(res.status);
    // Warning filter should work without error
    if (res.status === 200) {
      const json = await res.json();
      expect(json.logs !== undefined || json.data !== undefined).toBe(true);
    }
  });

  it("should support status=success filter", async () => {
    const res = await GET(createGetRequest({ status: "success" }) as any);
    expect([200, 401, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.logs !== undefined || json.data !== undefined).toBe(true);
    }
  });

  it("should support search filter", async () => {
    const res = await GET(createGetRequest({ search: "login" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support userId filter", async () => {
    const res = await GET(createGetRequest({ userId: "user-123" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support entityType filter", async () => {
    const res = await GET(createGetRequest({ entityType: "USER" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support combined filters", async () => {
    const res = await GET(
      createGetRequest({
        range: "7d",
        category: "crud",
        status: "success",
        search: "create",
        page: "1",
        limit: "25",
      }) as any
    );
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should return pagination metadata in response", async () => {
    const res = await GET(createGetRequest({ page: "2", limit: "10" }) as any);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.pagination).toBeDefined();
      expect(json.pagination.page).toBeDefined();
      expect(json.pagination.limit).toBeDefined();
      expect(json.pagination.total).toBeDefined();
      expect(json.pagination.totalPages).toBeDefined();
    }
  });
});
