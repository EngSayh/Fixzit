// @vitest-environment node
import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { returnsService } from "@/services/souq/returns-service";

describe("ReturnsService.resolveSellerForItems", () => {
  it("returns sellerId when all items belong to the same seller", () => {
    const seller = new mongoose.Types.ObjectId();
    const order = {
      items: [
        { listingId: new mongoose.Types.ObjectId(), sellerId: seller },
        { listingId: new mongoose.Types.ObjectId(), sellerId: seller },
      ],
    };
    const items = order.items.map((oi) => ({
      listingId: oi.listingId.toString(),
      quantity: 1,
    }));

    const sellerId = (returnsService as unknown as { resolveSellerForItems: (order: unknown, items: unknown) => mongoose.Types.ObjectId }).resolveSellerForItems(order, items);
    expect(sellerId.toString()).toBe(seller.toString());
  });

  it("throws when items span multiple sellers", () => {
    const sellerA = new mongoose.Types.ObjectId();
    const sellerB = new mongoose.Types.ObjectId();
    const order = {
      items: [
        { listingId: new mongoose.Types.ObjectId(), sellerId: sellerA },
        { listingId: new mongoose.Types.ObjectId(), sellerId: sellerB },
      ],
    };
    const items = order.items.map((oi) => ({
      listingId: oi.listingId.toString(),
      quantity: 1,
    }));

    expect(() =>
      (returnsService as unknown as { resolveSellerForItems: (order: unknown, items: unknown) => mongoose.Types.ObjectId }).resolveSellerForItems(order, items),
    ).toThrow(/multiple sellers/i);
  });
});
