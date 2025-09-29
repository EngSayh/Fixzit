import { Types } from 'mongoose';
import { MarketplaceCategory } from '@/src/models/marketplace/Category';
import { MarketplaceProduct } from '@/src/models/marketplace/Product';
import { MarketplaceOrder } from '@/src/models/marketplace/Order';
import { MarketplaceRFQ } from '@/src/models/marketplace/RFQ';

function normalizeId(id: Types.ObjectId | string | undefined | null) {
  if (!id) return undefined;
  return typeof id === 'string' ? id : id.toString();
}

export function serializeCategory(doc: MarketplaceCategory | any) {
  const category = 'toObject' in doc ? (doc as any).toObject() : doc;
  return {
    ...category,
    _id: normalizeId((category as any)._id),
    orgId: normalizeId((category as any).orgId),
    parentId: normalizeId((category as any).parentId),
    attrSetId: normalizeId((category as any).attrSetId)
  };
}

export function serializeProduct(doc: MarketplaceProduct | any) {
  const product = 'toObject' in doc ? (doc as any).toObject() : doc;
  return {
    ...product,
    _id: normalizeId((product as any)._id),
    orgId: normalizeId((product as any).orgId),
    vendorId: normalizeId((product as any).vendorId),
    categoryId: normalizeId((product as any).categoryId)
  };
}

export function serializeOrder(doc: MarketplaceOrder | any) {
  const order = 'toObject' in doc ? (doc as any).toObject() : doc;
  return {
    ...order,
    _id: normalizeId((order as any)._id),
    orgId: normalizeId((order as any).orgId),
    buyerUserId: normalizeId((order as any).buyerUserId),
    vendorId: normalizeId((order as any).vendorId),
    lines: order.lines?.map((line: any) => ({
      ...line,
      productId: normalizeId(line.productId)
    }))
  };
}

export function serializeRFQ(doc: MarketplaceRFQ | any) {
  const rfq = 'toObject' in doc ? (doc as any).toObject() : doc;
  return {
    ...rfq,
    _id: normalizeId((rfq as any)._id),
    orgId: normalizeId((rfq as any).orgId),
    requesterId: normalizeId((rfq as any).requesterId),
    categoryId: normalizeId((rfq as any).categoryId),
    bids: rfq.bids?.map((bid: any) => ({
      ...bid,
      vendorId: normalizeId(bid.vendorId)
    }))
  };
}
