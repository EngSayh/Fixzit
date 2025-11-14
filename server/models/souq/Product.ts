/**
 * Souq Product Model - Base product/FSIN entity
 * @module server/models/souq/Product
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  fsin: string; // Fixzit Standard Item Number (unique)
  
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
  variationTheme?: 'color' | 'size' | 'style' | 'color_size' | 'custom';
  
  // Compliance
  complianceFlags: {
    type: 'hazmat' | 'restricted' | 'age_restricted' | 'prescription' | 'other';
    reason: string;
    severity: 'warning' | 'error' | 'info';
    resolvedAt?: Date;
  }[];
  
  // Status
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId; // Seller ID who created
  
  // Metadata
  searchKeywords?: string[]; // For search optimization
  bulletPoints?: Record<string, string[]>; // Key features
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    fsin: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
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
        message: 'At least one image is required',
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
      enum: ['color', 'size', 'style', 'color_size', 'custom', null],
    },
    complianceFlags: [
      {
        type: {
          type: String,
          enum: ['hazmat', 'restricted', 'age_restricted', 'prescription', 'other'],
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
        severity: {
          type: String,
          enum: ['warning', 'error', 'info'],
          default: 'warning',
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
      ref: 'SouqSeller',
      required: true,
      index: true,
    },
    searchKeywords: [String],
    bulletPoints: {
      type: Map,
      of: [String],
    },
  },
  {
    timestamps: true,
    collection: 'souq_products',
  }
);

// Indexes for performance
ProductSchema.index({ fsin: 1, isActive: 1 });
ProductSchema.index({ categoryId: 1, brandId: 1 });
ProductSchema.index({ createdBy: 1, isActive: 1 });
ProductSchema.index({ 'title.en': 'text', 'title.ar': 'text', searchKeywords: 'text' });

// Method: Check if product has unresolved compliance issues
ProductSchema.methods.hasUnresolvedComplianceIssues = function (): boolean {
  return this.complianceFlags.some(
    (flag: { severity: string; resolvedAt?: Date }) =>
      flag.severity === 'error' && !flag.resolvedAt
  );
};

// Method: Get primary image
ProductSchema.methods.getPrimaryImage = function (): string | undefined {
  return this.images[0];
};

// Static: Search products
ProductSchema.statics.searchProducts = async function (
  query: string,
  filters: { categoryId?: string; brandId?: string; limit?: number } = {}
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
    .select('fsin title images categoryId brandId')
    .limit(filters.limit || 50);
};

export const SouqProduct =
  mongoose.models.SouqProduct || mongoose.model<IProduct>('SouqProduct', ProductSchema);

export default SouqProduct;
