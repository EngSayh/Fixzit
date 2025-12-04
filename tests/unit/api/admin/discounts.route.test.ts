import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => {
      const status = init?.status ?? 200;
      return { status, body, async json() { return body; } };
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
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

vi.mock("@/lib/auth", () => ({
  getUserFromToken: vi.fn(async () => ({
    id: "admin-1",
    role: "SUPER_ADMIN",
    orgId: "org-1",
  })),
}));

const findOne = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
const findOneAndUpdate = vi.fn().mockResolvedValue({
  key: "ANNUAL",
  percentage: 10,
  orgId: "org-1",
});
vi.mock("@/server/models/DiscountRule", () => ({
  __esModule: true,
  default: { findOne, findOneAndUpdate },
}));

describe("admin/discounts", () => {
  let GET: typeof import("@/app/api/admin/discounts/route").GET;
  let PUT: typeof import("@/app/api/admin/discounts/route").PUT;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET, PUT } = await import("@/app/api/admin/discounts/route"));
  });

  it("requires orgId and scopes queries by orgId on GET", async () => {
    const req = {
      url: "https://example.com/api/admin/discounts",
      headers: new Map([["authorization", "Bearer token"]]),
    } as unknown as Request;

    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(findOne).toHaveBeenCalledWith({ key: "ANNUAL", orgId: "org-1" });
    expect(buildOrgAwareRateLimitKey).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "admin-1",
    );
  });

  it("returns 400 when orgId is missing", async () => {
    const { getUserFromToken } = await import("@/lib/auth");
    vi.mocked(getUserFromToken).mockResolvedValueOnce({ id: "admin-1", role: "SUPER_ADMIN" } as any);

    const req = {
      url: "https://example.com/api/admin/discounts",
      headers: new Map([["authorization", "Bearer token"]]),
    } as unknown as Request;

    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it("upserts with org-scoped filter on PUT", async () => {
    const req = {
      url: "https://example.com/api/admin/discounts",
      headers: new Map([["authorization", "Bearer token"]]),
      json: async () => ({ value: 12 }),
    } as unknown as Request;

    const res = await PUT(req as any);

    expect(res.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { key: "ANNUAL", orgId: "org-1" },
      expect.objectContaining({ percentage: 12, orgId: "org-1" }),
      { upsert: true, new: true },
    );
    expect(buildOrgAwareRateLimitKey).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "admin-1",
    );
  });
});
