import { Types } from 'mongoose';
import { MarketplaceCategory } from '@/server/models/marketplace/Category';
import { MarketplaceProduct } from '@/server/models/marketplace/Product';
import { MarketplaceOrder } from '@/server/models/marketplace/Order';
import { MarketplaceRFQ } from '@/server/models/marketplace/RFQ';

function normalizeId(id: Types.ObjectId | string | undefined | null) {
  if (!id) return undefined;
  return typeof id === 'string' ? id : id.toString();
}

export function serializeCategory(doc: MarketplaceCategory | any) {
  const category = 'toObject' in doc ? doc.toObject() : doc;
  return {
    ...category,
    _id: normalizeId(category._id),
    orgId: normalizeId(category.orgId),
    parentId: normalizeId(category.parentId),
    attrSetId: normalizeId(category.attrSetId)
  };
}

export function serializeProduct(doc: MarketplaceProduct | any) {
  const product = 'toObject' in doc ? doc.toObject() : doc;
  return {
    ...product,
    _id: normalizeId(product._id),
    orgId: normalizeId(product.orgId),
    vendorId: normalizeId(product.vendorId),
    categoryId: normalizeId(product.categoryId)
  };
}

export function serializeOrder(doc: MarketplaceOrder | any) {
  const order = 'toObject' in doc ? doc.toObject() : doc;
  return {
    ...order,
    _id: normalizeId(order._id),
    orgId: normalizeId(order.orgId),
    buyerUserId: normalizeId(order.buyerUserId),
    vendorId: normalizeId(order.vendorId),
    lines: order.lines?.map((line: unknown) => ({
      ...line,
      productId: normalizeId(line.productId)
    }))
  };
}

export function serializeRFQ(doc: MarketplaceRFQ | any) {
  const rfq = 'toObject' in doc ? doc.toObject() : doc;
  return {
    ...rfq,
    _id: normalizeId(rfq._id),
    orgId: normalizeId(rfq.orgId),
    requesterId: normalizeId(rfq.requesterId),
    categoryId: normalizeId(rfq.categoryId),
    bids: rfq.bids?.map((bid: unknown) => ({
      ...bid,
      vendorId: normalizeId(bid.vendorId)
    }))
  };
}

