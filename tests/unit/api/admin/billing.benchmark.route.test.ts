import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/server", () => {
  return {
    NextRequest: class {},
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => {
        const status = init?.status ?? 200;
        return {
          status,
          body,
          async json() {
            return body;
          },
        };
      },
    },
  };
});

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(async () => ({ id: "user-1", tenantId: "org-1" })),
}));

const lean = vi.fn().mockResolvedValue([{ vendor: "v1" }]);
const find = vi.fn().mockReturnValue({ lean });
vi.mock("@/server/models/Benchmark", () => ({
  __esModule: true,
  default: { find },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

const smartRateLimit = vi.fn().mockResolvedValue({ allowed: true });
const buildOrgAwareRateLimitKey = vi.fn(() => "rl-key");
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit,
  buildOrgAwareRateLimitKey,
}));

describe("GET /api/admin/billing/benchmark", () => {
  let GET: typeof import("@/app/api/admin/billing/benchmark/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import("@/app/api/admin/billing/benchmark/route"));
  });

  it("scopes benchmarks to tenant and uses org-aware rate limit key", async () => {
    const req = {
      url: "https://example.com/api/admin/billing/benchmark",
      headers: new Map(),
    } as unknown as Request;

    const res = await GET(req as any);
    expect(res.status).toBe(200);
    expect(await (res as any).json()).toEqual([{ vendor: "v1" }]);

    expect(buildOrgAwareRateLimitKey).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "user-1",
    );
    expect(smartRateLimit).toHaveBeenCalledWith("rl-key", 100, 60_000);
    expect(find).toHaveBeenCalledWith({ tenantId: "org-1" });
    expect(lean).toHaveBeenCalled();
  });
});
