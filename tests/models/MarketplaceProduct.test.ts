import { describe, it, expect, beforeAll } from "vitest";
import mongoose from "mongoose";

type MarketplaceProductModel = mongoose.Model<any>;

const candidateImports = [
  "@/server/models/MarketplaceProduct",
  "@/server/models/marketplace/Product",
  "../server/models/MarketplaceProduct",
  "../server/models/marketplace/Product",
];

async function loadMarketplaceProduct(): Promise<MarketplaceProductModel> {
  // Use real mongoose implementation (disable jsdom mongoose mock)
  vi.unmock("mongoose");
  const originalEnv = { ...process.env };
  Object.assign(process.env, { NODE_ENV: "test" });
  let lastError: unknown;
  try {
    for (const mod of candidateImports) {
      try {
        const imported = await import(mod);
        return (
          (imported as any).MarketplaceProduct ||
          (imported as any).default ||
          imported
        );
      } catch (err) {
        lastError = err;
        continue;
      }
    }
  } finally {
    Object.assign(process.env, originalEnv);
  }
  throw lastError ?? new Error("Unable to load MarketplaceProduct model");
}

describe("MarketplaceProduct model", () => {
  let MarketplaceProduct: MarketplaceProductModel;

  beforeAll(async () => {
    MarketplaceProduct = await loadMarketplaceProduct();
  });

  const baseProduct = () => ({
    orgId: new mongoose.Types.ObjectId(),
    categoryId: new mongoose.Types.ObjectId(),
    sku: "SKU-123",
    slug: "sku-123",
    title: { en: "Test product" },
    buy: { price: 99, currency: "SAR", uom: "unit" },
  });

  it("enforces required fields", () => {
    const doc = new MarketplaceProduct({});
    const err = doc.validateSync();
    const paths = Object.keys(err?.errors ?? {});

    expect(paths).toEqual(
      expect.arrayContaining([
        "categoryId",
        "sku",
        "slug",
        "title.en",
        "buy.price",
        "buy.currency",
        "buy.uom",
      ]),
    );
  });

  it("applies defaults for rating, stock, and status", () => {
    const doc = new MarketplaceProduct(baseProduct());
    expect(doc.rating.avg).toBe(0);
    expect(doc.rating.count).toBe(0);
    expect(doc.stock?.onHand).toBe(0);
    expect(doc.stock?.reserved).toBe(0);
    expect(doc.status).toBe("ACTIVE");
  });

  it("exposes tenant-scoped unique indexes and text search index", () => {
    const indexes = MarketplaceProduct.schema.indexes();
    const specs = indexes.map(([spec]) => spec);

    expect(specs).toEqual(
      expect.arrayContaining([
        { orgId: 1, sku: 1 },
        { orgId: 1, slug: 1 },
      ]),
    );
    const textIndex = specs.find(
      (spec) =>
        spec.orgId === 1 &&
        spec.title === "text" &&
        spec.summary === "text" &&
        spec.brand === "text" &&
        spec.standards === "text",
    );
    expect(textIndex).toBeDefined();
  });

  it("preserves provided media and specs structures", () => {
    const doc = new MarketplaceProduct({
      ...baseProduct(),
      media: [{ url: "https://cdn.example.com/img.png", role: "GALLERY" }],
      specs: { color: "red", weight: 2 },
    });

    expect(doc.media).toEqual([
      expect.objectContaining({
        url: "https://cdn.example.com/img.png",
        role: "GALLERY",
      }),
    ]);
    expect(doc.specs.color).toBe("red");
    expect(doc.specs.weight).toBe(2);
  });
});
