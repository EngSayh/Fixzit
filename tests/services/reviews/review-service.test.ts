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

describe("reviewService RBAC moderation enforcement", () => {
  const orgId = "507f1f77bcf86cd799439011";
  const moderatorId = new Types.ObjectId().toHexString();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("approveReview rejects non-moderator roles", async () => {
    await expect(
      reviewService.approveReview("REV-1", orgId, moderatorId, "TENANT"),
    ).rejects.toThrow("Unauthorized: Moderator role required");
  });

  it("rejectReview rejects non-moderator roles", async () => {
    await expect(
      reviewService.rejectReview("REV-1", orgId, moderatorId, "CORPORATE_EMPLOYEE", "spam"),
    ).rejects.toThrow("Unauthorized: Moderator role required");
  });

  it("flagReview rejects non-moderator roles", async () => {
    await expect(
      reviewService.flagReview("REV-1", orgId, moderatorId, "PROPERTY_OWNER", "inappropriate"),
    ).rejects.toThrow("Unauthorized: Moderator role required");
  });

  it("approveReview allows ADMIN role", async () => {
    const mockReview = {
      reviewId: "REV-1",
      status: "pending",
      productId: new Types.ObjectId(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(SouqReview, "findOne").mockResolvedValue(mockReview as never);
    vi.spyOn(SouqProduct, "updateOne").mockResolvedValue({ modifiedCount: 1 } as never);
    vi.spyOn(SouqReview, "aggregate").mockResolvedValue([
      { _id: mockReview.productId, totalReviews: 1, totalRating: 5 },
    ] as never);

    const result = await reviewService.approveReview("REV-1", orgId, moderatorId, "ADMIN");

    expect(result.status).toBe("published");
    expect(mockReview.save).toHaveBeenCalled();
  });

  it("approveReview allows SUPER_ADMIN role", async () => {
    const mockReview = {
      reviewId: "REV-2",
      status: "pending",
      productId: new Types.ObjectId(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(SouqReview, "findOne").mockResolvedValue(mockReview as never);
    vi.spyOn(SouqProduct, "updateOne").mockResolvedValue({ modifiedCount: 1 } as never);
    vi.spyOn(SouqReview, "aggregate").mockResolvedValue([
      { _id: mockReview.productId, totalReviews: 1, totalRating: 4 },
    ] as never);

    const result = await reviewService.approveReview("REV-2", orgId, moderatorId, "SUPER_ADMIN");

    expect(result.status).toBe("published");
  });

  it("flagReview requires reason", async () => {
    await expect(
      reviewService.flagReview("REV-1", orgId, moderatorId, "ADMIN", ""),
    ).rejects.toThrow("Flag reason is required");
  });
});

describe("reviewService cross-tenant isolation", () => {
  const orgA = "507f1f77bcf86cd799439011";
  const orgB = "507f1f77bcf86cd799439022";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getReviewById returns null for review in different org", async () => {
    // Review exists in orgA but we query with orgB
    vi.spyOn(SouqReview, "findOne").mockResolvedValue(null as never);

    const result = await reviewService.getReviewById("REV-1", orgB);

    expect(result).toBeNull();
  });

  it("approveReview throws when review not found in caller's org", async () => {
    vi.spyOn(SouqReview, "findOne").mockResolvedValue(null as never);

    await expect(
      reviewService.approveReview("REV-CROSS", orgB, "mod-1", "ADMIN"),
    ).rejects.toThrow("Review not found");
  });

  it("rejectReview throws when review not found in caller's org", async () => {
    vi.spyOn(SouqReview, "findOne").mockResolvedValue(null as never);

    await expect(
      reviewService.rejectReview("REV-CROSS", orgB, "mod-1", "ADMIN", "spam"),
    ).rejects.toThrow("Review not found");
  });
});
