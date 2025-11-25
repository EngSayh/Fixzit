import { Types } from "mongoose";
import { MarketplaceCategory } from "@/server/models/marketplace/Category";
import { MarketplaceProduct } from "@/server/models/marketplace/Product";
import { MarketplaceOrder } from "@/server/models/marketplace/Order";
import { MarketplaceRFQ } from "@/server/models/marketplace/RFQ";

function normalizeId(id: Types.ObjectId | string | undefined | null) {
  if (!id) return undefined;
  return typeof id === "string" ? id : id.toString();
}

interface DocumentWithToObject {
  toObject: () => Record<string, unknown>;
}

export function serializeCategory(
  doc: MarketplaceCategory | Record<string, unknown>,
) {
  const category =
    "toObject" in doc
      ? (doc as unknown as DocumentWithToObject).toObject()
      : doc;
  return {
    ...category,
    _id: normalizeId(category._id as Types.ObjectId | string | undefined),
    orgId: normalizeId((category as { orgId?: Types.ObjectId | string }).orgId),
    parentId: normalizeId(
      (category as { parentId?: Types.ObjectId | string }).parentId,
    ),
    attrSetId: normalizeId(
      (category as { attrSetId?: Types.ObjectId | string }).attrSetId,
    ),
  };
}

export function serializeProduct(
  doc: MarketplaceProduct | Record<string, unknown>,
) {
  const product =
    "toObject" in doc
      ? (doc as unknown as DocumentWithToObject).toObject()
      : doc;
  return {
    ...product,
    _id: normalizeId((product as { _id?: Types.ObjectId | string })._id),
    orgId: normalizeId((product as { orgId?: Types.ObjectId | string }).orgId),
    vendorId: normalizeId(
      (product as { vendorId?: Types.ObjectId | string }).vendorId,
    ),
    categoryId: normalizeId(
      (product as { categoryId?: Types.ObjectId | string }).categoryId,
    ),
  };
}

interface OrderLine {
  productId?: Types.ObjectId | string;
  [key: string]: unknown;
}

export function serializeOrder(
  doc: MarketplaceOrder | Record<string, unknown>,
) {
  const order =
    "toObject" in doc
      ? (doc as unknown as DocumentWithToObject).toObject()
      : doc;
  return {
    ...order,
    _id: normalizeId((order as { _id?: Types.ObjectId | string })._id),
    orgId: normalizeId((order as { orgId?: Types.ObjectId | string }).orgId),
    buyerUserId: normalizeId(
      (order as { buyerUserId?: Types.ObjectId | string }).buyerUserId,
    ),
    vendorId: normalizeId(
      (order as { vendorId?: Types.ObjectId | string }).vendorId,
    ),
    lines: (order as { lines?: OrderLine[] }).lines?.map((line: OrderLine) => ({
      ...line,
      productId: normalizeId(line.productId),
    })),
  };
}

interface RFQBid {
  vendorId?: Types.ObjectId | string;
  [key: string]: unknown;
}

export function serializeRFQ(doc: MarketplaceRFQ | Record<string, unknown>) {
  const rfq =
    "toObject" in doc
      ? (doc as unknown as DocumentWithToObject).toObject()
      : doc;
  return {
    ...rfq,
    _id: normalizeId((rfq as { _id?: Types.ObjectId | string })._id),
    orgId: normalizeId((rfq as { orgId?: Types.ObjectId | string }).orgId),
    requesterId: normalizeId(
      (rfq as { requesterId?: Types.ObjectId | string }).requesterId,
    ),
    categoryId: normalizeId(
      (rfq as { categoryId?: Types.ObjectId | string }).categoryId,
    ),
    bids: (rfq as { bids?: RFQBid[] }).bids?.map((bid: RFQBid) => ({
      ...bid,
      vendorId: normalizeId(bid.vendorId),
    })),
  };
}
