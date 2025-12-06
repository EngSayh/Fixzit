import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Types } from "mongoose";
import { reviewService } from "@/services/souq/reviews/review-service";
import { SouqReview } from "@/server/models/souq/Review";
import { SouqProduct } from "@/server/models/souq/Product";

// Capture queries for assertion
const queries: unknown[] = [];

// Chainable mock for SouqReview.find
function makeFindMock(returnValue: unknown) {
  return vi.fn((query: unknown) => {
    queries.push(query);
    const chain = {
      sort: vi.fn(() => chain),
      skip: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      lean: vi.fn(() => Promise.resolve(returnValue)),
    };
    return chain;
  });
}

describe("reviewService org scoping", () => {
  const orgId = "507f1f77bcf86cd799439011";
  const orgObjectId = new Types.ObjectId(orgId);
  const productId = new Types.ObjectId().toHexString();

  beforeEach(() => {
    queries.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scopes getProductReviews by orgId and productId variants", async () => {
    vi.spyOn(SouqReview, "find").mockImplementation(
      makeFindMock([{ reviewId: "r1" }]) as unknown as typeof SouqReview.find,
    );
    vi.spyOn(SouqReview, "countDocuments").mockResolvedValue(1 as never);

    const result = await reviewService.getProductReviews(productId, orgId, {
      page: 1,
      limit: 5,
    });

    expect(result.reviews.length).toBe(1);
    const query = queries[0] as Record<string, unknown>;
    expect(query.productId).toEqual({ $in: [productId, expect.any(Types.ObjectId)] });
    expect(query.$or).toEqual([
      { orgId: { $in: [orgId, orgObjectId] } },
      { org_id: { $in: [orgId, orgObjectId] } },
    ]);
  });

  it("scopes getSellerReviews by orgId", async () => {
    const sellerProducts = [{ _id: new Types.ObjectId() }];
    vi.spyOn(SouqProduct, "find").mockImplementation(() => {
      const chain = {
        select: vi.fn(() => chain),
        lean: vi.fn(() => Promise.resolve(sellerProducts)),
      };
      return chain as unknown as ReturnType<typeof SouqProduct.find>;
    });
    vi.spyOn(SouqReview, "find").mockImplementation(
      makeFindMock([]) as unknown as typeof SouqReview.find,
    );
    vi.spyOn(SouqReview, "countDocuments").mockResolvedValue(0 as never);

    await reviewService.getSellerReviews(orgId, new Types.ObjectId().toHexString(), {
      page: 1,
      limit: 10,
    });

    const query = queries[0] as Record<string, unknown>;
    expect(query.$or).toEqual([
      { orgId: { $in: [orgId, orgObjectId] } },
      { org_id: { $in: [orgId, orgObjectId] } },
    ]);
    expect(query.productId).toEqual({ $in: sellerProducts.map((p) => p._id) });
  });

  it("scopes getReviewById by orgId", async () => {
    vi.spyOn(SouqReview, "findOne").mockImplementation(
      (query: unknown) => {
        queries.push(query);
        return Promise.resolve(null) as never;
      },
    );

    await reviewService.getReviewById("REV-1", orgId);

    const query = queries[0] as Record<string, unknown>;
    expect(query.reviewId).toBe("REV-1");
    expect(query.$or).toEqual([
      { orgId: { $in: [orgId, orgObjectId] } },
      { org_id: { $in: [orgId, orgObjectId] } },
    ]);
  });
});
