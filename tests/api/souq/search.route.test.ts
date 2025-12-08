import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

const searchMock = vi.fn();
const smartRateLimitMock = vi.fn();
const getSessionUserMock = vi.fn();
const resolveMarketplaceContextMock = vi.fn();

vi.mock("@/lib/meilisearch", () => ({
  searchClient: {
    index: () => ({ search: searchMock }),
  },
  INDEXES: { PRODUCTS: "products" },
}));
vi.mock("@/lib/meilisearch-resilience", () => ({
  withMeiliResilience: async (_k: string, _op: string, cb: () => Promise<unknown>) => cb(),
}));
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => smartRateLimitMock(...args),
}));
vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: () => new Response("rate limited", { status: 429 }),
}));
vi.mock("@/server/security/headers", () => ({
  getClientIP: () => "127.0.0.1",
}));
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => getSessionUserMock(...args),
}));
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: (...args: unknown[]) => resolveMarketplaceContextMock(...args),
  isUnauthorizedMarketplaceContext: (ctx: unknown) =>
    (ctx as { tenantKey?: string; orgId?: { toString?: () => string } })?.tenantKey ===
      "__unauthorized__" ||
    (ctx as { orgId?: { toString?: () => string } })?.orgId?.toString?.() ===
      "000000000000000000000000",
}));

import { GET } from "@/app/api/souq/search/route";

describe("Souq search route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MARKETPLACE_PUBLIC_ORGS = "";
    process.env.MARKETPLACE_DEFAULT_TENANT = "";
    smartRateLimitMock.mockReturnValue({ allowed: true, remaining: 5 });
    getSessionUserMock.mockResolvedValue(null);
    resolveMarketplaceContextMock.mockResolvedValue({
      tenantKey: "__unauthorized__",
      orgId: new Types.ObjectId("000000000000000000000000"),
      correlationId: "corr-1",
    });
    searchMock.mockResolvedValue({
      hits: [],
      estimatedTotalHits: 0,
      facetDistribution: {},
      processingTimeMs: 1,
    });
  });

  it("returns 403 when unauthenticated and not allowlisted", async () => {
    const req = new NextRequest("http://localhost/api/souq/search?q=test");
    const res = await GET(req);
    expect(res.status).toBe(403);
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("allows allowlisted public org and scopes filters", async () => {
    const orgId = new Types.ObjectId("507f191e810c19729de860ea");
    process.env.MARKETPLACE_PUBLIC_ORGS = orgId.toString();
    resolveMarketplaceContextMock.mockResolvedValue({
      tenantKey: orgId.toString(),
      orgId,
      correlationId: "corr-2",
    });

    const req = new NextRequest(
      "http://localhost/api/souq/search?q=test&category=foo&badges=a,b",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const opts = searchMock.mock.calls.at(-1)?.[1] as { filter?: string[] };
    expect(opts?.filter).toEqual(
      expect.arrayContaining([
        `orgId = "${orgId.toString()}"`,
        `org_id = "${orgId.toString()}"`,
        `category = "foo"`,
        `(badges = "a" OR badges = "b")`,
      ]),
    );
  });

  it("escapes filter values to prevent injection", async () => {
    const orgId = new Types.ObjectId("507f191e810c19729de860ea");
    process.env.MARKETPLACE_PUBLIC_ORGS = orgId.toString();
    resolveMarketplaceContextMock.mockResolvedValue({
      tenantKey: orgId.toString(),
      orgId,
      correlationId: "corr-3",
    });

    const inj = 'x" OR rating > 0';
    const req = new NextRequest(
      `http://localhost/api/souq/search?q=test&category=${encodeURIComponent(inj)}`,
    );
    await GET(req);
    const opts = searchMock.mock.calls.at(-1)?.[1] as { filter?: string[] };
    const catFilter = opts?.filter?.find((f) => f.startsWith("category"));
    expect(catFilter).toBe(`category = "x\\" OR rating > 0"`);
  });

  it("returns 429 when rate limited", async () => {
    smartRateLimitMock.mockReturnValue({ allowed: false, remaining: 0 });
    const req = new NextRequest("http://localhost/api/souq/search?q=test");
    const res = await GET(req);
    expect(res.status).toBe(429);
  });

  it("applies inStock and isActive defaults", async () => {
    const orgId = new Types.ObjectId("507f191e810c19729de860ea");
    process.env.MARKETPLACE_PUBLIC_ORGS = orgId.toString();
    resolveMarketplaceContextMock.mockResolvedValue({
      tenantKey: orgId.toString(),
      orgId,
      correlationId: "corr-4",
    });
    const req = new NextRequest("http://localhost/api/souq/search?q=test&inStock=true");
    await GET(req);
    const opts = searchMock.mock.calls.at(-1)?.[1] as { filter?: string[] };
    expect(opts?.filter).toEqual(
      expect.arrayContaining([`isActive = true`, `inStock = true`]),
    );
  });
});
