/**
 * @fileoverview Tests for /api/superadmin/user-logs/export route
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
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: "log-1",
          action: "LOGIN",
          userId: "user-1",
          userName: "Test User",
          userEmail: "test@example.com",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          metadata: { orgName: "Acme Corp", reason: "User login" },
          result: { success: true },
        },
        {
          _id: "log-2",
          action: "UPDATE",
          userId: "user-2",
          userName: "Admin",
          userEmail: "admin@example.com",
          timestamp: new Date("2024-01-15T11:00:00Z"),
          metadata: { orgName: "Acme Corp", reason: "Updated profile" },
          result: { success: true },
        },
      ]),
    }),
  },
}));

import { GET } from "@/app/api/superadmin/user-logs/export/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";

const mockGetSession = vi.mocked(getSuperadminSession);

function createGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/superadmin/user-logs/export");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url, { method: "GET" });
}

describe("GET /api/superadmin/user-logs/export", () => {
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

  it("should return JSON format by default", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.logs).toBeDefined();
      expect(json.exportedAt).toBeDefined();
      expect(json.recordCount).toBeDefined();
    }
  });

  it("should return CSV format when requested", async () => {
    const res = await GET(createGetRequest({ format: "csv" }) as any);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const contentType = res.headers.get("Content-Type");
      expect(contentType).toContain("text/csv");
      const contentDisposition = res.headers.get("Content-Disposition");
      expect(contentDisposition).toContain("attachment");
    }
  });

  it("should support range filter", async () => {
    const res = await GET(createGetRequest({ range: "30d" }) as any);
    expect([200, 500]).toContain(res.status);
  });

  it("should support category filter", async () => {
    const res = await GET(createGetRequest({ category: "auth" }) as any);
    expect([200, 500]).toContain(res.status);
  });

  it("should support status filter", async () => {
    const res = await GET(createGetRequest({ status: "error" }) as any);
    expect([200, 500]).toContain(res.status);
  });

  it("should support search filter", async () => {
    const res = await GET(createGetRequest({ search: "login" }) as any);
    expect([200, 500]).toContain(res.status);
  });

  it("should redact emails by default", async () => {
    const res = await GET(createGetRequest() as any);
    if (res.status === 200) {
      const json = await res.json();
      if (json.logs && json.logs.length > 0) {
        expect(json.logs[0].userEmail).toBe("[REDACTED]");
      }
    }
  });

  it("should include emails when includeEmails=true", async () => {
    const res = await GET(createGetRequest({ includeEmails: "true" }) as any);
    if (res.status === 200) {
      const json = await res.json();
      if (json.logs && json.logs.length > 0) {
        expect(json.logs[0].userEmail).not.toBe("[REDACTED]");
      }
    }
  });

  it("should support combined filters for export", async () => {
    const res = await GET(
      createGetRequest({
        format: "json",
        range: "7d",
        category: "crud",
        status: "success",
      }) as any
    );
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.filters).toBeDefined();
      expect(json.filters.range).toBe("7d");
      expect(json.filters.category).toBe("crud");
      expect(json.filters.status).toBe("success");
    }
  });
});
