// Tests for app/api/marketplace/products/[slug]/route.ts
// Framework: Vitest

import { vi } from "vitest";

// IMPORTANT: We import the route implementation.
// If your project alias resolution differs, adjust the relative path accordingly.
import { GET } from "@/app/api/marketplace/products/[slug]/route";

// TYPESCRIPT FIX: Import the actual type to fix 'unknown' type errors
import type { MarketplaceProduct as MarketplaceProductType } from "@/server/models/marketplace/Product";
import type { Model } from "mongoose";

// Mock the MarketplaceProduct model imported in the route implementation.
// The route imports: "@/server/models/MarketplaceProduct"
vi.mock("@/server/models/MarketplaceProduct", () => {
  return {
    // TYPESCRIPT FIX: Type the mock as a Mongoose Model to fix 'unknown' errors
    MarketplaceProduct: {
      findOne: vi.fn(),
    } as unknown as Model<MarketplaceProductType>,
  };
});

import { MarketplaceProduct } from "@/server/models/MarketplaceProduct";

// Helper to read JSON body from a NextResponse (web-standard Response compatible)
async function readJson(res: Response) {
  // NextResponse extends Response; .json() is available to parse body

  return await (res as any).json();
}

describe("GET /api/marketplace/products/[slug]", () => {
  const tenantId = "demo-tenant";

  // Helper to create a mock NextRequest with proper headers and nextUrl
  const createMockRequest = () =>
    ({
      headers: new Headers({ origin: "http://localhost:3000" }),
      nextUrl: {
        protocol: "http:",
        hostname: "localhost",
        port: "3000",
      },
    }) as any;

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns 404 when product is not found", async () => {
    (MarketplaceProduct.findOne as any).mockResolvedValueOnce(null);

    const req = createMockRequest();
    const res = await GET(req, {
      params: Promise.resolve({ slug: "non-existent" }),
    });

    expect(MarketplaceProduct.findOne as any).toHaveBeenCalledWith({
      tenantId,
      slug: "non-existent",
    });
    expect(res.status).toBe(404);
    await expect(readJson(res as any)).resolves.toEqual({
      ok: false,
      error: "Product not found",
    });
  });

  test("returns product with computed buyBox (happy path with all fields)", async () => {
    const doc = {
      _id: "p1",
      name: "Test Product",
      slug: "test-product",
      prices: [{ listPrice: 123.45, currency: "USD" }],
      inventories: [{ onHand: 10, leadDays: 5 }],
    };
    (MarketplaceProduct.findOne as any).mockResolvedValueOnce(doc);

    const req = createMockRequest();
    const res = await GET(req, {
      params: Promise.resolve({ slug: "test-product" }),
    });

    expect(MarketplaceProduct.findOne as any).toHaveBeenCalledWith({
      tenantId,
      slug: "test-product",
    });
    expect(res.status).toBe(200);

    const body = await readJson(res as any);
    expect(body.product).toEqual(doc);
    expect(body.buyBox).toEqual({
      price: 123.45,
      currency: "USD",
      inStock: true,
      leadDays: 5,
    });
  });

  test("defaults currency to SAR when missing", async () => {
    const doc = {
      slug: "no-currency",
      prices: [{ listPrice: 50 }], // no currency
      inventories: [{ onHand: 3, leadDays: 2 }],
    };
    (MarketplaceProduct.findOne as any).mockResolvedValueOnce(doc);

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ slug: "no-currency" }),
    });
    const body = await readJson(res as any);

    expect(body.buyBox.currency).toBe("SAR");
    expect(body.buyBox.price).toBe(50);
    expect(body.buyBox.inStock).toBe(true);
    expect(body.buyBox.leadDays).toBe(2);
  });

  test("handles missing prices by setting price null and default currency", async () => {
    const doc = {
      slug: "no-prices",
      // prices missing
      inventories: [{ onHand: 1, leadDays: 1 }],
    };
    (MarketplaceProduct.findOne as any).mockResolvedValueOnce(doc);

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ slug: "no-prices" }),
    });
    const body = await readJson(res as any);

    expect(body.buyBox.price).toBeNull();
    expect(body.buyBox.currency).toBe("SAR");
    expect(body.buyBox.inStock).toBe(true);
    expect(body.buyBox.leadDays).toBe(1);
  });

  test("handles empty prices array by setting price null and default currency", async () => {
    const doc = {
      slug: "empty-prices",
      prices: [],
      inventories: [{ onHand: 1, leadDays: 4 }],
    };
    (MarketplaceProduct.findOne as any).mockResolvedValueOnce(doc);

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ slug: "empty-prices" }),
    });
    const body = await readJson(res as any);

    expect(body.buyBox.price).toBeNull();
    expect(body.buyBox.currency).toBe("SAR");
    expect(body.buyBox.inStock).toBe(true);
    expect(body.buyBox.leadDays).toBe(4);
  });

  test("computes inStock as false when onHand is 0 or falsy", async () => {
    const doc = {
      slug: "out-of-stock",
      prices: [{ listPrice: 10, currency: "EUR" }],
      inventories: [{ onHand: 0, leadDays: 7 }],
    };
    (MarketplaceProduct.findOne as any).mockResolvedValueOnce(doc);

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ slug: "out-of-stock" }),
    });
    const body = await readJson(res as any);

    expect(body.buyBox.inStock).toBe(false);
    expect(body.buyBox.leadDays).toBe(7);
    expect(body.buyBox.currency).toBe("EUR");
  });

  test("defaults leadDays to 3 when inventories missing", async () => {
    const doc = {
      slug: "no-inventories",
      prices: [{ listPrice: 99.99, currency: "GBP" }],
      // inventories missing
    };
    (MarketplaceProduct.findOne as any).mockResolvedValueOnce(doc);

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ slug: "no-inventories" }),
    });
    const body = await readJson(res as any);

    expect(body.buyBox.price).toBe(99.99);
    expect(body.buyBox.currency).toBe("GBP");
    expect(body.buyBox.inStock).toBe(false); // (0 || 0) > 0 => false
    expect(body.buyBox.leadDays).toBe(3);
  });

  test("defaults leadDays to 3 when first inventory missing leadDays", async () => {
    const doc = {
      slug: "no-leaddays",
      prices: [{ listPrice: 1.23, currency: "JPY" }],
      inventories: [{ onHand: 2 /* leadDays missing */ }],
    };
    (MarketplaceProduct.findOne as any).mockResolvedValueOnce(doc);

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ slug: "no-leaddays" }),
    });
    const body = await readJson(res as any);

    expect(body.buyBox.leadDays).toBe(3);
    expect(body.buyBox.inStock).toBe(true);
  });

  test("handles errors from data layer by returning 500", async () => {
    (MarketplaceProduct.findOne as any).mockRejectedValueOnce(
      new Error("DB failure"),
    );

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ slug: "boom" }),
    });

    expect(res.status).toBe(500);
    await expect(readJson(res as any)).resolves.toEqual({
      error: "Server error",
    });
  });

  test("uses the provided slug param in the query", async () => {
    const doc = { slug: "unique-slug", prices: [], inventories: [] };
    (MarketplaceProduct.findOne as any).mockResolvedValueOnce(doc);

    await GET(createMockRequest(), {
      params: Promise.resolve({ slug: "unique-slug" }),
    });

    expect(MarketplaceProduct.findOne as any).toHaveBeenCalledWith({
      tenantId,
      slug: "unique-slug",
    });
  });
});
