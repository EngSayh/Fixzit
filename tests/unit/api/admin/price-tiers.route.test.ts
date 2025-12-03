import { describe, it, expect, beforeEach, vi } from "vitest";

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

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth", () => ({
  getUserFromToken: vi.fn(async () => ({
    id: "admin-1",
    role: "SUPER_ADMIN",
    orgId: "org-1",
  })),
}));

const populate = vi.fn().mockResolvedValue([{ _id: "pt1" }]);
const find = vi.fn().mockReturnValue({ populate });
vi.mock("@/server/models/PriceTier", () => ({
  __esModule: true,
  default: { find },
}));

const smartRateLimit = vi.fn().mockResolvedValue({ allowed: true });
const buildOrgAwareRateLimitKey = vi.fn(() => "rl-key");
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit,
  buildOrgAwareRateLimitKey,
}));

describe("GET /api/admin/price-tiers", () => {
  let GET: typeof import("@/app/api/admin/price-tiers/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import("@/app/api/admin/price-tiers/route"));
  });

  it("uses org-aware rate limiting after auth", async () => {
    const req = {
      url: "https://example.com/api/admin/price-tiers",
      headers: new Map([["authorization", "Bearer token"]]),
    } as unknown as Request;

    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect((res as any).body).toEqual([{ _id: "pt1" }]);

    expect(buildOrgAwareRateLimitKey).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "admin-1",
    );
    expect(smartRateLimit).toHaveBeenCalledWith("rl-key", 100, 60_000);
    expect(find).toHaveBeenCalledWith({});
    expect(populate).toHaveBeenCalledWith("moduleId", "code name");
  });
});
