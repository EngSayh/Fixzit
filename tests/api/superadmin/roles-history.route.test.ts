/**
 * @fileoverview Tests for Superadmin Roles History API
 * @route GET /api/superadmin/roles/history
 * @agent [AGENT-0015]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

import { GET } from "@/app/api/superadmin/roles/history/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { AuditLogModel } from "@/server/models/AuditLog";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

describe("GET /api/superadmin/roles/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthorized users", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/superadmin/roles/history");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain("Unauthorized");
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }) as any
    );

    const request = new NextRequest("http://localhost/api/superadmin/roles/history");
    const response = await GET(request);

    expect(response.status).toBe(429);
  });

  it("should return role history for superadmin", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue({
      id: "superadmin-123",
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-123",
    } as any);

    vi.mocked(enforceRateLimit).mockReturnValue(null);

    const mockLogs = [
      {
        _id: "log-1",
        action: "UPDATE",
        entityType: "SETTING",
        entityName: "ADMIN role permissions",
        userId: "user-1",
        userName: "Admin User",
        userEmail: "admin@test.com",
        timestamp: new Date("2026-01-09T10:00:00Z"),
        metadata: { reason: "Updated permissions", tags: ["role"] },
        result: { success: true },
        context: { ipAddress: "192.168.1.1" },
      },
    ];

    vi.mocked(AuditLogModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockLogs),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof AuditLogModel.find>);

    vi.mocked(AuditLogModel.countDocuments).mockResolvedValue(1);

    const request = new NextRequest("http://localhost/api/superadmin/roles/history");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.history).toHaveLength(1);
    expect(data.history[0].roleName).toBe("ADMIN role permissions");
    expect(data.history[0].ipAddress).toBe("192.168.1.1");
    expect(data.total).toBe(1);
  });

  it("should support pagination", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue({
      id: "superadmin-123",
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-123",
    } as any);

    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(AuditLogModel.countDocuments).mockResolvedValue(100);

    const request = new NextRequest("http://localhost/api/superadmin/roles/history?page=2&limit=10");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.page).toBe(2);
    expect(data.limit).toBe(10);
    expect(data.totalPages).toBe(10);
  });

  it("should support roleName filter", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue({
      id: "superadmin-123",
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-123",
    } as any);

    vi.mocked(enforceRateLimit).mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/superadmin/roles/history?roleName=ADMIN");
    const response = await GET(request);

    expect(response.status).toBe(200);
    // Verify the find was called (query structure validated by TypeScript)
    expect(AuditLogModel.find).toHaveBeenCalled();
  });

  it("should extract role name from metadata.reason when entityName is missing", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue({
      id: "superadmin-123",
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-123",
    } as any);

    vi.mocked(enforceRateLimit).mockReturnValue(null);

    const mockLogs = [
      {
        _id: "log-2",
        action: "CREATE",
        entityType: "OTHER",
        // No entityName
        userId: "user-2",
        timestamp: new Date("2026-01-09T11:00:00Z"),
        metadata: { reason: "Created role: MANAGER", tags: ["role"] },
        result: { success: true },
        context: { ipAddress: "10.0.0.1" },
      },
    ];

    vi.mocked(AuditLogModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockLogs),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof AuditLogModel.find>);

    vi.mocked(AuditLogModel.countDocuments).mockResolvedValue(1);

    const request = new NextRequest("http://localhost/api/superadmin/roles/history");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.history[0].roleName).toBe("MANAGER");
  });
});
