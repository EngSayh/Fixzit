/**
 * @fileoverview FMService MongoDB Model
 * @description Manages facility management service catalog
 * @module server/models/FMService
 * @agent [AGENT-001-A]
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { auditPlugin } from "../plugins/auditPlugin";

export interface IFMService extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  category: string;
  categoryAr?: string;
  subcategory?: string;
  subcategoryAr?: string;
  icon?: string;
  image?: string;
  pricing: {
    type: "fixed" | "hourly" | "sqm" | "unit" | "custom" | "quote";
    basePrice?: number;
    currency: string;
    minPrice?: number;
    maxPrice?: number;
    unit?: string;
    unitAr?: string;
  };
  duration?: {
    estimated: number; // minutes
    min?: number;
    max?: number;
  };
  availability: {
    enabled: boolean;
    schedule?: {
      days: number[]; // 0-6 (Sunday-Saturday)
      startTime?: string; // HH:mm
      endTime?: string; // HH:mm
    };
    requiresBooking: boolean;
    leadTime?: number; // hours
  };
  requirements?: string[];
  requirementsAr?: string[];
  includes?: string[];
  includesAr?: string[];
  excludes?: string[];
  excludesAr?: string[];
  tags?: string[];
  seo?: {
    title?: string;
    titleAr?: string;
    description?: string;
    descriptionAr?: string;
    keywords?: string[];
  };
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  viewCount: number;
  bookingCount: number;
  rating?: {
    average: number;
    count: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PricingSchema = new Schema({
  type: {
    type: String,
    enum: ["fixed", "hourly", "sqm", "unit", "custom", "quote"],
    default: "fixed",
  },
  basePrice: Number,
  currency: { type: String, default: "SAR" },
  minPrice: Number,
  maxPrice: Number,
  unit: String,
  unitAr: String,
}, { _id: false });

const DurationSchema = new Schema({
  estimated: { type: Number, required: true }, // minutes
  min: Number,
  max: Number,
}, { _id: false });

const AvailabilitySchema = new Schema({
  enabled: { type: Boolean, default: true },
  schedule: {
    days: [{ type: Number, min: 0, max: 6 }],
    startTime: String,
    endTime: String,
  },
  requiresBooking: { type: Boolean, default: true },
  leadTime: { type: Number, default: 24 }, // hours
}, { _id: false });

const SeoSchema = new Schema({
  title: String,
  titleAr: String,
  description: String,
  descriptionAr: String,
  keywords: [String],
}, { _id: false });

const RatingSchema = new Schema({
  average: { type: Number, default: 0, min: 0, max: 5 },
  count: { type: Number, default: 0 },
}, { _id: false });

const FMServiceSchema = new Schema<IFMService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    descriptionAr: {
      type: String,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    categoryAr: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    subcategoryAr: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    icon: {
      type: String,
      maxlength: 100,
    },
    image: {
      type: String,
      maxlength: 500,
    },
    pricing: {
      type: PricingSchema,
      required: true,
    },
    duration: DurationSchema,
    availability: {
      type: AvailabilitySchema,
      default: () => ({
        enabled: true,
        requiresBooking: true,
        leadTime: 24,
      }),
    },
    requirements: [{
      type: String,
      maxlength: 500,
    }],
    requirementsAr: [{
      type: String,
      maxlength: 500,
    }],
    includes: [{
      type: String,
      maxlength: 200,
    }],
    includesAr: [{
      type: String,
      maxlength: 200,
    }],
    excludes: [{
      type: String,
      maxlength: 200,
    }],
    excludesAr: [{
      type: String,
      maxlength: 200,
    }],
    tags: [{
      type: String,
      maxlength: 50,
    }],
    seo: SeoSchema,
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    bookingCount: {
      type: Number,
      default: 0,
    },
    rating: RatingSchema,
  },
  {
    timestamps: true,
    collection: "fm_services",
  }
);

// Indexes
FMServiceSchema.index({ category: 1, isActive: 1 });
FMServiceSchema.index({ isActive: 1, sortOrder: 1 });
FMServiceSchema.index({ isFeatured: 1, isActive: 1 });
FMServiceSchema.index({ isPopular: 1, isActive: 1 });
FMServiceSchema.index({ tags: 1 });
FMServiceSchema.index({ "pricing.type": 1 });
FMServiceSchema.index({ name: "text", nameAr: "text", description: "text", tags: "text" });

// Audit plugin
FMServiceSchema.plugin(auditPlugin);

// Export model
export const FMService: Model<IFMService> =
  mongoose.models.FMService ||
  mongoose.model<IFMService>("FMService", FMServiceSchema);
