import { Schema, model, models, Types, Model } from 'mongoose';

export type MarketplaceMediaRole = 'GALLERY' | 'MSDS' | 'COA';

export interface MarketplaceMedia {
  url: string;
  role?: MarketplaceMediaRole;
  title?: string;
}

export interface MarketplaceBuyDetail {
  price: number;
  currency: string;
  uom: string;
  minQty?: number;
  leadDays?: number;
}

export interface MarketplaceStockInfo {
  onHand: number;
  reserved: number;
  location?: string;
}

export interface MarketplaceRating {
  avg: number;
  count: number;
}

export interface MarketplaceProduct {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  vendorId?: Types.ObjectId;
  categoryId: Types.ObjectId;
  sku: string;
  slug: string;
  title: { en: string; ar?: string };
  summary?: string;
  brand?: string;
  standards?: string[];
  specs: Record<string, unknown>;
  media: MarketplaceMedia[];
  buy: MarketplaceBuyDetail;
  stock?: MarketplaceStockInfo;
  rating?: MarketplaceRating;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<MarketplaceProduct>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, index: true },
    categoryId: { type: Schema.Types.ObjectId, required: true, index: true },
    sku: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    title: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, trim: true }
    },
    summary: { type: String, trim: true },
    brand: { type: String, trim: true },
    standards: [{ type: String, trim: true }],
    specs: { type: Schema.Types.Mixed, default: {} },
    media: [
      {
        url: { type: String, required: true, trim: true },
        role: { type: String, enum: ['GALLERY', 'MSDS', 'COA'], default: 'GALLERY' },
        title: { type: String, trim: true }
      }
    ],
    buy: {
      price: { type: Number, required: true },
      currency: { type: String, required: true, trim: true },
      uom: { type: String, required: true, trim: true },
      minQty: { type: Number },
      leadDays: { type: Number }
    },
    stock: {
      onHand: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      location: { type: String, trim: true }
    },
    rating: {
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    status: { type: String, enum: ['ACTIVE', 'DRAFT', 'ARCHIVED'], default: 'ACTIVE', index: true }
  },
  { timestamps: true }
);

ProductSchema.index({ orgId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ orgId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ orgId: 1, status: 1 });
ProductSchema.index({ title: 'text', summary: 'text', brand: 'text', standards: 'text' });

const ProductModel =
  (models.MarketplaceProduct as Model<MarketplaceProduct> | undefined) ||
  model<MarketplaceProduct>('MarketplaceProduct', ProductSchema);

export default ProductModel;

