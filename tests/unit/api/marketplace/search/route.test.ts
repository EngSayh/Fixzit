import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const jsonMock = vi.fn();
const searchProductsMock = vi.fn();
const resolveMarketplaceContextMock = vi.fn();
const connectToDatabaseMock = vi.fn();
const categoryFindOneLeanMock = vi.fn();
const categoryFindLeanMock = vi.fn();
const createSecureResponseMock = vi.fn();
const zodValidationErrorMock = vi.fn();

vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    nextUrl: URL;
    headers: Headers;

    constructor(url: string | URL) {
      const normalized = new URL(
        typeof url === "string" ? url : url.toString(),
      );
      this.url = normalized.toString();
      this.nextUrl = normalized;
      this.headers = new Headers();
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => {
        jsonMock(body, init);
        return { body, init };
      },
    },
  };
});

vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: resolveMarketplaceContextMock,
}));

vi.mock("@/lib/marketplace/search", () => ({
  searchProducts: searchProductsMock,
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/server/models/marketplace/Category", () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => ({
      lean: () => categoryFindOneLeanMock(...args),
    }),
    find: (...args: unknown[]) => ({
      lean: () => categoryFindLeanMock(...args),
    }),
  },
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: createSecureResponseMock,
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/server/security/rateLimit", () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  zodValidationError: zodValidationErrorMock,
}));

describe("GET /api/marketplace/search", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resolveMarketplaceContextMock.mockResolvedValue({
      orgId: "org-1",
      tenantKey: "tenant-1",
    });
    connectToDatabaseMock.mockResolvedValue(undefined);
    searchProductsMock.mockResolvedValue({
      items: [{ id: "product-1" }],
      pagination: { total: 1 },
      facets: { brands: [], standards: [], categories: ["cat-1"] },
    });
    categoryFindOneLeanMock.mockResolvedValue(null);
    categoryFindLeanMock.mockResolvedValue([
      { _id: "cat-1", slug: "electronics", name: { en: "Electronics" } },
    ]);
    createSecureResponseMock.mockReturnValue({ status: 500 });
  });

  async function makeRequest(url: string): Promise<NextRequest> {
    const mod = await import("next/server");
    const RequestCtor = mod.NextRequest as new (url: string) => NextRequest;
    return new RequestCtor(url) as NextRequest;
  }

  it("returns search results with pagination and facets", async () => {
    const { GET } = await import("@/app/api/marketplace/search/route");
    const req = await makeRequest(
      "https://example.com/api/marketplace/search?q=phone&page=2&limit=12",
    );

    await GET(req);

    expect(connectToDatabaseMock).toHaveBeenCalled();
    expect(searchProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        q: "phone",
        limit: 12,
        skip: 12,
      }),
    );
    expect(categoryFindLeanMock).toHaveBeenCalledWith({
      _id: { $in: ["cat-1"] },
      orgId: "org-1",
    });

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: {
          items: [{ id: "product-1" }],
          pagination: {
            limit: 12,
            page: 2,
            total: 1,
            pages: expect.any(Number),
          },
          facets: {
            brands: [],
            standards: [],
            categories: [
              {
                slug: "electronics",
                name: "Electronics",
              },
            ],
          },
        },
      }),
      undefined,
    );
  });

  it("resolves category slug and passes ObjectId to searchProducts", async () => {
    const { GET } = await import("@/app/api/marketplace/search/route");
    categoryFindOneLeanMock.mockResolvedValue({ _id: "mongo-id" });

    const req = await makeRequest(
      "https://example.com/api/marketplace/search?q=watch&cat=smart-watches",
    );

    await GET(req);

    expect(categoryFindOneLeanMock).toHaveBeenCalledWith({
      orgId: "org-1",
      slug: "smart-watches",
    });
    expect(searchProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: "mongo-id",
      }),
    );
  });

  it("returns zod validation error when params invalid", async () => {
    const { GET } = await import("@/app/api/marketplace/search/route");
    zodValidationErrorMock.mockReturnValue("validation-error");

    const req = await makeRequest(
      "https://example.com/api/marketplace/search?limit=0",
    );

    const res = await GET(req);

    expect(zodValidationErrorMock).toHaveBeenCalled();
    expect(res).toBe("validation-error");
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it("handles unexpected failures with secure response", async () => {
    const { GET } = await import("@/app/api/marketplace/search/route");
    searchProductsMock.mockRejectedValue(new Error("boom"));
    createSecureResponseMock.mockReturnValue({ status: 500 });

    const req = await makeRequest(
      "https://example.com/api/marketplace/search?q=boom",
    );

    const res = await GET(req);

    expect(createSecureResponseMock).toHaveBeenCalledWith(
      { error: "Search failed" },
      500,
      req,
    );
    expect(res).toEqual({ status: 500 });
  });
});
