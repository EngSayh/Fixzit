// @ts-nocheck
import { Schema, model, models, InferSchemaType } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";

const PriceSchema = new Schema({
  vendorId: { type: String },
  currency: { type: String, default: "SAR" },
  listPrice: { type: Number, required: true },
  tierPrices: [{ minQty: Number, price: Number }]
}, { _id: false });

const InventorySchema = new Schema({
  vendorId: { type: String },
  locationId: { type: String },
  onHand: { type: Number, default: 0 },
  onOrder: { type: Number, default: 0 },
  leadDays: { type: Number, default: 3 }
}, { _id: false });

const AttributeSchema = new Schema({
  key: { type: String },
  value: { type: String }
}, { _id: false });

const MarketplaceProductSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  sku: { type: String, required: true },
  slug: { type: String, required: true },
  title: { type: String, required: true },
  brand: { type: String },
  categoryId: { type: String },
  attributes: [AttributeSchema],
  images: [String],
  prices: [PriceSchema],
  inventories: [InventorySchema],
  rating: {
    avg: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  searchable: { type: String }
}, { timestamps: true });

MarketplaceProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
MarketplaceProductSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
MarketplaceProductSchema.index({ title: 'text', brand: 'text', searchable: 'text', 'attributes.value': 'text' });

export type MarketplaceProductDoc = InferSchemaType<typeof MarketplaceProductSchema>;

const isMockDB = process.env.NODE_ENV === 'development' && (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost'));

export const MarketplaceProduct = isMockDB
  ? new MockModel('marketplaceproducts') as any
  : (models.MarketplaceProduct || model("MarketplaceProduct", MarketplaceProductSchema));

