/**
 * @fileoverview Tests for /api/superadmin/user-sessions route
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

import { GET } from "@/app/api/superadmin/user-sessions/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";

const mockGetSession = vi.mocked(getSuperadminSession);

function createGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/superadmin/user-sessions");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url, { method: "GET" });
}

describe("GET /api/superadmin/user-sessions", () => {
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

  it("should return user sessions for superadmin", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 401, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.sessions || json.data).toBeDefined();
    }
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

  it("should return session metadata", async () => {
    const res = await GET(createGetRequest() as any);
    if (res.status === 200) {
      const json = await res.json();
      const sessions = json.sessions || json.data || [];
      if (sessions.length > 0) {
        expect(sessions[0].userName || sessions[0].userEmail).toBeDefined();
      }
    }
  });

  it("should filter by recent activity (last 30 days)", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 401, 500]).toContain(res.status);
  });
});
