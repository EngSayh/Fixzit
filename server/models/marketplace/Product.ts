import { Schema, model, models, Types, Model } from 'mongoose';
import { tenantIsolationPlugin } from '../../plugins/tenantIsolation';
import { auditPlugin } from '../../plugins/auditPlugin';

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
  distribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  lastReviewAt?: Date;
}

export interface MarketplaceProduct {
  _id: Types.ObjectId;
  orgId: Types.ObjectId; // This will be added by tenantIsolationPlugin
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
    // orgId will be added by tenantIsolationPlugin
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    categoryId: { type: Schema.Types.ObjectId, required: true, ref: 'MarketplaceCategory' },
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
      avg: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
      distribution: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 }
      },
      lastReviewAt: { type: Date }
    },
    status: { type: String, enum: ['ACTIVE', 'DRAFT', 'ARCHIVED'], default: 'ACTIVE' }
  },
  { timestamps: true }
);

// APPLY PLUGINS (BEFORE INDEXES)
ProductSchema.plugin(tenantIsolationPlugin);
ProductSchema.plugin(auditPlugin);

// INDEXES (AFTER PLUGINS) - orgId is now added by the plugin
ProductSchema.index({ orgId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ orgId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ orgId: 1, status: 1 });
ProductSchema.index({ orgId: 1, categoryId: 1 });

// ⚡ CRITICAL FIX: Tenant-scoped text index (prevents cross-tenant data leaks)
// This was previously a global text index that would search ALL organizations
ProductSchema.index(
  { orgId: 1, title: 'text', summary: 'text', brand: 'text', standards: 'text' },
  { name: 'org_text_search' }
);

const ProductModel =
  (models.MarketplaceProduct as Model<MarketplaceProduct> | undefined) ||
  model<MarketplaceProduct>('MarketplaceProduct', ProductSchema);

export default ProductModel;
