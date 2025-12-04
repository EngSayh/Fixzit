import { describe, it, expect, beforeEach, vi } from "vitest";
import { ObjectId } from "mongodb";

vi.mock("next/server", () => {
  return {
    NextRequest: class {},
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => ({
        status: init?.status ?? 200,
        body,
      }),
    },
  };
});

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({
    user: {
      id: "admin-1",
      email: "admin@example.com",
      role: "SUPER_ADMIN",
      orgId: "507f1f77bcf86cd799439011",
    },
  })),
}));

const toArray = vi.fn().mockResolvedValue([{ _id: "n1" }]);
const skip = vi.fn().mockReturnValue({ toArray });
const limit = vi.fn().mockReturnValue({ skip });
const sort = vi.fn().mockReturnValue({ limit });
const find = vi.fn().mockReturnValue({ sort });
const countDocuments = vi.fn().mockResolvedValue(1);
const collection = vi.fn().mockReturnValue({ find, countDocuments });
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection,
  }),
}));

const smartRateLimit = vi.fn().mockResolvedValue({ allowed: true });
const buildOrgAwareRateLimitKey = vi.fn(() => "rl-key");
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit,
  buildOrgAwareRateLimitKey,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("GET /api/admin/notifications/history", () => {
  let GET: typeof import("@/app/api/admin/notifications/history/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import("@/app/api/admin/notifications/history/route"));
  });

  it("uses org-aware rate limiting and org-scoped queries", async () => {
    const url =
      "https://example.com/api/admin/notifications/history?limit=5&skip=0";
    const req = {
      url,
      nextUrl: new URL(url),
      headers: new Map(),
    } as unknown as Request;

    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect((res as any).body.success).toBe(true);
    expect((res as any).body.data).toEqual([{ _id: "n1" }]);

    const expectedOrg = new ObjectId("507f1f77bcf86cd799439011");
    expect(buildOrgAwareRateLimitKey).toHaveBeenCalledWith(
      expect.anything(),
      "507f1f77bcf86cd799439011",
      "admin-1",
    );
    expect(smartRateLimit).toHaveBeenCalledWith("rl-key", 100, 60_000);
    expect(find).toHaveBeenCalledWith({ orgId: expectedOrg });
    expect(countDocuments).toHaveBeenCalledWith({ orgId: expectedOrg });
  });
});
