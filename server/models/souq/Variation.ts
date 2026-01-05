/**
 * Souq Variation Model - Product variations (SKUs)
 * @module server/models/souq/Variation
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

export interface IVariation extends Document {
  _id: mongoose.Types.ObjectId;
  variationId: string; // VAR-{UUID}
  fsin: string; // Parent product FSIN
  sku: string; // Unique SKU

  // Variation Attributes
  attributes: Record<string, string | number | boolean>; // { color: 'Red', size: 'L' }

  // Images (variation-specific)
  images?: string[]; // If empty, use parent product images

  // Identifiers
  upc?: string;
  ean?: string;
  gtin?: string;
  manufacturerPartNumber?: string;

  // Physical Properties
  dimensions?: {
    length: number; // cm
    width: number; // cm
    height: number; // cm
    weight: number; // kg
  };

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const VariationSchema = new Schema<IVariation>(
  {
    variationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fsin: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    attributes: {
      type: Map,
      of: Schema.Types.Mixed,
      required: true,
    },
    images: [String],
    upc: {
      type: String,
      sparse: true,
      index: true,
    },
    ean: {
      type: String,
      sparse: true,
      index: true,
    },
    gtin: {
      type: String,
      sparse: true,
      index: true,
    },
    manufacturerPartNumber: String,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      weight: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "souq_variations",
  },
);

// Indexes
VariationSchema.index({ fsin: 1, isActive: 1 });
VariationSchema.index({ sku: 1, isActive: 1 });

// Method: Get display name based on attributes
VariationSchema.methods.getDisplayName = function (): string {
  const entries = Array.from(this.attributes.entries()) as [
    string,
    string | number | boolean,
  ][];
  const attrs = entries.map(([key, value]) => `${key}: ${value}`).join(", ");
  return attrs || this.sku;
};

// Method: Calculate volumetric weight
VariationSchema.methods.getVolumetricWeight = function (): number | null {
  if (!this.dimensions) return null;
  const { length, width, height } = this.dimensions;
  // Volumetric weight = (L × W × H) / 5000 (standard formula)
  return (length * width * height) / 5000;
};

// Static: Find variations by FSIN
VariationSchema.statics.findByFSIN = async function (fsin: string) {
  return this.find({ fsin, isActive: true }).sort({ createdAt: 1 });
};

// Static: Find variation by SKU
VariationSchema.statics.findBySKU = async function (sku: string) {
  return this.findOne({ sku: sku.toUpperCase(), isActive: true });
};

export const SouqVariation = getModel<IVariation>(
  "SouqVariation",
  VariationSchema,
);

export default SouqVariation;
