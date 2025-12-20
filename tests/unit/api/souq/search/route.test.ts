import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const searchMock = vi.fn();
const smartRateLimitMock = vi.fn();
const resolveMarketplaceContextMock = vi.fn();

vi.mock("@/lib/meilisearch", () => ({
  searchClient: {
    index: vi.fn().mockReturnValue({
      search: searchMock,
    }),
  },
  INDEXES: { PRODUCTS: "products" },
}));

vi.mock("@/lib/meilisearch-resilience", () => ({
  withMeiliResilience: (_name: string, _op: string, fn: () => unknown) => fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: smartRateLimitMock,
}));

vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: resolveMarketplaceContextMock,
}));

vi.mock("@/server/security/headers", async (orig) => {
  const actual = await orig<typeof import("@/server/security/headers")>();
  return {
    ...actual,
    getClientIP: () => "127.0.0.1",
  };
});

vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    nextUrl: URL;
    headers: Headers;

    constructor(url: string | URL) {
      const u = new URL(typeof url === "string" ? url : url.toString());
      this.url = u.toString();
      this.nextUrl = u;
      this.headers = new Headers();
    }
    get cookies() {
      return {
        get: () => undefined,
      };
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => ({
        body,
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      }),
    },
  };
});

describe("GET /api/souq/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values to defaults
    searchMock.mockReset();
    smartRateLimitMock.mockReset();
    resolveMarketplaceContextMock.mockReset();
    smartRateLimitMock.mockResolvedValue({ allowed: true, remaining: 99 });
    resolveMarketplaceContextMock.mockResolvedValue({
      orgId: "org-1",
      correlationId: "corr-123",
    });
    searchMock.mockResolvedValue({
      hits: [],
      facetDistribution: {},
      processingTimeMs: 1,
      estimatedTotalHits: 0,
    });
    delete process.env.MARKETPLACE_PUBLIC_ORGS;
  });

  afterEach(() => {
    delete process.env.MARKETPLACE_PUBLIC_ORGS;
  });

  async function makeRequest(url: string) {
    const mod = await import("next/server");
    const Ctor = mod.NextRequest as unknown as new (url: string) => Request;
    return new Ctor(url);
  }

  it("applies isActive and org filters with escaping and sets headers", async () => {
    // Allow org-1 in the allowlist so the search proceeds
    process.env.MARKETPLACE_PUBLIC_ORGS = "org-1";
    const { GET } = await import("@/app/api/souq/search/route");
    const req = await makeRequest(
      "https://example.com/api/souq/search?q=watch&category=elec\"tronics",
    );

    const res = (await GET(req)) as { body: any; headers: Headers };

    expect(searchMock).toHaveBeenCalled();
    const searchArgs = searchMock.mock.calls[0][1];
    expect(searchArgs.filter).toContain('isActive = true');
    expect(searchArgs.filter).toContain('orgId = "org-1"');
    // Escaping should preserve quote safely: " -> \"
    expect(searchArgs.filter).toContain('category = "elec\\"tronics"');

    expect(res.headers.get("X-Correlation-Id")).toBe("corr-123");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("120");
  });

  it("blocks orgs not in public allowlist when no user context", async () => {
    process.env.MARKETPLACE_PUBLIC_ORGS = "allowed-org";
    resolveMarketplaceContextMock.mockResolvedValue({
      orgId: "not-allowed",
      correlationId: "corr-999",
      userId: undefined,
    });
    const { GET } = await import("@/app/api/souq/search/route");
    const req = await makeRequest("https://example.com/api/souq/search");

    const res = (await GET(req)) as { status: number; body: any };
    expect(res.status).toBe(403);
    expect(searchMock).not.toHaveBeenCalled();
  });
});
