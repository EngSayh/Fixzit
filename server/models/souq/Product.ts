/**
 * @module server/models/souq/Product
 * @description Fixzit Souq base product catalog (FSIN entity) for B2B marketplace.
 *              Supports multi-language, category classification, and attribute-based specifications.
 *
 * @features
 * - FSIN (Fixzit Standard Item Number): Unique product identifier across marketplace
 * - Multi-language support (en/ar) for title, description, and attributes
 * - Category and brand classification
 * - Attribute-based specifications (color, size, material, etc.)
 * - Media management (images, videos, product manuals, spec sheets)
 * - Seller/vendor linkage (multiple sellers can list same FSIN)
 * - Status workflow: ACTIVE, INACTIVE, DISCONTINUED
 * - Search optimization (keywords, tags, category filters)
 * - Listing variations (via souq/Listing model - size, color, SKU)
 *
 * @statuses
 * - ACTIVE: Product available for listing
 * - INACTIVE: Temporarily unavailable
 * - DISCONTINUED: No longer offered (archived)
 *
 * @indexes
 * - { orgId: 1, fsin: 1 } (unique) — Unique FSIN per tenant
 * - { orgId: 1, categoryId: 1, status: 1 } — Category browse queries
 * - { orgId: 1, brandId: 1, status: 1 } — Brand catalog queries
 * - { orgId: 1, title: "text", description: "text" } — Full-text search
 * - { orgId: 1, status: 1, createdAt: -1 } — New product listings
 *
 * @relationships
 * - References Category model (categoryId)
 * - References Brand model (brandId)
 * - Referenced by souq/Listing model (listing.productId links to FSIN)
 * - Referenced by souq/Variation model (product variations - SKUs)
 * - Links to AttributeSet model (structured product specs)
 * - Integrates with souq/Inventory model (stock tracking per listing)
 *
 * @audit
 * - timestamps: createdAt, updatedAt from Mongoose
 * - Product catalog changes logged in AuditLog
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  fsin: string; // Fixzit Standard Item Number (unique)
  orgId: mongoose.Types.ObjectId;

  // Basic Info
  title: Record<string, string>; // { en: '...', ar: '...' }
  description: Record<string, string>;
  shortDescription?: Record<string, string>;

  // Classification
  categoryId: string; // Category.categoryId
  brandId?: string; // Brand.brandId

  // Images & Media
  images: string[]; // URLs (first is primary)
  videos?: string[];
  documents?: string[]; // Spec sheets, manuals

  // Attributes (category-specific)
  attributes: Record<string, string | number | boolean | string[]>; // { color: 'red', size: 'L', ... }

  // Variations
  hasVariations: boolean; // If true, variations exist
  variationTheme?: "color" | "size" | "style" | "color_size" | "custom";

  // Compliance
  complianceFlags: {
    type: "hazmat" | "restricted" | "age_restricted" | "prescription" | "other";
    reason: string;
    severity: "warning" | "error" | "info";
    resolvedAt?: Date;
  }[];

  // Status
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId; // Seller ID who created

  // Metadata
  searchKeywords?: string[]; // For search optimization
  bulletPoints?: Record<string, string[]>; // Key features

  // Reviews & Ratings
  averageRating: number; // 0-5 star rating
  reviewCount: number; // Total number of reviews
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    fsin: {
      type: String,
      required: true,
      index: true, // uniqueness enforced per-tenant via compound index below
      uppercase: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    title: {
      type: Map,
      of: String,
      required: true,
    },
    description: {
      type: Map,
      of: String,
      required: true,
    },
    shortDescription: {
      type: Map,
      of: String,
    },
    categoryId: {
      type: String,
      required: true,
      index: true,
    },
    brandId: {
      type: String,
      index: true,
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one image is required",
      },
    },
    videos: [String],
    documents: [String],
    attributes: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    hasVariations: {
      type: Boolean,
      default: false,
      index: true,
    },
    variationTheme: {
      type: String,
      enum: ["color", "size", "style", "color_size", "custom", null],
    },
    complianceFlags: [
      {
        type: {
          type: String,
          enum: [
            "hazmat",
            "restricted",
            "age_restricted",
            "prescription",
            "other",
          ],
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
        severity: {
          type: String,
          enum: ["warning", "error", "info"],
          default: "warning",
        },
        resolvedAt: Date,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      required: true,
      index: true,
    },
    searchKeywords: [String],
    bulletPoints: {
      type: Map,
      of: [String],
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    ratingDistribution: {
      type: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 },
      },
      default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
  },
  {
    timestamps: true,
    collection: "souq_products",
  },
);

// Indexes for performance
ProductSchema.index({ orgId: 1, fsin: 1 }, { unique: true });
ProductSchema.index({ orgId: 1, isActive: 1 });
ProductSchema.index({ orgId: 1, createdBy: 1, isActive: 1 });
ProductSchema.index({ categoryId: 1, brandId: 1 });
ProductSchema.index({ createdBy: 1, isActive: 1 });
ProductSchema.index({
  "title.en": "text",
  "title.ar": "text",
  searchKeywords: "text",
});

// Method: Check if product has unresolved compliance issues
ProductSchema.methods.hasUnresolvedComplianceIssues = function (): boolean {
  return this.complianceFlags.some(
    (flag: { severity: string; resolvedAt?: Date }) =>
      flag.severity === "error" && !flag.resolvedAt,
  );
};

// Method: Get primary image
ProductSchema.methods.getPrimaryImage = function (): string | undefined {
  return this.images[0];
};

// Static: Search products
ProductSchema.statics.searchProducts = async function (
  query: string,
  filters: { categoryId?: string; brandId?: string; limit?: number } = {},
) {
  const searchQuery: {
    isActive: boolean;
    $text: { $search: string };
    categoryId?: string;
    brandId?: string;
  } = {
    isActive: true,
    $text: { $search: query },
  };

  if (filters.categoryId) {
    searchQuery.categoryId = filters.categoryId;
  }

  if (filters.brandId) {
    searchQuery.brandId = filters.brandId;
  }

  return this.find(searchQuery)
    .select("fsin title images categoryId brandId")
    .limit(filters.limit || 50);
};

export const SouqProduct = getModel<IProduct>("SouqProduct", ProductSchema);

export default SouqProduct;
